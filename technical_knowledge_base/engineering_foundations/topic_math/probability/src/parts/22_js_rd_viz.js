// ---- Reading tab visuals: base rates (s2), multivariate Gaussian (s6) ----
// Shared numeric helpers for the whole page live on window.PM.
window.PM=(function(){
  function rng(seed){let a=seed>>>0;return function(){a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}
  function gauss(r){let u=0;while(u===0)u=r();const v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
  function lgamma(x){// Lanczos (g=7, n=9)
    const c=[0.99999999999980993,676.5203681218851,-1259.1392167224028,771.32342877765313,-176.61502916214059,12.507343278686905,-0.13857109526572012,9.9843695780195716e-6,1.5056327351493116e-7];
    if(x<0.5)return Math.log(Math.PI/Math.sin(Math.PI*x))-lgamma(1-x);
    x-=1;let a=c[0];const t=x+7.5;for(let i=1;i<9;i++)a+=c[i]/(x+i);
    return 0.5*Math.log(2*Math.PI)+(x+0.5)*Math.log(t)-t+Math.log(a)}
  function betaPdf(x,a,b){if(x<=0||x>=1){if(x<=0)return a<1?Infinity:(a===1?Math.exp(-lbeta(a,b)):0);return b<1?Infinity:(b===1?Math.exp(-lbeta(a,b)):0)}
    return Math.exp((a-1)*Math.log(x)+(b-1)*Math.log(1-x)-lbeta(a,b))}
  function lbeta(a,b){return lgamma(a)+lgamma(b)-lgamma(a+b)}
  // Simpson on [0,x] with n panels (same rule as recompute.py)
  function betaCdf(x,a,b,n){n=n||4000;if(x<=0)return 0;if(x>=1)return 1;const h=x/n;const f=t=>{if(t<=0)return(a>1)?0:Math.exp(-lbeta(a,b));if(t>=1)return(b>1)?0:Math.exp(-lbeta(a,b));return Math.exp((a-1)*Math.log(t)+(b-1)*Math.log(1-t)-lbeta(a,b))};
    let s=f(0)+f(x);for(let i=1;i<n;i++)s+=(i%2?4:2)*f(i*h);return s*h/3}
  function betaQ(q,a,b){let lo=0,hi=1;for(let i=0;i<50;i++){const m=(lo+hi)/2;if(betaCdf(m,a,b)<q)lo=m;else hi=m}return(lo+hi)/2}
  const f=(v,d)=>(+v).toFixed(d==null?3:d);
  return {rng,gauss,lgamma,lbeta,betaPdf,betaCdf,betaQ,f};
})();

(function(){// ---- s2: base rates ----
  const B=[0.1,0.5,1,2,5,10,20,50];
  const $=id=>document.getElementById(id);
  const dots=$('rd-br-dots');if(!dots)return;
  let h='';for(let i=0;i<1000;i++)h+='<i></i>';dots.innerHTML=h;const ds=[...dots.children];
  function draw(){
    const b=B[+$('rd-br-b').value]/100,t=+$('rd-br-t').value/100,fp=+$('rd-br-f').value/100;
    $('rd-br-bv').textContent=(b*100)+'%';$('rd-br-tv').textContent=Math.round(t*100)+'%';$('rd-br-fv').textContent=(fp*100)+'%';
    const N=10000,tox=N*b,cl=N-tox,tp=tox*t,fn=tox-tp,fpc=cl*fp,tn=cl-fpc;
    const prec=tp/(tp+fpc);
    // dots: each dot = 10 messages
    const nTP=Math.round(tp/10),nFN=Math.round(tox/10)-nTP,nFP=Math.round(fpc/10);
    ds.forEach((d,i)=>{d.style.background=i<nTP?'var(--c2)':i<nTP+nFN?'var(--c5)':i<nTP+nFN+nFP?'var(--c1)':'var(--dim)'});
    const fm=v=>v.toLocaleString('en-US',{maximumFractionDigits:1});
    $('rd-br-out').innerHTML=RD.stat('Toxic messages',fm(tox),'of 10,000')+RD.stat('Flagged',fm(tp+fpc),fm(tp)+' toxic + '+fm(fpc)+' clean')+
      RD.stat('P(toxic | flagged)',PM.f(prec,3),'precision')+RD.stat('P(toxic | not flagged)',PM.f(fn/(fn+tn),4),'what a pass is worth');
    dots.dataset.prec=PM.f(prec,3);
  }
  ['rd-br-b','rd-br-t','rd-br-f'].forEach(id=>$(id).addEventListener('input',draw));draw();
})();

(function(){// ---- s6: multivariate Gaussian shape ----
  const $=id=>document.getElementById(id);const box=$('rd-mvn-svg');if(!box)return;
  const r=PM.rng(7),E=[];for(let i=0;i<400;i++)E.push([PM.gauss(r),PM.gauss(r)]);
  function draw(){
    const s1=+$('rd-mvn-a').value,s2=+$('rd-mvn-b').value,rho=+$('rd-mvn-r').value;
    $('rd-mvn-av').textContent=s1.toFixed(1);$('rd-mvn-bv').textContent=s2.toFixed(1);$('rd-mvn-rv').textContent=rho.toFixed(2);
    const L=[[s1,0],[rho*s2,s2*Math.sqrt(1-rho*rho)]];
    const S=[[s1*s1,rho*s1*s2],[rho*s1*s2,s2*s2]];
    const tr=S[0][0]+S[1][1],det=S[0][0]*S[1][1]-S[0][1]*S[0][1],disc=Math.sqrt(Math.max(0,tr*tr/4-det));
    const l1=tr/2+disc,l2=tr/2-disc;
    const ang=Math.abs(S[0][1])<1e-12?(S[0][0]>=S[1][1]?0:Math.PI/2):Math.atan2(l1-S[0][0],S[0][1]);
    const W=Math.min(RD.width(box),520),H=Math.round(W*0.78),cx=W/2,cy=H/2,sc=Math.min(W,H)/12;
    let g='<rect x="0" y="0" width="'+W+'" height="'+H+'" fill="none" stroke="var(--line)"/>';
    g+='<line x1="0" y1="'+cy+'" x2="'+W+'" y2="'+cy+'" stroke="var(--line)"/><line x1="'+cx+'" y1="0" x2="'+cx+'" y2="'+H+'" stroke="var(--line)"/>';
    E.forEach(e=>{const x=L[0][0]*e[0],y=L[1][0]*e[0]+L[1][1]*e[1];g+='<circle cx="'+(cx+x*sc).toFixed(1)+'" cy="'+(cy-y*sc).toFixed(1)+'" r="2" fill="var(--c1)" fill-opacity=".55"/>'});
    [1,2].forEach(k=>{g+='<ellipse cx="'+cx+'" cy="'+cy+'" rx="'+(k*Math.sqrt(l1)*sc).toFixed(1)+'" ry="'+(k*Math.sqrt(Math.max(l2,0))*sc).toFixed(1)+'" transform="rotate('+(-ang*180/Math.PI).toFixed(2)+' '+cx+' '+cy+')" fill="none" stroke="var(--c2)" stroke-width="'+(k===1?2:1.2)+'"'+(k===2?' stroke-dasharray="4 3"':'')+'/>'});
    g+=RD.t(W-6,cy-6,'x₁',{a:'end',fill:'var(--mute)'})+RD.t(cx+6,14,'x₂',{fill:'var(--mute)'});
    box.innerHTML=RD.svg(W,H,g,'Samples from a two-dimensional Gaussian with its covariance ellipses');
    $('rd-mvn-out').innerHTML=RD.stat('Σ',PM.f(S[0][0],2)+', '+PM.f(S[0][1],2)+' / '+PM.f(S[1][0],2)+', '+PM.f(S[1][1],2),'rows of the covariance')+
      RD.stat('Cholesky L',PM.f(L[0][0],2)+', 0 / '+PM.f(L[1][0],2)+', '+PM.f(L[1][1],2),'Σ = L Lᵀ')+
      RD.stat('Eigenvalues',PM.f(l1,2)+' and '+PM.f(Math.max(l2,0),2),'axis half-lengths: their square roots')+
      RD.stat('det Σ',PM.f(det,3),'area scale; near 0 means near singular');
    box.dataset.eig=PM.f(l1,2)+','+PM.f(Math.max(l2,0),2);box.dataset.l21=PM.f(L[1][0],3);box.dataset.l22=PM.f(L[1][1],3);
  }
  ['rd-mvn-a','rd-mvn-b','rd-mvn-r'].forEach(id=>$(id).addEventListener('input',draw));
  draw();RD.onRender(draw);RD.onResize(draw);
})();
