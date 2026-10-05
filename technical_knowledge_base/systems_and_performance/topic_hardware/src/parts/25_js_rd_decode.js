// ---- Reading 3: one decode token of Llama 3.1 8B (bf16) on different memories; full-memory reads per second ----
(function(){
  const box=document.getElementById('rd-dec-svg');if(!box||!window.RDH)return;
  const M={};RDH.mem.forEach(m=>M[m.id]=m);
  const W=RDH.step.bytes_bf16,NB=33;
  const lab={m1:['M1 Pro, LPDDR5','165 GB/s measured'],r5090:['RTX 5090, GDDR7','1.79 TB/s'],h100:['H100 SXM, HBM3','3.35 TB/s'],b200:['B200, HBM3e','8 TB/s'],lpx:['Groq 3 LPX rack, SRAM','40 PB/s, announced']};
  const col={m1:'var(--c6)',r5090:'var(--c2)',h100:'var(--c1)',b200:'var(--c4)',lpx:'var(--c3)'};
  const modes={dram:['r5090','h100','b200'],sram:['b200','lpx'],m1:['m1','h100']};
  let mode='dram',steps=[];
  const ms=x=>x>=10?x.toFixed(1):x>=0.1?x.toFixed(2):x.toFixed(4);
  function mk(){const ids=modes[mode],mx=Math.max(...ids.map(i=>M[i].ms));let s=[0];for(let k=1;k<=8;k++)s.push(mx*k/8);
    ids.forEach(i=>s.push(M[i].ms));if(mode==='sram')s.push(1);s=[...new Set(s.map(x=>+x.toFixed(6)))].sort((a,b)=>a-b);steps=s}
  function draw(i){
    const t=steps[i],ids=modes[mode],w=RD.width(box),mx=Math.max(...ids.map(i=>M[i].ms),mode==='sram'?1:0);
    const lh=60,H=ids.length*lh+34,bw=w-4;let b='';
    ids.forEach((id,k)=>{const m=M[id],y=k*lh,len=Math.max(3,bw*m.ms/mx),f=Math.min(1,t/m.ms),done=f*NB;
      b+=RD.t(0,y+12,lab[id][0],{fs:12,w:600})+RD.t(w,y+12,ms(m.ms)+' ms',{a:'end',fs:11.5,w:600})+RD.t(0,y+50,lab[id][1],{fs:10,fill:'var(--mute)'});
      const bl=len/NB;
      for(let j=0;j<NB;j++){const op=j<Math.floor(done)?1:(j===Math.floor(done)?done-j:0);
        b+='<rect x="'+(j*bl).toFixed(2)+'" y="'+(y+18)+'" width="'+Math.max(.6,bl-(bl>4?1:0)).toFixed(2)+'" height="20" fill="'+(op>0?col[id]:'var(--soft)')+'"'+(op>0&&op<1?' fill-opacity="'+(.3+.6*op).toFixed(2)+'"':'')+(bl>4?' stroke="var(--line)" stroke-width=".5"':'')+'/>'}
      
      if(id==='lpx'){const cx=bw*1/mx;b+='<line x1="'+cx+'" x2="'+cx+'" y1="'+(y+14)+'" y2="'+(y+44)+'" stroke="var(--bad)" stroke-dasharray="4 3" stroke-width="1.5"/>'+RD.t(cx+4,y+50,'vendor: 1 ms per token',{fs:10,fill:'var(--bad)'})}
    });
    // time axis
    const ya=ids.length*lh+6;b+='<line x1="0" x2="'+bw+'" y1="'+ya+'" y2="'+ya+'" stroke="var(--line)"/>';
    const tx=bw*t/mx;b+='<line x1="'+tx+'" x2="'+tx+'" y1="0" y2="'+ya+'" stroke="var(--ink)" stroke-width="1" stroke-opacity=".45"/>';
    b+=RD.t(0,ya+16,'0',{fs:10.5,fill:'var(--mute)'})+RD.t(bw,ya+16,ms(mx)+' ms',{a:'end',fs:10.5,fill:'var(--mute)'})+RD.t(bw/2,ya+16,'time per token, one axis for all',{a:'middle',fs:10.5,fill:'var(--mute)'});
    box.innerHTML=RD.svg(w,H,b,'Time to read every weight once for one token on each memory, to scale');
    const fin=ids.filter(id=>Math.abs(M[id].ms-t)<1e-6);
    let cap='<div class="t">t = '+ms(t)+' ms</div>';
    if(i===0)cap+='<p>One token: the activation vector meets every weight matrix once, so all 16.06 GB of weights must stream from memory to the SMs. Each block is one layer (the last is the output head).</p>';
    else if(mode==='sram'&&Math.abs(t-1)<1e-6)cap+='<p>The vendor quotes 1,000 tokens per second per user for the LPX rack, 1 ms per token: 2,500 times longer than its memory needs. With weights in SRAM the limit moves elsewhere: the hops between 256 chips the model is spread over, and the arithmetic. Bandwidth stopped being the wall.</p>';
    else if(fin.length){const id=fin[0],m=M[id];cap+='<p><b>'+lab[id][0]+'</b> has read the whole model: '+ms(m.ms)+' ms per token, a ceiling of '+Math.round(m.tps).toLocaleString('en-US')+' tokens per second at batch 1.'+
      (id==='r5090'?' GDDR7 on a 512-bit bus: the fastest non-stacked memory, about half an H100.':id==='h100'?' Five HBM3 stacks: 3.35 TB/s. Its 989.5 TFLOPS were nearly idle the whole time.':id==='b200'?' HBM3e at 8 TB/s: 2.4 times the H100, so 2.4 times the batch-1 tokens per second for the same model.':id==='m1'?' The laptop\'s measured 165 GB/s: 20 times slower than an H100 here, and the same physics.':id==='lpx'?' SRAM spread over a rack: the memory part of the token takes well under a microsecond.':'')+'</p>'}
    else cap+='<p>'+ids.map(id=>lab[id][0]+': '+Math.round(100*Math.min(1,t/M[id].ms))+'%').join(' &middot; ')+'</p>';
    document.getElementById('rd-dec-cap').innerHTML=cap;
    document.getElementById('rd-dec-cnt').innerHTML=ids.map(id=>{const m=M[id];return RD.stat(lab[id][0],(Math.min(1,t/m.ms)*W/1e9).toFixed(2)+' GB read',ms(m.ms)+' ms per token, '+Math.round(m.tps).toLocaleString('en-US')+' tok/s ceiling')}).join('');
  }
  mk();
  const A=RD.anim({card:'rd-dec-card',ctl:'rd-dec-ctl',n:steps.length,draw,ms:1300,label:'Time step'});
  RD.seg(document.getElementById('rd-dec-mode'),m=>{mode=m;mk();A.reset(steps.length)});
  RD.onResize(()=>A.redraw());
  // full-memory reads per second
  const rb=document.getElementById('rd-reads');
  if(rb){const mxr=Math.max(...RDH.reads.map(r=>r.per_s));
    rb.innerHTML=RDH.reads.slice().sort((a,b)=>b.per_s-a.per_s).map(r=>'<div class="row'+(r.name.indexOf('H100')===0?' hl':'')+'"><span class="nm" title="'+r.name+'">'+r.name+'</span><span class="track"><span class="fill" style="width:'+(100*r.per_s/mxr).toFixed(1)+'%;background:'+(r.name.indexOf('M1')===0?'var(--c6)':'var(--c1)')+'"></span></span><span class="val">'+r.per_s.toFixed(1)+' /s</span></div>').join('')}
})();
