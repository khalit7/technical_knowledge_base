// ---- Sections 7 and 9: the recorded handshake, the three proxy failures ----
(function(){
  const D=window.SDATA,esc=RD.esc;
  const hs=document.getElementById('ws-hs');
  if(hs){const f=D.wsb.frames;const req=f[0].text.replace(/\r/g,''),res=f[1].text.replace(/\r/g,'').replace(/^Date:.*\n/m,'');
    hs.textContent='client to server ('+f[0].len+' bytes)\n'+req+'server to client ('+f[1].len+' bytes, Date line not shown)\n'+res+'computed: base64(SHA-1(key + GUID)) = '+D.wsb.accept_expected+'  matches: '+f[1].accept_matches}
  const rows=document.getElementById('wsp-rows');
  if(rows){const P=D.wsp,N=D.wsn;
    const py=c=>c.error?esc(c.error):c.messages.length+' messages, ended normally ('+c.ended_at_s+' s)';
    const nd=c=>esc(c.events.join('; '))+(c.messages?' ('+c.messages+' message'+(c.messages===1?'':'s')+')':'');
    const ch=c=>esc(c.events.join('; '))+(c.messages?' ('+c.messages+' message'+(c.messages===1?'':'s')+')':'');
    rows.innerHTML=[
      ['Proxy drops Upgrade (port 30411)',py(P.no_upgrade_headers),nd(N.node_no_upgrade),ch(N.chrome_no_upgrade)],
      ['Proxy idle timeout 2 s, server silent 6 s',py(P.idle_no_ping)+' after '+P.idle_no_ping.ended_at_s+' s; got '+P.idle_no_ping.messages.length+' message',nd(N.node_idle)+' after '+N.node_idle.ended_at_s+' s',ch(N.chrome_idle)+' after '+N.chrome_idle.ended_at_s+' s'],
      ['Same, client pings every 1 s',py(P.idle_ping_1s),'(not run)','(JavaScript cannot send pings)'],
      ['Origin check, wrong origin',py(P.origin_checked_evil),nd(N.node_origin_evil),ch(N.chrome_origin_checked)+' (page origin http://127.0.0.1:30401)'],
      ['No origin check, Origin: https://evil.example',py(P.origin_unchecked_evil),'(not run)','(not run)']
    ].map(r=>'<tr><td>'+r[0]+'</td><td>'+r[1]+'</td><td>'+r[2]+'</td><td>'+r[3]+'</td></tr>').join('')}
  const c=document.getElementById('wsp-curl');
  if(c)c.textContent='$ curl -si -H "Upgrade: websocket" -H "Connection: Upgrade" -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \\\n    -H "Sec-WebSocket-Version: 13" http://127.0.0.1:30411/tokens      (Date line not shown)\n'+D.txt['ws_no_upgrade_curl.txt'].replace(/\r/g,'')+'\n\n$ (the same through the correctly configured port 30410)\n'+D.txt['ws_good_curl.txt'].replace(/\r/g,'');
  const l=document.getElementById('wsp-log');
  if(l)l.textContent='nginx error.log (level info; timestamp and process id not shown):\n'+D.txt['ws_nginx_error.txt'];
})();
