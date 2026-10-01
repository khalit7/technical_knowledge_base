# video_utils

Tools for the `create-explainer-video` skill: narrated explainer videos of knowledge base pages, with visuals from HyperFrames and narration from Chatterbox Turbo.

| File | What it does |
|---|---|
| `narrate.py` | Voices each line of a `narration_lines.tsv` with Chatterbox Turbo (default voice) into `NN-cb.wav`. Picks the backend that is installed. |
| `check_takes.py` | Transcribes each take, flags bad ones (REDO), and writes the `voices` of `audio_meta.json` with spelling fixes for the captions. |
| `voice_cuda/` | uv project: Resemble AI's `chatterbox-tts` on PyTorch with CUDA 12.8 wheels (works on Blackwell / RTX 50xx). Linux and Windows. |
| `voice_mac/` | uv project: `mlx-audio` running `mlx-community/chatterbox-turbo-fp16` on Apple Silicon. |
| `vendor_skills.sh` | After a HyperFrames skills update, copies the skills into `.claude/skills/` as real folders. |

## Install (once per machine)

```bash
# 1. uv (https://docs.astral.sh/uv/)
curl -LsSf https://astral.sh/uv/install.sh | sh

# 2. Node 22+ and ffmpeg (Ubuntu shown; on macOS: brew install node ffmpeg)
sudo apt install -y ffmpeg
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs

# 3. The voice environment
uv sync --project video_utils/voice_cuda                    # NVIDIA machine (Python 3.14, torch cu128)
uv sync --project video_utils/voice_mac --managed-python    # Apple Silicon Mac

# 4. Check it (first run downloads the Turbo model, a few GB, into the Hugging Face cache)
printf '1\tCapability rankings change every month.\n' > /tmp/one.tsv
uv run --project video_utils/voice_cuda python video_utils/narrate.py /tmp/one.tsv /tmp/voice
```

Notes:
- `voice_cuda` needs Python 3.14: below it, `chatterbox-tts` pins torch 2.6, which has no kernels for RTX 50xx cards. uv downloads 3.14 itself.
- The CUDA backend falls back to CPU (slowly) when no GPU is visible; it prints a warning.
- Use a uv-managed Python on the Mac (`--managed-python`): a Homebrew Python can lack OpenSSL and then cannot download the model.
- HyperFrames itself needs no install beyond Node: projects call `npx hyperframes@<pinned version>` through their `package.json` scripts, and it renders with its own headless Chrome. If the system ffmpeg fails to load a library, put a static build first on PATH.

## A project's layout
`<page>/video/` is a HyperFrames project: `BRIEF.md`, `frame.md`, `SCRIPT.md`, `STORYBOARD.md`, `narration_lines.tsv`, `compositions/`, `index.html`, `assets/` (fonts, sfx, `voice/NN-cb.wav`), `audio_meta.json`, `package.json`. `renders/` and `snapshots/` are gitignored; the MP4 is uploaded to Notion and kept only there.
