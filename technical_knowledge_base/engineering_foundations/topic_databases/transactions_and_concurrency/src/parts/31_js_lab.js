// ---- Isolation lab: step through any recorded run (TXD), one statement at a time ----
(function(){
  const tab=document.getElementById('t-lab');if(!tab)return;
  const $=id=>document.getElementById(id),esc=TX.esc;
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const LOCKS={
    deadlock:['Deadlock: two transfers in opposite order','A moves 5 credits from Ines (7) to Quinn (12) while B moves 3 from Quinn to Ines. Each locks its first row, then waits for the other\'s. Postgres waits deadlock_timeout (1 s), finds the cycle and kills one (SQLSTATE 40P01). Reading tab, section 7.'],
    deadlock_ordered:['Deadlock avoided: both lock lowest id first','The same two transfers, but each first locks both rows in id order with one SELECT ... ORDER BY user_id FOR UPDATE. B waits for A instead of forming a cycle; both complete. Section 7.'],
    lock_queue:['Lock queue: a migration behind a long read','A holds an open transaction after a read of messages; B\'s ALTER TABLE needs ACCESS EXCLUSIVE and waits; C\'s ordinary read then waits behind B. Section 6.'],
    lock_queue_timeout:['Lock queue avoided with lock_timeout','The same, with SET lock_timeout = \'200ms\' before the ALTER TABLE: the migration gives up (55P03) and C is never blocked. Section 6.'],
    jobs_plain:['Job queue with FOR UPDATE','Two workers claim the next queued job. The second waits for the first worker\'s whole transaction. Section 6.'],
    jobs_skip:['Job queue with FOR UPDATE SKIP LOCKED','The second worker skips the locked job and takes the next one at once. Section 6.'],
    jobs_nowait:['Job queue with FOR UPDATE NOWAIT','The second worker gets an error (55P03) instead of waiting. Section 6.'],
    optimistic:['Optimistic update with a version column','No transaction is held open: each write checks the version it read. B\'s first write changes 0 rows, so B re-reads and retries. Section 8.'],
    advisory:['Advisory lock on a number','pg_try_advisory_lock(7) as "only one summariser per user": B is refused until A unlocks. Section 6.']};
  const sc=$('lab-sc');
  sc.innerHTML='<optgroup label="Anomalies (section 3)">'+TX.ORDER.map(k=>'<option value="'+k+'">'+esc(TXD.scenarios[k].title)+'</option>').join('')+'</optgroup>'+
    '<optgroup label="Locks (sections 6 to 8, Postgres)">'+Object.keys(LOCKS).map(k=>'<option value="x:'+k+'">'+esc(LOCKS[k][0])+'</option>').join('')+'</optgroup>';
  const S={k:'lost',eng:'pg',lev:'read committed',fix:null,i:0,play:false,timer:0};
  function cur(){
    if(S.k.startsWith('x:')){const t=TXD.extras.traces[S.k.slice(2)];return {tr:t.tr,occ:null,why:'',how:[]}}
    return TX.run(S.eng,S.k,S.lev,S.fix);
  }
  function drawLevels(){
    const box=$('lab-lev');
    if(S.k.startsWith('x:')){box.innerHTML='<span class="small mute">Read committed, Postgres '+esc(TXD.extras.version)+' (lock scenarios are recorded at the default level only).</span>';return}
    box.innerHTML=TX.variants(S.eng,S.k).map(v=>'<button class="ch '+(v.r.occ?'occ':'pre')+(v.lev===S.lev&&v.fix===S.fix?' on':'')+'" data-l="'+v.lev+'" data-f="'+(v.fix||'')+'" title="'+esc(TX.how(v.r,S.eng))+'">'+
      TX.chipLabel(v)+': '+(v.r.occ?'happened':'prevented')+'</button>').join('');
  }
  function draw(){
    const r=cur(),tr=r.tr,n=tr.length;S.i=Math.max(0,Math.min(n-1,S.i));
    const sc$=$('lab-scrub');sc$.max=n-1;sc$.value=S.i;$('lab-pos').textContent='step '+(S.i+1)+' of '+n;
    TX.render($('lab-trace'),tr,S.i,{cur:true});
    const st=tr[S.i];
    const fin=tr.slice(0,S.i+1).flatMap(x=>x.f||[]).filter(z=>tr[S.i].f&&tr[S.i].f.includes(z));
    let now='<div class="t">Step '+(S.i+1)+(st.s?': session '+st.s:'')+'</div>'+(st.s?'<code>'+esc(st.q)+'</code>'+(st.n?' <span class="mute">('+esc(st.n)+')</span>':''):esc(st.n||''));
    if(st.b)now+='<br><span class="wt">This statement is waiting for a lock'+(st.w?' ('+esc(st.w)+')':'')+'.</span>';
    if(fin.length)now+='<br>Finished during this step: '+fin.map(z=>'session '+z.s+' step '+(z.i+1)+': '+(z.err?'<b style="color:var(--bad)">'+esc(z.t)+'</b>':esc(z.t))).join('; ');
    $('lab-now').innerHTML=now;
    const v=$('lab-verdict');
    if(S.i<n-1){v.className='verdict';v.innerHTML='<span class="mute">Step to the end to see the outcome.</span>'}
    else if(r.occ===null){v.className='verdict';const fz=TXD.extras.traces[S.k.slice(2)].final||{};const ks=Object.keys(fz);
      v.innerHTML=ks.length?'<b>Final state</b>: '+ks.map(k=>esc(k)+' '+fz[k].map(r=>'('+r.join(', ')+')').join(', ')).join('; '):'<b>End of the recording.</b>'}
    else{v.className='verdict '+(r.occ?'o':'p');v.innerHTML='<b class="'+(r.occ?'o':'p')+'">'+(r.occ?'The anomaly happened.':'Prevented ('+esc(TX.how(r,S.eng))+').')+'</b> '+esc(r.why)+'.'}
    const isx=S.k.startsWith('x:');
    $('lab-story').innerHTML=isx?esc(LOCKS[S.k.slice(2)][1]):esc(TXD.scenarios[S.k].story)+(S.fix?' <b>Fix applied:</b> '+esc(TXD.scenarios[S.k].fixes[S.fix])+'.':'');
    const E=isx?{version:TXD.extras.version,date:TXD.extras.date}:TXD.engines[S.eng];
    $('lab-note').textContent='Recorded '+E.date+' on '+(isx||S.eng==='pg'?'PostgreSQL ':'MySQL ')+E.version+'. A statement is called waiting when it had not finished after 0.5 s and the server reported a lock wait; wait durations come from the script\'s pace, except deadlock detection, which is the server\'s own timer.';
  }
  function setPlay(p){S.play=p;$('lab-play').innerHTML=p?'&#10073;&#10073; Pause':'&#9654; Play';if(S.timer){clearTimeout(S.timer);S.timer=0}
    if(p){if(S.i>=cur().tr.length-1)S.i=0;draw();tick()}}
  function tick(){S.timer=setTimeout(()=>{S.timer=0;if(!S.play||tab.hidden||document.hidden){setPlay(false);return}
    const n=cur().tr.length;if(S.i>=n-1){setPlay(false);return}S.i++;draw();if(S.i>=n-1)setPlay(false);else tick()},1600)}
  function reset(){setPlay(false);S.i=0;drawLevels();draw()}
  sc.addEventListener('change',()=>{S.k=sc.value;S.fix=null;if(!S.k.startsWith('x:')&&!TX.run(S.eng,S.k,S.lev))S.lev='read committed';
    if(S.k.startsWith('x:')){S.eng='pg';segOn('pg')}reset()});
  function segOn(e){document.querySelectorAll('#lab-eng button').forEach(b=>b.classList.toggle('on',b.dataset.m===e))}
  RD.seg($('lab-eng'),e=>{if(S.k.startsWith('x:')&&e==='my'){segOn('pg');return}S.eng=e;if(S.fix&&!TX.run(S.eng,S.k,S.lev,S.fix)){S.fix=null}reset()});
  $('lab-lev').addEventListener('click',e=>{const b=e.target.closest('button.ch');if(!b)return;S.lev=b.dataset.l;S.fix=b.dataset.f||null;reset()});
  $('lab-first').addEventListener('click',()=>{setPlay(false);S.i=0;draw()});
  $('lab-prev').addEventListener('click',()=>{setPlay(false);S.i--;draw()});
  $('lab-next').addEventListener('click',()=>{setPlay(false);S.i++;draw()});
  $('lab-play').addEventListener('click',()=>setPlay(!S.play));
  $('lab-scrub').addEventListener('input',e=>{setPlay(false);S.i=+e.target.value;draw()});
  sc.value=S.k;drawLevels();draw();
  window.TXLAB={open(e,k,l,f){S.eng=e;S.k=k;S.lev=l;S.fix=f||null;sc.value=k;segOn(e);
    const b=document.querySelector('#tabs button[data-t="t-lab"]');if(b)b.click();S.i=0;drawLevels();draw();
    document.getElementById('tabs').scrollIntoView({block:'start'})}};
})();
