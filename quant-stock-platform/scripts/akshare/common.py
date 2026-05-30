import json
import math
import sys
from datetime import datetime


def to_float(value, default=0.0):
    try:
        if value is None:
            return default
        if isinstance(value, str):
            cleaned = (
                value.replace(",", "")
                .replace("%", "")
                .replace("亿", "")
                .replace("万", "")
                .strip()
            )
            if cleaned == "":
                return default
            value = cleaned
        result = float(value)
        if math.isnan(result) or math.isinf(result):
            return default
        return result
    except Exception:
        return default


def to_int(value, default=0):
    return int(round(to_float(value, default)))


def get_value(row, *keys, default=None):
    for key in keys:
        if key in row and row[key] is not None:
            value = row[key]
            try:
                if hasattr(value, "item"):
                    value = value.item()
            except Exception:
                pass
            if isinstance(value, float) and math.isnan(value):
                continue
            return value
    return default


def is_filtered_stock(name):
    text = str(name or "").strip()
    upper_text = text.upper()
    return (
        text == ""
        or "ST" in upper_text
        or "退" in text
        or "摘牌" in text
        or "PT" in upper_text
    )


def normalize_code(code):
    text = str(code or "").strip().lower()
    if text.startswith(("sh", "sz", "bj")) and len(text) > 2:
        return text[2:]
    return text


def market_from_code(code):
    text = normalize_code(code)
    if text.startswith("6"):
        return "SH"
    if text.startswith(("4", "8", "9")):
        return "BJ"
    return "SZ"


def format_now():
    return datetime.now().isoformat(timespec="seconds")


def dump_payload(payload):
    sys.stdout.write(json.dumps(payload, ensure_ascii=False))


def fail(message, detail=None):
    payload = {"ok": False, "error": message}
    if detail:
        payload["detail"] = detail
    sys.stderr.write(json.dumps(payload, ensure_ascii=False))
    sys.exit(1)
