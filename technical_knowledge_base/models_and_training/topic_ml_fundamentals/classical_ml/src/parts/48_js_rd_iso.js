// ---- Reading 8: isolation forest, one random tree isolating the most and the least anomalous eruption (card rd-if) ----
// Real data (Old Faithful, standardised). Trees as in Liu, Ting and Zhou 2008: random feature, random cut between the node's
// min and max, grown until every point is alone (no height limit here). Score: 100 trees on samples of 256, s = 2^(-E[h]/c(256)).
(function(){
  const card=document.getElementById('rd-if');if(!card)return;
  const fa=CD.faithful,$=id=>document.getElementById(id);
  const st=v=>{const m=v.reduce((a,b)=>a+b,0)/v.length,s=Math.sqrt(v.reduce((a,b)=>a+(b-m)**2,0)/v.length);return v.map(x=>(x-m)/s)};
  const zx=st(fa.x),zy=st(fa.y),P=zx.map((v,i)=>[v,zy[i]]),N=P.length,PSI=256,T=100;
  const H=i=>Math.log(i)+0.5772156649,c=n=>n>2?2*H(n-1)-2*(n-1)/n:(n===2?1:0);
  function build(S,r,dep){const nd={n:S.length,dep};
    const fs=[0,1].filter(q=>{let lo=Infinity,hi=-Infinity;S.forEach(i=>{lo=Math.min(lo,P[i][q]);hi=Math.max(hi,P[i][q])});return hi>lo});
    if(S.length<=1||!fs.length)return nd;
    const q=fs[Math.floor(r()*fs.length)];let lo=Infinity,hi=-Infinity;S.forEach(i=>{lo=Math.min(lo,P[i][q]);hi=Math.max(hi,P[i][q])});
    nd.q=q;nd.p=lo+r()*(hi-lo);nd.L=build(S.filter(i=>P[i][q]<nd.p),r,dep+1);nd.R=build(S.filter(i=>P[i][q]>=nd.p),r,dep+1);return nd}
  // path length of point x: depth of its leaf plus c(leaf size) for a leaf that still holds several points
  const plen=(nd,x)=>{while(nd.q!=null)nd=x[nd.q]<nd.p?nd.L:nd.R;return nd.dep+c(nd.n)};
  let M=null;
  function model(){if(M)return M;const r=ML.rng(7),trees=[];
    for(let t=0;t<T;t++){const idx=[...Array(N).keys()];for(let i=N-1;i>0;i--){const j=Math.floor(r()*(i+1));[idx[i],idx[j]]=[idx[j],idx[i]]}trees.push(build(idx.slice(0,PSI),r,0))}
    const Eh=P.map(x=>trees.reduce((a,t)=>a+plen(t,x),0)/T),s=Eh.map(h=>Math.pow(2,-h/c(PSI)));
    let A=0,B=0;s.forEach((v,i)=>{if(v>s[A])A=i;if(v<s[B])B=i});
    // the drawn tree: all 272 eruptions, its own seed; trace A and B down it, recording the box and the cut at each split
    const tree=build([...Array(N).keys()],ML.rng(11),0),box0=[-3.2,3.2,-3.2,3.2];
    const trace=x=>{let nd=tree,b=box0.slice(),out=[{b:b.slice(),n:nd.n}];while(nd.q!=null){const q=nd.q,p=nd.p,cut={q,p,b:b.slice()};
      if(x[q]<p){b[2*q+1]=p;nd=nd.L}else{b[2*q]=p;nd=nd.R}out.push({b:b.slice(),n:nd.n,cut})}return out};
    M={Eh,s,A,B,tA:trace(P[A]),tB:trace(P[B])};window.CMLif=M;return M}
  const raw=i=>fa.x[i].toFixed(1)+' min eruption, '+fa.y[i]+' min wait';
  // six explained steps over the tree's splits: the start, the first split, A alone, B's box shrinking (played as a stretch), B alone, the score
  let stT=0;
  const FR=()=>{const m=model(),a=m.tA.length-1,b=m.tB.length-1;return [0,1,a,Math.round((a+b)/2),b,Math.max(a,b)+1]};
  function draw(j){clearTimeout(stT);const F=FR(),to=F[j],from=j===4?F[3]+1:to;
    if(j===4&&!RD.RM&&to>from){let f=from;const per=Math.max(150,Math.min(500,2600/(to-from+1)));const nx=()=>{frame(f);if(f<to){f++;stT=setTimeout(nx,per)}};nx()}else frame(to)}
  function frame(i){const m=model(),nA=m.tA.length,nB=m.tB.length,last=Math.max(nA,nB);
    const el=$('rd-ifV'),w=RD.width(el),h=Math.min(380,Math.round(w*0.72)),ctx=PL.cv(el,w,h),F=PL.frame([-3.2,3.2,-3.2,3.2],w,h,{l:6,r:6,t:6,b:6});
    ctx.strokeStyle=PL.css('--line');ctx.strokeRect(0.5,0.5,w-1,h-1);
    const path=(tr,col)=>{const k=Math.min(i,tr.length-1),b=tr[k].b;ctx.save();ctx.fillStyle=col;ctx.globalAlpha=0.13;ctx.fillRect(F.X(b[0]),F.Y(b[3]),F.X(b[1])-F.X(b[0]),F.Y(b[2])-F.Y(b[3]));ctx.restore();
      ctx.save();ctx.strokeStyle=col;ctx.lineWidth=1.4;for(let j=1;j<=k;j++){const u=tr[j].cut,bb=u.b;ctx.beginPath();
        if(u.q===0){ctx.moveTo(F.X(u.p),F.Y(bb[2]));ctx.lineTo(F.X(u.p),F.Y(bb[3]))}else{ctx.moveTo(F.X(bb[0]),F.Y(u.p));ctx.lineTo(F.X(bb[1]),F.Y(u.p))}ctx.stroke()}ctx.restore()};
    if(i<last+1){path(m.tB,PL.css('--c1'));path(m.tA,PL.css('--c2'))}
    P.forEach(p=>PL.dot(ctx,F.X(p[0]),F.Y(p[1]),2.4,PL.css('--dim')));
    [[m.A,'--c2','A'],[m.B,'--c1','B']].forEach(([j,cc,lab])=>{PL.dot(ctx,F.X(P[j][0]),F.Y(P[j][1]),5,PL.css(cc),PL.css('--ink'),1.2);PL.text(ctx,lab,F.X(P[j][0])+8,F.Y(P[j][1])-6,{c:PL.css(cc),b:1,s:13})});
    PL.text(ctx,'eruption length →',w-10,h-10,{a:'right'});PL.text(ctx,'↑ waiting time',12,18);
    const kA=Math.min(i,nA-1),kB=Math.min(i,nB-1),done=i>=last;
    $('rd-ifN').innerHTML=RD.stat('A: splits so far',String(kA),m.tA[kA].n+' left in its box')+RD.stat('B: splits so far',String(kB),m.tB[kB].n+' left in its box')+(done?RD.stat('score s(A)',m.s[m.A].toFixed(2),'above 0.5: stands out')+RD.stat('score s(B)',m.s[m.B].toFixed(2),'below 0.5: normal'):'')}
  {const m=model(),set=(k,v)=>document.querySelectorAll('[data-if="'+k+'"]').forEach(e=>e.textContent=v),H2=i=>Math.log(i)+0.5772156649,c2=n=>2*H2(n-1)-2*(n-1)/n;
    set('a',String(m.tA.length-1));set('b',String(m.tB.length-1));set('ra',raw(m.A));set('rb',raw(m.B));set('ha',m.Eh[m.A].toFixed(1));set('hb',m.Eh[m.B].toFixed(1));set('c',c2(PSI).toFixed(2));set('sa',m.s[m.A].toFixed(2));set('sb',m.s[m.B].toFixed(2))}
  const A=RD.anim({card:'rd-if',ctl:'rd-ifC',n:6,draw,ms:4200,label:'Isolation step',list:'sx-if'});
  RD.onResize(()=>A.redraw());
})();
