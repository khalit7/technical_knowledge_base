#!/usr/bin/env python3
"""
Listen to the rendered narration with an ASR model and score it against what
the script actually said.

Why this exists: VibeVoice-1.5B hallucinates. The documented failure modes are
bursts of music or singing, a garbled first second or two while the model
"warms up", and occasional drift into another language. None of it is visible
in a waveform and none of it fails loudly, so a render looks fine and sounds
wrong. The published fix, from both the model's own issue tracker and standard
text-to-speech data pipelines, is a round trip: transcribe the audio, compare
to the input, and regenerate anything that does not match.

    uv run --group tts python video/tts/verify.py --script tech_news_2026_09_21_short

Reports a word error rate per beat. Anything above WER_LIMIT is a defect worth
re-rendering, and `render.py --verify` does that automatically.
"""

from __future__ import annotations

import argparse
import importlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

ASR_MODEL = "large-v3"          # already cached on this machine
WER_LIMIT = 0.15                # informational: word-level disagreement
CER_LIMIT = 0.07                # the gate: character-level disagreement
_model = None


def asr(device: str = "cpu"):
    global _model
    if _model is None:
        if device != "cpu":
            # ctranslate2 links against libcublas at load time and does not
            # know about the copy inside the torch wheel. Importing torch first
            # puts it in the process, which is why this works inside render.py
            # and fails in a script that does not happen to import torch.
            import torch  # noqa: F401
        from faster_whisper import WhisperModel
        # ctranslate2 takes the ordinal separately and rejects "cuda:1"
        # outright, while render.py accepts it. Same flag, same pipeline, two
        # spellings, and the second GPU is unreachable from here without this.
        name, _, index = device.partition(":")
        compute = "int8" if name == "cpu" else "float16"
        kwargs = {"device": name, "compute_type": compute}
        if index:
            kwargs["device_index"] = int(index)
        _model = WhisperModel(ASR_MODEL, **kwargs)
    return _model


ORDINAL = re.compile(r"^([0-9]+)(st|nd|rd|th)$")
ALNUM = re.compile(r"^([a-z]+)([0-9]+(?:\.[0-9]+)?)$")


def _spell(token: str) -> list[str]:
    """Digits as the narrator would say them.

    The script spells numbers out because that is how text to speech reads
    them; the transcriber writes them back as digits. Comparing the two
    without this made every number look like four errors, which both
    over-reported failures and desensitised the threshold to real ones.
    """
    from num2words import num2words
    m = ORDINAL.match(token)
    if m:
        return num2words(int(m.group(1)), lang="en_GB", to="ordinal").split()
    # A year is read in pairs: 2026 is "twenty twenty six", not "two thousand
    # and twenty six", and the narration always spells it the spoken way.
    if re.fullmatch(r"(19|20)[0-9][0-9]", token):
        head, tail = int(token[:2]), int(token[2:])
        return (num2words(head, lang="en_GB").split()
                + (num2words(tail, lang="en_GB").split() if tail else ["hundred"]))
    # Any other four figure number is read in hundreds here, because that is
    # how the narration writes a quantity: "fifteen hundred", "eighteen
    # hundred and fifty". num2words says "one thousand, five hundred", so a
    # correctly read figure scored as six wrong words and pushed one beat to
    # 0.073 against a 0.07 limit with a transcript that was right end to end.
    # Only 1100 to 1999, where the hundreds reading is unambiguous. Above
    # that both readings are in use ("three thousand two hundred" as often as
    # "thirty-two hundred"), and forcing one would trade this false positive
    # for its mirror image.
    if re.fullmatch(r"1[1-9][0-9][0-9]", token):
        head, tail = int(token[:2]), int(token[2:])
        words = num2words(head, lang="en_GB").split() + ["hundred"]
        if tail:
            words += ["and"] + num2words(tail, lang="en_GB").split()
        return words
    try:
        if "." in token:
            whole, frac = token.split(".", 1)
            words = num2words(int(whole), lang="en_GB").split()
            words.append("point")
            words += [num2words(int(d), lang="en_GB") for d in frac]
            return words
        return num2words(int(token), lang="en_GB").split()
    except (ValueError, OverflowError):
        return [token]


