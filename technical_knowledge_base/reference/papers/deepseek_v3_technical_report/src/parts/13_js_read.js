// ---- The paper tab: parameter breakdown, Table 2, and the predict-then-reveal demos ----
(function(){
const RC=PAPER.rc,BD=RC.breakdown;const bn=v=>(v/1e9).toFixed(v<1e9?2:v<1e10?2:1)+'B';
// where the parameters live
let parMode='tot';
function parDraw(w){const idx=parMode==='tot'?1:2,tot=BD.reduce((a,r)=>a+r[idx],0),H=w<560?58+BD.length*18:96,cols=['var(--c5)','var(--c1)','var(--c6)','var(--c3)','var(--c2)','var(--mute)'];
  let s='',x=4;const bw=w-8;BD.forEach((r,i)=>{const ww=bw*r[idx]/tot;s+=rc(x,18,Math.max(ww,0.8),26,cols[i],{r:0})+'<title>'+r[0]+': '+bn(r[idx])+'</title>';
    if(ww>64)s+=tx(x+ww/2,36,(100*r[idx]/tot).toFixed(0)+'%',{fs:11,a:'middle',c:'var(--bg)',w:600});x+=ww});
  s+=tx(4,12,(parMode==='tot'?'All parameters: ':'Active per token: ')+bn(tot),{fs:12,w:600});
  if(w<560){BD.forEach((r,i)=>{const y=62+i*18;s+=rc(4,y-9,10,10,cols[i],{r:2})+tx(18,y,r[0]+': '+bn(r[idx]),{fs:11})})}
  else{let lx=4,ly=64;BD.forEach((r,i)=>{const t=r[0]+' '+bn(r[idx]),tw=t.length*6.3+22;if(lx+tw>w){lx=4;ly+=18}s+=rc(lx,ly-9,10,10,cols[i],{r:2})+tx(lx+14,ly,t,{fs:11});lx+=tw});}
  $('parSvg').innerHTML=svgW(w,w<560?H:Math.max(H,90),s,'Parameter breakdown');
  $('parNote').innerHTML=parMode==='tot'?'Routed experts are 97.4% of the weights: 58 layers × 256 experts × 44.0M parameters (3 matrices of 7,168 × 2,048). Recounted total 671.03B (the paper: 671B).':'Per token only 8 of 256 routed experts run, so attention becomes the second-largest share: 37.55B active (the paper: 37B), of which the embedding lookup is 0.93B.'}
document.querySelectorAll('#parM button').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('#parM button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});parMode=b.dataset.m;refit($('parSvg'))}));
fit($('parSvg'),parDraw);
// Table 2
$('t2Body').innerHTML=PAPER.tables.T2.rows.map(r=>'<tr>'+r.map((c,i)=>'<td'+(i===1?' class="mono"':'')+'>'+c+'</td>').join('')+'</tr>').join('');
// predict: batch-wise auxiliary loss
PRED_REVEAL['pr-bal']=()=>fit($('balSvg'),w=>{const D=[['1B MoE',[2.258,2.253,2.253]],['3B MoE',[2.085,2.080,2.080]]],N=['sequence-wise aux loss','bias rule (aux-loss-free)','batch-wise aux loss'],C=['var(--c2)','var(--c1)','var(--c3)'];
  const H=170,pl=w<520?62:76,bw=w-pl-50,lo=2.0,hi=2.3,X=v=>pl+bw*(v-lo)/(hi-lo);let s='';
  D.forEach(([n,v],g)=>{const y0=10+g*64;s+=tx(pl-6,y0+26,n,{fs:12,a:'end',w:600});v.forEach((x,i)=>{const y=y0+i*18;s+=rc(pl,y,X(x)-pl,14,C[i],{r:2})+tx(X(x)+4,y+11,x.toFixed(3),{fs:11})})});
  const lg=legend(N.map((n,i)=>[n,C[i]]),pl,H-18,w-pl-4);s+=lg.s;
  $('balSvg').innerHTML=svgW(w,H+lg.h-14,s,'Validation losses of three balancing methods')});
// predict: MTP speculative decoding
function mtp(){const p=+$('mtpP').value;$('mtpPv').textContent=p.toFixed(3);const tps=1+p,ov=tps/1.8-1;
  $('mtpOut').innerHTML=stat('Tokens per decoding step',tps.toFixed(3),'1 + p')+stat('Speed-up if a step cost nothing extra',tps.toFixed(2)+'×','')+stat('Extra cost per step implied by 1.8×',(ov>=0?'+':'')+(100*ov).toFixed(1)+'%',ov<0?'1.8× would exceed the ideal':'drafting with the MTP module and verifying')}
$('mtpP').addEventListener('input',mtp);PRED_REVEAL['pr-mtp']=mtp;
// predict: FP8 per-tensor with outliers
PRED_REVEAL['pr-fp8']=()=>{const F=window.FP8;const a=F.scalingRun(1,'channels',1e5,'e4m3','tensor'),b=F.scalingRun(1,'channels',1e5,'e4m3','tile'),c=F.scalingRun(1,'channels',1e5,'e5m2','tensor'),z=F.scalingRun(1,'none',1,'e4m3','tensor');
  const ord=a.n-2*32,pz=v=>(100*v/a.n).toFixed(1)+'%';
  $('fp8Mini').innerHTML=stat('E4M3, one scale per tensor',pz(a.n-a.zeros)+' non-zero',a.zeros.toLocaleString('en-GB')+' zeros, '+a.sub.toLocaleString('en-GB')+' subnormal of '+a.n.toLocaleString('en-GB'))+stat('E4M3, 1×128 tiles',pz(b.n-b.zeros)+' non-zero',b.zeros.toLocaleString('en-GB')+' zeros, '+b.sub.toLocaleString('en-GB')+' subnormal')+stat('E5M2, one scale per tensor',pz(c.n-c.zeros)+' non-zero','median error '+(100*c.median_rel).toFixed(1)+'%; E4M3 with no outliers: '+(100*z.median_rel).toFixed(1)+'%')};
// predict: the cost against Llama
PRED_REVEAL['pr-cost']=()=>fit($('costMini'),w=>{const FL=RC.flops,H=120,pl=w<520?120:190,bw=w-pl-50,X=v=>pl+bw*v/13;let s='';
  [['GPU hours, Llama ÷ V3',FL.hours_ratio_pre,'var(--c2)','pre-training hours'],['Active params × tokens, Llama ÷ V3',FL.work_ratio,'var(--c1)','405B × 15.6T ÷ 37B × 14.8T']].forEach(([n,v,c,d],i)=>{const y=12+i*44;
    s+=tx(pl-6,y+13,w<520?['GPU hours','Params × tokens'][i]:n,{fs:11.5,a:'end',w:600})+rc(pl,y,X(v)-pl,20,c,{r:3})+tx(X(v)+4,y+15,v.toFixed(1)+'×',{fs:12,w:600})+tx(pl,y+34,d,{fs:11,c:'var(--mute)'})});
  $('costMini').innerHTML=svgW(w,H,s,'Llama 3.1 405B against DeepSeek-V3: hours and work')});
})();
