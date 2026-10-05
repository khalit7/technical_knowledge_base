// check: no
// cmd: cat biome.json; npx biome lint app.ts 2>&1 | grep -v -E "^ *$" | sed -n '/noFloatingPromises/,/^  i /p'
// file: _.ts
