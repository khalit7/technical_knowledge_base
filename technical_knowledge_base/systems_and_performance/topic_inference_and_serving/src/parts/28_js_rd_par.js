// ---- Reading tab, section 7: five ways to use several GPUs (switchable diagram) ----
(function(){
  const svgEl=document.getElementById('rd-par-svg');if(!svgEl)return;const cap=document.getElementById('rd-par-cap');
  let mode='dp';
  const TXT={
    dp:['Replicas: four whole copies','Each GPU holds all 80 layers and serves its own users. Nothing crosses between GPUs, so four copies give four times the throughput; each copy must fit its model and enough cache on its own GPUs.'],
    tp:['Tensor parallel: every layer split four ways','Each GPU holds a quarter of every matrix in every layer, so each reads a quarter of the weights per step: lower latency. After attention and after the MLP of each layer the four partial results are summed (an all-reduce), 160 times per step for 80 layers: only fast links (NVLink) keep up.'],
    pp:['Pipeline parallel: whole layers per GPU','GPU 1 holds layers 1 to 20, GPU 2 layers 21 to 40, and so on; activations pass from stage to stage. Links can be slower, so it spans servers, but one token still visits every stage in turn: no latency gain, and stages idle unless several batches are in flight.'],
    ep:['Expert parallel: experts spread out','For a mixture-of-experts model each GPU holds a share of the experts (8 of 32 here) and usually its own copy of attention. Each token is sent to the GPUs holding its chosen experts and the results come back: two all-to-all exchanges per MoE layer.'],
    pd:['Prefill / decode split','Two GPUs only prefill, two only decode. A prompt is prefilled on one side, its cache (625 MiB for 2,000 tokens of the running example) is sent across, and decoding continues on the other side, never stalled by someone else\'s prompt. Each side gets its own parallelism and size.']};
  function gpu(x,y,w,h,k){
    let s=RDX.R(x,y,w,h,'var(--bg)',{st:'var(--line)',rx:6})+RDX.T(x+6,y+14,(mode==='pd'?(k<2?'Prefill GPU ':'Decode GPU '):'GPU ')+(k+1),{fs:10.5,w:600});
    const lx=x+6,lw=w-12,ly=y+22,lh=12,seg=lw/20;
    for(let j=0;j<20;j++){let c='var(--soft)',op=1,hh=lh;
      if(mode==='dp'||mode==='pd')c=mode==='pd'&&k<2?'var(--c2)':'var(--c1)';
      else if(mode==='tp'){c='var(--c1)';hh=lh/4}
      else if(mode==='pp')c=Math.floor(j/5)===k?'var(--c1)':'var(--soft)';
      else if(mode==='ep')c='var(--c6)';
      s+=RDX.R(lx+j*seg+0.5,ly+(mode==='tp'?k*lh/4:0),seg-1,hh,c,{rx:1,op:op})}
    s+=RDX.T(lx,ly+lh+12,mode==='tp'?'a quarter of each layer':mode==='pp'?'layers '+(k*20+1)+'-'+(k*20+20):mode==='ep'?'attention (own copy)':'80 layers',{fs:9.5,c:'var(--mute)'});
    if(mode==='ep'){for(let j=0;j<32;j++){const on=Math.floor(j/8)===k,xx=lx+(j%16)*(lw/16),yy=ly+lh+18+Math.floor(j/16)*9;s+=RDX.R(xx+0.5,yy,lw/16-1,7,on?'var(--c4)':'var(--soft)',{rx:1})}
      s+=RDX.T(lx,ly+lh+48,'experts '+(k*8+1)+'-'+(k*8+8),{fs:9.5,c:'var(--mute)'})}
    if(mode==='dp'||mode==='pd'){const users=mode==='pd'?(k<2?'prompts in':'answers out'):'own users\' cache';s+=RDX.R(lx,ly+lh+18,lw*(mode==='pd'&&k<2?0.3:0.6),10,'var(--c4)',{rx:1,op:.8});s+=RDX.T(lx,ly+lh+42,users,{fs:9.5,c:'var(--mute)'})}
    return s;
  }
  function draw(){
    const w=RD.width(svgEl),one=w>=600,gw=one?(w-50)/4:(w-30)/2,gh=88,gap=one?14:14;
    const pos=k=>one?[8+k*(gw+gap),24]:[8+(k%2)*(gw+gap),24+Math.floor(k/2)*(gh+30)];
    const h=one?gh+60:2*gh+80;let s='';
    for(let k=0;k<4;k++){const p=pos(k);s+=gpu(p[0],p[1],gw,gh,k)}
    // communication
    const mid=k=>{const p=pos(k);return [p[0]+gw/2,p[1]+gh]};
    const yB=one?24+gh+18:h-16;
    if(mode==='tp'||mode==='ep'){s+=RDX.L(14,yB,w-14,yB,'var(--bad)',{sw:2});for(let k=0;k<4;k++){const p=pos(k),xx=p[0]+gw/2;s+=RDX.L(xx,p[1]+gh,xx,one?yB:p[1]+gh+8,'var(--bad)',{sw:1.5,da:'3 2'})}
      s+=RDX.T(w/2,yB+13,mode==='tp'?'all-reduce after attention and after the MLP, every layer':'all-to-all: tokens to their experts and back, every MoE layer',{a:'middle',fs:10,c:'var(--bad)'})}
    else if(mode==='pp'){for(let k=0;k<3;k++){const a=pos(k),b=pos(k+1);if(one){s+=RDX.L(a[0]+gw,a[1]+gh/2,b[0],b[1]+gh/2,'var(--bad)',{sw:2})}
      else{const ax=a[0]+gw/2,ay=a[1]+gh,bx=b[0]+gw/2,by=b[1];s+=RDX.L(k===1?ax:a[0]+gw,k===1?ay:a[1]+gh/2,k===1?bx:b[0],k===1?by:b[1]+gh/2,'var(--bad)',{sw:2})}}
      s+=RDX.T(w/2,h-6,'activations pass stage to stage',{a:'middle',fs:10,c:'var(--bad)'})}
    else if(mode==='pd'){const a=one?[pos(1)[0]+gw,pos(1)[1]+gh/2]:[pos(0)[0]+gw/2,pos(0)[1]+gh],b=one?[pos(2)[0],pos(2)[1]+gh/2]:[pos(2)[0]+gw/2,pos(2)[1]];
      s+=RDX.L(a[0],a[1],b[0],b[1],'var(--bad)',{sw:2.5});s+=RDX.T(w/2,h-6,'the KV cache moves once per request',{a:'middle',fs:10,c:'var(--bad)'})}
    else s+=RDX.T(w/2,h-6,'no communication between copies',{a:'middle',fs:10,c:'var(--mute)'});
    s+=RDX.T(8,13,'Four GPUs serving one model',{fs:11,w:600});
    svgEl.innerHTML=RD.svg(w,h,s,TXT[mode][0]);RDX.cap(cap,TXT[mode][0],TXT[mode][1]);
  }
  RD.seg(document.getElementById('rd-par-mode'),v=>{mode=v;draw()});
  RD.onRender(draw);RD.onResize(draw);draw();
})();
