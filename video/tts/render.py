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

The model is `vibevoice/VibeVoice-1.5B-hf`, the Transformers-native conversion.
The original `microsoft/VibeVoice-1.5B` weights do not load here: that repo
still carries the pre-Transformers config layout (`decoder_config` rather than
`text_config`), so `AutoProcessor` refuses it.
"""

from __future__ import annotations

import argparse
import importlib
import json
import sys
import time
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

MODEL_ID = "vibevoice/VibeVoice-1.5B-hf"

# Reference voices. These ship with the model's own sample set, so we have the
# right to use them. Never clone a real person without Khalid saying so.
VOICES = {
    "A": ROOT / "voices" / "en-Carter_man.wav",
    "B": ROOT / "voices" / "en-Alice_woman.wav",
}
ROLE = {"A": "0", "B": "1"}

TARGET_DBFS = -20.0      # matched loudness across clips
EDGE_SILENCE = 0.2       # seconds of room at each end, so clips do not clip together


def load_script(name: str) -> dict:
    module = importlib.import_module(f"scripts.{name}")
    return module.SCRIPT


def conversation_for(turns: list[tuple[str, str]], first_use: set[str]) -> list[dict]:
    """One beat as a VibeVoice conversation. A speaker's reference clip is
    attached every beat, because each beat is generated on its own."""
    convo = []
    for speaker, line in turns:
        content = [{"type": "text", "text": line}]
        clip = VOICES[speaker]
        if not clip.exists():
            raise SystemExit(f"missing reference voice: {clip}")
        content.append({"type": "audio", "url": str(clip)})
        first_use.add(speaker)
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


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--script", required=True, help="module name under video/scripts/")
    ap.add_argument("--only", nargs="*", help="render just these beats")
    ap.add_argument("--force", action="store_true", help="re-render beats that exist")
    ap.add_argument("--guidance", type=float, default=1.3, help="classifier-free guidance")
    ap.add_argument("--steps", type=int, default=20, help="diffusion steps")
    ap.add_argument("--device", default="auto", help="auto, cuda:0, cuda:1 or cpu")
    ap.add_argument("--out", default=None, help="output directory")
    args = ap.parse_args()

    script = load_script(args.script)
    out = Path(args.out) if args.out else ROOT / "out" / "audio" / args.script
    out.mkdir(parents=True, exist_ok=True)

    keys = args.only or list(script)
    todo = [k for k in keys if args.force or not (out / f"{k}.wav").exists()]
    if not todo:
        print("nothing to render")
        return 0

    from transformers import AutoModelForTextToWaveform, AutoProcessor

    print(f"loading {MODEL_ID} on {args.device}...", file=sys.stderr)
    processor = AutoProcessor.from_pretrained(MODEL_ID)
    model = AutoModelForTextToWaveform.from_pretrained(
        MODEL_ID, device_map=args.device if args.device != "auto" else "auto"
    )
    model.eval()
    sr = processor.feature_extractor.sampling_rate

    durations_path = out / "durations.json"
    durations = json.loads(durations_path.read_text()) if durations_path.exists() else {}

    for key in todo:
        turns = script[key]
        convo = conversation_for(turns, set())
        inputs = processor.apply_chat_template(
            convo, return_dict=True, tokenize=True, add_generation_prompt=True,
        ).to(model.device, model.dtype)

        started = time.time()
        audio = model.generate(
            **inputs,
            guidance_scale=args.guidance,
            num_diffusion_steps=args.steps,
        )
        wav = audio[0] if isinstance(audio, (list, tuple)) else audio
        wav = wav.detach().cpu().float().numpy()
        seconds = write_wav(out / f"{key}.wav", normalise(wav, sr), sr)
        durations[key] = round(seconds, 3)
        durations_path.write_text(json.dumps(durations, indent=2, sort_keys=True))
        words = sum(len(line.split()) for _, line in turns)
        print(f"{key:18s} {seconds:6.2f}s  {words:4d} words  "
              f"({words / max(seconds, 0.01) * 60:5.0f} wpm)  "
              f"rendered in {time.time() - started:.1f}s")

    total = sum(durations.get(k, 0.0) for k in script)
    print(f"\n{len(durations)} of {len(script)} beats, {total / 60:.1f} minutes of speech")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
