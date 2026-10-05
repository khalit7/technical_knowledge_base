// ---- Wire lab tab ----
(function(){
  const D=window.MCPD,E=RD.esc,$=id=>document.getElementById(id);
  // 1. auth stepper: captions written for the recorded order (gen_data.py fixes the order)
  const CAP=[
    ['Call without a token','The client tries tools/call with no Authorization header.'],
    ['401 and a pointer','The server refuses and names its protected resource metadata in WWW-Authenticate (RFC 9728). Note error="invalid_token" although no token was sent, and no scope.'],
    ['Fetch the resource metadata','GET /.well-known/oauth-protected-resource/mcp on the MCP server.'],
    ['Who may issue tokens for me','The document names the resource (this server\'s canonical URL) and its authorization_servers.'],
    ['Fetch the authorization server metadata','RFC 8414 well-known URL built from the issuer.'],
    ['Endpoints and capabilities','The client checks issuer equals the URL it built, then reads client_id_metadata_document_supported and authorization_response_iss_parameter_supported.'],
    ['The authorization server reads the client\'s identity','Before showing consent it fetches the client_id URL (a Client ID Metadata Document) and checks that client_id matches and the redirect URI is listed.'],
    ['Authorization request (browser)','response_type=code, the CIMD URL as client_id, PKCE code_challenge with S256, state, scope=ckpt:read and resource=the MCP server.'],
    ['Consent (scripted) and redirect','302 to the client\'s loopback redirect with code, state and iss. The client compares iss to the issuer it recorded (RFC 9207).'],
    ['Token request','The code plus the PKCE code_verifier, redirect_uri, client_id and resource again.'],
    ['Access token','A JWT whose aud is the MCP server, scope ckpt:read, 10 minutes.'],
    ['Retry with Bearer','The same tools/call, now with Authorization: Bearer.'],
    ['200: the result','Audience, issuer, expiry and scope all check out.'],
    ['tools/list','The SDK client lists tools to validate the structured result; the token rides on every request.'],
    ['200','Done: eight HTTP exchanges with the MCP server and authorization server, one fetch of the identity document.']];
  const S=D.auth.steps;
  const stage=['401','resource metadata','AS metadata','client identity','authorize','token','call'];
  const stOf=i=>i<2?0:i<4?1:i<6?2:i<7?3:i<9?4:i<11?5:6;
  function draw(i){const s=S[i],c=CAP[i]||['',''];
    $('lb-auth-stage').innerHTML=stage.map((x,k)=>'<span class="'+(k===stOf(i)?'on':(k<stOf(i)?'done':''))+'">'+x+'</span>').join('');
    const who=s.src==='mcp'?'MCP server (30752)':s.src==='as'?'authorization server (30751)':'authorization server fetches the client identity document';
    $('lb-auth-cap').innerHTML='<div class="t">'+(i+1)+'/'+S.length+' '+E(c[0])+'</div><p>'+E(c[1])+' <span class="mute">('+(s.dir==='up'?'to ':s.dir==='down'?'from ':'')+E(who)+')</span></p>';
    $('lb-auth-msg').textContent=s.s.replace(/\r/g,'');}
  RD.anim({card:'lb-auth-card',ctl:'lb-auth-ctl',n:S.length,draw,ms:2200,label:'Step through the authorization flow'});
  // 2. transports
  const sel=$('lb-tr-sel');sel.innerHTML=D.tr.map((r,i)=>'<option value="'+i+'">'+E(r.name)+'</option>').join('');
  function tr(){const r=D.tr[+sel.value];
    $('lb-tr-list').innerHTML=r.coldmsgs.length?r.coldmsgs.map(m=>'<li><span class="d'+(m.d==='client->server'?'':' s')+'">'+(m.d==='client->server'?'client':'server')+'</span><pre class="w">'+E(m.s.replace(/\r/g,''))+'</pre></li>').join(''):'<li class="small mute">(not recorded)</li>'}
  sel.addEventListener('change',tr);tr();
  // 3. hostile requests
  const ws=$('lb-wc-sel');ws.innerHTML=D.wc.map((c,i)=>'<option value="'+i+'">'+E(c.case)+'</option>').join('');
  function wc(){const c=D.wc[+ws.value];
    $('lb-wc-out').textContent=c.method+' /mcp\n'+Object.entries(c.hdr).map(([a,v])=>a+': '+v).join('\n')+'\n\n-> HTTP '+c.st+'\n'+(c.resp||'(empty body)')}
  ws.addEventListener('change',wc);wc();
  $('lb-ver').textContent='Versions recorded: '+D.ver.replace(/\n/g,'; ');
})();
