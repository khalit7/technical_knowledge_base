// ---- The paper tab: the fitted laws drawn live (Eq. 1.1 to 1.6, Table 2, Table 5, Appendix B) ----
const K=window.KAPLAN={aN:0.076,Nc:8.8e13,aD:0.095,Dc:5.4e13,aCm:0.050,Ccm:3.1e8,aB:0.21,Bs:2.1e8,aS:0.76,Sc:2.1e3,
  t2:{aN:0.076,aD:0.103,Nc:6.4e13,Dc:1.8e13},Ne:1.3e9,pN:0.73,PFD:8.64e19};
const lg10=Math.log10;
const SB=t=>'<tspan dy="4" font-size="11">'+t+'</tspan><tspan dy="-4">\u200a</tspan>';
const sciT=(v,d)=>{if(!isFinite(v))return '?';const e=Math.floor(lg10(Math.abs(v))+1e-9),m=v/10**e;return (d===0||Math.abs(m-1)<1e-9?'':(m.toFixed(d==null?1:d)+' × '))+'10'+sup(e)};
const sciS=(v,d)=>{if(!isFinite(v))return '?';const e=Math.floor(lg10(Math.abs(v))+1e-9),m=v/10**e;return (Math.abs(m-1)<1e-9?'':m.toFixed(d==null?1:d)+'×')+'10<tspan dy="-5" font-size="11">'+e+'</tspan><tspan dy="5"> </tspan>'};
const decTicks=(a,b,step)=>{const t=[];for(let e=Math.ceil(lg10(a)-1e-9);e<=Math.floor(lg10(b)+1e-9);e+=(step||1))t.push([10**e,'10'+sup(e)]);return t};
const linTicks=(vals)=>vals.map(v=>[v,String(v)]);
const pathOf=(pts)=>pts.filter(p=>isFinite(p[0])&&isFinite(p[1])).map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+','+p[1].toFixed(1)).join('');
const pth=(d,c,o)=>{o=o||{};return '<path d="'+d+'" fill="none" stroke="'+c+'" stroke-width="'+(o.sw||2)+'"'+(o.da?' stroke-dasharray="'+o.da+'"':'')+(o.op!=null?' opacity="'+o.op+'"':'')+'/>'};
const dot=(x,y,r,c,o)=>{o=o||{};return '<circle cx="'+(+x).toFixed(1)+'" cy="'+(+y).toFixed(1)+'" r="'+r+'" fill="'+(o.f||c)+'" stroke="'+c+'" stroke-width="'+(o.sw||1.5)+'"'+(o.op!=null?' opacity="'+o.op+'"':'')+'/>'};
const geo=(a,b,n)=>{const r=[];for(let i=0;i<=n;i++)r.push(a*Math.pow(b/a,i/n));return r};

// ---- Predict: doubling N ----
PRED_REVEAL['pr-dbl']=()=>{$('dblV').textContent=Math.pow(2,-K.aN).toFixed(4)};
PRED_REVEAL['pr-tenx']=()=>{$('tenxK').textContent=Math.pow(10,K.pN).toFixed(1);$('tenxD').textContent=Math.pow(10,1-K.pN).toFixed(1)};
(function(){const r=PAPER.rc;$('acmV').textContent=r.alphaCmin_pred.v.toFixed(3);$('pnV').textContent=r.pN_pred.v.toFixed(2)})();

