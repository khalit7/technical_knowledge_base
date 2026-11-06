// ---- Scene, Fig. 4 (section 9): a real table format, commit by commit (D.ice: pyiceberg 0.12.0; D.delta: deltalake 1.6.6), renderer v2 ----
// Files stand in lanes front to back (catalog, metadata.json, manifest lists, manifests, data files for Iceberg; the _delta_log and data files for Delta),
// left to right in the order they were written. The catalog's pointer picks the current metadata; dots then follow the tree down to the files that are the table.
(function(){
  if(!document.getElementById('stg-ice'))return;const {at,off,lerp,mix}=S3;
  const I=D.ice,DL=D.delta,base=p=>p.split('/').pop();let mode='ice';
  const XS=1.12,X0=-4.2,ZL={cat:-2.7,meta:-1.6,ml:-.55,man:.5,data:1.65},HT={cat:.5,meta:.32,ml:.36,man:.4,data:.75,commit:.32};
  // every Iceberg file once, with the step that wrote it and a slot within its lane at that step
  const IF=[];I.steps.forEach((s,k)=>{const n={};s.files.forEach(f=>{const ln=f.kind==='metadata.json'?'meta':f.kind==='manifest list'?'ml':f.kind==='manifest'?'man':'data';
    const j=n[ln]=(n[ln]||0)+1;IF.push(Object.assign({k,ln,j:j-1},f))})});
  const ix=f=>X0+f.k*XS+f.j*.42;
  function iceLive(k){const fs=IF.filter(f=>f.k<=k),mjs=fs.filter(f=>f.ln==='meta'),cur=mjs[mjs.length-1],live=new Map();if(!cur)return {cur,live};
    live.set(cur.path,null);const sid=cur['current-snapshot-id'],snap=cur.snapshots.find(s=>(s['snapshot-id']||s.snapshot_id)===sid);
    if(snap){const ml=fs.find(f=>f.path===snap['manifest-list']);if(ml){live.set(ml.path,cur);ml.entries.forEach(e=>{const m=fs.find(f=>f.path===e.manifest_path);if(!m)return;live.set(m.path,ml);
      m.entries.forEach(x=>{if(x.status!=='DELETED'){const d=fs.find(f=>f.path===x.file_path||x.file_path.endsWith(base(f.path)));if(d)live.set(d.path,m)}})})}}
    return {cur,live,fs}}
  // the path a time-travel read takes: snapshot 1's manifest list, its manifest and the original data file
  const ttPath=['manifest list','manifest','data file (Parquet)'].map(kd=>IF.find(f=>f.k===1&&f.kind===kd));
  // Delta: the log's commits and the data files they add or remove
  const DF=[];DL.steps.forEach((s,k)=>s.new_files.forEach(f=>DF.push(Object.assign({k,ln:f.path.startsWith('_delta_log')?'log':'data'},f))));
  function delLive(k){const fs=DF.filter(f=>f.k<=k),rm=new Set();fs.filter(f=>f.ln==='log').forEach(f=>(f.actions||[]).forEach(a=>{if(a.remove)rm.add(a.remove.path)}));
    return {fs,live:new Set(fs.filter(f=>f.ln==='data'&&![...rm].some(r=>f.path.endsWith(r)||f.path.startsWith(r))).map(f=>f.path))}}
  const DX=k=>-2.6+k*1.75,DZ={log:-.9,data:1.1};
  const lane=(R,z,t,a)=>R.label([X0-1.5,.15,z],t,{al:'right',dx:-4,mono:true,fs:12,c:R.P.mute,a,grp:'lanes'});
  function drawIce(R,k,e){const P=R.P,TT=k>=I.steps.length,kk=Math.min(k,I.steps.length-1),S=iceLive(kk);
    [['meta','metadata.json'],['ml','manifest lists'],['man','manifests'],['data','data files (Parquet)']].forEach(([l,t])=>lane(R,ZL[l],t,1));
    // the catalog: one pointer per table
    const CX=X0-1.1;R.box([CX,0,ZL.cat],[.7,HT.cat,.6],{fill:mix(P.paper,P.c2,.25)});R.label([CX,HT.cat,ZL.cat],'catalog',{b:1,fs:12.5,dy:-11,c:P.c2});
    IF.filter(f=>f.k<=kk).forEach(f=>{const isNew=f.k===kk&&!TT,isLive=S.live.has(f.path),tt=TT&&(ttPath.includes(f)||f===S.cur);
      const a=isNew?e:TT?(tt?1:.22):isLive?1:.28,fill=isNew?mix(P.paper,P.c2,.45):f.ln==='data'?mix(P.paper,P.c1,.3):P.paper;
      R.box([ix(f),0,ZL[f.ln]],[f.ln==='data'?.36:.32,HT[f.ln],f.ln==='data'?.62:.42],{fill,a,shadow:a>.5});
      if(isNew)R.label([ix(f),HT[f.ln],ZL[f.ln]],(f.bytes/1000).toFixed(1)+' KB',{mono:true,fs:12,dy:-11-f.j*15,c:P.c2,a:e})});
    // the pointer: catalog to the current metadata.json (it moves on every commit)
    if(S.cur){const to=[ix(S.cur),HT.meta,ZL.meta],fr=[CX,HT.cat,ZL.cat];R.arc(fr,to,.5,{c:P.c2,w:2.2,head:7,top:1,a:1});
      if(!TT)R.label(to,base(S.cur.path).slice(0,5)+' is current',{mono:true,fs:12,dy:-44,b:1,c:P.c2,wide:1})}
    // a reader follows the tree down from the current metadata to the files that are the table (dots), or, in time travel, snapshot 1's branch
    const fa=TT?e:k===0?0:.85;
    if(!TT)S.live.forEach((par,path)=>{if(!par)return;const c=IF.find(f=>f.path===path);R.flowArc([ix(par),HT[par.ln],ZL[par.ln]],[ix(c),HT[c.ln],ZL[c.ln]],.25,{c:P.c1,a:fa*(c.k===kk?e:1),r:.05,n:4,speed:1})});
    else{let pr=S.cur;ttPath.forEach(c=>{R.flowArc([ix(pr),HT[pr.ln],ZL[pr.ln]],[ix(c),HT[c.ln],ZL[c.ln]],.3,{c:P.c4,a:e,r:.06,n:5,speed:1});pr=c});
      R.label([ix(ttPath[2]),HT.data,ZL.data],'snapshot 1: 28,800 rows',{mono:true,fs:12.5,b:1,dy:-12,c:P.c4,a:e})}
  }
  function drawDelta(R,k,e){const P=R.P,TT=k>=DL.steps.length,kk=Math.min(k,DL.steps.length-1),S=delLive(kk);
    lane(R,DZ.log,'_delta_log commits',1);lane(R,DZ.data,'data files (Parquet)',1);
    S.fs.forEach(f=>{const isNew=f.k===kk&&!TT,tt=TT&&f.k===0,a=isNew?e:TT?(tt?1:.22):f.ln==='log'||S.live.has(f.path)?1:.28;
      const fill=isNew?mix(P.paper,P.c2,.45):f.ln==='data'?mix(P.paper,P.c1,.3):P.paper;
      R.box([DX(f.k),0,DZ[f.ln]],f.ln==='data'?[.5,.75,.7]:[.6,.32,.5],{fill,a});
      if(f.ln==='log')R.label([DX(f.k),.32,DZ.log],String(f.k).padStart(2,'0')+'.json',{mono:true,fs:12,dy:-11,c:isNew?P.c2:P.mute,a:Math.max(.4,a)});
      if(isNew&&f.ln==='data')R.label([DX(f.k),.75,DZ.data],(f.bytes/1000).toFixed(0)+' KB',{mono:true,fs:12,dy:-11,c:P.c2,a:e})});
    // a reader replays the log in order, then reads the data files still added and not removed
    const logs=S.fs.filter(f=>f.ln==='log'),upto=TT?1:logs.length;
    for(let i=1;i<upto;i++)R.flowArc([DX(i-1),.34,DZ.log],[DX(i),.34,DZ.log],.25,{c:P.c1,a:.8,r:.05,n:4,speed:1});
    if(!TT)S.fs.filter(f=>f.ln==='data'&&S.live.has(f.path)).forEach(f=>R.flowArc([DX(logs.length-1),.34,DZ.log],[DX(f.k),.75,DZ.data],.35,{c:P.c1,a:.7*(f.k===kk?e:1),r:.05,n:4,speed:1}));
    else{R.flowArc([DX(0),.34,DZ.log],[DX(0),.75,DZ.data],.35,{c:P.c4,a:e,r:.06,n:5,speed:1});R.label([DX(0),.75,DZ.data],'version 0: 28,800 rows',{mono:true,fs:12.5,b:1,dy:-12,c:P.c4,a:e})}
  }
  const fullI={cam:[.2,.72],bounds:[[X0-1.6,0,-3.1],[X0+7*XS+.7,1,2.1]]},fullD={cam:[.3,.7],bounds:[[-3.3,0,-1.4],[3.4,1,1.6]]};
  const st=S3.stage({id:'stg-ice',list:'sx-ice',fig:'Fig. 4 · a real table, commit by commit',cam:fullI.cam,bounds:()=>mode==='ice'?fullI.bounds:fullD.bounds,aspect:.62,dur:1400,hold:5200,
    draw:(R,k,e)=>{R.grid(-6,5,-3.4,2.6,.5);(mode==='ice'?drawIce:drawDelta)(R,k,e)},
    margin:w=>w<520?[16,10,16,10]:[20,14,16,150],
    // each Iceberg commit step moves in towards the files it wrote; the time-travel step shows the whole table
    view:k=>{if(mode!=='ice')return {cam:fullD.cam,bounds:fullD.bounds};if(k>=I.steps.length)return fullI;const xc=X0+Math.max(k,1)*XS;return {cam:[.24,.66],bounds:[[Math.max(X0-1.6,xc-3.4),0,-3.1],[Math.min(X0+7*XS+.7,xc+1.3),1,2.1]]}}});
  const seg=document.getElementById('iceFmt3');
  if(seg)seg.querySelectorAll('button').forEach(b=>b.onclick=()=>{mode=b.dataset.m;seg.querySelectorAll('button').forEach(y=>y.classList.toggle('on',y===b));
    document.getElementById('sx-ice').hidden=mode!=='ice';document.getElementById('sx-delta').hidden=mode==='ice';st.list(mode==='ice'?'sx-ice':'sx-delta')});
})();
