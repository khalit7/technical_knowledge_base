// Check the Token economics tab's ports against recorded processor outputs (sibling page Vision-language models).
import fs from 'fs'; import vm from 'vm'; import path from 'path'; import {fileURLToPath} from 'url';
const here=path.dirname(fileURLToPath(import.meta.url));
const ctx={window:{},document:{getElementById:()=>null},RD:{}};ctx.window.TAB_RENDER={};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(here,'../parts/33_js_nmtok.js'),'utf8').replace('(window.TAB_RENDER','(window.TAB_RENDER'),ctx);
const T=ctx.window.NMTOK, rules=JSON.parse(fs.readFileSync(path.join(here,'../inputs/vm_token_rules.json'),'utf8'));
let ok=0,bad=[];
for(const r of rules.qwen.rows){const t=T.qwenTok(r.h,r.w);if(t===r.default_tokens)ok++;else bad.push([r.h,r.w,t,r.default_tokens])}
const smol=[[512,512,1088],[1080,1920,832],[1920,1080,832],[256,512,576],[64,64,1088],[3000,3000,1088]];
for(const [h,w,e] of smol){const t=T.smolTok(h,w);if(t===e)ok++;else bad.push(['smol',h,w,t,e])}
console.log('ok',ok,'bad',JSON.stringify(bad));
fs.writeFileSync(path.join(here,'../out/check_tok.json'),JSON.stringify({ok,bad},null,1));