// ---- Figure 1 rebuilt from Eq. 1.1 to 1.3 ----
(function(){
  const L={N:{a:K.aN,c:K.Nc,fit:[768,1.5e9],x:[1e2,1e12],nm:'non-embedding parameters N',u:'parameters',eq:'Eq. 1.1'},
    D:{a:K.aD,c:K.Dc,fit:[2.2e7,2.3e10],x:[1e6,1e12],nm:'dataset size D (tokens)',u:'tokens',eq:'Eq. 1.2'},
    C:{a:K.aCm,c:K.Ccm,fit:[1e-8,1e0],x:[1e-9,1e2],nm:'compute C'+SB('min')+' (PF-days)',u:'PF-days',eq:'Eq. 1.3'}};
  let m='N';
  function draw(w){const o=L[m],k=+$('lawK').value/10,mul=Math.pow(10,k);$('lawKv').textContent=mul<10?mul.toFixed(1):fmt(mul,0);
    const H=Math.min(320,Math.max(240,w*.55)),f=v=>Math.pow(o.c/v,o.a);
    const ylo=f(o.x[1])*.92,yhi=f(o.x[0])*1.06;
    const yt=[1.5,2,2.5,3,4,5,6,8,10].filter(v=>v>ylo&&v<yhi).map(v=>[v,String(v)]);
    const F=logFrame({W:w,H,pl:44,pr:14,pt:12,pb:40,x:o.x,y:[ylo,yhi],xt:decTicks(o.x[0],o.x[1],w<500?2:1),yt,xl:o.nm,yl:'test loss (nats/token)'});
    let s=F.s;const xs=geo(o.x[0],o.x[1],120);
    s+=pth(pathOf(xs.map(v=>[F.lx(v),F.ly(f(v))])),'var(--c1)',{sw:1.6,da:'5 4',op:.7});
    s+=pth(pathOf(geo(o.fit[0],o.fit[1],80).map(v=>[F.lx(v),F.ly(f(v))])),'var(--c1)',{sw:3});
    const x0=Math.sqrt(o.fit[0]*o.fit[1])/Math.sqrt(mul),x1=x0*mul;
    s+=dot(F.lx(x0),F.ly(f(x0)),5,'var(--c2)')+dot(F.lx(x1),F.ly(f(x1)),5,'var(--c2)');
    s+=ln2(F.lx(x0),F.ly(f(x0)),F.lx(x1),F.ly(f(x0)),'var(--c2)',{da:'3 3'})+ln2(F.lx(x1),F.ly(f(x0)),F.lx(x1),F.ly(f(x1)),'var(--c2)',{da:'3 3'});
    s+=tx(F.lx(o.fit[1])+6,F.ly(f(o.fit[1]))+16,'end of fitted range',{fs:11,a:'end',c:'var(--mute)'});
    $('lawSvg').innerHTML=svgW(w,H,s,'Loss against '+o.u);
    const r=Math.pow(mul,-o.a);
    $('lawO').innerHTML='<b>'+(mul<10?mul.toFixed(1):fmt(mul,0))+'×</b> the '+o.u+': loss × '+r.toFixed(3)+' ('+((r-1)*100).toFixed(1)+'%), the same at any starting point on the line ('+o.eq+', exponent '+o.a.toFixed(3)+'). '+
      'To halve the loss would take '+sciT(Math.pow(2,1/o.a),1)+'× the '+o.u+'.'}
  segBind('lawM',v=>{m=v;refit($('lawSvg'))});
  $('lawK').addEventListener('input',()=>refit($('lawSvg')));
  onTab('t-read',()=>fit($('lawSvg'),draw));
})();

// ---- Figure 9 left rebuilt: L(N, D) with Table 2 ----
(function(){const t=K.t2,r=t.aN/t.aD,LND=(N,D)=>Math.pow(Math.pow(t.Nc/N,r)+t.Dc/D,t.aD),LN=N=>Math.pow(t.Nc/N,t.aN);
  const thr=PAPER.rc.overfit_thresh.v;
  function draw(w){const D=Math.pow(10,+$('ovD').value/10);$('ovDv').innerHTML=sciT(D,1);
    const H=Math.min(300,Math.max(230,w*.5)),X=[1e3,1e10];
    const F=logFrame({W:w,H,pl:44,pr:14,pt:12,pb:40,x:X,y:[2,7],xt:decTicks(X[0],X[1],w<500?2:1),yt:linTicks([2,2.5,3,4,5,6,7]),xl:'non-embedding parameters N',yl:'test loss (nats/token)'});
    let s=F.s;const xs=geo(X[0],X[1],120);
    s+=pth(pathOf(xs.map(v=>[F.lx(v),F.ly(LN(v))])),'var(--mute)',{sw:1.5,da:'5 4'});
    s+=pth(pathOf(xs.map(v=>[F.lx(v),F.ly(LND(v,D))])),'var(--c1)',{sw:2.6});
    const u=Math.pow(1+thr,1/t.aD)-1,Nm=t.Nc*Math.pow(u*D/t.Dc,1/r);
    if(Nm>X[0]&&Nm<X[1])s+=dot(F.lx(Nm),F.ly(LND(Nm,D)),5,'var(--c2)');
    const lab=legend([['D = '+sciT(D,1)+' tokens','var(--c1)'],['unlimited data','var(--mute)','5 4']],50,H-58,w-60);
    s+=lab.s;$('ovSvg').innerHTML=svgW(w,H,s,'Loss against N for a fixed dataset');
    const big=1e12;$('ovO').innerHTML='With '+sciT(D,1)+' tokens, models up to about <b>'+sciT(Nm,1)+'</b> parameters stay within 2.4% of the unlimited-data loss (Eq. 4.4 gives '+sciT(Math.pow(D/5e3,1/0.74),1)+'). Beyond that, a bigger model buys less and less: the loss can never go below <i>L</i>(<i>D</i>) = '+LND(big*1e6,D).toFixed(2)+' however large <i>N</i> gets.'}
  $('ovD').addEventListener('input',()=>refit($('ovSvg')));
  onTab('t-read',()=>fit($('ovSvg'),draw));
})();

