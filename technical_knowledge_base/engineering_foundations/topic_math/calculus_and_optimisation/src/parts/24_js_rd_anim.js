// ---- Reading tab, section 10: one gradient step (first-order model) against one Newton step (second-order model), animated ----
(function(){
  const $=id=>document.getElementById(id),T=CO.T,M=CO.minus,F=CO.lr1;
  if(!$('rd-nw-card'))return;
  let mode='gd',start=0;
  const wstar=(()=>{let w=0;for(let i=0;i<60;i++)w-=F.g(w)/F.h(w);return w})(),fstar=F.f(wstar);
  // iterates: gradient descent at eta = 1/L (L = largest possible curvature), Newton with the exact curvature
  function seq(){const out=[start];let w=start;const n=mode==='gd'?30:6;
    for(let k=0;k<n;k++){const g=F.g(w),h=F.h(w);w=mode==='gd'?w-g/F.L:w-g/h;out.push(w);if(!isFinite(w)||Math.abs(w)>1e4)break}
    return out}
  let S=seq();
  window.CO_NW={seq:()=>S,wstar,set:(m,s)=>{mode=m;start=s;S=seq();A.reset(2*(S.length-1))}};
  const X0=-4,X1=10,Y0=0.2,Y1=1.3;
  function draw(i){const el=$('rd-nw-svg');const W=Math.min(640,RD.width(el));
    const k=Math.floor(i/2),phase=i%2;// phase 0: show the model at w_k; phase 1: move to w_{k+1}
    const w=S[k],nx=S[Math.min(k+1,S.length-1)],g=F.g(w),h=F.h(w),f=F.f(w);
    const curv=mode==='gd'?F.L:h;
    const xs=[...Array(141)].map((_,j)=>X0+j*0.1);
    const series=[{pts:xs.map(x=>[x,F.f(x)]),col:'var(--mute)',w:2.6}];
    if(isFinite(w)&&w>X0-50&&w<X1+50){
      series.push({pts:xs.map(x=>[x,f+g*(x-w)]),col:'var(--c2)',w:1.3,dash:'5 3'});
      series.push({pts:xs.map(x=>[x,f+g*(x-w)+0.5*curv*(x-w)*(x-w)]),col:mode==='gd'?'var(--c2)':'var(--c1)',w:1.8});}
    const c=CO.chart({id:'nw',w:W,h:260,x:[X0,X1],y:[Y0,Y1],xt:[-4,-2,0,2,4,6,8,10],yt:[0.2,0.4,0.6,0.8,1,1.2],xl:'weight w',
      series,extra:(sx,sy)=>{let s='<line x1="'+sx(wstar)+'" x2="'+sx(wstar)+'" y1="'+sy(Y0)+'" y2="'+sy(Y1)+'" style="stroke:var(--good);stroke-dasharray:2 3"/>'+T(sx(wstar)+3,sy(Y1)+12,'w* = '+wstar.toFixed(3),'start',10,'var(--good)');
        for(let j=0;j<=k;j++){const a=S[j];if(a>X0&&a<X1)s+='<circle cx="'+sx(a).toFixed(1)+'" cy="'+sy(F.f(a)).toFixed(1)+'" r="2.6" style="fill:var(--ink);opacity:.45"/>'}
        if(w>X0&&w<X1)s+='<circle cx="'+sx(w)+'" cy="'+sy(f)+'" r="5" style="fill:var(--ink)"/>';
        if(phase===1&&isFinite(nx)){const tgt=Math.max(X0,Math.min(X1,nx));const mv=f+g*(nx-w)+0.5*curv*(nx-w)*(nx-w);
          s+='<line x1="'+sx(w)+'" y1="'+sy(f)+'" x2="'+sx(tgt)+'" y2="'+sy(Math.min(Y1,Math.max(Y0,mv)))+'" style="stroke:var(--ink);stroke-dasharray:3 2"/>';
          if(nx>X0&&nx<X1)s+='<circle cx="'+sx(nx)+'" cy="'+sy(F.f(nx))+'" r="5" style="fill:'+(mode==='gd'?'var(--c2)':'var(--c1)')+'"/>';
          else s+=T(nx<X0?sx(X0)+4:sx(X1)-4,sy(Y1)+28,'next point w = '+M(nx.toFixed(1))+' is off the chart',nx<X0?'start':'end',11,'var(--bad)',600)}
        return s}});
    el.innerHTML=c.svg;
    const name=mode==='gd'?'Gradient descent':'Newton';
    let t,p;
    if(phase===0){t=name+', step '+(k+1)+': build the model at w = '+M(w.toFixed(3));
      p=mode==='gd'?'Slope '+M(g.toFixed(4))+'. Gradient descent trusts the tangent line (dashed) only within its step size: the step η = 1/β minimises the line plus the penalty (β/2)δ², the solid parabola, whose curvature β = '+F.L.toFixed(3)+' is the largest this loss can have. The true curvature here is '+h.toFixed(4)+'.'
        :'Slope '+M(g.toFixed(4))+', curvature '+h.toFixed(4)+'. Newton fits the parabola with the true curvature (solid) and will jump to its bottom, w − slope/curvature.'+(h<0.01?' The curvature is tiny, so the parabola is almost flat and its bottom is far away.':'')}
    else{t=name+', step '+(k+1)+': move to w = '+(isFinite(nx)?M(nx.toFixed(3)):'diverged');
      const gap=F.f(nx)-fstar;
      p=mode==='gd'?'The step is −g/β = '+M((-g/F.L).toFixed(3))+'. Because the model\'s curvature β is larger than the true curvature, the step is safe but short; near the optimum each step only removes about 9% of the remaining distance.'
        :(Math.abs(nx-wstar)<1e-3?'Landed on the optimum: the parabola matched the loss closely enough that the remaining error was squared away.':Math.abs(nx)>12?'The jump overshoots far beyond the chart: the local parabola was a poor model this far from the optimum. Undamped Newton diverges from here; a line search or trust region would cut the step.':'The step is −g/h = '+M((-g/h).toFixed(3))+'. Loss gap now '+CO.fmt(gap,3)+'.')}
    $('rd-nw-cap').innerHTML='<div class="t">'+t+'</div><p>'+p+'</p>';
    const kk=phase===1?k+1:k,cur=S[Math.min(kk,S.length-1)];
    $('rd-nw-cnt').innerHTML=RD.stat('iterations',String(kk),mode==='gd'?'of '+(S.length-1)+' shown':'of '+(S.length-1)+' shown')+RD.stat('weight w','<span id="rd-nw-w">'+(isFinite(cur)?M(cur.toFixed(3)):'diverged')+'</span>','optimum '+wstar.toFixed(3))+RD.stat('loss','<span id="rd-nw-f">'+(isFinite(cur)?F.f(cur).toFixed(4):'')+'</span>','optimum '+fstar.toFixed(4))+RD.stat('curvature at w',isFinite(cur)?F.h(cur).toFixed(4):'','at the optimum '+F.h(wstar).toFixed(4));
  }
  const A=RD.anim({card:'rd-nw-card',ctl:'rd-nw-ctl',n:2*(S.length-1),ms:1500,draw,label:'Optimiser step'});
  RD.seg($('rd-nw-seg'),m=>{mode=m;S=seq();A.reset(2*(S.length-1));A.play()});
  RD.seg($('rd-nw-start'),m=>{start=+m;S=seq();A.reset(2*(S.length-1));A.play()});
  RD.onResize(()=>A.redraw());
})();
