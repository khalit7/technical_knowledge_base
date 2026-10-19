// Checks the Cache ladder's JS (parts/32_js_ld_*.js) against the root Config calculator's CC.cache (validated on
// Hub counts) for every rung whose config the calculator handles, and V4-Pro against the gallery child's figure.
// Run: node check_ladder.mjs  -> ../out/ladder_check.json, exits 1 on any mismatch
import fs from 'node:fs'; import vm from 'node:vm';
const R='../../../src/', P='../parts/';
const ctx={window:{}};vm.createContext(ctx);
for(const f of [R+'parts/33_js_cc_1core.js',P+'32_js_ld_0data.js',P+'32_js_ld_1core.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx);
const {CC,AVL,AVLC}=ctx.window;const res=[];let bad=0;
const files={llama2:'data/configs/llama-2-7b.json',llama31:'data/configs/llama-3.1-8b.json',mistral:'data/configs/mistral-7b-v0.1.json',
 gemma3:'data/configs/gemma-3-27b.json',gptoss:'data/configs/gpt-oss-120b.json',dsv3:'data/configs/deepseek-v3.json',dsv32:'data/configs/deepseek-v3.2.json',qwen3next:'data/configs/qwen3-next-80b-a3b.json'};
for(const L of [4096,32768,131072,1048576])for(const r of AVL.rungs){
  const mine=AVLC.rung(r,L,2);const row={rung:r.id,L,ladder_bytes:mine.storeBytes};
  if(files[r.id]){const c=CC.cache(CC.normalise(JSON.parse(fs.readFileSync(R+files[r.id],'utf8'))),L,2,4);row.cc_bytes=c.total;row.ok=c.total===mine.storeBytes;if(!row.ok)bad++}
  res.push(row)}
// V4-Pro: the gallery's compressed cache per token (bf16, 512 numbers per entry, indexer keys and window excluded): 7,928 B main + 1,920 B indexer
const v4=AVL.rungs.find(r=>r.id==='dsv4');const L=1048576;const x=AVLC.rung(v4,L,2);
const win=v4.groups.reduce((a,g)=>a+g.n*g.entry*g.win*2,0);
const perTok=(x.storeBytes-win)/L;const gal={main:7928,idx:1920};
const v4row={rung:'dsv4',L,per_token_excl_window:perTok,gallery_main_plus_idx:gal.main+gal.idx,ok:Math.abs(perTok-(gal.main+gal.idx))<0.01};
if(!v4row.ok)bad++;res.push(v4row);
fs.writeFileSync('../out/ladder_check.json',JSON.stringify({checked:new Date().toISOString().slice(0,10),mismatches:bad,rows:res},null,1));
console.log(res.filter(r=>r.L===131072||r.rung==='dsv4'));console.log('mismatches',bad);process.exit(bad?1:0);
