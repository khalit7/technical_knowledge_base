// ---- section 9: the Beta-Bernoulli coin, flip by flip, MLE alone (before) against the posterior (after) ----
(function(){
  const $=id=>document.getElementById(id);const box=$('rd-coin-svg');if(!box)return;
  const FL='HHHTHHTHTHHT',A0=2,B0=2;
  // every step's numbers (checked against recompute.py coin_steps)
  const S=[];let h=0,t=0,cb=0,cm=0;
  for(let i=0;i<=FL.length;i++){
    const a=A0+h,b=B0+t,n=h+t;
    const row={n,h,t,a,b,mle:n?h/n:null,map:(a-1)/(a+b-2),mean:a/(a+b),lo:PM.betaQ(0.025,a,b),hi:PM.betaQ(0.975,a,b),cb,cm,next:FL[i]||null};
    if(i<FL.length){const pb=a/(a+b),pm=n?h/n:0.5;
      row.lossB=FL[i]==='H'?-Math.log(pb):-Math.log(1-pb);row.lossM=FL[i]==='H'?(pm===0?Infinity:-Math.log(pm)):(pm===1?Infinity:-Math.log(1-pm));
      cb+=row.lossB;cm+=row.lossM;if(FL[i]==='H')h++;else t++}
    S.push(row)}
  window.PM.coinSteps=S;
  let mode='bayes';
  const f3=v=>v==null?'none':PM.f(v,3);
  const fl=v=>v===Infinity?'∞':PM.f(v,3);
  function frame(i){fi=i;
    const s=S[i];const W=Math.min(RD.width(box),760),H=250,L=40,R=W-14,T=40,Bm=H-34;
    const X=p=>L+(R-L)*p;let g='';
    // flip strip
    const cw=Math.min(26,(W-20)/FL.length);
    for(let k=0;k<FL.length;k++){const x=10+k*cw,seen=k<s.n;
      g+='<rect x="'+x.toFixed(1)+'" y="4" width="'+(cw-3).toFixed(1)+'" height="20" rx="3" fill="'+(seen?(FL[k]==='H'?'var(--c1)':'var(--c2)'):'var(--soft)')+'" stroke="'+(k===s.n?'var(--ink)':'var(--line)')+'"/>';
      g+=RD.t(x+(cw-3)/2,18,FL[k],{a:'middle',fs:11,fill:seen?'var(--bg)':'var(--mute)'})}
    // axes
    g+='<line x1="'+L+'" y1="'+Bm+'" x2="'+R+'" y2="'+Bm+'" stroke="var(--mute)"/>';
    [0,0.25,0.5,0.75,1].forEach(v=>{g+='<line x1="'+X(v)+'" y1="'+Bm+'" x2="'+X(v)+'" y2="'+(Bm+4)+'" stroke="var(--mute)"/>'+RD.t(X(v),Bm+16,v,{a:'middle',fill:'var(--mute)'})});
    g+=RD.t((L+R)/2,H-4,'p, the probability of heads',{a:'middle',fill:'var(--mute)'});
    if(mode==='bayes'){
      const N=200,ys=[];let mx=0;for(let k=0;k<=N;k++){const p=k/N,y=PM.betaPdf(Math.min(Math.max(p,1e-6),1-1e-6),s.a,s.b);ys.push(y);if(y>mx)mx=y}
      mx=Math.max(mx,4.2);const Y=y=>Bm-(Bm-T)*y/mx;
      // prior, faint
      let pr='';for(let k=0;k<=N;k++){const p=k/N;pr+=(k?'L':'M')+X(p).toFixed(1)+' '+Y(PM.betaPdf(Math.min(Math.max(p,1e-6),1-1e-6),A0,B0)).toFixed(1)}
      g+='<path d="'+pr+'" fill="none" stroke="var(--dim)" stroke-width="1.5" stroke-dasharray="3 3"/>';
      // CI shading
      let ci='M'+X(s.lo).toFixed(1)+' '+Bm;for(let k=0;k<=N;k++){const p=k/N;if(p<s.lo||p>s.hi)continue;ci+='L'+X(p).toFixed(1)+' '+Y(ys[k]).toFixed(1)}ci+='L'+X(s.hi).toFixed(1)+' '+Bm+'Z';
      g+='<path d="'+ci+'" fill="var(--acc2)"/>';
      let cu='';for(let k=0;k<=N;k++)cu+=(k?'L':'M')+X(k/N).toFixed(1)+' '+Y(ys[k]).toFixed(1);
      g+='<path d="'+cu+'" fill="none" stroke="var(--c1)" stroke-width="2.2"/>';
      const mk=(v,c,lab,dy,dash)=>{if(v==null)return;g+='<line x1="'+X(v)+'" y1="'+T+'" x2="'+X(v)+'" y2="'+Bm+'" stroke="'+c+'" stroke-width="1.6"'+(dash?' stroke-dasharray="4 3"':'')+'/>'+RD.t(X(v)+(v>0.8?-4:4),T+dy,lab,{a:v>0.8?'end':'start',fill:c,fs:11})};
      mk(s.mle,'var(--c2)','MLE '+f3(s.mle),2,true);mk(s.map,'var(--c4)','MAP '+f3(s.map),15);mk(s.mean,'var(--c3)','mean '+f3(s.mean),28);
      g+=RD.t(L-4,T+6,'density',{a:'end',fill:'var(--mute)',fs:10});
    }else{
      // MLE alone: one point estimate, drawn as a spike of certainty
      if(s.mle==null){g+=RD.t((L+R)/2,(T+Bm)/2,'no data yet: there is no MLE',{a:'middle',fill:'var(--mute)'})}
      else{g+='<line x1="'+X(s.mle)+'" y1="'+(T+4)+'" x2="'+X(s.mle)+'" y2="'+Bm+'" stroke="var(--c2)" stroke-width="4"/><circle cx="'+X(s.mle)+'" cy="'+(T+4)+'" r="5" fill="var(--c2)"/>'+
        RD.t(X(s.mle)+(s.mle>0.7?-8:8),T+8,'MLE p = '+f3(s.mle),{a:s.mle>0.7?'end':'start',fill:'var(--c2)',w:600});
        if(s.mle===1)g+=RD.t(X(s.mle)-8,T+24,'tails "impossible"',{a:'end',fill:'var(--bad)'})}
    }
    box.innerHTML=RD.svg(W,H,g,'Coin posterior after '+s.n+' flips');
    const pn=mode==='bayes'?s.mean:(s.n?s.mle:0.5);
    $('rd-coin-cnt').innerHTML=RD.stat('Flips seen',s.n,s.h+' H, '+s.t+' T')+RD.stat('Bet on heads next',PM.f(pn,3),mode==='bayes'?'posterior mean':'MLE')+
      RD.stat('Log loss so far, posterior',fl(s.cb),'sum of −ln(bet on what came)')+RD.stat('Log loss so far, MLE',fl(s.cm),'')+
      (mode==='bayes'?RD.stat('95% credible interval',f3(s.lo)+' to '+f3(s.hi),'Beta('+s.a+', '+s.b+')'):'');
    box.dataset.step=i;box.dataset.mean=f3(s.mean);box.dataset.lo=f3(s.lo);box.dataset.hi=f3(s.hi);box.dataset.cb=fl(s.cb);
  }
  // five explained stretches of the 13 frames (0 to 12 flips): each step of the list plays its flips one by one when stepped forward
  const STR=[[0,0],[1,3],[4,4],[5,8],[9,12]],RMc=RD.RM,card=$('rd-coin-card');let fi=0,ct=0;
  function draw(i){if(ct){clearTimeout(ct);ct=0}const [a,b]=STR[i],r=card.getBoundingClientRect(),on=r.bottom>0&&r.top<innerHeight&&card.offsetParent!==null;
    if(!card.classList.contains('rd-fwd')||RMc||!on||a===b){frame(b);return}
    let j=a;const run=()=>{frame(j);ct=0;if(j<b){j++;ct=setTimeout(run,750)}};run()}
  const an=RD.anim({card:'rd-coin-card',ctl:'rd-coin-ctl',n:STR.length,draw,ms:5200,label:'Stretch of flips',list:'sx-coin-bayes'});
  RD.seg($('rd-coin-seg'),m=>{mode=m;['bayes','mle'].forEach(x=>{$('sx-coin-'+x).hidden=x!==m});an.reset(STR.length,'sx-coin-'+m)});
  RD.onResize(()=>frame(fi));
})();

