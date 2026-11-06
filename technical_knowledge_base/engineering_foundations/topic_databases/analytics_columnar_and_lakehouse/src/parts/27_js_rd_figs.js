// ---- Reading figures added in the 2026-10-24 rebuild: encodings on real values, row against vector execution,
// late materialisation bars, ClickHouse granules, storage apart from compute, the commit race, ETL against ELT, the ASOF timeline ----
(function(){
  const $=id=>document.getElementById(id);
  const tw=(s,fs)=>String(s).length*(fs||11)*0.6+12; // text box width estimate
  // a box with one or more lines of text
  function box(x,y,w,h,lines,o){o=o||{};let s='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+h+'" rx="4" fill="'+(o.fill||'var(--bg)')+'" stroke="'+(o.stroke||'var(--line)')+'" stroke-width="'+(o.sw||1)+'"'+(o.dash?' stroke-dasharray="4 3"':'')+(o.op!=null?' opacity="'+o.op+'"':'')+'/>';
    const L=[].concat(lines),lh=14,y0=y+h/2-(L.length-1)*lh/2+4;
    L.forEach((t,i)=>{s+=RD.t(x+(o.left?6:w/2),y0+i*lh,t,{a:o.left?null:'middle',fs:o.fs||11,w:i===0&&o.bold?600:null,fill:o.ink})});return s}
  const arrow=(x1,y1,x2,y2,c)=>{const a=Math.atan2(y2-y1,x2-x1),h=6;return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+(c||'var(--mute)')+'" stroke-width="1.4"/><path d="M'+x2+' '+y2+' L'+(x2-h*Math.cos(a-0.45)).toFixed(1)+' '+(y2-h*Math.sin(a-0.45)).toFixed(1)+' L'+(x2-h*Math.cos(a+0.45)).toFixed(1)+' '+(y2-h*Math.sin(a+0.45)).toFixed(1)+'Z" fill="'+(c||'var(--mute)')+'"/>'};
  // flow a list of small boxes left to right, wrapping; returns {s, y}
  function flow(items,x0,y,W,o){o=o||{};let x=x0,s='';const h=22,g=4;
    items.forEach(it=>{const t=typeof it==='string'?it:it.t,w=Math.max(o.minw||0,tw(t));if(x+w>W&&x>x0){x=x0;y+=h+g}
      s+=box(x,y,w,h,t,{fill:it.fill||o.fill,stroke:it.stroke||o.stroke,ink:it.ink});x+=w+g});
    return {s,y:y+h}}

  // 1. encodings on real values (section 2)
  function enc(){const el=$('encDiag');if(!el)return;const W=RD.width(el);let s='',y=4;
    const M=D.lab?null:null;const cnt=[['large',2499355],['mini',2498787],['reasoning',2498218],['standard',2503640]];
    const rows=[
      {t:'1. Dictionary, then bit-packing: role',in:['user','assistant','user','assistant','user','assistant','user','assistant'],
       out:[{t:'dictionary: 0 = user, 1 = assistant',fill:'var(--acc2)'},{t:'codes 0 1 0 1 0 1 0 1'},{t:'1 bit each: byte aa',fill:'var(--c2)',ink:'var(--bg)'}]},
      {t:'2. Run-length: model, table sorted by model',in:['large','large','large','...','mini','...','reasoning','...','standard'],
       out:cnt.map((c,i)=>({t:i+' ('+c[0]+') x '+c[1].toLocaleString(),fill:i===0?'var(--c2)':'var(--acc2)',ink:i===0?'var(--bg)':null}))},
      {t:'3. Delta: id',in:['1','2','3','4','5','...','500'],
       out:[{t:'first value 1',fill:'var(--acc2)'},{t:'smallest delta 1'},{t:'offsets 0 0 0 0: 0 bits each',fill:'var(--c2)',ink:'var(--bg)'}]},
      {t:'4. Codec only: content (free text)',in:['835 MB plain'],
       out:[{t:'389 MB with Snappy',fill:'var(--acc2)'},{t:'223 MB with zstd',fill:'var(--c2)',ink:'var(--bg)'}]}];
    rows.forEach((r,i)=>{s+=RD.t(0,y+12,r.t,{fs:12,w:600});y+=18;
      let f=flow(r.in,0,y,W,{fill:'var(--soft)'});s+=f.s;y=f.y+4;
      s+=arrow(14,y,14,y+14,'var(--acc)')+RD.t(24,y+12,'stored as',{fs:11,fill:'var(--mute)'});y+=18;
      f=flow(r.out,0,y,W);s+=f.s;y=f.y+(i<rows.length-1?16:4)});
    el.innerHTML=RD.svg(W,y+2,s,'Four encodings applied to real values of the chat messages')}
  enc();RD.onRender(enc);RD.onResize(enc);

  // 2. row at a time against a vector at a time (section 4): now the 3D stage Fig. 2, 31_js_sc_vec.js

  // 3. late materialisation bars (section 4)
  if($('lateBars')){const f=D.lab.files.find(x=>x.sort==='random'&&x.rg===100000&&x.comp==='snappy').q.chat,C=D.full.counted;
    BARS($('lateBars'),[
      {nm:'One chat, shuffled: needed by footer',v:f.need_bytes,txt:FMT.mb(f.need_bytes),col:'var(--dim)'},
      {nm:'One chat, shuffled: DuckDB read',v:f.read_bytes,txt:FMT.mb(f.read_bytes),col:'var(--c3)',hl:true},
      {nm:'content, all 10M rows',v:C.content_all.bytes_read,txt:FMT.mb(C.content_all.bytes_read),col:'var(--dim)'},
      {nm:'content, 6,950 rows over 1,495 tokens',v:C.content_selective.bytes_read,txt:FMT.mb(C.content_selective.bytes_read),col:'var(--c2)',hl:true}]);}

  // 4. ClickHouse granules (section 7): now the 3D stage Fig. 3, 32_js_sc_ch.js

  // 5. storage apart from compute (section 8)
  function whd(){const el=$('whdSvg');if(!el)return;const W=RD.width(el),narrow=W<560;let s='';
    const names=narrow?[['ETL'],['BI'],['ML team']]:[['ETL warehouse','size M, nightly'],['BI warehouse','size S, all day'],['ML team','suspended: costs nothing']];
    const n=3,g=10,bw=(W-(n-1)*g)/n,by=8,bh=narrow?40:46;
    names.forEach((t,i)=>{const x=i*(bw+g),off=i===2;s+=box(x,by,bw,bh,t,{bold:1,op:off?0.5:1,dash:off});
      s+=box(x+bw*0.15,by+bh+8,bw*0.7,20,'local cache',{fill:'var(--soft)',fs:11,op:off?0.5:1});
      s+=arrow(x+bw/2,by+bh+28,x+bw/2,by+bh+58,off?'var(--dim)':'var(--acc)')});
    const sy=by+bh+62,sh=46;s+=box(0,sy,W,sh,narrow?['object storage: one copy','columnar files']:['object storage: one copy of every table','compressed columnar files, cheap and durable'],{fill:'var(--acc2)',bold:1});
    for(let i=0;i<(narrow?8:16);i++){const x=10+i*((W-20)/(narrow?8:16));s+='<rect x="'+x.toFixed(1)+'" y="'+(sy+sh-9)+'" width="'+((W-20)/(narrow?8:16)-4).toFixed(1)+'" height="5" fill="var(--acc)" opacity="0.5"/>'}
    s+=RD.t(W-4,sy-8,'network hop',{a:'end',fs:11,fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,sy+sh+4,s,'Several compute clusters reading one copy of the data in object storage')}
  whd();RD.onRender(whd);RD.onResize(whd);

  // 6. two writers, one catalog pointer (section 9): a stepper
  const OCC=[
    {p:'v42',a:['reads v42'],b:['reads v42'],files:{v42:1}},
    {p:'v42',a:['writes data','and v43a'],b:['writes data','and v43b'],files:{v42:1,v43a:2,v43b:2}},
    {p:'v43a',a:['swap 42 to 43a','succeeds'],b:['waiting'],files:{v42:3,v43a:1,v43b:2},win:'a'},
    {p:'v43a',a:['done'],b:['swap 42 to 43b','refused'],files:{v42:3,v43a:1,v43b:4},lose:'b'},
    {p:'v44',a:['done'],b:['rebuilds on 43a','swap 43a to 44: ok'],files:{v42:3,v43a:3,v43b:4,v44:1},win:'b'}];
  let occA=null;
  function occ(i){const el=$('occSvg');if(!el)return;const W=RD.width(el),narrow=W<560,st=OCC[i];let s='';
    const cw=Math.min(230,W*0.6),cx=(W-cw)/2;
    s+=box(cx,4,cw,34,['catalog: chat.messages','current = '+st.p],{fill:'var(--acc2)',bold:1});
    const ww=(W-12)/2,wy=54,wh=52;
    s+=box(0,wy,ww,wh,['Writer A'].concat(st.a),{bold:1,stroke:st.win==='a'?'var(--good)':'var(--line)',sw:st.win==='a'?2:1});
    s+=box(ww+12,wy,ww,wh,['Writer B'].concat(st.b),{bold:1,stroke:st.lose==='b'?'var(--bad)':st.win==='b'?'var(--good)':'var(--line)',sw:(st.lose||st.win==='b')?2:1});
    const fs=['v42','v43a','v43b','v44'],fw=(W-3*8)/4,fy=wy+wh+18;
    fs.forEach((f,k)=>{const x=k*(fw+8),state=st.files[f],lab=narrow?f:'metadata '+f;if(!state){s+=box(x,fy,fw,28,lab,{op:0.15,dash:1});return}
      const cur=f===st.p;s+=box(x,fy,fw,28,lab,{fill:cur?'var(--c2)':'var(--bg)',ink:cur?'var(--bg)':null,dash:state===2||state===4,op:state===4?0.4:state===3?0.7:1,stroke:cur?'var(--c2)':'var(--line)'})});
    const pk=fs.indexOf(st.p),px=pk*(fw+8)+fw/2;s+=arrow(W/2,38,px,fy-2,'var(--c2)');
    el.innerHTML=RD.svg(W,fy+32,s,'Two writers committing to one Iceberg table')}
  if($('occCtl'))occA=RD.anim({card:'occCard',ctl:'occCtl',n:OCC.length,ms:4200,draw:occ,label:'Commit step',list:'sx-occ'});
  RD.onResize(()=>occA&&occA.redraw());

  // 7. ETL against ELT (section 10)
  function elt(){const el=$('eltSvg');if(!el)return;const W=RD.width(el),narrow=W<560;let s='';
    const rows=[{t:'ETL',b:[['Postgres','(app)'],['transform job','(Python, Spark)'],['warehouse:',narrow?'final tables':'finished tables only']],hl:-1},
      {t:'ELT',b:[['Postgres','(app)'],['warehouse:',narrow?'raw copy':'raw copy kept'],['SQL models',narrow?'(dbt)':'(dbt), inside'],['finished','tables']],hl:1}];
    let y=4;rows.forEach(r=>{s+=RD.t(0,y+12,r.t,{fs:12,w:600});y+=18;const n=r.b.length,g=narrow?14:22,bw=(W-(n-1)*g)/n,bh=40;
      r.b.forEach((t,i)=>{const x=i*(bw+g);s+=box(x,y,bw,bh,t,{fill:i===r.hl?'var(--c2)':i===0?'var(--soft)':'var(--bg)',ink:i===r.hl?'var(--bg)':null,fs:11});if(i<n-1)s+=arrow(x+bw+1,y+bh/2,x+bw+g-1,y+bh/2)});y+=bh+14});
    el.innerHTML=RD.svg(W,y,s,'ETL transforms before loading; ELT loads raw rows and transforms inside the warehouse')}
  elt();RD.onRender(elt);RD.onResize(elt);

  // 8. the ASOF timeline for chat 13 (section 11)
  function asof(){const el=$('asofSvg');if(!el)return;const W=RD.width(el);let s='';
    const t0=Date.UTC(2025,8,1),t1=Date.UTC(2026,9,4),X=t=>8+(t-t0)/(t1-t0)*(W-16);
    const up=Date.UTC(2026,4,11),c13=Date.UTC(2025,8,1,1,15,18),y=40,h=22;
    s+=RD.t(8,y-8,'user of chat 13: plan history',{fs:11,fill:'var(--mute)'});
    s+='<rect x="'+X(t0)+'" y="'+y+'" width="'+(X(up)-X(t0)).toFixed(1)+'" height="'+h+'" fill="var(--acc2)"/>'+RD.t(X(t0)+6,y+15,'free',{fs:11.5,w:600});
    s+='<rect x="'+X(up).toFixed(1)+'" y="'+y+'" width="'+(X(t1)-X(up)).toFixed(1)+'" height="'+h+'" fill="var(--c4)" fill-opacity="0.75"/>'+RD.t(X(up)+6,y+15,'pro',{fs:11.5,w:600});
    s+=RD.t(X(up),y+h+14,'upgraded 2026-05-11',{a:'middle',fs:11,fill:'var(--mute)'});
    const cx=X(c13)+1;s+='<line x1="'+cx+'" x2="'+cx+'" y1="'+(y-2)+'" y2="'+(y+h+44)+'" stroke="var(--ink)" stroke-width="2"/>';
    s+=RD.t(cx+4,y+h+30,'chat 13 starts 2025-09-01',{fs:11,w:600});
    const nar=W<560,ny=y+h+56;s+=arrow(X(t1)-4,ny,cx+6,ny,'var(--bad)')+RD.t(X(t1)-6,ny-6,nar?'naive: latest plan, pro':'naive: the latest plan, pro (leak)',{a:'end',fs:11,fill:'var(--bad)',w:600});
    const ay=ny+26;s+=arrow(cx+40,ay,cx+6,ay,'var(--good)')+RD.t(cx+46,ay+4,nar?'ASOF: plan at start, free':'ASOF: the plan in force at the chat\'s start, free',{fs:11,fill:'var(--good)',w:600});
    s+=RD.t(W-8,y-8,'2026-10-04',{a:'end',fs:11,fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,ay+12,s,'Timeline of one user\'s plan and the two joins')}
  asof();RD.onRender(asof);RD.onResize(asof);
  if($('asofBars')){const A=D.asof;BARS($('asofBars'),[
    {nm:'"pro" by the naive join',v:A.naive_pro,txt:A.naive_pro.toLocaleString(),col:'var(--bad)'},
    {nm:'"pro" by the ASOF join',v:A.asof_pro,txt:A.asof_pro.toLocaleString(),col:'var(--good)',hl:true},
    {nm:'leaked labels',v:A.leaked,txt:A.leaked.toLocaleString(),col:'var(--c2)'}]);}
})();
