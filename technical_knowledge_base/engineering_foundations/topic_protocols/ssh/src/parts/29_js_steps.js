// ---- Inline scenario steppers (sections 3 and 4): each step is the lab topology with the path in use and the matching lines of that
// step's recorded log; the step's explanation is the step list on the left (sx-hk, sx-hc). The full logs sit in closed blocks.
// Autoplay (2026-11-06): RD.anim plays once the card is half in view and stops for good on any reader control.
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
    const fig=document.getElementById(id+'-fig'),pre=document.getElementById(id+'-log');
    function draw(i){const st=steps[Math.min(i,steps.length-1)];TOPO.draw(fig,st);
      pre.innerHTML=excerpt(st.log,st.re)}
    const A=RD.anim({card:id+'-card',ctl:id+'-ctl',n:steps.length,draw,ms:4200,label:'Step',list:'sx-'+id});
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
})();
