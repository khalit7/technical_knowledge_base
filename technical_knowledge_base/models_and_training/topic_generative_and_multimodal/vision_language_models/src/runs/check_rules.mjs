// The budget tab's JavaScript rules against the real processors (out/token_rules.json) and the root lab's 36 SmolVLM counts.
// node runs/check_rules.mjs   (from src/)
import fs from 'fs';
const code=fs.readFileSync('parts/32_js_vm_bud.js','utf8');const head=code.slice(0,code.indexOf('(function(){\n  const V=VM'));
const window={};eval(head.replace('window.VMB=','window.VMB='));const B=window.VMB;
const R=JSON.parse(fs.readFileSync('out/token_rules.json','utf8'));let ok=0,bad=[];
R.qwen.rows.forEach(r=>{const a=B.qwen(r.w,r.h,16384).tokens,b=B.qwen(r.w,r.h,1024).tokens;if(a===r.default_tokens&&b===r.cap1024_tokens)ok++;else bad.push(['qwen',r.h,r.w,a,r.default_tokens,b,r.cap1024_tokens])});
R.internvl.rows.forEach(r=>{const v=B.ivl(r.w,r.h).views;if(v===r.tiles_crop)ok++;else bad.push(['internvl',r.h,r.w,v,r.tiles_crop])});
R.qwen_video.forEach(r=>{const v=B.vrule(r.seconds,r.fps,r.w,r.h);if(v.tok===r.tokens&&v.groups===r.thw[0])ok++;else bad.push(['video',r.h,r.w,r.seconds,r.fps,v.tok,r.tokens,v.groups,r.thw[0]])});
const T=JSON.parse(fs.readFileSync('../../src/vlm/out/tokens.json','utf8'));let n=0;
[...T.square_default,...T.aspect_default].forEach(r=>{const got=B.smol(r.w,r.h,4).tokens;n++;if(got===r.image_tokens)ok++;else bad.push(['smol',r.w,r.h,4,got,r.image_tokens])});
T.knob.forEach(r=>{const [W,H]=r.input.split('x').map(Number),N=r.splitting?r.N:1;const got=B.smol(W,H,N).tokens;n++;if(got===r.image_tokens)ok++;else bad.push(['smol',r.input,r.N,r.splitting,got,r.image_tokens])});
console.log('rules match:',ok,'of',R.qwen.rows.length+R.internvl.rows.length+R.qwen_video.length+n,'(smol rows read:',n,')');if(bad.length)console.log('MISMATCH',JSON.stringify(bad));
