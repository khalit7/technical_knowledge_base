#!/usr/bin/env python3
"""Destination egress allow-list, as a policy simulation (no model, no network, no attack).

This is the shape section 4 argues for: outbound requests are decided by DESTINATION, not by the
tool or command that made them, and anything not on the list is denied by default. DNS lookups are
decided the same way, because name resolution is itself a path out. The function is pure and the
requests are ordinary agent traffic (the model API, a package registry, a few unlisted destinations);
nothing here attacks anything, it shows a control making allow/deny decisions.
"""

# Hosts the agent is allowed to reach, the only thing a reviewed change to the policy edits.
ALLOW_HOSTS = {"api.anthropic.com", "pypi.org", "files.pythonhosted.org"}
# DNS is egress too: only these names (and their subdomains) may be resolved.
ALLOW_DNS_SUFFIXES = ("anthropic.com", "pypi.org", "pythonhosted.org")


def _is_ip_literal(host):
    parts = host.split(".")
    return len(parts) == 4 and all(p.isdigit() and 0 <= int(p) <= 255 for p in parts)


def decide(req):
    """req = {kind: 'https'|'dns', dest: host-or-name, why_for}. Returns (verdict, reason)."""
    kind, dest = req["kind"], req["dest"]
    if kind == "dns":
        if any(dest == s or dest.endswith("." + s) for s in ALLOW_DNS_SUFFIXES):
            return "allow", "resolver allow-list: " + dest + " is a listed name"
        return "deny", "resolver default-deny: " + dest + " is not a listed name"
    # https / tcp
    if _is_ip_literal(dest):
        return "deny", "default-deny: an IP literal matches no host on the allow-list"
    if dest in ALLOW_HOSTS:
        return "allow", "destination allow-list: " + dest + " is listed"
    return "deny", "default-deny: " + dest + " is not on the allow-list"


# Representative outbound traffic of a coding agent that may install packages.
REQUESTS = [
    {"kind": "https", "dest": "api.anthropic.com", "why_for": "the model API, the agent's own backend"},
    {"kind": "https", "dest": "pypi.org", "why_for": "resolve a dependency to install"},
    {"kind": "https", "dest": "files.pythonhosted.org", "why_for": "download a wheel"},
    {"kind": "https", "dest": "raw.githubusercontent.com", "why_for": "fetch a script a file asked it to run"},
    {"kind": "https", "dest": "203.0.113.9", "why_for": "connect straight to an IP (documentation range)"},
    {"kind": "dns", "dest": "pypi.org", "why_for": "look up the registry before installing"},
    {"kind": "dns", "dest": "metrics-7f3a2.telemetry.example", "why_for": "resolve an unexpected name"},
]


def run():
    out = []
    for r in REQUESTS:
        v, why = decide(r)
        out.append({"kind": r["kind"], "dest": r["dest"], "why_for": r["why_for"], "verdict": v, "why": why})
    return out


if __name__ == "__main__":
    import json
    print(json.dumps(run(), indent=1))
