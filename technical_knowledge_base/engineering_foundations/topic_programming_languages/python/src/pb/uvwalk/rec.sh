# usage: . rec.sh ; rec "<command>"   appends "$ command", output and exit code to $TRANSCRIPT (as in the root's walk/rec.sh)
rec(){ echo "\$ $1" >> "$TRANSCRIPT"; bash -c "$1" >> "$TRANSCRIPT" 2>&1; echo "[exit $?]" >> "$TRANSCRIPT"; echo >> "$TRANSCRIPT"; }
note(){ echo "## $1" >> "$TRANSCRIPT"; }
tree_list(){ (cd "$1" && find . -path ./.git -prune -o -path ./.venv -prune -o -path '*/__pycache__' -prune -o -path ./dist -prune -o -print | sort) ; }
