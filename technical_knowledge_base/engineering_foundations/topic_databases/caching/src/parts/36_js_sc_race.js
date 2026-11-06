// ---- Scene, Fig. 2 (section 3): the stale-set race replayed from real measured trials (CA.race: two Python clients, Postgres 16.2, Redis 8.8; renderer v2) ----
// Four parties: the reader and the writer (left), Redis and Postgres (right). One step per recorded event of the trial; flows carry each request or value
// along the path it took, coloured by what moves (the old title orange, the new one green). The same trial (same delays) under delete on write, a lease
// and versioned keys; delayed double delete uses the first trial it lost. A toggle swaps the step list (S3.stage(...).list).
(function(){
  if(!document.getElementById('stg-race')||!window.CA)return;const {at,off,lerp,mix}=S3;
  const RC=CA.race,E=RC.examples,iDel=E.delete.findIndex(x=>x.stale),iDbl=E.double_delete.findIndex(x=>x.stale);
  const pick={delete:iDel,lease:iDel,version:iDel,double_delete:iDbl>=0?iDbl:iDel};
  let mode='delete';const T=()=>E[mode][pick[mode]];
  const POS={reader:[-2.5,0,1.15],writer:[-2.5,0,-1.15],redis:[2.3,0,1.15],pg:[2.3,0,-1.15]},BS=[1.5,.75,1.05],TOP=p=>[p[0],BS[1],p[2]];
  // replay the log up to event k (as the old 2D timeline did)
  function stateAt(t,k){let db='Trip plan',cache={},ver=0,lease=null,paused=false,rej=false;
    for(let j=0;j<=k&&j<t.log.length;j++){const ev=t.log[j][2];let m;
      if((m=ev.match(/^committed "(.*)"$/)))db=m[1];
      else if(ev==='deleted key'||ev.indexOf('deleted key again')===0)delete cache.k;
      else if(ev==='deleted key and lease'){delete cache.k;lease=null}
      else if((m=ev.match(/^got lease (\d+)/)))lease=m[1];
      else if((m=ev.match(/^filled version (\d+) with "(.*)"$/))){cache['v'+m[1]]=m[2];paused=false}
      else if((m=ev.match(/^filled "(.*)"$/))){cache.k=m[1];paused=false}
      else if(/rejected/.test(ev)){rej=true;paused=false}
      else if(ev==='bumped version')ver++;
      if(/^read "/.test(ev))paused=true}
    const seen=mode==='version'?cache['v'+ver]:cache.k;
    return {db,seen,ver,lease,paused,rej,cache,stale:seen!==undefined&&seen!==db}}
  const valC=(P,v)=>v==='Trip plan'?P.c2:P.good;
  function draw(R,k,e){const P=R.P,t=T(),n=t.log.length;k=Math.min(k,n-1);R.grid(-4.4,4.4,-2.6,2.6,.5);
    const ev=t.log[k],who=ev[1],txt=ev[2],s=stateAt(t,k),s0=k>0?stateAt(t,k-1):stateAt(t,-1),done=e>.55;const S=done?s:s0;
    // the four parties: the one acting at this step is at full strength, the others recede a little
    const act={reader:who==='reader',writer:who==='writer'};
    let to=null,from=null,c=P.acc;
    if(/^miss/.test(txt)){from='reader';to='redis'}
    else if(/^got lease/.test(txt)){from='redis';to='reader';c=P.c5}
    else if(/^read "/.test(txt)){from='pg';to='reader';c=valC(P,txt.match(/"(.*)"/)[1])}
    else if(/^committed/.test(txt)){from='writer';to='pg';c=P.good}
    else if(/^deleted|^bumped/.test(txt)){from='writer';to='redis';c=P.acc}
    else if(/fill/.test(txt)){from='reader';to='redis';c=valC(P,(txt.match(/"(.*)"/)||[])[1])}
    act.redis=to==='redis'||from==='redis';act.pg=to==='pg'||from==='pg';
    const fillOf=key=>key==='redis'?(S.stale?mix(P.paper,P.bad,.55):S.seen!==undefined?mix(P.paper,P.good,.3):mix(P.paper,P.c1,.15)):
      key==='pg'?mix(P.paper,P.c6,.22):key==='reader'&&S.paused?mix(P.paper,P.c5,.4):P.paper;
    [['reader','Reader'],['writer','Writer'],['redis','Redis'],['pg','Postgres']].forEach(([key,nm])=>{const a=act[key]?1:.55;
      R.box(POS[key],BS,{fill:fillOf(key),a});R.label(TOP(POS[key]),nm,{b:1,fs:13.5,dy:-12,a:Math.max(.6,a)})});
    // what each store holds now
    R.label(POS.pg,'"'+S.db+'"',{mono:true,fs:12.5,dy:14,c:valC(P,S.db),b:1});
    const rv=mode==='version'?'v'+S.ver+': '+(S.seen===undefined?'(empty)':'"'+S.seen+'"'):S.seen===undefined?'(empty)':'"'+S.seen+'"';
    R.label(POS.redis,rv,{mono:true,fs:12.5,dy:14,c:S.stale?P.bad:S.seen!==undefined?P.good:P.mute,b:1});
    if(mode==='version'&&S.cache.v0!==undefined&&S.ver>0)R.label(POS.redis,'v0: "'+S.cache.v0+'" (nobody asks)',{mono:true,fs:12,dy:32,c:P.mute});
    if(S.lease){R.ball([POS.redis[0]+.55,BS[1]+.15,POS.redis[2]],.11,{c:P.c5});R.ball([POS.reader[0]+.55,BS[1]+.15,POS.reader[2]],.11,{c:P.c5});
      R.label([POS.reader[0]+.55,BS[1]+.15,POS.reader[2]],'lease #'+S.lease,{mono:true,fs:12,dx:14,al:'left',c:P.c5})}
    if(S.paused)R.label(POS.reader,'paused '+t.pause_ms.toFixed(2)+' ms',{mono:true,fs:12,dy:14,c:P.c5,b:1});
    // this step's message, flowing along its path
    if(from&&to){const a0=TOP(POS[from]),b0=TOP(POS[to]);a0[1]-=.1;b0[1]-=.1;R.flowArc(a0,b0,.9,{c,a:Math.min(1,e*2),r:.08,n:9,speed:1.6});
      R.arc(a0,b0,.9,{c,w:1.4,a:.35,t:Math.min(1,e*1.4)})}
    if(/rejected/.test(txt)&&done){R.glow([POS.redis[0],BS[1]+.3,POS.redis[2]],.6,{c:P.bad,a:.7});R.label(POS.redis,'fill refused',{fs:12.5,b:1,dy:34,c:P.bad})}
    if(S.stale&&done)R.label(POS.redis,'stale for the 300 s TTL',{fs:12.5,b:1,dy:34,c:P.bad});
    // the clock: the recorded time of this event
    R.label([POS.pg[0],BS[1]+1.1,POS.pg[2]],'t = '+ev[0].toFixed(2)+' ms',{mono:true,fs:13.5,b:1,c:P.ink});
  }
  const st=S3.stage({id:'stg-race',list:'sx-race-delete',fig:'Fig. 2 · a measured race, step by step',cam:[.25,.62],bounds:[[-3.4,0,-2.5],[3.2,1.6,1.8]],aspect:.62,dur:1300,hold:4400,draw,
    onStep:()=>{const t=T(),el=document.getElementById('rd-race-trial');if(el)el.textContent='Trial '+(t.trial+1)+' of '+RC.trials+': reader pause '+t.pause_ms.toFixed(2)+' ms, writer start '+t.wait_ms.toFixed(2)+' ms, timestamps as recorded by the two clients.'}});
  const seg=document.getElementById('rd-race-mode');
  RD.seg(seg,m=>{mode=m;document.querySelectorAll('#rd-race ol.sx').forEach(l=>l.hidden=l.id!=='sx-race-'+m);st.list('sx-race-'+m)});
  window.CHK=window.CHK||{};CHK.race={pick,logs:Object.fromEntries(Object.keys(pick).map(m=>[m,E[m][pick[m]].log.map(x=>x[0])]))};
})();
