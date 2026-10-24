// ---- Reading section 4 (moved from the Metadata storm tab, 2026-10-24): one against two metadata servers, the curve, real stores, the start-up storm calculator ----
(function(){
  const H=SD_H,D=window.SD,$=H.$,f=H.fmt,T=D.tpfs,M=T.meta;
  const R=H.mk('t-read');
  // ---- animation: 16 clients, 1 vs 2 metadata servers, one clock ----
  let K=1;const OPS=16*300*3,NF=13;
  const rate=k=>M[k+'_16'].ops_per_s,Tend=Math.ceil(OPS/rate(1));
  function draw(i){
    const r=rate(K),t=Tend*i/(NF-1),done=Math.min(OPS,Math.round(r*t)),fin=done>=OPS;
    const el=$('sdm-svg'),W=Math.min(760,H.width(el));let b='';
    const cx=6,cw=Math.max(70,W*0.22),dot=Math.min(14,(cw-8)/4-4);
    for(let c=0;c<16;c++){const x=cx+(c%4)*(dot+4),y=6+Math.floor(c/4)*(dot+6);b+=H.rect(x,y,dot,dot,fin?'var(--soft)':'var(--acc)',{rx:dot/2,op:fin?1:0.35+0.65*((c*7+i*3)%16)/16})}
    b+=H.t(cx,4*(dot+6)+18,'16 clients',{fs:10.5,fill:'var(--mute)'});
    const sx=cx+cw+30,sw=W-sx-6,sh=K===1?70:32;
    for(let k=0;k<K;k++){const y=6+k*(sh+6);b+=H.rect(sx,y,sw,sh,'var(--bg)',{stroke:'var(--c5)',sw:2,rx:6})+H.t(sx+8,y+16,'metadata server '+(k+1)+(K===2?' (half the names)':''),{fs:11,w:600});
      const busy=fin?0:1;b+=H.rect(sx+8,y+sh-14,(sw-16)*busy,7,'var(--c5)',{op:.6});
      if(!fin)b+=H.line(cx+cw,30,sx,y+sh/2,'var(--c5)',{sw:1.2,dash:'3 3'})}
    const by=4*(dot+6)+34;b+=H.rect(0,by,W,16,'var(--soft)',{stroke:'var(--line)'})+H.rect(0,by,W*done/OPS,16,'var(--c3)');
    b+=H.t(4,by+30,f(done,0)+' of '+f(OPS,0)+' operations',{fs:10.5});
    el.innerHTML=H.svg(W,by+36,b,'Metadata storm, '+K+' server(s)');
    const lat=M[K+'_16'].lat_ms;
    $('sdm-cap').innerHTML='<b>'+f(Math.min(t,OPS/r),1)+' s.</b> '+(i===0?'Every client sends create requests as fast as answers come back. The server serialises them through its half CPU.':
      fin?'Done in '+f(OPS/r,1)+' s at '+f(r,0)+' operations per second; each operation took '+f(lat,1)+' ms from a client\'s point of view.'+(K===2?' Two servers: '+f(rate(2)/rate(1),2)+' times the rate, not 2: the clients\' own overheads now show.':'')
      :'Each client waits about '+f(lat,1)+' ms per answer; alone, one client waited '+f(M['1_1'].lat_ms,1)+' ms.');
    $('sdm-cnt').innerHTML=[['Operations per second',f(r,0)],['Per operation, seen by a client',f(lat,1)+' ms'],['Time for all 14,400',f(OPS/r,1)+' s'],['Servers',String(K)]].map(x=>RD.stat(x[0],x[1])).join('');
  }
  const A=R.anim({card:'sdm-anim-card',ctl:'sdm-ctl',n:NF,draw,ms:700,label:'Time step'});
  H.seg($('sdm-mode'),m=>{K=+m;A.reset(NF)});

  // ---- curve: ops/s and latency against clients ----
  function curve(){
    const el=$("sdm-curve"),W=Math.min(760,H.width(el)),Hh=210,pl=46,pr=58,pt=10,pb=34;
    const P=[1,2,4,8,16],pts=P.map(p=>({p,r:M['1_'+p].ops_per_s,l:M['1_'+p].lat_ms}));
    const r32=M['cpu_1_32'],two=M['2_16'];
    const xs=p=>pl+(W-pl-pr)*Math.log2(p)/5,ymax=3000,ys=v=>pt+(Hh-pt-pb)*(1-v/ymax),lmax=25,yl=v=>pt+(Hh-pt-pb)*(1-v/lmax);
    let b='';
    [0,1000,2000,3000].forEach(v=>{b+=H.line(pl,ys(v),W-pr,ys(v),'var(--line)')+H.t(pl-4,ys(v)+4,f(v,0),{a:'end',fs:10})});
    [0,10,20].forEach(v=>b+=H.t(W-pr+16,yl(v)+4,v+" ms",{fs:10,fill:"var(--c2)"}));
    [1,2,4,8,16,32].forEach(p=>b+=H.t(xs(p),Hh-pb+14,String(p),{a:'middle',fs:10}));
    b+=H.t((pl+W-pr)/2,Hh-4,'client processes',{a:'middle',fs:10.5,fill:'var(--mute)'});
    const path=(arr,fx,fy)=>arr.map((q,j)=>(j?'L':'M')+fx(q).toFixed(1)+','+fy(q).toFixed(1)).join('');
    b+='<path d="'+path(pts,q=>xs(q.p),q=>ys(q.r))+'" fill="none" stroke="var(--c5)" stroke-width="2"/>';
    b+='<path d="'+path(pts,q=>xs(q.p),q=>yl(q.l))+'" fill="none" stroke="var(--c2)" stroke-width="1.5" stroke-dasharray="4 3"/>';
    pts.forEach(q=>{b+='<circle cx="'+xs(q.p)+'" cy="'+ys(q.r)+'" r="3.5" fill="var(--c5)"/>'});
    b+='<circle cx="'+xs(32)+'" cy="'+ys(r32.ops_per_s)+'" r="3.5" fill="none" stroke="var(--c5)" stroke-width="2"/>';
    b+='<circle cx="'+xs(32)+'" cy="'+yl(r32.lat_ms)+'" r="3" fill="none" stroke="var(--c2)" stroke-width="2"/>';
    b+='<rect x="'+(xs(16)-4)+'" y="'+(ys(two.ops_per_s)-4)+'" width="8" height="8" fill="var(--c3)"/>'+H.t(xs(16)-8,ys(two.ops_per_s)+4,'2 servers: '+f(two.ops_per_s,0),{a:'end',fs:10,fill:'var(--c3)'});
    b+=H.t(xs(16)+8,ys(M['1_16'].ops_per_s)+14,f(M['1_16'].ops_per_s,0),{fs:10});
    el.innerHTML=H.svg(W,Hh,b,'Metadata operations per second against clients')+
      '<p class="small mute">Solid: operations per second, one metadata server (filled dots: the main run; open dot at 32: a rerun that also sampled CPU, which gave '+f(M['cpu_1_16'].ops_per_s,0)+' at 16). Dashed: milliseconds per operation seen by one client. Square: two servers at 16 clients. All <span class="meas">measured</span>, medians of 3 (2 for the rerun).</p>';
    const C=T.cpu;
    $('sdm-cpu').innerHTML='<table><thead><tr><th>Clients</th><th class="num">metadata server CPU</th><th class="num">its cap</th><th class="num">client container CPU</th><th class="num">its cap</th><th class="num">operations per second</th></tr></thead><tbody>'+
      ['4','16','32'].map(p=>'<tr><td>'+p+'</td><td class="num">'+f(C[p].mds_cpu_pct,0)+'%</td><td class="num">'+C[p].mds_cap_pct+'%</td><td class="num">'+f(C[p].cli_cpu_pct,0)+'%</td><td class="num">'+C[p].cli_cap_pct+'%</td><td class="num">'+f(M['cpu_1_'+p].ops_per_s,0)+'</td></tr>').join('')+'</tbody></table><p class="small mute">docker stats samples during the rerun (100% = one CPU).</p>';
  }
  R.onRender(curve);curve();

  // ---- real stores, log bars ----
  let P='16';
  function real(){
    const el=$('sdm-real'),W=Math.min(760,H.width(el)),sm=W<520,L=[['docker_volume',sm?'Volume':'Docker volume','var(--c3)'],['host_folder',sm?'Host folder':'Shared host folder','var(--c2)'],['s3_seaweedfs',sm?'S3':'S3 (SeaweedFS)','var(--c1)']];
    const ph=['create','stat','miss','unlink'],lab=sm?78:124,bw=W-lab-56,lo=1,hi=7,xs=v=>lab+bw*(Math.log10(Math.max(10,v))-lo)/(hi-lo);
    let b='',y=4;
    ph.forEach(p=>{b+=H.t(0,y+12,p,{fs:11.5,w:600});y+=16;
      L.forEach(l=>{const v=D.meta_real[l[0]][P].ops_per_s[p];b+=H.t(8,y+10,l[1],{fs:10,fill:'var(--mute)'})+H.rect(lab,y,xs(v)-lab,12,l[2])+H.t(xs(v)+4,y+10,f(v,0),{fs:10});y+=15});y+=6});
    [10,100,1e3,1e4,1e5,1e6].forEach(v=>{b+=H.line(xs(v),4,xs(v),y-4,'var(--line)',{dash:'2 3'})+H.t(xs(v),y+8,v>=1e6?'1M':v>=1e3?(v/1e3)+'k':String(v),{a:'middle',fs:9.5,fill:'var(--mute)'})});
    el.innerHTML=H.svg(W,y+12,b,'Operations per second by store');
  }
  H.seg($('sdm-p'),m=>{P=m;real()});R.onRender(real);real();

  // ---- start-up storm calculator ----
  (function(){
    const I=D['import'],W=[['import torch','import torch'],['import torch, torch.distributed, torch.distributed.checkpoint','import torch + torch.distributed + DCP'],['import numpy','import numpy'],['pass','python3 -c pass']];
    $('sdm-w').innerHTML=W.map(w=>'<option value="'+w[0]+'">'+w[1]+'</option>').join('');
    const caps=[['fsx12',3000,'FSx for Lustre 1,200 GiB: 1,500 metadata IOPS x 2 opens'],['fsx48',48000,'FSx 48,000 GiB: 24,000 IOPS x 2'],['fsxmax',384000,'FSx maximum user-provisioned: 192,000 IOPS x 2'],['toy1',M['1_16'].ops_per_s,'toy, one server at 16 clients (measured)'],['toy2',M['2_16'].ops_per_s,'toy, two servers (measured)'],['custom',0,'custom (below)']];
    $('sdm-m').innerHTML=caps.map(c=>'<option value="'+c[0]+'">'+c[2]+'</option>').join('');
    function upd(){
      const r=Math.max(1,+$('sdm-r').value||1),w=I[$('sdm-w').value],bd=$('sdm-b').value,cs=caps.find(c=>c[0]===$('sdm-m').value);
      const per=bd==='err'?w.total_errors:bd==='open'?w.by_call.openat.calls:w.total_calls;
      const cap=cs[0]==='custom'?Math.max(1,+$('sdm-cm').value||1):cs[1],ops=r*per,s=ops/cap;
      const tm=s<120?f(s,1)+' s':s<7200?f(s/60,1)+' min':f(s/3600,1)+' h';
      $('sdm-out').innerHTML=[['Calls per rank',f(per,0)],['Calls in all',f(ops,0)],['Server capacity',f(cap,0)+' /s'],['Start-up stall',tm]].map(x=>RD.stat(x[0],x[1])).join('');
      $('sdm-note').innerHTML='stall = ranks x calls per rank / capacity <span class="der">derived</span>. Calls per rank <span class="meas">measured</span> with strace (torch 2.14.1+cpu, Python 3.11). FSx capacities are AWS\'s for file creates, opens and closes ("2" per metadata IOPS), used here for lookups too, an assumption <span class="vend">vendor</span>. With the environment in the image on local disk, the shared store sees none of these calls.';
    }
    ['sdm-r','sdm-w','sdm-b','sdm-m','sdm-cm'].forEach(id=>$(id).addEventListener('input',upd));
    R.onRender(upd);upd();
  })();
})();
