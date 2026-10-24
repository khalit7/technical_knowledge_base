// ---- Section 6: Cassandra write path at QUORUM with one replica down (stepper; layout illustrative, rules from the Cassandra docs) ----
(function(){
  const svgEl=document.getElementById('rd-wp-svg');if(!svgEl)return;
  const T=RD.t,A='var(--acc)',L='var(--line)',M='var(--mute)',S='var(--soft)';
  const CAP=[
    ['The client sends one write to any node','<code>INSERT</code> of a message into partition (7, 3). Whichever node receives it becomes the <b>coordinator</b> for this request; there is no primary to find.'],
    ['Hash the partition key','The coordinator hashes (7, 3) to a token; the ring says replicas A, B and C own it. C is down.'],
    ['Each live replica logs, then buffers','A and B append the write to their <b>commit log</b> and insert it into their <b>memtable</b> (sorted, in memory). The default <code>commitlog_sync: periodic</code> flushes the log every 10 seconds, so the write is not yet on disk on either node.'],
    ['Two of three is a QUORUM: reply OK','RF = 3, so QUORUM = floor(3/2) + 1 = 2. A and B answered, the coordinator replies OK. At <code>ONE</code> it would reply after the first answer; at <code>ALL</code> this write would fail, because C is down.'],
    ['C gets a hint, not a failure','The coordinator stores a <b>hint</b> for C on its own disk and replays it when C comes back, if that is within <code>max_hint_window</code> (3 hours by default). After longer, C stays out of sync until read repair or a full repair copies the write.'],
    ['Later: flush and compaction','Each memtable is flushed to an immutable SSTable and compaction merges files in the background ({{Storage engines and indexes|n:3cd5c17b0d0d8102bc1fd11b22606e1a}} owns how). A read at QUORUM asks two replicas and keeps the newest timestamp.']];
  function draw(i){const w=RD.width(svgEl),narrow=w<520,h=narrow?250:200;let s='';
    const bx=(x,y,bw,bh,lab,o)=>{o=o||{};return '<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+bh+'" rx="5" fill="'+(o.on?'var(--hl)':o.dead?'var(--soft)':S)+'" stroke="'+(o.dead?'var(--bad)':o.on?A:L)+'" stroke-width="'+(o.on||o.dead?1.8:1)+'"'+(o.dead?' stroke-dasharray="5 3"':'')+'/>'+(lab?T(x+bw/2,y+15,lab,{a:'middle',fs:11,w:600,fill:o.dead?'var(--bad)':'var(--ink)'}):'')};
    const ar=(x1,y1,x2,y2,on,lab,ly)=>'<line x1="'+x1.toFixed(1)+'" y1="'+y1.toFixed(1)+'" x2="'+x2.toFixed(1)+'" y2="'+y2.toFixed(1)+'" stroke="'+(on?A:L)+'" stroke-width="'+(on?2.2:1.2)+'"/>'+(lab?T((x1+x2)/2,ly!=null?ly:(y1+y2)/2-5,lab,{a:'middle',fs:10.5,fill:on?A:M}):'');
    const cw=narrow?(w-20)*0.42:Math.min(130,w*0.2), rw=narrow?(w-20)*0.5:Math.min(250,w*0.42);
    const cx=10, coX=narrow?10:cx+cw+30, rX=w-rw-10;
    if(!narrow){s+=bx(cx,80,cw,32,'client',{on:i===0||i===3})}
    else s+=bx(10,4,cw,26,'client',{on:i===0||i===3});
    const coY=narrow?96:80;s+=bx(coX,coY,cw,32,'coordinator',{on:i<=1||i===3});
    if(i>=4)s+=bx(coX,coY+40,cw,24,'hint for C',{on:i===4});
    if(i>=1)s+=T(coX+cw/2,coY-6,'token(7, 3)',{a:'middle',fs:10.5,fill:i===1?A:M});
    const R=['A','B','C'];R.forEach((r,k)=>{const y=(narrow?18:14)+k*58,dead=k===2;
      s+=bx(rX,y,rw,48,'',{dead,on:!dead&&(i===2||i===3)});
      s+=T(rX+8,y+16,'replica '+r+(dead?': down':''),{fs:11,w:600,fill:dead?'var(--bad)':'var(--ink)'});
      if(!dead&&i>=2){const cl=(rw-24)/2;s+=bx(rX+8,y+22,cl,20,'commit log',{on:i===2});s+=bx(rX+16+cl,y+22,cl,20,i>=5?'SSTable':'memtable',{on:i===2||i===5})}
      if(i>=1){const fx=coX+cw,fy=coY+16;s+=ar(fx,fy,rX,y+24,!dead&&(i===2),dead?'':'',null);
        if(i===3&&!dead)s+=T(rX-6,y+38,'ack',{a:'end',fs:10.5,fill:A,w:600})}});
    if(!narrow)s+=ar(cx+cw,96,coX,96,i===0||i===3,i===3?'OK':'write',90);
    else s+=ar(10+cw/2,30,10+cw/2,coY,i===0||i===3,'',null)+T(16+cw/2,52,i===3?'OK':'write',{fs:10.5,fill:A});
    svgEl.innerHTML=RD.svg(w,h,s,'Cassandra write path, step '+(i+1));
    const c=CAP[i];document.getElementById('rd-wp-cap').innerHTML='<div class="t">'+(i+1)+'/'+CAP.length+'. '+c[0]+'</div><p>'+c[1]+'</p>';
  }
  RD.anim({card:'rd-wp-card',ctl:'rd-wp-ctl',n:CAP.length,draw,ms:1800,label:'Step'});
  RD.onResize(()=>draw(+document.getElementById('rd-wp-ctl-s').value));
})();
