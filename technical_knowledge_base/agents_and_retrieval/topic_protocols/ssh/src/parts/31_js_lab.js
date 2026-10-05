// ---- Cluster lab tab: scenarios as steps on the topology, each with its recorded log highlighted.
(function(){
  const L=SSHD.logs;
  const P=(a,b,label,c,dash,off)=>({a,b,label,c,dash,off});
  const SC=[
   {n:'Log in to the bastion',steps:[
     {t:'TCP, then banners',p:'The laptop connects to 127.0.0.1:30922 (the bastion’s published port) and both sides send their identification strings.',paths:[P('lap','bas','TCP + banners')],log:'vvv_bastion',re:/Connecting to|Connection established|version string|remote software version/},
     {t:'Algorithm negotiation and key exchange',p:'Both KEXINIT lists, then the choice: mlkem768x25519-sha256, ssh-ed25519 host key, chacha20-poly1305.',paths:[P('lap','bas','KEXINIT, key exchange')],log:'vvv_bastion',re:/KEX algorithms|kex: algorithm|kex: host key|cipher:|strict KEX/},
     {t:'Host key check',p:'The server’s host key signature is verified and the key matched against known_hosts line 1.',paths:[P('lap','bas','host key')],hl:{bas:'good'},log:'vvv_bastion',re:/Server host key|is known and matches|Found key/},
     {t:'Encryption on, extensions',p:'NEWKEYS both ways (sequence numbers reset by strict KEX), then EXT_INFO: server-sig-algs, publickey-hostbound, ping, agent-forward.',paths:[P('lap','bas','encrypted')],log:'vvv_bastion',re:/NEWKEYS|seqnr|ext_info|EXT_INFO/},
     {t:'Public key authentication',p:'The key is offered, accepted, and a signature made with the hostbound variant.',paths:[P('lap','bas','publickey')],hl:{lap:'good'},log:'vvv_bastion',re:/Authentications that can continue|Offering|Server accepts|sign_and_send|Authenticated to/},
     {t:'A session channel runs the command',p:'Channel 0 opens, the command runs, exit status 0 comes back, the connection closes.',paths:[P('lap','bas','channel 0: session')],log:'vvv_bastion',re:/channel 0|exit-status|Transferred|client_input_channel_req/}]},
   {n:'ProxyJump to a node',steps:[
     {t:'ProxyJump becomes a helper ssh -W',p:'The client converts ProxyJump into ProxyCommand <code>ssh -W [gpu-node-01]:22 bastion</code>.',paths:[P('lap','bas','helper ssh')],log:'vvv_jump',re:/ProxyCommand|proxy command|Started with/},
     {t:'The bastion opens a direct-tcpip channel',p:'On the bastion, sshd logs a direct-tcpip request to gpu-node-01 port 22: it connects the stream and relays bytes.',paths:[P('lap','bas','outer session'),P('bas','n1','TCP to :22','var(--c3)',1)],hl:{bas:'on'},log:'bastion_log_jump',re:/direct.tcpip|Accepted publickey/},
     {t:'An end-to-end session with the node',p:'Through that stream the laptop does a second key exchange and login with gpu-node-01 itself.',paths:[P('lap','bas','outer'),P('lap','bas','','var(--good)',0,1.2),P('bas','n1','inner, end to end','var(--good)')],hl:{n1:'good'},log:'vvv_jump',re:/kex: algorithm|Server host key|Authenticated to|remote software/}]},
   {n:'Agent forwarding (-A)',steps:[
     {t:'The forwarded socket exists on the bastion',p:'While the -A session is open, the bastion has a socket under /home/khalid/.ssh/agent/.',paths:[P('lap','bas','session + agent')],badges:{bas:'agent socket'},log:'agent_forward',re:/SSH_AUTH_SOCK|socket:/},
     {t:'Root lists the laptop’s key and uses it',p:'Root on the bastion uses the socket to log in to both nodes as khalid.',paths:[P('lap','bas','sign requests','var(--bad)'),P('bas','n1','root as khalid','var(--bad)'),P('bas','n2','root as khalid','var(--bad)')],hl:{bas:'bad',n1:'bad',n2:'bad'},log:'agent_forward',re:/ED25519|logged in|refused/},
     {t:'With destination constraints',p:'Same attack against a key added with ssh-add -h: the allowed hop works, the other is refused.',paths:[P('lap','bas','','var(--bad)'),P('bas','n1','allowed hop','var(--bad)'),P('bas','n2','refused','var(--good)',1)],hl:{n2:'good'},log:'agent_constrained',re:/logged in|refused|Permission denied|gpu-node-01$/},
     {t:'With ProxyJump',p:'No agent channel, no socket: root finds nothing.',paths:[P('lap','bas'),P('bas','n1','end to end','var(--good)')],hl:{bas:'good'},log:'agent_proxyjump',re:/done|socket/}]},
   {n:'Multiplexing',steps:[
     {t:'A second client finds the master',p:'The client finds the control socket and asks the master for a new session channel: no TCP, no key exchange, no login.',paths:[P('lap','bas','existing master'),P('bas','n1','','var(--c3)')],badges:{lap:'cm/%C socket'},log:'mux_vvv_reuse',re:/mux|master/i},
     {t:'What the master negotiated',p:'<code>-O conninfo</code> (10.3) prints the master’s algorithms and traffic counters.',paths:[P('lap','bas'),P('bas','n1')],log:'mux_conninfo',re:/kexalgorithm|cipher|traffic/},
     {t:'Open channels',p:'<code>-O channels</code> (10.3) lists the channels while another session is running.',paths:[P('lap','bas'),P('bas','n1')],log:'mux_channels',re:/client-session|mux-control/},
     {t:'One master, one fate',p:'<code>-O exit</code> stops the master; the session riding it ends at once with status 255.',paths:[P('lap','bas','closed','var(--bad)',1)],hl:{lap:'bad'},log:'mux_exit',re:/exit|Exit/}]},
   {n:'Host key churn',steps:[
     {t:'First contact',p:'Trust on first use: the fingerprint is shown and must be compared out of band.',paths:[P('lap','bas'),P('bas','n1','new host','var(--c5)')],hl:{n1:'on'},log:'hk_first_contact',re:/authenticity|fingerprint|SHA256/},
     {t:'The node is rebuilt',p:'New host key. accept-new still refuses a changed key.',paths:[P('lap','bas'),P('bas','n1','key changed','var(--bad)')],hl:{n1:'bad'},log:'hk_changed_acceptnew',re:/WARNING|Offending|changed|failed/},
     {t:'StrictHostKeyChecking no',p:'It connects anyway with public key auth; only password, keyboard-interactive and forwarding are blocked.',paths:[P('lap','bas'),P('bas','n1','unverified','var(--bad)',1)],hl:{n1:'bad'},log:'hk_changed_no',re:/disabled|gpu-node-01$/},
     {t:'Remove the stale entry',p:'After checking the new fingerprint: ssh-keygen -R.',paths:[P('lap','bas')],log:'hk_remove',re:/found|updated/}]},
   {n:'Host certificates',steps:[
     {t:'The node presents a host certificate',p:'known_hosts holds one @cert-authority line; the node is accepted with no prompt.',paths:[P('lap','bas'),P('bas','n1','host cert','var(--good)')],hl:{n1:'good'},log:'hk_cert_ok',re:/certificate|Certificate/},
     {t:'Rebuilt and re-signed',p:'New key, new certificate at boot: still no prompt, nothing to edit.',paths:[P('lap','bas'),P('bas','n1','new key, same CA','var(--good)')],hl:{n1:'good'},log:'hk_cert_after_rebuild',re:/certificate|Certificate/},
     {t:'Certificate for the wrong name',p:'Signed for gpu-node-99: refused.',paths:[P('lap','bas'),P('bas','n1','wrong name','var(--bad)')],hl:{n1:'bad'},log:'hk_cert_wrong_name',re:/invalid|failed|No ED25519/}]},
   {n:'User certificates',steps:[
     {t:'A good 8-hour certificate',p:'The node logs the key ID, serial 42 and the CA.',paths:[P('lap','bas'),P('bas','n1','cert login','var(--good)')],hl:{n1:'good'},log:'cert_good',re:/Accepted|Key ID|Serial|Valid|Principals/},
     {t:'Expired',p:'Client: Permission denied. Node: Certificate invalid: expired.',paths:[P('lap','bas'),P('bas','n1','refused','var(--bad)')],hl:{n1:'bad'},log:'cert_expired',re:/Refusing|denied|Valid/},
     {t:'Wrong principal',p:'Issued for alice, used as khalid.',paths:[P('lap','bas'),P('bas','n1','refused','var(--bad)')],hl:{n1:'bad'},log:'cert_wrong_principal',re:/Refusing|denied|Principals|alice/},
     {t:'No principals',p:'ssh-keygen warns; the node refuses.',paths:[P('lap','bas'),P('bas','n1','refused','var(--bad)')],hl:{n1:'bad'},log:'cert_no_principal',re:/Warning|Refusing|denied|Principals/},
     {t:'Revoked by KRL',p:'Serial 46 is in the node’s revocation list.',paths:[P('lap','bas'),P('bas','n1','revoked','var(--bad)')],hl:{n1:'bad'},log:'cert_revoked',re:/revoked|denied/}]},
   {n:'Notebook tunnels',steps:[
     {t:'-L to the notebook through the bastion',p:'One command; the browser on the laptop reaches 127.0.0.1:8888 on the node.',paths:[P('lap','bas','-L 30988'),P('bas','n1','to 127.0.0.1:8888','var(--good)')],badges:{n1:'notebook'},log:'fwd_L',re:/token|Local connections|direct-tcpip|^\d{3}$/},
     {t:'-L to a Unix socket',p:'The private-directory socket other users cannot open.',paths:[P('lap','bas','-L 30986'),P('bas','n1','unix socket','var(--good)')],log:'fwd_L_unix',re:/token/},
     {t:'-D: one SOCKS proxy',p:'Names must resolve on the far side (socks5h); loopback-bound services stay unreachable.',paths:[P('lap','bas','SOCKS'),P('bas','n1','any host:port','var(--c3)')],log:'fwd_D',re:/exit|resolve|token|closed/},
     {t:'-R: the other way',p:'A port on the bastion’s loopback leads back to the laptop.',paths:[P('bas','lap','-R 30991','var(--c2)')],log:'fwd_R',re:/served|LISTEN/},
     {t:'Port already taken',p:'A warning, and the session continues unless ExitOnForwardFailure.',paths:[P('lap','bas')],hl:{lap:'bad'},log:'fwd_port_taken',re:/bind|exit|Could not|##/}]},
   {n:'Dead path, keepalives',steps:[
     {t:'The bastion freezes',p:'With ServerAliveInterval 2 and CountMax 2 the client gives up after a few seconds; without, it waits forever.',paths:[P('lap','bas','silence','var(--bad)',1),P('bas','n1','','var(--bad)',1)],hl:{bas:'bad'},log:'keepalive',re:/exited|waiting|##/}]},
   {n:'The old node',steps:[
     {t:'No post-quantum key exchange',p:'The 10.x client warns; WarnWeakCrypto no-pq-kex silences it for that host.',paths:[P('lap','bas'),P('bas','n2','curve25519 only','var(--c5)')],hl:{n2:'bad'},log:'pq_warning',re:/WARNING|kex: algorithm|store now|upgraded/},
     {t:'Forcing ML-KEM fails',p:'Unable to negotiate: the server’s offer is printed.',paths:[P('lap','bas'),P('bas','n2','no common kex','var(--bad)')],hl:{n2:'bad'},log:'errors_extra',re:/Unable to negotiate|Connection refused|stdio forwarding|Permission denied/},
     {t:'Banner against package',p:'OpenSSH_9.7 in the banner, but the distribution package carries the 2024 and 2025 fixes.',paths:[P('lap','bas'),P('bas','n2')],log:'banner_vs_package',re:/9\.7/}]},
   {n:'Penalties and auth failures',steps:[
     {t:'Too many authentication failures',p:'Seven agent keys against MaxAuthTries 6; IdentitiesOnly fixes it.',paths:[P('lap','bas','6 wrong keys','var(--bad)')],hl:{bas:'bad'},log:'too_many_auth',re:/Offering|Too many|fixed/},
     {t:'PerSourcePenalties blocks the bastion',p:'Four failed logins from the bastion’s address; the node then drops every connection from it for about 16 s, for every user behind the bastion.',paths:[P('lap','bas'),P('bas','n1','penalised','var(--bad)')],hl:{n1:'bad'},log:'penalties',re:/penalty|drop connection|attempt/}]}];
  const list=document.getElementById('lab-list'),fig=document.getElementById('lab-fig'),cap=document.getElementById('lab-cap'),pre=document.getElementById('lab-log'),ln=document.getElementById('lab-logname');let sc=0;
  list.innerHTML=SC.map((s,i)=>'<button data-i="'+i+'"'+(i===0?' class="on"':'')+'>'+RD.esc(s.n)+'</button>').join('');
  function draw(i){const st=SC[sc].steps[Math.min(i,SC[sc].steps.length-1)];TOPO.draw(fig,st);cap.innerHTML='<div class="t">'+(i+1)+'/'+SC[sc].steps.length+'. '+st.t+'</div><p>'+st.p+'</p>';
    const t=L[st.log]||'(missing)';ln.textContent='Recorded log: src/raw/'+st.log+(st.log.startsWith('wire')?'.jsonl':'.txt');
    let first=-1;pre.innerHTML=t.split('\n').map((l,j)=>{const m=st.re&&st.re.test(l);if(m&&first<0)first=j;return m?'<mark>'+RD.esc(l)+'</mark>':RD.esc(l)}).join('\n');
    const mk=pre.querySelector('mark');if(mk&&pre.offsetParent)pre.scrollTop=Math.max(0,mk.offsetTop-pre.offsetTop-30);}
  const A=RD.anim({card:'lab-card',ctl:'lab-ctl',n:SC[0].steps.length,draw,ms:3200,label:'Step',tab:'t-lab'});
  list.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;list.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));sc=+b.dataset.i;A.reset(SC[sc].steps.length)});
  RD.onResize(()=>A.redraw(),'t-lab');
})();
