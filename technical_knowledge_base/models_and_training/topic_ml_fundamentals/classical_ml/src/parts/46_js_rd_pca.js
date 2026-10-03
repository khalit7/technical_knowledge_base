// ---- Reading 9: PCA of the real wine data, raw against standardised (card rd-pc) ----
(function(){
  const W=CD.wine,res={raw:ML.pca(W.X,false),std:ML.pca(W.X,true)};let mode='raw',from=null,t0=0;
  const $=id=>document.getElementById(id);
  // each projection scaled to unit standard deviation on both axes, for display only
  const norm=P=>{const s=[0,1].map(d=>Math.sqrt(P.reduce((a,p)=>a+p[d]*p[d],0)/P.length));return P.map(p=>[p[0]/s[0],p[1]/s[1]])};
  const NP={raw:norm(res.raw.proj),std:norm(res.std.proj)};
  $('rd-pcM').innerHTML='<button data-m="raw" class="on">Raw units</button><button data-m="std">Standardised (each feature to mean 0, sd 1)</button>';
  function draw(tw){const r=res[mode],el=$('rd-pcV'),w=RD.width(el),half=w>=560,cw=half?Math.floor((w-12)/2):w,h=230;
    // scree
    const host1=$('rd-pcA'),host2=$('rd-pcB');host1.style.width=host2.style.width=half?cw+'px':'100%';
    let ctx=PL.cv(host1,cw,h),F=PL.frame([0,13,0,1],cw,h,{l:36,r:8,t:10,b:30});
    PL.axes(ctx,F,{yt:[0,0.5,1],yf:v=>Math.round(v*100)+'%',xl:'component'});
    let cum=0;r.ratio.forEach((v,i)=>{const x=F.X(i+0.15),x2=F.X(i+0.85);ctx.fillStyle=PL.css('--c1');ctx.fillRect(x,F.Y(v),x2-x,F.Y(0)-F.Y(v));PL.text(ctx,String(i+1),(x+x2)/2,F.pad.t+F.H+13,{a:'center'})});
    ctx.strokeStyle=PL.css('--c2');ctx.lineWidth=2;ctx.beginPath();r.ratio.forEach((v,i)=>{cum+=v;const p=[F.X(i+0.5),F.Y(cum)];i?ctx.lineTo(...p):ctx.moveTo(...p)});ctx.stroke();
    PL.text(ctx,'cumulative',F.X(4),F.Y(1)+12,{c:PL.css('--c2')});
    // projection, tweened between modes
    ctx=PL.cv(host2,cw,h);const G=PL.frame([-3.5,3.5,-3.5,3.5],cw,h,{l:8,r:8,t:8,b:8});ctx.strokeStyle=PL.css('--line');ctx.strokeRect(0.5,0.5,cw-1,h-1);
    const a=from?NP[from]:NP[mode],b=NP[mode],u=tw==null?1:tw,cols=['--c1','--c2','--c3'];
    b.forEach((p,i)=>{const x=a[i][0]+(p[0]-a[i][0])*u,y=a[i][1]+(p[1]-a[i][1])*u;PL.dot(ctx,G.X(x),G.Y(y),2.8,PL.css(cols[W.y[i]]))});
    PL.text(ctx,'PC1 →',cw-10,h-10,{a:'right'});PL.text(ctx,'↑ PC2',12,16);
    const top=r.comps[0].map((v,i)=>[Math.abs(v),i,v]).sort((x,y)=>y[0]-x[0]).slice(0,3);
    $('rd-pcN').innerHTML=RD.stat('PC1 explains',RD.pct(r.ratio[0]))+RD.stat('PC1 + PC2',RD.pct(r.ratio[0]+r.ratio[1]))+RD.stat('largest weights in PC1','<span style="font-size:13px">'+top.map(t=>W.features[t[1]].replace(/_/g,' ')+' '+(Math.abs(t[2])<0.005?'0.00':t[2].toFixed(2))).join(', ')+'</span>')+RD.stat('components for 90%',String(r.ratio.reduce((acc,v,i)=>acc.s>=0.9?acc:{s:acc.s+v,n:i+1},{s:0,n:0}).n))}
  function tween(){const u=Math.min(1,(performance.now()-t0)/700);draw(u);if(u<1)requestAnimationFrame(tween);else from=null}
  $('rd-pcM').addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.dataset.m===mode)return;from=mode;mode=b.dataset.m;$('rd-pcM').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
    if(RD.RM){from=null;draw()}else{t0=performance.now();tween()}});
  RD.onRender(()=>draw());let rz=0;addEventListener('resize',()=>{clearTimeout(rz);rz=setTimeout(()=>draw(),200)});
  if('IntersectionObserver' in window)new IntersectionObserver(es=>{if(es[0].isIntersecting)draw()}).observe($('rd-pc'));else draw();
})();
