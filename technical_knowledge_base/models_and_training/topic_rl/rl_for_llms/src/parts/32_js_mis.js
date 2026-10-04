// ---- Rollout mismatch tab: real per-token log-ratios between engine and trainer, TIS and MIS at any threshold, sequence ratios ----
(function(){
  const D=window.LLD,TAB='t-mis';let m='f16';
  const H_=document.getElementById('mi-h'),S_=document.getElementById('mi-s'),Cs=document.getElementById('mi-C'),Bs=document.getElementById('mi-B'),ST=document.getElementById('mi-st'),T=document.getElementById('mi-T'),sT=document.getElementById('mi-sT');
  const NAME={f16:'float16 engine with KV cache against float32 trainer',bf:'bfloat16 against float32, both one pass',rp:'engine with repetition penalty 1.1 against the plain model (float32)'};
  function frac(h,f){let s=0;h.c.forEach((c,k)=>{const x=h.lo+(k+0.5)*h.bin;if(f(x))s+=c});return s/h.n}
  function draw(){const h=D.mis[m],C=+Cs.value/100,B=+Bs.value/100;document.getElementById('mi-Cv').textContent=C.toFixed(1);document.getElementById('mi-Bv').textContent=B.toFixed(2);
    const W=RD.width(H_),Hh=190,l=46,r=10,t=10,b=28,K=h.c.length,mx=Math.max(...h.c),X=x=>l+(W-l-r)*(x-h.lo)/(K*h.bin);let s='';
    const Y=c=>t+(Hh-t-b)*(1-Math.log10(1+c)/Math.log10(1+mx));
    h.c.forEach((c,k)=>{if(!c)return;const x=h.lo+k*h.bin;s+='<rect x="'+X(x).toFixed(2)+'" y="'+Y(c).toFixed(1)+'" width="'+Math.max(0.6,X(x+h.bin)-X(x)-0.2).toFixed(2)+'" height="'+(Y(0)-Y(c)).toFixed(1)+'" fill="'+(Math.exp(x)>C?'var(--c2)':Math.abs(Math.exp(x)-1)>B?'var(--c5)':'var(--c1)')+'"/>'});
    const hi=h.lo+K*h.bin;[h.lo,0,hi].forEach(v=>s+=RD.t(X(v),Hh-10,RD.n(v,Math.abs(v)<0.1?3:1),{a:v===h.lo?'start':v===hi?'end':'middle',fs:9.5,fill:'var(--mute)'}));
    if(Math.log(C)<hi)s+='<line x1="'+X(Math.log(C)).toFixed(1)+'" x2="'+X(Math.log(C)).toFixed(1)+'" y1="'+t+'" y2="'+Y(0)+'" stroke="var(--c2)" stroke-dasharray="3 3"/>';
    s+=RD.t(l-4,Y(mx)+4,mx.toLocaleString('en-US'),{a:'end',fs:9,fill:'var(--mute)'})+RD.t(l-4,Y(0)+4,'0',{a:'end',fs:9,fill:'var(--mute)'});
    H_.innerHTML=RD.svg(W,Hh,s,'Log-ratio histogram')+'<div class="leg"><span>count (log scale) against log(π<sub>train</sub>/π<sub>rollout</sub>) in nats</span><span><i style="background:var(--c5)"></i>masked by MIS</span><span><i style="background:var(--c2)"></i>truncated by TIS</span></div>';
    const tr=frac(h,x=>Math.exp(x)>C),mk=frac(h,x=>Math.abs(Math.exp(x)-1)>B);
    ST.innerHTML=RD.stat('Tokens',h.n.toLocaleString('en-US'),NAME[m].split(' against')[0])+RD.stat('Mean |log-ratio|',RD.n(h.mabs,4),'nats per token')+RD.stat('Largest |log-ratio|',RD.n(h.max,3),'ratio '+RD.n(Math.exp(h.max),3))+RD.stat('Truncated by TIS',RD.pct(tr,tr&&tr<0.001?3:2),'ratio above C = '+C.toFixed(1))+RD.stat('Masked by MIS',RD.pct(mk,mk&&mk<0.001?3:2),'ratio outside 1 ± '+B.toFixed(2));
    T.innerHTML=m==='rp'?'A sampling processor the trainer does not model changes the distribution the tokens came from. The ratios are no longer a rounding effect: '+RD.pct(tr,1)+' of tokens exceed C. Tokens the penalty pushed down because they had already appeared get ratios above 1 (the trainer, which does not apply the penalty, scores them higher than the engine sampled them, up to '+RD.n(Math.exp(h.max),1)+' times); renormalisation lifts every other token a little, so they sit below 1. TIS or MIS can bound the damage; fixing the sampler removes it.':
      'A pure precision gap. Almost every token sits within a few thousandths of a nat; at C = 2 TIS changes '+(tr?'almost nothing':'nothing')+' here. On a small model and short answers the mismatch is small; it grows with model size, length, MoE routing and FP8 rollouts, which is why frameworks log it every step.';
    // sequences
    const sq=h.seq,W2=RD.width(S_),H2=150;let s2='';const vals=[].concat(...sq.map(x=>[x[0],x[1]])),a=Math.min(...vals,-0.01),z=Math.max(...vals,0.01),X2=v=>l+(W2-l-r)*(v-a)/(z-a);
    [[0,'∏ρ (sequence IS)','var(--c2)'],[1,'GSPO s_i','var(--c1)']].forEach(([k,lab,col],row)=>{const y=t+18+row*46;s2+=RD.t(l,y-10,lab,{fs:10,fill:col});sq.forEach(x=>s2+='<circle cx="'+X2(x[k]).toFixed(1)+'" cy="'+y+'" r="3" fill="'+col+'" opacity=".6"/>')});
    s2+='<line x1="'+X2(0).toFixed(1)+'" x2="'+X2(0).toFixed(1)+'" y1="'+t+'" y2="'+(H2-26)+'" stroke="var(--line)"/>';
    [a,0,z].filter(v=>v===0?(X2(0)-X2(a)>60&&X2(z)-X2(0)>60):true).forEach(v=>s2+=RD.t(X2(v),H2-10,'log '+RD.n(v,Math.abs(v)<0.1?4:2),{a:v===a?'start':v===z?'end':'middle',fs:9.5,fill:'var(--mute)'}));
    S_.innerHTML=RD.svg(W2,H2,s2,'Sequence ratios');
    const pr=sq.map(x=>x[0]),gs=sq.map(x=>Math.exp(x[1])),fmt=v=>Math.abs(v)>30?'e<sup>'+RD.n(v,1)+'</sup>':RD.n(Math.exp(v),3);
    sT.innerHTML=sq.length+' responses. The product of per-token ratios ranges from '+fmt(Math.min(...pr))+' to '+fmt(Math.max(...pr))+': it compounds every token\'s gap, which is why sequence-level IS needs looser thresholds (verl suggests 2 to 10). GSPO\'s geometric mean stays within '+RD.n(Math.min(...gs),4)+' to '+RD.n(Math.max(...gs),4)+(m==='rp'?': here far outside any GSPO clip range (3e-4 to 4e-4), so every one of these sequences would be clipped, which is the right reaction to a sampler that is not the policy.':', which is why its clip range is 3e-4 to 4e-4 rather than 0.2.')}
  document.getElementById('mi-M').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;m=b.dataset.m;[...b.parentNode.children].forEach(x=>x.classList.toggle('on',x===b));draw()});
  Cs.addEventListener('input',draw);Bs.addEventListener('input',draw);
  RD.onRender(draw,TAB);RD.onResize(draw,TAB);
  const mm=document.getElementById('rd-misMean');if(mm)mm.textContent=RD.n(D.mis.f16.mabs,4);
})();
