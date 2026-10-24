// ---- Rung 3: connections against max_connections as app pods grow (arithmetic from Running Postgres in production, section 7) ----
(function(){
  const card=document.getElementById('cnCard');if(!card)return;
  const $=id=>document.getElementById(id);
  const PER=15,LIMIT=97,POOL=20;   // SQLAlchemy default 5 + 10 overflow; max_connections 100 minus 3 superuser slots; illustrative PgBouncer pool
  let mode='direct';
  const f=n=>n.toLocaleString('en-US');
  function row(name,v,top,col,wall){return '<div class="row"><span class="nm">'+name+'</span><span class="track" style="position:relative"><span class="fill" style="width:'+Math.min(100,100*v/top)+'%;background:'+col+'"></span>'+
    (wall?'<span style="position:absolute;top:-3px;bottom:-3px;left:'+(100*LIMIT/top)+'%;border-left:3px solid var(--ink)" title="limit"></span>':'')+'</span><span class="val">'+f(v)+'</span></div>'}
  function draw(){
    const P=+$('cnP').value;$('cnPv').textContent=P;
    const cl=P*PER,top=Math.max(cl,LIMIT*1.25)*1.05;
    const srv=mode==='direct'?cl:POOL,over=srv>LIMIT;
    $('cnBars').innerHTML=row('client connections',cl,top,'var(--c1)',false)+
      row(mode==='direct'?'server processes':'server processes, pooled',srv,top,over?'var(--bad)':'var(--c3)',true);
    const fit=Math.floor(LIMIT/PER);
    $('cnNote').innerHTML=(mode==='direct'
      ?P+' pods x '+PER+' = '+f(cl)+' connections at peak against the '+LIMIT+' the application may open (dark line: max_connections 100 minus 3 for superusers). '+(over?'<b style="color:var(--bad)">Refused</b>: only '+fit+' pods fit, and a deploy that runs old and new pods together doubles the count.':'Fits: up to '+fit+' pods fit under the limit.')
      :'The same '+f(cl)+' client connections end at PgBouncer; Postgres sees '+POOL+' server processes whatever the number of pods, because a server connection is lent to a client only for one transaction. PgBouncer\'s own client limit is a setting you raise.');
  }
  $('cnP').addEventListener('input',draw);RD.seg($('cnM'),v=>{mode=v;draw()});draw();
})();
