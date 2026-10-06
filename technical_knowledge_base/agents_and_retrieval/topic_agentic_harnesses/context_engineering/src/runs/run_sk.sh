cd "$(dirname "$0")"
exec python3 drive.py "$PWD/w_sk_invoke" raw/sk_invoke.jsonl msgs_skill.json --model haiku --permission-mode acceptEdits --tools "Read,Edit,Write,Bash,Grep,Glob,Skill" --allowedTools "Bash(python3:*)" "Bash(ls:*)" "Bash(cat:*)" > raw/sk_invoke.log 2>&1
