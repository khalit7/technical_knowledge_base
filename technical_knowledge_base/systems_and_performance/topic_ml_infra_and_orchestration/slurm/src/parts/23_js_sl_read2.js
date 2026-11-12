// ---- Reading tab: steps animation (without/with --exact) in explained stretches, the dependency Gantt ----
// (The priority snapshots are a 3D stage since 2026-11-12: 43_js_sc_fs.js.)
(function(){
const S=window.SL, esc=RD.esc, $=id=>document.getElementById(id), T=RD.t;

// ---------- steps: four 1-task steps in one 2-node allocation ----------
(function(){if(!$('sl-st-card'))return;
  let mode='plain';
  const lanes=['c1 cpu 0','c1 cpu 1','c2 cpu 0','c2 cpu 1'];
  function plan(m){const rows=S.steps[m].filter(r=>/^sl-par/.test(r.name));const t0=Math.min(...rows.map(r=>r.s));
    const busy={};const out=[];
    rows.slice().sort((a,b)=>a.s-b.s||a.id.localeCompare(b.id)).forEach(r=>{const base=r.nodes==='c1'?0:2;let ls=[];
      if(r.cpu>=2)ls=[base,base+1];else{for(const l of [base,base+1]){if(!(busy[l]>r.s))ls=[l];if(ls.length)break}if(!ls.length)ls=[base]}
      ls.forEach(l=>busy[l]=r.e);out.push({id:r.id,name:r.name,node:r.nodes,cpu:r.cpu,gpu:r.gpu,s:r.s-t0,e:r.e-t0,lanes:ls})});
    return {rows:out,end:Math.max(...out.map(r=>r.e))}}
  const P={plain:plan('plain'),exact:plan('exact')};
  const TMAX=Math.max(P.plain.end,P.exact.end);
  // the stretches drawn at each step (seconds since launch): the step lists sx-st-plain and sx-st-exact explain them
  const AT={plain:[3,9,12],exact:[3,6]};window.SL_ST={P,AT};
  function draw(si){const i=AT[mode][si],p=P[mode],el=$('sl-st-svg'),W=Math.min(RD.width(el),860),L=W<480?62:78,R=10,top=8,lh=26,H=top+lanes.length*lh+30;
    const x=t=>L+(W-L-R)*t/TMAX;let b='';
    lanes.forEach((ln,k)=>{const y=top+k*lh;b+='<rect x="'+L+'" y="'+y+'" width="'+(W-L-R)+'" height="'+(lh-6)+'" fill="var(--soft)" rx="3"/>'+T(4,y+15,ln,{fs:11,fill:'var(--mute)'})});
    p.rows.forEach((r,k)=>{if(r.s>i)return;const e=Math.min(r.e,i),col=['var(--c1)','var(--c2)','var(--c3)','var(--c4)'][+r.name.slice(-1)-1];
      const nw=r.s>(si?AT[mode][si-1]:-1);r.lanes.forEach(l=>{const y=top+l*lh;b+='<rect'+(nw?' class="rd-new"':'')+' x="'+x(r.s)+'" y="'+(y+1)+'" width="'+Math.max(2,x(e)-x(r.s))+'" height="'+(lh-8)+'" rx="3" fill="'+col+'" opacity="'+(r.e<=i?0.55:0.9)+'"/>';
        if(x(e)-x(r.s)>46)b+=T(x(r.s)+5,y+14,esc(r.id),{fs:11,fill:'var(--bg)',w:600})})});
    // waiting steps
    const wait=p.rows.filter(r=>r.s>i);if(wait.length)b+=T(L,top+lanes.length*lh+2+10,'waiting for CPUs: '+wait.map(r=>r.id).join(', '),{fs:11,fill:'var(--bad)'});
    b+='<line x1="'+x(i)+'" y1="'+top+'" x2="'+x(i)+'" y2="'+(top+lanes.length*lh-4)+'" stroke="var(--ink)" stroke-dasharray="3 3"/>';
    for(let t=0;t<=TMAX;t+=2)b+=T(x(t),H-4,t+' s',{fs:11,a:'middle',fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,b,'Four job steps on two nodes');
    const run=p.rows.filter(r=>r.s<=i&&r.e>i),done=p.rows.filter(r=>r.e<=i);
    $('sl-st-cnt').innerHTML=RD.stat('time since launch',i+' s','')+RD.stat('steps running',run.length,'of 4')+RD.stat('steps finished',done.length,'')+RD.stat('CPUs per step',p.rows[0].cpu,mode==='plain'?'the whole node\'s share':'what each asked for')+RD.stat('all done at',p.end+' s',mode==='plain'?'without --exact':'with --exact');}
  const A=RD.anim({card:'sl-st-card',ctl:'sl-st-ctl',n:AT.plain.length,draw:draw,ms:4200,label:'Stretch',list:'sx-st-plain'});
  RD.seg($('sl-st-mode'),m=>{mode=m;['plain','exact'].forEach(x=>$('sx-st-'+x).hidden=x!==m);A.reset(AT[m].length,'sx-st-'+m)});RD.onResize(()=>A.redraw());
  (window.SLANIM=window.SLANIM||{}).st=A;
})();

// ---------- arrays and dependencies, as sacct recorded them ----------
(function(){const el=$('sl-dg-svg');if(!el)return;
  function draw(){const W=Math.min(RD.width(el),860),L=W<480?92:120,R=10,rh=19,rows=S.deps,t0=Math.min(...rows.map(r=>r.sub)),t1=Math.max(...rows.map(r=>r.e))-t0,H=rows.length*rh+24;
    const x=t=>L+(W-L-R)*(t-t0)/t1;let b='';
    rows.forEach((r,k)=>{const y=4+k*rh;b+=T(4,y+13,esc(r.id+' '+r.name.replace('sl-','')),{fs:11});
      const sEnd=r.s!=null?r.s:r.e;b+='<rect x="'+x(r.sub)+'" y="'+(y+7)+'" width="'+Math.max(1,x(sEnd)-x(r.sub))+'" height="3" fill="var(--dim)"/>';
      if(r.s!=null){const col=r.st==='FAILED'?'var(--bad)':'var(--good)';b+='<rect x="'+x(r.s)+'" y="'+(y+2)+'" width="'+Math.max(2,x(r.e)-x(r.s))+'" height="'+(rh-5)+'" rx="3" fill="'+col+'"/>';
        if(x(r.e)-x(r.s)>24)b+=T(x(r.s)+3,y+13,esc(r.node),{fs:11,fill:'var(--bg)',w:600})}
      else b+=T(x(r.e)-4,y+13,'never ran ('+esc(r.st.split(' ')[0].toLowerCase())+')',{fs:11,a:'end',fill:'var(--bad)'})});
    for(let t=0;t<=t1;t+=10)b+=T(x(t0+t),H-5,t+' s',{fs:11,a:'middle',fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,b,'Arrays and dependencies timeline')}
  draw();RD.onRender(draw);RD.onResize(draw);
})();
})();
