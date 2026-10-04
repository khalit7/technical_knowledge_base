// ---- Section 3: the stale-set race, replayed from real measured trials (two clients, Postgres 16.2, Redis 8.8) ----
// Before/after on one input: the same trial (same delays) under delete-on-write, a lease, versioned keys, delayed double delete.
(function(){
  const RC=CA.race,card=document.getElementById('rd-race-card');if(!card)return;
  const box=document.getElementById('rd-race-svg'),cap=document.getElementById('rd-race-cap'),cnt=document.getElementById('rd-race-cnt'),tri=document.getElementById('rd-race-trial');
  const E=RC.examples;
  // the first trial in which plain delete-on-write went stale; the same trial for lease and versioned keys
  const iDel=E.delete.findIndex(x=>x.stale);
  const iDbl=E.double_delete.findIndex(x=>x.stale);
  const pick={delete:iDel,lease:iDel,version:iDel,double_delete:iDbl>=0?iDbl:iDel};
  let mode='delete',tr=null;
  function steps(m){const t=E[m][pick[m]];return t}
  function stateAt(t,k){
    let db='Trip plan',cache={},ver=0,lease=null,stale=false;
    for(let j=0;j<=k&&j<t.log.length;j++){const e=t.log[j][2];let mm;
      if((mm=e.match(/^committed "(.*)"$/)))db=mm[1];
      else if(e==='deleted key'||e.indexOf('deleted key again')===0)delete cache['k'];
      else if(e==='deleted key and lease'){delete cache['k'];lease=null}
      else if((mm=e.match(/^got lease (\d+)/)))lease=mm[1];
      else if((mm=e.match(/^filled version (\d+) with "(.*)"$/)))cache['v'+mm[1]]=mm[2];
      else if((mm=e.match(/^filled "(.*)"$/)))cache['k']=mm[1];
      else if((mm=e.match(/^fill "(.*)" accepted/))){cache['k']=mm[1];lease=null}
      else if(e==='bumped version')ver++;
    }
    const seen=mode==='version'?cache['v'+ver]:cache['k'];
    return {db,seen,ver,lease,stale:seen!==undefined&&seen!==db,cache};
  }
  function caption(e,t){
    const p=t.pause_ms.toFixed(1);
    if(e==='miss')return ['Reader: miss','The reader asks Redis for chat 42\'s title. The key is empty, so it must go to Postgres.'];
    if(/^miss on version/.test(e))return ['Reader: miss on the current version','The reader first reads the version counter ('+e.replace('miss on version ','v')+') and asks for that version\'s key: empty, so it goes to Postgres.'];
    if(/^got lease/.test(e))return ['Reader: takes a lease','Redis hands the reader a token ('+e.replace('got lease ','#')+'): only the holder of this token may fill the key, and only while it is still valid.'];
    if(/^read "Trip plan v2"/.test(e))return ['Reader: reads the new title','The writer has already committed, so Postgres returns "Trip plan v2". Then the reader is delayed for '+p+' ms.'];
    if(/^read "/.test(e))return ['Reader: reads the OLD title','The reader reads "Trip plan" from Postgres: still the old value, because the writer has not committed yet. Now the reader is delayed for '+p+' ms (a GC pause, a busy CPU, a slow hop).'];
    if(/^committed/.test(e))return ['Writer: commits the new title','The writer commits "Trip plan v2" to Postgres. From this instant, any cached "Trip plan" is wrong.'];
    if(e==='deleted key')return ['Writer: deletes the key','The writer deletes the cache key after its commit, as cache-aside says. But the key is already empty: this delete removes nothing, and the slow reader still holds the old value.'];
    if(e==='deleted key and lease')return ['Writer: deletes the key and the lease','One DEL removes the key and the reader\'s lease. The slow reader\'s token is now void.'];
    if(e==='bumped version')return ['Writer: bumps the version','After its commit the writer increments the version counter. Every reader from now on asks for the next version\'s key, which is empty, so it reads the new title from Postgres.'];
    if(/again/.test(e))return ['Writer: deletes again, 50 ms later','The second delete would remove a stale value filled in the last 50 ms. This reader is slower than that: it has not filled yet.'];
    if(/^filled version/.test(e))return ['Reader: fills an old version','The slow reader writes "Trip plan" under the old version\'s key. Nobody asks for that key any more: harmless, and it ages out with its TTL.'];
    if(/^filled "/.test(e))return ['Reader: fills the OLD title: a stale set','The slow reader wakes and writes the value it read before the commit. The cache now says "Trip plan" while Postgres says "Trip plan v2", and will for the whole 300-second TTL.'];
    if(/rejected/.test(e))return ['Reader: fill refused','The Lua script finds the reader\'s lease gone and refuses the write. The key stays empty; the next reader misses and reads the new title from Postgres.'];
    if(/accepted/.test(e))return ['Reader: fill accepted','The lease was still valid, so the fill is safe.'];
    return [e,''];
  }
  function draw(k){
    tr=steps(mode);const t=tr,n=t.log.length;k=Math.min(k,n-1);
    const W=Math.min(RD.width(box),860),H=150,L=70,R=16,w=W-L-R;
    const tmax=Math.max(10,Math.ceil(t.log[n-1][0]/10)*10),xs=v=>L+v/tmax*w;let g='';
    const ty={reader:46,writer:104};
    for(let v=0;v<=tmax;v+=tmax>60?20:10){const x=xs(v);g+='<line x1="'+x+'" x2="'+x+'" y1="18" y2="'+(H-22)+'" stroke="var(--line)"/>'+RD.t(x,H-8,v+' ms',{a:'middle',fs:10,fill:'var(--mute)'})}
    ['reader','writer'].forEach(a=>{g+=RD.t(L-8,ty[a]+4,a==='reader'?'Reader':'Writer',{a:'end',fs:12,w:600})+'<line x1="'+L+'" x2="'+(L+w)+'" y1="'+ty[a]+'" y2="'+ty[a]+'" stroke="var(--dim)" stroke-width="2"/>'});
    // the reader's pause, drawn to scale between its Postgres read and its fill
    const iRead=t.log.findIndex(e=>/^read "/.test(e[2])),iFill=t.log.findIndex(e=>e[1]==='reader'&&/fill/.test(e[2]));
    if(iRead>=0&&iFill>=0&&k>=iRead){const x1=xs(t.log[iRead][0]),x2=xs(t.log[Math.min(iFill,k)][0]);
      g+='<rect x="'+x1+'" y="'+(ty.reader-7)+'" width="'+Math.max(0,x2-x1)+'" height="14" fill="var(--hl)" stroke="var(--c5)"/>'+(x2-x1>60?RD.t((x1+x2)/2,ty.reader+4,'paused',{a:'middle',fs:10}):'')}
    t.log.forEach((e,j)=>{if(j>k)return;const x=xs(e[0]),y=ty[e[1]];const c=caption(e[2],t)[0];
      const bad=/OLD title: a stale set/.test(c),good=/refused|old version/.test(c);
      g+='<circle cx="'+x+'" cy="'+y+'" r="'+(j===k?8:6)+'" fill="'+(bad?'var(--bad)':good?'var(--good)':j===k?'var(--acc)':'var(--mute)')+'" stroke="var(--bg)" stroke-width="2"/>'+RD.t(x,y+(e[1]==='reader'?-12:22),String(j+1),{a:'middle',fs:10,fill:'var(--mute)'})});
    box.innerHTML=RD.svg(W,H,g,'Timeline of a measured race between a reader and a writer');
    const st=stateAt(t,k),c=caption(t.log[k][2],t);
    cap.innerHTML='<div class="t">Step '+(k+1)+' of '+n+' at '+t.log[k][0].toFixed(2)+' ms: '+c[0]+'</div><p>'+c[1]+'</p>'+(k===n-1?'<p><b>End of trial: '+(t.stale?'the cache is stale until the TTL expires.':'the cache holds nothing wrong.')+'</b></p>':'');
    cnt.innerHTML=RD.stat('Postgres says','"'+st.db+'"','the source of truth')+RD.stat(mode==='version'?'Readers see (key v'+st.ver+')':'Cache holds',st.seen===undefined?'(empty)':'"'+st.seen+'"',st.stale?'<span style="color:var(--bad)">stale</span>':'consistent')+
      (mode==='lease'?RD.stat('Lease',st.lease?'#'+st.lease:'none','token that may fill'):'')+RD.stat('Over '+RC.trials+' trials',RC.strategies[mode].stale+' stale',(RC.strategies[mode].stale_share*100).toFixed(1)+'% of trials');
    tri.innerHTML='Trial '+(t.trial+1)+' of the measurement: reader pause '+t.pause_ms.toFixed(1)+' ms, writer start '+t.wait_ms.toFixed(1)+' ms. Timestamps as recorded by the clients.';
  }
  const an=RD.anim({card:'rd-race-card',ctl:'rd-race-ctl',n:steps(mode).log.length,draw,ms:1700,label:'Race step'});
  RD.seg(document.getElementById('rd-race-mode'),m=>{mode=m;an.reset(steps(m).log.length);an.play()});
  RD.onResize(()=>an.redraw());
  // results table
  const names={delete:'Delete on write (cache-aside)',double_delete:'Delete, then delete again 50 ms later',lease:'Lease (Facebook memcache, emulated in Redis)',version:'Versioned keys',set_on_write:'Set the new value on write (two writers)'};
  const cost={delete:'Nothing extra',double_delete:'A delayed second delete (a timer or a queue)',lease:'A lease key and a script call per miss',version:'A version read per request; old keys use memory until evicted',set_on_write:'Nothing extra, and wrong'};
  document.getElementById('rd-race-tbl').innerHTML='<tr><th>Strategy</th><th class="num">Stale trials</th><th class="num">Share</th><th>Extra cost</th></tr>'+
    ['delete','double_delete','lease','version','set_on_write'].map(s=>{const r=RC.strategies[s];return '<tr><td>'+names[s]+'</td><td class="num">'+r.stale+' / '+RC.trials+'</td><td class="num"'+(r.stale?' style="color:var(--bad)"':' style="color:var(--good)"')+'>'+(r.stale_share*100).toFixed(1)+'%</td><td>'+cost[s]+(s==='lease'?' ('+r.fills_rejected+' stale fills refused)':'')+'</td></tr>'}).join('');
})();
