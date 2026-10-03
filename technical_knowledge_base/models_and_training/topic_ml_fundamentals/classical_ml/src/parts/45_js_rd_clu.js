// ---- Reading 7: four clusterers, step by step, on the same points (card rd-cl) ----
(function(){
  const fa=CD.faithful,mx=[0,1].map(d=>{const v=d?fa.y:fa.x,m=v.reduce((a,b)=>a+b,0)/v.length,s=Math.sqrt(v.reduce((a,b)=>a+(b-m)**2,0)/v.length);return [m,s]});
  const DATA={six:{name:'Six blobs',P:CD.c6.x.map((v,i)=>[v,CD.c6.y[i]]),k:6,eps:0.3,src:CD.c6.src},faithful:{name:'Old Faithful (real)',P:fa.x.map((v,i)=>[(v-mx[0][0])/mx[0][1],(fa.y[i]-mx[1][0])/mx[1][1]]),k:2,eps:0.3,src:fa.src+'; both standardised'},
    moons:{name:'Two moons',P:CD.cmoons.x.map((v,i)=>[v,CD.cmoons.y[i]]),k:2,eps:0.2,src:CD.cmoons.src},
    blobs:{name:'Uneven blobs',P:CD.cblobs.x.map((v,i)=>[v,CD.cblobs.y[i]]),k:3,eps:0.3,src:CD.cblobs.src}};
  let ds='six',mode='km',k=6,seed=2,eps=0.3,run=null;
  const $=id=>document.getElementById(id);
  $('rd-clD').innerHTML=Object.entries(DATA).map(([a,b])=>'<option value="'+a+'">'+b.name+'</option>').join('');
  $('rd-clM').innerHTML=[['km','k-means, random start'],['kmpp','k-means++ start'],['gmm','Gaussian mixture (EM)'],['dbscan','DBSCAN']].map(([a,b])=>'<button data-m="'+a+'"'+(a===mode?' class="on"':'')+'>'+b+'</button>').join('');
  const COL=['--c1','--c2','--c3','--c4','--c5','--c6'];
  function compute(){const D=DATA[ds],P=D.P,r=ML.rng(seed);
    if(mode==='km'||mode==='kmpp'){const C0=mode==='km'?ML.initRandom(P,k,r):ML.initPP(P,k,r);const km=ML.kmeans(P,C0);run={kind:'km',steps:km.hist,final:km}}
    else if(mode==='gmm'){const C0=ML.initPP(P,k,r);const g=ML.gmm(P,ML.gmmInit(P,C0),60);let n=g.hist.length;for(let t=1;t<g.hist.length;t++){if(Math.abs(g.hist[t].ll-g.hist[t-1].ll)<1e-6){n=t+1;break}}run={kind:'gmm',steps:g.hist.slice(0,n)}}
    else{const db=ML.dbscan(P,eps,5),ch=8,steps=[{lab:P.map(()=>-2),core:null},{lab:P.map(()=>-2),core:db.core}];
      for(let c=1;c<=ch;c++){const upto=Math.round(db.order.length*c/ch),lab=P.map(()=>-2);db.order.slice(0,upto).forEach(i=>lab[i]=db.lab[i]);steps.push({lab,core:db.core})}
      steps.push({lab:db.lab,core:db.core,final:true});run={kind:'db',steps,db}}
    restarts()}
  function ellipse(ctx,F,mu,S,s,c){const a=S[0][0],b=S[0][1],d=S[1][1],tr=(a+d)/2,dt=Math.sqrt(Math.max(0,(a-d)*(a-d)/4+b*b)),l1=tr+dt,l2=tr-dt,th=Math.atan2(l1-a,b||1e-12);
    ctx.save();ctx.strokeStyle=c;ctx.lineWidth=1.6;ctx.beginPath();for(let t=0;t<=64;t++){const u=t/64*2*Math.PI,x=s*Math.sqrt(l1)*Math.cos(u),y=s*Math.sqrt(Math.max(l2,0))*Math.sin(u);
      const px=mu[0]+x*Math.cos(th)-y*Math.sin(th),py=mu[1]+x*Math.sin(th)+y*Math.cos(th);t?ctx.lineTo(F.X(px),F.Y(py)):ctx.moveTo(F.X(px),F.Y(py))}ctx.stroke();ctx.restore()}
  function draw(i){if(!run)compute();const D=DATA[ds],P=D.P,el=$('rd-clV'),w=RD.width(el),h=Math.round(Math.min(380,w*0.66)),ctx=PL.cv(el,w,h),F=PL.frame(PL.bounds(P,0.3),w,h,{l:6,r:6,t:6,b:6});
    ctx.strokeStyle=PL.css('--line');ctx.strokeRect(0.5,0.5,w-1,h-1);const grey=PL.css('--dim'),ink=PL.css('--ink');let T='',Pp='',N='';
    if(run.kind==='km'){const s=run.steps[i],lab=i===0?null:s.lab;
      P.forEach((p,j)=>PL.dot(ctx,F.X(p[0]),F.Y(p[1]),2.8,lab?PL.css(COL[lab[j]]):grey));
      if(i>0){const pr=run.steps[i-1].C;ctx.strokeStyle=ink;ctx.setLineDash([3,3]);s.C.forEach((c,j)=>{ctx.beginPath();ctx.moveTo(F.X(pr[j][0]),F.Y(pr[j][1]));ctx.lineTo(F.X(c[0]),F.Y(c[1]));ctx.stroke()});ctx.setLineDash([])}
      s.C.forEach((c,j)=>{ctx.fillStyle=PL.css(COL[j]);ctx.strokeStyle=ink;ctx.lineWidth=2;ctx.beginPath();ctx.rect(F.X(c[0])-6,F.Y(c[1])-6,12,12);ctx.fill();ctx.stroke()});
      const inert=ML.inertia(P,s.C,ML.assign(P,s.C)),last=i===run.steps.length-1;
      T=i===0?(mode==='km'?'Start: k random points as centres':'Start: k-means++ seeding'):last?'Converged after '+(run.steps.length-1)+' updates':'Iteration '+i+': assign, then move';
      Pp=i===0?(mode==='km'?'Lloyd\'s algorithm needs starting centres; here they are '+k+' data points picked uniformly at random. Bad luck here (two centres in one cluster) is never undone, only refined.':'k-means++ picks the first centre at random and each next one with probability proportional to its squared distance from the nearest centre already chosen, so starts tend to be spread out.'):
        last?'No point changed cluster, so the centres stopped moving. This is a local minimum of the within-cluster sum of squares; whether it is the best one depends on the start (see the restarts below).':
        'Each point joins its nearest centre (colour), then each centre moves to the mean of its points (dashed path). Both steps can only lower the within-cluster sum of squares, so the loop always stops.';
      N=RD.stat('update',String(i))+RD.stat('within-cluster sum of squares',inert.toFixed(1),'inertia, lower is tighter')}
    else if(run.kind==='gmm'){const s=run.steps[i],g=s.g;
      P.forEach((p,j)=>{const r=s.R[j];let b=0;r.forEach((v,q)=>{if(v>r[b])b=q});ctx.globalAlpha=0.25+0.75*r[b];PL.dot(ctx,F.X(p[0]),F.Y(p[1]),2.8,PL.css(COL[b]));ctx.globalAlpha=1});
      g.mu.forEach((m,q)=>{ellipse(ctx,F,m,g.S[q],1,PL.css(COL[q]));ellipse(ctx,F,m,g.S[q],2,PL.css(COL[q]));PL.dot(ctx,F.X(m[0]),F.Y(m[1]),4,PL.css(COL[q]),ink,1)});
      const last=i===run.steps.length-1;T=i===0?'Start: k-means++ centres, round Gaussians':last?'Converged after '+i+' EM iterations':'EM iteration '+i;
      Pp=i===0?'Each Gaussian starts at a k-means++ centre with the data\'s overall spread. Faded points are shared: responsibilities are soft.':
        last?'The log-likelihood stopped rising (change below 10<sup>&minus;6</sup> per point). Unlike k-means, each cluster has its own shape (the ellipses are 1 and 2 standard deviations) and its own weight.':
        'E-step: each point\'s responsibility for each Gaussian is its weighted density under it, normalised. M-step: weights, means and covariances are recomputed from those soft memberships. The log-likelihood never decreases.';
      N=RD.stat('iteration',String(i))+RD.stat('log-likelihood per point',s.ll.toFixed(3),'higher is better')+RD.stat('weights',g.w.map(v=>v.toFixed(2)).join(', '))}
    else{const s=run.steps[i],db=run.db;
      P.forEach((p,j)=>{const l=s.lab[j];if(s.final&&l===-1){ctx.strokeStyle=ink;ctx.lineWidth=1.2;const x=F.X(p[0]),y=F.Y(p[1]);ctx.beginPath();ctx.moveTo(x-3,y-3);ctx.lineTo(x+3,y+3);ctx.moveTo(x-3,y+3);ctx.lineTo(x+3,y-3);ctx.stroke();return}
        PL.dot(ctx,F.X(p[0]),F.Y(p[1]),s.core&&s.core[j]?3.4:2.4,l>=0?PL.css(COL[l%6]):grey,s.core&&s.core[j]&&l<0?ink:null,0.8)});
      const nc=db.core.filter(Boolean).length,noise=db.lab.filter(v=>v===-1).length;
      T=i===0?'Start: no centres, no k':i===1?'Core points: at least 5 points within eps':s.final?'Done: '+db.nClusters+' cluster'+(db.nClusters===1?'':'s')+', '+noise+' noise points':'Growing clusters from core points';
      Pp=i===0?'DBSCAN needs a radius eps (here '+eps+') and a minimum count (5, the point itself included).':i===1?nc+' of '+P.length+' points have 5 or more neighbours within eps (larger dots): they are core points.':s.final?'Points reached from no core point are noise (crosses). The shapes can be anything, but one eps has to suit every cluster\'s density.':'Each cluster spreads from a core point to every point within eps, and on from those that are core points themselves. Border points join but do not spread.';
      N=RD.stat('core points',String(nc))+RD.stat('clusters',String(db.nClusters))+RD.stat('noise',String(noise))}
    $('rd-clT').innerHTML=T;$('rd-clP').innerHTML=Pp;$('rd-clN').innerHTML=N;$('rd-clS').textContent=D.src}
  function restarts(){const el=$('rd-clR');if(mode==='dbscan'||mode==='gmm'){el.innerHTML='';return}const P=DATA[ds].P,res={km:[],kmpp:[]};
    for(let s=0;s<100;s++){res.km.push(ML.kmeans(P,ML.initRandom(P,k,ML.rng(1000+s))).inertia);res.kmpp.push(ML.kmeans(P,ML.initPP(P,k,ML.rng(1000+s))).inertia)}
    const best=Math.min(...res.km,...res.kmpp),f=a=>a.filter(v=>v<=best*1.01).length,med=a=>a.slice().sort((x,y)=>x-y)[50];
    el.innerHTML='<b>100 restarts, k = '+k+':</b> random starts end within 1% of the best result found in '+f(res.km)+' of 100 runs (median '+med(res.km).toFixed(1)+', worst '+Math.max(...res.km).toFixed(1)+'); k-means++ starts in '+f(res.kmpp)+' of 100 (median '+med(res.kmpp).toFixed(1)+', worst '+Math.max(...res.kmpp).toFixed(1)+'). Best found: '+best.toFixed(1)+'. This is why libraries run several starts and keep the best (scikit-learn\'s KMeans: n_init).'}
  const A=RD.anim({card:'rd-cl',ctl:'rd-clC',n:2,draw,ms:1100,label:'Step'});
  function restart(play){run=null;compute();A.reset(run.steps.length);if(play)A.play()}
  $('rd-clM').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;mode=b.dataset.m;$('rd-clM').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));$('rd-clKw').hidden=mode==='dbscan';$('rd-clEw').hidden=mode!=='dbscan';restart(true)});
  $('rd-clD').addEventListener('change',e=>{ds=e.target.value;k=DATA[ds].k;eps=DATA[ds].eps;$('rd-clK').value=k;$('rd-clKv').textContent=k;$('rd-clE').value=eps;$('rd-clEv').textContent=eps;restart(true)});
  $('rd-clK').addEventListener('input',e=>{k=+e.target.value;$('rd-clKv').textContent=k;restart(false)});
  $('rd-clE').addEventListener('input',e=>{eps=+e.target.value;$('rd-clEv').textContent=eps;restart(false)});
  $('rd-clNew').addEventListener('click',()=>{seed++;restart(true)});
  $('rd-clEw').hidden=true;restart(false);
  let rz=0;addEventListener('resize',()=>{clearTimeout(rz);rz=setTimeout(()=>{if(!document.getElementById('t-read').hidden)A.redraw()},200)});
})();
