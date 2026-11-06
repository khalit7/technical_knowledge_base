// ---- Section 3: the results table of the measured stale-set race (two clients, Postgres 16.2, Redis 8.8, 400 trials per strategy) ----
// The step-by-step replay of one trial is the 3D stage Fig. 2 (36_js_sc_race.js).
(function(){
  const RC=CA.race;if(!document.getElementById('rd-race-tbl'))return;
  // results table
  const names={delete:'Delete on write (cache-aside)',double_delete:'Delete, then delete again 50 ms later',lease:'Lease (Facebook memcache, emulated in Redis)',version:'Versioned keys',set_on_write:'Set the new value on write (two writers)'};
  const cost={delete:'Nothing extra',double_delete:'A delayed second delete (a timer or a queue)',lease:'A lease key and a script call per miss',version:'A version read per request; old keys use memory until evicted',set_on_write:'Nothing extra, and wrong'};
  document.getElementById('rd-race-tbl').innerHTML='<tr><th>Strategy</th><th class="num">Stale trials</th><th class="num">Share</th><th>Extra cost</th></tr>'+
    ['delete','double_delete','lease','version','set_on_write'].map(s=>{const r=RC.strategies[s];return '<tr><td>'+names[s]+'</td><td class="num">'+r.stale+' / '+RC.trials+'</td><td class="num"'+(r.stale?' style="color:var(--bad)"':' style="color:var(--good)"')+'>'+(r.stale_share*100).toFixed(1)+'%</td><td>'+cost[s]+(s==='lease'?' ('+r.fills_rejected+' stale fills refused)':'')+'</td></tr>'}).join('');
})();
