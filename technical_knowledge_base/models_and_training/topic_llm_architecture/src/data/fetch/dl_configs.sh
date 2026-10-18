#!/bin/sh
# usage: dl_configs.sh <list.tsv> <outdir>; writes <key>.json and fetched.tsv (key repo sha date)
L=$1; O=$2; mkdir -p "$O"; : > "$O/fetched.tsv"
while IFS='	' read -r key repo alt; do
  for r in $repo $alt; do
    [ "$r" = "-" ] && continue
    code=$(curl -sL -o "$O/$key.json" -w '%{http_code}' --max-time 30 "https://huggingface.co/$r/raw/main/config.json")
    if [ "$code" = 200 ] && python3 -I -c "import json,sys;json.load(open(sys.argv[1]))" "$O/$key.json" 2>/dev/null; then
      sha=$(curl -sL --max-time 30 "https://huggingface.co/api/models/$r/revision/main" | python3 -I -c "import json,sys;d=json.load(sys.stdin);print(d.get('sha','?'))" 2>/dev/null)
      printf '%s\t%s\t%s\t%s\n' "$key" "$r" "$sha" "$(date -u +%Y-%m-%d)" >> "$O/fetched.tsv"; echo "ok $key $r"; break
    else echo "fail $key $r $code"; rm -f "$O/$key.json"; fi
  done
done < "$L"