// ---- Eq. 5.1: steps against examples at the same loss ----
(function(){function draw(w){const b=Math.pow(2,+$('bcB').value/4);$('bcBv').textContent=b<1?b.toFixed(b<.1?3:2):b.toFixed(b<10?2:0);
  const H=Math.min(280,Math.max(220,w*.45)),X=[1,30],Y=[1,30];
  const F=logFrame({W:w,H,pl:44,pr:14,pt:12,pb:40,x:X,y:Y,xt:linTicks([1,2,5,10,20]),yt:linTicks([1,2,5,10,20]),xl:'examples processed, E / E'+SB('min')+' (compute)',yl:'steps, S / S'+SB('min')+' (time)'});
  let s=F.s;const bs=geo(1/29,29,100);s+=pth(pathOf(bs.map(v=>[F.lx(1+v),F.ly(1+1/v)])),'var(--c1)',{sw:2.4});
  s+=dot(F.lx(2),F.ly(2),4,'var(--mute)')+tx(F.lx(2)+7,F.ly(2)-6,'B = B'+SB('crit')+': 2×, 2×',{fs:11,c:'var(--mute)'});
  s+=dot(F.lx(1+b),F.ly(1+1/b),6,'var(--c2)');$('bcSvg').innerHTML=svgW(w,H,s,'Steps against examples');
  $('bcO').innerHTML='At <i>B</i> = '+$('bcBv').textContent+' <i>B</i><sub>crit</sub>: <b>'+(1+1/b).toFixed(2)+'×</b> the minimum steps and <b>'+(1+b).toFixed(2)+'×</b> the minimum data (and compute). '+(b<.5?'Compute-efficient, but slow.':b>2?'Fast, but most of the extra examples are wasted.':'Near the compromise the paper recommends.')}
  $('bcB').addEventListener('input',()=>refit($('bcSvg')));onTab('t-read',()=>fit($('bcSvg'),draw))})();

