// ---- Gigawatt planner tab ----
(function(){
  const P=window.PW,F=window.PWF,$=id=>document.getElementById(id);
  const st={mw:1000,pue:P.pue.root,ut:1,price:P.price};
  const mwFrom=v=>Math.pow(10,Math.log10(5000)*v/1000),vFrom=mw=>Math.round(1000*Math.log10(mw)/Math.log10(5000));
  const fmtMW=mw=>mw>=1000?F.n(mw/1000,2)+' GW':F.n(mw,mw<10?1:0)+' MW';
  function draw(){
    $('gw-mwv').textContent=fmtMW(st.mw);$('gw-puev').textContent=st.pue.toFixed(2);$('gw-utv').textContent=Math.round(st.ut*100)+'%';$('gw-prv').textContent=(st.price*100).toFixed(2)+' cents/kWh';
    const hours=8766;let h='<tr><th>System</th><th class="num">Accelerators</th><th class="num">Systems</th><th class="num">Dense BF16 peak</th><th class="num">Power $ per hour</th><th class="num">Share of rent</th></tr>';
    const rows=P.systems.map(s=>{const kw=s[2]/s[3]*st.pue,n=st.mw*1000/kw;return {s,kw,n,sys:n/s[3],ef:n*s[4]/1e6,eh:kw*st.ut*st.price}});
    rows.forEach(r=>{h+='<tr><td>'+r.s[1].replace(/ \(.*\)/,'').replace(' rack','').replace(' pod',' pod')+'</td><td class="num">'+F.n(r.n)+'</td><td class="num">'+F.n(Math.floor(r.sys))+'</td><td class="num">'+(r.ef>=1?F.n(r.ef,r.ef<10?1:0)+' EF':F.n(r.ef*1000,0)+' PF')+'</td><td class="num">$'+r.eh.toFixed(3)+'</td><td class="num">'+(r.s[5]?F.pct(r.eh/r.s[5]):'n/a')+'</td></tr>'});
    $('gw-tab').innerHTML=h;
    const mx=Math.max(...rows.map(r=>r.n));
    $('gw-bars').innerHTML=rows.map(r=>'<div class="row"><div class="nm">'+r.s[1]+'</div><div class="track"><div class="fill" style="width:'+(100*r.n/mx).toFixed(1)+'%;background:var(--c1)"></div></div><div class="val">'+F.n(r.n)+'</div></div>').join('');
    const it=st.mw/st.pue,energy=st.mw*st.ut*hours/1e6;
    $('gw-out').innerHTML=RD.stat('Power reaching IT equipment',fmtMW(it),fmtMW(st.mw-it)+' to cooling and conversion')+
      RD.stat('Energy per year',F.n(energy,energy<1?3:2)+' TWh','at '+Math.round(st.ut*100)+'% of maximum, 8,766 hours')+
      RD.stat('Electricity per year',(energy*st.price>=1?'$'+F.n(energy*st.price,2)+' billion':'$'+F.n(energy*st.price*1000,0)+' million'),'at $'+st.price.toFixed(4)+' per kWh')}
  $('gw-mw').value=vFrom(st.mw);
  $('gw-mw').addEventListener('input',e=>{st.mw=mwFrom(+e.target.value);if(st.mw<1)st.mw=1;draw()});
  $('gw-pue').addEventListener('input',e=>{st.pue=+e.target.value/100;$('gw-puep').querySelectorAll('button').forEach(b=>b.classList.remove('on'));draw()});
  $('gw-puep').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;$('gw-puep').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));st.pue=+b.dataset.v;$('gw-pue').value=Math.round(st.pue*100);draw()});
  $('gw-ut').addEventListener('input',e=>{st.ut=+e.target.value/100;draw()});
  $('gw-pr').addEventListener('change',e=>{const v=+e.target.value;if(v>0){st.price=v;draw()}});
  draw();
  RD.onRender(draw,'t-gw');
  window.PW_GW={st,draw};
})();
