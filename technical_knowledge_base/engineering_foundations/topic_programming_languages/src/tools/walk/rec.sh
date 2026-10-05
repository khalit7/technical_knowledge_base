# usage: . rec.sh ; rec "<command>"   appends to $TRANSCRIPT
rec(){ echo "\$ $1" >> "$TRANSCRIPT"; bash -c "$1" >> "$TRANSCRIPT" 2>&1; echo "[exit $?]" >> "$TRANSCRIPT"; echo >> "$TRANSCRIPT"; }
tree_list(){ (cd "$1" && find . -path ./.git -prune -o -path ./.venv -prune -o -path ./target -prune -o -path ./node_modules -prune -o -path ./build -prune -o -print | sort) ; }
