import time

from common import dump_payload, fail, get_value, is_filtered_stock, market_from_code, normalize_code, to_float

try:
    import akshare as ak
except Exception as exc:  # pragma: no cover - runtime dependency branch
    fail("AkShare 未安装，请先执行 pip install -r scripts/akshare/requirements.txt", str(exc))


TARGET_INDICES = {
    "上证指数": "000001.SH",
    "深证成指": "399001.SZ",
    "创业板指": "399006.SZ",
}


def build_sentiment(rising, falling, limit_up, limit_down):
    total = max(rising + falling, 1)
    breadth_ratio = (rising - falling) / total
    limit_ratio = (limit_up - limit_down) / max(limit_up + limit_down, 1)
    score = round(50 + breadth_ratio * 22 + limit_ratio * 18)
    score = max(5, min(95, score))

    if score >= 75:
        return {
            "score": score,
            "label": "偏强",
            "description": "上涨家数占优，短线情绪偏强，但仍需控制追高节奏。",
            "riskLevel": "中",
        }
    if score >= 55:
        return {
            "score": score,
            "label": "中性偏暖",
            "description": "市场仍有承接，适合做跟踪与复盘，不宜脱离风控计划。",
            "riskLevel": "中性偏谨慎",
        }
    return {
        "score": score,
        "label": "偏弱",
        "description": "分化或回撤较明显，优先控制仓位，等待结构改善。",
        "riskLevel": "偏谨慎",
    }


def load_index_rows():
    errors = []

    candidates = [
        ("stock_zh_index_spot_sina", lambda: ak.stock_zh_index_spot_sina()),
        ("stock_zh_index_spot_em", lambda: ak.stock_zh_index_spot_em(symbol="沪深重要指数")),
    ]

    for name, loader in candidates:
        for attempt in range(2):
            try:
                df = loader()
                if df is not None and not df.empty:
                    return df.to_dict(orient="records")
            except Exception as exc:
                if attempt == 1:
                    errors.append(f"{name}: {exc}")
                else:
                    time.sleep(1)

    fail("AkShare 获取指数行情失败", "; ".join(errors))

def load_stock_rows():
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
                    return df.to_dict(orient="records"), partial, None
            except Exception as exc:
                if attempt == 1:
                    errors.append(f"{name}: {exc}")
                else:
                    time.sleep(1)

    return [], True, "; ".join(errors)


def main():
    partial = False
    stock_rows, stock_partial, stock_error = load_stock_rows()
    filtered_stocks = []
    sh_amount = 0.0
    sz_amount = 0.0

    for record in stock_rows:
        code = normalize_code(get_value(record, "代码", default=""))
        name = str(get_value(record, "名称", default="")).strip()
        if code == "" or is_filtered_stock(name):
            continue

        pct_change = to_float(get_value(record, "涨跌幅"))
        amount = to_float(get_value(record, "成交额"))

        if amount <= 0:
            partial = True

        market = market_from_code(code)
        if market == "SH":
            sh_amount += amount
        elif market == "SZ":
            sz_amount += amount

        filtered_stocks.append(
            {
                "pctChange": pct_change,
                "amount": amount,
            }
        )

    if not filtered_stocks:
        partial = True
        rising = 0
        falling = 0
        unchanged = 0
        limit_up = 0
        limit_down = 0
        sentiment = {
            "score": 50,
            "label": "中性",
            "description": "股票市场广度接口暂时不可用，当前仅刷新指数行情。",
            "riskLevel": "中性偏谨慎",
        }
    else:
        rising = sum(1 for row in filtered_stocks if row["pctChange"] > 0)
        falling = sum(1 for row in filtered_stocks if row["pctChange"] < 0)
        unchanged = len(filtered_stocks) - rising - falling
        limit_up = sum(1 for row in filtered_stocks if row["pctChange"] >= 9.7)
        limit_down = sum(1 for row in filtered_stocks if row["pctChange"] <= -9.7)
        sentiment = build_sentiment(rising, falling, limit_up, limit_down)

    index_rows = load_index_rows()
    index_payload = []

    for target_name, code in TARGET_INDICES.items():
        matched = None
        target_digits = code.split(".")[0]

        for row in index_rows:
            row_name = str(get_value(row, "名称", "name", "指数名称", default="")).strip()
            row_code = str(get_value(row, "代码", "symbol", default="")).strip()

            if row_name == target_name or row_code in {
                code,
                target_digits,
                code.replace(".", ""),
                f"sh{target_digits}",
                f"sz{target_digits}",
            } or row_code.endswith(target_digits):
                matched = row
                break

        if matched is None:
            partial = True
            index_payload.append(
                {
                    "name": target_name,
                    "code": code,
                    "value": 0.0,
                    "changePercent": 0.0,
                    "changePoints": 0.0,
                    "volume": 0.0,
                    "amount": 0.0,
                    "open": 0.0,
                    "high": 0.0,
                    "low": 0.0,
                    "previousClose": 0.0,
                }
            )
            continue

        latest = to_float(get_value(matched, "最新价", "最新点位", "close"))
        change_percent = to_float(get_value(matched, "涨跌幅", "pct_chg"))
        change_points = to_float(get_value(matched, "涨跌额", "涨跌点数", "change"))
        volume = to_float(get_value(matched, "成交量", "volume"))
        amount = to_float(get_value(matched, "成交额", "amount"))
        open_price = to_float(get_value(matched, "今开", "open"), latest)
        high_price = to_float(get_value(matched, "最高", "high"), latest)
        low_price = to_float(get_value(matched, "最低", "low"), latest)
        previous_close = to_float(get_value(matched, "昨收", "pre_close"), latest - change_points)

        index_payload.append(
            {
                "name": target_name,
                "code": code,
                "value": latest,
                "changePercent": change_percent,
                "changePoints": change_points,
                "volume": volume,
                "amount": amount,
                "open": open_price,
                "high": high_price,
                "low": low_price,
                "previousClose": previous_close,
            }
        )

    dump_payload(
        {
            "ok": True,
            "partial": partial,
            "indices": index_payload,
            "breadth": {
                "rising": rising,
                "falling": falling,
                "unchanged": unchanged,
                "limitUp": limit_up,
                "limitDown": limit_down,
            },
            "turnover": {
                "total": sh_amount + sz_amount,
                "sh": sh_amount,
                "sz": sz_amount,
            },
            "sentiment": {
                "score": sentiment["score"],
                "label": sentiment["label"],
                "description": sentiment["description"],
            },
            "riskLevel": sentiment["riskLevel"],
            "message": (
                "AkShare 实时市场数据"
                if stock_error is None and not stock_partial
                else f"AkShare 指数刷新成功，市场广度降级：{stock_error or '使用备用数据源'}"
            ),
        }
    )


if __name__ == "__main__":
    main()
