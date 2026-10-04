// Compare the page's JS models with recompute_out.json (written by recompute.py). Run from src/: node check_js.mjs
import fs from 'fs'; import vm from 'vm';
const ctx={window:{},Math,console,document:{getElementById:()=>null}};vm.createContext(ctx);
for(const f of ['parts/22_js_scale_model.js','parts/31_js_gw_model.js','parts/24_js_rd_prefix.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx);
const S=ctx.window.MSD_SCALE,G=ctx.window.MSD_GW,R=JSON.parse(fs.readFileSync('recompute_out.json','utf8'));
let n=0,bad=0;
function cmp(a,b,path){if(typeof b==='object'&&b!==null){for(const k of Object.keys(b))cmp(a==null?undefined:a[k],b[k],path+'.'+k);return}
  if(typeof b==='boolean'||typeof b==='string'){n++;if(a!==b){bad++;if(bad<20)console.log('DIFF',path,a,b)}return}
  n++;if(typeof a!=='number'||Math.abs(a-b)>1e-6*Math.max(1,Math.abs(b))){bad++;if(bad<20)console.log('DIFF',path,a,b)}}
for(const md of S.MODES){const rows=S.run(md);cmp(rows,R.scale[md],'scale.'+md);cmp(S.summary(rows),R.scale_summary[md],'sum.'+md)}
cmp(G.run(G.D),R.gw.default,'gw.default');
for(const k of Object.keys(G.PRESETS)){cmp(G.run(Object.assign({},G.D,G.PRESETS[k])),R.gw[k],'gw.'+k)}
for(const md of ['before','after'])cmp(ctx.window.MSD_PREFIX.turns(md),R.prefix[md],'prefix.'+md);
R.gw_random.forEach((x,i)=>cmp(G.run(x.p),x.r,'gw_random.'+i));
console.log('compared',n,'numbers; differences',bad);process.exit(bad?1:0);
