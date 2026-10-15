# Temperature sampling and UniMax on five Pile components (raw GiB, The Pile Table 1)
sizes = {"Pile-CC": 227.12, "ArXiv": 56.21, "Github": 95.16, "Wikipedia (en)": 6.38, "DM Mathematics": 7.75}

def temperature(sizes, tau):
    tot = sum(sizes.values())
    q = {k: (v / tot) ** (1 / tau) for k, v in sizes.items()}
    z = sum(q.values())
    return {k: v / z for k, v in q.items()}

def unimax(sizes, budget, max_epochs):
    # Chung et al. 2023, Algorithm 1: smallest first, uniform share unless that exceeds max_epochs
    left, out = budget, {}
    order = sorted(sizes, key=sizes.get)
    for i, k in enumerate(order):
        share = left / (len(order) - i)
        out[k] = min(share, sizes[k] * max_epochs)
        left -= out[k]
    z = sum(out.values())
    return {k: v / z for k, v in out.items()}

budget = 600.0  # GiB of training text
for name, w in [("natural", temperature(sizes, 1)), ("tau=3.33", temperature(sizes, 3.33)), ("UniMax N=3", unimax(sizes, budget, 3))]:
    print(f"{name:11s}", "  ".join(f"{k.split()[0]} {w[k]:.3f} ({w[k] * budget / sizes[k]:.1f} ep)" for k in sizes))
