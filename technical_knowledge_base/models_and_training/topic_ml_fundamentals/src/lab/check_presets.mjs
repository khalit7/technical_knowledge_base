// Runs every preset of the Training lab (parts/32_js_lab_b.js) on seeds 1 to 10 with the page's own engine,
// evaluates each claim, and fails if a claim's stated count (`ok`) differs from what the runs give.
// usage: node check_presets.mjs [preset id ...]   writes preset_seeds.json
import fs from 'node:fs';import {LB} from './load_engine.mjs';
const only=process.argv.slice(2),out={},bad=[];
for(const P of LB.PRESETS){if(only.length&&!only.includes(P.id))continue;const rows=[],cnt=P.claims.map(()=>0);const t0=Date.now();
  for(let seed=1;seed<=10;seed++){const sh={...LB.SHDEF,...P.sh,seed,light:true},d=LB.makeData(sh.task,sh.n,sh.noise,seed);
    const ra=new LB.Run({...LB.DEF,...P.a},d,sh),rb=new LB.Run({...LB.DEF,...P.b},d,sh);while(!ra.done)ra.step();while(!rb.done)rb.step();
    const A=LB.summ(ra),B=LB.summ(rb),res=P.claims.map((c,i)=>{const v=!!c.j(A,B);if(v)cnt[i]++;return v});
    const f=x=>({vaA:+x.vaA.toFixed(3),trA:+x.trA.toFixed(3),vaL:+x.vaL.toFixed(4),trL:+x.trL.toFixed(4),div:x.div,stopped:x.stopped,wn:+x.wn.toPrecision(3),gratio:+(+x.gratio).toPrecision(3),act0:x.act0.map(v=>+v.toPrecision(3))});
    rows.push({seed,A:f(A),B:f(B),claims:res})}
  out[P.id]={name:P.name,claims:P.claims.map((c,i)=>({t:c.t,stated:c.ok,measured:cnt[i]})),rows};
  P.claims.forEach((c,i)=>{if(c.ok!==cnt[i])bad.push(P.id+': "'+c.t+'" stated '+c.ok+', measured '+cnt[i])});
  console.log(P.id.padEnd(8),P.claims.map((c,i)=>cnt[i]+'/10').join('  '),((Date.now()-t0)/1000).toFixed(1)+'s')}
if(!only.length)fs.writeFileSync(new URL('./preset_seeds.json',import.meta.url),JSON.stringify(out,null,1));
console.log(bad.length?'MISMATCH\n'+bad.join('\n'):'all stated counts match');process.exit(bad.length?1:0);
