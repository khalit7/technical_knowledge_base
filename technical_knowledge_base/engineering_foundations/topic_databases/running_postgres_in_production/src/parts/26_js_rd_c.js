// ---- Reading sections 8 to 12: connection bars, support windows, upgrade timings, managed cost ----
(function(){
  const D=window.RPG,t=RD.t,esc=RD.esc,fmt=n=>Math.round(n).toLocaleString('en-US');
  function conn(){
    const el=document.getElementById('rd-conn');const rows=(D.connections&&D.connections.x&&D.connections.x.pgbench&&D.connections.x.pgbench.rows)||[];if(!el||!rows.length)return;
    const mx=Math.max(...rows.map(r=>r.tps));
    el.innerHTML=rows.map(r=>'<div class="row"><span class="nm">'+esc(r.path)+(r.reconnect?', new connection each time':', persistent')+'</span><span class="track"><span class="fill" style="width:'+(100*r.tps/mx).toFixed(1)+'%;background:'+(r.reconnect?'var(--c2)':'var(--acc)')+'"></span></span><span class="val">'+fmt(r.tps)+'</span></div>').join('');
  }
  // support windows (versioning policy, read 2026-10-04)
  window.RPG_EOL=[['13','2020-09-24','2025-11-13'],['14','2021-09-30','2026-11-12'],['15','2022-10-13','2027-11-11'],['16','2023-09-14','2028-11-09'],['17','2024-09-26','2029-11-08'],['18','2025-09-25','2030-11-14']];
  function eol(){
    const el=document.getElementById('rd-eol');if(!el)return;const W=Math.min(820,RD.width(el)),l=34,r=10,H=RPG_EOL.length*24+30;
    const y0=2020.5,y1=2031,X=d=>{const a=new Date(d+'T00:00:00Z');const y=a.getUTCFullYear()+(a-Date.UTC(a.getUTCFullYear(),0,1))/31557600000;return l+(W-l-r)*(y-y0)/(y1-y0)};
    let s='';for(let y=2021;y<=2031;y+=2)s+='<line x1="'+X(y+'-01-01')+'" x2="'+X(y+'-01-01')+'" y1="0" y2="'+(H-18)+'" stroke="var(--line)"/>'+t(X(y+'-01-01'),H-4,String(y),{a:'middle',fs:9.5,fill:'var(--mute)'});
    const today='2026-10-04';
    RPG_EOL.forEach((v,k)=>{const y=4+k*24,a=X(v[1]),b=X(v[2]),past=v[2]<today,soon=!past&&v[2]<'2027-01-01';
      s+=t(0,y+13,'PG '+v[0],{fs:11,w:600})+'<rect x="'+a+'" y="'+y+'" width="'+(b-a)+'" height="16" rx="3" fill="'+(past?'var(--dim)':soon?'var(--bad)':'var(--acc)')+'" opacity=".85"/>'+
        t(Math.min(b+4,W-r),y+12,'',{fs:9.5});
      s+=t(b-4,y+12,'until '+v[2],{a:'end',fs:9.5,fill:past?'var(--ink)':'var(--bg)'})});
    s+='<line x1="'+X(today)+'" x2="'+X(today)+'" y1="0" y2="'+(H-18)+'" stroke="var(--ink)" stroke-width="1.5"/>';
    el.innerHTML=RD.svg(W,H,s,'PostgreSQL support windows');
  }
  function up(){
    const el=document.getElementById('rd-up-out');const U=D.upgrade&&D.upgrade.steps;if(!el||!U)return;
    el.innerHTML=RD.stat('pg_upgrade --check',U.check.secs+' s','')+RD.stat('pg_upgrade, copy mode',U.copy.secs+' s',esc(D.upgrade.size||'')+' database')+RD.stat('pg_upgrade --link',U.link.secs+' s','no data copied')+RD.stat('vacuumdb --analyze-in-stages',U.analyze.secs+' s','statistics rebuilt');
  }
  // managed: one 2 vCPU / 8 GiB node for 730 hours, compute only (unit prices in the table)
  window.RPG_COST={rds:0.168*730,rds_maz:0.337*730,csql:(2*0.0413+8*0.007)*730,csql_ha:2*(2*0.0413+8*0.007)*730,alloy:(2*0.06608+8*0.0112)*730};
  function mcost(){
    const el=document.getElementById('rd-mcost');if(!el)return;const c=RPG_COST,m=v=>'$'+fmt(v)+'/month';
    el.innerHTML=RD.stat('RDS db.m7g.large',m(c.rds),'Multi-AZ '+m(c.rds_maz))+RD.stat('Cloud SQL Enterprise',m(c.csql),'HA '+m(c.csql_ha))+RD.stat('AlloyDB, one node',m(c.alloy),'list unit prices');
  }
  conn();up();mcost();
  RD.onRender(()=>{conn();eol();up();mcost()});RD.onResize(eol);
})();
