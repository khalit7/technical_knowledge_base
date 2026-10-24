// ---- Reading tab: the hero figure (static). Left: how far each target looks along one trajectory. Right: which next action each control target trusts.
(function(){
'use strict';
const A=document.getElementById('rd-heroA'),B=document.getElementById('rd-heroB');if(!A||!B||!window.RD)return;
const T=RD.t,sub=(b,s)=>b+'<tspan font-size="8.5" dy="3">'+s+'</tspan><tspan dy="-3"></tspan>';
function left(){const W=Math.max(280,RD.width(A)),lw=58,x0=lw+14,x1=W-16,n=5,H=196,y=26,dx=(x1-x0)/n;let s='';
  const X=i=>x0+i*dx,lab=['t','t+1','t+2','t+3','t+4'];
  for(let i=0;i<n;i++){s+='<line x1="'+(X(i)+9)+'" y1="'+y+'" x2="'+(X(i+1)-10)+'" y2="'+y+'" stroke="var(--mute)" stroke-width="1.3" marker-end="url(#rdhA)"/>';
    s+=T(((X(i)+X(i+1))/2).toFixed(1),y-9,'R',{a:'middle',fs:10.5,fill:'var(--mute)'});
    s+='<circle cx="'+X(i)+'" cy="'+y+'" r="8" fill="var(--soft)" stroke="var(--ink)"/>'+T(X(i),y+24,sub('S',lab[i]),{a:'middle',fs:11})}
  s+='<rect x="'+(X(n)-8)+'" y="'+(y-8)+'" width="16" height="16" fill="var(--dim)" stroke="var(--ink)"/>'+T(X(n),y+24,sub('S','T'),{a:'middle',fs:11});
  // brackets: real rewards solid, the bootstrapped estimate at the end in the highlight colour
  const rows=[['TD(0)',1,true],['3-step',3,true],['MC',n,false]];
  rows.forEach(([nm,k,boot],j)=>{const yy=72+j*34;s+=T(0,yy+4,nm,{fs:11.5,w:600});
    s+='<line x1="'+X(0)+'" y1="'+yy+'" x2="'+X(k)+'" y2="'+yy+'" stroke="var(--ink)" stroke-width="2.2"/>';
    s+='<line x1="'+X(0)+'" y1="'+(yy-6)+'" x2="'+X(0)+'" y2="'+(yy+6)+'" stroke="var(--ink)" stroke-width="1.5"/>';
    for(let i=1;i<=k;i++)s+='<circle cx="'+((X(i-1)+X(i))/2).toFixed(1)+'" cy="'+yy+'" r="3" fill="var(--ink)"/>';
    if(boot)s+='<circle cx="'+X(k)+'" cy="'+yy+'" r="7" fill="var(--acc)"/>'+T(X(k)+10,yy+4,sub('V(S','t+'+k)+')',{fs:10.5,fill:'var(--acc)',w:600});
    else s+='<rect x="'+(X(k)-6)+'" y="'+(yy-6)+'" width="12" height="12" fill="var(--dim)" stroke="var(--ink)"/>'});
  const ya=H-14;s+='<line x1="'+lw+'" y1="'+ya+'" x2="'+(W-6)+'" y2="'+ya+'" stroke="var(--mute)" marker-end="url(#rdhA)" marker-start="url(#rdhB)"/>';
  s+=T(lw,ya-6,'more bias',{fs:10.5,fill:'var(--mute)'})+T(W-8,ya-6,'more variance',{a:'end',fs:10.5,fill:'var(--mute)'});
  const defs='<defs><marker id="rdhA" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8Z" fill="var(--mute)"/></marker><marker id="rdhB" viewBox="0 0 8 8" refX="1" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M8 0L0 4L8 8Z" fill="var(--mute)"/></marker></defs>';
  A.innerHTML=RD.svg(W,H,defs+s,'Targets for TD(0), 3-step TD and Monte Carlo along one trajectory')}
function right(){const W=Math.max(280,RD.width(B)),H=200,xs=12,xp=Math.min(100,W*0.26),xa=xp+40;let s='';
  const ys=[30,90,150],cy=90;
  s+='<circle cx="'+xs+'" cy="'+cy+'" r="9" fill="var(--soft)" stroke="var(--ink)"/>'+T(xs,cy+26,'S',{a:'middle',fs:11});
  s+='<line x1="'+(xs+10)+'" y1="'+cy+'" x2="'+(xp-11)+'" y2="'+cy+'" stroke="var(--mute)" stroke-width="1.3" marker-end="url(#rdhC)"/>'+T((xs+xp)/2,cy-8,'A, R',{a:'middle',fs:10.5,fill:'var(--mute)'});
  s+='<circle cx="'+xp+'" cy="'+cy+'" r="10" fill="var(--soft)" stroke="var(--ink)"/>'+T(xp,cy+28,'S&#8242;',{a:'middle',fs:11});
  const acts=[['a1','&#8722;6','taken next: SARSA','var(--c2)'],['a2','&#8722;4','best: Q-learning','var(--acc)'],['a3','&#8722;5','',null]];
  acts.forEach(([nm,q,lab,c],i)=>{const y=ys[i];s+='<line x1="'+(xp+10)+'" y1="'+(cy+(y-cy)*0.12)+'" x2="'+(xa-7)+'" y2="'+y+'" stroke="'+(c||'var(--mute)')+'" stroke-width="'+(c?2.2:1.2)+'"'+(i===0?' stroke-dasharray="4 3"':'')+'/>';
    s+='<circle cx="'+xa+'" cy="'+y+'" r="5" fill="'+(c||'var(--dim)')+'"/>'+T(xa+10,y+4,'Q = '+q,{fs:11,w:c?600:400})+(lab?T(xa+10,y+18,lab,{fs:10.5,fill:c}):'')});
  s+=T(xa+10,ys[2]+18,'all three, &#960;-weighted:',{fs:10.5,fill:'var(--c3)'})+T(xa+10,ys[2]+32,'Expected SARSA',{fs:10.5,fill:'var(--c3)'});
  const defs='<defs><marker id="rdhC" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8Z" fill="var(--mute)"/></marker></defs>';
  B.innerHTML=RD.svg(W,H,defs+s,'At the next state, SARSA uses the action taken, Q-learning the best, Expected SARSA the average')}
function draw(){left();right()}
RD.onRender(draw);RD.onResize(draw);draw();
})();
