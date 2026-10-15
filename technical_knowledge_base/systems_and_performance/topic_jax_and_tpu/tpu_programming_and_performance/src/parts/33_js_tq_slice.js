// ---- Slice planner (tab t-slice) ----
(function(){
  const U=window.TQU,D=U.D,G=U.G,$=id=>document.getElementById(id),E=RD.esc,gl=U.label;
  const MODELS=[['Running example (0.83M)',826368],['Llama 2 7B',6738415616],['Llama 3.1 8B',8030261248],['Llama 3.1 70B',70553706496],['Llama 3.1 405B',405853388800]];
  // LLaMA 3-70B of the scaling book is taken as 70B parameters (its own number)
  MODELS.push(['LLaMA 3-70B as the scaling book counts it (70e9)',70e9]);
  $('tq-s-model').innerHTML=MODELS.map((m,i)=>'<option value="'+i+'"'+(i===3?' selected':'')+'>'+E(m[0])+'</option>').join('');
  let gen='v5p';
  U.seg($('tq-s-gen'),U.GEN_ORDER.map(k=>[k,gl(k)]),gen,v=>{gen=v;fillTopo();draw()});
  function fillTopo(sel){const rows=D.slices.filter(r=>r.g===gen);$('tq-s-topo').innerHTML=rows.map(r=>'<option value="'+r.t+'">'+r.t+' ('+U.fmt(r.c)+' chips)'+(r.n?' *':'')+'</option>').join('');
    $('tq-s-topo').value=sel||rows[Math.min(rows.length-1,4)].t}
  const PRE={sb:['v5p','16x20x28',1,5,'16','4194304',40,'1.5e13'],v5p:['v5p','16x16x24',1,5,'16','4194304',40,'1.5e13'],ms:['v5p','16x16x16',2,5,'16','4194304',40,'1.5e13'],
    l8:['v6e','16x16',1,2,'16','1048576',45,'1e12'],tiny:['v5e','1x1',1,0,'16','262144',40,'1e11']};
  $('tq-s-pre').addEventListener('change',e=>{const p=PRE[e.target.value];if(!p)return;gen=p[0];$('tq-s-gen').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.v===gen));
    fillTopo(p[1]);$('tq-s-n').value=String(p[2]);$('tq-s-model').value=String(p[3]);$('tq-s-bpp').value=p[4];$('tq-s-tok').value=p[5];$('tq-s-mfu').value=p[6];$('tq-s-T').value=p[7];draw()});
  function pic(r){const host=$('tq-s-svg'),W=Math.min(760,U.width(host)),dims=r.t.split('x').map(Number),X=dims[0],Y=dims[1],Z=dims[2]||1;
    const layers=Math.min(Z,6),gap=10,lw=Math.min((W-20-(layers-1)*gap)/layers,220),cell=Math.max(2,Math.min(lw/Y,lw/X,22)),gw=Y*cell,gh=X*cell;let s='';
    for(let z=0;z<layers;z++){const ox=10+z*(gw+gap),oy=22;s+=U.tx(ox,14,Z>1?(z===layers-1&&Z>layers?'... z = '+(Z-1):'z = '+z):'one layer',{fs:10,fill:'var(--mute)'});
      for(let x=0;x<X;x++)for(let y=0;y<Y;y++){const cube=Z>1&&X>=4&&Y>=4?((Math.floor(x/4)+Math.floor(y/4)+Math.floor(z/4))%2):0;
        s+='<rect x="'+(ox+y*cell)+'" y="'+(oy+x*cell)+'" width="'+Math.max(1,cell-1)+'" height="'+Math.max(1,cell-1)+'" fill="'+(cube?'var(--acc2)':'var(--soft)')+'" stroke="'+(cell>5?'var(--line)':'none')+'"/>'}
      if(r.w[1])s+='<path d="M'+(ox)+','+(oy+gh+4)+' q'+(gw/2)+',10 '+gw+',0" fill="none" stroke="var(--c2)"/>';
      if(r.w[0])s+='<path d="M'+(ox+gw+3)+','+oy+' q8,'+(gh/2)+' 0,'+gh+'" fill="none" stroke="var(--c2)"/>'}
    const H=22+gh+14;
    host.innerHTML=U.S(W,H,s,'Slice '+r.t)+'<p class="tq-src">'+(Z>1?'x-y layers'+(Z>layers?' (first and last shown)':'')+'; shaded blocks are 4x4x4 cubes; ':'')+'orange arcs mark wraparound links'+(r.w.some(Boolean)?'.':' (none on this slice).')+'</p>'}
  function draw(){const r=D.slices.find(x=>x.g===gen&&x.t===$('tq-s-topo').value);if(!r)return;const g=G[gen],ns=+$('tq-s-n').value,N=MODELS[+$('tq-s-model').value][1],bpp=+$('tq-s-bpp').value,
      tok=+$('tq-s-tok').value,mfu=+$('tq-s-mfu').value/100,T=+$('tq-s-T').value;$('tq-s-mfuv').textContent=Math.round(mfu*100)+'%';
    pic(r);const chips=r.c*ns,hbm=g.hbm*chips,state=N*bpp,perChip=state/chips,frac=perChip/g.hbm,tpc=tok/chips,ridge=g.bf16/g.bw;
    const stepS=6*N*tok/(chips*g.bf16*mfu),days=6*N*T/(chips*g.bf16*mfu)/86400,usdH=g.price_v*chips;
    const gradPerChip=N*2/r.c,dcnS=ns>1?2*(ns-1)/ns*gradPerChip/g.dcn:0,fsdpNeed=g.bf16/(2*g.link1);
    $('tq-s-hw').innerHTML=RD.stat('Chips',U.fmt(chips),ns>1?ns+' slices of '+U.fmt(r.c):'one slice')+RD.stat('JAX devices',U.fmt(r.d*ns),gen==='7x'?'2 TensorCores per chip':(g.megacore?'megacore: 1 per chip':'1 per chip'))+
      RD.stat('Hosts',U.fmt(Math.max(1,Math.ceil(r.h))*ns),g.host_chips+' chips each'+(r.h<1?' (shared host)':''))+(r.cu?RD.stat('Cubes',U.fmt(r.cu*ns,r.cu<1?2:0),'4x4x4'):'')+
      RD.stat('bf16 peak',U.si(g.bf16*chips,'FLOP/s'),'')+RD.stat('HBM',U.gb(hbm),U.gb(g.hbm)+' per chip')+RD.stat('List price',  '$'+U.fmt(usdH,0)+'/h','on demand, '+g.region);
    const fitTxt=frac<=0.6?'<span class="tq-ok">fits</span>, '+U.pct(1-frac,0)+' left':frac<=1?'<span class="tq-bad">tight</span>, '+U.pct(1-frac,0)+' left':'<span class="tq-bad">does not fit</span>';
    $('tq-s-run').innerHTML=RD.stat('State per chip',U.gb(perChip),fitTxt)+RD.stat('Tokens per chip per step',U.fmt(tpc),tpc>=ridge?'above the ridge ('+U.fmt(ridge)+')':'<span class="tq-bad">below the ridge ('+U.fmt(ridge)+')</span>')+
      RD.stat('FSDP needs per chip',U.fmt(fsdpNeed)+' tokens','peak / bidi link (scaling book); '+(tpc>=fsdpNeed?'met':'<span class="tq-bad">not met</span>'))+
      RD.stat('Step time at '+Math.round(mfu*100)+'% MFU',U.time(stepS),'6 N tokens / (chips x peak x MFU)')+RD.stat('Run length',U.fmt(days,1)+' days',U.si(T)+' tokens')+RD.stat('Run cost at list price','$'+U.si(usdH*days*24),'on demand; commitments 30 to 55% less')+
      (ns>1?RD.stat('DCN gradient reduction',U.time(dcnS),U.pct(dcnS/stepS,1)+' of the step if not overlapped'):'');
    let note=r.n?'<b>Note.</b> '+E(r.n)+'. ':'';
    if(gen==='v5p'&&r.c*ns>6144&&ns===1)note+='Cloud schedules at most 6,144 v5p chips in one slice; this plan needs Multislice. ';
    if(tpc<ridge)note+='At '+U.fmt(tpc)+' tokens per chip the weight matmuls are memory-bound (ridge '+U.fmt(ridge)+'): the assumed MFU is optimistic. ';
    if(tpc<fsdpNeed)note+='Pure FSDP over ICI would wait on the network at this batch per chip (the scaling book\'s rule); add tensor parallelism, as the scaling book does for LLaMA 3-70B ("roughly 2048-way FSDP and 4-way tensor parallelism"). ';
    if(!note)note='Nothing flagged: the state fits with room for activations, the batch per chip is above the ridge and the FSDP threshold.';
    $('tq-s-note').innerHTML=note;
    U.table($('tq-s-mesh'),[['Mesh (data, model)',m=>'('+U.fmt(r.d/m[0])+', '+m[0]+')'],['Accepted',m=>m[1]>=0?'<span class="tq-ok">yes</span>':'<span class="tq-bad">NotImplementedError</span>'],
      ['Model axis lands on',m=>m[1]>=0?(m[2]?m[2].split('').map(c=>c==='c'?'cores':c).join(', '):'(size 1)'):''],['Max hops between model neighbours',m=>m[1]>=0?String(m[1]):'','num']],r.m,{narrow:true});
  }
  ['tq-s-topo','tq-s-n','tq-s-model','tq-s-bpp','tq-s-tok','tq-s-mfu','tq-s-T'].forEach(id=>{$(id).addEventListener('input',draw);$(id).addEventListener('change',draw)});
  fillTopo('4x4x4');
  U.onTab('t-slice',draw);U.onResize('t-slice',draw);
})();