def normalise(text: str) -> list[str]:
    """Compare like with like: numbers spoken, punctuation gone, case gone."""
    text = text.lower()
    # Currency is dropped on both sides: the narration says "two dollars fifty"
    # and the transcriber writes "$2.50", and no amount of expansion makes
    # those the same tokens.
    text = re.sub(r"\$", " ", text)
    text = re.sub(r"\bdollars?\b", " ", text)
    text = text.replace("%", " percent ").replace("&", " and ").replace("-", " ")
    text = re.sub(r"[^a-z0-9.\s]", " ", text)
    words = []
    for w in text.split():
        w = w.strip(".")
        m = ALNUM.match(w)
        if m:
            # "v4" is "v four" said aloud, and the transcriber writes it back
            # as one token. Split both sides the same way.
            words.append(m.group(1))
            words.extend(x for x in _spell(m.group(2)) if x != "and")
        elif ORDINAL.match(w):
            words.extend(x for x in _spell(w) if x != "and")
        elif re.fullmatch(r"[0-9]+(?:\.[0-9]+)?", w):
            words.extend(x for x in _spell(w) if x != "and")
        elif w:
            words.append(w)
    return words


def wer(reference: list[str], hypothesis: list[str]) -> float:
    """Levenshtein distance over words, divided by the reference length."""
    if not reference:
        return 0.0 if not hypothesis else 1.0
    prev = list(range(len(hypothesis) + 1))
    for i, r in enumerate(reference, 1):
        cur = [i]
        for j, h in enumerate(hypothesis, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (r != h)))
        prev = cur
    return prev[-1] / len(reference)


# Number words are a closed class and the transcriber renders a spoken figure
# however it likes: "seventeen hundred" comes back as "one thousand, seven
# hundred". Every one of those words is then absent from the script and the
# burst detector calls a correctly read number a hallucination.
NUMBER_WORDS = {
    "zero", "one", "two", "three", "four", "five", "six", "seven", "eight",
    "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen",
    "sixteen", "seventeen", "eighteen", "nineteen", "twenty", "thirty",
    "forty", "fifty", "sixty", "seventy", "eighty", "ninety", "hundred",
    "thousand", "million", "billion", "trillion", "and", "point", "percent",
    "first", "second", "third", "fourth", "fifth", "sixth", "seventh",
    "eighth", "ninth", "tenth", "half", "quarter",
}


def insertion_burst(reference: list[str], hypothesis: list[str], window: int = 4,
                    limit: int = 3) -> str:
    """The longest stretch of invented words.

    A word error rate averages over the whole beat, so a short burst of
    nonsense inside a long passage stays under the threshold. This is what
    actually catches "not just about a model, at the author cases": four words
    in a row that appear nowhere in the script.

    Three things count as known besides an exact match, and every one was
    added after this check rejected takes that were read correctly. Number
    words, for the reason above. Any piece of a compound the script contains:
    "subagents" is heard as "sub agents", and neither half is in the script,
    so three correct words in a row looked like an invention. And the mirror
    of that, which is the one this page's own advice guarantees you will hit:
    the script spells a name out for the voice model and the transcriber
    writes it back as one word. "S Q Lite, Duck D B, Rocks D B" comes back as
    "SQLite DuckDB RocksDB", none of which is in the script and none of which
    is a piece of anything in it, so three correctly read product names in a
    row are a burst. It cost four seeds on a beat that was right the first
    time. So a run of consecutive script words, joined up, is known too.
    """
    known = set(reference) | NUMBER_WORDS
    pieces = {w[:i] for w in reference for i in range(3, len(w))}
    pieces |= {w[i:] for w in reference for i in range(1, len(w) - 2)}
    # Six is enough for the longest spelled-out name this knowledge base
    # uses: "J S O N B" is five tokens, "Cu BLAS L T" is four.
    joined = {"".join(reference[i:i + n])
              for i in range(len(reference)) for n in range(2, 7)}

    def invented(word: str) -> bool:
        return word not in known and word not in pieces and word not in joined

    worst = ""
    for i in range(len(hypothesis)):
        chunk = hypothesis[i:i + window]
        if sum(invented(w) for w in chunk) >= limit:
            worst = max(worst, " ".join(chunk), key=len)
    return worst


