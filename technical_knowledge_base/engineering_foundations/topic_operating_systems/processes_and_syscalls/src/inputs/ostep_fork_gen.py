"""Record OSTEP's fork.py (ostep-homework/cpu-api, fetched 2026-10-05 from
https://github.com/remzi-arpacidusseau/ostep-homework/blob/master/cpu-api/fork.py) on fixed seeds, so the
Process lab's tree simulator can be checked against it (check_sim.mjs). fork.py itself is not copied here.
Usage: python3 ostep_fork_gen.py /path/to/fork.py > ostep_fork_cases.json"""
import json, re, subprocess, sys
fp = sys.argv[1]; cases = []
for flags in ([], ["-R"], ["-L"]):
    for seed in range(1, 13):
        out = subprocess.run([sys.executable, fp, "-s", str(seed), "-a", "10", "-f", "0.6", "-c", "-F", "-P", "basic", *flags],
                             capture_output=True, text=True).stdout
        acts = []
        for m in re.finditer(r"Action: (\w+) (forks (\w+)|EXITS( \(failed: has children\))?)", out):
            acts.append(f"{m.group(1)}+{m.group(3)}" if m.group(3) else f"{m.group(1)}-")
        tree = []
        for line in out.split("Final Process Tree:")[1].strip("\n").split("\n"):
            if not line.strip(): continue
            body = line[31:]
            tree.append([(len(body) - len(body.lstrip(" "))) // 3, body.strip()])
        cases.append({"seed": seed, "flags": " ".join(flags), "actions": ",".join(acts), "final": tree})
print(json.dumps(cases, indent=0))
