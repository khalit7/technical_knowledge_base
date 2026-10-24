// ---- Reading tab: the hero (two local models of the real 1D logistic loss at w0 = 1.5) and section 2's gradient-in-the-logit chart ----
(function(){
  const $=id=>document.getElementById(id),T=CO.T,M=CO.minus,F=CO.lr1;
  const reg=f=>{RD.onRender(f);RD.onResize(f);try{f()}catch(e){window.__jsErr&&__jsErr(e.message)}};
  // a closed details block has no width: redraw everything when one opens
  document.addEventListener('toggle',e=>{if(e.target&&e.target.open)window.dispatchEvent(new Event('resize'))},true);

  function hero(){const el=$('rd-hero-svg');if(!el||!F||!CO.D.x1)return;const W=Math.min(680,RD.width(el)),narrow=W<520;
    const w0=1.5,f=F.f(w0),g=F.g(w0),h=F.h(w0),B=F.L,gd=w0-g/B,nt=w0-g/h;
    let ws=w0;for(let i=0;i<60;i++)ws-=F.g(ws)/F.h(ws);
    const X0=0.3,X1=4.8,Y0=0.2,Y1=0.5,xs=[...Array(91)].map((_,j)=>X0+j*0.05);
    const series=[{pts:xs.map(x=>[x,F.f(x)]),col:'var(--mute)',w:2.8},
      {pts:xs.filter(x=>x<=2.25).map(x=>[x,f+g*(x-w0)]),col:'var(--c2)',w:1.4,dash:'5 3'},
      {pts:xs.map(x=>[x,f+g*(x-w0)+0.5*B*(x-w0)*(x-w0)]),col:'var(--c2)',w:1.6},
      {pts:xs.map(x=>[x,f+g*(x-w0)+0.5*h*(x-w0)*(x-w0)]),col:'var(--c1)',w:2}];
    // where a parabola leaves the top of the chart (right arm)
    const exitTop=k=>{const a=0.5*k,b=g,c=f-Y1*0.985;return w0+(-b+Math.sqrt(b*b-4*a*c))/(2*a)};
    const c=CO.chart({id:'hero',w:W,h:narrow?250:270,x:[X0,X1],y:[Y0,Y1],xt:[1,2,3,4],yt:[0.3,0.4,0.5],xl:'weight w',ml:38,series,
      extra:(sx,sy)=>{const dot=(x,y,col,r)=>'<circle cx="'+sx(x).toFixed(1)+'" cy="'+sy(y).toFixed(1)+'" r="'+(r||5)+'" style="fill:'+col+'"/>';
        const drop=(x,y,col)=>'<line x1="'+sx(x).toFixed(1)+'" x2="'+sx(x).toFixed(1)+'" y1="'+sy(y).toFixed(1)+'" y2="'+sy(Y0).toFixed(1)+'" style="stroke:'+col+';stroke-dasharray:2 3"/>';
        let s=drop(ws,Y1,'var(--good)')+drop(gd,F.f(gd),'var(--c2)')+drop(nt,F.f(nt),'var(--c1)');
        s+='<line x1="'+sx(w0)+'" y1="'+sy(f)+'" x2="'+sx(gd)+'" y2="'+sy(F.f(gd))+'" style="stroke:var(--c2);stroke-width:1.4"/>';
        s+='<line x1="'+sx(w0)+'" y1="'+sy(f)+'" x2="'+sx(nt)+'" y2="'+sy(F.f(nt))+'" style="stroke:var(--c1);stroke-width:1.4"/>';
        s+=dot(w0,f,'var(--ink)')+dot(gd,F.f(gd),'var(--c2)')+dot(nt,F.f(nt),'var(--c1)');
        s+=T(sx(w0)-8,sy(f)-6,'you are here','end',11,'var(--ink)',600);
        s+=T(sx(0.35),sy(f+g*(0.35-w0))+16,narrow?'tangent':'tangent: which way is down','start',11,'var(--c2)');
        s+=T(sx(gd)-4,sy(0.235),(narrow?'GD ':'gradient descent ')+gd.toFixed(2),'end',11,'var(--c2)',600);
        s+=T(sx(nt)+4,sy(0.235),'Newton '+nt.toFixed(2),'start',11,'var(--c1)',600);
        s+=T(sx(ws)+4,sy(0.212),'optimum '+ws.toFixed(2),'start',11,'var(--good)',600);
        s+=T(sx(exitTop(B))-5,sy(0.488),narrow?'step penalty β':'line plus step penalty β','end',11,'var(--c2)');
        s+=T(sx(exitTop(h))-5,sy(0.462),narrow?'true curvature':'parabola with the true curvature','end',11,'var(--c1)');
        return s}});
    el.innerHTML=c.svg;
    $('rd-hero-out').innerHTML=RD.stat('slope at w₀','<span id="rd-hero-g">'+M(g.toFixed(3))+'</span>','which way is down')+RD.stat('curvature at w₀','<span id="rd-hero-h">'+h.toFixed(3)+'</span>','bound β = '+B.toFixed(3))+RD.stat('gradient descent','<span id="rd-hero-gd">'+gd.toFixed(3)+'</span>','w₀ − slope/β')+RD.stat('Newton','<span id="rd-hero-nt">'+nt.toFixed(3)+'</span>','w₀ − slope/curvature')}
  reg(hero);

  function lg(){const el=$('rd-lg-svg');if(!el)return;const W=Math.min(620,RD.width(el)),narrow=W<520;
    const sig=CO.sig,zs=[...Array(241)].map((_,i)=>-8+i*0.05);
    const ce=z=>sig(z)-1,ms=z=>{const p=sig(z);return 2*(p-1)*p*(1-p)};
    const c=CO.chart({id:'lg',w:W,h:230,x:[-8,4],y:[-1.08,0.06],xt:[-8,-6,-4,-2,0,2,4],yt:[-1,-0.75,-0.5,-0.25,0],xl:'logit z (true label 1)',yl:'∂L/∂z',ml:46,
      series:[{pts:zs.map(z=>[z,ce(z)]),col:'var(--c1)',w:2.4},{pts:zs.map(z=>[z,ms(z)]),col:'var(--c2)',w:2.4}],
      extra:(sx,sy)=>'<line x1="'+sx(-6)+'" x2="'+sx(-6)+'" y1="'+sy(-1.08)+'" y2="'+sy(0.06)+'" style="stroke:var(--dim);stroke-dasharray:3 3"/>'+
        '<circle cx="'+sx(-6)+'" cy="'+sy(ce(-6))+'" r="4" style="fill:var(--c1)"/><circle cx="'+sx(-6)+'" cy="'+sy(ms(-6))+'" r="4" style="fill:var(--c2)"/>'+
        T(sx(-6)+6,sy(ce(-6))-8,'cross-entropy '+M(ce(-6).toFixed(4)),'start',11,'var(--c1)',600)+
        T(sx(-6)+6,sy(ms(-6))+17,(narrow?'squared error ':'squared error on σ ')+M(ms(-6).toFixed(4)),'start',11,'var(--c2)',600)});
    el.innerHTML=c.svg}
  reg(lg);
})();
