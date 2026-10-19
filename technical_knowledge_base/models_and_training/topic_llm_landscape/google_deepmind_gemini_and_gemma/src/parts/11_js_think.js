// ---- Thinking-level matrix (Reading) ----
(function(){
  const L=['minimal','low','medium','high'];
  const M=[
    ['3.8 Flash','low medium high','medium'],['3.7 Flash','low medium high','medium'],['3.6 Flash','minimal low medium high','medium'],
    ['3.5 Flash','minimal low medium high','medium'],['3.5 Flash-Lite','minimal low medium high','minimal'],['3.1 Pro (preview)','low medium high','high'],
    ['3 Flash Preview','minimal low medium high','high'],['2.5 Pro','low medium high','on'],['2.5 Flash','low medium high','on'],['2.5 Flash-Lite','low medium high','off']
  ].map(([n,h,d])=>({n,has:h.split(' '),d}));
  let pick='medium';
  function draw(){
    let s='<tr><th>Model</th>'+L.map(l=>'<th class="'+(l===pick?'pk':'')+'" style="text-align:center">'+l+'</th>').join('')+'<th>Default</th></tr>';
    M.forEach(m=>{s+='<tr'+(m.has.includes(pick)?'':' class="rej"')+'><td>'+m.n+'</td>'+L.map(l=>{const ok=m.has.includes(l),df=m.d===l;
      return '<td class="'+(l===pick?'pk':'')+'" style="text-align:center">'+(ok?'<span class="dot'+(df?' df':'')+'" title="'+(df?'default':'accepted')+'"></span>':'<span class="mute">×</span>')+'</td>'}).join('')+'<td class="small">'+(L.includes(m.d)?m.d:(m.d==='off'?'thinking off':'on, no level stated'))+'</td></tr>'});
    $('thkTab').innerHTML=s;
    const no=M.filter(m=>!m.has.includes(pick)).map(m=>m.n),df=M.filter(m=>m.d===pick).map(m=>m.n);
    $('thkOut').innerHTML='<b>'+pick+'</b> '+(no.length?'is rejected by '+no.join(', ')+'.':'is accepted by every model listed.')+' '+(df.length?'It is the default on '+df.join(', ')+'.':'It is the default on none of them.');
  }
  segBind('thkSeg',m=>{pick=m;draw()});draw();
})();
