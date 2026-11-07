// ---- Reading: SSE anatomy (section 2), Wikimedia extract (section 3) ----
(function(){
  const D=window.SDATA,esc=RD.esc;
  // SSE event anatomy
  const INFO={ev:'<b>event: content_block_delta</b> (26 characters plus a newline = 27 bytes) sets this event\'s type. A browser delivers it to addEventListener(\'content_block_delta\'), not to onmessage.',
    data:'<b>data:</b> one line of JSON: 6 bytes of <code>data: </code>, 83 bytes of JSON, 1 newline. The token "The" is 3 of the 83.',
    blank:'<b>The blank line</b> (1 byte) is the signal: only now does the parser deliver the event. A stream cut before it loses the whole event.'};
  const ann=document.getElementById('sse-ann'),info=document.getElementById('sse-info');
  if(ann)ann.addEventListener('click',e=>{const s=e.target.closest('span[data-p]');if(!s)return;
    ann.querySelectorAll('span[data-p]').forEach(x=>x.classList.toggle('on',x===s));info.innerHTML=INFO[s.dataset.p]});
  // Wikimedia extract
  const wm=document.getElementById('wm-pre');
  if(wm)wm.textContent='$ '+D.wm.cmd+'\n'+D.wm.headers.join('\n')+'\n\n'+D.wm.first_line+'\n\nevent: '+D.wm.event_type_line+'\nid: '+D.wm.ids[0]+'\ndata: {'+D.wm.data_keys.map(k=>'"'+k+'":...').join(',')+'}\n\n(field values not kept; '+D.wm.complete_events_in_4s+' events in 4 s)';
})();
