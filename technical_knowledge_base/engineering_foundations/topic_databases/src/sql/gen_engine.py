"""Vendor the in-page SQL engine: sql.js 1.14.2 (SQLite compiled to WebAssembly) into parts/31_js_sql_a_engine.js.
The page has no network, so the .wasm file is inlined as base64 and handed to initSqlJs({wasmBinary}).
Run: python3 gen_engine.py   (needs npm; downloads the package tarball from the npm registry into a temp folder)
Licence: sql.js is MIT (notice copied into the part's header); SQLite itself is public domain (https://sqlite.org/copyright.html)."""
import os, subprocess, tempfile, tarfile, base64, hashlib, glob
VER = '1.14.2'
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'parts', '31_js_sql_a_engine.js')
t = tempfile.mkdtemp(prefix='sqljs')
subprocess.run(['npm', 'pack', f'sql.js@{VER}'], cwd=t, check=True, capture_output=True)
tgz = glob.glob(os.path.join(t, '*.tgz'))[0]
tarfile.open(tgz).extractall(t)
P = os.path.join(t, 'package')
js = open(os.path.join(P, 'dist', 'sql-wasm.js')).read()
wasm = open(os.path.join(P, 'dist', 'sql-wasm.wasm'), 'rb').read()
lic = open(os.path.join(P, 'LICENSE')).read().split('# Some portions')[0].strip()
sha = hashlib.sha256(open(tgz, 'rb').read()).hexdigest()
assert '</script' not in js.lower() and '{{' not in js and '\u2014' not in js
head = (f'/* sql.js {VER}: SQLite compiled to WebAssembly, from https://registry.npmjs.org/sql.js/-/sql.js-{VER}.tgz '
        f'(sha256 {sha}), vendored by src/sql/gen_engine.py. SQLite is public domain.\n' + lic.replace('*/', '* /') + '\n*/\n')
with open(OUT, 'w') as f:
    f.write(head)
    f.write(js)
    f.write('\nwindow.SQ_WASM_B64="' + base64.b64encode(wasm).decode() + '";\n')
print('wrote', OUT, os.path.getsize(OUT), 'bytes; wasm', len(wasm), 'sha256 tgz', sha)
