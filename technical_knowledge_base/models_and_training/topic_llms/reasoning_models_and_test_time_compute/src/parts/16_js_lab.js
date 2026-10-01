// ---- Sampling lab: a benchmark whose per-problem p follows Beta(a, b) ----
(function(){
  if(!$('lab'))return;
  // log-gamma (Lanczos) and the regularised incomplete beta (continued fraction)
  const LG=[676.5203681218851,-1259.1392167224028,771.32342877765313,-176.61502916214059,12.507343278686905,-0.13857109526572012,9.9843695780195716e-6,1.5056327351493116e-7];
  function lnG(x){if(x<0.5)return Math.log(Math.PI/Math.abs(Math.sin(Math.PI*x)))-lnG(1-x);x-=1;let a=0.99999999999980993;const t=x+7.5;for(let i=0;i<8;i++)a+=LG[i]/(x+i+1);return 0.5*Math.log(2*Math.PI)+(x+0.5)*Math.log(t)-t+Math.log(a)}
  function cf(a,b,x){const FP=1e-30;let qab=a+b,qap=a+1,qam=a-1,c=1,d=1-qab*x/qap;if(Math.abs(d)<FP)d=FP;d=1/d;let h=d;
    for(let m=1;m<=300;m++){const m2=2*m;let aa=m*(b-m)*x/((qam+m2)*(a+m2));d=1+aa*d;if(Math.abs(d)<FP)d=FP;c=1+aa/c;if(Math.abs(c)<FP)c=FP;d=1/d;h*=d*c;
      aa=-(a+m)*(qab+m)*x/((a+m2)*(qap+m2));d=1+aa*d;if(Math.abs(d)<FP)d=FP;c=1+aa/c;if(Math.abs(c)<FP)c=FP;d=1/d;const del=d*c;h*=del;if(Math.abs(del-1)<3e-12)break}return h}
  function betai(a,b,x){if(x<=0)return 0;if(x>=1)return 1;const bt=Math.exp(lnG(a+b)-lnG(a)-lnG(b)+a*Math.log(x)+b*Math.log(1-x));return x<(a+1)/(a+b+2)?bt*cf(a,b,x)/a:1-bt*cf(b,a,1-x)/b}
  // exact benchmark pass@k and its large-k approximation
  const passB=(a,b,k)=>1-Math.exp(lnG(a+b)+lnG(b+k)-lnG(b)-lnG(a+b+k));
  // fixed p grid so plurality values are computed once per (p, n, m) and reused as the sliders move
  const E=[0,1e-4,3e-4,1e-3,3e-3,0.01];for(let v=0.02;v<0.999;v+=0.02)E.push(+v.toFixed(2));E.push(1);
  const MID=E.slice(0,-1).map((e,i)=>i===0?5e-5:i<6?Math.sqrt(e*E[i+1]):(e+E[i+1])/2);
  const NS=[1,3,5,9,15,25,41,63];
  let m=1,sim=null;
  segBind('labM',v=>{m=+v;sim=null;draw()});
  $('labPre').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{$('labPre').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));$('labA').value=b.dataset.a;$('labB').value=b.dataset.b;sim=null;draw()}));
  function weights(a,b){const F=E.map(e=>betai(a,b,e));return MID.map((_,i)=>Math.max(0,F[i+1]-F[i]))}
  function voteB(w,n){let s=0;for(let i=0;i<w.length;i++){if(w[i]<1e-9)continue;s+=w[i]*TM.plurality(MID[i],n,m)}return s}
  // simulation: Beta draws via two gamma draws (Marsaglia and Tsang, with the a < 1 boost)
  function gam(a,r){if(a<1)return gam(a+1,r)*Math.pow(r(),1/a);const d=a-1/3,c=1/Math.sqrt(9*d);for(;;){let x,v;do{const u1=r(),u2=r();x=Math.sqrt(-2*Math.log(u1||1e-12))*Math.cos(2*Math.PI*u2);v=1+c*x}while(v<=0);v=v*v*v;const u=r();if(u<1-0.0331*x*x*x*x||Math.log(u)<0.5*x*x+d*(1-v+Math.log(v)))return d*v}}
  let seed=1;
  function simulate(a,b){const r=mulberry32(seed++),N=200,S=64,K=[1,2,4,8,16,32,64],pk=K.map(()=>0),vt=NS.map(()=>0);
    for(let i=0;i<N;i++){const x=gam(a,r),y=gam(b,r),p=x/(x+y);const ans=[];let c=0;
      for(let j=0;j<S;j++){const ok=r()<p;ans.push(ok?0:1+Math.floor(r()*m));if(ok)c++}
      K.forEach((k,ki)=>{pk[ki]+=TM.chen(S,c,k)});
      NS.forEach((n,ni)=>{const cnt=new Array(m+1).fill(0);for(let j=0;j<n;j++)cnt[ans[j]]++;const mx=Math.max(...cnt);const win=[];cnt.forEach((v,ix)=>{if(v===mx)win.push(ix)});if(win.includes(0))vt[ni]+=1/win.length})}
    return {pk:K.map((k,ki)=>[k,pk[ki]/N]),vt:NS.map((n,ni)=>[n,vt[ni]/N]),N}}
  $('labSim').addEventListener('click',()=>{sim=simulate(+$('labA').value,+$('labB').value);draw()});
  function draw(){
    const a=+$('labA').value,b=+$('labB').value,k=Math.round(Math.pow(10,+$('labK').value)),T=+$('labT').value;
    $('labAv').textContent=a.toFixed(4);$('labBv').textContent=b.toFixed(3);$('labKv').textContent=fmt(k);$('labTv').textContent=fmt(T);
    const narrow=$('lab').clientWidth<560,W=narrow?360:680,w=weights(a,b),thr=1/(m+1);
    // histogram of p in coarse bands
    const bands=[[0,0.001,'under 0.001'],[0.001,0.01,'0.001 to 0.01'],[0.01,0.1,'0.01 to 0.1'],[0.1,0.3,'0.1 to 0.3'],[0.3,0.6,'0.3 to 0.6'],[0.6,1,'0.6 to 1']];
    const share=bands.map(([lo,hi])=>betai(a,b,hi)-betai(a,b,lo)),mx=Math.max(...share,1e-9);
    const below=betai(a,b,thr);
    $('labHist').innerHTML='<div class="small mute">Share of problems by single-sample p (amber: the whole band is below the vote threshold 1/(m + 1) = '+n3(thr,2)+')</div><div class="bars">'+bands.map((bd,i)=>'<div class="row"><span class="nm">p '+bd[2]+'</span><span class="track"><span class="fill" style="width:'+(100*share[i]/mx).toFixed(1)+'%;background:var(--c'+(bd[1]<=thr?5:1)+')"></span></span><span class="val">'+pc1(share[i])+'</span></div>').join('')+'</div>';
    // accuracy chart
    const ks=[];for(let e=0;e<=4.0001;e+=0.05)ks.push(Math.pow(10,e));
    const ser=[{name:'perfect verifier: mean pass@k',c:'var(--c3)',pts:ks.map(x=>[x,passB(a,b,x)])},
      {name:'plurality vote (to 63 samples)',c:'var(--c1)',dots:true,pts:NS.map(n=>[n,voteB(w,n)])},
      {name:'vote ceiling as n grows: share with p > 1/(m + 1)',c:'var(--c1)',dash:true,pts:[[1,1-below],[1e4,1-below]]},
      {name:'one sample: mean p = α/(α + β)',c:'var(--mute)',dash:true,pts:[[1,a/(a+b)],[1e4,a/(a+b)]]}];
    const pts=[];if(sim){sim.pk.forEach(([x,y])=>pts.push({x,y,c:'var(--c3)',l:'simulated pass@'+x+': '+pc1(y)}));sim.vt.forEach(([x,y])=>pts.push({x,y,c:'var(--c1)',l:'simulated vote over '+x+': '+pc1(y)}))}
    $('labAcc').innerHTML=lineChart({W,H:260,x:[1,1e4],logx:true,y:[0,1],series:ser,pts,marks:[{x:k,l:'k = '+fmt(k)}],
      xt:[[1,'1'],[10,'10'],[100,'100'],[1000,'1,000'],[1e4,'10⁴']],yt:[[0,'0%'],[.25,'25%'],[.5,'50%'],[.75,'75%'],[1,'100%']],xl:'samples per problem (log scale)',yl:'share of benchmark solved',label:'Benchmark accuracy against samples'})+legend(ser)+(sim?'<div class="leg"><span>○ circles: one simulated benchmark of '+sim.N+' problems</span></div>':'');
    const kv=Math.min(k,63),nOdd=NS.reduce((p,n)=>n<=kv?n:p,1),pv=passB(a,b,k),vv=voteB(w,nOdd);
    $('labOut').innerHTML=stat('Perfect verifier, pass@'+fmt(k),pc1(pv),'1 − B(α, β + k)/B(α, β)')+
      stat('Plurality vote over '+nOdd,pc1(vv),nOdd<k?'largest odd n computed is 63':'exact, ties broken at random')+
      stat('Vote ceiling',pc1(1-below),'share of problems with p > 1/(m + 1) = '+n3(thr,3))+
      stat('Tokens per problem',fmt(k*T),fmt(k)+' × '+fmt(T)+'; wall-clock stays one sample\'s if run in parallel');
    $('labNote').textContent='Problems with p below 1/(m + 1) are lost to the vote for good: their most likely answer is wrong, so more votes push them further from right ('+pc1(below)+' of this benchmark). A verifier keeps climbing, slowly, because it only needs one correct sample. Scattering the wrong answers (larger m) lowers the threshold and lifts the vote.';
    // failure chart, log-log
    const H=250,fr=logFrame({W,H,pl:48,pr:12,pt:12,pb:38,x:[1,1e4],y:[1e-4,1],xt:[[1,'1'],[10,'10'],[100,'100'],[1000,'1,000'],[1e4,'10⁴']],yt:[[1,'1'],[0.1,'0.1'],[0.01,'0.01'],[1e-3,'0.001'],[1e-4,'10⁻⁴']],xl:'samples per problem (log scale)',yl:'failure rate (log scale)'});
    const path=(f,c,dash)=>{let d='';ks.forEach((x,i)=>{const y=Math.max(1e-4,f(x));d+=(i?'L':'M')+fr.lx(x).toFixed(1)+' '+fr.ly(y).toFixed(1)});return '<path d="'+d+'" fill="none" stroke="'+c+'" stroke-width="2"'+(dash?' stroke-dasharray="5 4"':'')+'/>'};
    const C=Math.exp(lnG(a+b)-lnG(b));
    let g=fr.s+path(x=>1-passB(a,b,x),'var(--c3)')+path(x=>Math.min(1,C*Math.pow(x,-a)),'var(--c2)',true);
    [0.5,0.05,0.005].forEach((p,i)=>{g+=path(x=>Math.pow(1-p,x),'var(--mute)',i!==0)});
    const fser=[{name:'benchmark: 1 − mean pass@k (exact)',c:'var(--c3)'},{name:'power law Γ(α + β)/Γ(β) · k^−α',c:'var(--c2)',dash:true},{name:'single problems, p = 0.5, 0.05, 0.005',c:'var(--mute)'}];
    $('labFail').innerHTML=svgEl(W,H,g,'Failure rate against samples, log-log')+legend(fser);
    const lnF=k=>lnG(a+b)+lnG(b+k)-lnG(b)-lnG(a+b+k),sl=(lnF(1e4)-lnF(1e3))/Math.log(10);
    $('labSlope').textContent='Measured slope of the exact curve between 1,000 and 10,000 samples: '+n3(sl,3)+', against −α = −'+n3(a,3)+'. Single problems have no straight stretch: each falls off a cliff once k passes about 1/p.';
    const b100=passB(0.5239,3.786,100),b1e4=passB(0.5239,3.786,1e4);
    $('labRepro').innerHTML=('<b>The "fitted to Brown et al." preset reproduces their stated MATH coverage by construction</b> (α and β were solved from those two numbers, Llama-3-8B-Instruct: 82.9% at 100 samples, 98.44% at 10,000; BROWN_LINK): α = 0.5239 and β = 3.786 give '+pc1(b100)+' and '+(100*b1e4).toFixed(2)+'%. <b>It does not reproduce what they measured for voting:</b> the paper reports 40.50% at 100 samples and 41.41% at 10,000 for majority voting or a reward model, a plateau the Beta model can match only through m, which the paper does not report. The preset\'s implied one-sample accuracy, α/(α + β) = 12.2%, is derived, not measured. The other presets are illustrative.').replace('BROWN_LINK',A('https://arxiv.org/abs/2407.21787','Brown et al.'));
  }
  ['labA','labB','labK','labT'].forEach(i=>$(i).addEventListener('input',()=>{if(i!=='labK'&&i!=='labT')sim=null;draw()}));
  onTab('t-samp',draw);
})();
