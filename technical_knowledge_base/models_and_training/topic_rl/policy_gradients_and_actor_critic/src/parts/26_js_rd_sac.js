// ---- Reading section 13: maximum entropy on a one-dimensional action. The temperature alpha, the soft-optimal policy,
// the best Gaussian actor, and SAC's automatic temperature (new on this page; illustrative reward, exact computation) ----
(function(){
  const E=window.PGE,$=id=>document.getElementById(id);
  const P=$('rd-saP'),Q=$('rd-saQ'),O=$('rd-saO'),As=$('rd-saA');if(!P)return;
  const LA0=Math.log10(0.005),LA1=0;let curve=null,auto=null;
  const alpha=()=>Math.pow(10,LA0+(LA1-LA0)*(+As.value)/200);
  function draw(){if(!curve){curve=E.sacCurve(0.005,1,61);auto=E.sacAuto(-1)}
    const a=alpha();$('rd-saAv').textContent=a<0.1?a.toFixed(3):a.toFixed(2);
    const g=E.sacGauss(a),bz=E.sacBoltz(a);
    // panel 1: reward and the two policies
    const W=RD.width(P),H=210,l=30,r=10,t=8,b=22,x0=-1.5,x1=1.5,X=v=>l+(W-l-r)*(v-x0)/(x1-x0),rH=60;
    let s='';const rr=[];for(let k=0;k<=200;k++){const x=x0+(x1-x0)*k/200;rr.push([x,E.sacR(x)])}
    const rlo=Math.min(...rr.map(p=>p[1])),rhi=Math.max(...rr.map(p=>p[1])),YR=v=>t+rH*(rhi-v)/(rhi-rlo);
    s+='<polyline fill="none" stroke="var(--c3)" stroke-width="2" points="'+rr.map(p=>X(p[0]).toFixed(1)+','+YR(p[1]).toFixed(1)).join(' ')+'"/>'+RD.t(l+2,t+10,'reward r(a)',{fs:10,fill:'var(--c3)'});
    const gd=x=>Math.exp(-(x-g.mu)*(x-g.mu)/(2*g.s*g.s))/(g.s*Math.sqrt(2*Math.PI));
    const pts=[];bz.xs.forEach((x,i)=>{if(x>=x0&&x<=x1)pts.push([x,bz.p[i]])});
    const gp=[];for(let k=0;k<=600;k++){const x=x0+(x1-x0)*k/600;gp.push([x,gd(x)])}
    const dmax=Math.max(...pts.map(p=>p[1]),...gp.map(p=>p[1])),top=t+rH+14,YD=v=>top+(H-b-top)*(1-v/dmax);
    s+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+YD(0)+'" y2="'+YD(0)+'" stroke="var(--line)"/>';
    s+='<polygon points="'+X(x0)+','+YD(0)+' '+pts.map(p=>X(p[0]).toFixed(1)+','+YD(p[1]).toFixed(1)).join(' ')+' '+X(x1)+','+YD(0)+'" fill="var(--c4)" opacity=".25"/>';
    s+='<polyline fill="none" stroke="var(--c1)" stroke-width="2.4" points="'+gp.map(p=>X(p[0]).toFixed(1)+','+YD(p[1]).toFixed(1)).join(' ')+'"/>';
    [-1.5,-1,-0.5,0,0.5,1,1.5].forEach(v=>s+=RD.t(X(v),H-6,RD.n(v,1),{a:'middle',fs:10,fill:'var(--mute)'}));
    s+=RD.t(W-r,top+10,'densities, scaled to fit',{a:'end',fs:10,fill:'var(--mute)'});
    P.innerHTML=RD.svg(W,H,s,'Reward and policies over the action')+'<div class="leg"><span><i class="ln" style="background:var(--c3)"></i>reward</span><span><i style="background:var(--c4);opacity:.4"></i>soft-optimal π ∝ exp(r/α)</span><span><i class="ln" style="background:var(--c1)"></i>best Gaussian actor</span></div>';
    // panel 2: entropy against alpha
    const W2=RD.width(Q),H2=150,l2=34,r2=10,t2=10,b2=24,Hs=curve.map(c=>c.gH).concat(curve.map(c=>c.bH),[-1]),hlo=Math.min(...Hs)-0.1,hhi=Math.max(...Hs)+0.1;
    const X2=v=>l2+(W2-l2-r2)*(Math.log10(v)-LA0)/(LA1-LA0),Y2=v=>t2+(H2-t2-b2)*(hhi-v)/(hhi-hlo);
    let q='<line x1="'+l2+'" x2="'+(W2-r2)+'" y1="'+Y2(-1)+'" y2="'+Y2(-1)+'" stroke="var(--bad)" stroke-dasharray="4 3"/>'+RD.t(W2-r2,Y2(-1)-4,'target entropy −dim(A) = −1',{a:'end',fs:10,fill:'var(--bad)'});
    q+='<polyline fill="none" stroke="var(--c4)" stroke-width="1.8" points="'+curve.map(c=>X2(c.a).toFixed(1)+','+Y2(c.bH).toFixed(1)).join(' ')+'"/>';
    q+='<polyline fill="none" stroke="var(--c1)" stroke-width="2.4" points="'+curve.map(c=>X2(c.a).toFixed(1)+','+Y2(c.gH).toFixed(1)).join(' ')+'"/>';
    q+='<line x1="'+X2(auto)+'" x2="'+X2(auto)+'" y1="'+t2+'" y2="'+(H2-b2)+'" stroke="var(--bad)" stroke-dasharray="2 3"/>';
    q+='<circle cx="'+X2(a)+'" cy="'+Y2(g.H)+'" r="5" fill="var(--c1)" stroke="var(--bg)"/>';
    [0.005,0.01,0.03,0.1,0.3,1].forEach(v=>q+=RD.t(X2(v),H2-8,'α '+v,{a:'middle',fs:9.5,fill:'var(--mute)'}));
    q+=RD.t(l2-4,Y2(hhi)+8,RD.n(hhi,1),{a:'end',fs:9.5,fill:'var(--mute)'})+RD.t(l2-4,Y2(hlo),RD.n(hlo,1),{a:'end',fs:9.5,fill:'var(--mute)'});
    Q.innerHTML=RD.svg(W2,H2,q,'Entropy against temperature')+'<div class="leg"><span><i class="ln" style="background:var(--c1)"></i>entropy of the best Gaussian</span><span><i class="ln" style="background:var(--c4)"></i>entropy of the soft-optimal π</span></div>';
    const peak=g.mu>0?'the tall narrow peak at +0.6':(g.s>0.4?'both peaks at once':'the lower, wider peak at −0.5');
    O.innerHTML='At α = '+RD.n(a,3)+' the best Gaussian sits on <b>'+peak+'</b>: μ = '+RD.n(g.mu,3)+', σ = '+RD.n(g.s,3)+', expected reward '+RD.n(g.ER,3)+', entropy '+RD.n(g.H,3)+'. '+
      'The soft-optimal policy (no Gaussian restriction) gets reward '+RD.n(bz.ER,3)+' at entropy '+RD.n(bz.H,3)+'. '+
      'SAC\'s temperature rule would settle at α ≈ '+RD.n(auto,3)+', where the best Gaussian\'s entropy jumps past the target (from '+RD.n(E.sacGauss(auto*0.999).H,2)+' to '+RD.n(E.sacGauss(auto*1.001).H,2)+'): on this reward no Gaussian has entropy exactly −1 at its optimum.'}
  As.addEventListener('input',draw);
  $('rd-saB').addEventListener('click',()=>{if(!curve)draw();As.value=Math.round(200*(Math.log10(auto)-LA0)/(LA1-LA0));draw()});
  RD.onRender(draw);RD.onResize(draw);
  // first draw when the card is near the screen (the curve costs a few hundred milliseconds)
  if('IntersectionObserver' in window){const io=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)){io.disconnect();draw()}},{rootMargin:'400px'});io.observe($('rd-sa'))}else draw();
})();
