// ---- Sizing calculator tab (mirror of size() in src/recompute.py) ----
window.CA_SIZE=function(p){
  const nodes=Math.ceil(p.gpus/p.gpn),E=nodes*p.nics,k=p.k,h=Math.floor(k/2);
  const leaves=(p.rails&&p.nics>1)?p.nics*Math.ceil(nodes/h):Math.ceil(E/h);
  const r={nodes,endpoints:E,leaves};
  if(E<=Math.floor(k*k/2)){r.tiers=2;r.spines=Math.ceil(leaves*h/k);r.cores=0;r.pods=1;r.links=E+leaves*h;r.top_share=1}
  else{const o=p.o;const d=Math.round(k*o/(o+1)),u=k-d;const pods=Math.ceil(leaves/d);
    r.tiers=3;r.pods=pods;r.pod_endpoints=d*h;r.spines=pods*h;r.cores=Math.ceil(pods*h*u/k);r.links=E+leaves*h+pods*h*u;r.top_share=u/d;r.too_big=pods>k}
  r.switches=r.leaves+r.spines+r.cores;
  const npr=p.nodes_per_rack||Math.max(1,Math.floor(p.rack_kw/p.node_kw));
  r.nodes_per_rack=npr;r.racks=Math.ceil(nodes/npr);r.it_mw=nodes*p.node_kw/1000;r.site_mw=r.it_mw*p.pue;
  r.sto_read_GBps=(p.sto==='std'?40:125)*nodes/32;r.gpu_net_GBps=p.nics*p.gbps/8/p.gpn;return r};
