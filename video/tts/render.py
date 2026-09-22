#!/usr/bin/env python3
"""
Render a narration script to one WAV per beat with VibeVoice.

Why per beat and not one long file: the animation is paced from the length of
each spoken beat, so the scene needs a clip and a duration per key. VibeVoice
would happily generate the whole episode in one pass, and the turn-taking would
be slightly better for it, but then nothing could line the visuals up without a
forced alignment step. Per beat also means a bad take is re-rendered on its own
instead of re-rendering nine minutes.

Speaker consistency across beats comes from passing the same reference clip for
each speaker on every beat, which is what VibeVoice's zero-shot cloning is for.

    python3 video/tts/render.py --script tech_news_2026_09_21
    python3 video/tts/render.py --script tech_news_2026_09_21 --only cold_open --force

The model defaults to `vibevoice/VibeVoice-7B-hf`, the Transformers-native conversion.
The original `microsoft/VibeVoice-1.5B` weights do not load here: that repo
still carries the pre-Transformers config layout (`decoder_config` rather than
`text_config`), so `AutoProcessor` refuses it.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib
import json
import os
import sys
import time
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

# 7B by default. The 1.5B model hallucinates: its own issue tracker documents
# bursts of music, a garbled second or two while it "warms up", and drift into
# other languages, and the consistent finding is that the 7B model is
# substantially more stable. 1.5B remains useful for a fast draft on CPU.
MODEL_ID = os.environ.get("KB_VIBEVOICE", "vibevoice/VibeVoice-7B-hf")

# Guidance in the 1.2 to 1.5 band is what the issue tracker reports as reducing
# the singing and music failure mode. Higher values make it worse.
DEFAULT_GUIDANCE = 1.3

# Reference voices. These ship with the model's own sample set, so we have the
# right to use them. Never clone a real person without Khalid saying so.
# Carter and Maya are the pair: both 24 kHz, both long enough to condition on
# (27 seconds each), and clearly two different people. Alice is 16 kHz and nine
# seconds, which is thinner conditioning for the same job.
VOICES = {
    "A": ROOT / "voices" / "en-Carter_man.wav",
    "B": ROOT / "voices" / "en-Maya_woman.wav",
}
ROLE = {"A": "0", "B": "1"}

TARGET_DBFS = -20.0      # matched loudness across clips
EDGE_SILENCE = 0.2       # seconds of room at each end, so clips do not clip together

TARGET_WPM = 145         # the middle of the band technical narration wants
FAST_WPM = 165           # above this, the take is rushed whatever it scores

# Technical material wants 130 to 150 words a minute and VibeVoice reads at
# 150 to 200. Slowing the audio afterwards with a phase vocoder was tried and
# rejected: it hits the target rate on paper and makes the voice sound
# processed, which is the exact quality the whole pipeline exists to avoid.
# Pace is a writing problem. Shorter sentences, full stops instead of commas,
# and fewer subordinate clauses all slow the model down for real.


def load_script(name: str) -> dict:
    module = importlib.import_module(f"scripts.{name}")
    return module.SCRIPT


def conversation_for(turns: list[tuple[str, str]]) -> list[dict]:
    """One beat as a VibeVoice conversation.

    The reference clip goes on a speaker's FIRST turn in this beat and nowhere
    else. Attaching it again on their later turns makes the processor count
    three clips' worth of audio features against one clip's worth of audio
    tokens, and generation dies with "Audio features and audio tokens do not
    match". Every beat carries the clips afresh, which is what keeps the voice
    the same across beats that are generated separately.
    """
    convo = []
    cloned: set[str] = set()
    for speaker, line in turns:
        content = [{"type": "text", "text": line}]
        if speaker not in cloned:
            clip = VOICES[speaker]
            if not clip.exists():
                raise SystemExit(f"missing reference voice: {clip}")
            content.append({"type": "audio", "url": str(clip)})
            cloned.add(speaker)
        convo.append({"role": ROLE[speaker], "content": content})
    return convo


def normalise(audio: np.ndarray, sr: int) -> np.ndarray:
    audio = np.asarray(audio, dtype=np.float32).squeeze()
    rms = float(np.sqrt(np.mean(np.square(audio)) + 1e-12))
    target = 10 ** (TARGET_DBFS / 20)
    audio = audio * min(target / rms, 8.0)
    peak = float(np.max(np.abs(audio)) or 1.0)
    if peak > 0.98:
        audio = audio * (0.98 / peak)
    pad = np.zeros(int(EDGE_SILENCE * sr), dtype=np.float32)
    return np.concatenate([pad, audio, pad])


def write_wav(path: Path, audio: np.ndarray, sr: int) -> float:
    pcm = (np.clip(audio, -1.0, 1.0) * 32767).astype(np.int16)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(pcm.tobytes())
    return len(pcm) / float(sr)


def beat_stamp(turns: list) -> str:
    """A fingerprint of the words a beat is meant to say."""
    text = "|".join(f"{who}:{line}" for who, line in turns)
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:16]


def load_model(device: str):
    """Load VibeVoice once, for as many scripts as the caller has.

    Loading the seven-billion-parameter model takes the better part of a
    minute, and a run that produces forty episodes used to pay that forty
    times over, once per process. It is now paid once per worker."""
    import torch
    from transformers import AutoModelForTextToWaveform, AutoProcessor

    print(f"loading {MODEL_ID} on {device}...", file=sys.stderr)
    processor = AutoProcessor.from_pretrained(MODEL_ID)
    # CPU wants float32: the checkpoint's own dtype is half precision, which on
    # CPU is emulated and slower than the thing it is meant to speed up.
    dtype = torch.float32 if device.startswith("cpu") else "auto"
    model = AutoModelForTextToWaveform.from_pretrained(
        MODEL_ID, dtype=dtype,
        device_map=device if device != "auto" else "auto",
    )
    model.eval()
    return processor, model, processor.feature_extractor.sampling_rate


def render_script(name: str, args, processor, model, sr) -> int:
    """Every beat of one script, to one WAV each plus durations.json."""
    import torch

    from tts import verify

    # The transcriber is small next to the speech model; put it on the other
    # GPU when there is one, so a check never waits on a render.
    asr_device = "cpu" if args.device.startswith("cpu") else "cuda"

    script = load_script(name)
    # Relative output paths resolve against the video directory, not against
    # wherever the command happened to be run from.
    out = (ROOT / args.out if args.out and not Path(args.out).is_absolute()
           else Path(args.out) if args.out else ROOT / "out" / "audio" / name)
    out.mkdir(parents=True, exist_ok=True)

    keys = args.only or list(script)

    # A rendered beat is reused only if it was rendered from THIS text. An
    # episode gets rewritten (a page moves on, a line is cut), and the beat
    # keys stay the same while the words change. Skipping on "the wav exists"
    # then keeps the old take under the new line, and every check downstream
    # passes it: the clip is clean, it verifies against nothing, and the
    # episode says something the script does not.
    stamps_path = out / "takes.json"
    fresh_dir = not stamps_path.exists()
    stamps = json.loads(stamps_path.read_text()) if stamps_path.exists() else {}
    if fresh_dir:
        # Episodes rendered before stamps existed: adopt what is on disk
        # rather than re-rendering hours of audio that is known good. From
        # here on their words are tracked. An episode being deliberately
        # rewritten should have its audio directory removed instead, which is
        # what produce.py --fresh does.
        for k in keys:
            if (out / f"{k}.wav").exists():
                stamps[k] = beat_stamp(script[k])
        if stamps:
            stamps_path.write_text(json.dumps(stamps, indent=2, sort_keys=True))
    todo = []
    for k in keys:
        if args.force or not (out / f"{k}.wav").exists():
            todo.append(k)
        elif stamps.get(k) != beat_stamp(script[k]):
            print(f"{name}: '{k}' was rendered from different words, "
                  f"re-rendering", file=sys.stderr)
            todo.append(k)
    if not todo:
        print(f"{name}: nothing to render", file=sys.stderr)
        return 0

    durations_path = out / "durations.json"
    durations = json.loads(durations_path.read_text()) if durations_path.exists() else {}

    for key in todo:
        turns = script[key]
        convo = conversation_for(turns)
        inputs = processor.apply_chat_template(
            convo, return_dict=True, tokenize=True, add_generation_prompt=True,
        ).to(model.device, model.dtype)
        words = sum(len(line.split()) for _, line in turns)

        # Generate, listen back, and keep the best take. The model is heavily
        # seed-dependent: the same text that comes out as gibberish on one seed
        # is clean on the next, so a failed check is worth another roll rather
        # than a different prompt.
        # Seeds differ in pace as well as in accuracy, so collect the takes
        # that pass and then choose the best-paced one among them. Picking on
        # accuracy alone gives a clean read at a hundred and ninety words a
        # minute, which is correct and unusable.
        passed, best = [], None
        for attempt in range(1 if args.no_verify else args.attempts):
            torch.manual_seed(1000 + attempt)
            started = time.time()
            audio = model.generate(
                **inputs,
                guidance_scale=args.guidance,
                num_diffusion_steps=args.steps,
            )
            wav = audio[0] if isinstance(audio, (list, tuple)) else audio
            wav = normalise(wav.detach().cpu().float().numpy(), sr)
            took = time.time() - started

            if args.no_verify:
                best = (0.0, wav, took, "not checked")
                break

            rate = words / max(len(wav) / sr, 0.01) * 60

            scratch = out / f".{key}.attempt.wav"
            write_wav(scratch, wav, sr)
            check = verify.check_beat(key, turns, out, device=asr_device,
                                      path=scratch)
            scratch.unlink(missing_ok=True)
            score = check["cer"] if check["language"] == "en" else 1.0
            note = (f"cer {check['cer']:.3f} wer {check['wer']:.3f} "
                    f"{check['language']}  {rate:.0f} wpm")
            if best is None or score < best[0]:
                best = (score, wav, took, note)
            if check["ok"]:
                passed.append((abs(rate - TARGET_WPM), score, wav, took, note))
                if rate <= FAST_WPM:
                    break
            print(f"  {key}: attempt {attempt + 1} rejected ({note}), reseeding",
                  file=sys.stderr)

        if passed:
            _, score, wav, took, note = min(passed, key=lambda p: p[0])
        else:
            score, wav, took, note = best
        seconds = write_wav(out / f"{key}.wav", wav, sr)
        durations[key] = round(seconds, 3)
        durations_path.write_text(json.dumps(durations, indent=2, sort_keys=True))
        stamps[key] = beat_stamp(turns)
        stamps_path.write_text(json.dumps(stamps, indent=2, sort_keys=True))
        rate = words / max(seconds, 0.01) * 60
        if rate > FAST_WPM:
            note += "  STILL FAST: shorten the sentences"
        verdict = "ok " if score <= verify.CER_LIMIT else "KEPT BEST OF ALL BAD"
        print(f"{verdict} {key:18s} {seconds:6.2f}s  {words:4d} words  "
              f"({words / max(seconds, 0.01) * 60:5.0f} wpm)  {note}  "
              f"rendered in {took:.1f}s", file=sys.stderr)

    total = sum(durations.get(k, 0.0) for k in script)
    print(f"{name}: {len(durations)} of {len(script)} beats, "
          f"{total / 60:.1f} minutes of speech", file=sys.stderr)

def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--script", nargs="+", default=[],
                    help="one or more module names under video/scripts/")
    ap.add_argument("--serve", action="store_true",
                    help="after those, keep the model loaded and take more "
                         "script names on stdin, one per line, answering DONE "
                         "or FAIL on stdout. This is how produce.py keeps a "
                         "GPU busy without reloading the model.")
    ap.add_argument("--only", nargs="*", help="render just these beats")
    ap.add_argument("--force", action="store_true", help="re-render beats that exist")
    ap.add_argument("--guidance", type=float, default=DEFAULT_GUIDANCE,
                    help="classifier-free guidance, 1.2 to 1.5")
    ap.add_argument("--steps", type=int, default=20, help="diffusion steps")
    ap.add_argument("--device", default="auto", help="auto, cuda:0, cuda:1 or cpu")
    ap.add_argument("--out", default=None, help="output directory")
    ap.add_argument("--no-verify", action="store_true",
                    help="skip the ASR check and keep the first take")
    ap.add_argument("--attempts", type=int, default=4,
                    help="how many seeds to try before keeping the best take")
    args = ap.parse_args()

    if not args.script and not args.serve:
        ap.error("give --script NAME [NAME ...], or --serve")
    if args.serve and args.out:
        ap.error("--out names one directory, so it cannot serve many scripts")

    loaded: list = []

    def ready():
        if not loaded:
            loaded.extend(load_model(args.device))
        return loaded

    for name in args.script:
        processor, model, sr = ready()
        render_script(name, args, processor, model, sr)

    if args.serve:
        processor, model, sr = ready()
        print("READY", flush=True)
        for line in sys.stdin:
            name = line.strip()
            if not name or name == "quit":
                break
            try:
                render_script(name, args, processor, model, sr)
                print(f"DONE {name}", flush=True)
            except Exception as exc:
                import traceback
                traceback.print_exc()
                print(f"FAIL {name} {type(exc).__name__}: {exc}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
