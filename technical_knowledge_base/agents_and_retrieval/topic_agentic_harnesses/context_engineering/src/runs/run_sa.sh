cd "$(dirname "$0")"
N=$1; M=$2; T=$3
exec python3 drive.py "$PWD/w_$N" raw/$N.jsonl $M --model haiku --permission-mode acceptEdits --tools "$T" --allowedTools "Bash(ls:*)" "Bash(cat:*)" > raw/$N.log 2>&1
