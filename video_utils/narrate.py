"""Voice every narration line with Chatterbox Turbo (default voice).

usage (from the repo root):
  Apple Silicon:   uv run --project video_utils/voice_mac  python video_utils/narrate.py LINES.tsv OUT_DIR [--only 3,5]
  NVIDIA (CUDA):   uv run --project video_utils/voice_cuda python video_utils/narrate.py LINES.tsv OUT_DIR [--only 3,5]

LINES.tsv holds one narration line per row: `N<TAB>text`, N being the frame number.
Each line is written to OUT_DIR/NN-cb.wav. The backend is picked from the installed package:
mlx-audio (model mlx-community/chatterbox-turbo-fp16) or Resemble AI's chatterbox-tts
(model ResembleAI/chatterbox-turbo). Both ship the same built-in voice; Turbo ignores the
exaggeration and guidance settings, so there are none to set.
"""
import argparse, importlib.util, shutil, subprocess, sys, tempfile
from pathlib import Path

MLX_MODEL = "mlx-community/chatterbox-turbo-fp16"


def read_lines(path):
    rows = []
    for raw in Path(path).read_text().splitlines():
        if raw.strip():
            n, text = raw.split("\t", 1)
            rows.append((int(n), text.strip()))
    return rows


def voice_mlx(rows, out):
    for n, text in rows:
        with tempfile.TemporaryDirectory() as tmp:
            subprocess.run([sys.executable, "-m", "mlx_audio.tts.generate", "--model", MLX_MODEL,
                            "--text", text, "--output_path", tmp, "--file_prefix", f"{n:02d}",
                            "--join_audio", "--audio_format", "wav"], check=True)
            wavs = sorted(Path(tmp).glob("*.wav"))
            shutil.move(str(wavs[-1]), out / f"{n:02d}-cb.wav")
        print(f"{n:02d}-cb.wav")


def voice_torch(rows, out):
    import torch, torchaudio
    from chatterbox.tts_turbo import ChatterboxTurboTTS
    device = "cuda" if torch.cuda.is_available() else "cpu"
    if device == "cpu":
        print("warning: no CUDA device, running on CPU (slow)", file=sys.stderr)
    model = ChatterboxTurboTTS.from_pretrained(device=device)
    for n, text in rows:
        wav = model.generate(text)
        torchaudio.save(str(out / f"{n:02d}-cb.wav"), wav, model.sr)
        print(f"{n:02d}-cb.wav")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("lines")
    ap.add_argument("out_dir")
    ap.add_argument("--only", help="comma-separated line numbers to (re)generate")
    a = ap.parse_args()
    rows = read_lines(a.lines)
    if a.only:
        keep = {int(x) for x in a.only.split(",")}
        rows = [r for r in rows if r[0] in keep]
    out = Path(a.out_dir)
    out.mkdir(parents=True, exist_ok=True)
    if importlib.util.find_spec("mlx_audio"):
        voice_mlx(rows, out)
    elif importlib.util.find_spec("chatterbox"):
        voice_torch(rows, out)
    else:
        sys.exit("No Chatterbox backend installed: run `uv sync` in video_utils/voice_mac or video_utils/voice_cuda.")


if __name__ == "__main__":
    main()
