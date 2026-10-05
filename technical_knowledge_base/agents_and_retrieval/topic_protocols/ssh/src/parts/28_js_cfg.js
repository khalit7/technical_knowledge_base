// ---- Section 13: an annotated ~/.ssh/config for a cluster behind a bastion. Click a line.
(function(){
  const C=[
    ['# ~/.ssh/config: specific blocks first, Host * last (first value wins)','c'],
    ['Host bastion','Starts a block for the name you type. Everything indented below applies when you run <code>ssh bastion</code> (or when another block jumps through it).'],
    ['    HostName bastion.example.ac.uk','The real address. You type the short alias; <code>ssh -G bastion | grep hostname</code> shows what is dialled.'],
    ['    User khalid','Your account name on the cluster, if it differs from your laptop’s.'],
    ['    IdentityFile ~/.ssh/id_ed25519_sk','A hardware key for the internet-facing hop (section 2): a stolen laptop file is useless without the token.'],
    ['    ControlMaster auto','Reuse one login for every later command (section 7): recorded [[mux_n]] ms to [[mux_reuse]] ms per command through a 40 ms bastion.'],
    ['    ControlPath ~/.ssh/cm/%C','Where the control socket lives. <code>mkdir -m 700 ~/.ssh/cm</code> first: anyone who can open it can use your session. <code>%C</code> keeps the path short (socket paths are limited to about 104 to 108 bytes).'],
    ['    ControlPersist 4h','Keep the master alive in the background for 4 hours after the first session closes: one two-factor prompt per morning.'],
    ['',''],
    ['Host login gpu-login','Two aliases for the login node.'],
    ['    HostName %h.cluster.internal','<code>%h</code> expands to the alias you typed, so one block serves several hosts.'],
    ['    ProxyJump bastion','Reach it through the bastion with an end-to-end session (section 5); no agent forwarding needed (section 6).'],
    ['    ControlMaster auto','Multiplex this hop too; each hop has its own master.'],
    ['    ControlPath ~/.ssh/cm/%C',''],
    ['    ControlPersist 4h',''],
    ['',''],
    ['Host gpu-node-*','All compute nodes. They are rebuilt often, so their host keys churn (section 3).'],
    ['    ProxyJump login','Two hops: laptop to bastion to login to node, each end to end.'],
    ['    UserKnownHostsFile ~/.ssh/known_hosts_nodes','A separate known_hosts for nodes only, so clearing it never touches the bastion’s entry.'],
    ['    StrictHostKeyChecking accept-new','Add new nodes silently but still refuse a <i>changed</i> key (recorded in section 3). Better still: replace both lines with one <code>@cert-authority gpu-node-*</code> entry if the site signs host keys.'],
    ['',''],
    ['Host *','Defaults for everything, last because the first value obtained wins.'],
    ['    IdentitiesOnly yes','Offer only the keys named in config, not every key in the agent: avoids "Too many authentication failures" (recorded in section 2).'],
    ['    AddKeysToAgent yes','Load a key into the agent the first time you use it, so the passphrase is asked once.'],
    ['    ServerAliveInterval 30','Probe a silent server every 30 s inside the encrypted connection; with the next line, give up after about 90 s instead of hanging (section 9).'],
    ['    ServerAliveCountMax 3',''],
    ['    ForwardAgent no','The default, stated so nobody adds <code>yes</code> here: forwarding to every host hands your keys to every host’s root (section 6).'],
    ['    ExitOnForwardFailure yes','A tunnel that cannot listen is an error, not a warning (section 8).'],
    ['    HashKnownHosts yes','Store host names hashed, so a stolen known_hosts does not list your infrastructure.']];
  const card=document.getElementById('cfg-card');
  card.innerHTML='<div class="cfg" role="listbox" aria-label="Annotated SSH config">'+C.map((r,i)=>'<div data-i="'+i+'"'+(r[1]==='c'||!r[1]?' class="c"':' tabindex="0" role="option"')+'>'+(RD.esc(r[0])||' ')+'</div>').join('')+'</div><div class="cfg-ex" id="cfg-ex">Click a line.</div>';
  const ex=document.getElementById('cfg-ex');
  function pick(i){const r=C[i];if(!r||!r[1]||r[1]==='c')return;card.querySelectorAll('.cfg div').forEach(d=>d.classList.toggle('sel',+d.dataset.i===i));ex.innerHTML='<b><code>'+RD.esc(r[0].trim())+'</code></b><br>'+r[1]}
  card.addEventListener('click',e=>{const d=e.target.closest('.cfg div');if(d)pick(+d.dataset.i)});
  card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){const d=e.target.closest('.cfg div');if(d){e.preventDefault();pick(+d.dataset.i)}}});
  pick(5);
})();
