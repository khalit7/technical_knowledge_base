// ---- Reading tab: ladder, node drawing, designs table, measured spans (the placement is the 3D stage in 43_js_sc_place.js) ----
(function(){
  const CA=window.CA,esc=RD.esc,$=id=>document.getElementById(id);
  const fmt=(v,d)=>v==null?'n/a':(+v).toLocaleString('en-GB',{maximumFractionDigits:d==null?1:d});
  const LBL={vendor:'vend',operator:'pub',authors:'pub',independent:'indep'};
  const lab=l=>'<span class="'+(LBL[l]||'pub')+'">'+esc(l)+'</span>';

  // 0. ladder (Llama 3 levels), log-scaled bandwidth bars
  (function(){const el=$('ca-ladder');if(!el)return;const L=CA.levels.llama3.lv;
    const sec={gpu:'rd-s1',node:'rd-s1',rack:'rd-s4',pod:'rd-s4',cluster:'rd-s4'};
    const lo=Math.log10(1),hi=Math.log10(4000);
    el.innerHTML=L.map(r=>{const w=r.bw?Math.max(3,100*(Math.log10(r.bw)-lo)/(hi-lo)):0;
      return '<a href="#'+sec[r.k]+'"><span><b>'+esc(r.nm)+'</b><i>'+fmt(r.n,0)+' GPU'+(r.n>1?'s':'')+'</i></span><span><span class="tr"><span class="fi" style="width:'+w.toFixed(1)+'%"></span></span><i>'+esc(r.via)+'</i></span><span class="v">'+fmt(r.bw,r.bw<10?2:0)+' GB/s</span></a>'}).join('');
  })();

  // 1. node drawing (DGX H100, schematic)
  (function(){const box=$('ca-node-svg');if(!box)return;const N=CA.nodes[0];
    const P={
      gpu:['GPU (H100)','8 GPUs, 640 GB of HBM3 in all. Each is one rank of a training job. It is attached to the PCIe tree (for its CPU and NIC) and to the NVSwitches (for the other 7 GPUs).'],
      nvs:['NVSwitch','4th-gen NVLink through NVSwitch chips: "900 GB/s GPU-to-GPU bandwidth", 450 GB/s each way, any GPU to any GPU in the box. This is the scale-up domain (section 2).'],
      cpu:['CPU socket','2 x Xeon 8480C, 56 cores each. Each socket and its memory is a NUMA node; a rank should run on the socket its GPU and NIC hang under.'],
      ram:['Memory (DRAM)','2 TB in 32 DIMMs, split between the two sockets: data loader buffers, pinned copies, the page cache, offloaded optimiser state.'],
      pcie:['PCIe switch','Fans the CPU\'s PCIe lanes out to GPUs, NICs and drives. Devices under one switch reach each other without crossing the CPU (NCCL calls that PIX).'],
      nic:['Compute NIC','ConnectX-7, one per GPU, up to 400 Gb/s (50 GB/s each way), InfiniBand by default: the compute fabric. With GPUDirect RDMA it reads GPU memory directly.'],
      snic:['Storage and management NICs','2 x ConnectX-7 dual port, Ethernet by default: the storage fabric and in-band management (logins, scheduler, container images).'],
      nvme:['Local NVMe','8 x 3.84 TB data cache in RAID 0 (30.72 TB), plus 2 x 1.92 TB mirrored for the OS. Fast and private to this node; gone if the node or one drive dies.'],
      bmc:['BMC','Baseboard management controller on a 1 GbE port: power-cycle, sensors and console over the out-of-band network, even when the OS is hung.'],
      upi:['Socket link (UPI)','The link between the two CPUs. Traffic between a GPU under one socket and memory or a NIC under the other crosses it (NCCL calls that SYS).']};
    let sel='gpu';
    function det(){const p=P[sel];$('ca-node-det').innerHTML='<b>'+esc(p[0])+'.</b> '+esc(p[1])+' <span class="vend">vendor</span>';
      box.querySelectorAll('[data-p]').forEach(g=>g.setAttribute('opacity',g.dataset.p===sel?1:.55));
      $('ca-node-parts').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.p===sel))}
    function draw(){const W=Math.max(300,Math.min(860,RD.width(box)));const g=(W-16)/4,x0=8;const narrow=W<520;
      const fs=11;let s='';
      const rect=(p,x,y,w,h,fill,txt)=>'<g data-p="'+p+'" style="cursor:pointer"><rect x="'+x.toFixed(1)+'" y="'+y+'" width="'+w.toFixed(1)+'" height="'+h+'" rx="4" fill="'+fill+'" stroke="var(--line)"/>'+RD.t((x+w/2).toFixed(1),y+h/2+4,txt,{a:'middle',fs:fs})+'</g>';
      // CPUs + RAM
      for(let c=0;c<2;c++){const x=x0+c*2*g+4,w=2*g-8;s+=rect('ram',x,6,w,20,'var(--soft)','DRAM, 1 TB');s+=rect('cpu',x,30,w,24,'var(--acc2)','CPU '+c+' (56 cores)')}
      s+='<g data-p="upi" style="cursor:pointer"><line x1="'+(x0+2*g-4)+'" y1="42" x2="'+(x0+2*g+4)+'" y2="42" stroke="var(--c2)" stroke-width="4"/></g>';
      // PCIe switches, NICs, GPUs
      for(let k=0;k<4;k++){const x=x0+k*g;const cx=x+g/2;
        s+='<line x1="'+cx+'" y1="54" x2="'+cx+'" y2="66" stroke="var(--mute)"/>';
        s+=rect('pcie',x+6,66,g-12,20,'var(--soft)','PCIe switch');
        const bw=(g-16)/2;
        for(let j=0;j<2;j++){const bx=x+6+j*(bw+4),i=2*k+j;
          s+='<line x1="'+(bx+bw/2)+'" y1="86" x2="'+(bx+bw/2)+'" y2="96" stroke="var(--mute)"/>';
          s+=rect('nic',bx,96,bw,20,'var(--closed2)',narrow?'NIC':'NIC '+i);
          s+='<line x1="'+(bx+bw/2)+'" y1="116" x2="'+(bx+bw/2)+'" y2="124" stroke="var(--mute)"/>';
          s+=rect('gpu',bx,124,bw,30,'var(--open2)',narrow?'G'+i:'GPU '+i);
          s+='<line x1="'+(bx+bw/2)+'" y1="154" x2="'+(bx+bw/2)+'" y2="166" stroke="var(--c4)" stroke-width="2"/>'}}
      s+=rect('nvs',x0+4,166,W-2*x0-8,20,'var(--closed2)','NVSwitch: all 8 GPUs, 450 GB/s each way');
      // bottom row
      const bw3=(W-2*x0-16)/3;
      s+=rect('snic',x0+4,196,bw3,22,'var(--soft)',narrow?'Storage NICs':'Storage + mgmt NICs (2)');
      s+=rect('nvme',x0+8+bw3,196,bw3,22,'var(--soft)',narrow?'NVMe 30.7 TB':'Local NVMe, 30.7 TB');
      s+=rect('bmc',x0+12+2*bw3,196,bw3,22,'var(--soft)','BMC (1 GbE)');
      box.innerHTML=RD.svg(W,224,s,'Schematic of a DGX H100 node');
      box.querySelectorAll('[data-p]').forEach(gp=>gp.addEventListener('click',()=>{sel=gp.dataset.p;det()}));det()}
    $('ca-node-parts').innerHTML=Object.keys(P).map(k=>'<button data-p="'+k+'">'+esc(P[k][0])+'</button>').join('');
    $('ca-node-parts').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;sel=b.dataset.p;det()});
    draw();RD.onRender(draw);RD.onResize(draw);
  })();

  // 4. placement: now the 3D stage Fig. 3 (43_js_sc_place.js)

  // 7. designs table, sortable
  (function(){const tb=$('ca-des-rows');if(!tb)return;let key='n',dir=-1;
    const mx=Math.log10(Math.max(...CA.designs.map(d=>d.n)));
    function draw(){const rows=CA.designs.slice().sort((a,b)=>(a[key]>b[key]?1:a[key]<b[key]?-1:0)*dir);
      tb.innerHTML=rows.map(d=>'<tr><td><b>'+esc(d.nm)+'</b><br><span class="small mute">'+esc(d.who)+'</span></td><td data-h="Described">'+esc(d.date)+'</td><td data-h="Accelerators" class="num">'+fmt(d.n,0)+'<div style="height:6px;background:var(--acc);border-radius:2px;margin-top:3px;width:'+(100*Math.log10(d.n)/mx).toFixed(0)+'%"></div><span class="small mute" style="white-space:normal">'+esc(d.acc)+'; '+esc(d.n_note)+'</span></td><td data-h="Network">'+esc(d.fabric)+'</td><td data-h="Storage">'+esc(d.storage)+(d.power?'<br><span class="small mute">Power: '+esc(d.power)+'</span>':'')+'</td><td data-h="Label"><a href="'+d.src+'" target="_blank" rel="noopener noreferrer">source</a> '+lab(d.label)+'</td></tr>').join('')}
    document.querySelectorAll('#ca-des th[data-k]').forEach(th=>{th.style.cursor='pointer';th.addEventListener('click',()=>{const k=th.dataset.k;dir=key===k?-dir:(k==='n'?-1:1);key=k;draw()})});
    draw()})();

  // 8. measured spans
  (function(){const M=CA.meas;const set=(id,v)=>{const e=$(id);if(e)e.textContent=v};
    set('ca-rtt-br',fmt(M.rtt_bridge_med,0));set('ca-rtt-lo',fmt(M.rtt_loop_med,0));set('ca-rtt-br-all',M.rtt_bridge_us.map(v=>fmt(v,1)).join(', '))})();

  // predict-then-reveal
  document.querySelectorAll('#t-read .pr').forEach(pr=>{const ans=pr.querySelector('.ans');
    pr.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{
      pr.querySelectorAll('.opts button').forEach(x=>{x.classList.remove('right','wrong');if(x.dataset.a==='1')x.classList.add('right')});
      if(b.dataset.a!=='1')b.classList.add('wrong');ans.hidden=false}))});
})();
