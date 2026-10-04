// ---- Reading, measured lab: redelivery outcomes, SKIP LOCKED throughput, dual write vs outbox (data: 25_js_lab_data.js) ----
(function(){
  const D=window.LABDATA;if(!D)return;
  const fmt=n=>Math.round(n).toLocaleString('en-US');
  const by=(arr,k)=>{const o={};arr.forEach(r=>{(o[r[k]]=o[r[k]]||[]).push(r)});return o};
  // 1. redelivery outcomes
  const ms=document.getElementById('rd-ms-svg');
  const groups=[];const seen={};D.redelivery.forEach(r=>{if(!seen[r.name]){seen[r.name]=[];groups.push(r.name)}seen[r.name].push(r)});
  const short={'at-most-once (delete first), 5% crashes':'At-most-once, 5% crashes','at-least-once, 5% crashes':'At-least-once, 5% crashes',
    'at-least-once + idempotent receiver, 5% crashes':'At-least-once + idempotent receiver','at-least-once, no crashes, visibility timeout 0.3 s, work exponential mean 0.1 s':'Timeout 0.3 s, no crashes (600 jobs)',
    'same, idempotent receiver':'Timeout 0.3 s + idempotent receiver'};
  const series=[['lost','Receipts lost','var(--bad)'],['duplicates','Duplicate receipts','var(--c5)'],['dedup_hits','Repeats caught by the key','var(--c3)']];
  function drawMs(){
    const W=Math.max(300,Math.min(860,RD.width(ms)));const narrow=W<560;const lw=narrow?0:230,x0=lw+4,x1=W-40,mx=60;
    const rowH=narrow?66:54;let b='',y=4;
    groups.forEach(g=>{const rs=seen[g];
      b+=RD.t(0,y+(narrow?11:20),short[g]||g,{fs:11.5,w:600});const yb=y+(narrow?16:6);
      series.forEach((s,k)=>{const vals=rs.map(r=>r[s[0]]||0);const mean=vals.reduce((a,c)=>a+c,0)/vals.length;
        const yy=yb+k*14,w=Math.max(mean>0?2:0,(x1-x0)*mean/mx);
        b+='<rect x="'+x0+'" y="'+yy+'" width="'+w+'" height="11" rx="2" fill="'+s[2]+'"/>'+(mean>0?RD.t(x0+w+4,yy+9.5,vals.join(', '),{fs:10,fill:'var(--mute)'}):RD.t(x0+2,yy+9.5,'0',{fs:10,fill:'var(--mute)'}))});
      y+=rowH});
    ms.innerHTML=RD.svg(W,y,b,'Outcomes of the redelivery experiment');}
  document.getElementById('rd-ms-leg').innerHTML=series.map(s=>'<span style="--sw:'+s[2]+'">'+s[1]+'</span>').join('');
  document.getElementById('rd-ms-note').textContent='Bars: mean of 3 runs (the three values are printed); 1,000 jobs unless noted, 4 worker processes. '+D.machine+', PostgreSQL '+D.postgres+', '+D.date+'.';
  // 2. SKIP LOCKED throughput
  const sk=document.getElementById('rd-sk-svg');
  function drawSk(){
    const T=by(D.throughput,'mode');const ws=T.skip_locked.map(r=>r.workers);
    const W=Math.max(300,Math.min(860,RD.width(sk)));const x0=86,x1=W-60,mx=Math.max(...D.throughput.map(r=>r.jobs_per_s));
    let b='',y=2;
    ws.forEach(w=>{b+=RD.t(0,y+15,w+' worker'+(w>1?'s':''),{fs:11.5,w:600});
      [['skip_locked','SKIP LOCKED','var(--c3)'],['for_update','FOR UPDATE','var(--c2)']].forEach((m,k)=>{const r=T[m[0]].find(q=>q.workers===w);const bw=(x1-x0)*r.jobs_per_s/mx;
        b+='<rect x="'+x0+'" y="'+(y+k*13)+'" width="'+bw+'" height="11" rx="2" fill="'+m[2]+'"/>'+RD.t(x0+bw+4,y+k*13+9.5,fmt(r.jobs_per_s)+'/s',{fs:10,fill:'var(--mute)'})});
      y+=32});
    b+='<rect x="'+x0+'" y="'+(y+2)+'" width="10" height="10" fill="var(--c3)"/>'+RD.t(x0+14,y+11,'SKIP LOCKED',{fs:10.5})+'<rect x="'+(x0+100)+'" y="'+(y+2)+'" width="10" height="10" fill="var(--c2)"/>'+RD.t(x0+114,y+11,'plain FOR UPDATE',{fs:10.5});
    sk.innerHTML=RD.svg(W,y+16,b,'Jobs per second by number of workers');}
  // 3. outbox table
  const tb=document.getElementById('rd-ob-tbl');
  const O=by(D.outbox,'mode');const rng=(rs,k)=>{const v=rs.map(r=>r[k]||0);return v.join(', ')};
  const NM={naive:'Commit, then publish',naive_publish_first:'Publish, then commit',outbox:'Outbox, relay batches of 10',outbox_batch1:'Outbox, relay one event per transaction'};
  tb.innerHTML='<thead><tr><th>Design</th><th class="num">Crashes (producer; relay)</th><th class="num">Lost events</th><th class="num">Phantom events</th><th class="num">Duplicate events</th><th>After deduplication</th></tr></thead><tbody>'+
    ['naive','naive_publish_first','outbox','outbox_batch1'].map(m=>{const rs=O[m];if(!rs)return '';const ok=rs.every(r=>(r.lost_events||0)===0&&(r.phantom_events||0)===0);
      return '<tr><td>'+NM[m]+'</td><td class="num">'+rng(rs,'producer_crashes')+(m.indexOf('outbox')===0?'; '+rng(rs,'relay_crashes'):'')+'</td><td class="num">'+rng(rs,'lost_events')+'</td><td class="num">'+rng(rs,'phantom_events')+'</td><td class="num">'+rng(rs,'duplicate_events')+'</td><td>'+(ok?'<b style="color:var(--good)">exact: 500 orders, 500 events</b>':'<b style="color:var(--bad)">wrong</b>')+'</td></tr>'}).join('')+'</tbody>';
  function all(){drawMs();drawSk()}
  RD.onRender(all);RD.onResize(all);all();
})();
