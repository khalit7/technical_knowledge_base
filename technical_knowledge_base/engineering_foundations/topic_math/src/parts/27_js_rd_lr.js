// ---- Reading tab, section 5: gradient descent on the bowl L = lambda theta^2 / 2 with lambda = 4, below and above 2/lambda ----
(function(){
  const el=document.getElementById('rd-lr-svg');if(!el)return;
  const M=RDM,T=RD.t,lam=4,N=8;let eta=0.4,cur=0;
  const path=()=>{const t=[1];for(let k=0;k<N;k++)t.push(t[k]*(1-eta*lam));return t};
  function cap(i){const t=path(),fct=1-eta*lam,f=M.f;
    const kind=Math.abs(fct)<1?(fct>0?'Each step keeps '+f(fct,1)+' of the distance, on the same side: a smooth slide.':'Each step lands on the other side ('+f(fct,1)+'), but closer: it zig-zags in.'):'Each step lands on the other side and '+f(Math.abs(fct),1)+' times further out: it blows up.';
    if(i===0)return ['Start at θ = 1, learning rate '+eta,'Curvature λ = 4, so the limit is 2/λ = 0.5. Each step multiplies θ by 1 − ηλ = 1 − '+eta+' × 4 = '+f(fct,1)+'. '+kind];
    return ['Step '+i+': θ = '+f(t[i],4),'Loss ½λθ² = '+f(2*t[i]*t[i],4)+'. '+kind+(i===N?' After '+N+' steps θ is '+f(t[N],4)+'.':'')]}
  function draw(i){cur=i;const t=path(),Wd=RD.width(el),H=240,pl=34,pr=12,pt=14,pb=30,R=3;
    const sx=v=>pl+(v+R)/(2*R)*(Wd-pl-pr),sy=v=>pt+16+(1-v/(2*R*R))*(H-pt-pb-16);
    let o='',d='';for(let k=0;k<=120;k++){const v=-R+2*R*k/120;d+=(k?'L':'M')+sx(v).toFixed(1)+','+sy(2*v*v).toFixed(1)}
    o+='<line x1="'+pl+'" y1="'+sy(0)+'" x2="'+(Wd-pr)+'" y2="'+sy(0)+'" stroke="var(--line)"/>';
    for(let g=-3;g<=3;g++)o+=T(sx(g),H-pb+15,String(g).replace('-','−'),{a:'middle',fs:10.5,fill:'var(--mute)'});
    o+=T(pl+(Wd-pl-pr)/2,H-3,'θ (the bottom of the bowl is at 0)',{a:'middle',fs:11,fill:'var(--mute)'});
    o+='<path d="'+d+'" fill="none" stroke="var(--c5)" stroke-width="2"/>';
    let off='';
    for(let k=0;k<=i;k++){const v=t[k],inside=Math.abs(v)<=R,cx=sx(Math.max(-R,Math.min(R,v))),cy=inside?sy(2*v*v):pt+8;
      if(k>0){const u=t[k-1],ui=Math.abs(u)<=R;const px=sx(Math.max(-R,Math.min(R,u))),py=ui?sy(2*u*u):pt+8;
        o+='<path d="M'+px+','+py+' Q'+((px+cx)/2)+','+(Math.min(py,cy)-26)+' '+cx+','+cy+'" fill="none" stroke="var(--mute)" stroke-width="1.2" opacity="'+(k===i?1:0.45)+'"/>'}
      o+='<circle cx="'+cx+'" cy="'+cy+'" r="'+(k===i?6:3.5)+'" fill="'+(Math.abs(v)<1e-9||Math.abs(1-eta*lam)<1?'var(--c3)':'var(--bad)')+'" opacity="'+(k===i?1:0.5)+'"/>';
      if(!inside&&k===i)off=(v>0?'→':'←')+' θ = '+M.f(v,2)+' is off the chart';}
    if(off)o+=T(Wd/2,pt+12,off,{a:'middle',fs:12,w:600,fill:'var(--bad)'});
    el.innerHTML=RD.svg(Wd,H,o,'A ball stepping down a parabola with gradient descent');
    const c=cap(i);document.getElementById('rd-lr-cap').innerHTML='<div class="t">'+c[0]+'</div><p>'+c[1]+'</p>';
  }
  const A=RD.anim({card:'rd-lr-card',ctl:'rd-lr-ctl',n:N+1,draw,ms:1100,label:'Gradient descent step'});
  RD.seg(document.getElementById('rd-lr-seg'),m=>{eta=+m;A.reset(N+1);A.play()});
  RD.onResize(()=>draw(cur));
})();
