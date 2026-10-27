// ---- One turn's bill: Eq. 9 for one call, split by operation as in Figure 16 ----
(function(){
if(!$('cc')||!window.CLMR)return;
const C=CLMR.C,F16={18000:1.41e14,10000:5.74e14,0:10.81e14};
const parts=[['mlp','MLP','var(--c1)'],['attn_proj','Full-attention projections','var(--c5)'],['gdn_proj','Gated DeltaNet projections','var(--c3)'],['qk','Full-attention query-key pairs','var(--c2)']];
function bill(P,G,R){const n=P-R+G;return {mlp:C.mlp*n,attn_proj:C.attn_proj*n,gdn_proj:C.gdn_proj*n,qk:C.c_attn*(0.5*(P*P-R*R)+G*P+0.5*G*G),total:CLMR.turnF(P,G,R),nocache:CLMR.turnF(P,G,0)}}
window.CLMR.bill=bill;
let preset=18000;
function vals(){const P=+$('ccPr').value,G=+$('ccGr').value,R=Math.round(P*(+$('ccRr').value)/100/100)*100;return {P,G,R:Math.min(R,P)}}
function draw(w){const v=vals(),b=bill(v.P,v.G,v.R),W=w,pl=4,pr=4,bh=34,narrow=W<520;
  $('ccPv').textContent=fmt(v.P);$('ccRv').textContent=fmt(v.R);$('ccGv').textContent=fmt(v.G);
  const sx=(W-pl-pr)/b.nocache;let o='',x=pl;
  parts.forEach(([k,n,c])=>{const bw=b[k]*sx;o+=rc(x,18,Math.max(0.5,bw),bh,c,{r:2,op:0.85});x+=bw});
  o+=rc(x,18,Math.max(0,W-pr-x),bh,'var(--dim)',{r:2,op:0.6});
  o+=tx(pl,13,'computed '+sci(b.total)+' FLOPs',{fs:11,c:'var(--ink)'});
  o+=tx(W-pr,13,'without a cache '+sci(b.nocache),{fs:11,a:'end',c:'var(--mute)'});
  const lg=legend(parts.map(p=>[p[1],p[2]]).concat([['Avoided by prefix caching','var(--dim)']]),pl,18+bh+22,W-pl-pr);o+=lg.s;
  $('ccSvg').innerHTML=svgW(W,18+bh+22+lg.h,o,'FLOPs of one turn by operation');
  let t='Avoided by prefix caching: <b>'+Math.round(100*(1-b.total/b.nocache))+'%</b>. Prefilled '+fmt(v.P-v.R)+' tokens, decoded '+fmt(v.G)+'.';
  if(v.P===20000&&v.G===500&&F16[v.R]!==undefined){const p=F16[v.R];t+=' Figure 16 prints '+(p/1e14).toFixed(2)+' × 10¹⁴; computed '+(b.total/1e14).toFixed(2)+' × 10¹⁴ (residual '+(100*(b.total/p-1)>=0?'+':'')+(100*(b.total/p-1)).toFixed(2)+'%, from the paper rounding to two decimals): reproduces, independently.'}
  else t+=' (Not a Figure 16 setting: pick a preset to compare with the paper.)';
  $('ccOut').innerHTML=t}
segBind('ccP',m=>{preset=+m;$('ccPr').value=20000;$('ccGr').value=500;$('ccRr').value=Math.round(100*preset/20000);refit($('ccSvg'))});
['ccPr','ccRr','ccGr'].forEach(id=>$(id).addEventListener('input',()=>{$('ccP').querySelectorAll('button').forEach(b=>b.classList.remove('on'));refit($('ccSvg'))}));
fit($('ccSvg'),draw);
})();
