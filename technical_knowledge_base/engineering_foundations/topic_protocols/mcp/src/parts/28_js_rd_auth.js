// ---- Reading section 7: the recorded OAuth flow as a stepped sequence diagram (moved from the Wire lab tab and drawn on 2026-10-24).
// Each step is one recorded exchange; the drawing shows every arrow, the current one highlighted. Never plays by itself. ----
(function(){
  if(!document.getElementById('au-card'))return;
  const D=window.MCPD,E=RD.esc,T=RD.t,$=id=>document.getElementById(id);
  const S=D.auth.steps;
  // lanes: 0 client, 1 MCP server, 2 authorization server, 3 client ID metadata document
  // per recorded step: from lane, to lane, short label, caption title, caption text
  const ST=[
    [0,1,'POST /mcp, no token','Call without a token','The SDK client tries tools/call with no Authorization header.'],
    [1,0,'401 + resource_metadata','401 and a pointer','The server refuses and names its protected resource metadata in WWW-Authenticate (RFC 9728). Note error="invalid_token" although no token was sent, and no scope (both findings are in the closed block below).'],
    [0,1,'GET protected resource metadata','Fetch the resource metadata','GET /.well-known/oauth-protected-resource/mcp on the MCP server. Without the header, a client tries the well-known URLs itself.'],
    [1,0,'200: resource, authorization_servers','Who may issue tokens for this server','The document names the resource (this server\'s canonical URL, http://127.0.0.1:30752/mcp) and its authorization_servers.'],
    [0,2,'GET AS metadata (RFC 8414)','Fetch the authorization server metadata','The RFC 8414 well-known URL built from the issuer (OpenID Connect discovery is the alternative).'],
    [2,0,'200: endpoints, S256, CIMD','Endpoints and capabilities','The client checks that issuer equals the address it fetched, then reads code_challenge_methods_supported ["S256"], client_id_metadata_document_supported and authorization_response_iss_parameter_supported.'],
    [2,3,'AS fetches client.json','The client identity, without registration','The client_id is an HTTPS URL (a Client ID Metadata Document). Before showing consent the authorization server fetches it and checks that client_id matches and the redirect URI is listed. This replaces Dynamic Client Registration (RFC 7591), now deprecated, under which every authorization server had to accept registrations from anyone.'],
    [0,2,'GET /authorize (PKCE, resource=)','Authorization request, in the browser','response_type=code, the CIMD URL as client_id, a PKCE code_challenge with S256, state, scope=ckpt:read and resource=http://127.0.0.1:30752/mcp. The resource parameter (RFC 8707) is the MCP-specific must: it says which server the token is for.'],
    [2,0,'302: code, state, iss','Consent (scripted) and redirect','A 302 to the client\'s loopback redirect with code, state and iss. The client compares iss with the issuer it recorded before redirecting (RFC 9207, required of clients since 2026-07-28).'],
    [0,2,'POST /token (verifier, resource)','Token request','The code plus the PKCE code_verifier, redirect_uri, client_id and resource again.'],
    [2,0,'200: JWT, aud = MCP server','Access token','A JWT whose aud is the MCP server, scope ckpt:read, valid 10 minutes.'],
    [0,1,'POST /mcp + Bearer','Retry with the token','The same tools/call, now with Authorization: Bearer on the request (never in the URL).'],
    [1,0,'200: three checkpoints','200: the result','Audience, issuer, expiry and scope all check out.'],
    [0,1,'POST tools/list + Bearer','tools/list','The SDK client lists tools to validate the structured result; the token rides on every request.'],
    [1,0,'200','Done','Eight HTTP exchanges with the MCP server and the authorization server, plus one fetch of the identity document.']];
  const STAGE=['401','resource metadata','AS metadata','client identity','authorize','token','call'];
  const stOf=i=>i<2?0:i<4?1:i<6?2:i<7?3:i<9?4:i<11?5:6;
  const LN=['Client (SDK)','MCP server','Auth server','Client ID doc'];
  const LS=['client','MCP server :30752','authorization server :30751','client.json :30744'];
  function draw(i){
    const W=RD.width($('au-svg')),nw=W<560,P=8,top=36,rh=nw?24:22,H=top+ST.length*rh+10;
    const cx=[0,1,2,3].map(k=>P+(W-2*P)*(0.1+0.8*k/3));
    let b='';
    LN.forEach((n,k)=>{const bw=Math.min(130,(W-2*P)/4-6);
      b+='<rect x="'+(cx[k]-bw/2)+'" y="4" width="'+bw+'" height="24" rx="6" fill="'+(k===1?'var(--acc2)':'var(--soft)')+'" stroke="'+(k===1?'var(--acc)':'var(--line)')+'"/>'+T(cx[k],20,E(nw?n.split(' ')[0]+(k===3?' doc':k===2?' AS':''):n),{a:'middle',fs:11,w:600});
      b+='<line x1="'+cx[k]+'" y1="28" x2="'+cx[k]+'" y2="'+(H-4)+'" stroke="var(--line)" stroke-dasharray="3 3"/>'});
    ST.forEach((s,k)=>{const y=top+k*rh+rh*0.62,x1=cx[s[0]],x2=cx[s[1]],cur=k===i,past=k<i;
      const col=cur?'var(--acc)':(past?'var(--ink)':'var(--dim)');
      const dx=x2>x1?-1:1;b+='<line x1="'+x1+'" y1="'+y+'" x2="'+(x2+dx*6)+'" y2="'+y+'" stroke="'+col+'" stroke-width="'+(cur?2.6:1.3)+'"/><path d="M'+x2+' '+y+'L'+(x2+dx*8)+' '+(y-4)+'L'+(x2+dx*8)+' '+(y+4)+'z" fill="'+col+'"/>';
      const len=s[2].length*6.1,lx=Math.max(16,Math.min(Math.min(x1,x2)+4,W-2-len)),txt=s[2];
      b+=T(lx,y-4,E(txt),{fs:11,fill:cur?'var(--acc)':(past?'var(--ink)':'var(--mute)'),w:cur?600:400});
      b+=T(2,y+4,String(k+1),{fs:11,fill:'var(--mute)'});
    });
    $('au-svg').innerHTML=RD.svg(W,H,b,'Sequence of the recorded OAuth flow between client, MCP server, authorization server and the client identity document');
    $('au-stage').innerHTML=STAGE.map((x,k)=>'<span class="'+(k===stOf(i)?'on':(k<stOf(i)?'done':''))+'">'+x+'</span>').join('');
    const s=ST[i],r=S[i]||{s:''};
    $('au-cap').innerHTML='<div class="t">Step '+(i+1)+' of '+ST.length+': '+E(s[3])+'</div><p>'+E(s[4])+' <span class="mute">('+E(LS[s[0]])+' to '+E(LS[s[1]])+')</span></p>';
    $('au-msg').textContent=(r.s||'').replace(/\r/g,'');
  }
  const an=RD.anim({card:'au-card',ctl:'au-ctl',n:Math.min(S.length,ST.length),draw,ms:2200,label:'Step through the authorization flow'});
  RD.onResize(()=>an.redraw());
})();
