// ---- Reading tab, section 4: the loss as the sat score varies, with the tangent (slope) at the chosen point ----
(function(){
  const el=document.getElementById('rd-sl-svg'),r=document.getElementById('rd-sl-r');if(!el||!r)return;
  const M=RDM,T=RD.t;
  const Lz=s=>-Math.log(M.softmax([2,1,s])[2]);
  function draw(){const s=+r.value,Wd=RD.width(el),H=230,pl=40,pr=12,pt=12,pb=34;
    const X0=-3,X1=5,Y0=0,Y1=5.5,sx=v=>pl+(v-X0)/(X1-X0)*(Wd-pl-pr),sy=v=>pt+(Y1-v)/(Y1-Y0)*(H-pt-pb);
    let o='';
    for(let g=0;g<=5;g++)o+='<line x1="'+pl+'" y1="'+sy(g)+'" x2="'+(Wd-pr)+'" y2="'+sy(g)+'" stroke="var(--line)"/>'+T(pl-6,sy(g)+4,g,{a:'end',fs:10.5,fill:'var(--mute)'});
    for(let g=-3;g<=5;g++)o+=T(sx(g),H-pb+15,String(g).replace('-','−'),{a:'middle',fs:10.5,fill:'var(--mute)'});
    o+=T(pl+(Wd-pl-pr)/2,H-4,'score of sat, z_sat (cat and dog fixed at 2 and 1)',{a:'middle',fs:11,fill:'var(--mute)'});
    o+=T(pl+4,pt+10,'loss',{fs:11,fill:'var(--mute)'});
    let d='';for(let k=0;k<=160;k++){const v=X0+(X1-X0)*k/160;d+=(k?'L':'M')+sx(v).toFixed(1)+','+sy(Lz(v)).toFixed(1)}
    o+='<path d="'+d+'" fill="none" stroke="var(--c2)" stroke-width="2.2"/>';
    const L=Lz(s),p=M.softmax([2,1,s])[2],m=p-1,a=s-1.6,b=s+1.6;
    const clip=v=>Math.max(Y0,Math.min(Y1,v));
    o+='<line x1="'+sx(a)+'" y1="'+sy(clip(L+m*(a-s)))+'" x2="'+sx(b)+'" y2="'+sy(clip(L+m*(b-s)))+'" stroke="var(--c3)" stroke-width="2" stroke-dasharray="5 3"/>';
    o+='<circle cx="'+sx(s)+'" cy="'+sy(L)+'" r="5" fill="var(--c3)"/>';
    el.innerHTML=RD.svg(Wd,H,o,'Loss against the sat score, with the tangent line');
    document.getElementById('rd-sl-v').textContent=M.f(s,1);
    document.getElementById('rd-sl-out').innerHTML=RD.stat('loss L',M.f(L),'nats')+RD.stat('p(sat)',M.f(p),'probability of the truth')+
      RD.stat('slope ∂L/∂z_sat',M.f(m),'= p(sat) − 1, the dashed line');
  }
  r.addEventListener('input',draw);draw();RD.onRender(draw);RD.onResize(draw);
})();