def cer(reference: list[str], hypothesis: list[str]) -> float:
    """Character error rate over the words with the spaces removed.

    This is the gate, and the word error rate is only a hint, because most
    word-level disagreement here is spelling convention rather than a wrong
    take: "DeepSeek" comes back as "Deep Seek", "Kimi K3" as "Kimi K 3". Those
    are a handful of characters apart and a third of the words apart. Real
    hallucination moves both.
    """
    ref = "".join(reference)
    hyp = "".join(hypothesis)
    if not ref:
        return 0.0 if not hyp else 1.0
    prev = list(range(len(hyp) + 1))
    for i, r in enumerate(ref, 1):
        cur = [i]
        for j, h in enumerate(hyp, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (r != h)))
        prev = cur
    return prev[-1] / len(ref)


def transcribe(path: Path, device: str = "cpu") -> tuple[str, str, float]:
    """Text, detected language, and the worst no-speech probability seen.

    A high no-speech probability on a clip that is supposed to be speech is how
    a burst of music or noise shows up.
    """
    segments, info = asr(device).transcribe(str(path), language=None, beam_size=5)
    parts, worst_silence = [], 0.0
    for seg in segments:
        parts.append(seg.text)
        worst_silence = max(worst_silence, getattr(seg, "no_speech_prob", 0.0) or 0.0)
    return " ".join(parts).strip(), info.language, worst_silence


def check_beat(key: str, turns: list[tuple[str, str]], audio_dir: Path,
               device: str = "cpu", path: Path | None = None) -> dict:
    path = path or audio_dir / f"{key}.wav"
    if not path.exists():
        return {"key": key, "missing": True}
    said = " ".join(line for _, line in turns)
    heard, language, silence = transcribe(path, device)
    ref, hyp = normalise(said), normalise(heard)
    score = wer(ref, hyp)
    chars = cer(ref, hyp)
    burst = insertion_burst(ref, hyp)
    return {
        "key": key,
        "wer": round(score, 3),
        "cer": round(chars, 3),
        "language": language,
        "no_speech": round(silence, 2),
        "invented": burst,
        # A high no-speech probability on a clip that is all speech is how a
        # burst of music or noise shows up, even when the words around it
        # transcribe fine.
        "ok": (chars <= CER_LIMIT and language == "en" and silence <= 0.5
               and not burst),
        "heard": heard,
        "said": said,
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--script", required=True)
    ap.add_argument("--only", nargs="*")
    ap.add_argument("--device", default="cpu")
    ap.add_argument("--show-text", action="store_true", help="print what was heard")
    args = ap.parse_args()

    script = importlib.import_module(f"scripts.{args.script}").SCRIPT
    audio_dir = ROOT / "out" / "audio" / args.script

    results = []
    for key in (args.only or script):
        r = check_beat(key, script[key], audio_dir, args.device)
        results.append(r)
        if r.get("missing"):
            print(f"{key:16s} MISSING")
            continue
        flag = "ok " if r["ok"] else "BAD"
        print(f"{flag} {key:16s} cer {r['cer']:.3f}  wer {r['wer']:.3f}  "
              f"lang {r['language']}  no-speech {r['no_speech']:.2f}"
              + (f"  invented: \"{r['invented']}\"" if r["invented"] else ""))
        if args.show_text or not r["ok"]:
            print(f"      said:  {r['said'][:160]}")
            print(f"      heard: {r['heard'][:160]}")

    bad = [r for r in results if not r.get("ok") and not r.get("missing")]
    print(f"\n{len(results) - len(bad)} of {len(results)} beats pass "
          f"(character error rate at or below {CER_LIMIT})")
    (audio_dir / "verification.json").write_text(json.dumps(results, indent=2))
    return 1 if bad else 0


if __name__ == "__main__":
    raise SystemExit(main())
