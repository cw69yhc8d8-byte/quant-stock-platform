import argparse

from common import dump_payload, fail, get_value, to_float

try:
    import akshare as ak
except Exception as exc:  # pragma: no cover - runtime dependency branch
    fail("AkShare 未安装，请先执行 pip install -r scripts/akshare/requirements.txt", str(exc))


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=20)
    return parser.parse_args()


def focus_level(pct_change, hot_score):
    if pct_change >= 2.5 and hot_score >= 75:
        return "适合关注"
    if pct_change >= 0.5:
        return "谨慎观察"
    return "暂不关注"


def risk_level(pct_change):
    if pct_change >= 4.0 or pct_change <= -3.0:
        return "高"
    if pct_change >= 1.5 or pct_change <= -1.5:
        return "中"
    return "低"


def main():
    args = parse_args()
    partial = False

    try:
        df = ak.stock_board_industry_summary_ths()
    except Exception as exc:
        fail("AkShare 获取行业板块行情失败", str(exc))

    if df is None or df.empty:
        fail("AkShare 返回的板块数据为空")

    sectors = []

    for record in df.to_dict(orient="records"):
        name = str(get_value(record, "板块", "板块名称", "名称", default="")).strip()
        if name == "":
            continue

        pct_change = to_float(get_value(record, "涨跌幅", "涨跌额", default=0.0))
        amount = to_float(
            get_value(record, "总成交额", "成交额", default=0.0)
        ) * 100_000_000
        leader = str(
            get_value(record, "领涨股", "领涨股票", "龙头股票", default="未知")
        ).strip() or "未知"
        limit_up_count = int(to_float(get_value(record, "上涨家数", default=0.0)))

        if amount <= 0:
            partial = True

        hot_score = int(
            max(
                15,
                min(
                    99,
                    round(55 + pct_change * 8 + min(amount / 1_000_000_000, 28)),
                ),
            )
        )

        sectors.append(
            {
                "sectorName": name,
                "pctChange": pct_change,
                "amount": amount,
                "hotScore": hot_score,
                "leadingStock": leader,
                "limitUpCount": limit_up_count,
                "riskLevel": risk_level(pct_change),
                "focusLevel": focus_level(pct_change, hot_score),
            }
        )

    if not sectors:
        fail("整理后的板块数据为空")

    sectors.sort(key=lambda item: (item["hotScore"], item["amount"]), reverse=True)

    dump_payload(
        {
            "ok": True,
            "partial": partial,
            "sectors": sectors[: max(args.limit, 1)],
        }
    )


if __name__ == "__main__":
    main()
