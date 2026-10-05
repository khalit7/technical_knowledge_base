// ---- Performance calculator (t-calc): communication (all-reduce over links, tensor-parallel traffic against compute) ----
(function(){
  const X=window.CALCX,$=id=>document.getElementById(id);
  // bandwidth per GPU per direction (GB/s); maxN = largest group that link can join directly
  const LINKS=[
    {nm:'NVLink 6 (Rubin, Rubin blog and HGX page: 3.6 TB/s)',bw:1800,maxN:72,src:'3.6 TB/s per GPU, both directions, and 260 TB/s per Vera Rubin NVL72 rack (= 72 x 3.6) in the Rubin platform blog (Jan 2026) and on the HGX page; announced'},
    {nm:'NVLink 6 (Rubin, NVLink and NVL72 pages: 3.0 TB/s)',bw:1500,maxN:72,src:'3,000 GB/s per GPU over 36 links, both directions, and 216 TB/s per NVL72 rack (= 72 x 3.0) on the NVLink and Vera Rubin NVL72 pages; NVIDIA prints both figures and does not say what the extra 0.6 TB/s counts; announced'},
    {nm:'NVLink 5 (B200, GB200 NVL72)',bw:900,maxN:72,src:'1.8 TB/s per GPU, both directions (NVIDIA HGX and GB200 NVL72 pages); 72 GPUs in one NVL72 rack, 8 on an HGX board'},
    {nm:'TPU7x ICI (all links summed)',bw:600,maxN:null,src:'1,200 GB/s bidirectional per chip (Google Cloud TPU7x docs), spread over several torus links: one ring gets part of it'},
    {nm:'NVLink 4 (H100, H200)',bw:450,maxN:8,src:'900 GB/s per GPU, both directions (NVIDIA H100 page); 8 GPUs per server'},
    {nm:'MI300X Infinity Fabric (all 7 links)',bw:448,maxN:8,src:'7 links of 128 GB/s bidirectional (AMD datasheet): 7 x 64 each way, only if the algorithm uses every link'},
    {nm:'MI355X Infinity Fabric (all 7 links)',bw:535.5,maxN:8,src:'7 links of 153 GB/s bidirectional (AMD MI355X product page; the brochure prints 153.6): 7 x 76.5 each way, only if the algorithm uses every link'},
    {nm:'800 Gb/s NIC per GPU (B300 class)',bw:100,maxN:null,src:'HGX B300: 1.6 TB/s networking per 8 GPUs, both directions (NVIDIA HGX page, reference design). AWS P6-B300 provides half: 6.4 Tb/s of EFA per 8 GPUs, 400 Gb/s (50 GB/s) per GPU'},
    {nm:'PCIe 5.0 x16 (RTX 5090, no NVLink)',bw:63,maxN:8,src:'32 GT/s per lane, 128b/130b encoding, 16 lanes: 63 GB/s each way (derived)'},
    {nm:'400 Gb/s NIC per GPU (InfiniBand NDR or RoCE)',bw:50,maxN:null,src:'400 Gb/s = 50 GB/s each way; Llama 3 trained over 400 Gbps RoCE, AWS p5 has 3,200 Gbps per 8 H100s'},
    {nm:'100 Gb/s Ethernet',bw:12.5,maxN:null,src:'100 Gb/s = 12.5 GB/s each way'}];
  const SIZES=[['l8',2],['l70',2],['l405',2],[null,1e9],[null,1e8]];
  function init(){
    $('calc-cS').innerHTML=SIZES.map((s,i)=>'<option value="'+i+'">'+(s[0]?X.esc(X.M[s[0]].name)+' gradients, BF16 ('+X.fGB(X.M[s[0]].P*2/1e9)+')':X.fGB(s[1]/1e9)+(s[1]<1e9?' (one gradient bucket)':''))+'</option>').join('');
    $('calc-cn').innerHTML=[2,4,8,16,64,72,512].map(v=>'<option'+(v===8?' selected':'')+'>'+v+'</option>').join('');
    $('calc-pmodel').innerHTML=['l8','l70','l405','q32'].map(k=>'<option value="'+k+'"'+(k==='l70'?' selected':'')+'>'+X.esc(X.M[k].name)+'</option>').join('');
    $('calc-pchip').innerHTML=['h100','b200','gb200','mi300x'].map(k=>'<option value="'+k+'">'+X.esc(X.C[k].name)+'</option>').join('');
    $('calc-ptp').innerHTML=[2,4,8].map(v=>'<option'+(v===8?' selected':'')+'>'+v+'</option>').join('');
    $('calc-pmfu').value=0.4;
    ['calc-cS','calc-cn','calc-pmodel','calc-pchip','calc-ptp'].forEach(id=>$(id).addEventListener('change',render));
    $('calc-pmfu').addEventListener('input',render);
    X.onRender(render);
  }
  const bytesOf=i=>{const s=SIZES[i];return s[0]?X.M[s[0]].P*s[1]:s[1]};
  function render(){
    if($('t-calc').hidden)return;
    const S=bytesOf(+$('calc-cS').value),n=+$('calc-cn').value;
    const ts=LINKS.map(l=>X.allreduce(S,n,l.bw)),mx=Math.max.apply(null,ts);
    $('calc-cbars').innerHTML=LINKS.map((l,i)=>{const ok=!l.maxN||n<=l.maxN;
      return '<div class="row"><span class="nm" title="'+X.esc(l.src)+'">'+X.esc(l.nm)+'</span><span class="track"><span class="fill" style="width:'+(ts[i]/mx*100).toFixed(2)+'%;background:'+(ok?(l.bw>=400?'var(--c3)':'var(--c2)'):'var(--dim)')+'"></span></span><span class="val">'+(ok?X.fT(ts[i]):'not '+n+' GPUs')+'</span></div>'}).join('');
    const nv=X.allreduce(S,n,450),ib=X.allreduce(S,n,50);
    $('calc-cnote').innerHTML='All-reduce of '+X.fGB(S/1e9)+' across '+n+' GPUs: each GPU moves 2('+n+' &#8722; 1)/'+n+' = '+X.sig(2*(n-1)/n,3)+' x the tensor. Bandwidth only; real NCCL adds a latency per hop and reaches a fraction of the link (measure with nccl-tests). Grey: the link cannot join that many GPUs directly. Hover a name for its source. On H100s the same gradient takes '+X.fT(nv)+' over NVLink and '+X.fT(ib)+' over a 400 Gb/s NIC: '+X.sig(ib/nv,2)+'x slower, which is why data parallelism overlaps its all-reduce with the backward pass and why bigger clusters prefer to shard inside a server.';
    const o={model:$('calc-pmodel').value,chip:$('calc-pchip').value,tp:+$('calc-ptp').value,tokens:8192,mfu:+$('calc-pmfu').value};
    $('calc-pmfuv').textContent=Math.round(o.mfu*100)+'%';
    const ch=X.C[o.chip],up=X.tpRatio(Object.assign({},o,{link:ch.up})),net=X.tpRatio(Object.assign({},o,{link:50}));
    const rows=[['matmul compute of one layer',up.comp_ms,'var(--c1)'],['TP all-reduces over '+(o.chip==='mi300x'?'Infinity Fabric':'NVLink')+' ('+ch.up+' GB/s)',up.comm_ms,'var(--c3)'],['the same over a 400 Gb/s NIC',net.comm_ms,'var(--bad)']];
    const m2=Math.max.apply(null,rows.map(r=>r[1]));
    $('calc-pbars').innerHTML=rows.map(r=>'<div class="row"><span class="nm">'+X.esc(r[0])+'</span><span class="track"><span class="fill" style="width:'+(r[1]/m2*100).toFixed(2)+'%;background:'+r[2]+'"></span></span><span class="val">'+X.sig(r[1])+' ms</span></div>').join('');
    $('calc-pnote').innerHTML='Per layer, for one 8,192-token micro-batch, forward and backward. Inside the server the TP traffic is <b>'+X.pct(up.ratio)+'</b> of the compute time; over the network it would be <b>'+X.pct(net.ratio)+'</b>, and it sits on the critical path (the next matmul needs the reduced result). So TP is kept within the NVLink domain (8 GPUs on an HGX server, up to 72 in an NVL72 rack) and the slower, overlappable kinds of parallelism (pipeline and data) cross servers. Model: Megatron-LM\'s four all-reduces of s x b x h BF16 activations per layer, ring cost, no overlap, compute at the MFU you set.';
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
