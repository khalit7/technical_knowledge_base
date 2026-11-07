// ---- Reading, part B: failures, retries, pings, balancing tables, GraphQL, drills ----
(function(){
  const S=window.SA,esc=RD.esc,set=(id,h)=>{const e=document.getElementById(id);if(e)e.innerHTML=h};
  // (the deadline lanes became the 3D stage stg-dl on 2026-11-07: 43_js_sc_dl.js)
  // ---- failures as the client sees them ----
  const ft=document.getElementById('rd-fails');
  if(ft)ft.innerHTML=S.status.cases.filter(c=>c.id!=='too_many_pings').map(c=>'<div class="fc"><div class="h"><span>'+esc(c.what)+'</span><span><b>'+c.code+'</b> &middot; '+c.ms+' ms</span></div><div class="small mute"><code>'+esc(c.call)+'</code></div>'+(c.details?'<div><code>'+esc(c.details)+'</code></div>':'')+'</div>').join('');
  set('rd-retrylog',S.status.retry.map(x=>'at '+x.ms+' ms ('+(x.header?'<code>grpc-previous-rpc-attempts: '+x.header+'</code>':'first attempt')+', '+(x.failed?'UNAVAILABLE':'OK')+')').join(', then '));
  // ---- keepalive pings until GOAWAY ----
  const pg=S.status.pings;
  set('rd-pings','<div class="tw"><table class="small"><thead><tr><th class="num">ms</th><th>Direction</th><th>Frame</th></tr></thead><tbody>'+
    pg.map(f=>'<tr'+(f.type==='GOAWAY'?' style="background:var(--hl)"':'')+'><td class="num">'+f.ms.toFixed(1)+'</td><td>'+(f.dir==='c>s'?'client &rarr;':'&larr; server')+'</td><td><b>'+f.type+'</b>'+(f.flags&&f.flags.length?' '+f.flags.join(','):'')+(f.type==='GOAWAY'?': error '+f.error+' (ENHANCE_YOUR_CALM), last stream '+f.last_stream+', debug "'+esc(f.debug)+'"':'')+(f.type==='RSTSTREAM'?': error '+f.error:'')+'</td></tr>').join('')+
    '</tbody></table></div><p class="small mute"><span class="meas">measured</span> through the frame proxy; the call itself was waiting for its first token (8 s), so no DATA frames flowed.</p>');
  set('rd-refl',S.status.services.map(s=>'<code>'+esc(s)+'</code>').join(', '));
  // ---- balancing tables ----
  const B=['backend-1','backend-2','backend-3'];
  const lc=document.querySelector('#rd-lbcounts tbody');
  if(lc)lc.innerHTML=S.lb.counts.map(c=>'<tr><td>'+esc(c.setup)+'</td>'+B.map(b=>'<td class="num">'+(c.answers[b]||0)+'</td>').join('')+'<td class="small">'+esc(c.note)+'</td></tr>').join('');
  const ls=document.querySelector('#rd-lbscale tbody');
  if(ls)ls.innerHTML=S.lb.timelines.map(t=>{const a=t.after_join,tot=Object.values(a).reduce((x,y)=>x+y,0);
    return '<tr><td>'+esc(t.setup)+'</td><td>'+B.map(b=>b.replace('backend-','b')+': '+(a[b]||0)).join(', ')+'</td><td class="num">'+Math.round(100*(a['backend-3']||0)/tot)+'%</td></tr>'}).join('');
  const first3=t=>{const c=t.calls.find(x=>x[1]==='backend-3');return c?c[0]:null};
  const ta=S.lb.timelines.find(t=>t.max_connection_age_s),t7=S.lb.timelines.find(t=>/^L7/.test(t.setup));
  if(ta&&first3(ta)!=null)set('rd-b3age',first3(ta).toFixed(2));
  if(t7&&first3(t7)!=null)set('rd-b3l7',(first3(t7)-t7.backend3_joined_s).toFixed(2));
  // ---- GraphQL ----
  const n1=S.gql.n1;
  if(document.getElementById('rd-n1')){const mx=Math.max(...n1.map(x=>x.naive.db_calls));
    set('rd-n1','<div class="bars">'+n1.map(x=>['naive','batched'].map(k=>'<div class="row"><div class="nm" title="'+esc(x.query)+'">Q'+(n1.indexOf(x)+1)+', '+(k==='naive'?'naive':'DataLoader')+'</div><div class="track"><div class="fill" style="width:'+(100*x[k].db_calls/mx).toFixed(1)+'%;background:var(--'+(k==='naive'?'bad':'good')+')"></div></div><div class="val">'+x[k].db_calls+' calls</div></div>').join('')).join('')+'</div>'+
      '<p class="small mute">'+n1.map((x,i)=>'Q'+(i+1)+' ('+esc(x.label)+'): <code>'+esc(x.query)+'</code>').join('<br>')+'</p>')}
  const fb=document.querySelector('#rd-fan tbody');
  if(fb)fb.innerHTML=S.gql.fanout.map(f=>'<tr><td class="num">'+f.depth+'</td><td class="num">'+f.static_cost.toLocaleString('en-GB')+'</td><td class="num">'+f.db_calls+'</td></tr>').join('')+
    '<tr><td class="num">5 (first: 20, then 10)</td><td class="num">'+S.gql.limit.static_cost.toLocaleString('en-GB')+'</td><td class="num">not run: '+esc(S.gql.limit.verdict)+' (limit '+S.gql.limit.limit.toLocaleString('en-GB')+')</td></tr>';
  const pp=document.getElementById('rd-partial');
  if(pp){const r=S.gql.partial.result;pp.textContent=JSON.stringify({data:{models:r.data.models.map(m=>({name:m.name,evals:m.evals.slice(0,2).concat(m.evals.length>2?['... '+(m.evals.length-2)+' more']:[])}))},errors:r.errors.slice(0,2).concat(r.errors.length>2?['... '+(r.errors.length-2)+' more, one per failed field']:[])},null,1)}
  // ---- drills ----
  document.querySelectorAll('#t-read .drill').forEach(d=>{const rev=d.querySelector('.rev');
    d.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{
      d.querySelectorAll('.opts button').forEach(x=>{x.classList.remove('right','wrong');if(x.dataset.o===d.dataset.ans)x.classList.add('right')});
      if(b.dataset.o!==d.dataset.ans)b.classList.add('wrong');rev.hidden=false}))});
})();
