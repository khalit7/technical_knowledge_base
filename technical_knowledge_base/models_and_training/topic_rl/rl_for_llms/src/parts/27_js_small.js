// ---- Small inline charts: k3 on real tokens (section 3), the overlong penalty (section 7), pass@k sharpening (section 9),
// the engine's numbers printed in the worked example, and the checklist's ticks ----
(function(){
  const E=window.LLE,D=window.LLD;
  // worked example spans: fill from the engine (data-v="ex4.mean" etc.)
  (function(){const m4=E.groupAdv([1,0,0,0],'grpo');const V={'ex4.mean':RD.n(m4.m,2),'ex4.std':RD.n(m4.sd,3),'ex4.A_pos':RD.sg(m4.A[0],3),'ex4.A_neg':RD.sg(m4.A[1],3),'k3_half':RD.n(E.k3(0.5),3)};
    document.querySelectorAll('#rd-ex4 [data-v],[data-v="k3_half"]').forEach(s=>{if(V[s.dataset.v]!=null)s.textContent=V[s.dataset.v]})})();
  // k3 against the plain estimate on one real response: x = pi_ref / pi_theta per token
  (function(){const P=document.getElementById('rd-k3P'),T=document.getElementById('rd-k3T');if(!P)return;
    const f=D.feat[0],lr=f.lr;// log(pi_theta / pi_ref) per token
    function draw(){const W=RD.width(P),H=190,l=40,r=10,t=12,b=26;
      const k1=lr,k3=lr.map(v=>E.k3(Math.exp(-v)));const lo=-1.5,hi=2.5,cl=v=>Math.max(lo,Math.min(hi,v));
      const X=i=>l+(W-l-r)*i/(lr.length-1),Y=v=>t+(H-t-b)*(hi-v)/(hi-lo);let s='';
      s+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+Y(0).toFixed(1)+'" y2="'+Y(0).toFixed(1)+'" stroke="var(--line)"/>';
      [lo,0,hi].forEach(v=>s+=RD.t(l-4,Y(v)+4,RD.n(v,1),{a:'end',fs:9.5,fill:'var(--mute)'}));
      k1.forEach((v,i)=>s+='<circle cx="'+X(i).toFixed(1)+'" cy="'+Y(cl(v)).toFixed(1)+'" r="'+(v===cl(v)?1.8:3)+'" fill="var(--c2)" opacity=".75"/>');
      k3.forEach((v,i)=>s+='<circle cx="'+X(i).toFixed(1)+'" cy="'+Y(cl(v)).toFixed(1)+'" r="'+(v===cl(v)?1.8:3)+'" fill="var(--c1)"/>');const nOut=k1.filter(v=>v!==cl(v)).length+k3.filter(v=>v!==cl(v)).length;
      s+=RD.t(l,H-8,'token 1',{fs:10,fill:'var(--mute)'})+RD.t(W-r,H-8,'token '+lr.length,{a:'end',fs:10,fill:'var(--mute)'});
      P.innerHTML=RD.svg(W,H,s,'k3 and log-ratio per token')+'<div class="leg"><span><i style="background:var(--c2)"></i>plain estimate log(π<sub>θ</sub>/π<sub>ref</sub>), can be negative</span><span><i style="background:var(--c1)"></i>k3 = x − log x − 1, never negative</span></div>';
      const neg=k1.filter(v=>v<0).length,m1=E.mean(k1),m3=E.mean(k3),sd=a=>{const m=E.mean(a);return Math.sqrt(E.mean(a.map(v=>(v-m)*(v-m))))};
      T.innerHTML='Real tokens: Qwen2.5-0.5B-Instruct (π<sub>θ</sub>, float32) against its base model Qwen2.5-0.5B as a stand-in reference, on '+lr.length+' tokens of one sampled GSM8K answer. The plain estimate is negative on '+neg+' tokens; they average '+RD.n(m1,3)+' (plain) and '+RD.n(m3,3)+' (k3) nats per token, and their standard deviations are '+RD.n(sd(k3),3)+' (k3) and '+RD.n(sd(k1),3)+' (plain): k3 is never negative but grows fast where π<sub>θ</sub> is far below π<sub>ref</sub>, so on a handful of tokens it is the larger. Points beyond the axis (larger dots, '+nOut+' of them) are drawn at its edge; the largest k3 here is '+RD.n(Math.max(...k3),1)+'. In expectation over tokens sampled from π<sub>θ</sub> both equal the KL; on one sample they differ. The base model is not the SFT reference RL would use, so the size of these numbers is not what a run would see; the shapes are.'}
    RD.onRender(draw);RD.onResize(draw);draw()})();
  // overlong penalty
  (function(){const P=document.getElementById('rd-olP'),S=document.getElementById('rd-olS'),V=document.getElementById('rd-olV'),T=document.getElementById('rd-olT');if(!P)return;
    function draw(){const y=+S.value,W=RD.width(P),H=150,l=34,r=12,t=10,b=26,X=v=>l+(W-l-r)*v/20000,Y=v=>t+(H-t-b)*(0.1-v)/1.2;let s='';
      s+='<rect x="'+X(12288)+'" y="'+t+'" width="'+(X(16384)-X(12288))+'" height="'+(H-t-b)+'" fill="var(--soft)"/>';
      const pts=[];for(let v=0;v<=20000;v+=32)pts.push(X(v).toFixed(1)+','+Y(E.overlong(v)).toFixed(1));
      s+='<polyline fill="none" stroke="var(--c2)" stroke-width="2.2" points="'+pts.join(' ')+'"/>';
      [0,-0.5,-1].forEach(v=>s+=RD.t(l-4,Y(v)+4,RD.n(v,1),{a:'end',fs:9.5,fill:'var(--mute)'}));
      [[0,'0'],[12288,'12,288'],[16384,'16,384']].forEach(([v,lab])=>s+=RD.t(X(v),H-8,lab,{a:v?'middle':'start',fs:9.5,fill:'var(--mute)'}));
      const R=E.overlong(y);s+='<circle cx="'+X(y)+'" cy="'+Y(R)+'" r="5" fill="var(--c1)" stroke="var(--bg)"/>';
      P.innerHTML=RD.svg(W,H,s,'Overlong penalty');V.textContent=y.toLocaleString('en-US');
      T.innerHTML='Length reward '+RD.n(R,3)+(y<=12288?': below the soft zone, no penalty.':y<=16384?' = (12,288 − '+y.toLocaleString('en-US')+') / 4,096: inside the soft zone (shaded), the penalty grows linearly.':': past L<sub>max</sub>, the response is truncated and gets −1.')+' The real 0.5B responses on this page stay below 512 tokens, so none would be touched.'}
    S.addEventListener('input',draw);RD.onRender(draw);RD.onResize(draw);draw()})();
  // pass@k: sharpening against expansion (illustrative, exact)
  (function(){const P=document.getElementById('rd-pkP'),T=document.getElementById('rd-pkT'),M=document.getElementById('rd-pkM');if(!P)return;let mode='sharp';
    const base=E.pkProblems(),ks=[1,2,4,8,16,32,64,128,256,512,1024];
    function draw(){const rl=base.map((p,i)=>mode==='sharp'?E.pkSharpen(p):E.pkExpand(p,i)),cb=E.pkCurve(base,ks),cr=E.pkCurve(rl,ks);
      const W=RD.width(P),H=190,l=40,r=12,t=10,b=28,X=j=>l+(W-l-r)*j/(ks.length-1),Y=v=>t+(H-t-b)*(1-v);let s='';
      [0,0.5,1].forEach(v=>{s+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+RD.t(l-4,Y(v)+4,RD.pct(v,0),{a:'end',fs:9.5,fill:'var(--mute)'})});
      ks.forEach((k,j)=>{if(W>=480||j%2===0)s+=RD.t(X(j),H-10,(j?'':'k=')+k,{a:j===ks.length-1?'end':j?'middle':'start',fs:9.5,fill:'var(--mute)'})});
      [[cb,'var(--c2)','base'],[cr,'var(--c1)','after RL']].forEach(([c,col])=>s+='<polyline fill="none" stroke="'+col+'" stroke-width="2.4" points="'+c.map((v,j)=>X(j).toFixed(1)+','+Y(v).toFixed(1)).join(' ')+'"/>');
      let cross=-1;for(let j=1;j<ks.length;j++)if(cb[j]>cr[j]&&cb[j-1]<=cr[j-1])cross=j;
      P.innerHTML=RD.svg(W,H,s,'pass@k')+'<div class="leg"><span><i class="ln" style="background:var(--c2)"></i>base model</span><span><i class="ln" style="background:var(--c1)"></i>after RL</span></div>';
      T.innerHTML='pass@1: base '+RD.pct(cb[0])+', after RL '+RD.pct(cr[0])+'. pass@1024: base '+RD.pct(cb[ks.length-1])+', after RL '+RD.pct(cr[ks.length-1])+'. '+(cross>=0?'The curves cross near k = '+ks[cross]+': past it, the base model solves more problems, because sharpening took probability away from the rarely solved ones (the pattern Yue et al. report).':'No crossing: when RL also gives some unsolved problems a chance, it wins at every k (the pattern ProRL reports).')}
    M.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;mode=b.dataset.m;[...M.children].forEach(x=>x.classList.toggle('on',x===b));draw()});
    RD.onRender(draw);RD.onResize(draw);draw()})();
  // checklist ticks, kept in this browser only
  (function(){const L=document.getElementById('rd-ck');if(!L)return;const boxes=[...L.querySelectorAll('input')];let st=[];
    try{st=JSON.parse(localStorage.getItem('rl4llm-ck')||'[]')}catch(e){}
    boxes.forEach((b,i)=>{b.checked=!!st[i];b.addEventListener('change',()=>{try{localStorage.setItem('rl4llm-ck',JSON.stringify(boxes.map(x=>x.checked)))}catch(e){}})})})();
})();
