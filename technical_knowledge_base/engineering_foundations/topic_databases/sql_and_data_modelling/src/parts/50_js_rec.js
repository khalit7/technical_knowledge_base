// ---- Reading, section 5: WITH RECURSIVE walking chat 11's thread upwards, one iteration per step (stepper on the real rows) ----
(function(){
  const el=document.getElementById('rd-rec');if(!el)return;
  const D=window.SM_DATA;
  const R=D.msgs.filter(m=>m[1]===11).sort((a,b)=>a[0]-b[0]).map((m,i,a)=>({id:m[0],role:m[2]?'assistant':'user',parent:i?a[i-1][0]:null}));
  const chain=R.slice().reverse(); // the walk: last message first, then each parent
  const n=chain.length,STEPS=n+1;
  document.getElementById('rd-rec-sql').textContent="WITH RECURSIVE up(id, parent_id, depth) AS (\n  SELECT id, parent_id, 0 FROM messages WHERE id = "+chain[0].id+"   -- anchor\n  UNION ALL\n  SELECT m.id, m.parent_id, up.depth + 1                 -- step: join the rows\n  FROM messages m JOIN up ON m.id = up.parent_id         -- added last time\n)\nSELECT * FROM up;";
  function draw(i){
    const W=RD.width(el),bw=W<420?58:74,bh=40,g=6,per=Math.max(3,Math.floor((W+g)/(bw+g)));
    let s='';
    chain.forEach((m,k)=>{const x=(k%per)*(bw+g),y=Math.floor(k/per)*(bh+18);
      const inRes=k<=i&&k<n,isNew=k===i&&i<n;
      s+='<rect x="'+x+'" y="'+y+'" width="'+bw+'" height="'+bh+'" rx="6" fill="'+(isNew?'var(--acc2)':inRes?'var(--soft)':'var(--bg)')+'" stroke="'+(isNew?'var(--acc)':inRes?'var(--line)':'var(--dim)')+'" stroke-width="'+(isNew?2:1)+'"'+(inRes?'':' stroke-dasharray="3 3"')+'/>';
      s+=RD.t(x+bw/2,y+16,m.id,{fs:11.5,a:'middle',w:inRes?600:400,fill:inRes?'':'var(--mute)'});
      s+=RD.t(x+bw/2,y+31,inRes?'depth '+k:'parent '+(m.parent===null?'NULL':m.parent),{fs:10.5,a:'middle',fill:'var(--mute)'});
      if(k<n-1&&(k+1)%per!==0)s+='<path d="M'+(x+bw)+','+(y+bh/2)+' l'+g+',0" stroke="var(--mute)"/>'});
    const rows=Math.ceil(n/per),H=rows*(bh+18);
    el.innerHTML=RD.svg(W,H,s,'The rows WITH RECURSIVE has added after iteration '+i);
    const added=i<n?1:0,res=Math.min(i+1,n);
    document.getElementById('rd-rec-cnt').innerHTML=RD.stat('Iteration',i===0?'anchor':i)+RD.stat('Rows added this time',added)+RD.stat('Rows in the result',res);
    let cap;
    if(i===0)cap='The anchor runs once: message '+chain[0].id+', the last of chat 11, enters the result and becomes the working table (outlined).';
    else if(i<n-1)cap='The step joins messages to the working table on m.id = up.parent_id: only message '+chain[i-1].id+' is in it, so it finds its parent '+chain[i].id+', one row, which replaces the working table. Earlier rows are not joined again.';
    else if(i===n-1)cap='Message '+chain[i].id+' is the chat’s first message: it enters the result, and its parent_id is NULL.';
    else cap='The step joins on m.id = NULL, which is never true (section 1), so it adds no rows and the recursion stops with '+n+' rows. A cycle in parent_id would never reach this step: hence the depth limit or CYCLE clause below.';
    document.getElementById('rd-rec-cap').innerHTML='<div class="t">Step '+(i+1)+' of '+STEPS+'</div><p>'+cap+'</p>';
  }
  RD.anim({card:'rd-rec-card',ctl:'rd-rec-ctl',n:STEPS,ms:900,label:'Iteration',draw});
})();
