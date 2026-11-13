// ---- Then and now: the LoRA recipe from 2021 to 2025, one sourced step at a time (the explanation of each step is the step list #sx-tn) ----
(function(){
const S=[
 {t:'2021, the paper',y:'Jun 2021',ad:['Wq','Wv'],base:'FP16',scale:'α / r',lr:'40× FT (GPT-3)',serve:'merge one adapter'},
 {t:'Feb 2023: Hugging Face PEFT',y:'Feb 2023',ad:['Wq','Wv'],base:'FP16',scale:'α / r',lr:'40× FT (GPT-3)',serve:'merge or keep separate'},
 {t:'May 2023: QLoRA',y:'May 2023',ad:['Wq','Wk','Wv','Wo','W1','W2','W3'],base:'4-bit NF4',scale:'α / r (r 64, α 16)',lr:'tuned',serve:'merge or keep separate'},
 {t:'Nov 2023: S-LoRA, then vLLM and SGLang',y:'Nov 2023',ad:['Wq','Wk','Wv','Wo','W1','W2','W3'],base:'4-bit or 16-bit',scale:'α / r',lr:'tuned',serve:'thousands of adapters, unmerged, batched'},
 {t:'Nov 2023: rsLoRA',y:'Nov 2023',ad:['Wq','Wk','Wv','Wo','W1','W2','W3'],base:'4-bit or 16-bit',scale:'α / √r (option)',lr:'tuned',serve:'unmerged, batched'},
 {t:'Feb 2024: DoRA',y:'Feb 2024',ad:['Wq','Wk','Wv','Wo','W1','W2','W3'],base:'4-bit or 16-bit',scale:'magnitude + LoRA on direction',lr:'tuned',serve:'merge (no overhead)'},
 {t:'Jun 2024: adapters on a phone',y:'Jun 2024',ad:['Wq','Wk','Wv','Wo','W1','W2','W3'],base:'about 3.7 bits per weight',scale:'rank 16',lr:'n/a',serve:'swap per feature on device'},
 {t:'Sep 2025: LoRA Without Regret',y:'Sep 2025',ad:['Wq','Wk','Wv','Wo','W1','W2','W3'],base:'16-bit',scale:'α / r (α = 32)',lr:'about 10× FT',serve:'LoRA-based fine-tuning service (Tinker)'}];
const M=[['Wq','W<tspan dy="3" font-size="11">q</tspan>'],['Wk','W<tspan dy="3" font-size="11">k</tspan>'],['Wv','W<tspan dy="3" font-size="11">v</tspan>'],['Wo','W<tspan dy="3" font-size="11">o</tspan>'],['W1','W<tspan dy="3" font-size="11">gate</tspan>'],['W3','W<tspan dy="3" font-size="11">up</tspan>'],['W2','W<tspan dy="3" font-size="11">down</tspan>']];
function draw(m,k,e,W){const s0=S[k],sp=S[Math.max(0,k-1)];const bw=Math.min(74,(W-30)/7-8),bh=44,y0=36;let s=tx(10,18,'attention',{fs:11})+tx(10+4*(bw+8)+14,18,'MLP',{fs:11});
  M.forEach(([id,lab],i)=>{const x=10+i*(bw+8)+(i>=4?14:0);const on=s0.ad.includes(id),was=sp.ad.includes(id);const op=on?(was?1:e):(was?1-e:0);
    s+=rc(x,y0,bw,bh,'var(--soft)',{s:'var(--line)'})+'<text x="'+(x+bw/2)+'" y="'+(y0+bh/2+5)+'" font-size="13" text-anchor="middle">'+lab+'</text>';
    if(op>0)s+=G(op,rc(x,y0+bh+4,bw,8,'var(--c2)',{r:2})+rc(x,y0,bw,bh,'none',{s:'var(--c2)',sw:2})+tx(x+bw/2,y0+bh+24,'+BA',{fs:11,a:'middle'}))});
  s+=tx(10,y0+bh+46,'base stored as: '+s0.base,{fs:12,w:600});return svgW(W,y0+bh+56,s,'Where adapters go')}
const cnt=(m,k)=>{const s=S[k];return stat('when',s.y,'')+stat('matrices adapted',String(s.ad.length)+' of 7','per block')+stat('scale',s.scale,'')+stat('learning rate',s.lr,'against full fine-tuning')+stat('serving',s.serve,'')};
makeAnim({id:'tn',modes:{now:S},mode:'now',lists:{now:'sx-tn'},draw,counters:cnt,dur:3600});
})();