// ---- Animation: same target loss, converge a small model against stop a big one early (Appendix B.3) ----
(function(){const Lt=2.5,Bc=L=>K.Bs/Math.pow(L,1/K.aB),Ninf=Lc=>K.Nc/Math.pow(Lc,1/K.aN);
  const mk=f=>{const Lc=Lt/(1+f),N=Ninf(Lc),S=K.Sc/Math.pow(Lt-Lc,1/K.aS),C=6*N*Bc(Lt)*S/K.PFD;
    const curve=geo(30,S*1.6,160).map(s=>{const L=Lc+Math.pow(K.Sc/s,K.aS);return {s,L,C:6*N*Bc(L)*s/K.PFD}});return {f,Lc,N,S,C,curve,tok:Bc(Lt)*S}};
  const R={eff:mk(K.aN/K.aS),conv:mk(0.02)};
  const X=[3e-2,1e2],Y=[2.1,4.2];
  const modes={eff:[{t:'Pick a big model',c:'For this target the compute-efficient size is the model whose converged loss is 2.50/1.10: 1.8B non-embedding parameters (α<sub>N</sub>/α<sub>S</sub> = 10% above convergence, Eq. B.5).'},
      {t:'Train it at the critical batch',c:'Loss falls along <i>L</i> = (<i>N</i><sub>c</sub>/<i>N</i>)<sup>α<sub>N</sub></sup> + (<i>S</i><sub>c</sub>/<i>S</i>)<sup>α<sub>S</sub></sup>; each step costs 6<i>N</i><i>B</i><sub>crit</sub>(<i>L</i>) FLOPs, and <i>B</i><sub>crit</sub> grows as the loss falls.'},
      {t:'Stop at the target, far from converged',c:'It reaches 2.50 nats while still 10% above where it would end: the curve is still falling steeply, which is exactly when each FLOP buys the most.'},
      {t:'Compare the bills',c:'The small model that converges to the same loss (faint) needs 7.5× the steps and 2.8× the compute: the paper\'s "compute-efficient training uses 7.7x fewer parameter updates, 2.7x more parameters, and 65% less compute" (Eq. B.12 to B.14).'}],
    conv:[{t:'Pick a small model',c:'The usual practice: a model trained until it is within 2% of its converged loss (the paper\'s f′ = 2%). For a 2.50 target that is 0.66B parameters, converged loss 2.45.'},
      {t:'Train it at the critical batch',c:'The same equation, the same batch rule; a smaller model costs less per step but must take many more of them.'},
      {t:'Stop at the target, nearly converged',c:'It reaches 2.50 nats only on the flat tail of its curve, where each step improves the loss very little.'},
      {t:'Compare the bills',c:'The 2.7× larger model (faint) reaches the same loss with 13% of the steps and 36% of the compute. Convergence is inefficient (§1.1).'}]};
  const lastC={};
  function draw(m,k,e,w){const H=Math.min(320,Math.max(250,w*.55)),A=R[m],Bm=R[m==='eff'?'conv':'eff'];
    const F=logFrame({W:w,H,pl:44,pr:14,pt:14,pb:40,x:X,y:Y,xt:decTicks(X[0],X[1],1),yt:linTicks([2.2,2.5,3,3.5,4]),xl:'training compute (PF-days, at the critical batch)',yl:'test loss (nats/token)'});
    let s=F.s;const c1=m==='eff'?'var(--c1)':'var(--c2)',c2=m==='eff'?'var(--c2)':'var(--c1)';
    s+=ln2(F.lx(X[0]),F.ly(Lt),F.lx(X[1]),F.ly(Lt),'var(--good)',{da:'6 4',sw:1.4})+tx(F.lx(X[1])-4,F.ly(Lt)-6,'target 2.50',{fs:11,a:'end',c:'var(--good)'});
    if(k>=3)s+=pth(pathOf(Bm.curve.map(p=>[F.lx(p.C),F.ly(p.L)])),c2,{sw:2,op:.45})+ln2(F.lx(X[0]),F.ly(Bm.Lc),F.lx(X[1]),F.ly(Bm.Lc),c2,{da:'2 4',op:.5});
    s+=ln2(F.lx(X[0]),F.ly(A.Lc),F.lx(X[1]),F.ly(A.Lc),c1,{da:'2 4'})+tx(F.lx(X[0])+4,F.ly(A.Lc)+14,'converged: '+A.Lc.toFixed(2),{fs:11,c:c1});
    let frac=k===0?0:k===1?e:1;const upto=A.curve.filter(p=>p.s<=A.S*Math.max(0.0001,frac)||(k>=2&&p.s<=A.S));
    if(k>=1)s+=pth(pathOf(upto.map(p=>[F.lx(p.C),F.ly(p.L)])),c1,{sw:3});
    if(k>=2){s+=pth(pathOf(A.curve.filter(p=>p.s>=A.S).map(p=>[F.lx(p.C),F.ly(p.L)])),c1,{sw:1.4,da:'4 4',op:.6});s+=dot(F.lx(A.C),F.ly(Lt),6,c1);}
    if(k>=3)s+=dot(F.lx(Bm.C),F.ly(Lt),5,c2,{op:.7});
    const cur=k===0?null:(k===1?upto[upto.length-1]:{s:A.S,L:Lt,C:A.C});lastC[m]=cur;
    s+=tx(50,26,(m==='eff'?'1.8B':'0.66B')+' parameters',{fs:12,c:c1,w:600});
    return svgW(w,H,s,'Learning curve against compute')}
  function counters(m,k){const A=R[m],cur=lastC[m],Bm=R[m==='eff'?'conv':'eff'];
    const v=cur?cur:{s:0,L:NaN,C:0};
    let h=stat('Parameters N',sciT(A.N,2),'non-embedding')+stat('Steps',v.s?fmt(v.s,0):'0',k>=2?'S = '+fmt(A.S,0):'')+stat('Compute',v.C?v.C.toFixed(2)+' PF-days':'0',k>=2?sciT(A.C*K.PFD,2)+' FLOPs':'')+stat('Loss',isFinite(v.L)?v.L.toFixed(3):'not started',k>=2?((Lt/A.Lc-1)*100).toFixed(0)+'% above converged':'');
    if(k>=3)h+=stat('Against the other run',(m==='eff'?(A.C/Bm.C).toFixed(2):(A.C/Bm.C).toFixed(2))+'× compute',(A.S/Bm.S).toFixed(2)+'× steps, '+(A.N/Bm.N).toFixed(2)+'× parameters');
    return '<div class="cnt2">'+h+'</div>'}
  window.CVX=makeAnim({id:'cvx',modes,mode:'eff',draw,counters,dur:2600});
})();

