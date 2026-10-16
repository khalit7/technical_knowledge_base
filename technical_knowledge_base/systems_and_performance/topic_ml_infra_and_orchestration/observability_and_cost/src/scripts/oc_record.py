"""Record what Prometheus saw during a scenario window, as small columnar JSON for the page.
usage: python3 oc_record.py <prom url> <start unix> <end unix> <out.json> [step seconds, default 5]
Every series is stored as {labels, v: [values or null]} on a shared time grid t0 + i*step.
"""
import json, sys, urllib.parse, urllib.request

URL, T0, T1, OUT = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), sys.argv[4]
STEP = float(sys.argv[5]) if len(sys.argv) > 5 else 5.0

Q = {
    "steps_per_s": 'oc:train_steps_per_second',
    "step": 'max by (system, run) (oc_train_step)',
    "since_step": 'time() - max by (system, run) (oc_train_last_step_timestamp_seconds) and on (system, run) oc_train_ended == 0',
    "tokens_per_s": 'oc:train_tokens_per_second',
    "pod_cpu": 'sum by (pod) (rate(container_cpu_usage_seconds_total{container="trainer"}[40s]))',
    "pod_throttled": 'sum by (pod) (rate(container_cpu_cfs_throttled_periods_total{namespace="mi",container=""}[40s])) / sum by (pod) (rate(container_cpu_cfs_periods_total{namespace="mi",container=""}[40s]))',
    "pod_mem_mb": 'sum by (pod) (container_memory_working_set_bytes{container="trainer"}) / 1048576',
    "kueue_usage": 'oc_kueue_usage',
    "kueue_quota": 'oc_kueue_quota',
    "kueue_wl": 'oc_kueue_workloads',
    "kueue_pending_native": 'sum by (status) (kueue_pending_workloads)',
    "kueue_lq_usage": 'sum by (resource) (kueue_local_queue_resource_usage)',
    "alerts": 'ALERTS',
    "slurm_gpu": 'oc_slurm_gres_gpu',
    "slurm_jobs": 'oc_slurm_jobs',
    "slurm_pending": 'oc_slurm_pending',
    "slurm_node_cpu": 'rate(oc_node_cpu_seconds_total[15s])',
    "prom_series": 'prometheus_tsdb_head_series',
    "prom_rss_mb": 'process_resident_memory_bytes{job="prometheus"} / 1048576',
    "prom_samples_per_s": 'rate(prometheus_tsdb_head_samples_appended_total[30s])',
    "scraped": 'scrape_samples_scraped',
    "kept": 'scrape_samples_post_metric_relabeling',
    "scrape_s": 'scrape_duration_seconds',
}


def get(path, **params):
    u = URL + path + "?" + urllib.parse.urlencode(params)
    with urllib.request.urlopen(u, timeout=30) as r:
        return json.load(r)["data"]


n = int((T1 - T0) // STEP) + 1
out = {"t0": T0, "step": STEP, "n": n, "series": {}}
for k, q in Q.items():
    res = get("/api/v1/query_range", query=q, start=T0, end=T0 + (n - 1) * STEP, step=STEP)["result"]
    ser = []
    for r in res:
        v = [None] * n
        for t, x in r["values"]:
            i = int(round((float(t) - T0) / STEP))
            if 0 <= i < n:
                f = float(x)
                v[i] = None if f != f else round(f, 4)
        lab = {a: b for a, b in r["metric"].items() if a not in ("__name__",)}
        ser.append({"labels": lab, "v": v})
    out["series"][k] = ser
# the native Kueue admission-wait histogram at the end of the window
out["kueue_wait_hist"] = get("/api/v1/query", query='kueue_admission_wait_time_seconds_bucket', time=T1)["result"]
out["kueue_wait_sum"] = get("/api/v1/query", query='kueue_admission_wait_time_seconds_sum', time=T1)["result"]
out["kueue_wait_count"] = get("/api/v1/query", query='kueue_admission_wait_time_seconds_count', time=T1)["result"]
out["tsdb"] = get("/api/v1/status/tsdb")
json.dump(out, open(OUT, "w"), separators=(",", ":"))
print(OUT, n, {k: len(v) for k, v in out["series"].items()})
