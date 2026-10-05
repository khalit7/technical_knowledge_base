// ---- Small recorded views: certificate refusals, who reaches the notebook, file transfer bars, the config explainer.
(function(){
  const L=SSHD.logs;
  // certificates: client side against server side
  const co=document.getElementById('cert-out');
  function cert(k){const t=L[k]||'';const parts=t.split('--- gpu-node-01 sshd log ---');const cl=(parts[0]||'').split('\n').filter(l=>/Offering public key: .*cert_only|Permission denied|Authenticated to gpu|Warning: certificate|^\s+(Valid|Serial|Principals|alice|khalid$)|revoked|\[exit/.test(l)).join('\n');
    const sv=(parts[1]||'').split('\n').filter(l=>/Refusing|revoked|Failed publickey|Accepted|invalid/i.test(l)).join('\n');
    co.innerHTML='<div><div class="band">What the client shows</div><pre class="blk">'+RD.esc(cl)+'</pre></div><div><div class="band">What the node logs</div><pre class="blk">'+RD.esc(sv)+'</pre></div>'}
  cert('cert_expired');RD.seg(document.getElementById('cert-seg'),cert);
  // who reaches the notebook
  const R=SSHD.reach,rt=document.getElementById('reach-tbl');
  rt.innerHTML='<table><tr><th>Who tries</th><th>Result (recorded)</th></tr>'+Object.keys(R).map(k=>{const v=R[k];const ok=/^200|^403|connected/.test(v);return '<tr><td>'+RD.esc(k)+'</td><td><span class="'+(ok?'no':'ok')+'">'+(ok?'reached it':'blocked')+'</span> <span class="small mute">'+RD.esc(v)+'</span></td></tr>'}).join('')+'</table><p class="small mute">"403" means the connection reached the notebook and only the missing token stopped it; red marks a connection that got through.</p>';
  // transfers
  const X=SSHD.xfer,xf=document.getElementById('xfer-fig');
  function xfer(){if(!X){xf.textContent='(transfer results missing)';return}
    const keys=Object.keys(X).filter(k=>k!=='resume');const w=Math.min(RD.width(xf),760),narrow=w<520;const lab=narrow?0:190,bw=w-lab-70;const mx=Math.max(...keys.map(k=>X[k].median_ms||0));
    let s='',y=2;keys.forEach(k=>{const v=X[k].median_ms;const big=/64 MiB/.test(k);if(narrow){s+=RD.t(0,y+10,RD.esc(k),{fs:11});y+=13}else s+=RD.t(lab-6,y+13,RD.esc(k),{fs:11,a:'end'});
      const lw=Math.max(2,bw*Math.sqrt(v/mx));s+='<rect x="'+lab+'" y="'+y+'" width="'+lw+'" height="16" rx="3" fill="'+(big?'var(--c1)':'var(--c2)')+'"/>'+RD.t(lab+lw+5,y+12,(v/1000).toFixed(1)+' s',{fs:11});y+=24});
    xf.innerHTML=RD.svg(w,y+4,s,'Copy times through the bastion')+'<p class="small mute">Bar length is proportional to the square root of time so the '+(Math.min(...keys.map(k=>X[k].median_ms))/1000).toFixed(1)+' s and '+(mx/1000).toFixed(0)+' s rows both stay readable; the labels give the measured medians. 40 ms round trip added to the laptop-bastion link; laptop rsync is openrsync.</p>'}
  xfer();RD.onResize(xfer);RD.onRender(xfer);
})();
