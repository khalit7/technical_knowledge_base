# Shared helpers for the Debug lab experiments (sourced by every exp/*.sh inside the container).
# sec "label"   starts a named section of the recording; the page quotes whole sections.
# run "cmd"     prints "$ cmd" and then the command's output (stdout and stderr), like a terminal.
sec() { echo; echo "### $*"; }
run() { echo "\$ $*"; bash -c "$*" 2>&1; }
data() { mkdir -p /work/data /work/out; python /job/make_data.py /work/data/train.bin > /dev/null; }
