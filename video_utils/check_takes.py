"""Transcribe every voiced line, flag bad takes, and write the voices of audio_meta.json.

usage (from the HyperFrames project folder, e.g. <page>/video/):
  python3 <repo>/video_utils/check_takes.py narration_lines.tsv assets/voice [--fix "KV cash=KV cache" ...] [--write]

For each line N it runs `npx hyperframes transcribe assets/voice/NN-cb.wav --model small.en`, compares the
heard words with the script line and prints a similarity score; anything under 0.9 is listed as REDO
(regenerate it with narrate.py --only N). With --write it puts one `voices` entry per frame into
audio_meta.json (frame, path, duration_s from ffprobe, words with start and end), applying the --fix
spelling corrections to the word texts, and keeps the file's existing sfx and bgm entries.
Stdlib only.
"""
import argparse, difflib, json, re, subprocess, tempfile
from pathlib import Path


def norm(s):
    return re.sub(r"[^a-z0-9 ]+", " ", s.lower()).split()


def duration(wav):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(wav)],
                         capture_output=True, text=True, check=True).stdout
    return round(float(out.strip()), 3)


def transcribe(wav):
    with tempfile.TemporaryDirectory() as tmp:
        subprocess.run(["npx", "--yes", "hyperframes", "transcribe", str(wav), "--model", "small.en", "--dir", tmp],
                       check=True, capture_output=True)
        return json.loads((Path(tmp) / "transcript.json").read_text())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("lines")
    ap.add_argument("voice_dir")
    ap.add_argument("--fix", action="append", default=[], help='"heard=meant" spelling fix for captions')
    ap.add_argument("--write", action="store_true", help="write voices into audio_meta.json")
    a = ap.parse_args()
    fixes = [f.split("=", 1) for f in a.fix]
    voices, redo = [], []
    for raw in Path(a.lines).read_text().splitlines():
        if not raw.strip():
            continue
        n, text = raw.split("\t", 1)
        n = int(n)
        wav = Path(a.voice_dir) / f"{n:02d}-cb.wav"
        words = transcribe(wav)
        heard = " ".join(w["text"] for w in words)
        score = difflib.SequenceMatcher(None, norm(text), norm(heard)).ratio()
        print(f"{n:02d} {score:.3f} {'REDO' if score < 0.9 else 'ok'}")
        if score < 0.9:
            redo.append(n)
            print("   script:", text, "\n   heard: ", heard)
        joined = " ".join(w["text"] for w in words)
        for bad, good in fixes:  # fix multi-word mishearings by re-splitting onto the same timings
            if bad in joined:
                print(f"   fix {bad!r} -> {good!r}")
        out_words = []
        i = 0
        while i < len(words):
            done = False
            for bad, good in fixes:
                k = len(bad.split())
                chunk = " ".join(w["text"] for w in words[i:i + k])
                if chunk.rstrip(".,!?;:").lower() == bad.lower():
                    tail = chunk[len(chunk.rstrip(".,!?;:")):]
                    out_words.append({"text": good + tail, "start": words[i]["start"], "end": words[i + k - 1]["end"]})
                    i += k
                    done = True
                    break
            if not done:
                out_words.append({"text": words[i]["text"], "start": words[i]["start"], "end": words[i]["end"]})
                i += 1
        voices.append({"frame": n, "path": f"assets/voice/{n:02d}-cb.wav", "duration_s": duration(wav), "words": out_words})
    if redo:
        print("REDO lines:", ",".join(map(str, redo)))
    if a.write:
        p = Path("audio_meta.json")
        meta = json.loads(p.read_text()) if p.exists() else {"bgm": None, "bgm_pending": False, "sfx": []}
        meta["voices"] = voices
        p.write_text(json.dumps(meta, indent=2) + "\n")
        print("wrote audio_meta.json voices for", len(voices), "frames")


if __name__ == "__main__":
    main()
