#!/usr/bin/env bash
# Build both environments this toolchain needs. Neither needs root.
#
#   bash video/env/setup.sh            # both
#   bash video/env/setup.sh manim      # just the animation environment
#   bash video/env/setup.sh tts        # just the voice environment
#
# Nothing here is installed system-wide and apt is never used: there is no sudo
# on this machine, so anything needing system libraries has to come from
# conda-forge or a wheel.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WHAT="${1:-both}"

MAMBA_BIN="$HERE/micromamba"
export MAMBA_ROOT_PREFIX="$HERE/mamba"

build_manim() {
  if [[ ! -x "$MAMBA_BIN" ]]; then
    echo "fetching micromamba..."
    curl -Ls https://micro.mamba.pm/api/micromamba/linux-64/latest \
      | tar -xvj -C "$HERE" --strip-components=1 bin/micromamba
  fi
  "$MAMBA_BIN" create -y -p "$HERE/manim" -f "$HERE/manim-env.yml"
  "$HERE/manim/bin/python" -c "import manim; print('manim', manim.__version__)"
}

build_tts() {
  # Blackwell (compute capability 12.0) needs CUDA 12.8 wheels. Installing the
  # torch that chatterbox-tts pins (2.6.0) gives a working import and a GPU that
  # never engages, so torch comes first and from the cu128 index.
  python3 -m venv "$HERE/tts"
  "$HERE/tts/bin/pip" install -q --upgrade pip
  "$HERE/tts/bin/pip" install -q torch==2.11.0+cu128 torchaudio==2.11.0+cu128 \
    --index-url https://download.pytorch.org/whl/cu128
  "$HERE/tts/bin/pip" install -q -r "$HERE/tts-requirements.txt"
  "$HERE/tts/bin/python" - <<'PY'
import torch, transformers, importlib.util
print("torch", torch.__version__, "cuda", torch.cuda.is_available(),
      torch.cuda.device_count(), "devices")
print("transformers", transformers.__version__)
print("vibevoice in transformers:",
      importlib.util.find_spec("transformers.models.vibevoice") is not None)
PY
}

case "$WHAT" in
  manim) build_manim ;;
  tts)   build_tts ;;
  both)  build_manim; build_tts ;;
  *) echo "usage: setup.sh [manim|tts|both]" >&2; exit 2 ;;
esac

cat <<EOF

Done. Point the build at these with:

  export KB_MANIM_PYTHON=$HERE/manim/bin/python
  export KB_FFMPEG=$HERE/manim/bin/ffmpeg
  export KB_TTS_PYTHON=$HERE/tts/bin/python
EOF
