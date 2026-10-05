// ---- Performance calculator (t-calc): one decode step at batch 1 vs batch 64 (Llama 3.1 8B, BF16, one H100) ----
(function(){
  const X=window.CALCX,$=id=>document.getElementById(id);
  let B=1,ctx=4096,P;
  const base=()=>({model:'l8',chip:'h100',chips:1,fmt:'bf16',prec:'bf16',kvb:2,ctx:ctx,eff:1});
  const run=b=>X.decode(Object.assign(base(),{batch:b}));
  const tmax=()=>Math.max(run(1).t_ms,run(64).t_ms);
  const L=32;
  function draw(t){
    const el=$('calc-dviz'),r=run(B),W=Math.max(300,el.clientWidth),narrow=W<520,T=r.t_ms,prog=Math.min(1,t/T),layer=Math.min(L,Math.floor(prog*L+1e-9));
    const lx=narrow?70:96,iw=W-lx-10,TM=tmax(),sx=v=>lx+v/TM*iw;
    let s='',y=4;
    // bytes to read, to scale (max over both batches at this context)
    const r64=run(64),bmax=Math.max(r.wread+r.kvread,r64.wread+r64.kvread),bx=v=>v/bmax*iw;
    s+='<text x="0" y="'+(y+10)+'" font-size="11" style="fill:var(--mute)">bytes this step must read from HBM (same scale for batch 1 and 64)</text>';y+=16;
    s+='<text x="'+(lx-6)+'" y="'+(y+15)+'" font-size="11" text-anchor="end">HBM</text>';
    const ww=bx(r.wread),kw=bx(r.kvread);
    s+='<rect x="'+lx+'" y="'+y+'" width="'+ww+'" height="22" style="fill:var(--c1);opacity:.25"/><rect x="'+lx+'" y="'+y+'" width="'+(ww*prog)+'" height="22" style="fill:var(--c1)"/>';
    if(kw>0.2){s+='<rect x="'+(lx+ww)+'" y="'+y+'" width="'+kw+'" height="22" style="fill:var(--c2);opacity:.25"/><rect x="'+(lx+ww)+'" y="'+y+'" width="'+(kw*prog)+'" height="22" style="fill:var(--c2)"/>';
      if(B>1&&kw/B>3)for(let i=1;i<B;i++){const x=lx+ww+kw*i/B;s+='<line x1="'+x+'" x2="'+x+'" y1="'+y+'" y2="'+(y+22)+'" style="stroke:var(--bg);stroke-width:.6"/>'}}
    y+=26;s+='<text x="'+lx+'" y="'+(y+10)+'" font-size="11" style="fill:var(--mute)">weights '+X.fGB(r.wread)+(r.kvread>0?' + KV cache '+X.fGB(r.kvread)+(narrow?'':' ('+B+' sequence'+(B>1?'s':'')+' x '+X.fGB(r.kv_seq)+')'):'')+'</text>';y+=20;
    if(narrow&&r.kvread>0){s+='<text x="'+lx+'" y="'+(y+4)+'" font-size="11" style="fill:var(--mute)">('+B+' sequence'+(B>1?'s':'')+' x '+X.fGB(r.kv_seq)+')</text>';y+=14}
    // time lanes
    s+='<text x="0" y="'+(y+10)+'" font-size="11" style="fill:var(--mute)">time, same scale for both batches; layer '+layer+' of '+L+'</text>';y+=16;
    s+='<text x="'+(lx-6)+'" y="'+(y+15)+'" font-size="11" text-anchor="end">reading</text><text x="'+(lx-6)+'" y="'+(y+41)+'" font-size="11" text-anchor="end">computing</text>';
    s+='<rect x="'+lx+'" y="'+y+'" width="'+iw+'" height="22" style="fill:var(--soft)"/><rect x="'+lx+'" y="'+(y+26)+'" width="'+iw+'" height="22" style="fill:var(--soft)"/>';
    const tr=Math.min(t,r.t_mem_ms);s+='<rect x="'+lx+'" y="'+y+'" width="'+(sx(tr)-lx)+'" height="22" style="fill:var(--c1)"/>';
    const per=T/L,c=r.t_cmp_ms/L;
    for(let i=0;i<L;i++){const a=i*per+per-c;if(a>=t)break;const b=Math.min(i*per+per,t);s+='<rect x="'+sx(a)+'" y="'+(y+26)+'" width="'+Math.max(0.8,sx(b)-sx(a))+'" height="22" style="fill:var(--c4)"/>'}
    const xc=sx(Math.min(t,TM));s+='<line x1="'+xc+'" x2="'+xc+'" y1="'+(y-4)+'" y2="'+(y+52)+'" style="stroke:var(--ink);stroke-width:1.5"/>';
    const xe=sx(T);s+='<line x1="'+xe+'" x2="'+xe+'" y1="'+(y-2)+'" y2="'+(y+50)+'" style="stroke:var(--mute);stroke-dasharray:3 3"/>';
    y+=52;const ticks=[1,2,5,10,20,50,100].find(v=>v/TM*iw>=44)||100;for(let k=0;k*ticks<=TM;k++){const x=sx(k*ticks);s+='<text x="'+x+'" y="'+(y+10)+'" font-size="10.5" text-anchor="'+(x>W-24?'end':'middle')+'" style="fill:var(--mute)">'+(k*ticks)+' ms</text>'}
    y+=16;
    el.innerHTML='<svg viewBox="0 0 '+W+' '+y+'" width="'+W+'" height="'+y+'" role="img" aria-label="One decode step animated">'+s+'</svg>';
    const done=t>=T-1e-9;
    $('calc-dcap').innerHTML=t<=0?'<b>A decode step starts.</b> To produce the next token for '+(B===1?'one sequence':'each of '+B+' sequences')+', the GPU walks through all 32 layers, and every layer\'s weights must come from HBM into the chip. Press play.'
      :!done?'<b>Layer '+layer+' of 32.</b> Blue: weights streaming in (read once, used by all '+B+' token'+(B>1?'s':'')+'). '+(r.kvread>0?'Orange: each sequence\'s own keys and values for its '+ctx.toLocaleString('en-US')+' past tokens. ':'')+'Purple slivers: the tensor cores actually computing, '+X.pct(r.busy)+' of the time.'
      :'<b>Step done: '+B+' token'+(B>1?'s':'')+' in '+X.sig(T)+' ms.</b> '+(B===1?'The H100 spent '+X.pct(1-r.busy)+' of the step waiting for memory. Switch to batch 64.':'64 tokens for '+X.sig(T/run(1).t_ms,2)+'x the time of one: '+X.sig(r.tps/run(1).tps,2)+'x the throughput, not 64x, because each sequence brings its own KV cache'+(ctx>=32768?' (here the cache is '+X.sig(r.kvread/r.wread,2)+'x the weights)':'')+'.'+(r.fits?' Try the 512 and 32,768 contexts.':' <span class="calc-no">And it does not fit:</span> '+X.fGB(r.mem_need)+' against 80 GB, so a real server would cap the batch or the context, or quantise the cache.'));
    $('calc-dout').innerHTML=X.stat('Step time',X.sig(T)+' ms',r.bound+'-bound')+X.stat('Tokens/s, all sequences',X.sig(r.tps),X.sig(r.tps_seq)+' per sequence')+X.stat('Tensor cores busy',X.pct(r.busy),X.fE(r.flops)+' FLOPs this step')+X.stat('Memory needed',X.fGB(r.mem_need),r.fits?'<span class="calc-ok">fits</span> in 80 GB':'<span class="calc-no">does not fit</span> in 80 GB');
  }
  function init(){
    P=window.CALCP({root:$('calc-dviz'),play:$('calc-dplay'),prev:$('calc-dprev'),next:$('calc-dnext'),scrub:$('calc-dscrub'),spd:$('calc-dspd'),wall:6,
      total:()=>run(B).t_ms,stops:()=>{const T=run(B).t_ms;return [0.25,0.5,0.75,1].map(f=>f*T)},draw:draw});
    const seg=(id,f)=>$(id).addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;[...$(id).children].forEach(x=>x.classList.toggle('on',x===b));f(+b.dataset.v);P.reset();P.auto()});
    seg('calc-dmode',v=>{B=v});seg('calc-dctx',v=>{ctx=v});
    X.onRender(()=>P.set(P.t));addEventListener('resize',()=>{if(!$('t-calc').hidden)P.set(P.t)});
    P.set(0);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
