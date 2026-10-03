// Runs parts/21_js_toy.js under node for a set of cases and writes checks/toy_js.json for toy_ref.py.
import fs from 'fs';import path from 'path';import {fileURLToPath} from 'url';
const here=path.dirname(fileURLToPath(import.meta.url));
eval(fs.readFileSync(path.join(here,'../parts/21_js_toy.js'),'utf8'));
const cases=[];
for(const place of ['post','pre','peri','out','none','deep'])for(const L of [3,12])for(const init of ['xavier','gpt2'])
  cases.push({place,L,init,seed:L+7});
for(const c of cases){const o=globalThis.NI.toy(c);c.out={stream:o.stream,g2:o.g2,g1:o.g1,gV:o.gV,loss:o.loss}}
fs.writeFileSync(path.join(here,'toy_js.json'),JSON.stringify(cases));
console.log('wrote',cases.length,'cases');
