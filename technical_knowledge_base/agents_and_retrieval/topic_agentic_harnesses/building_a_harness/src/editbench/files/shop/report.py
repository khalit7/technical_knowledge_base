"""Plain-text sales reports for the shop."""
from collections import defaultdict
from datetime import date


def _fmt_money(value):
    return f"${value:,.2f}"


def _week_of(day):
    return day.isocalendar()[1]


def totals_by_sku(sales):
    """sales: list of (day, sku, qty, unit_price). Returns {sku: revenue}."""
    out = defaultdict(float)
    for _day, sku, qty, price in sales:
        out[sku] += qty * price
    return dict(out)


def totals_by_week(sales):
    out = defaultdict(float)
    for day, _sku, qty, price in sales:
        out[_week_of(day)] += qty * price
    return dict(out)


def totals_by_month(sales):
    out = defaultdict(float)
    for day, _sku, qty, price in sales:
        out[(day.year, day.month)] += qty * price
    return dict(out)


def format_weekly(sales, title="Weekly sales"):
    lines = [title]
    lines.append("-" * 40)
    for week, revenue in sorted(totals_by_week(sales).items()):
        lines.append(f"week {week:>2}  {_fmt_money(revenue):>14}")
    lines.append("-" * 40)
    total = sum(totals_by_week(sales).values())
    lines.append(f"total    {_fmt_money(total):>14}")
    return "\n".join(lines)


def format_monthly(sales, title="Monthly sales"):
    lines = [title]
    lines.append("-" * 40)
    for (year, month), revenue in sorted(totals_by_month(sales).items()):
        lines.append(f"{year}-{month:02d}  {_fmt_money(revenue):>14}")
    lines.append("-" * 40)
    total = sum(totals_by_month(sales).values())
    lines.append(f"total    {_fmt_money(total):>14}")
    return "\n".join(lines)


def best_sellers(sales, n=3):
    ranked = sorted(totals_by_sku(sales).items(), key=lambda kv: (-kv[1], kv[0]))
    return ranked[:n]


def format_best_sellers(sales, n=3):
    lines = ["Best sellers"]
    for rank, (sku, revenue) in enumerate(best_sellers(sales, n), start=1):
        lines.append(f"{rank}. {sku:<10} {_fmt_money(revenue):>14}")
    return "\n".join(lines)


def days_with_sales(sales):
    return sorted({day for day, _sku, _qty, _price in sales})


def average_daily_revenue(sales):
    days = days_with_sales(sales)
    if not days:
        return 0.0
    return sum(qty * price for _d, _s, qty, price in sales) / len(days)


def busiest_day(sales):
    per_day = defaultdict(float)
    for day, _sku, qty, price in sales:
        per_day[day] += qty * price
    if not per_day:
        return None
    return max(per_day.items(), key=lambda kv: (kv[1], kv[0]))[0]


def quiet_days(sales, start, end):
    """Days between start and end (inclusive) with no sales."""
    sold = set(days_with_sales(sales))
    out = []
    current = start
    while current <= end:
        if current not in sold:
            out.append(current)
        current = date.fromordinal(current.toordinal() + 1)
    return out


def format_summary(sales):
    lines = ["Summary"]
    lines.append(f"days with sales: {len(days_with_sales(sales))}")
    lines.append(f"average per day: {_fmt_money(average_daily_revenue(sales))}")
    day = busiest_day(sales)
    if day is not None:
        lines.append(f"busiest day:     {day.isoformat()}")
    return "\n".join(lines)


def sku_share(sales):
    """Fraction of total revenue per sku."""
    totals = totals_by_sku(sales)
    grand = sum(totals.values())
    if grand == 0:
        return {}
    return {sku: value / grand for sku, value in totals.items()}


def format_shares(sales):
    lines = ["Share of revenue"]
    for sku, share in sorted(sku_share(sales).items(), key=lambda kv: -kv[1]):
        lines.append(f"{sku:<10} {share:6.1%}")
    return "\n".join(lines)


def recent_sales(sales, today, days=7):
    cutoff = today.toordinal() - days
    return [s for s in sales if s[0].toordinal() > cutoff]


def top_customers_placeholder():
    # Customers are not tracked yet; see issue 41.
    return []


def export_rows(sales, limit=10):
    """The most recent sales as CSV rows, newest first."""
    rows = sorted(sales, key=lambda s: s[0], reverse=True)[:limit]
    return [f"{d.isoformat()},{sku},{qty},{price:.2f}" for d, sku, qty, price in rows]
