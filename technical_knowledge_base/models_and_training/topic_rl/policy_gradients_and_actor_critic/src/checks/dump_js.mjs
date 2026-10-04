// Runs the page's engine (parts/21_js_pg_engine.js) in Node and writes every value the page shows by default to js_dump.json,
// for recompute.py to compare against its own independent implementation.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
new Function(fs.readFileSync(path.join(here,'../parts/21_js_pg_engine.js'),'utf8'))();const E=globalThis.PGE;
const A=x=>Array.from(x);const out={};
out.pgStats=E.pgStats([0,0,0],[1,2,6]);
out.pgRun={};for(const off of [0,10])for(const s of [5,6,7,8])for(const b of [false,true])out.pgRun[off+'|'+s+'|'+b]=E.pgRun([1+off,2+off,6+off],0.1,60,s,b).map(h=>({pi:h.pi,a:h.a,V:h.V,var0:h.var0,varB:h.varB}));
out.pgStuck={};for(const off of [0,10,20])for(const b of [false,true]){const sp=E.pgSpread([1+off,2+off,6+off],0.1,60,b,100,200);out.pgStuck[off+'|'+b]={stuck:sp.finals.filter(v=>v<3+off).length,band:sp.band}}
out.baseVar={};for(const l of [-3,0,2,3])for(const b of [-2,0,3,8])out.baseVar[l+'|'+b]=E.baseVar([0,0,l],[1,2,6],b);
out.gae={};for(const lam of [0,0.5,0.95,1])for(const g of [0.8,0.99,1])for(const err of [-0.5,0,0.3]){out.gae['ex|'+lam+'|'+g+'|'+err]=E.gae([0,0,1],[0.5+err,0.6+err,0.8+err],g,lam);
  const V=[];for(let t=0;t<8;t++)V.push(Math.pow(g,7-t)+err);out.gae['long|'+lam+'|'+g+'|'+err]=E.gae([0,0,0,0,0,0,0,1],V,g,lam)}
out.ppoL={};for(const r of [0,0.5,0.7,0.8,1,1.2,1.5,2.5])for(const A_ of [1,-1,2])for(const e of [0.1,0.2,0.3])out.ppoL[r+'|'+A_+'|'+e]=[E.ppoL(r,A_,e,true),E.ppoL(r,A_,e,false),E.ppoDL(r,A_,e)];
out.ppoRun={};for(const A_ of [1,-1])for(const e of [0.05,0.2,0.5])for(const h of [0.05,0.2,0.6])for(const c of [true,false])out.ppoRun[A_+'|'+e+'|'+h+'|'+c]=E.ppoRun(A_,e,h,10,c);
out.sacGauss={};for(const a of [0.005,0.01,0.05,0.1,0.15,0.16,0.2,0.3,1])out.sacGauss[a]=E.sacGauss(a);
out.sacBoltz={};for(const a of [0.005,0.05,0.2,1]){const z=E.sacBoltz(a);out.sacBoltz[a]={ER:z.ER,H:z.H}}
out.sacAuto=E.sacAuto(-1);
out.corV={};for(const p of [0.05,0.5,0.95,E.COR.pStar])out.corV[p]=E.corV(p);out.COR=E.COR;
out.corRun={};for(const [k,at,aw] of [['rf',-13,0],['rfb',-9,-6],['ac',-9,-6]])for(const s of [1,2])for(const eps of [0.05,0]){const o=E.corRun(k,Math.pow(2,at),aw?Math.pow(2,aw):0,300,s,eps,5000);out.corRun[k+'|'+s+'|'+eps]={tot:A(o.tot),ps:A(o.ps),cut:o.cut,w:o.w}}
out.corAvg={};for(const [id,k,at,aw] of [['r12','rf',-12,0],['r13','rf',-13,0],['r14','rf',-14,0],['rb','rfb',-9,-6],['ac','ac',-9,-6],['ac12','ac',-12,-6]]){const o=E.corAvg(k,Math.pow(2,at),aw?Math.pow(2,aw):0,1000,100,1,0.05,5000);
  const av=(a,b)=>{let q=0;for(let e=a;e<b;e++)q+=o.m[e];return q/(b-a)};out.corAvg[id]={e1_10:av(0,10),e100_200:av(100,200),e400_500:av(400,500),e900_1000:av(900,1000),pEnd:o.mp[1000],cut:o.cut}}
fs.writeFileSync(path.join(here,'js_dump.json'),JSON.stringify(out));console.log('wrote js_dump.json');
