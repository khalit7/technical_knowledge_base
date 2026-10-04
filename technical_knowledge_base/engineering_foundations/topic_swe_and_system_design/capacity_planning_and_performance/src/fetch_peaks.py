"""Real peak factors: hourly Wikipedia pageviews (Wikimedia REST API, no key needed).
Writes inputs/wiki_hourly.json: per project, the hourly user pageviews for September 2026 (UTC),
and the peak-hour / mean-hour ratio computed day by day and over the month."""
import json, urllib.request
UA = {"User-Agent": "KB-capacity-page/1.0 (khalid knowledge base; research)"}
out = {"source": "https://wikimedia.org/api/rest_v1/metrics/pageviews/aggregate/{project}/all-access/user/hourly/2026090100/2026093023",
       "fetched": "2026-10-04", "projects": {}}
for p in ["en.wikipedia", "de.wikipedia", "ja.wikipedia"]:
    u = "https://wikimedia.org/api/rest_v1/metrics/pageviews/aggregate/%s/all-access/user/hourly/2026090100/2026093023" % p
    d = json.load(urllib.request.urlopen(urllib.request.Request(u, headers=UA)))
    v = [it["views"] for it in d["items"]]
    ts = [it["timestamp"] for it in d["items"]]
    days = [v[i:i + 24] for i in range(0, len(v) - len(v) % 24, 24)]
    daily = [max(x) / (sum(x) / 24) for x in days]
    mean = sum(v) / len(v)
    # average day shape (UTC hour of day): mean of each hour over the month / overall mean
    shape = [sum(v[h::24]) / len(v[h::24]) / mean for h in range(24)]
    out["projects"][p] = {"hours": len(v), "first": ts[0], "last": ts[-1], "views": v,
                          "peak_over_mean_month": round(max(v) / mean, 3),
                          "peak_over_mean_daily_median": round(sorted(daily)[len(daily) // 2], 3),
                          "peak_over_mean_daily_max": round(max(daily), 3),
                          "trough_over_mean_shape": round(min(shape), 3),
                          "peak_over_mean_shape": round(max(shape), 3),
                          "shape_utc": [round(x, 4) for x in shape]}
    print(p, len(v), out["projects"][p]["peak_over_mean_month"], out["projects"][p]["peak_over_mean_daily_median"], out["projects"][p]["peak_over_mean_shape"], out["projects"][p]["trough_over_mean_shape"])
json.dump(out, open("inputs/wiki_hourly.json", "w"))
