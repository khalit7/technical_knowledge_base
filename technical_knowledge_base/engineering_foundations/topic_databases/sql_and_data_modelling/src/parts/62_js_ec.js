// ---- Fig. 6 (section 11): expand and contract, renaming chats.title to chats.name while the application keeps running, flat (2026-11-19: was a 3D stage;
// two columns and the code versions read the same flat). Schematic: the chats table as two columns of cells (eight rows drawn), the running versions
// of the application above; writes are purple arrows from the code into a column, reads teal arrows out of a column; the backfill copies title into name in batches. ----
(function(){
  // flat SVG helpers (2026-11-19): rect, text, line, arrow, eased marks (class rd-new eases in on a forward step)
  const fx=v=>(+v).toFixed(1),MONO='ui-monospace,SFMono-Regular,Menlo,monospace';
  const rect=(x,y,w,h,o)=>{o=o||{};return '<rect'+(o.cl?' class="'+o.cl+'"':'')+' x="'+fx(x)+'" y="'+fx(y)+'" width="'+fx(Math.max(0,w))+'" height="'+fx(Math.max(0,h))+'" rx="'+(o.r==null?5:o.r)+'" fill="'+(o.fill||'none')+'"'+(o.fo!=null?' fill-opacity="'+o.fo+'"':'')+(o.s?' stroke="'+o.s+'" stroke-width="'+(o.sw||1.2)+'"':'')+(o.da?' stroke-dasharray="'+o.da+'"':'')+(o.op!=null?' opacity="'+o.op+'"':'')+'/>'};
  const text=(x,y,s,o)=>{o=o||{};return '<text'+(o.cl?' class="'+o.cl+'"':'')+' x="'+fx(x)+'" y="'+fx(y)+'" font-size="'+(o.fs||12)+'"'+(o.a?' text-anchor="'+o.a+'"':'')+' fill="'+(o.c||'var(--ink)')+'"'+(o.w?' font-weight="'+o.w+'"':'')+(o.mono?' font-family="'+MONO+'"':'')+(o.op!=null?' opacity="'+o.op+'"':'')+'>'+s+'</text>'};
  const line=(x1,y1,x2,y2,o)=>{o=o||{};return '<line'+(o.cl?' class="'+o.cl+'"':'')+' x1="'+fx(x1)+'" y1="'+fx(y1)+'" x2="'+fx(x2)+'" y2="'+fx(y2)+'" stroke="'+(o.c||'var(--line)')+'" stroke-width="'+(o.sw||1.2)+'"'+(o.da?' stroke-dasharray="'+o.da+'"':'')+(o.op!=null?' opacity="'+o.op+'"':'')+'/>'};
  const arrow=(x1,y1,x2,y2,o)=>{o=o||{};const a=Math.atan2(y2-y1,x2-x1),h=o.h||7,c=o.c||'var(--ink)';
    const p=[[x2,y2],[x2-h*Math.cos(a-.42),y2-h*Math.sin(a-.42)],[x2-h*Math.cos(a+.42),y2-h*Math.sin(a+.42)]].map(q=>fx(q[0])+','+fx(q[1])).join(' ');
    return '<g'+(o.cl?' class="'+o.cl+'"':'')+(o.op!=null?' opacity="'+o.op+'"':'')+'>'+line(x1,y1,x2-(h*.6)*Math.cos(a),y2-(h*.6)*Math.sin(a),{c,sw:o.sw||1.6,da:o.da})+'<polygon points="'+p+'" fill="'+c+'"/></g>'};
  const grp=(s,o)=>{o=o||{};return '<g'+(o.cl?' class="'+o.cl+'"':'')+(o.op!=null&&o.op<1?' opacity="'+o.op+'"':'')+'>'+s+'</g>'};
  const card=document.getElementById('rd-ec-card');if(!card)return;
  // per step: the versions running and what each does to [title, name]
  const F=[{run:[['v1',['read, write','']]]},{run:[['v1',['read, write','']]]},{run:[['v1',['read, write','']],['v2',['read, write','write']]]},
    {run:[['v2',['read, write','write']]]},{run:[['v2',['read, write','write']],['v3',['write','read, write']]]},
    {run:[['v3',['write','read, write']],['v4',['','read, write']]]},{run:[['v4',['','read, write']]]}];
  window.CHK=Object.assign(window.CHK||{},{ec:{steps:F.length}});
  const NR=8,WR='var(--c4)',RD_='var(--c6)';
  function draw(k){const el=document.getElementById('rd-ec'),W=RD.width(el),ph=W<520;let s='';
    const cw=Math.min(ph?110:160,W*.3),XT=W*.5-cw/2-(ph?32:34),XN=W*.5+cw/2+(ph?32:34),top=6,bh=40,colTop=top+bh+70,rh=ph?20:22;
    // the running versions of the application, each reading (teal, out of a column) and writing (purple, into a column)
    const run=F[k].run,xs=run.length===1?[W/2]:[W*.27,W*.73],bw=ph?100:130;
    run.forEach(([v,ops],j)=>{const nw=k>0&&!F[k-1].run.some(r=>r[0]===v),cx=xs[j],cl=nw?'rd-new':'';
      s+=grp(rect(cx-bw/2,top,bw,bh,{fill:v==='v1'?'var(--mute)':'var(--c5)',fo:.2,s:v==='v1'?'var(--mute)':'var(--c5)',r:8})+text(cx,top+25,v+' code',{a:'middle',fs:13,w:700}),{cl});
      [[XT,ops[0]],[XN,ops[1]]].forEach(([xc,op],ci)=>{if(!op)return;const off=(ci?1:-1)*(run.length===1?18:8)+(j?6:-6),sx=cx+off,ex=xc+(j?8:-8)+(run.length===1?0:0);
        if(/write/.test(op))s+=arrow(sx-4,top+bh,ex-4,colTop-26,{c:WR,sw:1.8,cl});
        if(/read/.test(op))s+=arrow(ex+4,colTop-26,sx+4,top+bh,{c:RD_,sw:1.8,cl})})});
    // the chats table: two columns of eight rows drawn
    const ta=k===5?.45:k===6?.25:1,tx=XT-cw/2,nx=XN-cw/2;
    s+=text(XT,colTop-10,k===6?'title · dropped':'title',{a:'middle',fs:13,w:700,mono:1,c:k===6?'var(--bad)':'var(--c1)'});
    s+=text(XN,colTop-10,k===0?'name · not yet':k===1?'name · added, NULL':'name',{a:'middle',fs:13,w:700,mono:1,c:k===0?'var(--mute)':'var(--c2)'});
    for(let i=0;i<NR;i++){const y=colTop+i*rh;
      s+=rect(tx,y,cw,rh-3,k===6?{fill:'none',s:'var(--bad)',da:'4 3',r:3,op:.6}:{fill:'var(--c1)',fo:.3,s:'var(--c1)',sw:.8,r:3,op:ta});
      if(k===0)s+=rect(nx,y,cw,rh-3,{fill:'none',s:'var(--mute)',da:'4 3',r:3,op:.6});
      else{const fresh=i>=NR-2,filled=k>=4||(k>=2&&fresh)||(k===3);
        s+=rect(nx,y,cw,rh-3,filled?{fill:'var(--c2)',fo:.35,s:'var(--c2)',sw:.8,r:3,cl:(k===2&&fresh)||(k===3&&!fresh)?'rd-new':''}:{fill:'var(--card)',s:'var(--line)',r:3,cl:k===1?'rd-new':''});
        if(!filled&&!ph)s+=text(nx+cw/2,y+rh/2+2,'NULL',{a:'middle',fs:11,mono:1,c:'var(--mute)'})}}
    const yb=colTop+NR*rh;
    if(k===2)s+=text(nx+cw+6,colTop+(NR-1)*rh,ph?'new':'new rows only',{fs:12,c:'var(--c2)',w:600,cl:'rd-new'});
    // the backfill: old rows copied from title into name, a batch at a time
    if(k===3)for(let b=0;b<3;b++){const y0=colTop+b*2*rh,y1=y0+2*rh-3;
      s+=grp(arrow(tx+cw+2,y0+rh-2,nx-2,y0+rh-2,{c:'var(--c2)',sw:1.6})+text(W/2,y0+rh-6,'batch '+(b+1),{a:'middle',fs:11,mono:1,w:600,c:'var(--c2)'}),{cl:'rd-new'})}
    s+=text(W/2,yb+16,'chats (8 rows drawn)',{a:'middle',fs:11.5,c:'var(--mute)'});
    // legend
    const ly=yb+34;s+=line(W/2-120,ly-4,W/2-100,ly-4,{c:WR,sw:2})+text(W/2-95,ly,'writes',{fs:12,c:WR,w:600})+line(W/2+10,ly-4,W/2+30,ly-4,{c:RD_,sw:2})+text(W/2+35,ly,'reads',{fs:12,c:RD_,w:600});
    el.innerHTML=RD.svg(W,ly+10,s,'Expand and contract: chats.title becomes chats.name while the code keeps running')}
  const an=RD.anim({card:'rd-ec-card',ctl:'rd-ec-ctl',n:F.length,ms:5000,draw,label:'Migration step',list:'sx-ec'});
  RD.onResize(()=>an.redraw());
})();
