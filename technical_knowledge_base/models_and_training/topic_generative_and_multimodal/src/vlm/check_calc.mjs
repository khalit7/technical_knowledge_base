// The page's token calculator (VL.smol in parts/35_js_vl_1core.js) against every count measured with the real processor (out/tokens.json).
import fs from 'fs';
const here=new URL('.',import.meta.url).pathname;
const src=fs.readFileSync(here+'../parts/35_js_vl_1core.js','utf8');
const window={VL_DATA:{}};const document={getElementById:()=>null};
const VL=new Function('window','document','matchMedia','getComputedStyle',src+';return window.VL')(window,document,null,null);
const T=JSON.parse(fs.readFileSync(here+'out/tokens.json','utf8'));
const q=T.text_only_tokens; let bad=0,n=0;
const rows=[...T.square_default.map(r=>({...r,N:4,split:true})),...T.aspect_default.map(r=>({...r,N:4,split:true})),
  ...T.knob.map(r=>{const [w,h]=r.input.split('x').map(Number);return {...r,w,h,N:r.N||4,split:r.splitting}})];
for(const r of rows){const c=VL.smol(r.w,r.h,r.N,r.split);n++;
  const tot=c.img+c.markup+q;
  if(c.tiles!==r.tiles||c.img!==r.image_tokens||tot!==r.total_tokens){bad++;console.log('MISMATCH',r,c,tot)}}
console.log('checked',n,'mismatches',bad);process.exit(bad?1:0);
