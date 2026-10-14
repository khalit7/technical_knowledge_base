"""Step 4 of the Pipeline lab: what datatrove's PIIFormatter (pipeline/formatters/pii.py, v0.10.1) catches and misses
on the running example.

Compares run0/deduped (before the PII step) with run0/final (after it), document by document, then runs extra
detectors on the final text to count what remains. Only counts and categories are written; no matched string is
saved anywhere (the page shows constructed examples instead).

Output: src/pipe/out/pii.json
"""
import ipaddress
import os
import re
import sys
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pip_common as P  # noqa: E402
L = P.L
from datatrove.pipeline.formatters import PIIFormatter  # noqa: E402

F = PIIFormatter()
EMAIL = F.emails_replacer.regex
IP = F.ip_replacer.regex
ROLE = {"info", "contact", "support", "sales", "hello", "admin", "office", "help", "enquiries", "inquiries", "service",
        "customerservice", "marketing", "press", "media", "team", "mail", "webmaster", "booking", "bookings",
        "reservations", "orders", "billing", "hr", "jobs", "careers", "privacy", "noreply", "no-reply", "feedback",
        "events", "membership", "accounts", "editor", "news", "general", "studio", "shop", "store", "customercare"}
EXTRA = {
    # phone numbers: international +CC, North American (xxx) xxx-xxxx / xxx-xxx-xxxx, UK 0xxxx xxxxxx
    "phone": re.compile(r"(?:\+\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)[\s.-]?|\d{3}[\s.-])\d{3}[\s.-]\d{4}\b|\+44\s?\d{2,4}\s?\d{3,4}\s?\d{3,4}|\b0\d{3,4}\s\d{3}\s?\d{3,4}\b"),
    # street address: house number, one to three words, a street suffix
    "street_address": re.compile(r"\b\d{1,5}\s+(?:[A-Z][a-z]+\s){1,3}(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Way|Place|Pl)\b\.?"),
    # emails written to dodge scrapers: name [at] domain [dot] com, name (at) domain.com
    "obfuscated_email": re.compile(r"\b[\w.+-]+\s*[\[(]\s*at\s*[\])]\s*[\w-]+(?:\s*[\[(]\s*dot\s*[\])]\s*|\.)[a-z]{2,}\b", re.I),
    # social handles
    "at_handle": re.compile(r"(?<![\w@])@[A-Za-z0-9_]{3,15}\b"),
    # 13-19 digit card-like numbers (checked with Luhn below)
    "card_like": re.compile(r"\b(?:\d[ -]?){13,19}\b"),
    # IBAN-like
    "iban": re.compile(r"\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){3,7}\b"),
    # Cloudflare's email protection: the page's HTML hides the address behind a script, extractors see this
    "cloudflare_email_placeholder": re.compile(r"\[email(?:\xa0|\s)protected\]"),
    # placeholder addresses the formatter wrote (to count replacements in final)
    "replaced_email": re.compile(r"email@example\.com|firstname\.lastname@example\.org"),
}


def luhn(s):
    d = [int(c) for c in s if c.isdigit()]
    if not 13 <= len(d) <= 19:
        return False
    tot = 0
    for i, x in enumerate(reversed(d)):
        if i % 2:
            x *= 2
            x = x - 9 if x > 9 else x
        tot += x
    return tot % 10 == 0


def main():
    before = {d["id"]: d["text"] for d in L.run0("deduped")}
    after = {d["id"]: d["text"] for d in L.run0("final")}
    c = Counter()
    docs = Counter()
    for did, t in before.items():
        emails = EMAIL.findall(t)
        if emails:
            docs["with_email"] += 1
        c["emails"] += len(emails)
        for e in emails:
            local = e.split("@")[0].lower()
            c["emails_role_like" if local in ROLE else "emails_other"] += 1
        ips = IP.findall(t)
        for ip in ips:
            try:
                g = ipaddress.ip_address(ip).is_global
            except ValueError:
                g = None
            c["ip_global" if g else "ip_not_global"] += 1
        if any(ipaddress.ip_address(x).is_global for x in ips if _valid(x)):
            docs["with_global_ip"] += 1
        if t != after[did]:
            docs["edited"] += 1
    rest = Counter()
    rest_docs = Counter()
    for did, t in after.items():
        for k, rx in EXTRA.items():
            m = rx.findall(t)
            if k == "card_like":
                m = [x for x in m if luhn(x)]
            if m:
                rest[k] += len(m)
                rest_docs[k] += 1
    P.save_out("pii.json", {"docs": len(before), "docs_edited": docs["edited"], "docs_with_email": docs["with_email"],
                            "docs_with_global_ip": docs["with_global_ip"], "counts_before": dict(c),
                            "after_extra_detectors": {"matches": dict(rest), "docs": dict(rest_docs)},
                            "note": "extra detectors are simple regexes written for this lab; counts include false "
                                    "positives (a 'phone' match may be a product code); no matched string is stored"})
    print(docs, c, rest, rest_docs)


def _valid(x):
    try:
        ipaddress.ip_address(x)
        return True
    except ValueError:
        return False


if __name__ == "__main__":
    main()
