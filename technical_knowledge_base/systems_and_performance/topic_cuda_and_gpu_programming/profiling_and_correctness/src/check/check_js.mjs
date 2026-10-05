// Runs parts/24_js_fp.js in Node and compares it with out/expected.json (code/reference.py, PyTorch casts).
// Usage (from src/): node check/check_js.mjs
import fs from 'fs'; import vm from 'vm';
const ctx={window:{},Math};vm.createContext(ctx);
vm.runInContext(fs.readFileSync('parts/24_js_fp.js','utf8'),ctx);
const FP=ctx.window.FP,E=JSON.parse(fs.readFileSync('out/expected.json','utf8'));
let bad=0,n=0;
for(let [x,k,want] of E.round){if(want==='inf')want=Infinity;if(want==='-inf')want=-Infinity;n++;const got=FP.round(x,k);if(!(got===want||(Number.isNaN(got)&&want===null))){bad++;if(bad<8)console.log('round',k,x,'js',got,'py',want)}}
const r=FP.rng(42);E.prng42.forEach(v=>{n++;const g=r();if(g!==v){bad++;console.log('prng',g,v)}});
for(const {o,r:want} of E.experiments){const got=FP.experiment(o);for(const k of ['median','p90','max','pass']){n++;if(got[k]!==want[k]){bad++;console.log('exp',JSON.stringify(o),k,got[k],want[k])}}}
console.log(n,'values compared,',bad,'mismatches');process.exit(bad?1:0);
