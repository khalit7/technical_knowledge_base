"""Run one PII detector, unmodified, over a JSONL of {"id", "text"} and write the spans it finds.

Detectors (each in the environment that has it):
  datatrove  datatrove 0.10.1 PIIFormatter's two replacers (pipeline/formatters/pii.py:76-87): its email regex, and its
             IPv4 regex with the public_ip_validator (ipaddress.is_global, lines 34-39). Spans are the matches the
             formatter would replace (validator applied). Main venv.
  dolma      Dolma toolkit 1.2.1 tagger "pii_regex_v1" (python/dolma/taggers/pii.py:162-172: email, phone, IP regexes
             plus _postprocess). venv_dolma.
  presidio   presidio-analyzer AnalyzerEngine() with its defaults (spaCy en_core_web_lg, every predefined recognizer,
             score_threshold 0); the score is kept so thresholds can be applied later. dg_pii_venv.
  extra      the root Pipeline lab's extra regexes (phone, street address, obfuscated email, handle, Luhn-checked
             card, IBAN; src/pipe/pip_pii.py EXTRA), re-declared here so this script runs without datatrove.

Usage: python -I -B dg_pii_detect.py <detector> <in.jsonl> <out.jsonl>
Matched strings are written to the scratch folder only; nothing from real documents enters the repo.
"""
import json
import re
import sys


def det_datatrove():
    from datatrove.pipeline.formatters.pii import PIIFormatter, public_ip_validator
    f = PIIFormatter()

    def run(text):
        out = []
        for m in f.emails_replacer.regex.finditer(text):
            out.append((m.start(), m.end(), "EMAIL", 1.0))
        for m in f.ip_replacer.regex.finditer(text):
            if public_ip_validator(m.group(0)):
                out.append((m.start(), m.end(), "IP", 1.0))
        return out
    return run


def det_dolma():
    from dolma.core.data_types import Document
    from dolma.taggers.pii import PiiRegexV1
    t = PiiRegexV1()
    typ = {"EMAIL_ADDRESS": "EMAIL", "PHONE_NUMBER": "PHONE", "IP_ADDRESS": "IP"}

    def run(text):
        res = t.predict(Document(source="dg", version="v0", id="x", text=text))
        return [(s.start, s.end, typ.get(s.type, s.type), 1.0) for s in res.spans if s.type != "doc"]
    return run


def det_presidio():
    from presidio_analyzer import AnalyzerEngine
    a = AnalyzerEngine()

    def run(text):
        return [(r.start, r.end, r.entity_type, round(float(r.score), 3)) for r in a.analyze(text=text, language="en")]
    return run


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


EXTRA = {  # copied from the root's src/pipe/pip_pii.py (Pipeline lab), same patterns
    "PHONE": re.compile(r"(?:\+\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)[\s.-]?|\d{3}[\s.-])\d{3}[\s.-]\d{4}\b|\+44\s?\d{2,4}\s?\d{3,4}\s?\d{3,4}|\b0\d{3,4}\s\d{3}\s?\d{3,4}\b"),
    "ADDRESS": re.compile(r"\b\d{1,5}\s+(?:[A-Z][a-z]+\s){1,3}(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Way|Place|Pl)\b\.?"),
    "EMAIL": re.compile(r"\b[\w.+-]+\s*[\[(]\s*at\s*[\])]\s*[\w-]+(?:\s*[\[(]\s*dot\s*[\])]\s*|\.)[a-z]{2,}\b", re.I),
    "HANDLE": re.compile(r"(?<![\w@])@[A-Za-z0-9_]{3,15}\b"),
    "CARD": re.compile(r"\b(?:\d[ -]?){13,19}\b"),
    "IBAN": re.compile(r"\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){3,7}\b"),
}


def det_extra():
    def run(text):
        out = []
        for k, rx in EXTRA.items():
            for m in rx.finditer(text):
                if k == "CARD" and not luhn(m.group(0)):
                    continue
                out.append((m.start(), m.end(), k, 1.0))
        return out
    return run


def main():
    name, src, dst = sys.argv[1:4]
    run = {"datatrove": det_datatrove, "dolma": det_dolma, "presidio": det_presidio, "extra": det_extra}[name]()
    with open(src) as f, open(dst, "w") as g:
        for line in f:
            d = json.loads(line)
            spans = run(d["text"])
            g.write(json.dumps({"id": d["id"], "spans": [{"s": a, "e": b, "t": t, "p": p} for a, b, t, p in spans]})
                    + "\n")


if __name__ == "__main__":
    main()
