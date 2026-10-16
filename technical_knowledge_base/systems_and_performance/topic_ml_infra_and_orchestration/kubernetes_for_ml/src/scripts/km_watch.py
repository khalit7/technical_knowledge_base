#!/usr/bin/env python3
"""Watch one namespace of the kind cluster and write every change as one JSON line.

usage: KUBECONFIG=... python km_watch.py <namespace> <out.jsonl> [seconds]
Watches pods, jobs, jobsets, Kueue workloads, PVCs, resource claims and events (events.k8s.io/v1) in
<namespace>, with the local wall-clock time of arrival (t, unix seconds, 1 ms). Each line keeps only the
fields the page uses: kind, name, verb (ADDED/MODIFIED/DELETED), resourceVersion, phase, node, conditions,
container states, scheduling gates, the field managers that have written to the object, and for events
reason, note, reporting controller and eventTime. Stops after [seconds] (default 600) or on SIGTERM.
"""
import json, sys, threading, time, signal
from kubernetes import client, config, watch

ns, out = sys.argv[1], sys.argv[2]
limit = float(sys.argv[3]) if len(sys.argv) > 3 else 600
config.load_kube_config(context="kind-mi-kind")
api = client.ApiClient()
core, batch, co = client.CoreV1Api(api), client.BatchV1Api(api), client.CustomObjectsApi(api)
ev = client.EventsV1Api(api)
lock = threading.Lock()
fh = open(out, "a")
stop = threading.Event()


def emit(rec):
    rec["t"] = round(time.time(), 3)
    with lock:
        fh.write(json.dumps(rec, default=str) + "\n")
        fh.flush()


def conds(c):
    return [{"type": x.get("type"), "status": x.get("status"), "reason": x.get("reason"),
             "message": (x.get("message") or "")[:300], "ltt": x.get("lastTransitionTime")} for x in (c or [])]


def slim(kind, o):
    o = api.sanitize_for_serialization(o) if not isinstance(o, dict) else o
    md, sp, st = o.get("metadata", {}), o.get("spec", {}) or {}, o.get("status", {}) or {}
    r = {"kind": kind, "name": md.get("name"), "rv": md.get("resourceVersion"),
         "managers": sorted({(m.get("manager"), m.get("subresource") or "") for m in md.get("managedFields") or []}),
         "labels": {k: v for k, v in (md.get("labels") or {}).items() if "kueue" in k or "jobset" in k or "index" in k},
         "owner": [x.get("kind") + "/" + x.get("name") for x in md.get("ownerReferences") or []],
         "deleting": bool(md.get("deletionTimestamp"))}
    if kind == "Pod":
        r.update(phase=st.get("phase"), node=sp.get("nodeName"), gates=[g["name"] for g in sp.get("schedulingGates") or []],
                 nodeSelector=sp.get("nodeSelector"), conds=conds(st.get("conditions")),
                 cs=[{"name": c.get("name"), "state": c.get("state"), "restarts": c.get("restartCount")}
                     for c in st.get("containerStatuses") or []], nominated=st.get("nominatedNodeName"))
    elif kind in ("Job", "JobSet", "Workload", "PVC", "ResourceClaim"):
        keep = {k: st.get(k) for k in ("active", "succeeded", "failed", "ready", "terminating", "failedIndexes",
                                        "completedIndexes", "startTime", "completionTime", "phase", "admission",
                                        "requeueState", "restarts", "terminalState", "allocation", "reservedFor",
                                        "replicatedJobsStatus")
                if st.get(k) is not None}
        r.update(status=keep, conds=conds(st.get("conditions")), suspend=sp.get("suspend"))
    return r


def run(kind, fn, **kw):
    w = watch.Watch()
    while not stop.is_set():
        try:
            for e in w.stream(fn, timeout_seconds=30, **kw):
                o = e["object"]
                if kind == "Event":
                    o = api.sanitize_for_serialization(o) if not isinstance(o, dict) else o
                    emit({"kind": "Event", "verb": e["type"], "reason": o.get("reason"), "note": (o.get("note") or "")[:400],
                          "regarding": (o.get("regarding") or {}).get("kind", "") + "/" + (o.get("regarding") or {}).get("name", ""),
                          "by": o.get("reportingController"), "type": o.get("type"), "eventTime": o.get("eventTime"),
                          "series": o.get("series"), "deprecatedFirst": o.get("deprecatedFirstTimestamp"),
                          "rv": (o.get("metadata") or {}).get("resourceVersion")})
                else:
                    emit(dict(slim(kind, o), verb=e["type"]))
                if stop.is_set():
                    break
        except Exception as x:  # CRD absent, connection reset: retry slowly
            if stop.is_set():
                break
            emit({"kind": "watch-error", "of": kind, "err": str(x)[:200]})
            time.sleep(2)


def crd(group, version, plural):
    return lambda **kw: co.list_namespaced_custom_object(group, version, ns, plural, **kw)


specs = [("Pod", lambda **kw: core.list_namespaced_pod(ns, **kw)),
         ("Job", lambda **kw: batch.list_namespaced_job(ns, **kw)),
         ("PVC", lambda **kw: core.list_namespaced_persistent_volume_claim(ns, **kw)),
         ("Event", lambda **kw: ev.list_namespaced_event(ns, **kw)),
         ("JobSet", crd("jobset.x-k8s.io", "v1alpha2", "jobsets")),
         ("Workload", crd("kueue.x-k8s.io", "v1beta2", "workloads")),
         ("ResourceClaim", crd("resource.k8s.io", "v1", "resourceclaims"))]
signal.signal(signal.SIGTERM, lambda *a: stop.set())
emit({"kind": "watch-start", "ns": ns})
ths = [threading.Thread(target=run, args=s, daemon=True) for s in specs]
for t in ths:
    t.start()
t0 = time.time()
while not stop.is_set() and time.time() - t0 < limit:
    time.sleep(0.5)
stop.set()
emit({"kind": "watch-stop"})
fh.close()
