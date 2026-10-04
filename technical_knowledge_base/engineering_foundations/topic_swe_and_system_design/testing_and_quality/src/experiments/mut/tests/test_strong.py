import pytest
from retrypolicy import should_retry, backoff_delay, parse_retry_after

@pytest.mark.parametrize("status", [408, 429, 500, 502, 503, 504])
def test_retryable_statuses_are_retried(status):
    assert should_retry(status, attempt=1)

@pytest.mark.parametrize("status", [200, 400, 401, 404, 409, 422, 501])
def test_client_errors_are_not_retried(status):
    assert not should_retry(status, attempt=1)

def test_last_allowed_attempt_still_retries():
    assert should_retry(503, attempt=2)            # 2 calls made, 3 allowed

def test_stops_at_max_attempts():
    assert not should_retry(503, attempt=3)
    assert not should_retry(503, attempt=4, max_attempts=4)

def test_backoff_doubles_from_base_then_caps():
    assert [backoff_delay(a) for a in range(1, 7)] == [0.5, 1, 2, 4, 8, 8]

def test_backoff_respects_custom_cap():
    assert backoff_delay(10, base=1, cap=30) == 30

@pytest.mark.parametrize("header,expected", [
    ("2", 2.0), ("1.5", 1.5), ("0", 0.0), ("-3", 0.0), (None, None), ("soon", None),
])
def test_parse_retry_after(header, expected):
    assert parse_retry_after(header) == expected
