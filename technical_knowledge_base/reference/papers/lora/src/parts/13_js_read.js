// ---- The paper tab: LoRA against adapter animation, parameter calculator, merge check, Figure 2, Table 7 ----
(function(){
const PP=window.PAPER;
// ---------- 1. one token through one matrix: LoRA (parallel, mergeable) against an adapter (sequential) ----------
const D=1024;let R=4;
const modes={lora:[
 {t:'the token arrives',c:'A vector <i>x</i> of <i>d</i> = 1,024 numbers enters a frozen pretrained weight <i>W</i><sub>0</sub> (1,024 × 1,024, about a million numbers).'},
 {t:'frozen path: W<sub>0</sub>x',c:'The pretrained product, exactly as before: <i>d</i>² = 1,048,576 multiply-adds. <i>W</i><sub>0</sub> gets no gradient and no optimiser state.'},
 {t:'down: Ax',c:'In parallel, <i>A</i> (<i>r</i> × <i>d</i>) squeezes <i>x</i> to <i>r</i> numbers. Drawn to scale: the thin strip is <i>A</i>.'},
 {t:'up: B(Ax), times α/r',c:'<i>B</i> (<i>d</i> × <i>r</i>) maps the <i>r</i> numbers back to <i>d</i>. <i>B</i> starts at zero, so at step 0 this path adds nothing and the model is exactly the pretrained one.'},
 {t:'sum: h = W<sub>0</sub>x + (α/r)BAx',c:'Both paths saw the same input; their outputs are added coordinate by coordinate. Only <i>A</i> and <i>B</i> train: 2<i>dr</i> numbers.'},
 {t:'after training: merge once',c:'<i>W</i> = <i>W</i><sub>0</sub> + (α/r)<i>BA</i> is again a 1,024 × 1,024 matrix. Computed once; to switch tasks, subtract <i>BA</i> and add another <i>B</i>′<i>A</i>′.'},
 {t:'serve: h = Wx',c:'One product, the same shape and cost as the base model: <b>zero added latency</b>, by construction (§4.1).'}],
 adp:[
 {t:'the token arrives',c:'The same <i>x</i> enters the same frozen <i>W</i><sub>0</sub>.'},
 {t:'the layer: W<sub>0</sub>x',c:'The pretrained product: <i>d</i>² multiply-adds.'},
 {t:'then down-project and nonlinearity',c:'The adapter is a small MLP inserted after the layer: down to <i>r</i> numbers, then a nonlinearity. It has to wait for <i>W</i><sub>0</sub>x: this is extra depth, in sequence.'},
 {t:'then up-project and add back',c:'Up to <i>d</i> numbers again, added to the residual. Trainable: 2<i>dr</i> + <i>r</i> + <i>d</i> numbers per adapter (§5.1).'},
 {t:'after training: cannot merge',c:'The nonlinearity between the two small matrices means they cannot be folded into <i>W</i><sub>0</sub>. The two extra sequential products stay at inference forever.'},
 {t:'serve: three products in a row',c:'On GPT-2 medium at batch 1 and 128 tokens, a forward pass takes 19.8 ms without adapters, 23.9 ms with Adapter<sup>L</sup> (+20.7%) and 25.8 ms with Adapter<sup>H</sup> (+30.3%) (Table 1).'}]};
const fixLinks=s=>s.replace(/\{\{([^}]+)\}\}/g,(m,t)=>t);
Object.values(modes).forEach(L=>L.forEach(S=>{S.c=fixLinks(S.c)}));
function drawMx(m,k,e,W){const H=Math.round(Math.max(110,Math.min(200,W-170,W*0.42))),sc=H/D,th=v=>Math.max(1.5,v*sc),col=10;
  const on=i=>k>i||(k===i&&e>0)?1:0.16,fade=i=>k>i?1:k===i?e:0;const L=m==='lora',merged=L&&k>=5;
  const cIn='var(--c1)',cA='var(--c2)',cOut='var(--c3)';const t=th(R);
  const xIn=8,xW=xIn+col+18,ys=24,yb=ys+H+44;
  const xA=xW,xr=xA+H+16,xB=xr+col+36,xo=xB+t+22,xP=xo+col/2,xh=xP+26;
  let s=tx(xIn+col/2,ys-8,'x',{fs:12,a:'middle'})+rc(xIn,ys,col,H,cIn,{r:2,op:on(0)});
  // main row
  s+=rc(xW,ys,H,H,'var(--dim)',{r:3,op:merged?1:Math.max(.25,on(1))})+tx(xW+H/2,ys+H/2+4,merged?'W = W₀ + (α/r)BA':'W₀, frozen',{fs:12,a:'middle'});
  if(merged)s+=G(fade(5),rc(xW,ys,H,H,'none',{r:3,s:cA,sw:2.5}));
  s+=ln2(xIn+col,ys+H/2,xW,ys+H/2,'var(--mute)',{op:on(1)})+ln2(xW+H,ys+H/2,xP-9,ys+H/2,'var(--mute)',{op:on(1)});
  s+='<circle cx="'+xP+'" cy="'+(ys+H/2)+'" r="9" fill="var(--bg)" stroke="var(--mute)" stroke-width="1.4" opacity="'+(merged?0.25:on(L?4:3))+'"/>'+tx(xP,ys+H/2+5,'+',{fs:14,a:'middle',op:merged?0.25:on(L?4:3)});
  s+=tx(xh+col/2,ys-8,'h',{fs:12,a:'middle'})+rc(xh,ys,col,H,cOut,{r:2,op:on(L?(merged?6:4):5)})+ln2(xP+9,ys+H/2,xh,ys+H/2,'var(--mute)',{op:on(L?4:3)});
  // side row
  const sOp=merged?Math.max(0,1-fade(5)):1;let r2='';
  r2+=tx(xIn,yb-14,L?'meanwhile, in parallel, from the same x:':'then, after W₀x is computed:',{fs:11,c:'var(--mute)',w:600});
  const i2=L?2:2,i3=3;
  r2+=tx(xA,yb+H/2-t/2-6,(L?'A':'down')+' ('+R+' × 1,024)',{fs:11,c:cA,op:on(i2)})+rc(xA,yb+H/2-t/2,H,t,cA,{r:0,op:on(i2)});
  r2+=rc(xr,yb+H/2-t/2,col,t,cA,{r:0,op:on(i2)})+tx(xr+col/2,yb+H/2+t/2+15,R+(R>1?' numbers':' number'),{fs:11,a:'middle',c:'var(--mute)',op:on(i2)})+(L?'':tx(xr+col/2,yb+H/2+t/2+29,'then σ',{fs:11,a:'middle',c:'var(--bad)',op:on(i2)}));
  r2+=ln2(xA+H,yb+H/2,xr,yb+H/2,'var(--mute)',{op:on(i2)});
  r2+=tx(xB+t,yb-6,(L?'B':'up')+' (1,024 × '+R+')',{fs:11,a:'end',c:cA,op:on(i3)})+rc(xB,yb,t,H,cA,{r:0,op:on(i3)})+ln2(xr+col,yb+H/2,xB,yb+H/2,'var(--mute)',{op:on(i3)});
  r2+=rc(xo,yb,col,H,cA,{r:2,op:on(i3)*0.55})+ln2(xB+t,yb+H/2,xo,yb+H/2,'var(--mute)',{op:on(i3)});
  r2+=ln2(xP,yb,xP,ys+H/2+9,cA,{op:on(L?4:3),da:'4 3',sw:1.6});
  if(L)r2+=ln2(xIn+col/2,ys+H,xIn+col/2,yb+H/2,'var(--mute)',{op:on(2),da:'3 3'})+ln2(xIn+col/2,yb+H/2,xA,yb+H/2,'var(--mute)',{op:on(2),da:'3 3'});
  else r2+=ln2(xW+H+4,ys+H/2,xW+H+4,yb-24,'var(--mute)',{op:on(2),da:'3 3'})+ln2(xW+H+4,yb-24,xA-6,yb-24,'var(--mute)',{op:on(2),da:'3 3'})+ln2(xA-6,yb-24,xA-6,yb+H/2,'var(--mute)',{op:on(2),da:'3 3'})+ln2(xA-6,yb+H/2,xA,yb+H/2,'var(--mute)',{op:on(2),da:'3 3'});
  s+=G(sOp,r2);
  if(merged)s+=G(fade(5),tx(xW,yb+H/2,'A and B folded into W: the side path is gone',{fs:12,c:cA,w:600}));
  if(!L&&k>=4)s+=G(fade(4),tx(xIn,yb+H+20,'✗ σ sits between down and up:',{fs:12,c:'var(--bad)',w:600})+tx(xIn,yb+H+36,'they cannot be folded into W₀',{fs:12,c:'var(--bad)',w:600}));
  const Ht=yb+H+(L?12:44);const tw=xh+col+8;const off=Math.max(0,(W-tw)/2);
  return svgW(W,Ht,'<g transform="translate('+off.toFixed(1)+',0)">'+s+'</g>','One token through one weight matrix, '+(L?'LoRA':'adapter'))}
function cnt(m,k){const dr=2*D*R;const merged=m==='lora'&&k>=5;
  const seq=m==='lora'?(merged?1:k>=2?'1 (+ a 2-step side path)':1):(k>=3?3:k>=2?2:1);
  const extra=m==='lora'?(merged?0:k>=2?dr:0):(k>=2?dr+D:0);
  const tr=m==='lora'?dr:dr+R+D;
  return stat('products in a row',String(seq),m==='lora'?'side path runs in parallel':'each waits for the last')+stat('extra multiply-adds per token',fmt(extra),'base product: '+fmt(D*D))+stat('trainable numbers',fmt(tr),(100*tr/(D*D)).toFixed(2)+'% of this matrix')+stat('mergeable',m==='lora'?'yes':'no',m==='lora'?'W = W₀ + (α/r)BA':'nonlinearity in between')}
const an=makeAnim({id:'mx',modes,mode:'lora',draw:(m,k,e,w)=>drawMx(m,k,e,w),counters:cnt});
$('mxR').addEventListener('change',e=>{R=+e.target.value;an&&an.draw()});
// ---------- 2. parameter calculator ----------
const RS=[1,2,4,8,16,32,64,128];
function pc(){const r=RS[+$('pcR').value],m=+$('pcM').value,T=+$('pcT').value;$('pcRv').textContent=r;
  const p=2*m*96*12288*r,full=175255.8e6,b=p*2;
  $('pcO').innerHTML='<b>'+fmt(p)+'</b> trainable numbers ('+(p/1e6).toFixed(2)+'M), '+(100*p/full).toFixed(4)+'% of GPT-3, <b>'+fmt(full/p)+'×</b> fewer than full fine-tuning. One adapter in FP16: <b>'+(b/1e6).toFixed(1)+' MB</b> against 350.5 GB. '+fmt(T)+' task'+(T>1?'s':'')+': '+((350.5e9+T*b)/1e9).toFixed(1)+' GB with one shared base, against '+(T*350.5/1000).toFixed(T>=10?0:2)+' TB as separate copies.'}
['pcR','pcM','pcT'].forEach(i=>$(i).addEventListener('input',pc));pc();
// ---------- 3. Figure 2 rebuilt from Table 15 ----------
const T15=PP.tables['A6.T15'].rows.slice(1);let cur='';const pts=[];
T15.forEach(r=>{if(r.length===5){cur=r[0]}const n=r.length===5?r:[cur].concat(r);if(n[0]==='Fine-Tune')return;const pr=n[2].replace(' M','');pts.push({m:n[0],h:n[1],p:parseFloat(pr)*1e6,w:+n[3],n:+n[4]})});
const SER=[['LoRA','var(--c3)'],['AdapterH','var(--c1)'],['PrefixEmbed','var(--c2)'],['PrefixLayer','var(--c4)'],['LoRA+PE','var(--c5)']];
let f2='w';
function drawF2(W){const H=300,o={W,H,pl:48,pr:14,pt:28,pb:40,x:[2e5,1e9],y:f2==='w'?[54,77]:[84,92.5],xt:[[1e6,'1M'],[1e7,'10M'],[1e8,'100M'],[1e9,'1B']],xl:'trainable parameters (log scale)',yl:(f2==='w'?'WikiSQL':'MNLI-m')+' validation accuracy (%)'};
  const yt=[];for(let v=Math.ceil(o.y[0]);v<=o.y[1];v+=f2==='w'?4:2)yt.push([v,String(v)]);o.yt=[];
  const lx=v=>o.pl+(W-o.pl-o.pr)*(Math.log10(v)-Math.log10(o.x[0]))/(Math.log10(o.x[1])-Math.log10(o.x[0]));const ly=v=>o.pt+(H-o.pt-o.pb)*(1-(v-o.y[0])/(o.y[1]-o.y[0]));
  let s='';yt.forEach(([v,l])=>{s+=ln2(o.pl,ly(v),W-o.pr,ly(v),'var(--line)')+tx(o.pl-6,ly(v)+4,l,{fs:11,a:'end',c:'var(--mute)'})});
  o.xt.forEach(([v,l])=>{s+=ln2(lx(v),H-o.pb,lx(v),H-o.pb+4,'var(--mute)')+tx(lx(v),H-o.pb+16,l,{fs:11,a:'middle',c:'var(--mute)'})});
  s+=tx((o.pl+W-o.pr)/2,H-4,o.xl,{fs:11,a:'middle',c:'var(--mute)'})+'<text x="12" y="'+((o.pt+H-o.pb)/2)+'" font-size="11" text-anchor="middle" fill="var(--mute)" transform="rotate(-90 12 '+((o.pt+H-o.pb)/2)+')">'+o.yl+'</text>';
  const ft=f2==='w'?73.8:89.5;s+=ln2(o.pl,ly(ft),W-o.pr,ly(ft),'var(--ink)',{da:'5 4',op:.7})+tx(W-o.pr-4,ly(ft)-5,'full fine-tuning, 175B: '+ft,{fs:11,a:'end'});
  SER.forEach(([nm,c])=>{const P=pts.filter(p=>p.m===nm).sort((a,b)=>a.p-b.p);let d='';P.forEach((p,i)=>{const v=f2==='w'?p.w:p.n;d+=(i?'L':'M')+lx(p.p).toFixed(1)+' '+ly(v).toFixed(1)});
    s+='<path d="'+d+'" fill="none" stroke="'+c+'" stroke-width="1.8"/>';P.forEach(p=>{const v=f2==='w'?p.w:p.n;s+='<circle cx="'+lx(p.p).toFixed(1)+'" cy="'+ly(v).toFixed(1)+'" r="3.5" fill="'+c+'"><title>'+nm+' '+p.h+': '+(p.p/1e6).toFixed(1)+'M, '+v+'</title></circle>'})});
  const lg=legend(SER.map(([n,c])=>[n==='LoRA+PE'?'LoRA + prefix-embed':n,c]),o.pl,14,W-o.pl-o.pr);
  $('f2Svg').innerHTML=svgW(W,H+lg.h,'<g transform="translate(0,'+lg.h+')">'+s+'</g>'+lg.s,'Figure 2 rebuilt from Table 15')}
PRED_REVEAL['pr-pre']=()=>fit($('f2Svg'),drawF2);
segBind('f2M',m=>{f2=m;refit($('f2Svg'))});
// ---------- 4. Table 7 bars ----------
function drawT7(W){const t=PP.rc.table7;const rows=[['r = 4',[['along ΔW',t.r4.proj],['along W\'s top 4',t.r4.Wtop],['random',t.r4.rand],['‖ΔW_q‖',t.r4.dW]]],['r = 64',[['along ΔW',t.r64.proj],['along W\'s top 64',t.r64.Wtop],['random',t.r64.rand],['‖ΔW_q‖',t.r64.dW]]]];
  const pl=Math.min(150,W*0.36),pr=50,bh=15,lx=v=>pl+(W-pl-pr)*(Math.log10(v)-Math.log10(0.01))/(Math.log10(100)-Math.log10(0.01));let s='',y=18;
  [0.01,0.1,1,10,100].forEach(v=>{s+=ln2(lx(v),8,lx(v),8+2*(4*(bh+5)+22),'var(--line)')+tx(lx(v),8+2*(4*(bh+5)+22)+12,String(v),{fs:11,a:'middle',c:'var(--mute)'})});
  rows.forEach(([nm,b])=>{s+=tx(4,y+4,nm,{fs:12,w:600});y+=10;b.forEach(([k,v],i)=>{const c=['var(--c3)','var(--c1)','var(--dim)','var(--c2)'][i];s+=tx(pl-6,y+bh-3,k,{fs:11,a:'end'})+rc(pl,y,lx(v)-pl,bh,c,{r:2})+tx(lx(v)+4,y+bh-3,String(v),{fs:11});y+=bh+5});y+=12});
  s+=tx(W/2,y+22,'Frobenius norm, log scale; ‖W_q‖_F = '+t.W,{fs:11,a:'middle',c:'var(--mute)'});
  $('t7Svg').innerHTML=svgW(W,y+30,s,'Table 7 as bars')}
PRED_REVEAL['pr-amp']=()=>fit($('t7Svg'),drawT7);
// ---------- 5. merge check on the toy model's trained adapters ----------
function merge(){const E=window.LORA,LD=window.LORA_DATA;if(!E||!LD){$('mgO').textContent='(toy model not loaded)';return}
  const base=E.loadBase(LD.base);const ad=LD.adapters&&LD.adapters.v4&&LD.adapters.v4['1']&&LD.adapters.v4['1']['4'];if(!ad){$('mgO').textContent='(adapters not exported yet)';return}
  const lora={};for(const k in ad){const [o,i]=E.SHAPES[k];lora[k]={A:E.decode(ad[k].A,ad[k].sA,4*i),B:E.decode(ad[k].B,ad[k].sB,o*4),r:4,s:ad[k].s}}
  const data=E.genPre(200,E.rng(4242));const Ws=E.weightsSplit(base,lora),Wm=E.weights(base,lora);let md=0,same=0;
  for(let i=0;i<data.n;i++){const a=E.fwd(base,Ws,data.X,i).lg,b=E.fwd(base,Wm,data.X,i).lg;a.forEach((x,j)=>md=Math.max(md,Math.abs(x-b[j])));same+=E.argmax(a)===E.argmax(b)}
  const tmp=E.cloneP(base);for(const k in lora){tmp[k]=E.eff(base,lora,k)}let back=0;for(const k in lora){const [o,i]=E.SHAPES[k];const d=E.deltaW({full:false,lora},k);for(let j=0;j<o*i;j++)back=Math.max(back,Math.abs(tmp[k][j]-d[j]-base[k][j]))}
  $('mgO').textContent='on 200 sequences, unmerged (W₀x + (α/r)B(Ax)) and merged (Wx) logits differ by at most '+md.toExponential(1)+', the same answer on '+same+' of 200; subtracting BA recovers W₀ to within '+back.toExponential(1)+' (float64 rounding).'}
function toySum(){const S=(window.LORA_DATA||{}).summary||[];const g=(tg,r)=>S.find(x=>x.task==='v4'&&x.targets===tg&&x.r===r&&x.scaling==='r'&&x.mode==='tuned');const ft=S.find(x=>x.task==='v4'&&x.method==='ft'&&x.mode==='tuned');
  const a=g('Wv',1),b=g('Wv',4),c=g('Wq',32),d=S.find(x=>x.task==='mlp4'&&x.targets==='Wq+Wv'&&x.r===32&&x.mode==='tuned'),e=S.find(x=>x.task==='mlp4'&&x.targets==='Wq+Wk+Wv+Wo+W1+W2'&&x.r===4&&x.mode==='tuned');const p=v=>v?(100*v.changed).toFixed(1)+'%':'n/a';
  $('toySum').innerHTML='on a task whose true update is a rank-4 edit of W<sub>v</sub>, LoRA on W<sub>v</sub> gets '+p(a)+' of the changed answers at r = 1 and '+p(b)+' at r = 4, W<sub>q</sub> alone only '+p(c)+' even at r = 32, and full fine-tuning '+p(ft)+'; when the edit is in the MLP, attention-only LoRA at r = 32 reaches '+p(d)+' against '+p(e)+' with all six matrices at r = 4 (three seeds each)'}
try{toySum()}catch(e){$('toySum').textContent='(toy results unavailable)'}
try{merge()}catch(e){$('mgO').textContent='(merge check failed: '+e.message+')';__jsErr(e.message)}
})();
