// ---- The paper tab: sqrt(d_k) demo, block diagram, positional encoding, learning-rate schedule, predict reveals ----
function gauss(r){let u=0,v=0;while(!u)u=r();v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
const sm=l=>{const m=Math.max(...l),e=l.map(v=>Math.exp(v-m)),z=e.reduce((a,b)=>a+b,0);return e.map(v=>v/z)};

// 1. Why divide by sqrt(d_k): real random vectors
(function(){if(!$('scD'))return;const DK=[4,8,16,32,64,128,256,512,1024];let seed=11;
  function bars(el,p,title,col){fit(el,w=>{const H=150,pl=8,pb=30,pt=22,bw=(w-pl*2)/p.length;let s=tx(pl,14,title,{fs:12,w:600});
    s+=ln2(pl,H-pb,w-pl,H-pb,'var(--line)');
    p.forEach((v,i)=>{const h=(H-pb-pt)*v;s+=rc(pl+i*bw+2,H-pb-h,bw-4,h,col,{r:2})+tx(pl+i*bw+bw/2,H-pb+14,'k'+(i+1),{fs:11,a:'middle',c:'var(--mute)'});if(v>.12)s+=tx(pl+i*bw+bw/2,H-pb-h-3,v.toFixed(2),{fs:11,a:'middle'})});
    s+=tx(w-pl,H-4,'weight on each of 10 keys',{fs:11,a:'end',c:'var(--mute)'});el.innerHTML=svgW(w,H,s,title)})}
  function run(){const dk=DK[+$('scD').value];$('scDv').textContent=fmt(dk);const r=mulberry32(seed*7919+dk);
    const q=[...Array(dk)].map(()=>gauss(r)),K=[...Array(10)].map(()=>[...Array(dk)].map(()=>gauss(r)));
    const lg=K.map(k=>k.reduce((s,v,i)=>s+v*q[i],0)),pu=sm(lg),ps=sm(lg.map(v=>v/Math.sqrt(dk)));
    // variance of q.k over 4,000 fresh pairs
    let s1=0,s2=0;const r2=mulberry32(seed*31+dk);for(let t=0;t<4000;t++){let d=0;for(let i=0;i<dk;i++)d+=gauss(r2)*gauss(r2);s1+=d;s2+=d*d}
    const vr=s2/4000-(s1/4000)**2,gr=p=>Math.max(...p.map(v=>v*(1-v)));
    bars($('scA'),pu,'Unscaled: softmax(q·k)','var(--c2)');bars($('scB'),ps,'Scaled: softmax(q·k / √dₖ)','var(--c1)');
    $('scO').innerHTML=stat('Variance of q·k, measured',vr.toFixed(dk<100?1:0),'theory: dₖ = '+fmt(dk)+'; scaled: '+(vr/dk).toFixed(2))+stat('Largest weight',pu.reduce((a,b)=>a>b?a:b).toFixed(3)+' against '+ps.reduce((a,b)=>a>b?a:b).toFixed(3),'unscaled against scaled')+stat('Largest gradient, max pᵢ(1 − pᵢ)',gr(pu).toExponential(1)+' against '+gr(ps).toFixed(3),'unscaled against scaled; 0.25 is the most it can be')}
  $('scD').addEventListener('input',run);$('scR').addEventListener('click',()=>{seed++;run()});
  PRED_REVEAL['pr-scale']=run;})();

// 2. The base model's block layout (Figure 1)
(function(){const el=$('blkSvg');if(!el)return;fit(el,w=>{const cw=Math.min(230,(w-34)/2),gap=w-2*cw-8,xE=4,xD=4+cw+gap,bh=24,p=30;
  const col=(x,items,top)=>{let s='';items.forEach((it,i)=>{const y=top+i*p;s+=rc(x+8,y,cw-16,bh,it[1],{s:it[2]||'var(--line)'})+tx(x+cw/2,y+16,it[0],{fs:11.5,a:'middle'})});return s};
  const E=[['Add & Norm','var(--soft)'],['Feed-forward (ReLU)','var(--open2)','var(--open)'],['Add & Norm','var(--soft)'],['Self-attention, 8 heads','var(--acc2)','var(--acc)']];
  const Dd=[['Add & Norm','var(--soft)'],['Feed-forward (ReLU)','var(--open2)','var(--open)'],['Add & Norm','var(--soft)'],['Cross-attention','var(--closed2)','var(--closed)'],['Add & Norm','var(--soft)'],['Masked self-attention','var(--acc2)','var(--acc)']];
  const top=74,H=top+Dd.length*p+112;let s='';
  s+=tx(xE+cw/2,14,'Encoder',{fs:12.5,w:600,a:'middle'})+tx(xD+cw/2,14,'Decoder',{fs:12.5,w:600,a:'middle'});
  // output head above the decoder
  s+=rc(xD+8,24,cw-16,bh,'var(--soft)',{s:'var(--line)'})+tx(xD+cw/2,40,'Linear (tied) + softmax',{fs:11.5,a:'middle'});
  const eTop=top+(Dd.length-E.length)*p;
  s+=rc(xE+2,eTop-6,cw-4,E.length*p+6,'none',{s:'var(--mute)',da:'4 3'})+rc(xD+2,top-6,cw-4,Dd.length*p+6,'none',{s:'var(--mute)',da:'4 3'});
  s+=col(xE,E,eTop)+col(xD,Dd,top);
  s+=tx(xE+cw-6,eTop+E.length*p+12,'× 6',{fs:11.5,a:'end',c:'var(--mute)'})+tx(xD+cw-6,top+Dd.length*p+12,'× 6',{fs:11.5,a:'end',c:'var(--mute)'});
  const yb=top+Dd.length*p+22;
  [[xE,'Input embedding × √d'],[xD,'Output embedding × √d']].forEach(([x,t])=>{s+=rc(x+8,yb+30,cw-16,bh,'var(--soft)',{s:'var(--line)'})+tx(x+cw/2,yb+46,t,{fs:11.5,a:'middle'})+tx(x+cw/2,yb+20,'+ sinusoidal positions',{fs:11,a:'middle',c:'var(--mute)'})});
  s+=tx(xD+cw/2,yb+68,'(shifted right by one)',{fs:11,a:'middle',c:'var(--mute)'});
  // encoder output into the decoder's cross-attention
  const yC=top+3*p+bh/2;s+='<path d="M'+(xE+cw/2)+' '+(eTop-6)+' V'+(eTop-20)+' H'+(xE+cw+gap/2)+' V'+yC+' H'+(xD+8)+'" fill="none" stroke="var(--closed)" stroke-width="1.6"/>';
  s+=tx(xE+cw/2,eTop-24,'keys and values to every decoder layer',{fs:11,a:'middle',c:'var(--closed)'});
  el.innerHTML=svgW(w,H,s,'The Transformer base model: a six-layer encoder and a six-layer decoder')})})();

// 3. Positional encoding: the pattern, and why the dot product depends only on the offset
(function(){const el=$('peSvg');if(!el)return;const d=512,P=64,DM=512;const pe=(p,j)=>{const dv=Math.pow(10000,(j-(j%2))/d);return j%2?Math.cos(p/dv):Math.sin(p/dv)};
  fit(el,w=>{const two=w>=600,pw=two?(w-16)/2:w,ph=200;el.innerHTML='<div style="display:flex;flex-wrap:wrap;gap:16px"><div style="width:'+pw+'px"><canvas id="peC" width="'+Math.round(pw*2)+'" height="'+(ph*2)+'" style="width:'+pw+'px;height:'+ph+'px;display:block" aria-label="Positional encoding heatmap"></canvas><div class="small mute" style="display:flex;justify-content:space-between"><span>dimension 0</span><span>dimension 511 →</span></div></div><div id="peK" style="width:'+pw+'px"></div></div>';
    const c=$('peC').getContext('2d'),cs=getComputedStyle(document.body),cA=cs.getPropertyValue('--c1').trim()||'#2f6fb5',cB=cs.getPropertyValue('--c2').trim()||'#c2703a',bg=cs.getPropertyValue('--bg').trim()||'#fff';
    const cwid=pw*2/DM,chg=ph*2/P;for(let p=0;p<P;p++)for(let j=0;j<DM;j++){const v=pe(p,j);c.fillStyle=v>=0?cB:cA;c.globalAlpha=Math.abs(v);c.fillRect(j*cwid,p*chg,cwid+.5,chg+.5)}c.globalAlpha=1;
    // dot product against offset
    const K=40,dot=(p,k)=>{let s=0;for(let j=0;j<d;j++)s+=pe(p,j)*pe(p+k,j);return s};
    const host=$('peK'),pl=40,pr=8,pt=10,pb=32,x=k=>pl+(pw-pl-pr)*k/K,y=v=>pt+(ph-pt-pb)*(1-(v-50)/(256-50));let s='';
    [50,100,150,200,256].forEach(v=>{s+=ln2(pl,y(v),pw-pr,y(v),'var(--line)')+tx(pl-4,y(v)+4,v,{fs:11,a:'end',c:'var(--mute)'})});
    [0,10,20,30,40].forEach(k=>s+=tx(x(k),ph-pb+15,k,{fs:11,a:'middle',c:'var(--mute)'}));
    s+=tx((pl+pw)/2,ph-3,'offset k',{fs:11,a:'middle',c:'var(--mute)'});
    [[0,'var(--c1)',''],[10,'var(--c2)','6 4'],[30,'var(--c3)','2 4']].forEach(([p,cc,da])=>{let pts='';for(let k=0;k<=K;k++)pts+=x(k).toFixed(1)+','+y(dot(p,k)).toFixed(1)+' ';s+='<polyline points="'+pts+'" fill="none" stroke="'+cc+'" stroke-width="2"'+(da?' stroke-dasharray="'+da+'"':'')+'/>'});
    s+=tx(pw-pr,pt+12,'p = 0, 10, 30: one curve',{fs:11,a:'end'})+tx(pl+8,pt+28,'PE(p) · PE(p + k)',{fs:11});
    host.innerHTML=svgW(pw,ph,s,'Dot product of positional encodings against offset')})})();

// 4. Learning-rate schedule (Equation 3)
(function(){if(!$('lrW'))return;const lr=(s,d,w)=>Math.pow(d,-.5)*Math.min(Math.pow(s,-.5),s*Math.pow(w,-1.5));
  function run(){const w=+$('lrW').value,d=+$('lrD').value,maxS=d===1024?300000:d===24?16000:100000;$('lrWv').textContent=fmt(w);
    fit($('lrSvg'),W=>{const H=210,pl=58,pr=12,pt=12,pb=34,peak=lr(w,d,w),top=Math.pow(d*500,-.5)*1.02,ymax=Math.max(peak,lr(Math.min(4000,maxS),d,4000))*1.15;
      const x=s=>pl+(W-pl-pr)*s/maxS,y=v=>pt+(H-pt-pb)*(1-v/ymax);let s='';
      for(let i=0;i<=4;i++){const v=ymax*i/4;s+=ln2(pl,y(v),W-pr,y(v),'var(--line)')+tx(pl-5,y(v)+4,v?sci(v,1):'0',{fs:11,a:'end',c:'var(--mute)'})}
      for(let i=0;i<=4;i++){const st=maxS*i/4;s+=tx(x(st),H-pb+15,st>=1000?fmt(st/1000)+'K':st,{fs:11,a:'middle',c:'var(--mute)'})}
      s+=tx((pl+W)/2,H-3,'training step',{fs:11,a:'middle',c:'var(--mute)'});
      let pts='';for(let i=1;i<=240;i++){const st=maxS*i/240;pts+=x(st).toFixed(1)+','+y(lr(st,d,w)).toFixed(1)+' '}
      if(d===512){let p2='';for(let i=1;i<=240;i++){const st=maxS*i/240;p2+=x(st).toFixed(1)+','+y(lr(st,512,4000)).toFixed(1)+' '}if(w!==4000)s+='<polyline points="'+p2+'" fill="none" stroke="var(--dim)" stroke-width="1.5" stroke-dasharray="4 3"/>'}
      s+='<polyline points="'+pts+'" fill="none" stroke="var(--c1)" stroke-width="2.2"/>';
      if(w<=maxS)s+='<circle cx="'+x(w)+'" cy="'+y(peak)+'" r="4" fill="var(--c2)"/>'+tx(Math.min(x(w)+8,W-120),y(peak)-6,'peak '+sci(peak,2)+' at step '+fmt(w),{fs:11});
      $('lrSvg').innerHTML=svgW(W,H,s,'Learning rate against step')});
    $('lrO').innerHTML=stat('Peak learning rate',sci(lr(w,d,w),2),'(d · warmup)<sup>−0.5</sup>, at step '+fmt(w))+stat('At the last step',sci(lr(maxS,d,w),2),'step '+fmt(maxS)+(d===512?' (base)':d===1024?' (big)':' (toy model)'))+stat('Rise then fall','linear, then ∝ 1/√step','');
    $('lrRep').innerHTML='Derived from Equation 3; the paper does not print the peak. With the base model\'s defaults (d = 512, warmup 4,000) the peak is (512 × 4,000)<sup>−0.5</sup> = 6.99 × 10<sup>−4</sup>, falling to 1.40 × 10<sup>−4</sup> at step 100,000 (recompute.py). The toy model on this page used the same formula with d = 24 and warmup 4,000 for 16,000 steps (train.py). The dashed curve is the base default when you move the slider.'}
  $('lrW').addEventListener('input',run);$('lrD').addEventListener('change',run);run()})();

// 5. Predict reveals that use the model and the tables
PRED_REVEAL['pr-pe']=function(){const M=TM.load('nope'),a=TM.translate(M,'the dog chased the cat'.split(' ')).out,b=TM.translate(M,'the cat chased the dog'.split(' ')).out;
  const f=o=>o.filter(w=>w!=='</s>').join(' ');$('prPeOut').innerHTML='"the dog chased the cat" → '+f(a)+'; "the cat chased the dog" → '+f(b)+(f(a)===f(b)?' (identical)':'');
  $('prPeAcc').textContent=(TM.variants.nope.acc*100).toFixed(1)+'%';$('prPeAccF').textContent=(TM.variants.full.acc*100).toFixed(1)+'%'};
PRED_REVEAL['pr-t3']=function(){const T=PAPER.tables.t3,b=T.base.bleu,pick=[['One head instead of 8',T.rows[0]],['No dropout',T.rows[13]],['2 layers instead of 6',T.rows[6]],['d_model 256 instead of 512',T.rows[9]],['Learned positions',T.rows[17]]];
  $('prT3').innerHTML=pick.map(([n,r])=>{const dl=r.bleu-b;return '<div class="row'+(dl<=-2?' hl':'')+'"><span class="nm">'+n+'</span><span class="track"><span class="fill" style="width:'+(Math.abs(dl)/2.2*100).toFixed(1)+'%;background:var(--bad)"></span></span><span class="val">'+dl.toFixed(1)+' BLEU</span></div>'}).join('')};
