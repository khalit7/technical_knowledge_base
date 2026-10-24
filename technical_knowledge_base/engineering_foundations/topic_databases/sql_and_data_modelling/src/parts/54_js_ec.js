// ---- Reading, section 11: expand and contract, renaming chats.title to chats.name (stepper) ----
(function(){
  const el=document.getElementById('rd-ec');if(!el)return;
  // per step: schema state of [title, name], then the code versions running, each with what it does to [title, name]
  const F=[
    {st:['has data','absent'],run:[['v1',['read, write','']]],ch:[],
     cap:'Start: chats.title exists and every running copy of the application (v1) reads and writes it.'},
    {st:['has data','added, NULL'],run:[['v1',['read, write','']]],ch:[[0,1]],sql:'ALTER TABLE chats ADD COLUMN name text;',
     cap:'1. Expand: add the new column. Metadata only, so the ACCESS EXCLUSIVE lock is held for milliseconds (with lock_timeout set). v1 does not know the column exists and keeps working.'},
    {st:['has data','new writes only'],run:[['v1',['read, write','']],['v2',['read, write','write']]],ch:[[2,1]],
     cap:'2. Write both: deploy v2, which writes title and name (or add a trigger that copies one to the other). During the rolling deploy v1 and v2 run together; both still read title, so both are correct.'},
    {st:['has data','backfilled'],run:[['v2',['read, write','write']]],ch:[[0,1]],sql:'UPDATE chats SET name = title\nWHERE id BETWEEN $1 AND $2 AND name IS NULL;',
     cap:'3. Backfill in batches, once no v1 is left writing title alone: copy old rows a few thousand per transaction with a pause between batches, so no lock or replication lag builds up. Now every row has name.'},
    {st:['has data','has data'],run:[['v2',['read, write','write']],['v3',['write','read, write']]],ch:[[2,2]],
     cap:'4. Read the new column: deploy v3, which reads name and still writes both, so the v2 copies running beside it stay correct.'},
    {st:['has data, unread','has data'],run:[['v3',['write','read, write']],['v4',['','read, write']]],ch:[[2,1]],
     cap:'5. Stop writing the old column once no running version reads it: v4 uses name only.'},
    {st:['dropped','has data'],run:[['v4',['','read, write']]],ch:[[0,0]],sql:'ALTER TABLE chats DROP COLUMN title;',
     cap:'6. Contract: drop the old column, a release or more later. Every step could be rolled back by redeploying the previous code; RENAME COLUMN in one step would have broken every running v1 at once.'}];
  function draw(i){
    const f=F[i],W=RD.width(el),narrow=W<480,lw=narrow?84:150,cw=Math.floor((W-lw-8)/2),rh=34;
    const ch=(r,c)=>f.ch.some(x=>x[0]===r&&x[1]===c);
    let s=RD.t(lw+cw/2,14,'chats.title',{fs:12,a:'middle',w:600,mono:1})+RD.t(lw+cw+cw/2,14,'chats.name',{fs:12,a:'middle',w:600});
    const rows=[['schema',f.st]].concat(f.run.map(r=>[r[0]+' code',r[1]]));
    rows.forEach((r,k)=>{const y=22+k*rh;
      s+=RD.t(0,y+20,r[0],{fs:12,w:600,fill:k?'var(--c4)':'var(--ink)'});
      r[1].forEach((v,c)=>{const x=lw+c*cw,hot=ch(k,c),gone=v==='absent'||v==='dropped'||v==='';
        s+='<rect x="'+(x+3)+'" y="'+(y+2)+'" width="'+(cw-6)+'" height="'+(rh-6)+'" rx="5" fill="'+(gone?'var(--bg)':k?'var(--soft)':'var(--acc2)')+'" stroke="'+(hot?'var(--acc)':'var(--line)')+'" stroke-width="'+(hot?2.2:1)+'"'+(gone?' stroke-dasharray="3 3"':'')+'/>';
        s+=RD.t(x+cw/2,y+20,v===''?'not used':v,{fs:11.5,a:'middle',fill:gone?'var(--mute)':(v==='dropped'?'var(--bad)':'')})});
    });
    const H=22+rows.length*rh+4;
    el.innerHTML=RD.svg(W,22+3*rh+4,s,'Expand and contract, step '+i)+(f.sql?'<pre class="code" style="margin:4px 0">'+RD.esc(f.sql)+'</pre>':'');
    document.getElementById('rd-ec-cap').innerHTML='<div class="t">Step '+i+' of '+(F.length-1)+'</div><p>'+f.cap+'</p>';
  }
  RD.anim({card:'rd-ec-card',ctl:'rd-ec-ctl',n:F.length,ms:2600,label:'Step',draw});
})();
