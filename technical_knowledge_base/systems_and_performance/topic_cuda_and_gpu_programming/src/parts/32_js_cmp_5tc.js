// ---- Compiler explorer: 4. FFMA vs tensor-core instructions (animated, log scale); 5. spill ladder ----
(function(){
  const X=window.CMPX,D=window.CMP;if(!D||!X.$('cmp-tc'))return;
  const R=D.tc.rows;
  function draw(i){
    const el=X.$('cmp-tc-svg'),W=X.width(el),narrow=W<560,lw=narrow?0:200,bh=20,gap=narrow?30:10,top=6;
    const mx=Math.log10(R.reduce((m,r)=>Math.max(m,r.maxMacs||r.macs),1)),x0=lw+4,x1=W-70;
    const sc=v=>x0+(x1-x0)*Math.log10(Math.max(1,v))/mx;
    let s='';
    for(let e=0;e<=Math.ceil(mx);e++){const x=sc(Math.pow(10,e));if(x>x1+1)break;s+='<line x1="'+x+'" x2="'+x+'" y1="0" y2="'+(top+R.length*(bh+gap))+'" stroke="var(--line)"/><text x="'+x+'" y="'+(top+R.length*(bh+gap)+12)+'" font-size="10" text-anchor="middle" fill="var(--mute)">'+Math.pow(10,e).toLocaleString('en-US')+'</text>'}
    R.forEach((r,j)=>{const y=top+j*(bh+gap)+(narrow?14:0),on=j<=i;
      s+='<text x="'+(narrow?4:lw)+'" y="'+(narrow?y-4:y+14)+'" font-size="11.5" '+(narrow?'':'text-anchor="end" ')+'fill="var(--ink)" font-weight="'+(j===i?600:400)+'">'+X.esc(r.name)+'</text>';
      if(r.maxMacs&&r.maxMacs>r.macs)s+='<rect x="'+x0+'" y="'+(y+3)+'" width="'+Math.max(1,(on?sc(r.maxMacs):x0)-x0)+'" height="'+(bh-6)+'" fill="none" stroke="'+r.col+'" stroke-dasharray="3 2"/>';
      s+='<rect x="'+x0+'" y="'+y+'" width="'+Math.max(1,(on?sc(r.macs):x0)-x0)+'" height="'+bh+'" rx="3" fill="'+r.col+'" opacity="'+(j===i?1:.75)+'"/>';
      if(on)s+='<text x="'+(sc(r.macs)+4)+'" y="'+(y+14)+'" font-size="11" fill="var(--ink)">'+r.macs.toLocaleString('en-US')+'</text>'});
    const H=top+R.length*(bh+gap)+18;
    el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Multiply-adds per instruction, log scale">'+s+'</svg>';
    const r=R[i];
    X.$('cmp-tc-cap').innerHTML='<b>'+X.esc(r.name)+'</b>: '+r.cap;
  }
  const A=X.anim({card:'cmp-tc',ctl:'cmp-tc-ctl',n:R.length,draw,ms:2600,label:'Instruction'});
  X.onResize(()=>A.redraw());
  let h='<table class="cmp-t"><thead><tr><th>Instruction (PTX)</th><th>SASS seen</th>'+D.archs.map(a=>'<th>'+a+'</th>').join('')+'</tr></thead><tbody>';
  D.tc.avail.forEach(r=>{h+='<tr><td><code>'+X.esc(r.ptx)+'</code></td><td>'+X.esc(r.sass)+'</td>'+D.archs.map(a=>{const v=r.arch[a];return '<td class="'+(v===true?'cmp-ok':'cmp-bad')+'">'+(v===true?'yes':X.esc(v))+'</td>'}).join('')+'</tr>'});
  X.$('cmp-tc-tab').innerHTML=h+'</tbody></table>';
  X.$('cmp-tc-note').innerHTML=D.tc.note;
})();
(function(){
  const X=window.CMPX,D=window.CMP;if(!D||!X.$('cmp-spill'))return;
  const S=D.spill;let arch='sm_90a',ni=0;
  X.$('cmp-spill-a').innerHTML=D.archs.map(a=>'<button data-m="'+a+'"'+(a===arch?' class="on"':'')+'>'+a+'</button>').join('');
  const sl=X.$('cmp-spill-n');sl.max=S.ns.length-1;
  function draw(){
    const el=X.$('cmp-spill-svg'),W=X.width(el),H=214,l=46,r=W-50,t=26,b=H-34,ns=S.ns,rows=ns.map(n=>S.data[n][arch]);
    const maxSp=Math.max(64,...D.archs.map(a=>Math.max(...ns.map(n=>S.data[n][a].spillSt))));
    const xs=j=>l+(r-l)*j/(ns.length-1),yr=v=>b-(b-t)*v/256,ys=v=>b-(b-t)*v/maxSp;
    let s='<line x1="'+l+'" x2="'+r+'" y1="'+yr(255)+'" y2="'+yr(255)+'" stroke="var(--bad)" stroke-dasharray="4 3"/><text x="'+((l+r)/2)+'" y="'+(yr(255)-4)+'" font-size="10.5" text-anchor="middle" fill="var(--bad)">255-register ceiling</text>';
    ns.forEach((n,j)=>{s+='<text x="'+xs(j)+'" y="'+(b+14)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+n+'</text>'});
    s+='<text x="'+((l+r)/2)+'" y="'+(b+28)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">N, running sums per thread</text>';
    s+='<text x="'+l+'" y="10" font-size="10.5" fill="var(--c1)">registers per thread (solid, left axis)</text><text x="'+r+'" y="10" font-size="10.5" text-anchor="end" fill="var(--c2)">spill stores, B (dashed, right axis)</text>';
    [0,64,128,192,255].forEach(v=>{s+='<text x="'+(l-6)+'" y="'+(yr(v)+3)+'" font-size="10" text-anchor="end" fill="var(--mute)">'+v+'</text>'});
    [0,maxSp/2,maxSp].forEach(v=>{s+='<text x="'+(r+6)+'" y="'+(ys(v)+3)+'" font-size="10" fill="var(--mute)">'+Math.round(v).toLocaleString('en-US')+'</text>'});
    s+='<polyline fill="none" stroke="var(--c1)" stroke-width="2" points="'+rows.map((q,j)=>xs(j)+','+yr(q.regs)).join(' ')+'"/>';
    s+='<polyline fill="none" stroke="var(--c2)" stroke-width="2" stroke-dasharray="5 3" points="'+rows.map((q,j)=>xs(j)+','+ys(q.spillSt)).join(' ')+'"/>';
    rows.forEach((q,j)=>{s+='<circle cx="'+xs(j)+'" cy="'+yr(q.regs)+'" r="'+(j===ni?6:3.5)+'" fill="var(--c1)"/><circle cx="'+xs(j)+'" cy="'+ys(q.spillSt)+'" r="'+(j===ni?6:3.5)+'" fill="var(--c2)"/>'});
    el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Registers and spill bytes against N">'+s+'</svg>';
    const n=ns[ni],q=S.data[n][arch],o=X.occ(arch,q.regs,0,128,0);
    X.$('cmp-spill-nv').textContent=n;
    X.$('cmp-spill-stats').innerHTML=X.stat('Registers / thread',q.regs,'')+X.stat('Spill stores',q.spillSt.toLocaleString('en-US')+' B','per thread')+X.stat('Spill loads',q.spillLd.toLocaleString('en-US')+' B','per thread')+
      X.stat('STL / LDL in SASS',q.stl+' / '+q.ldl,'static count')+X.stat('Occupancy at 128 threads',Math.round(o.occ*100)+'%',o.warps+' of '+o.maxW+' warps; limit: '+o.lim);
    X.$('cmp-spill-cap').innerHTML=S.caps[n]||'';
    X.$('cmp-spill-code').innerHTML=(q.snip||[]).map(t=>'<span class="cmp-ln"><span class="n"></span>'+X.esc(t)+'</span>').join('')||'<span class="cmp-ln"><span class="n"></span>(no spill instructions)</span>';
  }
  sl.addEventListener('input',()=>{ni=+sl.value;draw()});
  X.seg(X.$('cmp-spill-a'),m=>{arch=m;draw()});
  X.onRender(draw);X.onResize(draw);
})();
