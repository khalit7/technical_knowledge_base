import csv
import math
from dataclasses import dataclass


@dataclass
class Reading:
    station: str
    day: str
    temp_c: float
    rain_mm: float


def load_readings(path):
    readings = []
    with open(path, newline="") as f:
        for row in csv.DictReader(f):
            try:
                readings.append(Reading(row["station"], row["day"], float(row["temp_c"]), float(row["rain_mm"])))
            except (KeyError, ValueError):
                continue
    return readings


def mean(values):
    values = list(values)
    if not values:
        return float("nan")
    return sum(values) / len(values)


def stdev(values):
    values = list(values)
    if len(values) < 2:
        return float("nan")
    m = mean(values)
    return math.sqrt(sum((v - m) ** 2 for v in values) / (len(values) - 1))


def by_station(readings):
    groups = {}
    for r in readings:
        groups.setdefault(r.station, []).append(r)
    return groups


def summarize(readings):
    out = {}
    for station, rows in by_station(readings).items():
        temps = [r.temp_c for r in rows]
        rain = [r.rain_mm for r in rows]
        out[station] = {
            "days": len(rows),
            "mean_temp": mean(temps),
            "stdev_temp": stdev(temps),
            "total_rain": sum(rain),
            "wet_days": sum(1 for x in rain if x > 0.2),
        }
    return out


def hottest_day(readings):
    best = None
    for r in readings:
        if best is None or r.temp_c > best.temp_c:
            best = r
    return best
