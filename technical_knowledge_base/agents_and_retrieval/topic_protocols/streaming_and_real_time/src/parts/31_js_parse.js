// ---- Parser test tab ----
(function(){
  const D=window.SDATA.parsers,esc=RD.esc;
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const show=s=>esc(s).replace(/\n/g,'␊').replace(/\u0000/g,'␀');
  const evs=e=>e&&e.error?'error: '+esc(e.error):!e||!e.length?'(no events)':e.map(x=>'['+esc(x[0])+'] "'+show(x[1])+'"'+(x[2]?' id='+show(x[2]):'')).join(', ');
  const bad=c=>D.parsers.some(p=>!same(D.res[p.name][c.id],c.spec));
  let cur=D.cases[0].id;
  const cs=document.getElementById('pz-cases');
  cs.innerHTML=D.cases.map(c=>'<button data-c="'+c.id+'"'+(bad(c)?' class="dv" title="at least one parser departs from the standard"':'')+'>'+esc(c.title)+'</button>').join('');
  function card(){
    const c=D.cases.find(x=>x.id===cur),n=c.spec.length;
    cs.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.c===cur));
    document.getElementById('pz-card').innerHTML='<div class="t" style="font-weight:600">'+esc(c.title)+'</div><div class="bytes">'+c.chunks.map(k=>'<span class="ck">'+esc(k)+'</span>').join('')+'</div>'+
      '<p class="small mute">␊ is a line feed, ␍ a carriage return, ␀ a NUL byte; each dashed box is one network write.</p>'+
      '<p><b>Predict:</b> how many events does the standard dispatch?</p><div class="opts">'+[0,1,2].map(k=>'<button data-k="'+k+'">'+k+'</button>').join('')+'</div><div class="rev" hidden></div>';
    const card=document.getElementById('pz-card');
    card.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{
      card.querySelectorAll('.opts button').forEach(x=>{x.classList.remove('right','wrong');if(+x.dataset.k===n)x.classList.add('right')});
      if(+b.dataset.k!==n)b.classList.add('wrong');
      const r=card.querySelector('.rev');r.hidden=false;
      r.innerHTML='<p><b>The standard:</b> '+evs(c.spec)+'. '+esc(c.rule)+'</p><div class="tw"><table><thead><tr><th>Parser</th><th>Delivered</th></tr></thead><tbody>'+
        D.parsers.map(p=>{const g=D.res[p.name][c.id],ok=same(g,c.spec);return '<tr><td>'+esc(p.name)+'</td><td class="'+(ok?'ok':'dv')+'">'+(ok?'ok: ':'')+'<span class="evl">'+evs(g)+'</span></td></tr>'}).join('')+'</tbody></table></div>'}));
  }
  cs.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;cur=b.dataset.c;card()});
  card();
  document.getElementById('pz-mx').innerHTML='<thead><tr><th>Case</th>'+D.parsers.map(p=>'<th>'+esc(p.name)+'</th>').join('')+'</tr></thead><tbody>'+
    D.cases.map(c=>'<tr><td>'+esc(c.title)+'</td>'+D.parsers.map(p=>{const g=D.res[p.name][c.id];return same(g,c.spec)?'<td class="ok">ok</td>':'<td class="dv"><span class="evl">'+evs(g)+'</span></td>'}).join('')+'</tr>').join('')+
    '<tr><td><b>Departures</b></td>'+D.parsers.map(p=>'<td><b>'+window.SDATA.dev[p.name]+'</b></td>').join('')+'</tr></tbody>';
  document.getElementById('pz-vers').textContent=D.parsers.map(p=>p.name+' '+p.version+' ('+p.lang+')').join('; ');
})();
