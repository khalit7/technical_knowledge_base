# The f_mod folder: package.json says "type": "module", so .js files are ES modules
cd f_mod
echo '$ node main.js'; node main.js
echo '$ node old.cjs'; node old.cjs
echo '$ node old_tla.cjs'; node old_tla.cjs
