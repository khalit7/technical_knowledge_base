# Scratch toolchain paths (never system-wide). PL defaults to this session's scratchpad.
: "${PL:=${TMPDIR:-/tmp}/pl}"
export PL
export UV_PYTHON_INSTALL_DIR=$PL/py UV_CACHE_DIR=$PL/uvcache UV_TOOL_DIR=$PL/uvtools UV_TOOL_BIN_DIR=$PL/uvtools/bin UV_PYTHON_INSTALL_BIN=0
export PATH=$PL/bin:$PL/uvtools/bin:$PATH
export WORK=$PL/pb/work; mkdir -p $WORK
PY311=$PL/py/cpython-3.11.17-macos-aarch64-none/bin/python3
PY312=$PL/py/cpython-3.12.15-macos-aarch64-none/bin/python3
PY313=$PL/py/cpython-3.13.16-macos-aarch64-none/bin/python3
PY314=$PL/py/cpython-3.14.8-macos-aarch64-none/bin/python3
PY314T=$PL/py/cpython-3.14.8+freethreaded-macos-aarch64-none/bin/python3
PY315=$PL/py/cpython-3.15.0rc3-macos-aarch64-none/bin/python3
PY315T=$PL/py/cpython-3.15.0rc3+freethreaded-macos-aarch64-none/bin/python3
export PY311 PY312 PY313 PY314 PY314T PY315 PY315T
