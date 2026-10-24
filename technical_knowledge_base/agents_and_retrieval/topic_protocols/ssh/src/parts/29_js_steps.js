// ---- Inline scenario steppers (sections 3, 4, 5, 8): each step is the lab topology with the path in use and the
// matching lines of that step's recorded log. They replace the old Cluster lab tab; the full logs sit in closed blocks.
// No autoplay: RD.anim waits on step 1 until the reader steps or presses play.
(function(){
  const L=SSHD.logs,P=(a,b,label,c,dash,off)=>({a,b,label,c,dash,off});
  function excerpt(name,re){
    const t=(L[name]||'(log '+name+' missing)').split('\n');let out=['# src/raw/'+name+'.txt'],last=-2;
    t.forEach((l,j)=>{if(re.test(l)){if(last>=0&&j>last+1)out.push('…');out.push('<mark>'+RD.esc(l)+'</mark>');last=j}});
    if(out.length===1)out.push(RD.esc(t.slice(0,6).join('\n')));
    return out.join('\n');
  }
  function mount(id,steps){
    const card=document.getElementById(id+'-card');if(!card)return;
    const fig=document.getElementById(id+'-fig'),cap=document.getElementById(id+'-cap'),pre=document.getElementById(id+'-log');
    function draw(i){const st=steps[Math.min(i,steps.length-1)];TOPO.draw(fig,st);
      cap.innerHTML='<div class="t">Step '+(i+1)+' of '+steps.length+'. '+st.t+'</div><p>'+st.p+'</p>';
      pre.innerHTML=excerpt(st.log,st.re)}
    const A=RD.anim({card:id+'-card',ctl:id+'-ctl',n:steps.length,draw,ms:3200,label:'Step'});
    RD.onResize(()=>A.redraw());
  }
  mount('hk',[
    {t:'First contact',p:'Trust on first use: the fingerprint is shown and must be compared out of band, here with the one read on the node itself.',paths:[P('lap','bas'),P('bas','n1','new host','var(--c5)')],hl:{n1:'on'},log:'hk_first_contact',re:/authenticity|fingerprint|SHA256|continue connecting/},
    {t:'The node is rebuilt: accept-new refuses',p:'New host key. <code>accept-new</code> adds unknown hosts silently but still refuses a <i>changed</i> key: exit 255, "Host key verification failed".',paths:[P('lap','bas'),P('bas','n1','key changed','var(--bad)')],hl:{n1:'bad'},log:'hk_changed_acceptnew',re:/WARNING|Offending|has changed|verification failed|exit/},
    {t:'StrictHostKeyChecking no: it connects anyway',p:'Exit 0: the public-key login ran the command on an unverified machine. Only password, keyboard-interactive and forwarding were blocked.',paths:[P('lap','bas'),P('bas','n1','unverified','var(--bad)',1)],hl:{n1:'bad'},log:'hk_changed_no',re:/disabled|exit 0|^gpu-node-01$/},
    {t:'After checking the new fingerprint: remove the stale line',p:'<code>ssh-keygen -R gpu-node-01</code> deletes the old entry (and keeps a backup); the next login is a first contact again.',paths:[P('lap','bas')],log:'hk_remove',re:/found|updated|retained/}]);
  mount('hc',[
    {t:'The node presents a host certificate',p:'<code>known_hosts</code> holds only the bastion and one <code>@cert-authority</code> line; the node is accepted with no prompt.',paths:[P('lap','bas'),P('bas','n1','host cert','var(--good)')],hl:{n1:'good'},log:'hk_cert_ok',re:/certificate|Certificate|Authenticated to gpu/},
    {t:'Rebuilt and re-signed',p:'New key, new certificate at boot: still no prompt, nothing to edit on any client.',paths:[P('lap','bas'),P('bas','n1','new key, same CA','var(--good)')],hl:{n1:'good'},log:'hk_cert_after_rebuild',re:/certificate|Certificate|Authenticated to gpu/},
    {t:'A certificate for the wrong name',p:'Signed for <code>gpu-node-99</code>: the CA line does not vouch for <code>gpu-node-01</code>, and no plain key is known either, so the login is refused.',paths:[P('lap','bas'),P('bas','n1','wrong name','var(--bad)')],hl:{n1:'bad'},log:'hk_cert_wrong_name',re:/invalid|failed|No ED25519|principal/}]);
  mount('pj',[
    {t:'ProxyJump becomes a helper ssh -W',p:'The client converts <code>ProxyJump bastion</code> into <code>ProxyCommand ssh -W [gpu-node-01]:22 bastion</code> and logs in to the bastion.',paths:[P('lap','bas','helper ssh')],hl:{bas:'on'},log:'vvv_jump',re:/ProxyCommand|proxy command|Started with|Connecting to|Authenticated to 127/},
    {t:'The bastion opens a direct-tcpip channel',p:'On the bastion, sshd accepts the key and logs a direct-tcpip request to gpu-node-01 port 22: it connects the stream and relays bytes.',paths:[P('lap','bas','outer session'),P('bas','n1','TCP to :22','var(--c3)',1)],hl:{bas:'on'},log:'bastion_log_jump',re:/direct.tcpip|Accepted publickey/},
    {t:'An end-to-end session with the node',p:'Through that stream the laptop does a second key exchange, checks the node’s host key itself and logs in: "Authenticated to gpu-node-01 (via proxy)".',paths:[P('lap','bas','outer'),P('lap','bas','','var(--good)',0,1.2),P('bas','n1','inner, end to end','var(--good)')],hl:{n1:'good'},log:'vvv_jump',re:/stdio|kex: algorithm|Server host key|Authenticated to gpu|remote software/}]);
  mount('tn',[
    {t:'-L to the notebook through the bastion',p:'One command; the laptop listens on 30988 (IPv4 and IPv6) and each browser connection becomes a direct-tcpip channel to 127.0.0.1:8888 on the node. Without the token the notebook answers 403.',paths:[P('lap','bas','-L 30988'),P('bas','n1','to 127.0.0.1:8888','var(--good)')],badges:{lap:'listens :30988',n1:'notebook'},log:'fwd_L',re:/token accepted|^403$|Local connections|listening on|new direct-tcpip/},
    {t:'-L to a Unix socket',p:'The same forward to a socket in a private directory, which other users of the node cannot open.',paths:[P('lap','bas','-L 30986'),P('bas','n1','unix socket','var(--good)')],badges:{lap:'listens :30986'},log:'fwd_L_unix',re:/token|socket/},
    {t:'-D: one SOCKS proxy',p:'Names must resolve on the far side (<code>socks5h</code>); the proxy connects from the bastion, so loopback-bound services on a node stay unreachable.',paths:[P('lap','bas','SOCKS :30989'),P('bas','n1','any host:port','var(--c3)')],badges:{lap:'listens :30989'},log:'fwd_D',re:/exit|resolve|token|closed|refused/},
    {t:'-R: the other way',p:'A port on the bastion’s loopback leads back to the laptop; <code>GatewayPorts no</code> keeps it off the network.',paths:[P('bas','lap','-R 30991','var(--c2)')],badges:{bas:'listens 127.0.0.1:30991'},log:'fwd_R',re:/served|LISTEN|127\.0\.0\.1/},
    {t:'Port already taken: a warning, not an error',p:'With only 127.0.0.1 taken, the IPv6 listener succeeded and even <code>ExitOnForwardFailure</code> let the session run; with both taken, it exited 255.',paths:[P('lap','bas')],hl:{lap:'bad'},badges:{lap:':30985 taken'},log:'fwd_port_taken',re:/bind|exit|Could not|##/}]);
})();
