// ---- Reading section 12: model-predictive control's receding horizon (static annotated diagram) ----
(function(){
  const el=document.getElementById('mb-mpcD');if(!el)return;
  function draw(){
    const W=Math.max(300,RD.width(el)),T=W<520?16:22,Hz=W<520?8:12,lw=W<520?50:64,cw=(W-lw-4)/T,rh=26;let s='';
    for(let row=0;row<3;row++){const t=3+row,y=6+row*(rh+12);
      s+=RD.t(0,y+rh/2+4,'step t'+(row?'+'+row:''),{fs:11,w:600});
      for(let c=0;c<T;c++){const x=lw+c*cw;let fill='var(--bg)',st='var(--line)',dash='';
        if(c<t){fill='var(--mute)'}else if(c===t){fill='var(--acc)';st='var(--acc)'}else if(c<t+Hz){fill='color-mix(in srgb, var(--acc) 12%, var(--bg))';st='var(--acc)';dash=' stroke-dasharray="3 2"'}
        s+='<rect x="'+(x+1).toFixed(1)+'" y="'+y+'" width="'+Math.max(2,cw-2).toFixed(1)+'" height="'+rh+'" rx="2" fill="'+fill+'" stroke="'+st+'"'+dash+'/>'}}
    const yb=6+3*(rh+12);
    el.innerHTML=RD.svg(W,yb,s,'Receding horizon: at each step plan '+Hz+' steps ahead, apply only the first action, observe, and plan again');
  }
  RD.onRender(draw);RD.onResize(draw);draw();
})();
