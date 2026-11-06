// ---- Reading tab, section 5: gradient descent against Newton on the same real one-weight loss, both at once, in six explained steps (RD.anim) ----
// The loss is CO.lr1 (one standardised breast-cancer feature, the L2 penalty of section 6). Gradient descent uses eta = 1/beta (beta the largest
// curvature this loss can have); Newton divides by the true curvature. Each step of the list says which iterates it shows.
(function(){
  const $=id=>document.getElementById(id),T=CO.T,M=CO.minus,F=CO.lr1;
  if(!$('rd-nw-card'))return;
  const wstar=(()=>{let w=0;for(let i=0;i<60;i++)w-=F.g(w)/F.h(w);return w})(),fstar=F.f(wstar);
  function seq(m,s){const out=[s];let w=s;const n=m==='gd'?30:6;for(let k=0;k<n;k++){w=m==='gd'?w-F.g(w)/F.L:w-F.g(w)/F.h(w);out.push(w);if(!isFinite(w)||Math.abs(w)>1e4)break}return out}
  const Q={gd0:seq('gd',0),nt0:seq('nt',0),gd8:seq('gd',8),nt8:seq('nt',8)};
  window.CO_NW={seq,wstar,Q};
  // step i: [start, Newton steps shown, gradient-descent steps shown, draw the two models at the last point]
  const ST=[[0,1,1,true],[0,2,2,true],[0,5,5,false],[0,5,30,false],[8,1,1,true],[8,4,4,false]];
  const X0=-4,X1=10,Y0=0.2,Y1=1.3;
  function draw(i){const el=$('rd-nw-svg');const W=Math.min(640,RD.width(el)),narrow=W<520;
    const [s,nn,ng,models]=ST[i],GD=s?Q.gd8:Q.gd0,NT=s?Q.nt8:Q.nt0;
    const xs=[...Array(141)].map((_,j)=>X0+j*0.1),series=[{pts:xs.map(x=>[x,F.f(x)]),col:'var(--mute)',w:2.6}];
    if(models){const w=NT[nn-1],f=F.f(w),g=F.g(w),h=F.h(w);
      series.push({pts:xs.map(x=>[x,f+g*(x-w)]),col:'var(--mute)',w:1.1,dash:'5 3'});
      series.push({pts:xs.map(x=>[x,f+g*(x-w)+0.5*F.L*(x-w)*(x-w)]),col:'var(--c2)',w:1.8});
      series.push({pts:xs.map(x=>[x,f+g*(x-w)+0.5*h*(x-w)*(x-w)]),col:'var(--c1)',w:1.8,dash:Math.abs(h-F.L)<1e-3?'6 4':null})}
    const c=CO.chart({id:'nw',w:W,h:narrow?250:280,x:[X0,X1],y:[Y0,Y1],xt:[-4,-2,0,2,4,6,8,10],yt:[0.2,0.4,0.6,0.8,1,1.2],xl:'weight w',series,
      extra:(sx,sy)=>{let o='<line x1="'+sx(wstar)+'" x2="'+sx(wstar)+'" y1="'+sy(Y0)+'" y2="'+sy(Y1)+'" style="stroke:var(--good);stroke-dasharray:2 3"/>'+T(sx(wstar)+3,sy(Y1)+12,'w* = '+wstar.toFixed(3),'start',11,'var(--good)');
        const trail=(arr,n,col,dy)=>{let t='';for(let j=0;j<=n&&j<arr.length;j++){const a=arr[j];if(!(a>X0&&a<X1))continue;const last=j===n||j===arr.length-1,newest=j===n;
          t+='<circle class="'+(newest?'rd-new':'')+'" cx="'+sx(a).toFixed(1)+'" cy="'+(sy(F.f(a))+dy).toFixed(1)+'" r="'+(last?5.5:3)+'" style="fill:'+col+';opacity:'+(last?1:.55)+'"/>'}return t};
        o+=trail(GD,ng,'var(--c2)',0)+trail(NT,nn,'var(--c1)',0);
        const nx=NT[Math.min(nn,NT.length-1)];if(!(nx>X0&&nx<X1))o+=T(nx<X0?sx(X0)+4:sx(X1)-4,sy(Y1)+28,'Newton is at w = '+M(nx.toFixed(1))+', off the chart',nx<X0?'start':'end',12,'var(--bad)',600);
        const w0=s;o+='<circle cx="'+sx(w0)+'" cy="'+sy(F.f(w0))+'" r="4" style="fill:none;stroke:var(--ink);stroke-width:1.5"/>'+T(sx(w0)+(s?-6:6),sy(F.f(w0))-9,'start','middle',11,'var(--ink)');
        if(models&&!narrow){o+=T(sx(X1)-4,sy(0.33),'orange: gradient descent\'s model (curvature β)','end',11,'var(--c2)')+T(sx(X1)-4,sy(0.27),'blue: Newton\'s model (true curvature)','end',11,'var(--c1)')}
        return o}});
    el.innerHTML=c.svg;
    const gw=GD[Math.min(ng,GD.length-1)],nw=NT[Math.min(nn,NT.length-1)],fmt=v=>isFinite(v)?M(Math.abs(v)>100?v.toFixed(0):v.toFixed(3)):'diverged';
    $('rd-nw-cnt').innerHTML=RD.stat('gradient descent','<span id="rd-nw-gw">'+fmt(gw)+'</span>','after '+Math.min(ng,GD.length-1)+' steps')+RD.stat('Newton','<span id="rd-nw-nw">'+fmt(nw)+'</span>','after '+Math.min(nn,NT.length-1)+' steps')+RD.stat('optimum',wstar.toFixed(3),'loss '+fstar.toFixed(4));
  }
  const A=RD.anim({card:'rd-nw-card',ctl:'rd-nw-ctl',n:ST.length,ms:4600,draw,label:'Step',list:'sx-nw'});
  RD.onResize(()=>A.redraw());
})();
