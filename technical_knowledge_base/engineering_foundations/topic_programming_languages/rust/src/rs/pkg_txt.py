"""out/pkg.json -> out/pkg_sizes.txt (the lines the page quotes)."""
import json, sys
j = json.load(open(sys.argv[1]))
for p in j["profiles"]:
    print("%s tokcount %.2f MB tokserve %.2f MB build %.0f s load %.0f" % (
        p["profile"], p["tokcount_bytes"] / 1e6, p["tokserve_bytes"] / 1e6, p["build_s"], p["load"]))
print("load %.0f" % j["load_before"])
print("otool -L tokserve:")
for l in j["otool_tokserve"]:
    print("  " + l)
