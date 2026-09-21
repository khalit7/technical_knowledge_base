#!/usr/bin/env python3
"""
Render the same thirty seconds through every candidate voice, so the choice is
made by listening rather than by reading benchmark tables.

    python3 video/tts/bakeoff.py                 # all candidates
    python3 video/tts/bakeoff.py --only vibevoice-expressive

Output lands in video/out/bakeoff/, one WAV per candidate plus NOTES.md saying
what to listen for. The Piper baseline is whatever the prototype produced: it
is intelligible and obviously synthetic, and it is the bar to clear.

Listen for, in this order:
  1. Does a sentence end sound like a sentence ending, or like the clip ran out?
  2. Do the two voices sound like two people, or like one voice pitch-shifted?
  3. Do the numbers land? "three point two two times" is where TTS usually
     falls apart.
  4. Does B's interruption sound like a reaction, or like the next paragraph?
"""

from __future__ import annotations

import argparse
import shutil
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

OUT = ROOT / "out" / "bakeoff"

# One beat with both speakers, a hard number, and an interruption. Thirty
# seconds is enough to hear everything that goes wrong.
EXCERPT = [
    ("A", "Zed dot A I published a post about how G L M five point three built the "
          "inference infrastructure that now serves it, on more than a hundred "
          "thousand Chinese accelerators."),
    ("A", "Thirteen days from start to production. Three point two two times the "
          "throughput they began with."),
    ("B", "And they are careful to say this is not recursive self improvement."),
    ("A", "They are, and that is exactly why the post is worth reading."),
]

CANDIDATES = {
    # name: (guidance_scale, num_diffusion_steps)
    "vibevoice-default": (1.3, 20),
    "vibevoice-expressive": (1.6, 20),
    "vibevoice-fast": (1.3, 10),
}


def run_vibevoice(name: str, guidance: float, steps: int, device: str) -> float:
    from transformers import AutoModelForTextToWaveform, AutoProcessor

    from tts.render import MODEL_ID, ROLE, VOICES, normalise, write_wav

    processor = AutoProcessor.from_pretrained(MODEL_ID)
    model = AutoModelForTextToWaveform.from_pretrained(
        MODEL_ID, device_map=device if device != "auto" else "auto"
    )
    model.eval()
    sr = processor.feature_extractor.sampling_rate

    convo = []
    for speaker, line in EXCERPT:
        convo.append({
            "role": ROLE[speaker],
            "content": [
                {"type": "text", "text": line},
                {"type": "audio", "url": str(VOICES[speaker])},
            ],
        })

    inputs = processor.apply_chat_template(
        convo, return_dict=True, tokenize=True, add_generation_prompt=True,
    ).to(model.device, model.dtype)

    started = time.time()
    audio = model.generate(**inputs, guidance_scale=guidance, num_diffusion_steps=steps)
    wav = (audio[0] if isinstance(audio, (list, tuple)) else audio).detach().cpu().float().numpy()
    seconds = write_wav(OUT / f"{name}.wav", normalise(wav, sr), sr)
    print(f"{name:24s} {seconds:5.1f}s of audio in {time.time() - started:5.1f}s")
    return seconds


def copy_piper_baseline() -> bool:
    """The prototype's Piper render, kept as the thing to beat."""
    for candidate in (Path.home() / "manim-tech-news" / "audio" / "s3_lead.wav",
                      ROOT / "voices" / "piper-baseline.wav"):
        if candidate.exists():
            shutil.copy(candidate, OUT / "piper-baseline.wav")
            return True
    return False


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--only", nargs="*", help="candidate names to render")
    ap.add_argument("--device", default="auto")
    args = ap.parse_args()

    OUT.mkdir(parents=True, exist_ok=True)
    have_baseline = copy_piper_baseline()

    names = args.only or list(CANDIDATES)
    for name in names:
        guidance, steps = CANDIDATES[name]
        run_vibevoice(name, guidance, steps, args.device)

    (OUT / "NOTES.md").write_text(
        "# Voice bake-off\n\n"
        "Same thirty seconds through each candidate. Decide by listening.\n\n"
        f"- `piper-baseline.wav`: the prototype's voice{'' if have_baseline else ' (NOT FOUND)'}. "
        "Intelligible, obviously synthetic. This is the bar.\n"
        + "".join(f"- `{n}.wav`: VibeVoice, guidance {CANDIDATES[n][0]}, "
                  f"{CANDIDATES[n][1]} diffusion steps.\n" for n in names)
        + "\nWhat to listen for:\n\n"
        "1. Does a sentence end sound like a sentence ending, or like the clip ran out?\n"
        "2. Do the two voices sound like two people?\n"
        "3. Do the numbers land? \"three point two two times\" is the usual failure.\n"
        "4. Does B's line sound like a reaction, or like the next paragraph?\n"
    )
    print(f"\nwritten to {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
