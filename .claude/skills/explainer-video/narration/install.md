# Installing the narration tools (once per machine)

Narration is Chatterbox Turbo with its default voice, run locally. Two backends ship the same voice:

| Folder | Backend | Machine |
|---|---|---|
| `voice_mac/` | `mlx-audio` running `mlx-community/chatterbox-turbo-fp16` | Apple Silicon Mac (Python 3.12 or 3.13) |
| `voice_cuda/` | Resemble AI's `chatterbox-tts` (`ResembleAI/chatterbox-turbo`) on PyTorch with CUDA 12.8 wheels, works on Blackwell (RTX 50xx) | Linux or Windows with an NVIDIA GPU (Python 3.14) |

`narrate.py` picks whichever backend is installed in the environment it runs in. Each folder is a uv project (`pyproject.toml` plus `uv.lock`); its `.venv` is created next to it and never committed (`.gitignore` has `.venv/`).

## Steps (from the repo root)
```bash
# 1. uv (https://docs.astral.sh/uv/)
curl -LsSf https://astral.sh/uv/install.sh | sh

# 2. Node 22+ and ffmpeg/ffprobe on PATH (macOS: brew install node ffmpeg; Ubuntu below)
sudo apt install -y ffmpeg
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs

# 3. The voice environment
uv sync --project .claude/skills/explainer-video/narration/voice_mac --managed-python   # Apple Silicon Mac
uv sync --project .claude/skills/explainer-video/narration/voice_cuda                   # NVIDIA machine

# 4. Smoke test (the first run downloads the Turbo model, a few GB, into the Hugging Face cache)
N=.claude/skills/explainer-video/narration
printf '1\tCapability rankings change every month.\n' > /tmp/one.tsv
uv run --project $N/voice_mac python $N/narrate.py /tmp/one.tsv /tmp/voice      # or voice_cuda
ffprobe -v error -show_entries format=duration -of csv=p=0 /tmp/voice/01-cb.wav
```
The smoke test passes when it prints `01-cb.wav` and ffprobe reports a duration of a few seconds. Optionally run `python3 $N/check_takes.py /tmp/one.tsv /tmp/voice` from `/tmp` to test transcription too (it calls `npx hyperframes transcribe`, which downloads a small Whisper model on first use).

## Notes
- **Mac: use a uv-managed Python (`--managed-python`).** A Homebrew Python can lack OpenSSL and then cannot download the model.
- **CUDA: Python 3.14 is required.** Below it, `chatterbox-tts` pins torch 2.6, which has no kernels for RTX 50xx cards; on 3.14 it accepts torch 2.9 or later, which the cu128 index provides. uv downloads 3.14 itself.
- The CUDA backend falls back to CPU (slowly) when no GPU is visible, and prints a warning.
- HyperFrames itself needs no install beyond Node: projects call `npx hyperframes@<pinned version>` through their `package.json` scripts and render with their own headless Chrome. If the system ffmpeg fails to load a library, put a static ffmpeg build first on PATH.
- The voice environments are pinned by `uv.lock`; update them only deliberately (`uv lock --upgrade --project <folder>`), then re-run the smoke test, and never switch the voice without Khalid's yes.

## Daily use
From a page's `video/` folder:
```bash
R="$(git rev-parse --show-toplevel)"; N="$R/.claude/skills/explainer-video/narration"
uv run --project "$N/voice_mac" python "$N/narrate.py" narration_lines.tsv assets/voice [--only 3,5]
python3 "$N/check_takes.py" narration_lines.tsv assets/voice [--fix "heard=meant"] [--write]
```
`check_takes.py` is stdlib only (it needs `npx` and `ffprobe` on PATH), so plain `python3` runs it.

## Sources distilled
`video_utils/README.md` (install, notes, project layout); `video_utils/narrate.py`, `check_takes.py`; `video_utils/voice_mac/pyproject.toml` and `voice_cuda/pyproject.toml`; `.claude/skills/create-explainer-video/SKILL.md` (Setup).