// ---- Figure 15 rebuilt: L(C_min) against L(D(C_min)) ----
(function(){let pm='p';
  function draw(w){const a=+$('crA').value/1000,aD=+$('crD').value/1000;$('crAv').textContent=a.toFixed(3);$('crDv').textContent=aD.toFixed(3);
    const pref=pm==='p'?4e10:PAPER.rc.eq67_pref.v,ex=pm==='p'?0.26:0.27;
    const LC=c=>Math.pow(K.Ccm/c,a),LD=c=>Math.pow(K.Dc/(pref*Math.pow(c,ex)),aD);
    const x=(a*Math.log(K.Ccm)-aD*(Math.log(K.Dc)-Math.log(pref)))/(a-aD*ex),Cx=Math.exp(x);
    const H=Math.min(310,Math.max(240,w*.52)),X=[1e-8,1e10],Y=[1,8];
    const F=logFrame({W:w,H,pl:44,pr:14,pt:12,pb:40,x:X,y:Y,xt:decTicks(X[0],X[1],w<560?4:2),yt:linTicks([1,1.5,2,3,4,6,8]),xl:'compute C'+SB('min')+' (PF-days)',yl:'test loss (nats/token)'});
    let s=F.s;const xs=geo(X[0],X[1],140);
    s+=pth(pathOf(xs.map(v=>[F.lx(v),F.ly(LC(v))])),'var(--c1)',{sw:2.4});
    s+=pth(pathOf(xs.map(v=>[F.lx(v),F.ly(LD(v))])),'var(--c2)',{sw:2.2,da:'6 4'});
    s+=ln2(F.lx(1e-8),F.ly(Y[0]),F.lx(1e0),F.ly(Y[0]),'var(--good)',{sw:5,op:.6})+tx(F.lx(1e-4),F.ly(Y[0])-6,'range studied',{fs:11,a:'middle',c:'var(--good)'});
    const ok=a>aD*ex&&Cx>X[0]&&Cx<X[1];if(ok)s+=dot(F.lx(Cx),F.ly(LC(Cx)),6,'var(--ink)',{f:'var(--bg)'});
    const lg=legend([['L(C min), Eq. 1.3','var(--c1)'],['data-limited L(D(C min))','var(--c2)','6 4']],50,22,w-60);s+=lg.s;
    $('crSvg').innerHTML=svgW(w,H,s,'Compute trend against the data-limited bound');
    $('crO').innerHTML=a<=aD*ex?'With these exponents the data-limited bound falls at least as fast as <i>L</i>(<i>C</i><sub>min</sub>), so the lines never cross.':
      'Crossing at <b>'+sciT(Cx,1)+' PF-days</b>, loss <b>'+LC(Cx).toFixed(2)+'</b> nats, with <i>N</i> = '+sciT(K.Ne*Math.pow(Cx,K.pN),1)+' parameters and <i>D</i> = '+sciT(pref*Math.pow(Cx,ex),1)+' tokens. The paper: about 10'+sup(4)+' PF-days, 10'+sup(12)+' parameters and tokens, 1.7 nats.'}
  ['crA','crD'].forEach(i=>$(i).addEventListener('input',()=>refit($('crSvg'))));segBind('crP',v=>{pm=v;refit($('crSvg'))});
  onTab('t-read',()=>fit($('crSvg'),draw))})();
