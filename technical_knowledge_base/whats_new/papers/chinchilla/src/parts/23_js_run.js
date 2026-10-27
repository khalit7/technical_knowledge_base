// ---- Refit Approach 3: the 245 extracted points, the in-browser fit, Figure 4 rebuilt, residuals, the frontier and a bootstrap ----
(function(){const P=PAPER.pts,PF=PAPER.fit.fits,JF=PAPER.jsfit||{};
  const st={obj:'sum',you:null,meta:null,boot:null,busy:false};
  const sel=()=>({pts:$('fitPts').value,delta:+$('fitDelta').value,grid:$('fitGrid').value,mean:st.obj==='mean'});
  const isOut=p=>p[2]>=OUT5;
  function split(o){if(o.pts==='all')return {fit:P,held:[]};if(o.pts==='drop5')return {fit:P.filter(p=>!isOut(p)),held:[]};
    return {fit:P.filter(p=>p[1]<=1.0001e20&&!isOut(p)),held:P.filter(p=>p[1]>1.0001e20&&!isOut(p))}}
  const resid=(f,pts)=>pts.map(p=>lossOf(f,p[0],p[1]/6/p[0])/p[2]-1);
  const rms=r=>r.length?Math.sqrt(r.reduce((a,v)=>a+v*v,0)/r.length):NaN;
  const mean=r=>r.reduce((a,v)=>a+v,0)/r.length;
  const pc=v=>(v*100).toFixed(2)+'%';
  function runFit(){if(st.busy)return;st.busy=true;const o=sel(),S=split(o),X=FIT.prep(S.fit),starts=FIT.grid(o.grid==='full'),t0=Date.now();
    $('fitGo').disabled=true;
    FIT.fitStarts(X,starts,{delta:o.delta,mean:o.mean},(fr,b)=>{$('fitProg').textContent='fitting: '+Math.round(fr*100)+'% of '+fmt(starts.length)+' starts'},best=>{
      st.busy=false;$('fitGo').disabled=false;st.you=Object.assign(FIT.named(best.x),{nm:'your fit'});st.meta={o,S,best,ms:Date.now()-t0,n:starts.length};st.boot=null;
      $('fitProg').textContent='done in '+((Date.now()-t0)/1000).toFixed(1)+' s; best start stopped after '+best.it+' iterations ('+best.why+')';render()})}
  function row(nm,f,S,cls){const fr=FIT.frontier(f,CG),r=resid(f,S.fit),h=resid(f,S.held);
    return '<tr'+(cls?' class="'+cls+'"':'')+'><td>'+nm+'</td><td>'+f.E.toFixed(3)+'</td><td>'+f.A.toFixed(0)+'</td><td>'+(f.B<1e4?f.B.toFixed(0):sciT(f.B,2))+'</td><td>'+f.alpha.toFixed(3)+'</td><td>'+f.beta.toFixed(3)+'</td><td><b>'+(f.beta/(f.alpha+f.beta)).toFixed(3)+'</b></td><td>'+hum(fr.N)+'</td><td>'+fr.tpp.toFixed(0)+'</td><td>'+pc(mean(r))+'</td><td>'+pc(rms(r))+'</td>'+(S.held.length?'<td>'+pc(rms(h))+'</td>':'')+'</tr>'}
  function render(){if(!st.you)return;const {o,S}=st.meta,ref=o.pts==='drop5'&&o.delta===1e-3&&o.grid==='full'?(o.mean?PF.mean:PF.sum):(o.pts==='all'&&o.delta===1e-3&&!o.mean&&o.grid==='full'?PF.all:null);
    const head='<thead><tr><th>Fit</th><th>E</th><th>A</th><th>B</th><th>α</th><th>β</th><th>a = β/(α+β)</th><th>N<sub>opt</sub> at Gopher\'s budget</th><th>tokens per parameter there</th><th>mean residual</th><th>RMS residual</th>'+(S.held.length?'<th>RMS on held-out</th>':'')+'</tr></thead>';
    let b=row('this paper, rounded (Eq. 10)',FITS.hoff,S)+row('this paper, unrounded (TeX source)',FITS.hoffU,S)+row('Besiroglu et al. (their Eq. 3)',FITS.epoch,S);
    if(ref)b+=row('SciPy, same settings (fit.py)',ref,S);
    b+=row('<b>your fit</b>',st.you,S,'hl');
    $('fitT').innerHTML=head+'<tbody>'+b+'</tbody>';
    $('fitNote').innerHTML='Fitted on <b>'+S.fit.length+'</b> points'+(S.held.length?', '+S.held.length+' held out (C > 10²⁰)':'')+'; '+(o.mean?'<b>averaged</b>':'summed')+' Huber loss, δ = '+o.delta+', '+fmt(st.meta.n)+' L-BFGS starts with SciPy\'s default stopping rules. Residuals are predicted over observed loss minus 1, on the fitted points'+(S.held.length?' (and on the held-out ones)':'')+'.'+(ref?' SciPy\'s result for the same settings is shown for comparison.':'');
    drawF4();drawRes();drawTpp()}
  segBind('objM',m=>{st.obj=m;$('objM').querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x.dataset.m===m?'true':'false'))});
  $('fitGo').addEventListener('click',runFit);
  // Figure 4 (left): points in (C, N), coloured by loss, with the chosen fit's contours and frontier
  const lc=(L)=>{const t=Math.max(0,Math.min(1,(Math.log(L)-Math.log(2))/(Math.log(5)-Math.log(2))));return 'hsl('+(250-t*215)+','+(55+t*20)+'%,'+(38+t*20)+'%)'};
  function pick(k){return k==='you'?(st.you||FITS.epoch):FITS[k]}
  function drawF4(){const el=$('f4Svg'),w=el.clientWidth;if(!w)return;const f=pick($('f4Fit').value),H=Math.min(380,Math.max(280,w*.62)),X=[6e17,1e25],Y=[3e7,4e11];
    const F=logFrame({W:w,H,pl:44,pr:12,pt:12,pb:40,x:X,y:Y,xt:decTicks(X[0],X[1],w<500?2:1),yt:decTicks(Y[0],Y[1],1).map(t=>[t[0],hum(t[0])]),xl:'training FLOPs C',yl:'parameters N'});
    let s=F.s;const clip=(pts)=>pts.filter(p=>p[0]>=44&&p[0]<=w-12&&p[1]>=12&&p[1]<=H-40);
    [2.0,2.2,2.4,2.6,2.8,3.0,3.4,4.0].forEach(l=>{const pts=[];geo(Y[0],Y[1],90).forEach(N=>{const r=l-f.E-f.A/Math.pow(N,f.alpha);if(r>0){const D=Math.pow(f.B/r,1/f.beta);pts.push([F.lx(6*N*D),F.ly(N)])}});
      const q=clip(pts);if(q.length>1){s+=pth(pathOf(q),'var(--dim)',{sw:1.2});const e=q[Math.floor(q.length*.15)];s+=tx(e[0]+3,e[1]-3,l.toFixed(1),{fs:11,c:'var(--mute)'})}});
    const fr=(g,c,da)=>pth(pathOf(clip(geo(X[0],X[1],40).map(C=>[F.lx(C),F.ly(FIT.frontier(g,C).N)]))),c,{sw:2.2,da});
    s+=fr(FITS.hoff,'var(--c2)','6 4')+fr(f,'var(--c1)');
    P.forEach(p=>{s+=dot(F.lx(p[1]),F.ly(p[0]),isOut(p)?3.6:2.8,isOut(p)?'var(--ink)':lc(p[2]),{f:lc(p[2]),sw:isOut(p)?1.6:.4,t:hum(p[0])+' parameters, '+sciT(p[1],2)+' FLOPs, loss '+p[2].toFixed(3)})});
    s+=dot(F.lx(CG),F.ly(280e9),5,'var(--c2)',{f:'var(--c2)'})+dot(F.lx(CG),F.ly(70e9),5,'var(--c3)',{f:'var(--c3)'});
    const lb=placeLabels([{x:F.lx(CG),y:F.ly(280e9),t:'Gopher',fs:11},{x:F.lx(CG),y:F.ly(70e9),t:'Chinchilla',fs:11}],w,H);lb.forEach(p=>{s+=tx(p.lx,p.ly,p.t,{fs:11,a:p.la,c:'var(--mute)'})});
    // colour scale
    const cx=w-120,cy=H-62;for(let i=0;i<20;i++){const L=2*Math.pow(2.5,i/19);s+=rc(cx+i*5,cy,5,8,lc(L),{r:0})}s+=tx(cx,cy-3,'loss 2',{fs:11,c:'var(--mute)'})+tx(cx+100,cy-3,'5',{fs:11,a:'end',c:'var(--mute)'});
    const lg=legend([[(f===st.you?'your':'chosen')+' frontier','var(--c1)'],['paper\'s frontier','var(--c2)','6 4']],50,24,w-180);s+=lg.s;
    el.innerHTML=svgW(w,H,s,'Extracted runs with the fitted loss contours and frontier')}
  $('f4Fit').addEventListener('change',drawF4);
  function drawRes(){const el=$('resSvg'),w=el.clientWidth;if(!w||!st.you)return;const g=FITS[$('resA').value],S=st.meta.S,pts=S.fit.concat(S.held),H=Math.min(260,Math.max(200,w*.42)),X=[6e17,5e21];
    const ra=resid(g,pts),ry=resid(st.you,pts),m=Math.max(0.06,Math.min(0.2,Math.max(...ra.concat(ry).map(Math.abs))*1.05));
    const pl=46,pr=12,pt=12,pb=40,lx=v=>pl+(w-pl-pr)*(lg10(v)-lg10(X[0]))/(lg10(X[1])-lg10(X[0])),ly=v=>pt+(H-pt-pb)*(m-v)/(2*m);
    let s='';const tk=m>.1?[-.1,-.05,0,.05,.1]:[-.04,-.02,0,.02,.04];tk.filter(v=>Math.abs(v)<=m).forEach(v=>{s+=ln2(pl,ly(v),w-pr,ly(v),v===0?'var(--mute)':'var(--line)')+tx(pl-6,ly(v)+4,(v>0?'+':'')+(v*100).toFixed(0)+'%',{fs:11,a:'end',c:'var(--mute)'})});
    decTicks(X[0],X[1],1).forEach(([v,l])=>{s+=tx(lx(v),H-pb+16,l,{fs:11,a:'middle',c:'var(--mute)'})});s+=tx((pl+w-pr)/2,H-4,'training FLOPs C',{fs:11,a:'middle',c:'var(--mute)'});
    const cy=v=>Math.max(pt,Math.min(H-pb,ly(v)));
    pts.forEach((p,i)=>{const held=i>=S.fit.length;s+=dot(lx(p[1])-1.5,cy(ra[i]),2.4,'var(--c2)',{f:held?'var(--bg)':'var(--c2)',sw:.8,op:.75})+dot(lx(p[1])+1.5,cy(ry[i]),2.4,'var(--c1)',{f:held?'var(--bg)':'var(--c1)',sw:.8,op:.75})});
    const lg=legend([[g.nm,'var(--c2)'],['your fit','var(--c1)']],pl+6,pt+12,w-pl-pr);s+=lg.s;
    el.innerHTML=svgW(w,H,s,'Residuals of two fits against compute');
    const fa=S.fit.length,ma=mean(ra.slice(0,fa)),my=mean(ry.slice(0,fa)),better=ry.slice(0,fa).filter((v,i)=>Math.abs(v)<Math.abs(ra[i])).length;
    $('resO').innerHTML=g.nm+': mean residual <b>'+pc(ma)+'</b>, RMS '+pc(rms(ra.slice(0,fa)))+'. Your fit: mean <b>'+pc(my)+'</b>, RMS '+pc(rms(ry.slice(0,fa)))+'. Your fit is closer on '+better+' of '+fa+' fitted points.'+(S.held.length?' Open circles are held out: RMS '+pc(rms(ra.slice(fa)))+' against '+pc(rms(ry.slice(fa)))+'.':'')}
  $('resA').addEventListener('change',drawRes);
  function drawTpp(){const el=$('tppSvg'),w=el.clientWidth;if(!w||!st.you)return;const H=Math.min(280,Math.max(220,w*.46)),X=[1e18,1e26],Y=[2,400];
    const F=logFrame({W:w,H,pl:44,pr:12,pt:12,pb:40,x:X,y:Y,xt:decTicks(X[0],X[1],2),yt:[[2,'2'],[5,'5'],[10,'10'],[20,'20'],[50,'50'],[100,'100'],[200,'200']],xl:'training FLOPs C',yl:'tokens per parameter'});
    let s=F.s;s+=ln2(F.lx(3e21),12,F.lx(3e21),H-40,'var(--dim)',{da:'3 3'})+tx(F.lx(3e21)+4,24,'largest fitted run',{fs:11,c:'var(--mute)'});
    if(st.boot){const B=st.boot,pts=geo(X[0],X[1],30),lo=[],hi=[];pts.forEach(C=>{const v=B.map(f=>FIT.frontier(f,C).tpp).sort((a,b)=>a-b);lo.push([F.lx(C),F.ly(Math.max(Y[0],v[Math.floor(.1*v.length)]))]);hi.push([F.lx(C),F.ly(Math.min(Y[1],v[Math.ceil(.9*v.length)-1]))])});
      s+='<path d="'+pathOf(lo.concat(hi.reverse()))+'z" fill="var(--c1)" opacity=".15"/>'}
    const ln=(f,c,da,sw)=>pth(pathOf(geo(X[0],X[1],40).map(C=>[F.lx(C),F.ly(Math.max(Y[0],Math.min(Y[1],FIT.frontier(f,C).tpp)))])),c,{sw:sw||2,da});
    s+=ln(FITS.hoff,'var(--c2)','6 4')+ln(FITS.hoffU,'var(--c5)','2 3')+ln(FITS.epoch,'var(--c3)','4 2')+ln(st.you,'var(--c1)',null,2.6);
    s+=ln2(F.lx(X[0]),F.ly(20),F.lx(X[1]),F.ly(20),'var(--mute)',{da:'1 3'})+dot(F.lx(CG),F.ly(20),5,'var(--ink)',{f:'var(--ink)'})+tx(F.lx(CG)+7,F.ly(20)+15,'Chinchilla, 20',{fs:11,c:'var(--mute)'});
    const lg=legend([['your fit','var(--c1)'],['paper, rounded','var(--c2)','6 4'],['paper, unrounded','var(--c5)','2 3'],['Besiroglu et al.','var(--c3)','4 2']],50,H-52,w-60);s+=lg.s;
    el.innerHTML=svgW(w,H,s,'Tokens per parameter on each fit\'s frontier');
    let t='At Gopher\'s budget your fit says <b>'+FIT.frontier(st.you,CG).tpp.toFixed(0)+' tokens per parameter</b> (Besiroglu et al. '+FIT.frontier(FITS.epoch,CG).tpp.toFixed(0)+'; the paper\'s rounded constants '+FIT.frontier(FITS.hoff,CG).tpp.toFixed(0)+', unrounded '+FIT.frontier(FITS.hoffU,CG).tpp.toFixed(0)+'; Chinchilla used 20). The ratio drifts with compute unless <i>a</i> is exactly 0.5.';
    if(st.boot){const A=st.boot.map(f=>f.beta/(f.alpha+f.beta)).sort((a,b)=>a-b),q=v=>A[Math.min(A.length-1,Math.max(0,Math.round(v*(A.length-1))))],sd=Math.sqrt(A.reduce((s,v)=>s+(v-mean(A))**2,0)/(A.length-1));
      t+=' Bootstrap ('+A.length+' resamples): <b>a</b> 10th to 90th percentile <b>'+q(.1).toFixed(3)+' to '+q(.9).toFixed(3)+'</b>, standard error '+sd.toFixed(3)+' (fit.py, 200 resamples: '+PAPER.fit.bootstrap.a_exp.se.toFixed(3)+'; Besiroglu et al., 4,000: 0.018). The paper\'s interval is 0.454 to 0.455, '+((q(.9)-q(.1))/0.001).toFixed(0)+'× narrower than yours.'}
    $('tppO').innerHTML=t}
  $('bootGo').addEventListener('click',()=>{if(!st.you||st.busy)return;st.busy=true;$('bootGo').disabled=true;const {o,S}=st.meta,rng=mulberry32(42),p0=[Math.log(st.you.A),Math.log(st.you.B),Math.log(st.you.E),st.you.alpha,st.you.beta],out=[];let i=0;
    function step(){const t0=Date.now();while(i<40&&Date.now()-t0<40){const s=S.fit.map(()=>S.fit[Math.floor(rng()*S.fit.length)]),X=FIT.prep(s),r=FIT.lbfgs(p=>FIT.objGrad(p,X,o.delta,o.mean),p0);out.push(FIT.named(r.x));i++}
      $('bootProg').textContent=i+' of 40';if(i<40)setTimeout(step,0);else{st.boot=out;st.busy=false;$('bootGo').disabled=false;$('bootProg').textContent='done';drawTpp()}}
    step()});
  ['f4Svg','resSvg','tppSvg'].forEach(id=>fit($(id),()=>{if(id==='f4Svg')drawF4();else if(id==='resSvg')drawRes();else drawTpp()}));
  // what reproduces, from fit.py and check_fit.mjs
  const s=PF.sum,m=PF.mean,a=PF.all;
  $('runRep').innerHTML='Summed Huber on 240 points: SciPy (<code>fit.py</code>, the paper\'s 4,500-start grid) gets <i>E</i> '+s.E.toFixed(4)+', <i>A</i> '+s.A.toFixed(1)+', <i>B</i> '+s.B.toFixed(0)+', α '+s.alpha.toFixed(4)+', β '+s.beta.toFixed(4)+', against Besiroglu et al.\'s 1.8172, 482.01, 2085.43, 0.3478, 0.3658: <i>E</i> and α to three digits, <i>B</i> and β 3% and 0.4% apart, along the ridge where they trade off (independently, from their data). This page\'s JavaScript optimiser matches SciPy to four digits on the same settings'+(JF.sum?' ('+(JF.sum.ms/1000).toFixed(1)+' s in Node for the full grid)':'')+'. With all 245 points: β '+a.beta.toFixed(3)+', <i>B</i> '+fmt(a.B)+', <i>a</i> '+a.a_exp.toFixed(3)+', matching their Table 3 except its printed <i>a</i> of 0.512, which its own α and β contradict (they give 0.567). <b>Averaging instead of summing</b> stops the search early: SciPy lands at <i>a</i> = '+m.a_exp.toFixed(3)+(JF.mean?', this page\'s optimiser at '+JF.mean.a_exp.toFixed(3):'')+', against the paper\'s unrounded 0.4565; the exact stopping point depends on the optimiser, the direction does not. Bootstrap standard error of <i>a</i>: '+PAPER.fit.bootstrap.a_exp.se.toFixed(3)+' (200 resamples) against their 0.018.';
  onTab('t-run',()=>{if(!st.you&&!st.busy)runFit();else render()});
})();
