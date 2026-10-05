// ---- GPU simulator: 2 coalescing (sector map) and the transpose before/after ----
(function(){
  const U=SIMU,C=SIMC,D=window.SIMD,$=U.$;
  if(!$('sim-coal-card'))return;
  const COLW=[16,32,64,128,256,512,1024,4096];
  let pat='stride',elem=4,par=2;
  const LAB={contiguous:null,offset:'k =',stride:'s =',column:'W =',random:'span x',broadcast:null};
  const RANGE={offset:[0,33,1],stride:[1,40,2],column:[0,COLW.length-1,1],random:[1,32,4]};
  function setRange(){
    const r=RANGE[pat];$('sim-coal-plab').hidden=!r;if(!r)return;
    const inp=$('sim-coal-par');inp.min=r[0];inp.max=r[1];inp.value=r[2];par=r[2];
    $('sim-coal-plab').firstChild.textContent=LAB[pat]+' ';
  }
  function param(){return pat==='column'?COLW[par]:par}
  function addrs(){
    if(pat==='column')return C.laneAddresses('stride',elem,COLW[par]);
    return C.laneAddresses(pat,elem,par);
  }
  const fig=$('sim-coal-fig');
  function draw(){
    const p=param();$('sim-coal-parv').textContent=pat==='column'?p.toLocaleString('en-US'):p;
    const a=addrs(),r=C.coalesce(a,elem);
    const unit=Math.min(elem,4),per=128/unit;
    // lines touched, in order
    const lines=[...new Set(a.flatMap(x=>[Math.floor(x/128),Math.floor((x+elem-1)/128)]))].sort((x,y)=>x-y);
    const shown=lines.slice(0,40);
    const hit={};a.forEach((x,l)=>{for(let b=x;b<x+elem;b+=unit){(hit[b]=hit[b]||[]).push(l)}});
    const secs=new Set();a.forEach(x=>{secs.add(Math.floor(x/32));secs.add(Math.floor((x+elem-1)/32))});
    const W=U.width(fig),lw=Math.min(84,Math.max(56,W*0.16));
    const cw=Math.max(2.5,Math.min(18,(W-lw-4)/per)),rh=Math.max(10,Math.min(16,cw+4));
    let b='',y=4,prev=null;
    shown.forEach(L=>{
      if(prev!==null&&L>prev+1){b+=U.t(lw-6,y+rh*0.6,'...',{a:'end',fill:'var(--mute)',fs:10});b+=U.t(lw,y+rh*0.6,(L-prev-1).toLocaleString('en-US')+' untouched line'+(L-prev-1>1?'s':''),{fs:10,fill:'var(--mute)'});y+=rh}
      b+=U.t(lw-6,y+rh*0.72,'byte '+(L*128).toLocaleString('en-US'),{a:'end',fs:9.5,fill:'var(--mute)'});
      for(let s=0;s<4;s++){const sx=lw+s*32/unit*cw,on=secs.has(L*4+s);
        b+=U.rect(sx,y,32/unit*cw,rh-2,on?'var(--acc2)':'var(--soft)',{st:on?'var(--acc)':'var(--line)',sw:on?1.6:1,tip:'sector '+(L*4+s)+(on?': moves 32 bytes':': not fetched')})}
      for(let k=0;k<per;k++){const byte=L*128+k*unit,h=hit[byte];
        if(h)b+=U.rect(lw+k*cw+.6,y+2,Math.max(1,cw-1.2),rh-6,'var(--c2)',{tip:'lane'+(h.length>1?'s ':' ')+[...new Set(h)].slice(0,6).join(', ')+(h.length>6?' and more':'')+' (byte '+byte+')'})}
      y+=rh;prev=L;
    });
    if(lines.length>shown.length){b+=U.t(lw,y+rh*0.7,'and '+(lines.length-shown.length)+' more lines',{fs:10,fill:'var(--mute)'});y+=rh}
    fig.innerHTML=U.svg(W,y+4,b,'Memory lines touched by one warp load');
    $('sim-coal-out').innerHTML=U.stat('Sectors (Sectors/Req)',r.sectors,'ideal '+(Math.max(1,32*elem/32))+' for '+elem+'-byte elements')+U.stat('Cache lines touched',r.lines,'128 bytes each')+
      U.stat('Bytes moved',r.bytes_moved.toLocaleString('en-US'),'32 per sector')+U.stat('Bytes the lanes asked for',r.useful.toLocaleString('en-US'),'32 lanes x '+elem+' B')+
      U.stat('Efficiency',U.pct(r.eff),'requested / moved');
    let note='';
    if(pat==='broadcast')note='Every lane asks for the same word: one sector is fetched and its value is sent to all 32 lanes. Counted as 100%: nothing fetched is wasted.';
    else if(pat==='column')note='Reading a column of a row-major matrix W elements wide is a stride of W: neighbouring lanes are '+(p*elem).toLocaleString('en-US')+' bytes apart, so each needs its own sector once W x '+elem+' B reaches 32 bytes.';
    else if(pat==='stride'&&p*elem>=32)note='Lanes are '+(p*elem)+' bytes apart, at least one sector each: the worst case. Larger strides cannot make it worse in this model (the M1 measurement below disagrees).';
    else if(pat==='offset'&&(p*elem)%32)note='Starting '+(p*elem)+' bytes into a sector makes the 32 requests straddle one extra sector.';
    else if(pat==='random')note='A gather from '+(32*par)+' elements: lanes that land in the same sector share it; the rest each pay for a whole one.';
    $('sim-coal-note').textContent=note;
  }
  $('sim-coal-pat').addEventListener('change',e=>{pat=e.target.value;setRange();draw()});
  $('sim-coal-par').addEventListener('input',e=>{par=+e.target.value;draw()});
  U.seg($('sim-coal-el'),m=>{elem=+m;draw()});
  setRange();
  U.onRender(draw);U.onResize(draw);

  // ---------- transpose before/after ----------
  let tmode='naive';
  const tfig=$('sim-tr-fig');
  const nsteps=()=>tmode==='naive'?32:64;
  function grid(ox,oy,cs,title,fill){
    let b=U.t(ox,oy-5,title,{fs:11,w:600});
    b+=U.rect(ox,oy,32*cs,32*cs,'var(--soft)',{st:'var(--line)'});
    for(let r=0;r<32;r++)for(let c=0;c<32;c++){const f=fill(r,c);if(f)b+=U.rect(ox+c*cs,oy+r*cs,cs,cs,f)}
    return b;
  }
  function tdraw(i){
    const W=U.width(tfig),n=tmode==='naive'?2:3;
    const across=W>=(n===2?420:600);
    const cs=Math.max(3,Math.min(across?7:9,Math.floor((across?(W-(n-1)*18)/n:W-10)/32)));
    const g=32*cs;
    const pos=k=>across?[k*(g+18),18]:[0,18+k*(g+30)];
    let b='',rdS=0,wrS=0,cap='';
    const rowSec=4,colSec=32;
    if(tmode==='naive'){
      const r=i;
      rdS=(r+1)*rowSec;wrS=(r+1)*colSec;
      b+=grid(...pos(0),cs,'input tile (read rows)',(y,x)=>y<r?'var(--c1)':y===r?'var(--c2)':null);
      b+=grid(...pos(1),cs,'output tile (write columns)',(y,x)=>x<r?'var(--c1)':x===r?'var(--c2)':null);
      cap='Warp instruction '+(r+1)+' of 32: the 32 lanes read row '+r+' of the input, 128 contiguous bytes, '+rowSec+' sectors; then each writes its value into column '+r+' of the output, where neighbours are 16,384 bytes apart (4,096 floats): '+colSec+' sectors for 128 useful bytes.';
    }else{
      const ph=i<32?0:1,r=ph?i-32:i;
      rdS=(ph?32:r+1)*rowSec;wrS=ph?(r+1)*rowSec:0;
      b+=grid(...pos(0),cs,'input tile (read rows)',(y,x)=>(ph||y<r)?'var(--c1)':y===r?'var(--c2)':null);
      b+=grid(...pos(1),cs,'shared memory tile',(y,x)=>ph?(x<r?'var(--dim)':x===r?'var(--c4)':'var(--c1)'):(y<r?'var(--c1)':y===r?'var(--c2)':null));
      b+=grid(...pos(2),cs,'output tile (write rows)',(y,x)=>ph?(y<r?'var(--c1)':y===r?'var(--c2)':null):null);
      cap=ph?'After __syncthreads(): instruction '+(r+1)+' of 32 reads column '+r+' of the shared tile (on chip, no DRAM traffic) and writes it as row '+r+' of the output: 128 contiguous bytes, '+rowSec+' sectors.':
        'Instruction '+(r+1)+' of 32: the lanes read row '+r+' of the input ('+rowSec+' sectors) and store it, unchanged, as row '+r+' of the shared tile.';
    }
    const H=across?18+g+6:pos(n-1)[1]+g+6;
    tfig.innerHTML=U.svg(W,H,b,'Transposing a 32 by 32 tile');
    $('sim-tr-cap').textContent=cap;
    const moved=32*(rdS+wrS),useful=tmode==='naive'?(i+1)*256:(i<32?(i+1)*128:4096+(i-31)*128);
    $('sim-tr-out').innerHTML=U.stat('Sectors read',rdS,'of '+(32*rowSec)+' when done')+U.stat('Sectors written',wrS,'of '+(tmode==='naive'?32*colSec:32*rowSec)+' when done')+
      U.stat('Bytes moved',moved.toLocaleString('en-US'),'useful so far: '+useful.toLocaleString('en-US'))+U.stat('Whole tile',(tmode==='naive'?(32*rowSec+32*colSec)*32:(64*rowSec)*32).toLocaleString('en-US')+' B','to move 8,192 useful bytes');
  }
  const TA=U.anim({card:'sim-tr-card',ctl:'sim-tr-ctl',n:32,draw:tdraw,ms:420,label:'Warp instruction'});
  U.seg($('sim-tr-mode'),m=>{tmode=m;TA.reset(nsteps());TA.play()});
  U.onResize(()=>TA.redraw());

  // ---------- measured ----------
  if(D&&D.m&&D.m.coalesce){
    const cs=D.m.coalesce.slice().sort((a,b)=>(a.stride<0?1e9:a.stride*10+a.offset)-(b.stride<0?1e9:b.stride*10+b.offset));
    const mx=Math.max(...cs.map(c=>c.gbps));
    const nm=c=>c.stride<0?'random gather':c.offset?'stride 1, offset 1':'stride '+c.stride+' ('+4*c.stride+' B)';
    const sim=c=>c.stride<0?null:C.coalesce(C.laneAddresses(c.offset?'offset':'stride',4,c.offset?1:c.stride),4).eff;
    const rows=cs.map(c=>{const lo=c.gbps*c.ms/c.ms_max,hi=c.gbps*c.ms/c.ms_min,e=sim(c);
      return '<div class="row"><span class="nm">'+nm(c)+'</span><span class="track"><span class="fill" style="width:'+(100*c.gbps/mx)+'%;background:var(--c3)"></span><span class="rng" style="left:'+(100*lo/mx)+'%;width:'+(100*(Math.min(hi,mx)-lo)/mx)+'%"></span></span><span class="val">'+U.fmt(c.gbps,c.gbps<10?1:0)+' GB/s</span></div>'+
      (e!=null?'<div class="row" style="margin-top:-2px"><span class="nm mute" style="font-size:11px">NVIDIA model</span><span class="track" style="height:6px"><span class="fill" style="width:'+(100*e)+'%;background:var(--c4)"></span></span><span class="val mute" style="font-size:11px">'+U.pct(e)+' eff.</span></div>':'')}).join('');
    const s1=cs.find(c=>c.stride===1&&!c.offset),s4=cs.find(c=>c.stride===4),s64=cs.find(c=>c.stride===64),g=cs.find(c=>c.stride<0);
    const tr=D.m.transpose,tm=Math.max(...tr.map(c=>c.gbps));
    const trn={'copy (both sides coalesced)':'plain copy, both sides coalesced','naive transpose':'naive transpose','tiled, tile[32][32]':'staged, tile[32][32]','tiled, padded tile[32][33]':'staged, padded tile[32][33]'};
    const trows=tr.map(c=>'<div class="row"><span class="nm">'+(trn[c.name]||c.name)+'</span><span class="track"><span class="fill" style="width:'+(100*c.gbps/tm)+'%;background:'+(c.name.startsWith('naive')?'var(--c2)':'var(--c3)')+'"></span></span><span class="val">'+U.fmt(c.gbps,0)+' GB/s</span></div>').join('');
    const nv=tr.find(c=>c.name==='naive transpose'),cp=tr.find(c=>c.name.startsWith('copy')),t32=tr.find(c=>c.name==='tiled, tile[32][32]');
    $('sim-coal-meas-body').innerHTML='<p class="small" style="margin:0 0 6px"><b>Stride sweep.</b> A 256 MB float32 buffer, far larger than the caches, is read exactly once in every case; only the order changes: neighbouring threads read elements s apart. Bandwidth counts only the bytes the threads asked for (the random gather also reads a 4-byte index per element, not counted). Purple: the efficiency NVIDIA\'s 32-byte sector rule predicts for the same pattern.</p><div class="sim-hb">'+rows+'</div>'+
      '<p class="small" style="margin:6px 0 10px">Up to a stride of 4 floats (16 bytes) the M1 loses nothing ('+U.fmt(s4.gbps,0)+' against '+U.fmt(s1.gbps,0)+' GB/s); past that it drops with every doubling of the stride, roughly halving each time from 8 floats on, down to '+U.fmt(s64.gbps,0)+' GB/s at 64 floats ('+U.fmt(s1.gbps/s64.gbps,0)+'x slower). The random gather reaches '+U.fmt(g.gbps,1)+' GB/s, '+U.fmt(s1.gbps/g.gbps,0)+'x slower than streaming.</p>'+
      '<p class="small" style="margin:0 0 6px"><b>Transpose of a 4,096 x 4,096 float32 matrix</b> (128 MB moved: 64 MB read, 64 MB written), the kernels above with 32 x 8 threadgroups, each thread moving 4 elements, as in <a href="https://developer.nvidia.com/blog/efficient-matrix-transpose-cuda-cc/" target="_blank" rel="noopener noreferrer">Harris (2013)</a>:</p><div class="sim-hb">'+trows+'</div>'+
      '<p class="small" style="margin:6px 0 0">The naive transpose runs at '+U.pct(nv.gbps/cp.gbps)+' of a plain copy; staging the tile in threadgroup memory brings it to '+U.pct(t32.gbps/cp.gbps)+'. The gap is far smaller than the simulator\'s 4.5x in sectors. The sector count is traffic between the cores and the cache; a likely reason for the difference, not verified here, is that the cache merges the strided writes before they reach DRAM, since each output line is filled by 32 consecutive writes of the same threadgroup. On an NVIDIA GPU the extra sectors still cost L1 and L2 bandwidth and instructions even when DRAM is spared. Median of 3 runs of 7 trials; Apple M1 Pro GPU, MLX '+D.meta.mlx+', '+D.meta.date+'.</p>';
  }
})();
