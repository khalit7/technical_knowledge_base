// ---- Iceberg, step by step tab: real files written by pyiceberg and deltalake (D.ice, D.delta) ----
(function(){
  const $=id=>document.getElementById(id),I=D.ice,DL=D.delta;
  const st={fmt:'ice',k:I.steps.length-1,sel:null};
  const base=p=>p.split('/').pop();
  const short=(p,n)=>{p=base(p);return p.length>n?p.slice(0,8)+'…'+p.slice(-(n-9)):p};
  function steps(){const S=st.fmt==='ice'?I.steps:DL.steps;
    if(st.k>=S.length)st.k=S.length-1;
    $('iceSteps').innerHTML=S.map((s,i)=>'<button data-i="'+i+'"'+(i===st.k?' class="on"':'')+'>'+(i+1)+'. '+RD.esc(s.step)+'</button>').join('');}
  $('iceSteps').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;st.k=+b.dataset.i;st.sel=null;draw()});
  RD.seg($('iceFmt'),v=>{st.fmt=v;st.k=(v==='ice'?I.steps:DL.steps).length-1;st.sel=null;draw()});
  function iceState(){
    const files=[];I.steps.slice(0,st.k+1).forEach((s,i)=>s.files.forEach(f=>files.push(Object.assign({step:i},f))));
    const mjs=files.filter(f=>f.kind==='metadata.json'),cur=mjs[mjs.length-1];
    const snap=cur&&cur.snapshots.find(s=>s.snapshot_id===cur['current-snapshot-id'])||(cur&&cur.snapshots.find(s=>s['snapshot-id']===cur['current-snapshot-id']));
    const live=new Set();if(cur)live.add(cur.path);
    if(snap){const ml=files.find(f=>f.path===snap['manifest-list']);if(ml){live.add(ml.path);
      ml.entries.forEach(e=>{live.add(e.manifest_path);const m=files.find(f=>f.path===e.manifest_path);
        if(m)m.entries.forEach(x=>{if(x.status!=='DELETED')live.add(x.file_path)})})}}
    return {files,live,cur};
  }
  function draw(){
    steps();
    const el=$('iceMap'),W=RD.width(el),narrow=W<560;
    let lanes,state,S;
    if(st.fmt==='ice'){state=iceState();S=I.steps[st.k];
      lanes=[['metadata.json',f=>f.kind==='metadata.json'],['manifest lists',f=>f.kind==='manifest list'],['manifests',f=>f.kind==='manifest'],['data files',f=>f.kind.startsWith('data')]];}
    else{const files=[];DL.steps.slice(0,st.k+1).forEach((s,i)=>s.new_files.forEach(f=>files.push(Object.assign({step:i,kind:f.path.startsWith('_delta_log')?'commit':'data'},f))));
      const live=new Set(files.filter(f=>f.kind==='commit').map(f=>f.path));const rm=new Set();
      files.filter(f=>f.kind==='commit').forEach(f=>(f.actions||[]).forEach(a=>{if(a.remove)rm.add(a.remove.path)}));
      files.filter(f=>f.kind==='data').forEach(f=>{if(![...rm].some(r=>f.path.startsWith(r)))live.add(f.path)});
      state={files,live};S=DL.steps[st.k];
      lanes=[['_delta_log commits',f=>f.kind==='commit'],['data files',f=>f.kind==='data']];}
    const laneW=narrow?W:(W-(lanes.length-1)*10)/lanes.length,bh=34,gap=6;
    let b='',y0=0,maxY=0;
    lanes.forEach((ln,li)=>{const fs=state.files.filter(ln[1]);const x=narrow?0:li*(laneW+10);let y=narrow?y0:0;
      b+=RD.t(x,y+12,ln[0]+' ('+fs.length+')',{fs:11.5,w:600});y+=18;
      fs.forEach(f=>{const isNew=f.step===st.k,isLive=state.live.has(f.path),on=st.sel===f.path;
        b+='<g data-p="'+RD.esc(f.path)+'" style="cursor:pointer"><rect x="'+(x+1)+'" y="'+y+'" width="'+(laneW-2)+'" height="'+bh+'" rx="4" fill="'+(on?'var(--acc2)':'var(--bg)')+'" stroke="'+(isNew?'var(--c2)':'var(--line)')+'" stroke-width="'+(isNew?2.5:1)+'" opacity="'+(isLive?1:0.4)+'"/>'+
          RD.t(x+6,y+14,RD.esc(short(f.path,Math.max(14,Math.floor(laneW/6.6)))),{fs:10.5})+RD.t(x+6,y+28,FMT.mb(f.bytes)+(isLive?'':' (not in current snapshot)')+(isNew?' new':''),{fs:9.5,fill:'var(--mute)'})+'</g>';
        y+=bh+gap});
      maxY=Math.max(maxY,y);if(narrow)y0=y+8;});
    el.innerHTML=RD.svg(W,Math.max(60,narrow?y0:maxY),b,'Files of the table');
    el.querySelectorAll('g[data-p]').forEach(g=>g.addEventListener('click',()=>{st.sel=g.dataset.p;draw()}));
    $('iceWhat').innerHTML='<b>Step '+(st.k+1)+':</b> '+RD.esc(S.what)+'.';
    const nd=state.files.filter(f=>f.kind&&f.kind.startsWith('data')).length;
    $('iceStats').innerHTML=RD.stat('Rows in the table',S.rows_now.toLocaleString(),st.fmt==='ice'?'current snapshot':'version '+S.version)+RD.stat('Files on disk',state.files.length,nd+' data files')+RD.stat('Files in the current version',state.live.size,'the rest serve time travel');
    detail(state);
  }
  function detail(state){
    const d=$('iceDetail');if(!st.sel){d.innerHTML='<span class="mute small">Click a file above to see what is inside it.</span>'+tt();return}
    const f=state.files.find(x=>x.path===st.sel);if(!f){d.innerHTML='';return}
    let h='<h3 style="overflow-wrap:anywhere">'+RD.esc(base(f.path))+'</h3><div class="small mute" style="overflow-wrap:anywhere">'+RD.esc(f.path)+', '+f.bytes.toLocaleString()+' bytes</div>';
    if(f.kind==='metadata.json'){h+='<dl class="kv"><dt>format-version</dt><dd>'+f['format-version']+'</dd><dt>current-snapshot-id</dt><dd>'+(f['current-snapshot-id']==null?'none (empty table)':f['current-snapshot-id'])+'</dd><dt>schemas</dt><dd>'+f.schemas.map(s=>'schema '+s['schema-id']+': '+s.fields.join(', ')).join('<br>')+'</dd><dt>partition specs</dt><dd>'+f['partition-specs'].map(s=>'spec '+s['spec-id']+': '+(s.fields.join(', ')||'unpartitioned')).join('<br>')+' (default: '+f['default-spec-id']+')</dd><dt>snapshots</dt><dd>'+(f.snapshots.map(s=>s['snapshot-id']+' '+s.operation+', '+Object.entries(s.summary).map(e=>e[0]+' '+e[1]).join(', ')).join('<br>')||'none')+'</dd><dt>metadata-log</dt><dd>'+(f['metadata-log'].length+' earlier metadata files')+'</dd></dl>'}
    else if(f.kind==='manifest list')h+='<p class="small">Avro. One row per manifest in this snapshot:</p><ul class="tight small">'+f.entries.map(e=>'<li style="overflow-wrap:anywhere">'+RD.esc(base(e.manifest_path))+': added files '+e.added_files+', existing '+e.existing_files+', deleted '+e.deleted_files+', added rows '+e.added_rows+', sequence '+e.sequence_number+', spec '+e.partition_spec_id+'</li>').join('')+'</ul>';
    else if(f.kind==='manifest')h+='<p class="small">Avro. One row per data file, with its status and column bounds:</p><ul class="tight small">'+f.entries.map(e=>'<li style="overflow-wrap:anywhere"><b>'+e.status+'</b> '+RD.esc(base(e.file_path))+': partition '+JSON.stringify(e.partition)+', '+e.record_count.toLocaleString()+' rows, '+e.file_size_in_bytes.toLocaleString()+' bytes; created_at '+e.created_at_min+' to '+e.created_at_max+'; chat_id '+e.chat_id_min+' to '+e.chat_id_max+'</li>').join('')+'</ul>'+(f.entries.some(e=>JSON.stringify(e.partition).includes('674'))?'<p class="small">Month partitions are stored as months since January 1970: 674 is March 2026.</p>':'');
    else if(f.kind==='commit')h+='<p class="small">One JSON action per line (stats trimmed to two columns):</p><pre class="fm" style="font-size:11.5px;white-space:pre-wrap;overflow-wrap:anywhere">'+RD.esc(f.actions.map(a=>JSON.stringify(a)).join('\n'))+'</pre>';
    else h+='<p class="small">An ordinary Parquet file. The table format never changes it; it only lists it in, or drops it from, a version.</p>';
    d.innerHTML=h+tt();
  }
  function tt(){
    if(st.fmt==='ice')return '<p class="small"><b>Time travel, run:</b> reading snapshot '+I.tt.snapshot_id+' (step 2) returned '+I.tt.rows.toLocaleString()+' rows and columns '+I.tt.columns.join(', ')+'; the current snapshot has '+I.tt.now_rows.toLocaleString()+' rows and adds <code>lang</code>. A scan filtered on 2026-03-02 planned '+I.plan.length+' data file: '+RD.esc(base(I.plan[0]))+'.</p>';
    return '<p class="small"><b>Time travel, run:</b> reading version 0 returned '+DL.tt.rows.toLocaleString()+' rows and columns '+DL.tt.columns.join(', ')+'.</p>';
  }
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-ice']=window.TAB_RENDER['t-ice']||[]).push(draw);
  addEventListener('resize',()=>{const t=$('t-ice');if(t&&!t.hidden)draw()});
  draw();
})();
