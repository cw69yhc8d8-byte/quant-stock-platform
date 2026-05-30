import argparse
import time

from common import dump_payload, fail, get_value, is_filtered_stock, market_from_code, normalize_code, to_float

try:
    import akshare as ak
except Exception as exc:  # pragma: no cover - runtime dependency branch
    fail("AkShare 未安装，请先执行 pip install -r scripts/akshare/requirements.txt", str(exc))


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=600)
    return parser.parse_args()


def load_stock_df():
    errors = []

    candidates = [
        ("stock_zh_a_spot_em", lambda: ak.stock_zh_a_spot_em(), False),
        ("stock_zh_a_spot", lambda: ak.stock_zh_a_spot(), True),
    ]

    for name, loader, partial in candidates:
        for attempt in range(2):
            try:
                df = loader()
                if df is not None and not df.empty:
                    return df, partial
            except Exception as exc:
                if attempt == 1:
                    errors.append(f"{name}: {exc}")
                else:
                    time.sleep(1)

    fail("AkShare 获取 A 股实时行情失败", "; ".join(errors))


def estimate_turnover_rate(amount):
    return round(max(0.8, min(15.0, amount / 500_000_000)), 2)


def main():
    args = parse_args()

    df, partial = load_stock_df()

    rows = []

    for record in df.to_dict(orient="records"):
        code = normalize_code(get_value(record, "代码", "symbol", default=""))
        name = str(get_value(record, "名称", "name", default="")).strip()

        if code == "" or is_filtered_stock(name):
            continue

        latest_price = to_float(get_value(record, "最新价", "close", "最新"))
        pct_change = to_float(get_value(record, "涨跌幅", "pct_chg", "涨幅"))
        volume = to_float(get_value(record, "成交量", "volume"))
        amount = to_float(get_value(record, "成交额", "amount"))
        turnover_rate = to_float(get_value(record, "换手率", "turnover"))
        open_price = to_float(get_value(record, "今开", "open"), latest_price)
        high_price = to_float(get_value(record, "最高", "high"), latest_price)
        low_price = to_float(get_value(record, "最低", "low"), latest_price)
        prev_close = to_float(get_value(record, "昨收", "pre_close"), latest_price)

        if turnover_rate <= 0:
            turnover_rate = estimate_turnover_rate(amount)
            partial = True

        if amount <= 0:
            partial = True

        rows.append(
            {
                "code": code,
                "name": name,
                "latestPrice": latest_price,
                "pctChange": pct_change,
                "volume": volume,
                "amount": amount,
                "turnoverRate": turnover_rate,
                "market": market_from_code(code),
                "sector": "",
                "industry": "",
                "isST": False,
                "open": open_price,
                "high": high_price,
                "low": low_price,
                "previousClose": prev_close,
            }
        )

    if not rows:
        fail("过滤后股票数据为空")

    rows.sort(key=lambda item: item["amount"], reverse=True)
    limited_rows = rows[: max(args.limit, 1)]

    dump_payload(
        {
            "ok": True,
            "partial": partial,
            "limit": args.limit,
            "totalCount": len(rows),
            "stocks": limited_rows,
        }
    )


if __name__ == "__main__":
    main()
