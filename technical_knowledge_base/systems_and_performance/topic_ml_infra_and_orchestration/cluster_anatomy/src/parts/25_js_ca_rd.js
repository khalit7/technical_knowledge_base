// ---- Reading tab: ladder, node drawing, scale-up rows, four networks, placement animation, tiers, designs ----
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
      const fs=narrow?9.5:11;let s='';
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

  // 2. scale-up rows
  (function(){const tb=$('ca-su-rows');if(!tb)return;
    tb.innerHTML=CA.scaleup.map(r=>'<tr><td>'+esc(r.nm)+'</td><td data-h="GPUs">'+r.n+'</td><td data-h="Joined by">'+esc(r.link)+'</td><td data-h="Label"><a href="'+r.src+'" target="_blank" rel="noopener noreferrer">source</a> '+lab(r.label)+'</td></tr>').join('')})();

  // 3. four networks
  (function(){const ch=$('ca-net-chips');if(!ch)return;
    const NET=[['nvl','NVLink (inside the node)','var(--c4)','scale-up: GPU to GPU in one server or NVL72 rack'],
      ['cmp','Compute fabric (back-end)','var(--c2)','one 400 Gb/s port per GPU, InfiniBand or RoCE, rail-optimised, non-blocking'],
      ['sto','Storage fabric','var(--c3)','2 dual-port cards per node to the parallel file system; more than 40 GB/s per node'],
      ['inb','In-band management (front-end)','var(--c1)','Ethernet: logins, the scheduler, NFS home directories, registries'],
      ['oob','Out-of-band management','var(--c5)','1 GbE to every BMC, switch and rack PDU']];
    const TR=[['tp','Tensor-parallel all-reduce, inside one server','nvl','Inside the scale-up domain; never leaves the server.'],
      ['dp','Gradient all-reduce between nodes','cmp','NCCL over RDMA on the GPU\'s own NIC; the step waits on it.'],
      ['ld','Reading training data','sto','From the parallel file system, often staged to local NVMe first. On Meta\'s clusters this is the front-end.'],
      ['ck','Writing a checkpoint','sto','A burst from every rank at once; Fire-Flyer 2 sends it over the compute fabric on a separate virtual lane.'],
      ['bs','NCCL bootstrap (exchanging addresses)','inb','Plain TCP sockets on the interface NCCL_SOCKET_IFNAME picks, before the RDMA connections exist.'],
      ['ssh','ssh to a login node, sbatch, kubectl','inb','Small messages to the login nodes and the controller.'],
      ['img','Pulling a container image','inb','From a registry; thousands of nodes pulling one image at once is its own storm.'],
      ['hb','slurmd and kubelet heartbeats','inb','The controller decides a node is dead when these stop (the parent\'s Failure lab).'],
      ['pc','Power-cycling a hung node','oob','Through the BMC, which works when the operating system does not.']];
    let cur='dp';
    $('ca-net-boxes').innerHTML=NET.map(n=>'<div data-n="'+n[0]+'" style="--nc:'+n[2]+'"><b>'+esc(n[1])+'</b>'+esc(n[3])+'</div>').join('');
    ch.innerHTML=TR.map(t=>'<button data-t="'+t[0]+'">'+esc(t[1])+'</button>').join('');
    function show(){const t=TR.find(x=>x[0]===cur);
      ch.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.t===cur));
      $('ca-net-boxes').querySelectorAll('div').forEach(d=>{d.classList.toggle('on',d.dataset.n===t[2]);d.classList.toggle('off',d.dataset.n!==t[2])});
      const n=NET.find(x=>x[0]===t[2]);$('ca-net-det').innerHTML='<b>'+esc(t[1])+'</b> rides the <b>'+esc(n[1])+'</b>. '+esc(t[3])}
    ch.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;cur=b.dataset.t;show()});show();
  })();

  // 4. placement animation: the same 16-rank ring, packed or spread
  (function(){const box=$('ca-place-svg');if(!box)return;const PL=CA.place;
    let mode='packed';
    // nodes: pod p (0,1), rack r (0..3), slot s (0,1); id = p*8+r*2+s
    const nodes=[];for(let p=0;p<2;p++)for(let r=0;r<4;r++)for(let s=0;s<2;s++)nodes.push({p,r,s,id:nodes.length});
    function ranks(){ // list of [node id, gpu index] in ring order
      if(mode==='packed'){const a=[];for(let n=0;n<2;n++)for(let g=0;g<8;g++)a.push([n,g]);return a}
      return nodes.map(n=>[n.id,0])}
    function lvl(a,b){const A=nodes[a[0]],B=nodes[b[0]];if(a[0]===b[0])return 0;if(A.p!==B.p)return 3;if(A.r!==B.r)return 2;return 1}
    const LV=['NVLink, 0 switches','same rack, 1 switch','other rack, 3 switches','other pod, 5 switches'],SW=[0,1,3,5],COL=['var(--c4)','var(--c3)','var(--c1)','var(--c2)'];
    const STEPS=['The cluster','Place the 16 ranks','Draw the ring','Idle cluster: time','Busy cluster: time'];
    function edges(){const a=ranks();return a.map((x,i)=>[x,a[(i+1)%a.length]])}
    function counts(){const c=[0,0,0,0];edges().forEach(e=>c[lvl(e[0],e[1])]++);return c}
    function geo(){const W=Math.max(300,Math.min(860,RD.width(box)));const narrow=W<560;
      const podW=narrow?W-16:(W-28)/2,rackW=(podW-10)/4,nodeH=26,podH=2*nodeH+54;
      return {W,narrow,podW,rackW,nodeH,podH,H:narrow?2*podH+30:podH+18}}
    function pos(G,nid,gpu){const n=nodes[nid];const px=G.narrow?8:8+n.p*(G.podW+12),py=G.narrow?8+n.p*(G.podH+14):8;
      const rx=px+5+n.r*G.rackW,ry=py+34+n.s*(G.nodeH+4);const dx=(G.rackW-14)/8;return [rx+5+dx*(gpu+.5),ry+G.nodeH/2+3,px,py,rx,ry]}
    function draw(i){const G=geo();let s='';const sel={};if(i>=1)ranks().forEach(r=>sel[r[0]+':'+r[1]]=1);
      for(let p=0;p<2;p++){const px=G.narrow?8:8+p*(G.podW+12),py=G.narrow?8+p*(G.podH+14):8;
        s+='<rect x="'+px+'" y="'+py+'" width="'+G.podW.toFixed(1)+'" height="'+G.podH+'" rx="6" fill="none" stroke="var(--line)"/>'+RD.t(px+6,py+13,'Pod '+(p+1),{fs:11,fill:'var(--mute)'});}
      nodes.forEach(n=>{const q=pos(G,n.id,0);const rx=q[4],ry=q[5];
        s+='<rect x="'+(rx+2).toFixed(1)+'" y="'+ry+'" width="'+(G.rackW-6).toFixed(1)+'" height="'+G.nodeH+'" rx="3" fill="var(--soft)" stroke="var(--line)"/>';
        for(let g=0;g<8;g++){const c=pos(G,n.id,g);const on=sel[n.id+':'+g];const busy=i>=4&&!on;
          s+='<circle cx="'+c[0].toFixed(1)+'" cy="'+c[1].toFixed(1)+'" r="'+(on?3.2:2.4)+'" fill="'+(on?'var(--acc)':busy?'var(--mute)':'var(--dim)')+'"/>'}});
      if(i>=2)edges().forEach(e=>{const L=lvl(e[0],e[1]);if(L===0&&mode==='packed'&&i<2)return;
        const a=pos(G,e[0][0],e[0][1]),b=pos(G,e[1][0],e[1][1]);const hot=i>=4&&L===3;
        if(L===0){s+='<line x1="'+a[0].toFixed(1)+'" y1="'+(a[1]+5)+'" x2="'+b[0].toFixed(1)+'" y2="'+(b[1]+5)+'" stroke="'+COL[0]+'" stroke-width="3" stroke-linecap="round"/>';return}
        const mx=(a[0]+b[0])/2,my=Math.min(a[1],b[1])-(14+L*4);
        s+='<path d="M'+a[0].toFixed(1)+' '+a[1].toFixed(1)+' Q'+mx.toFixed(1)+' '+my.toFixed(1)+' '+b[0].toFixed(1)+' '+b[1].toFixed(1)+'" fill="none" stroke="'+(hot?'var(--bad)':COL[L])+'" stroke-width="'+(hot?2.6:1.5)+'"'+(L===0?' opacity=".8"':'')+'/>'});
      box.innerHTML=RD.svg(G.W,G.H,s,'Two pods of four racks; the ring of the 16-rank job');
      const c=counts();const sw=c.reduce((t,v,k)=>t+v*SW[k],0);
      const used=new Set(ranks().map(r=>r[0]));const racks=new Set([...used].map(n=>nodes[n].p*4+nodes[n].r)),pods=new Set([...used].map(n=>nodes[n].p));
      const t=i<3?'':(i===3?PL.packed_ms:(mode==='packed'?PL.packed_ms:PL.spread_busy_ms));
      const cap={0:'Two pods of four racks, two 8-GPU servers per rack: the levels of section 4, drawn small.',
        1:mode==='packed'?'The scheduler gives the job two whole servers in one rack: 16 GPUs, 1 rack, 1 pod.':'The scheduler gives the job one free GPU on each of 16 servers: 16 GPUs over 8 racks and 2 pods.',
        2:mode==='packed'?'The ring: 14 of its 16 edges are NVLink inside a server; 2 cross the rack switch.':'The ring: every edge leaves a server; 8 stay in a rack, 6 cross racks inside a pod, 2 cross between pods.',
        3:'Idle cluster. Each GPU sends 2 x 15/16 of 1 GB, limited by its own 50 GB/s card in both placements: '+fmt(PL.packed_ms,1)+' ms.',
        4:mode==='packed'?'Busy cluster (grey dots are other jobs). The packed job never touches the shared layers: still '+fmt(PL.packed_ms,1)+' ms.':'Busy cluster. The 2 cross-pod edges share the 1:'+PL.o+' top layer with everyone: '+fmt(PL.busy_bw,2)+' GB/s per GPU, and the ring waits for its slowest edge: '+fmt(PL.spread_busy_ms,1)+' ms.'}[i];
      $('ca-place-cap').innerHTML='<div class="t">'+(i+1)+'. '+STEPS[i]+'</div><p>'+cap+'</p>';
      $('ca-place-cnt').innerHTML=RD.stat('Servers, racks, pods',i>=1?used.size+', '+racks.size+', '+pods.size:'','')+
        RD.stat('Ring edges by level',i>=2?c.join(' / '):'','NVLink / rack / pod / cross-pod')+
        RD.stat('Switches per trip round the ring',i>=2?sw:'','')+
        RD.stat('All-reduce of 1 GB, bandwidth term',t===''?'':fmt(t,1)+' ms',i>=3?'derived':'');
    }
    const A=RD.anim({card:'ca-place-card',ctl:'ca-place-ctl',n:STEPS.length,draw,ms:1800,label:'Placement step'});
    RD.seg($('ca-place-mode'),m=>{mode=m;A.reset(STEPS.length);A.play()});
    RD.onResize(()=>A.redraw());
  })();

  // 5. tiers
  (function(){const tb=$('ca-tier-rows');if(!tb)return;
    tb.innerHTML=CA.tiers.map(t=>'<tr><td>'+esc(t.nm)+'</td><td data-h="Capacity">'+esc(t.cap)+'</td><td data-h="Bandwidth">'+esc(t.bw)+'</td><td data-h="Lives for">'+esc(t.life)+'</td><td data-h="Source"><a href="'+t.src+'" target="_blank" rel="noopener noreferrer">source</a> '+lab(t.label)+'</td></tr>').join('')})();

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

  // predict-then-reveal and reading time
  document.querySelectorAll('#t-read .pr').forEach(pr=>{const ans=pr.querySelector('.ans');
    pr.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{
      pr.querySelectorAll('.opts button').forEach(x=>{x.classList.remove('right','wrong');if(x.dataset.a==='1')x.classList.add('right')});
      if(b.dataset.a!=='1')b.classList.add('wrong');ans.hidden=false}))});
  const r=$('t-read');if(r){const c=r.cloneNode(true);c.querySelectorAll('style,nav,.rd-card,details,pre,.pr').forEach(x=>x.remove());
    const words=(c.textContent.match(/\S+/g)||[]).length;window.RD_WORDS=words;const e=$('rd-time');if(e)e.textContent=Math.round(words/200)}
})();
