// ---- Fig. 4 (section 9): a real table format, commit by commit (D.ice: pyiceberg 0.12.0; D.delta: deltalake 1.6.6), flat (2026-11-19: was a 3D stage
// with the file kinds as lanes in depth; rows on a page read the same tree without perspective). One row per kind of file (catalog, metadata.json,
// manifest lists, manifests, data files for Iceberg; the _delta_log and data files for Delta), one column per commit in the order it was written.
// The catalog's pointer picks the current metadata; lines then follow the tree down to the files that are the table; superseded files fade. ----
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
  const card=document.getElementById('an-ice-card');if(!card||!window.D||!D.ice)return;
  const I=D.ice,DL=D.delta,base=p=>p.split('/').pop();let mode='ice';
  // every Iceberg file once, with the step that wrote it and a slot within its row at that step
  const IF=[];I.steps.forEach((s,k)=>{const n={};s.files.forEach(f=>{const ln=f.kind==='metadata.json'?'meta':f.kind==='manifest list'?'ml':f.kind==='manifest'?'man':'data';
    const j=n[ln]=(n[ln]||0)+1;IF.push(Object.assign({k,ln,j:j-1,nj:0},f))})});
  IF.forEach(f=>f.nj=IF.filter(g=>g.k===f.k&&g.ln===f.ln).length);
  function iceLive(k){const fs=IF.filter(f=>f.k<=k),mjs=fs.filter(f=>f.ln==='meta'),cur=mjs[mjs.length-1],live=new Map();if(!cur)return {cur,live};
    live.set(cur.path,null);const sid=cur['current-snapshot-id'],snap=cur.snapshots.find(s=>(s['snapshot-id']||s.snapshot_id)===sid);
    if(snap){const ml=fs.find(f=>f.path===snap['manifest-list']);if(ml){live.set(ml.path,cur);ml.entries.forEach(e=>{const m=fs.find(f=>f.path===e.manifest_path);if(!m)return;live.set(m.path,ml);
      m.entries.forEach(x=>{if(x.status!=='DELETED'){const d=fs.find(f=>f.path===x.file_path||x.file_path.endsWith(base(f.path)));if(d)live.set(d.path,m)}})})}}
    return {cur,live}}
  // the path a time-travel read takes: snapshot 1's manifest list, its manifest and the original data file
  const ttPath=['manifest list','manifest','data file (Parquet)'].map(kd=>IF.find(f=>f.k===1&&f.kind===kd));
  // Delta: the log's commits and the data files they add or remove
  const DF=[];DL.steps.forEach((s,k)=>s.new_files.forEach(f=>DF.push(Object.assign({k,ln:f.path.startsWith('_delta_log')?'log':'data'},f))));
  function delLive(k){const fs=DF.filter(f=>f.k<=k),rm=new Set();fs.filter(f=>f.ln==='log').forEach(f=>(f.actions||[]).forEach(a=>{if(a.remove)rm.add(a.remove.path)}));
    return {fs,live:new Set(fs.filter(f=>f.ln==='data'&&![...rm].some(r=>f.path.endsWith(r)||f.path.startsWith(r))).map(f=>f.path))}}
  const SHORT=['create','append','append','add col','append','delete','evolve','append'];
  function draw(k){const el=document.getElementById('an-ice'),W=RD.width(el),ph=W<520;
    el.innerHTML=mode==='ice'?drawIce(k,W,ph):drawDelta(k,W,ph)}
  function drawIce(k,W,ph){const TT=k>=I.steps.length,kk=Math.min(k,I.steps.length-1),S=iceLive(kk);let s='';
    const LW=ph?0:128,NC=I.steps.length,cw=(W-LW-4)/NC,cx=c=>LW+cw*(c+.5);
    const ROWS=[['cat','catalog',26],['meta','metadata.json',28],['ml','manifest lists',28],['man','manifests',28],['data','data files (Parquet)',40]];
    const RG=ph?30:22;let y=ph?36:22;const RY={};
    // commit headers
    for(let c=0;c<NC;c++){const on=c===kk&&!TT;s+=text(cx(c),12,ph?String(c+1):(c+1)+' '+SHORT[c],{a:'middle',fs:ph?11.5:11,w:on?700:400,c:on?'var(--c2)':'var(--mute)'})}
    ROWS.forEach(([id,nm,h])=>{RY[id]=[y,h];if(ph)s+=text(2,y-4,nm,{fs:11,c:'var(--mute)'});else s+=text(LW-8,y+h/2+4,nm,{a:'end',fs:11.5,mono:1,c:'var(--mute)'});y+=h+RG});
    // the catalog: one pointer per table, to the current metadata.json (it moves on every commit)
    const [cy,ch]=RY.cat,catW=ph?64:84;s+=rect(LW+2,cy,catW,ch,{fill:'var(--c2)',fo:.18,s:'var(--c2)',r:5})+text(LW+2+catW/2,cy+17,'catalog',{a:'middle',fs:12,w:700,c:'var(--c2)'});
    const pos=f=>{const [ry,rh]=RY[f.ln],bw=Math.min(cw*.8/f.nj,f.ln==='data'?30:26),x=cx(f.k)-(f.nj*bw+(f.nj-1)*3)/2+f.j*(bw+3);return {x,y:ry,w:bw,h:rh}};
    const ctr=(f,top)=>{const p=pos(f);return [p.x+p.w/2,top?p.y:p.y+p.h]};
    // a reader follows the tree down from the current metadata to the files that are the table (lines), or, in time travel, snapshot 1's branch
    if(!TT)S.live.forEach((par,path)=>{if(!par)return;const c=IF.find(f=>f.path===path),a=ctr(par,0),b=ctr(c,1);s+=line(a[0],a[1],b[0],b[1],{c:'var(--c1)',sw:1.3,op:.75,cl:c.k===kk?'rd-new':''})});
    else{let pr=S.cur;ttPath.forEach(c=>{const a=ctr(pr,0),b=ctr(c,1);s+=line(a[0],a[1],b[0],b[1],{c:'var(--c4)',sw:2.2,cl:'rd-new'});pr=c})}
    IF.filter(f=>f.k<=kk).forEach(f=>{const isNew=f.k===kk&&!TT,isLive=S.live.has(f.path),tt=TT&&(ttPath.includes(f)||f===S.cur),p=pos(f);
      const op=TT?(tt?1:.25):isLive||isNew?1:.28,fill=isNew?'var(--c2)':f.ln==='data'?'var(--c1)':'var(--soft)';
      s+=rect(p.x,p.y,p.w,p.h,{fill,fo:isNew?.45:f.ln==='data'?.3:1,s:isNew?'var(--c2)':tt?'var(--c4)':'var(--ink)',sw:isNew||tt?1.6:.8,r:3,op,cl:isNew?'rd-new':''});
      if(isNew&&!ph&&f.j===0){const sib=IF.filter(g=>g.k===f.k&&g.ln===f.ln),q=pos(sib[sib.length-1]);
        s+=text((p.x+q.x+q.w)/2,p.y+p.h+12,sib.map(g=>(g.bytes/1000).toFixed(1)).join(' + ')+' KB',{a:'middle',fs:11,mono:1,c:'var(--c2)',w:600,cl:'rd-new'})}});
    if(S.cur){const p=pos(S.cur),tx=p.x+p.w/2,y0=cy+ch/2,x0=LW+2+catW;
      const d=tx>x0+6?'M'+fx(x0)+','+fx(y0)+' H'+fx(tx)+' V'+fx(p.y-6):'M'+fx(tx)+','+fx(cy+ch)+' V'+fx(p.y-6);
      s+='<path d="'+d+'" fill="none" stroke="var(--c2)" stroke-width="2"/>'+arrow(tx,p.y-12,tx,p.y-1,{c:'var(--c2)',sw:2});
      if(!TT&&!ph)s+=text(tx+(tx>W-120?-6:6),y0-6,base(S.cur.path).slice(0,5)+' is current',{a:tx>W-120?'end':'start',fs:11.5,mono:1,w:700,c:'var(--c2)'})}
    if(TT){const p=pos(ttPath[2]);s+=text(p.x,p.y+p.h+14,'snapshot 1: 28,800 rows',{fs:12.5,w:700,mono:1,c:'var(--c4)',cl:'rd-new'})}
    return RD.svg(W,y+(TT?6:0),s,'Iceberg table, commit by commit')}
  function drawDelta(k,W,ph){const TT=k>=DL.steps.length,kk=Math.min(k,DL.steps.length-1),S=delLive(kk);let s='';
    const LW=ph?0:128,NC=DL.steps.length,cw=(W-LW-4)/NC,cx=c=>LW+cw*(c+.5),ly=ph?44:34,lh=30,dy=ly+lh+(ph?56:50),dh=44;
    for(let c=0;c<NC;c++){const on=c===kk&&!TT;s+=text(cx(c),12,'commit '+c,{a:'middle',fs:11.5,w:on?700:400,c:on?'var(--c2)':'var(--mute)'})}
    if(ph){s+=text(2,ly-6,'_delta_log commits',{fs:11,c:'var(--mute)'})+text(2,dy-6,'data files (Parquet)',{fs:11,c:'var(--mute)'})}
    else s+=text(LW-8,ly+lh/2+4,'_delta_log commits',{a:'end',fs:11.5,mono:1,c:'var(--mute)'})+text(LW-8,dy+dh/2+4,'data files (Parquet)',{a:'end',fs:11.5,mono:1,c:'var(--mute)'});
    const logs=S.fs.filter(f=>f.ln==='log'),upto=TT?1:logs.length,bw=Math.min(cw*.6,60);
    // a reader replays the log in order, then reads the data files still added and not removed
    for(let i=1;i<upto;i++)s+=arrow(cx(i-1)+bw/2,ly+lh/2,cx(i)-bw/2,ly+lh/2,{c:'var(--c1)',sw:1.6});
    if(!TT)S.fs.filter(f=>f.ln==='data'&&S.live.has(f.path)).forEach(f=>{s+=line(cx(logs.length-1),ly+lh,cx(f.k),dy,{c:'var(--c1)',sw:1.3,op:.75,cl:f.k===kk?'rd-new':''})});
    else s+=line(cx(0),ly+lh,cx(0),dy,{c:'var(--c4)',sw:2.2,cl:'rd-new'});
    S.fs.forEach(f=>{const isNew=f.k===kk&&!TT,tt=TT&&f.k===0,op=TT?(tt?1:.25):f.ln==='log'||S.live.has(f.path)?1:.28;
      const fill=isNew?'var(--c2)':f.ln==='data'?'var(--c1)':'var(--soft)',y=f.ln==='log'?ly:dy,h=f.ln==='log'?lh:dh;
      s+=rect(cx(f.k)-bw/2,y,bw,h,{fill,fo:isNew?.45:f.ln==='data'?.3:1,s:isNew?'var(--c2)':tt?'var(--c4)':'var(--ink)',sw:isNew||tt?1.6:.8,r:3,op,cl:isNew?'rd-new':''});
      if(f.ln==='log')s+=text(cx(f.k),y+lh/2+4,String(f.k).padStart(2,'0')+'.json',{a:'middle',fs:11.5,mono:1,w:600,c:isNew?'var(--c2)':'var(--ink)',op:Math.max(.4,op)});
      if(isNew)s+=text(cx(f.k),y+h+13,(f.bytes/1000).toFixed(f.ln==='data'?0:1)+' KB',{a:'middle',fs:11,mono:1,w:600,c:'var(--c2)',cl:'rd-new'})});
    let yb=dy+dh+20;if(TT){s+=text(cx(0)-bw/2,yb+12,'version 0: 28,800 rows',{fs:12.5,w:700,mono:1,c:'var(--c4)',cl:'rd-new'});yb+=18}
    return RD.svg(W,yb,s,'Delta table, commit by commit')}
  const an=RD.anim({card:'an-ice-card',ctl:'an-ice-ctl',n:I.steps.length+1,ms:5200,draw,label:'Commit step',list:'sx-ice'});
  RD.onResize(()=>an.redraw());
  const seg=document.getElementById('iceFmt3');
  if(seg)seg.querySelectorAll('button').forEach(b=>b.onclick=()=>{mode=b.dataset.m;seg.querySelectorAll('button').forEach(y=>y.classList.toggle('on',y===b));
    document.getElementById('sx-ice').hidden=mode!=='ice';document.getElementById('sx-delta').hidden=mode==='ice';an.reset(mode==='ice'?I.steps.length+1:DL.steps.length+1,mode==='ice'?'sx-ice':'sx-delta')});
})();
