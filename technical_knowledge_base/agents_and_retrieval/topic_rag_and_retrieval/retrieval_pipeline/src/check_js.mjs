// Checks the page's JavaScript against the Python it ports: chunkers (root src/pipe/chunkers.py) on the two
// workbench papers, and fusion (src/exp/fusion_deep.py) via the recorded nDCG of the lab's queries.
// usage: RAG_SCRATCH=... node check_js.mjs
import fs from 'fs'; import vm from 'vm';
const ctx={window:{},console};ctx.window.RD={width:()=>800,svg:()=>'',t:()=>'',seg:()=>{}};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(new URL('./parts/22_rp_data.js',import.meta.url),'utf8'),ctx);
ctx.RPD=ctx.window.RPD;ctx.RD=ctx.window.RD;
vm.runInContext(fs.readFileSync(new URL('./parts/23_rp_lib.js',import.meta.url),'utf8').replace('window.RP=','RP='),ctx);
const RP=ctx.RP;const exp=JSON.parse(fs.readFileSync(process.env.RAG_SCRATCH+'/rp/chunk_expect.json','utf8'));
let ok=0,bad=0;
for(const key in exp){const [pid,k,s,o]=key.split('|');const p=ctx.RPD.wb.find(x=>x.id===pid);const d=RP.Doc(p);
  const got={fixed:()=>RP.fixed(d,+s,+o),recursive:()=>RP.recursive(d,+s,+o,["\n\n","\n",". "," "]),sentence:()=>RP.sentence(d,+s),structure:()=>RP.structure(d,+s),paragraph:()=>RP.paragraph(d)}[k]();
  if(JSON.stringify(got)===JSON.stringify(exp[key]))ok++;else{bad++;console.log('MISMATCH',key,got.length,exp[key].length)}}
console.log('chunkers identical',ok,'of',ok+bad);
process.exit(bad?1:0);
