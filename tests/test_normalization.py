"""단위 테스트: 파서/정규화"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import parse_period_dates, parse_benefit_amount, compute_status
from datetime import date


def test_parse_period_standard():
    s, e = parse_period_dates("2026.02.01~2026.03.31")
    assert s == date(2026, 2, 1)
    assert e == date(2026, 3, 31)

def test_parse_period_short_year():
    s, e = parse_period_dates("26.02.01~26.03.31")
    assert s == date(2026, 2, 1)

def test_parse_period_dash():
    s, e = parse_period_dates("2026-02-01~2026-12-31")
    assert s == date(2026, 2, 1)
    assert e == date(2026, 12, 31)

def test_parse_period_empty():
    assert parse_period_dates("") == (None, None)
    assert parse_period_dates(None) == (None, None)
    assert parse_period_dates("정보 없음") == (None, None)

def test_parse_benefit_won():
    a, p = parse_benefit_amount("5,000원")
    assert a == 5000
    assert p is None

def test_parse_benefit_man():
    a, p = parse_benefit_amount("30만원")
    assert a == 300000

def test_parse_benefit_pct():
    a, p = parse_benefit_amount("10%")
    assert p == 10.0

def test_parse_benefit_combined():
    a, p = parse_benefit_amount("10% (최대 1만원)")
    assert a == 10000
    assert p == 10.0

def test_compute_status_active():
    assert compute_status(date(2099, 12, 31)) == "active"

def test_compute_status_ended():
    assert compute_status(date(2020, 1, 1)) == "ended"

def test_compute_status_none():
    assert compute_status(None) == "unknown"


if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn()
                print(f"  PASS {name}")
            except AssertionError as e:
                print(f"  FAIL {name}: {e}")
    print("Done.")
