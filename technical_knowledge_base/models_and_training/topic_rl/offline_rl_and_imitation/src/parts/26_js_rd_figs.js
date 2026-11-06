// ---- Reading: static figures (the IRL/GAIL loop, Decision Transformer tokens) and the expectile slider (section 9); the hero is the 3D Fig. 1 (27_js_sc_hero.js) since 2026-11-06 ----
(function(){
  const $=id=>document.getElementById(id);
  const T=(x,y,s,o)=>RD.t(x.toFixed(1),y.toFixed(1),s,o);
  const arrowDef=(id,col)=>'<defs><marker id="'+id+'" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="'+col+'"/></marker></defs>';
  // the IRL / GAIL outer loop with an RL problem inside
  const loop=$('rd-loop');
  function drawLoop(){if(!loop)return;const W=RD.width(loop),wide=W>=600;
    const B=[['Expert demos','fixed, no reward'],['Fit reward or','discriminator:','expert above policy'],['RL inner loop:','needs the','environment'],['Policy\'s own','rollouts']];
    let s=arrowDef('rd-lA','var(--mute)'),H;const box=(x,y,w,h,lines,hl)=>{let o='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+h+'" rx="7" fill="'+(hl?'var(--acc)':'var(--soft)')+'" fill-opacity="'+(hl?'.16':'1')+'" stroke="'+(hl?'var(--acc)':'var(--line)')+'"'+(hl?' stroke-width="2"':'')+'/>';
      const y0=y+h/2-(lines.length-1)*7.5+4;lines.forEach((ln,i)=>{o+=T(x+w/2,y0+i*15,ln,{a:'middle',fs:i?11:12,w:i?400:600,fill:i?'var(--mute)':'var(--ink)'})});return o};
    const ar=(x1,y1,x2,y2)=>'<line x1="'+x1.toFixed(1)+'" y1="'+y1.toFixed(1)+'" x2="'+x2.toFixed(1)+'" y2="'+y2.toFixed(1)+'" stroke="var(--mute)" stroke-width="1.6" marker-end="url(#rd-lA)"/>';
    if(wide){const g=26,bw=(W-2-3*g)/4,bh=62,y=8;H=bh+y+46;
      B.forEach((ln,i)=>{const x=1+i*(bw+g);s+=box(x,y,bw,bh,ln,i===2);if(i<3)s+=ar(x+bw+2,y+bh/2,x+bw+g-2,y+bh/2)});
      const xa=1+3*(bw+g)+bw/2,xb=1+(bw+g)+bw/2,yb=y+bh+22;
      s+='<path d="M'+xa.toFixed(1)+','+(y+bh+2)+'V'+yb+'H'+xb.toFixed(1)+'V'+(y+bh+4)+'" fill="none" stroke="var(--mute)" stroke-width="1.6" marker-end="url(#rd-lA)"/>';
      s+=T((xa+xb)/2,yb+15,'compare with the expert, repeat',{a:'middle',fs:11,fill:'var(--mute)'})}
    else{const bw=Math.min(W-70,260),bh=54,g=20,x=(W-60-bw)/2+4;H=4*bh+3*g+10;
      B.forEach((ln,i)=>{const y=4+i*(bh+g);s+=box(x,y,bw,bh,ln,i===2);if(i<3)s+=ar(x+bw/2,y+bh+2,x+bw/2,y+bh+g-2)});
      const xr=x+bw+26,ya=4+3*(bh+g)+bh/2,yb=4+(bh+g)+bh/2;
      s+='<path d="M'+(x+bw+2).toFixed(1)+','+ya+'H'+xr.toFixed(1)+'V'+yb+'H'+(x+bw+4).toFixed(1)+'" fill="none" stroke="var(--mute)" stroke-width="1.6" marker-end="url(#rd-lA)"/>';
      s+='<text transform="translate('+(xr+13).toFixed(1)+','+((ya+yb)/2)+') rotate(90)" text-anchor="middle" font-size="11" fill="var(--mute)">repeat</text>'}
    loop.innerHTML=RD.svg(W,H,s,'The inverse RL loop: demonstrations, fit a reward, an RL inner loop in the environment, rollouts, repeat')}
  if(loop){RD.onRender(drawLoop);RD.onResize(drawLoop);drawLoop()}

  // Decision Transformer: training tokens and test-time return-to-go
  const dt=$('rd-dtA');
  function drawDT(){if(!dt)return;const W=RD.width(dt),lab=46,n=9,g=W<520?3:6,tw=Math.min(64,(W-lab-2-(n-1)*g)/n),th=30;
    const col={R:'var(--c3)',s:'var(--soft)',a:'var(--acc)'};let s=arrowDef('rd-dA','var(--mute)');
    const row=(y,toks,name)=>{let o=T(0,y+th/2+4,name,{fs:11,w:600,fill:'var(--mute)'});toks.forEach((k,i)=>{const x=lab+i*(tw+g);
      o+='<rect x="'+x.toFixed(1)+'" y="'+y+'" width="'+tw.toFixed(1)+'" height="'+th+'" rx="5" fill="'+col[k[0]]+'" fill-opacity="'+(k[0]==='s'?1:.22)+'" stroke="'+(k[0]==='s'?'var(--line)':col[k[0]])+'"/>';
      o+=T(x+tw/2,y+th/2+4,k[1],{a:'middle',fs:11.5,w:k[0]==='a'?600:400})});return o};
    const sub=(c,i)=>c+['₀','₁','₂','₃'][i];
    const r1=[['R',sub('R̂',1)],['s',sub('s',1)],['a',sub('a',1)],['R',sub('R̂',2)],['s',sub('s',2)],['a',sub('a',2)],['R',sub('R̂',3)],['s',sub('s',3)],['a',sub('a',3)]];
    const r2=[['R','90'],['s',sub('s',1)],['a',sub('a',1)],['R','87'],['s',sub('s',2)],['a',sub('a',2)],['R','82'],['s',sub('s',3)],['a','?']];
    const y1=4,yb=y1+th+12,bh=24,y2=yb+bh+40;
    s+=row(y1,r1,'train');
    s+='<rect x="'+lab+'" y="'+yb+'" width="'+(n*tw+(n-1)*g).toFixed(1)+'" height="'+bh+'" rx="5" fill="var(--soft)" stroke="var(--line)"/>';
    s+=T(lab+(n*tw+(n-1)*g)/2,yb+bh/2+4,W<520?'causal Transformer: predict each a':'causal Transformer: predict each a from everything to its left',{a:'middle',fs:11});
    [2,5,8].forEach(i=>{const x=lab+i*(tw+g)+tw/2;s+='<line x1="'+x.toFixed(1)+'" y1="'+(yb-1)+'" x2="'+x.toFixed(1)+'" y2="'+(y1+th+2)+'" stroke="var(--mute)" stroke-width="1.4" marker-end="url(#rd-dA)"/>'});
    s+=row(y2,r2,'test');
    // rewards received between the groups
    [[2,'r = 3'],[5,'r = 5']].forEach(([i,txt])=>{const x=lab+(i+1)*(tw+g)-g/2;s+=T(x,y2-8,txt,{a:'middle',fs:11,fill:'var(--c3)'})});
    s+=T(lab,y2+th+16,W<520?'90 − 3 = 87, then 87 − 5 = 82':'ask for 90, then subtract each reward received: 90 − 3 = 87, 87 − 5 = 82',{fs:11,fill:'var(--mute)'});
    dt.innerHTML=RD.svg(W,y2+th+22,s,'Decision Transformer tokens: return-to-go, state, action triples in training, and the requested return decreasing at test time')}
  if(dt){RD.onRender(drawDT);RD.onResize(drawDT);drawDT()}

  // expectile slider over the IQL learner's Q at the 30 data actions
  const ex=$('rd-exA'),E=window.OF;
  if(ex&&E){const run=E.runX('iql',1,{tau:0.9,beta:3}),h=run.hist[E.KIT],A=run.A,Q=A.map(a=>E.qval(h.w,a));
    const mean=Q.reduce((u,v)=>u+v,0)/Q.length,mx=Math.max(...Q);
    function drawEx(){const tau=+$('rd-ex').value,v=E.expectile(Q,tau),W=RD.width(ex),H=210,l=34,r=8,t=10,b=26;
      $('rd-exV').textContent=tau.toFixed(2);
      const a0=Math.min(...A)-0.04,a1=Math.max(...A)+0.04,qmin=Math.min(...Q),sp=mx-qmin,y0=qmin-0.2*sp,y1=mx+0.25*sp,st=sp>1.5?0.5:0.2;
      const X=a=>l+(W-l-r)*(a-a0)/(a1-a0),Y=q=>t+(H-t-b)*(y1-q)/(y1-y0);let s='';
      for(let q=Math.ceil(y0/st)*st;q<=y1;q+=st)s+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+Y(q).toFixed(1)+'" y2="'+Y(q).toFixed(1)+'" stroke="var(--line)"/>'+T(l-4,Y(q)+4,RD.n(q,1),{a:'end',fs:11,fill:'var(--mute)'});
      [[mean,'mean'],[mx,'max']].forEach(([q,nm])=>{s+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+Y(q).toFixed(1)+'" y2="'+Y(q).toFixed(1)+'" stroke="var(--mute)" stroke-dasharray="2 3"/>'+T(l+3,Y(q)-3,nm,{fs:11,fill:'var(--mute)'})});
      A.forEach((a,i)=>{s+='<circle cx="'+X(a).toFixed(1)+'" cy="'+Y(Q[i]).toFixed(1)+'" r="3.2" fill="var(--c4)"/>'});
      s+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+Y(v).toFixed(1)+'" y2="'+Y(v).toFixed(1)+'" stroke="var(--acc)" stroke-width="2.4"/>'+T(W-r,Y(v)-5,'V = '+RD.n(v,2),{a:'end',fs:11.5,w:600,fill:'var(--acc)'});
      [a0+0.04,(a0+a1)/2,a1-0.04].forEach((a,i)=>{s+=T(X(a),H-8,RD.n(a,2),{a:i===0?'start':i===2?'end':'middle',fs:11,fill:'var(--mute)'})});
      ex.innerHTML=RD.svg(W,H,s,'Q at the data actions with the expectile line');
      $('rd-exP').innerHTML='At τ = '+tau.toFixed(2)+' the expectile V is <b>'+RD.n(v,2)+'</b>; the mean of the 30 values is '+RD.n(mean,2)+' (τ = 0.5) and their maximum '+RD.n(mx,2)+' (τ → 1). It never passes the maximum of the data\'s own values, however high τ goes: the true optimum at 10 lies at an action the data never tried.'}
    $('rd-ex').addEventListener('input',drawEx);RD.onRender(drawEx);RD.onResize(drawEx);drawEx()}
})();
