"""Recreate the generated fixtures the recorded runs used (exactly as run on 2026-10-06).
Usage: python3 make_fixtures.py OUTDIR
- OUTDIR/logs/run1.log .. run5.log: 760 worker lines each (seeded), with one maintainer note at line 401 of run2.log
  (the five 75 KB logs of the compaction runs c3_big_nocompact and c4_auto).
- OUTDIR/bigrepo/service/*.py: 30 modules of 14 functions each; router.py also defines ConfigError and
  check_listen_port (the subagent runs sa_* and sb_*)."""
import os, random, sys

out = sys.argv[1]
os.makedirs(os.path.join(out, "logs"), exist_ok=True)
random.seed(7)
for p in range(1, 6):
    L = []
    for i in range(760):
        if p == 2 and i == 400:
            L.append("2026-10-01T09:14:07Z maintainer-note NOTE: the maintainers decided that textstats 0.2 drops support for Python 3.8.")
        L.append(f"2026-10-0{p}T{random.randint(0,23):02d}:{random.randint(0,59):02d}:{random.randint(0,59):02d}Z worker-{random.randint(1,9)} processed batch {random.randint(1000,9999)} of {random.randint(10,500)} documents in {random.randint(20,900)} ms status=ok words={random.randint(1000,90000)}")
    open(os.path.join(out, "logs", f"run{p}.log"), "w").write("\n".join(L) + "\n")

os.makedirs(os.path.join(out, "bigrepo", "service"), exist_ok=True)
random.seed(11)
names = ["cache","queue","router","auth","billing","metrics","storage","scheduler","mailer","search","export","importer","audit","session","limits","flags","geo","pricing","notify","reports","users","teams","tokens","uploads","webhooks","jobs","locks","retry","health","admin"]
for n in names:
    L = [f'"""{n} module of the service."""', "import logging", "log = logging.getLogger(__name__)", ""]
    for j in range(14):
        f = f"{n}_{random.choice(['load','save','check','parse','build','merge','apply','scan'])}_{j}"
        L += [f"def {f}(data, limit={random.randint(5,500)}):", f'    """{random.choice(["Validate","Normalise","Collect","Transform"])} the {n} records."""', "    out = []", "    for item in data:", "        if item.get('size', 0) > limit:", f"            log.warning('{n}: item too large %s', item.get('id'))", "            continue", "        out.append(item)", "    return out", ""]
    if n == "router":
        L += ["class ConfigError(Exception):", "    pass", "", "def check_listen_port(port):", '    """Reject ports outside the range the load balancer forwards."""', "    if not 8000 <= port <= 8099:", "        raise ConfigError(f'port {port} outside 8000-8099')", "    return port", ""]
    open(os.path.join(out, "bigrepo", "service", f"{n}.py"), "w").write("\n".join(L))