(function(){const CA=window.CA,esc=RD.esc,$=id=>document.getElementById(id);if(!$('sz-out'))return;
  const fmt=(v,d)=>(+v).toLocaleString('en-GB',{maximumFractionDigits:d==null?1:d});
  const PR=CA.presets;
  $('sz-pre').innerHTML=PR.map((p,i)=>'<option value="'+i+'">'+esc(p.nm)+'</option>').join('');
  const F={gpus:'sz-g',gpn:'sz-gpn',nics:'sz-nic',gbps:'sz-gb',k:'sz-k',o:'sz-o',node_kw:'sz-kw',rack_kw:'sz-rk',nodes_per_rack:'sz-npr',pue:'sz-pue',sto:'sz-sto'};
  let cur=0;
  function load(i){cur=i;const p=PR[i];Object.keys(F).forEach(k=>{$(F[k]).value=String(p[k])});$('sz-rail').checked=!!p.rails;calc()}
  function read(){const p={};Object.keys(F).forEach(k=>{p[k]=k==='sto'?$(F[k]).value:+$(F[k]).value});p.rails=$('sz-rail').checked;
    p.gpus=Math.max(8,Math.min(1e6,p.gpus||8));p.nics=Math.max(1,p.nics||1);p.node_kw=Math.max(.5,p.node_kw||1);p.rack_kw=Math.max(5,p.rack_kw||5);p.pue=Math.max(1,p.pue||1);p.nodes_per_rack=Math.max(0,Math.floor(p.nodes_per_rack||0));return p}
  function same(p,q){return Object.keys(F).every(k=>String(p[k])===String(q[k]))&&!!p.rails===!!q.rails}
  function calc(){const p=read();const r=window.CA_SIZE(p);$('sz-gv').textContent=fmt(p.gpus,0);
    $('sz-out').innerHTML=RD.stat('Nodes',fmt(r.nodes,0),fmt(r.endpoints,0)+' compute NIC ports')+
      RD.stat('Network per GPU',fmt(r.gpu_net_GBps,r.gpu_net_GBps<10?3:0)+' GB/s','each way, from its node\'s NICs')+
      RD.stat('Fabric',r.tiers+' layers',r.tiers===3?fmt(r.pods,0)+' pods of up to '+fmt(r.pod_endpoints,0)+' ports':'fits in k²/2 = '+fmt(Math.floor(p.k*p.k/2),0))+
      RD.stat('Switches',fmt(r.switches,0),fmt(r.leaves,0)+' leaf, '+fmt(r.spines,0)+' spine'+(r.cores?', '+fmt(r.cores,0)+' core':''))+
      RD.stat('Cables (fabric)',fmt(r.links,0),'node-leaf + leaf-spine'+(r.cores?' + spine-core':''))+
      RD.stat('Top layer share',r.tiers===3?fmt(100*r.top_share,0)+'%':'100%',r.tiers===3?'of full rate when every GPU crosses pods':'non-blocking')+
      RD.stat('Racks',fmt(r.racks,0),r.nodes_per_rack+' node'+(r.nodes_per_rack>1?'s':'')+' per rack')+
      RD.stat('Power',fmt(r.it_mw,2)+' MW',fmt(r.site_mw,2)+' MW at PUE '+p.pue)+
      RD.stat('Shared storage',fmt(r.sto_read_GBps,0)+' GB/s read',fmt(r.sto_read_GBps/2,0)+' GB/s write');
    const pr=PR[cur];let res='';
    if(r.too_big)res='<b>Too big for three layers of '+p.k+'-port switches</b> at this oversubscription: '+r.pods+' pods but each core switch has only '+p.k+' ports. Real clusters at this size use larger (modular) switches, more planes or a fourth layer.';
    else if(pr.pub&&same(p,pr)){const rs=pr.resid;const ok=Object.values(rs).every(v=>v===0);
      res=(ok?'<b>Defaults reproduce the published counts</b> independently, from the formula: ':'<b>Does not fully reproduce:</b> ')+Object.keys(pr.pub).map(k=>esc(k.replace(/_/g,' '))+' published '+pr.pub[k]+', computed '+(pr.pub[k]+rs[k])).join('; ')+
        (ok?'':'. NVIDIA lists 16 spines for 3 SUs where 24 leaves need only 12: the design keeps the 4-SU spine layer, presumably for growth (not stated).')+' <a href="'+pr.src+'" target="_blank" rel="noopener noreferrer">source</a>';}
    else res=pr.pub?'Inputs changed from the preset: no published figure to compare.':'No published switch count for this preset: '+(pr.src?'<a href="'+pr.src+'" target="_blank" rel="noopener noreferrer">its shape</a> is described in section 8 of the Reading tab (nine published clusters).':'a design exercise (the last question of the Reading tab\'s interview rehearsal).');
    $('sz-res').innerHTML=res;$('sz-res').classList.toggle('bad',!!r.too_big);
    sketch(r);}
  function sketch(r){const box=$('sz-sk');const W=Math.max(300,Math.min(860,box.clientWidth||RD.width(box)));
    const rows=[['core',r.cores,'var(--c2)'],['spine',r.spines,'var(--c1)'],['leaf',r.leaves,'var(--c3)'],['node',r.nodes,'var(--c4)']].filter(x=>x[1]>0);
    const mx=Math.max(...rows.map(x=>x[1]));let s='';const lw=58;
    rows.forEach((x,i)=>{const y=10+i*26;const w=Math.max(2,(W-lw-70)*Math.log10(x[1]+1)/Math.log10(mx+1));
      s+=RD.t(4,y+13,x[0],{fs:12})+'<rect x="'+lw+'" y="'+y+'" width="'+w.toFixed(1)+'" height="16" rx="3" fill="'+x[2]+'"/>'+RD.t(lw+w+6,y+13,fmt(x[1],0),{fs:12})});
    box.innerHTML=RD.svg(W,14+rows.length*26,s,'Counts per layer, log scale')+'<p class="small mute">Counts per layer, log-scaled bars.</p>'}
  function table(){let h='<thead><tr><th>Preset</th><th class="num">Nodes</th><th class="num">Leaf</th><th class="num">Spine</th><th class="num">Core</th><th class="num">Racks</th><th class="num">MW (IT)</th><th>Against published</th></tr></thead><tbody>';
    PR.forEach(p=>{const c=p.calc;let pub='<span class="mute">none</span>';
      if(p.pub){const ok=Object.values(p.resid).every(v=>v===0);pub=(ok?'<span style="color:var(--good);font-weight:600">reproduces</span> ':'<span style="color:var(--bad);font-weight:600">differs</span> ')+Object.keys(p.pub).map(k=>esc(k.replace(/_/g,' '))+' '+p.pub[k]+(p.resid[k]?' (computed '+(p.pub[k]+p.resid[k])+')':'')).join(', ')}
      h+='<tr><td>'+esc(p.nm)+'</td><td class="num">'+fmt(c.nodes,0)+'</td><td class="num">'+fmt(c.leaves,0)+'</td><td class="num">'+fmt(c.spines,0)+'</td><td class="num">'+fmt(c.cores,0)+'</td><td class="num">'+fmt(c.racks,0)+'</td><td class="num">'+fmt(c.it_mw,2)+'</td><td>'+pub+'</td></tr>'});
    $('sz-tab').innerHTML=h+'</tbody>'}
  $('sz-pre').addEventListener('change',e=>load(+e.target.value));
  document.querySelectorAll('#t-casize .ctl input,#t-casize .ctl select').forEach(el=>{if(el.id!=='sz-pre')el.addEventListener('input',calc)});
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-casize']=[calc];
  addEventListener('resize',()=>{if(!$('t-casize').hidden)calc()});
  table();load(0);
})();