// ---- section 10: inverse CDF against Gumbel-max on the tiny model ----
(function(){
  const $=id=>document.getElementById(id);const box=$('rd-smp-svg');if(!box)return;
  const z=[2,1,0],W3=['cat','dog','sat'];const ez=z.map(Math.exp),Sm=ez.reduce((a,b)=>a+b),p=ez.map(v=>v/Sm);
  const cdf=[p[0],p[0]+p[1],1];
  const STEPS=[0,1,2,3,10,100,1000,10000];
  let mode='inv',cache={};
  function run(m){if(cache[m])return cache[m];const r=PM.rng(2026),cnt=[0,0,0],hist=[[0,0,0]],last=[];
    for(let d=1;d<=10000;d++){let k;
      if(m==='inv'){const u=r();k=u<cdf[0]?0:u<cdf[1]?1:2;if(d<=3)last.push({u,k})}
      else{const us=[r(),r(),r()],g=us.map(u=>-Math.log(-Math.log(u))),s=z.map((v,i)=>v+g[i]);k=s.indexOf(Math.max(...s));if(d<=3)last.push({g,s,k})}
      cnt[k]++;if(STEPS.includes(d))hist.push(cnt.slice())}
    return cache[m]={hist,last}}
  function draw(i){
    const R=run(mode),c=R.hist[i],n=STEPS[i];const W=Math.min(RD.width(box),640),H=170,L=46,Rr=W-60;
    let g='';const bh=34;
    for(let k=0;k<3;k++){const y=12+k*(bh+16),fr=n?c[k]/n:0;
      g+=RD.t(L-6,y+bh/2+4,W3[k],{a:'end'});
      g+='<rect x="'+L+'" y="'+y+'" width="'+(Rr-L)+'" height="'+bh+'" fill="var(--soft)"/>';
      g+='<rect x="'+L+'" y="'+y+'" width="'+((Rr-L)*fr).toFixed(1)+'" height="'+bh+'" fill="'+['var(--c1)','var(--c3)','var(--c2)'][k]+'"/>';
      g+='<line x1="'+(L+(Rr-L)*p[k]).toFixed(1)+'" y1="'+(y-3)+'" x2="'+(L+(Rr-L)*p[k]).toFixed(1)+'" y2="'+(y+bh+3)+'" stroke="var(--ink)" stroke-width="2"/>';
      g+=RD.t(Rr+6,y+bh/2+4,n?PM.f(fr,3):'',{fs:11})}
    box.innerHTML=RD.svg(W,H,g,'Sample frequencies against the model probabilities');
    let cap=n.toLocaleString('en-US')+' draw'+(n===1?'':'s')+(mode==='inv'?' by inverse CDF':' by Gumbel-max')+': ';
    if(n===0)cap+='none yet; the ticks mark p.';
    else if(n<=3){const e=R.last[n-1];cap+=mode==='inv'?'u = '+PM.f(e.u,3)+' gives '+W3[e.k]+'.':'z + g = ('+e.s.map(v=>PM.f(v,2)).join(', ')+') gives '+W3[e.k]+'.'}
    else cap+='frequencies ('+c.map(v=>PM.f(v/n,3)).join(', ')+') against p = (0.665, 0.245, 0.090).';
    $('rd-smp-cap').innerHTML=cap;box.dataset.freq=c.map(v=>n?PM.f(v/n,3):'0').join(',');
  }
  const an=RD.anim({card:'rd-smp-card',ctl:'rd-smp-ctl',n:STEPS.length,draw,ms:3800,label:'Draws',list:'sx-smp-inv'});
  RD.seg($('rd-smp-seg'),m=>{mode=m;['inv','gum'].forEach(x=>{$('sx-smp-'+x).hidden=x!==m});an.reset(STEPS.length,'sx-smp-'+m)});RD.onResize(()=>an.redraw());
})();
