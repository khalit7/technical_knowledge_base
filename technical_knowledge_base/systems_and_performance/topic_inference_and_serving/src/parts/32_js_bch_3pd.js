// ---- Engine bench: prefill vs prompt length, decode vs context, batching ----
(function(){
  const B=window.BCH,D=B.D,$=B.$;
  if(!$('bch-pp-plot'))return;
  const KV=2*28*8*128*2; // bytes per token, Qwen3-0.6B at 16 bits (config.json)
  const lb=(set,o)=>D.lb.filter(r=>r.set===set&&Object.keys(o||{}).every(k=>r[k]===o[k]));
  const pt=(x,r,tip)=>[x,r.ts,Math.min(...r.samples),Math.max(...r.samples),tip];
  // fit time per token = t0 + bytes/BW on the flash-attention depth sweep (same as recompute.fit_bandwidth)
  function fit(){const rows=lb('lb_0.6b_tgdepth',{fa:1});const W=rows[0].bytes;
    const xs=rows.map(r=>W+r.depth*KV),ys=rows.map(r=>1/r.ts);const n=xs.length,mx=B.mean(xs),my=B.mean(ys);
    let sxy=0,sxx=0;xs.forEach((x,i)=>{sxy+=(x-mx)*(ys[i]-my);sxx+=(x-mx)*(x-mx)});const b=sxy/sxx;return {t0:my-b*mx,bw:1/b,W}}
  B.fit=fit;
  function drawPP(){
    const ser=[['F16','var(--c1)'],['Q4_K_M','var(--c2)']].map(([q,c])=>({name:'Qwen3-0.6B '+q,color:c,
      pts:lb('lb_0.6b_ppsweep',{quant:q}).map(r=>pt(r.pp,r,q+', '+r.pp+'-token prompt: '+B.f(r.ts)+' tokens/s (sd '+B.f(r.sd)+')'))}));
    const tg=lb('lb_0.6b_quants',{quant:'Q4_K_M',tg:128})[0];
    B.chart({el:$('bch-pp-plot'),legend:$('bch-pp-leg'),series:ser,xlog:true,xlab:'prompt length (tokens, log scale)',ylab:'prompt tokens/s',ymin:0,
      hl:[{y:tg.ts,label:'decode, Q4_K_M: '+B.f(tg.ts)+' tokens/s',color:'var(--c3)'}],label:'Prompt processing speed against prompt length'});
  }
  function drawTG(){
    const fa=[[1,'flash attention on','var(--c1)'],[0,'flash attention off','var(--c4)']];
    const ser=fa.map(([v,nm,c])=>({name:nm,color:c,pts:lb('lb_0.6b_tgdepth',{fa:v}).map(r=>pt(r.depth||1,r,nm+', context '+B.f(r.depth)+': '+B.f(r.ts,1)+' tokens/s'))}));
    if($('bch-tg-model').checked){const F=fit();const pts=[];for(let d=0;d<=16384;d+=512)pts.push([d||1,1/(F.t0+(F.W+d*KV)/F.bw)]);
      ser.push({name:'fit: '+B.f(F.t0*1000,2)+' ms + bytes / '+B.f(F.bw/1e9)+' GB/s',color:'var(--mute)',dash:'5 4',marker:false,pts:pts});
      const pts2=[];for(let d=0;d<=16384;d+=512)pts2.push([d||1,143e9/(F.W+d*KV)]);
      ser.push({name:'pure bandwidth, 143 GB/s, no fixed cost',color:'var(--c3)',dash:'2 4',marker:false,sw:1.5,pts:pts2});}
    B.chart({el:$('bch-tg-plot'),legend:$('bch-tg-leg'),series:ser,xlab:'context already in the KV cache (tokens)',ylab:'decode tokens/s',ymin:0,ymax:400,xmin:0,xmax:16900,
      xticks:[0,4000,8000,12000,16000],label:'Decode speed against context length'});
  }
  function drawBT(mode){
    const bb=D.bb.filter(r=>r.set==='bb_0.6b_q4');const ml=D.mlx.filter(r=>r.model==='Qwen3-0.6B'&&r.quant==='4bit'&&r.p===128&&r.g===128);
    const per=mode==='per';
    const s1={name:'llama.cpp, Q4_K_M',color:'var(--c1)',pts:bb.map(r=>{const v=r.s_tg.map(x=>per?x/r.pl:x);return [r.pl,B.med(v),Math.min(...v),Math.max(...v),'llama.cpp, '+r.pl+' sequences: '+B.f(B.med(v),1)+' tokens/s'+(per?' each':' total')]})};
    const s2={name:'MLX, 4-bit',color:'var(--c2)',pts:ml.map(r=>{const v=r.gen_tps.map(x=>per?x/r.b:x);return [r.b,B.med(v),Math.min(...v),Math.max(...v),'MLX, '+r.b+' sequences: '+B.f(B.med(v),1)+' tokens/s'+(per?' each':' total')]})};
    B.chart({el:$('bch-bt-plot'),legend:$('bch-bt-leg'),series:[s1,s2],xlog:true,xticks:[1,2,4,8,16,32,64],xlab:'sequences decoded together (batch size, log scale)',ylab:per?'tokens/s per sequence':'total tokens/s',ymin:0,label:'Decode throughput against batch size'});
  }
  let btMode='tot';
  B.seg($('bch-bt-seg'),m=>{btMode=m;drawBT(m)});
  $('bch-tg-model').addEventListener('change',drawTG);
  B.onRender(()=>{drawPP();drawTG();drawBT(btMode)});
})();
