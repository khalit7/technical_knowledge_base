// ---- Sections 6 and 7: capability matrix, user namespace session, seccomp probe and cost, io_uring per UID ----
(function(){
  const D=window.CT_DATA,E=RD.esc,$=id=>document.getElementById(id);
  const okc=v=>v==='ok'?'<span class="pill ok">ok</span>':'<span class="pill bad">'+E(v.replace(/^ValueError: /,''))+'</span>';
  const C=D.caps,short=['root, defaults','root, --cap-drop ALL','--user 1000','root, +SYS_NICE +IPC_LOCK +SYS_RESOURCE'];
  $('rd-caps').innerHTML='<thead><tr><th>Operation (capability)</th>'+C.map((c,i)=>'<th>'+E(short[i])+'<br><code class="small">'+E(c.capeff.replace(/^0{8}/,''))+'</code></th>').join('')+'</tr></thead><tbody>'+
    C[0].ops.map((o,r)=>'<tr><td>'+E(o[0])+'</td>'+C.map(c=>'<td>'+okc(c.ops[r][1])+'</td>').join('')+'</tr>').join('')+'</tbody>';
  $('rd-port').textContent=D.port_sysctl;
  $('rd-userns').textContent=D.userns_txt;
  // seccomp probe: three profiles side by side
  const P=D.sc_probe,keys=['none','d20','d25'],hd=['no filter (unconfined)','Docker 20.10 default','Docker 25.0 default.json'];
  $('rd-scprobe').innerHTML='<thead><tr><th>Call</th>'+keys.map((k,i)=>'<th>'+hd[i]+'<br><span class="small mute">Seccomp: '+P[k].seccomp+'</span></th>').join('')+'</tr></thead><tbody>'+
    P.none.rows.map((r,i)=>'<tr><td><code>'+E(r[0])+'</code></td>'+keys.map(k=>{const v=P[k].rows[i][1],diff=k!=='none'&&v!==r[1];return '<td'+(diff?' class="chg"':'')+'>'+E(v)+'</td>'}).join('')+'</tr>').join('')+'</tbody>';
  const sc=D.sc_cost;
  $('rd-sccost').textContent='no filter '+sc.unconfined['0']+', Docker default '+sc.default['0']+', Docker default plus 8 allow-all filters '+sc.default['8'];
  $('rd-scd').textContent=Math.round(sc.default['0']-sc.unconfined['0']);
  $('rd-sc8').textContent=Math.round(sc.default['8']-sc.default['0']);
  $('rd-uring').innerHTML='<thead><tr><th>Container</th><th>UID</th><th>memlock limit</th><th>rings created</th><th>then</th></tr></thead><tbody>'+
    D.uring.map(u=>'<tr><td>'+E(u.head.replace(/^\d+\. /,'').replace(/ \(running containers: \d+\)/,''))+'</td><td>'+u.uid+'</td><td>'+u.lim+' KiB</td><td><b>'+u.rings+'</b></td><td>'+E(u.why)+'</td></tr>').join('')+'</tbody>';
})();
// ---- Section 9: the runtime chain, filtered from the VM's process list ----
(function(){
  const D=window.CT_DATA,t=D.runtime_txt,i=t.indexOf('### docker run --pid host'),j=t.indexOf('\n### ',i+4);
  const lines=t.slice(t.indexOf('\n',i)+1,j).split('\n').filter((l,k)=>k===0||/containerd --config|dockerd --containerd|-namespace moby|sleep 60/.test(l));
  const rest=t.slice(j+1).split('\n').filter(l=>/^Pid /.test(l));
  document.getElementById('rd-rt').textContent=lines.map(l=>l.replace(/(-id [0-9a-f]{12})[0-9a-f]{52}/,'$1...')).join('\n')+'\n\n$ docker inspect (the sleep container)\n'+rest.join('\n');
})();
