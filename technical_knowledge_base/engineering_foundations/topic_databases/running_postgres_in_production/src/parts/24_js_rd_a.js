// ---- Reading sections 2 and 3: PITR summary tiles, lag chart, slot and sync bars ----
(function(){
  const D=window.RPG,t=RD.t,esc=RD.esc;
  const fmt=n=>Math.round(n).toLocaleString('en-US');
  const box=(x,y,w,h,label,sub,col)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="6" fill="var(--soft)" stroke="'+(col||'var(--line)')+'"/>'+
    t(x+w/2,y+(sub?h/2-2:h/2+4),label,{a:'middle',fs:11.5,w:600})+(sub?t(x+w/2,y+h/2+12,sub,{a:'middle',fs:10,fill:'var(--mute)'}):'');
  const arrow=(x1,y1,x2,y2,col)=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+(col||'var(--mute)')+'" stroke-width="1.3" marker-end="url(#rpa)"/>';
  const defs='<defs><marker id="rpa" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="var(--mute)"/></marker></defs>';

  // 3. PITR: the 3D stage (29b_js_sc_pitr.js) replaced the 2D animation (2026-11-06); the summary tiles stay here
  const P=D.pitr||{},good=P.before_delete||1012000;
  const secDump=(P.steps&&P.steps.restore_dump&&P.steps.restore_dump.secs)||0,secPitr=(P.steps&&P.steps.restore_pitr&&P.steps.restore_pitr.secs)||0;
  RD.onRender(()=>{lag();slot();sync();sum()});
  RD.onResize(()=>{lag();slot()});
  function sum(){const el=document.getElementById('rd-pitr-sum');if(!el||!P.count_pitr)return;
    el.innerHTML='<div class="out">'+RD.stat('Before the DELETE',fmt(good),'messages')+RD.stat('Restored from the dump',fmt(P.count_dump),'lost '+fmt(good-P.count_dump)+', restore '+secDump+' s')+
      RD.stat('Point-in-time recovery',fmt(P.count_pitr),'lost '+fmt(good-P.count_pitr)+', recovery '+secPitr+' s')+'</div>'}

  // 4. lag chart
  let lagMode='load';
  function lag(){
    const el=document.getElementById('rd-lag');if(!el)return;const R=D.replication||{};
    const ser=lagMode==='load'?R.series_lag_load:R.series_lag_pause;if(!ser)return;
    const W=Math.min(820,RD.width(el)),H=220,l=46,r=42,top=10,bot=28,pw=W-l-r,ph=H-top-bot;
    const T=ser[ser.length-1][0],maxMs=Math.max(...ser.map(p=>Math.max(p[1],p[2],p[3])))||1;
    const sec=maxMs>1500,unit=sec?1000:1,ymax=Math.ceil(maxMs/unit*1.1*10)/10,mb=Math.max(...ser.map(p=>p[4]))/2**20||1;
    const X=v=>l+pw*v/T,Y=v=>top+ph*(1-v/unit/ymax),YB=v=>top+ph*(1-v/2**20/(mb*1.1));
    let s='';
    if(lagMode==='pause'){const pz=(R.x&&R.x.lag_pause&&R.x.lag_pause.paused)||[3,13];s+='<rect x="'+X(pz[0])+'" y="'+top+'" width="'+(X(pz[1])-X(pz[0]))+'" height="'+ph+'" fill="var(--hl)" opacity=".6"/>'+t(X(pz[0])+4,top+12,'replay paused',{fs:10,fill:'var(--mute)'})}
    for(let k=0;k<=4;k++){const v=ymax*k/4,y=top+ph*(1-k/4);s+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/>'+t(l-4,y+3,(sec?v.toFixed(1)+' s':v.toFixed(v<10?1:0)+' ms'),{a:'end',fs:9.5,fill:'var(--mute)'})+
      t(W-r+4,y+3,(mb*1.1*k/4).toFixed(0)+' MB',{fs:9.5,fill:'var(--mute)'})}
    for(let k=0;k<=4;k++){const v=T*k/4;s+=t(X(v),H-10,v.toFixed(0)+' s',{a:'middle',fs:9.5,fill:'var(--mute)'})}
    const line=(idx,col,yf,dash)=>'<polyline fill="none" stroke="'+col+'" stroke-width="1.6"'+(dash?' stroke-dasharray="4 3"':'')+' points="'+ser.map(p=>X(p[0]).toFixed(1)+','+yf(p[idx]).toFixed(1)).join(' ')+'"/>';
    s+=line(4,'var(--c5)',YB,1)+line(1,'var(--c1)',Y)+line(2,'var(--c3)',Y)+line(3,'var(--bad)',Y);
    el.innerHTML=RD.svg(W,H,s,'Replication lag over time');
    const rl=ser.map(p=>p[3]).sort((a,b)=>a-b),med=rl[Math.floor(rl.length/2)],x=R.x||{};
    document.getElementById('rd-lag-cap').innerHTML=lagMode==='load'?
      'pgbench, 8 clients inserting messages for 20 s ('+fmt((x.lag_load||{}).tps||0)+' inserts per second), sampled every 250 ms: replay lag median '+med.toFixed(2)+' ms, max '+rl[rl.length-1].toFixed(2)+' ms. <span class="meas">measured</span>':
      'Same load; pg_wal_replay_pause() on the replica 3 s in, resumed at 13 s. write_lag and flush_lag stay at milliseconds; replay_lag climbs one second per second and '+(Math.max(...ser.map(p=>p[4]))/2**20).toFixed(0)+' MB piles up, then drains within seconds once replay resumes. <span class="meas">measured</span>';
  }
  RD.seg(document.getElementById('rd-lag-mode'),m=>{lagMode=m;lag()});

  // slot retention bars
  function slot(){
    const el=document.getElementById('rd-slot');if(!el)return;const rt=(D.replication||{}).retention||[];
    const W=Math.min(820,RD.width(el)),lab=Math.min(250,W*.42),H=rt.length*26+24,mx=Math.max(...rt.map(r=>r.pg_wal));
    const col={reserved:'var(--c3)',extended:'var(--c5)',unreserved:'var(--c2)',lost:'var(--bad)'};let s='';
    rt.forEach((r,k)=>{const y=6+k*26,bw=(W-lab-112)*r.pg_wal/mx;
      s+=t(0,y+13,esc(r.label.replace('max_slot_wal_keep_size','cap')),{fs:10.5});
      s+='<rect x="'+lab+'" y="'+y+'" width="'+bw+'" height="16" rx="3" fill="'+(col[r.wal_status]||'var(--mute)')+'"/>'+t(lab+bw+4,y+12,(r.pg_wal/2**20).toFixed(0)+' MB, '+r.wal_status,{fs:10})});
    s+=t(0,H-4,'"cap" = max_slot_wal_keep_size = 256MB',{fs:9.5,fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,s,'WAL kept for a stopped replica');
  }
  function sync(){
    const el=document.getElementById('rd-sync');if(!el)return;const rows=(D.replication||{}).sync||[];const mx=Math.max(...rows.map(r=>r.tps));
    el.innerHTML=rows.map(r=>'<div class="row"><span class="nm" title="'+esc(r.mode)+'">'+esc(r.mode)+(r.standby!=='(none)'?' (sync)':'')+'</span><span class="track"><span class="fill" style="width:'+(100*r.tps/mx).toFixed(1)+'%;background:'+(r.standby!=='(none)'?'var(--c4)':'var(--acc)')+'"></span></span><span class="val">'+fmt(r.tps)+'</span></div>').join('');
  }
})();
