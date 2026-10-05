// ---- GPU simulator: 3 shared-memory bank conflicts ----
(function(){
  const U=SIMU,C=SIMC,D=window.SIMD,$=U.$;
  if(!$('sim-bank-card'))return;
  let mode='col32',pat='stride',stride=2;
  const bankCol=b=>'hsl('+Math.round(b*360/32)+',52%,56%)';
  function words(){
    if(mode==='free')return pat==='stride'?C.bankWords('stride',stride):C.bankWords(pat);
    return C.bankWords(mode);
  }
  // physical word -> (row, col) in the drawn tile; logical layout per mode
  function layout(){
    if(mode==='col33')return {cols:33,title:'float tile[32][33] (one spare column)'};
    if(mode==='swizzle')return {cols:32,title:'tile[32][32], element (r, c) stored at column c XOR r'};
    if(mode==='free')return {cols:32,title:'shared memory, 32 words per row'};
    return {cols:32,title:'float tile[32][32]'};
  }
  let st=null;
  function compute(){
    const w=words(),per={};
    w.forEach((x,l)=>{const b=x%32;(per[b]=per[b]||{});(per[b][x]=per[b][x]||[]).push(l)});
    const stacks=[];for(let b=0;b<32;b++)stacks.push(per[b]?Object.keys(per[b]).map(Number).sort((a,c)=>a-c).map(x=>({w:x,lanes:per[b][x]})):[]);
    const r=C.banks(w);
    st={w,stacks,deg:r.degree,used:r.banks_used};
  }
  const fig=$('sim-bank-fig');
  function draw(i){
    const W=U.width(fig),side=W>=640;
    const L=layout(),maxRow=Math.max(32,...st.w.map(x=>Math.floor(x/L.cols)+1));
    const rows=Math.min(maxRow,64);
    const mw=side?Math.min(W*0.42,300):W;
    const cs=Math.max(3,Math.min(9,Math.floor((mw-4)/L.cols)));
    const req=new Set(st.w);
    let b=U.t(0,11,L.title,{fs:11,w:600});
    const oy=18;
    for(let r=0;r<rows;r++)for(let c=0;c<L.cols;c++){const word=r*L.cols+c;
      b+=U.rect(c*cs,oy+r*cs,cs-.4,cs-.4,bankCol(word%32),{op:req.has(word)?1:.28,tip:'word '+word+', bank '+(word%32)+(req.has(word)?': requested':'')})}
    st.w.forEach((word,l)=>{const r=Math.floor(word/L.cols),c=word%L.cols;if(r<rows)b+=U.rect(c*cs,oy+r*cs,cs-.4,cs-.4,'none',{st:'var(--ink)',sw:1.3})});
    if(mode==='col32'||mode==='col33'||mode==='swizzle')b+=U.t(0,oy+rows*cs+12,'outlined: the 32 words lane 0 to 31 read (column 0)',{fs:10,fill:'var(--mute)'});
    const mapH=oy+rows*cs+(mode==='free'?6:18);
    // bank stacks
    const bx=side?mw+24:0,by=side?0:mapH+10,bw=side?W-bx:W;
    const bc=Math.max(7,Math.floor((bw-4)/32));
    const maxD=Math.min(32,st.deg),bh=Math.max(6,Math.min(16,Math.floor(260/Math.max(8,maxD))));
    let s=U.t(bx,by+11,'32 banks: '+(i===0?'requests queued':i>=st.deg?'all served after '+st.deg+' wavefront'+(st.deg>1?'s':''):'after wavefront '+i+' of '+st.deg),{fs:11,w:600});
    const base=by+20+maxD*bh;
    for(let k=0;k<32;k++){
      const x=bx+k*bc;
      s+=U.rect(x,base+2,bc-1,6,bankCol(k));
      st.stacks[k].forEach((e,j)=>{if(j>=32)return;const served=j<i;
        s+=U.rect(x+.5,base-(j+1)*bh,bc-2,bh-1.5,served?'var(--dim)':bankCol(k),{op:served?.5:1,tip:'bank '+k+', word '+e.w+', lane'+(e.lanes.length>1?'s ':' ')+e.lanes.join(', ')+(served?' (served)':'')});
        if(bc>=12&&bh>=10)s+=U.t(x+bc/2-1,base-j*bh-bh*0.25-1,e.lanes.length>1?'all':e.lanes[0],{fs:Math.min(9,bh-2),a:'middle',fill:served?'var(--mute)':'#111'});
      });
      if(k%8===0)s+=U.t(x,base+19,k,{fs:9.5,fill:'var(--mute)'});
    }
    const H=side?Math.max(mapH,base+24):base+24;
    fig.innerHTML=U.svg(W,H,b+s,'Shared memory layout and bank queues');
    const d=st.deg;
    let cap;
    if(i===0)cap='The warp asks for 32 words. '+(st.used===1&&d===1?'They are all the same word: one bank, one read, broadcast to every lane.':st.used===32?'They fall in 32 different banks: one wavefront serves them all.':'They fall in '+st.used+' bank'+(st.used>1?'s':'')+'; the busiest bank holds '+d+' different words.');
    else if(i<d)cap='Wavefront '+i+': each bank with a waiting word serves one. '+(d-i)+' to go.';
    else cap=d===1?'Done in one wavefront: no conflict.':'Done after '+d+' wavefronts: a '+d+'-way conflict, '+d+' times slower than the conflict-free read.';
    $('sim-bank-cap').textContent=cap;
    $('sim-bank-out').innerHTML=U.stat('Wavefronts',d,'1 is ideal')+U.stat('Banks used',st.used,'of 32')+U.stat('Lanes served so far',Math.min(32,st.stacks.reduce((a,sk)=>a+sk.slice(0,i).reduce((q,e)=>q+e.lanes.length,0),0)),'of 32');
  }
  compute();
  const A=U.anim({card:'sim-bank-card',ctl:'sim-bank-ctl',n:st.deg+1,draw,ms:500,label:'Wavefront'});
  function update(){compute();A.reset(st.deg+1)}
  U.seg($('sim-bank-mode'),m=>{mode=m;$('sim-bank-free').hidden=m!=='free';update();A.play()});
  $('sim-bank-pat').addEventListener('change',e=>{pat=e.target.value;$('sim-bank-slab').hidden=pat!=='stride';update()});
  $('sim-bank-s').addEventListener('input',e=>{stride=+e.target.value;$('sim-bank-sv').textContent=stride;update()});
  U.onResize(()=>A.redraw());
  if(D&&D.m&&D.m.banks){
    const cs=D.m.banks.slice().sort((a,b)=>a.stride-b.stride),mx=Math.max(...cs.map(c=>c.ms_max));
    const rows=cs.map(c=>{const deg=C.banks(C.bankWords('stride',c.stride)).degree;
      return '<div class="row"><span class="nm">stride '+c.stride+' <span class="mute">(NVIDIA: '+deg+'-way)</span></span><span class="track"><span class="fill" style="width:'+(100*c.ms/mx)+'%;background:'+(deg>=16?'var(--c2)':'var(--c3)')+'"></span><span class="rng" style="left:'+(100*c.ms_min/mx)+'%;width:'+(100*(c.ms_max-c.ms_min)/mx)+'%"></span></span><span class="val">'+U.fmt(c.ms,2)+' ms</span></div>'}).join('');
    const g=s=>cs.find(c=>c.stride===s);
    const fast=cs.filter(c=>c.stride<=8);
    $('sim-bank-meas-body').innerHTML='<p class="small" style="margin:0 0 6px">Each of 262,144 threads (threadgroups of 256) reads 1,024 floats from a 16 KB threadgroup array, lane <i>l</i> starting at word <i>l</i> x <i>s</i> and stepping by one word, so neighbouring lanes stay <i>s</i> words apart. Time per launch; bars are medians of 3 runs, the thin line the full range. In brackets: the conflict degree NVIDIA\'s rule gives for the same stride.</p><div class="sim-hb">'+rows+'</div>'+
      '<p class="small" style="margin:6px 0 0">Strides 32 and 64 take '+U.fmt(g(32).ms,2)+' and '+U.fmt(g(64).ms,2)+' ms, '+U.fmt(g(32).ms/g(33).ms,1)+'x the '+U.fmt(g(33).ms,2)+' ms of stride 33, which differs by one word per lane. Stride 16 sits in between ('+U.fmt(g(16).ms,2)+' ms). Strides 1 to 8 measured '+U.fmt(Math.min(...fast.map(c=>c.ms_min)),2)+' to '+U.fmt(Math.max(...fast.map(c=>c.ms_max)),2)+' ms across runs, noisy on a shared laptop; their best runs ('+U.fmt(Math.min(g(1).ms_min,g(2).ms_min),2)+' ms for strides 1 and 2) match stride 33, and none came near stride 32. The padded and unpadded transposes of section 2 ran within noise of each other. Apple M1 Pro GPU, MLX '+D.meta.mlx+', '+D.meta.date+'.</p>';
  }
})();
