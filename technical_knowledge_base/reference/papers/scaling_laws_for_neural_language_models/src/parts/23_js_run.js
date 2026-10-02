// ---- Refit the laws: the toy sweep (window.RUNS from mk_results.py) ----
(function(){const R=window.RUNS,ln=Math.log,ex=Math.exp;
  const K=R.runs.filter(r=>r.n.startsWith('K_')).sort((a,b)=>a.N-b.N);
  const col=i=>'hsl('+(215-i*190/(K.length-1)).toFixed(0)+',62%,50%)';
  const ptok=(r,m)=>m==='kap'?6*r.N:m==='head'?6*(r.N+r.d*R.V):6*(r.N+r.d*R.V)+6*r.nl*R.CTX*r.d;
  const Nlab=v=>v>=1e6?(v/1e6).toFixed(v>=1e7?0:2)+'M':v>=1e3?(v/1e3).toFixed(v>=1e4?0:1)+'k':String(v);
  const lin=(xs,ys)=>{const n=xs.length,mx=xs.reduce((a,b)=>a+b,0)/n,my=ys.reduce((a,b)=>a+b,0)/n;let sxx=0,sxy=0;xs.forEach((x,i)=>{sxx+=(x-mx)**2;sxy+=(x-mx)*(ys[i]-my)});const b=sxy/sxx;return {b,a:my-b*mx}};
  const ip=(pts,x)=>{if(x<pts[0][0]-1e-9||x>pts[pts.length-1][0]+1e-9)return null;for(let i=1;i<pts.length;i++)if(x<=pts[i][0]){const [x0,y0]=pts[i-1],[x1,y1]=pts[i];return x1>x0?y0+(y1-y0)*(x-x0)/(x1-x0):y0}return pts[pts.length-1][1]};
  $('rnN').textContent=R.runs.length;$('rnCPU').textContent=Math.round(R.cpu/60)+' minutes';
  // 1. L(N)
  let fF='pure',fN='ne';
  function fitLN(pts){if(fF==='pure'){const f=lin(pts.map(p=>ln(p[0])),pts.map(p=>ln(p[1])));const al=-f.b,Nc=ex(f.a/al);return {al,Nc,E:0,f:N=>Math.pow(Nc/N,al)}}
    let best=null;const Lmin=Math.min(...pts.map(p=>p[1]));for(let i=0;i<400;i++){const E=Lmin*0.995*i/399;const f=lin(pts.map(p=>ln(p[0])),pts.map(p=>ln(p[1]-E)));const al=-f.b,A=ex(f.a);
      const sse=pts.reduce((s,p)=>s+(ln(p[1])-ln(E+A*Math.pow(p[0],-al)))**2,0);if(!best||sse<best.sse)best={sse,E,al,A}}
    const Nc=Math.pow(best.A,1/best.al);return {al:best.al,Nc,E:best.E,f:N=>best.E+Math.pow(Nc/N,best.al)}}
  function drawFn(w){const lo=+$('fnLo').value,hi=+$('fnHi').value;$('fnLov').textContent=lo;$('fnHiv').textContent=hi;
    const all=K.map((r,i)=>[fN==='ne'?r.N:r.tot,r.L[r.L.length-1],i,r]),use=all.slice(lo,all.length-hi);
    const H1=Math.min(300,Math.max(230,w*.5)),H2=90,H=H1+H2;const X=[fN==='ne'?800:5e3,fN==='ne'?5e7:6e7],Y=[1.1,2.8];
    const F=logFrame({W:w,H:H1,pl:44,pr:14,pt:12,pb:40,x:X,y:Y,xt:decTicks(X[0],X[1],1),yt:linTicks([1.2,1.4,1.6,1.8,2,2.4,2.8]),xl:fN==='ne'?'non-embedding parameters N':'all parameters (embeddings and output layer included)',yl:'test loss (nats/char)'});
    let s=F.s;let ok=use.length>=3;let fit=null;
    if(ok){fit=fitLN(use.map(p=>[p[0],p[1]]));const big=all[all.length-1][0];
      s+=pth(pathOf(geo(X[0],big,60).map(v=>[F.lx(v),F.ly(fit.f(v))])),'var(--ink)',{sw:1.6,op:.8});
      s+=pth(pathOf(geo(big,10*big,30).map(v=>[F.lx(v),F.ly(fit.f(v))])),'var(--ink)',{sw:1.6,da:'5 4',op:.8});
      if(fit.E>0)s+=ln2(F.lx(X[0]),F.ly(Math.max(Y[0],fit.E)),F.lx(X[1]),F.ly(Math.max(Y[0],fit.E)),'var(--mute)',{da:'2 4'})+tx(F.lx(X[1])-4,F.ly(Math.max(Y[0],fit.E))-5,'E = '+fit.E.toFixed(2),{fs:11,a:'end',c:'var(--mute)'})}
    all.forEach((p,j)=>{const used=j>=lo&&j<all.length-hi;s+=dot(F.lx(p[0]),F.ly(p[1]),5,col(p[2]),{f:used?col(p[2]):'var(--bg)'})});
    // residual strip
    const y0=H1+8,yh=H2-26,rs=fit?all.map(p=>100*(ln(p[1])-ln(fit.f(p[0])))):[];const rmax=Math.max(1,...rs.map(Math.abs));
    s+=ln2(F.lx(X[0]),y0+yh/2,F.lx(X[1]),y0+yh/2,'var(--line)')+tx(F.lx(X[0])-6,y0+yh/2+4,'0%',{fs:11,a:'end',c:'var(--mute)'})+tx(F.lx(X[0])-6,y0+8,'+'+rmax.toFixed(1)+'%',{fs:11,a:'end',c:'var(--mute)'});
    rs.forEach((r,j)=>{const x=F.lx(all[j][0]),y=y0+yh/2-r/rmax*yh/2;s+=ln2(x,y0+yh/2,x,y,col(all[j][2]),{sw:2})+dot(x,y,3,col(all[j][2]))});
    s+=tx(F.lx(X[0]),H-4,'residuals',{fs:11,c:'var(--mute)'});
    $('fnSvg').innerHTML=svgW(w,H,s,'Final loss against model size with a fitted power law');
    if(!ok){$('fnO').innerHTML='<p>Keep at least three models in the fit.</p>';return}
    const rms=Math.sqrt(rs.slice(lo,all.length-hi).reduce((a,b)=>a+b*b,0)/use.length),big=all[all.length-1][0];
    $('fnO').innerHTML=stat('Exponent α<sub>N</sub>',fit.al.toFixed(3),'the paper: 0.076 (BPE, WebText2)')+stat(fit.E>0?'Irreducible E':'Doubling N',fit.E>0?fit.E.toFixed(3)+' nats':'loss × '+Math.pow(2,-fit.al).toFixed(3),fit.E>0?'loss the fit says no size can beat':'the paper: × 0.95')+
      stat('Fit error (RMS)',rms.toFixed(2)+'%','of loss, on the points fitted')+stat('Extrapolated to 10× the largest',fit.f(10*big).toFixed(3)+' nats','N = '+Nlab(10*big)+': a prediction no run checks')}
  segBind('fnF',v=>{fF=v;refit($('fnSvg'))});segBind('fnN',v=>{fN=v;refit($('fnSvg'))});['fnLo','fnHi'].forEach(i=>$(i).addEventListener('input',()=>refit($('fnSvg'))));
  // 2. learning curves and envelope
  let lcm='kap';
  function drawLc(w){const H=Math.min(340,Math.max(250,w*.58)),cur=K.map(r=>{const p=ptok(r,lcm);return r.t.map((t,j)=>[t*p,r.L[j]]).filter((q,j)=>r.t[j]>r.warm*2048)});
    const X=[3e9,2e14],Y=[1.1,3.5];
    const F=logFrame({W:w,H,pl:44,pr:14,pt:12,pb:40,x:X,y:Y,xt:decTicks(X[0],X[1],1),yt:linTicks([1.2,1.5,2,2.5,3,3.5]),xl:'training compute (FLOPs)',yl:'test loss (nats/char)'});
    let s=F.s;cur.forEach((c,i)=>{s+=pth(pathOf(c.map(q=>[F.lx(q[0]),F.ly(q[1])])),col(i),{sw:1.6,op:.85});const e=c[c.length-1];s+=tx(F.lx(e[0])+3,F.ly(e[1])+4,Nlab(K[i].N),{fs:11,c:col(i)})});
    const L=cur.map(c=>c.map(q=>[ln(q[0]),ln(q[1])])),lo=Math.min(...L.map(c=>c[0][0])),hi=Math.max(...L.map(c=>c[c.length-1][0]));
    const env=[];for(let i=0;i<=120;i++){const g=lo+(hi-lo)*i/120;let m=null;L.forEach(c=>{const v=ip(c,g);if(v!=null&&(m==null||v<m))m=v});if(m!=null)env.push([g,m])}
    s+=pth(pathOf(env.map(q=>[F.lx(ex(q[0])),F.ly(ex(q[1]))])),'var(--ink)',{sw:3.2,op:.55});
    const tail=env.filter(q=>q[0]>lo+(hi-lo)*.25),f=lin(tail.map(q=>q[0]),tail.map(q=>q[1])),aC=-f.b;
    s+=pth(pathOf(geo(ex(tail[0][0]),X[1],40).map(v=>[F.lx(v),F.ly(ex(f.a+f.b*ln(v)))])),'var(--c2)',{sw:1.6,da:'5 4'});
    $('lcSvg').innerHTML=svgW(w,H,s,'Learning curves against compute');
    $('lcO').innerHTML='Frontier fit over its upper three quarters: <i>L</i> ∝ <i>C</i><sup>−'+aC.toFixed(3)+'</sup> (the paper: 0.057 at fixed batch, 0.050 for <i>C</i><sub>min</sub>). Every size is on the frontier only for a stretch: bigger models start worse, then pass the smaller ones once the compute is there, the pattern of the paper\'s Figure 1 and Figure 2. '+(lcm==='kap'?'Counting only 6<i>N</i> leaves out most of the smallest model\'s cost: with its output layer and attention, it does '+(100*((6*(K[0].N+K[0].d*R.V)+6*K[0].nl*R.CTX*K[0].d)/(6*K[0].N)-1)).toFixed(0)+'% more FLOPs per token than 6<i>N</i> says.':'With the uncounted cost included the small models\' curves shift right, by '+(100*(ptok(K[0],lcm)/(6*K[0].N)-1)).toFixed(0)+'% for the smallest and '+(100*(ptok(K[K.length-1],lcm)/(6*K[K.length-1].N)-1)).toFixed(0)+'% for the largest.')}
  segBind('lcC',v=>{lcm=v;refit($('lcSvg'))});
  // 3. checkpoint against finished run
  let sm='4';
  const schRows=f=>K.map((r,i)=>{const m=R.runs.find(x=>x.n==='M'+f+'_'+r.nl+'_'+r.d);if(!m)return null;const pts=r.t.map((t,j)=>[ln(t),ln(r.L[j])]);return {i,r,ck:ex(ip(pts,ln(m.budget))),end:m.L[m.L.length-1]}}).filter(Boolean);
  function drawSch(w){const rows=schRows(sm);
    const H=34+rows.length*30,pl=Math.min(110,w*.24),x0=pl,x1=w-56,mn=Math.min(...rows.map(q=>Math.min(q.end,q.ck)))-.1,mx=Math.max(...rows.map(q=>Math.max(q.ck,q.end)))+.02,X=v=>x0+(x1-x0)*(v-mn)/(mx-mn);
    let s=tx(4,14,'test loss; bars start at '+mn.toFixed(2),{fs:11,c:'var(--mute)'});
    rows.forEach((q,j)=>{const y=26+j*30;s+=tx(pl-8,y+16,Nlab(q.r.N),{fs:11,a:'end'});s+=rc(x0,y+2,X(q.ck)-x0,11,'var(--c2)',{op:.85})+rc(x0,y+15,X(q.end)-x0,11,'var(--c1)',{op:.85});
      s+=tx(X(q.ck)+4,y+12,q.ck.toFixed(3),{fs:11})+tx(X(q.end)+4,y+25,q.end.toFixed(3),{fs:11})});
    $('schSvg').innerHTML=svgW(w,H,s,'Checkpoint against finished run');
    const d=rows.map(q=>q.end-q.ck),xp=R.runs.filter(x=>x.n.startsWith('X3_M4_'));
    let h='<span style="color:var(--c2)">■</span> checkpoint of the long run at '+(sm==='4'?'1/4':'1/16')+' of its tokens &nbsp; <span style="color:var(--c1)">■</span> a run whose schedule ends there.<br>'+
      (Math.min(...d)>0?'The opposite of Chinchilla\'s result: for every size the finished short run is <b>worse</b>, by '+Math.min(...d).toFixed(3)+' to '+Math.max(...d).toFixed(3)+' nats. ':'Mixed: the finished run is better for '+d.filter(x=>x<0).length+' of '+d.length+' sizes. ');
    if(xp.length){h+='The likely reason is the learning rate: the paper\'s rule LR(<i>N</i>) was set for long runs, and the paper itself says short runs might take a larger rate but it never tried (Appendix C). Two probe runs at 3× the rule, 1/4 budget: '+xp.map(x=>{const r=K.find(k=>k.nl===x.nl&&k.d===x.d),q=schRows('4').find(z=>z.r===r);return Nlab(x.N)+' '+x.L[x.L.length-1].toFixed(3)+' (against '+q.end.toFixed(3)+' at the rule\'s rate and '+q.ck.toFixed(3)+' for the checkpoint)'}).join('; ')+'. '}
    h+='So at this scale the schedule question cannot be separated from learning-rate tuning, which is Porian et al.\'s finding: tuning per size, not matching the decay, is what moved the exponent.';
    $('schO').innerHTML=h}
  segBind('schM',v=>{sm=v;refit($('schSvg'))});
  // 4. bigger and stopped early, or smaller and trained on everything
  function drawAl(w){const O=R.ov,H=34+O.length*44,pl=Math.min(150,w*.3),x0=pl,x1=w-56,all=O.flatMap(o=>[o.L0,o.L1ck,o.L1m].filter(v=>v!=null)),mn=Math.min(...all)-.1,mx=Math.max(...all)+.02,X=v=>x0+(x1-x0)*(v-mn)/(mx-mn);
    let s=tx(4,14,'loss at equal compute; bars start at '+mn.toFixed(2),{fs:11,c:'var(--mute)'});
    O.forEach((o,j)=>{const y=24+j*44;s+=tx(pl-8,y+12,Nlab(o.N0)+' vs '+Nlab(o.N1),{fs:11,a:'end'})+tx(pl-8,y+27,sciT(o.C,1)+' FLOPs',{fs:11,a:'end',c:'var(--mute)'});
      [[o.L0,'var(--c3)'],[o.L1ck,'var(--c2)'],[o.L1m,'var(--c1)']].forEach(([v,c],k)=>{if(v==null)return;s+=rc(x0,y+k*13,X(v)-x0,10,c,{op:.85})+tx(X(v)+4,y+k*13+9,v.toFixed(3),{fs:11})})});
    $('alSvg').innerHTML=svgW(w,H,s,'Smaller model trained fully against bigger model stopped early');
    const wins=O.filter(o=>o.L1ck<o.L0||(o.L1m!=null&&o.L1m<o.L0));
    $('alO').innerHTML='<span style="color:var(--c3)">■</span> smaller size, full run &nbsp; <span style="color:var(--c2)">■</span> bigger size, long-run checkpoint &nbsp; <span style="color:var(--c1)">■</span> bigger size, matched runs.<br>'+
      (wins.length<=1?(wins.length?'Except for the smallest pair, the':'At every pair the')+' smaller model trained on all 8.4M tokens wins at equal compute, down to '+Math.round(O[O.length-1].tpp0)+' tokens per parameter for the '+Nlab(O[O.length-1].N0)+' model. In this sweep, "bigger and stopped early" never pays off, so the compute-optimal size sits at or below the sizes whose runs end at each compute, and finding it would take longer runs on more data than this CPU budget allows. (The matched bars carry section 3\'s learning-rate handicap; the checkpoint bars do not, and they tell the same story.) <b>No allocation exponent is fitted</b>: the toy cannot locate the optimum, and fitting one anyway would be the kind of claim this page checks the paper for.':
      'The bigger model wins in '+wins.length+' of '+O.length+' pairs.')}
  // 5. seeds, verdict, table
  (function(){if(!R.seed.length){$('sdO').innerHTML='Second-seed runs are not finished.';return}
    const nd=K.slice(1).map((r,i)=>K[i].L[K[i].L.length-1]-r.L[r.L.length-1]),sm=Math.max(...R.seed.map(z=>Math.abs(z.diff)));
    $('sdO').innerHTML='Three sizes were trained again with a different initialisation and data order. Final test losses, first seed and second: '+R.seed.map(z=>Nlab(z.N)+' '+z.s1.toFixed(3)+' and '+z.s2.toFixed(3)+' ('+(z.diff>=0?'+':'')+z.diff.toFixed(3)+')').join('; ')+
      '. The paper puts run-to-run variation at about 0.02 nats (§4.2) or 0.05 (Figure 22). Neighbouring sizes here differ by '+Math.min(...nd).toFixed(3)+' to '+Math.max(...nd).toFixed(3)+' nats, against seed differences of up to '+sm.toFixed(3)+': '+(Math.min(...nd)>2*sm?'well above the noise.':'the gaps between the largest sizes are no bigger than one seed\'s noise, so the top of the fitted line rests on single runs that could move by that much.')})();
  let h='<thead><tr><th>Run</th><th>Shape</th><th>N (Eq. 2.1)</th><th>All params</th><th>Tokens</th><th>Seed</th><th>LR</th><th>Final test loss</th><th>CPU s</th></tr></thead><tbody>';
  R.runs.forEach(r=>{h+='<tr><td>'+r.n+'</td><td>('+r.nl+', '+r.d+')</td><td>'+fmt(r.N)+'</td><td>'+fmt(r.tot)+'</td><td>'+sci(r.budget,2)+'</td><td>'+r.seed+'</td><td>'+r.lr.toFixed(5)+'</td><td>'+r.L[r.L.length-1].toFixed(4)+'</td><td>'+fmt(r.sec,0)+'</td></tr>'});
  $('rnT').innerHTML=h+'</tbody>';
  onTab('t-run',()=>{fit($('fnSvg'),drawFn);fit($('lcSvg'),drawLc);fit($('schSvg'),drawSch);fit($('alSvg'),drawAl)});
})();
