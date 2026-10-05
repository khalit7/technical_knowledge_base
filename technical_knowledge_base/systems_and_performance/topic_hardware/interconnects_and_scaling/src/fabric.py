"""Reference model for the Fabric explorer tab (the page's parts/33_js_ic_fab.js is a port; check/check_page.mjs compares).

A cluster of `srv` servers with 8 GPUs each. Every GPU has one NIC (nic GB/s each way) and an NVLink port (nvl GB/s each way)
into its server's NVSwitch. Fabrics:
  rail      : rail-optimised two-tier Clos. Leaf switch r joins NIC r of every server; leaves join a spine whose capacity
              per leaf is (servers x nic) / over (over = oversubscription, 1 = full bisection).
  tor       : server-centric. Each rack of `rack` servers puts all its NICs on one top-of-rack leaf; leaves join the spine
              with capacity (rack x 8 x nic) / over.
  railonly  : rail leaves and no spine (Wang et al. 2023). Traffic between different rails must first cross NVLink.
Traffic patterns (V = bytes each GPU sends in the operation):
  dp_ring   : data-parallel all-reduce across servers, one ring per GPU index (NCCL's rings map onto rails):
              each GPU sends 2(srv-1)/srv x V to the same-index GPU of the next server.
  a2a       : all-to-all over every GPU (expert parallelism across servers): V/N to each of the N GPUs (N = 8 srv).
  pp        : pipeline send of V from every GPU to the same-index GPU of the next server.
pxn = True routes cross-rail traffic over NVLink to the local GPU on the destination's rail first (NCCL's PXN; forced in railonly).
Fluid model: perfect load balance over the spine, no congestion-control effects. Time = max over link classes of load / capacity.
"""


def loads(fabric, pattern, srv, V, nic=50.0, nvl=450.0, over=1.0, rack=2, pxn=False):
    G = 8
    N = G * srv
    if fabric == "railonly":
        pxn = True
    L = {"nvlink": 0.0, "nic": 0.0, "spine": 0.0}  # per-GPU NVLink port, per-GPU NIC, per-leaf uplink (bytes)
    C = {"nvlink": nvl, "nic": nic, "spine": None}
    if fabric == "rail":
        C["spine"] = srv * nic / over
    elif fabric == "tor":
        C["spine"] = rack * G * nic / over
    if pattern == "dp_ring" or pattern == "pp":
        per = 2 * (srv - 1) / srv * V if pattern == "dp_ring" else V
        if srv > 1:
            L["nic"] = per
            if fabric == "tor":
                racks = -(-srv // rack)
                # a ring visits servers in order: one hop in `rack` leaves the rack, and carries 8 flows (one per GPU index)
                L["spine"] = (G * per) if racks > 1 else 0.0
    elif pattern == "a2a":
        piece = V / N
        intra = (G - 1) * piece                  # to the 7 other GPUs of my server
        same_rail = (srv - 1) * piece            # to my index on other servers
        cross = (srv - 1) * (G - 1) * piece      # to other indices on other servers
        L["nic"] = same_rail + cross             # every byte for another server leaves through some NIC
        if pxn:
            L["nvlink"] = intra + cross          # forward cross-rail pieces to the local GPU on the right rail
            L["spine"] = 0.0
        else:
            L["nvlink"] = intra
            if fabric == "rail":
                L["spine"] = srv * cross             # leaf r: cross-rail bytes from NIC r of every server
            elif fabric == "tor":
                remote = (srv - min(rack, srv)) * G * piece  # bytes per GPU to servers outside the rack
                L["spine"] = rack * G * remote
    else:
        raise ValueError(pattern)
    t = {k: (L[k] / (C[k] * 1e9) if C[k] else 0.0) for k in L}
    if fabric == "railonly":
        t["spine"] = 0.0
    worst = max(t, key=lambda k: t[k])
    ports = switch_ports(fabric, srv, over, rack)
    return dict(load=L, cap=C, time=t, worst=worst, total=t[worst], ports=ports)


def switch_ports(fabric, srv, over, rack):
    """Network switch ports needed (leaf down + leaf up + spine), a cost proxy."""
    G = 8
    down = G * srv
    if fabric == "railonly":
        return down
    up = down / over
    return down + 2 * up  # each leaf uplink needs a spine port at the other end


if __name__ == "__main__":
    r = loads("rail", "a2a", 16, 1e9)
    print(r)
    print(loads("rail", "a2a", 16, 1e9, pxn=True))
    print(loads("tor", "a2a", 16, 1e9, over=7))
