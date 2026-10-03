// ---- Coefficient paths tab: lasso, ridge and elastic net paths on all 442 diabetes patients; held-out error against lambda ----
(function(){
  const card=document.getElementById('pa-card');if(!card)return;
  const $=id=>document.getElementById(id);
  const D=RG.parse(DIAB.raw),N=D.y.length,all=[...Array(N).keys()],z=RG.stdz(D.X,D.y,all),S=RG.stats(z.f(all),z.g(all));
  const NM=DIAB.names,COL=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)','var(--p7)','var(--p8)','var(--p9)','var(--p10)'];
  const knots=RG.lassoPath(S),ols=RG.ols(S),LMAX=knots[0].lam,LMIN=LMAX*1e-4,rssO=RG.rss(S,ols),TSS=S.yy;
  const st={m:'lasso',x:'lam',rho:0.5,u:0.56};
  const lamOf=u=>LMIN*Math.pow(LMAX*1.3/LMIN,u);
  const GRID=[...Array(121).keys()].map(i=>lamOf(i/120));
  const cache={};
  function path(m,rho){const k=m+(m==='enet'?rho:'');if(cache[k])return cache[k];let b0=null;
    const out=GRID.slice().reverse().map(l=>{const b=m==='ridge'?RG.ridge(S,l):m==='lasso'?RG.pathAt(knots,l):RG.enet(S,l,rho,b0);b0=b;return b}).reverse();return cache[k]=out}
  const fit=(m,l)=>m==='ridge'?RG.ridge(S,l):m==='lasso'?RG.pathAt(knots,l):RG.enet(S,l,st.rho);
  const sum1=b=>b.reduce((a,v)=>a+Math.abs(v),0),fmtL=l=>l>=0.1?l.toFixed(3):l.toExponential(2).replace('e-','e−');
  function draw(){
    const P=path(st.m,st.rho),lam=lamOf(st.u),b=fit(st.m,lam),el=$('pa-plot');
    const xs=st.x==='lam'?GRID.map(Math.log10):P.map(sum1),lines=[];
    for(let j=0;j<10;j++)lines.push({xs,ys:P.map(q=>q[j]),c:COL[j],w:1.8});
    const xv=st.x==='lam'?Math.log10(lam):sum1(b);
    const xr=st.x==='lam'?[Math.log10(LMIN),Math.log10(LMAX*1.3)]:[0,sum1(ols)*1.02];
    const yr=PL.ext(P.flat().concat(ols),0.05);
    const H=RD.width(el)<420?300:340;
    PL.chart({el,id:'pa',x:xr,y:yr,lines,h:H,segs:[{x1:xv,y1:yr[0],x2:xv,y2:yr[1],c:'var(--ink)',w:1.2,dash:'3 3'}],
      xf:st.x==='lam'?v=>'1e'+Math.round(v):PL.fmt,xt:st.x==='lam'?[-4,-3,-2,-1,0].filter(v=>v>=xr[0]-1e-9&&v<=xr[1]):null,
      xl:st.x==='lam'?'λ (log scale): stronger penalty to the right':'t = Σ|b|: larger budget to the right',yl:'coefficient',label:'Coefficient paths',
      onclick:(x)=>{if(st.x==='lam'){st.u=Math.max(0,Math.min(1,(x-Math.log10(LMIN))/Math.log10(LMAX*1.3/LMIN)));$('pa-l').value=Math.round(st.u*1000);draw()}}});
    const nz=b.filter(v=>Math.abs(v)>1e-10).length,rss=RG.rss(S,b);
    $('pa-lv').textContent=fmtL(lam);
    $('pa-n').innerHTML=RD.stat('λ',fmtL(lam),'Ridge alpha = nλ = '+PL.fmt(N*lam))+RD.stat('variables in the model',nz+' of 10',st.m==='ridge'?'ridge keeps all ten':'')+
      RD.stat('t = Σ|b|',Math.round(sum1(b)).toLocaleString('en-US'),'least squares: '+sum1(ols).toFixed(2))+RD.stat('training R²',(1-rss/TSS).toFixed(3),'least squares: '+(1-rssO/TSS).toFixed(3))+
      (st.m==='ridge'?RD.stat('same as input dropout','keep '+(1/(1+N*lam)).toFixed(3),'p = 1/(1 + alpha)'):'');
    const mx=Math.max(...ols.map(Math.abs));
    $('pa-t').innerHTML='<tr><th>variable</th><th class="num">here</th><th class="num">least squares</th><th style="width:38%"></th></tr>'+b.map((v,j)=>'<tr'+(Math.abs(v)<1e-10?' class="z"':'')+'><td><span class="sw" style="background:'+COL[j]+'"></span>'+NM[j]+'</td><td class="num">'+(Math.abs(v)<1e-10?'0':v.toFixed(1).replace('-','−'))+'</td><td class="num">'+ols[j].toFixed(1).replace('-','−')+'</td><td><div style="position:relative;height:10px;background:var(--soft);border-radius:2px"><div style="position:absolute;top:0;bottom:0;left:'+(50+Math.min(0,v)/mx*50)+'%;width:'+(Math.abs(v)/mx*50)+'%;background:'+COL[j]+'"></div></div></td></tr>').join('');
    $('pa-rw').hidden=st.m!=='enet';
  }
  // events along the lasso path, and the published figures
  $('pa-ev').innerHTML=knots.map(k=>{const e=k.ev;if(!e)return '<li>λ = 0: least squares, all ten in</li>';const j=+e.slice(1);return '<li>λ = '+fmtL(k.lam)+': <b>'+NM[j]+'</b> '+(e[0]==='+'?'enters':'<span class="warn">leaves</span>')+'</li>'}).join('');
  (function(){const tk=knots.map(k=>sum1(k.b));let i=tk.findIndex(t=>t>=1000);const k0=knots[i-1],k1=knots[i],f=(1000-tk[i-1])/(tk[i]-tk[i-1]);const bb=k0.b.map((v,j)=>v+f*(k1.b[j]-v));
    const inn=bb.map((v,j)=>Math.abs(v)>1e-10?j:-1).filter(j=>j>=0);
    $('pa-repro').innerHTML='<b>Defaults reproduce Efron et al. (2004), section 1, independently:</b> the lasso reaches least squares at t = Σ|b| = '+sum1(ols).toFixed(2)+' (printed: 3,460.00; the published data carry rounded values) and at t = 1,000 only '+inn.map(j=>NM[j].split(' ')[0]).join(', ')+' are in the model (printed: "only variables 3, 9, 4, and 7", the same four). The path has '+(knots.length-1)+' steps for 10 variables because one variable (s3) leaves and re-enters, the lasso modification of least angle regression (section 3.1).'})();
  // ---- held-out error ----
  const HO={m:40,res:null};
  const LG=[...Array(31).keys()].map(i=>LMIN*Math.pow(LMAX*1.3/LMIN,i/30));
  function heldout(m){const R={lasso:LG.map(()=>0),ridge:LG.map(()=>0),enet:LG.map(()=>0),ols:0};const K=40;
    for(let s=1;s<=K;s++){const H=RG.heldout(D,RG.split(N,m,s)),kn=RG.lassoPath(H.S);let b0=null;
      for(let i=LG.length-1;i>=0;i--){const l=LG[i];R.lasso[i]+=RG.mse(H.T,RG.pathAt(kn,l))/K;R.ridge[i]+=RG.mse(H.T,RG.ridge(H.S,l))/K;b0=RG.enet(H.S,l,0.5,b0,1e-10);R.enet[i]+=RG.mse(H.T,b0)/K}
      R.ols+=RG.mse(H.T,RG.ols(H.S))/K}
    return R}
  function drawHO(){const el=$('ho-plot');if(!HO.res||HO.res.m!==HO.m){HO.res=heldout(HO.m);HO.res.m=HO.m}
    const R=HO.res,x=LG.map(Math.log10),ys=[...R.lasso,...R.ridge,...R.enet,R.ols];const lo=Math.min(...ys),hi=Math.min(Math.max(...ys),R.ols*1.25,Math.max(...R.lasso,...R.ridge));
    const best=k=>{const i=R[k].indexOf(Math.min(...R[k]));return {i,l:LG[i],v:R[k][i]}};const bl=best('lasso'),br=best('ridge'),be=best('enet');
    PL.chart({el,id:'ho',m:{l:58},x:[x[0],x[x.length-1]],y:[lo*0.97,Math.max(hi,lo*1.05)*1.02],h:RD.width(el)<420?230:260,
      lines:[{xs:x,ys:R.lasso,c:'var(--c1)'},{xs:x,ys:R.ridge,c:'var(--c2)'},{xs:x,ys:R.enet,c:'var(--c3)'},{xs:[x[0],x[x.length-1]],ys:[R.ols,R.ols],c:'var(--ink)',dash:'5 4',w:1.4}],
      pts:[bl,br,be].map((q,k)=>({x:x[q.i],y:q.v,r:4.5,c:['var(--c1)','var(--c2)','var(--c3)'][k],stroke:'var(--bg)'})),
      xf:v=>'1e'+Math.round(v),xt:[-4,-3,-2,-1,0].filter(v=>v>=x[0]-1e-9),xl:'λ (log scale)',yl:'held-out MSE',label:'Held-out error against lambda'});
    const g=q=>(100*(1-q.v/R.ols)).toFixed(1)+'% below least squares';
    $('ho-n').innerHTML=RD.stat('least squares',PL.fmt(R.ols),'held-out MSE, no penalty')+RD.stat('best lasso',PL.fmt(bl.v),'λ = '+fmtL(bl.l)+'; '+g(bl))+RD.stat('best ridge',PL.fmt(br.v),'λ = '+fmtL(br.l)+'; '+g(br))+RD.stat('best elastic net',PL.fmt(be.v),'λ = '+fmtL(be.l)+'; '+g(be));
  }
  function seg(id,k){$(id).addEventListener('click',e=>{const bt=e.target.closest('button');if(!bt)return;[...e.currentTarget.querySelectorAll('button')].forEach(x=>x.classList.toggle('on',x===bt));st[k]=bt.dataset.v;draw()})}
  seg('pa-m','m');seg('pa-x','x');
  $('pa-l').addEventListener('input',e=>{st.u=e.target.value/1000;draw()});
  $('pa-r').addEventListener('input',e=>{st.rho=+e.target.value;$('pa-rv').textContent=st.rho.toFixed(2);draw()});
  let tm=0;$('ho-m').addEventListener('input',e=>{HO.m=+e.target.value;$('ho-mv').textContent=HO.m;clearTimeout(tm);tm=setTimeout(drawHO,120)});
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-path']=[draw,drawHO];
  addEventListener('resize',()=>{if(card.offsetParent){draw();drawHO()}});
  window.PATH_TEST={draw,drawHO,st,HO};
})();
