// Runs the page's engine (parts/21_js_mf_engine.js) in Node on small and default configurations and writes mf_dump.json for recompute.py.
// usage (from src/checks): node dump_mf.mjs
import {createRequire} from 'node:module';import path from 'node:path';import {fileURLToPath} from 'node:url';import fs from 'node:fs';
const here=path.dirname(fileURLToPath(import.meta.url));
const E=createRequire(import.meta.url)(path.resolve(here,'../parts/21_js_mf_engine.js'));
const run=g=>{let r;while(!(r=g.next()).done);return r.value};
const out={};
const d=E.mDefault();out.four={seed:d.seed,Q0:d.Q0,T:d.T,F:E.fourLearners(d.Q0,d.T,0.5,0.1).F.map(f=>f.Q)};
out.lam=E.lamReturn([0,0,1],[0.5,0.5],1,0.5);
out.tt=E.twoTargets({R:-1,q:-5,qBest:-4,qDown:-100,qO1:-5,qO2:-6,qAp:-100,a:0.5,g:1,eps:0.1});
out.fall=E.cliffFall(0.1,4,10);
out.emax=[E.emax(3),E.emax(10)];
out.mxSmall=run(E.mxJob({seed:7,runs:50,episodes:100,nb:10,eps:0.1,alpha:0.1}));
out.mxFull=run(E.mxJob({seed:1,runs:10000,episodes:300,nb:10,eps:0.1,alpha:0.1}));
out.bjExact=E.bjExact();
out.bjSmall=run(E.bjJob({seed:7,runs:5,episodes:500,truth:out.bjExact}));
out.bjFull=run(E.bjJob({seed:1,runs:100,episodes:10000,truth:out.bjExact}));
out.ivSmall=run(E.ivJob({seed:7,runs:3,episodes:20000,per:20}));
out.ivFull=run(E.ivJob({seed:1,runs:10,episodes:1000000,per:20}));
fs.writeFileSync(path.join(here,'mf_dump.json'),JSON.stringify(out));console.log('wrote mf_dump.json');
