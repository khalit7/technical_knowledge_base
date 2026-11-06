// ---- Reading tab, part 1: values written into prose, failure strips (E2). The request pipeline, the routing bars and the retry layers are 3D stages now (40 to 42). ----
(function(){
  const F=window.FGW,E=RD.esc;
  // values written into prose spans
  const vals={or_models:F.or_count.models,or_authors:F.or_count.authors,or_free:F.or_count.free};
  document.querySelectorAll('.fgw-v').forEach(s=>{if(s.dataset.v in vals)s.textContent=vals[s.dataset.v]});

  // 3. failure strips (E2): every call that reached C
  function e2(){const el=document.getElementById('fgw-e2');if(!el)return;const W=RD.width(el),keys=['c429','c503','c503af3','c503af1'];
    const L=Math.min(150,W*0.34),R=W-18,T=22;const rows=keys.map(k=>F.e2.find(c=>c.key===k));
    const tmax=Math.max(...rows.map(c=>c.reqs[c.reqs.length-1].t1));const X=t=>L+(R-L)*t/tmax;const H=T+rows.length*34+8;
    let s='';for(let t=0;t<=tmax;t+=5){s+='<line x1="'+X(t)+'" x2="'+X(t)+'" y1="'+(T-6)+'" y2="'+(H-6)+'" stroke="var(--line)"/>'+RD.t(X(t),T-9,t+' s',{a:'middle',fs:10,fill:'var(--mute)'})}
    rows.forEach((c,j)=>{const y=T+j*34+6;const cs=[];c.reqs.forEach(r=>r.att.forEach(a=>{if(a[0]==='C')cs.push({t:a[2],err:!r.ok})}));
      const pts=[0,...cs.map(x=>x.t),tmax];for(let i=2;i<pts.length-1;i++){if(pts[i]-pts[i-1]>4)s+='<rect x="'+X(pts[i-1])+'" y="'+(y-2)+'" width="'+(X(pts[i])-X(pts[i-1]))+'" height="22" fill="var(--dim)" opacity=".55"/>'}
      s+='<line x1="'+L+'" x2="'+R+'" y1="'+(y+9)+'" y2="'+(y+9)+'" stroke="var(--line)"/>';
      cs.forEach(x=>{s+='<rect x="'+(X(x.t)-1.5)+'" y="'+y+'" width="3" height="18" fill="'+(x.err?'var(--bad)':'var(--c2)')+'"><title>call to C at '+x.t.toFixed(1)+' s</title></rect>'});
      const lab={c429:'429, defaults',c503:'503, defaults',c503af3:'503, allowed_fails 3',c503af1:'503, allowed_fails 1'}[c.key];
      const ue=c.reqs.filter(r=>!r.ok).length;
      s+=RD.t(4,y+8,lab,{fs:11.5})+RD.t(4,y+21,cs.length+' calls to C'+(ue?', '+ue+' user error':''),{fs:10,fill:'var(--mute)'})});
    el.innerHTML=RD.svg(W,H,s,'Calls that reached the failing deployment C in four configurations')}
  e2();

  RD.onRender(()=>{e2()});RD.onResize(()=>{e2()});
})();
