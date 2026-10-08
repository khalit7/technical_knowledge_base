// ---- Reading tab, section 2: KV cache per conversation (calculator) and prefix caching off/on (animation) ----
(function(){
  const R=window.RDD,bars=document.getElementById('rd-kv-bars');if(!bars)return;
  const ctxEl=document.getElementById('rd-kv-ctx'),ctxV=document.getElementById('rd-kv-ctxv'),capEl=document.getElementById('rd-kv-cap');
  let kb='2';
  const fmtB=b=>b>=1073741824?RDX.nf(b/1073741824,b>=10*1073741824?0:1)+' GiB':RDX.nf(b/1048576)+' MiB';
  function draw(){
    const ci=+ctxEl.value,ctx=R.ctx[ci];ctxV.textContent=RDX.nf(ctx)+' tokens';
    const mx=Math.max(...R.kv.map(r=>r.seq[kb][ci]));
    bars.innerHTML=R.kv.map(r=>{const v=r.seq[kb][ci],f=r.fit[kb][ci];
      return '<div class="row'+(r.k==='l70'?' hl':'')+'"><div class="nm">'+r.name+'<span class="ml">'+RDX.nf(r.per_tok[kb]/1024,r.per_tok[kb]%1024?1:0)+' KiB per token</span></div><div class="track"><div class="fill" style="width:'+(100*v/mx).toFixed(1)+'%;background:var('+(r.k==='l70'?'--c2':'--c1')+')"></div></div><div class="val">'+fmtB(v)+'<span class="ml">'+RDX.nf(f)+' fit</span></div></div>'}).join('');
    const l=R.kv.find(r=>r.k==='l70'),d=R.kv.find(r=>r.k==='dsv3');
    capEl.innerHTML='Bar: cache of one conversation at '+RDX.nf(ctx)+' tokens; "fit": conversations of that length one 8 &times; H200 server ('+RDX.nf(R.server_gb)+' GB usable) holds after the weights. Llama 3.1 70B: '+fmtB(l.seq[kb][ci])+' each, '+RDX.nf(l.fit[kb][ci])+' fit; DeepSeek-V3, ten times larger, '+fmtB(d.seq[kb][ci])+' each.';
  }
  ctxEl.addEventListener('input',draw);RD.seg(document.getElementById('rd-kv-b'),v=>{kb=v;draw()});
  RD.onRender(draw);draw();
})();
(function(){
  const D=window.RDD.life,svgEl=document.getElementById('rd-pc-svg');if(!svgEl)return;
  const cap=document.getElementById('rd-pc-cap'),cnt=document.getElementById('rd-pc-cnt');
  const PT=D.t_pre_ms/2000,KV=D.kv_tok/1073741824,Q=125; // ms per prompt token, GiB per token, tokens per square
  let mode='off';
  function state(i){ // after i requests
    const on=mode==='on';let comp=0,held=0,hit=0;
    for(let r=1;r<=i;r++){if(on&&r>1){comp+=1000;hit+=1000}else comp+=2000}
    held=on?(i?1000+1000*i:0):2000*i;return {comp,held,hit};
  }
  function draw(i){
    const w=RD.width(svgEl),on=mode==='on',k=Math.min(i,4),sq=Math.max(7,Math.min(16,(w-120)/17)),x0=Math.min(96,w*0.26),h=on?140:120;
    let s=RDX.T(4,12,'KV cache in GPU memory',{fs:11,w:600});
    if(on){ // shared row
      s+=RDX.T(4,34,'System prompt',{fs:10.5});
      for(let j=0;j<8;j++)if(k>=1)s+=RDX.R(x0+j*(sq+1),24,sq,sq,'var(--c5)');
      if(k>=1)s+=RDX.T(x0+8*(sq+1)+6,24+sq-2,'shared by '+k+(k>1?' requests':' request'),{fs:10.5,w:600});
    }
    for(let r=1;r<=4;r++){const y=(on?30:12)+r*22;s+=RDX.T(4,y+sq-3,'Request '+r,{fs:10.5,c:r<=k?'var(--ink)':'var(--mute)'});
      if(r>k)continue;const fresh=r===k&&i<=4;
      if(!on){for(let j=0;j<16;j++)s+=RDX.R(x0+j*(sq+1),y,sq,sq,j<8?'var(--c5)':'var(--c1)',{op:fresh?1:.75})}
      else{for(let j=0;j<8;j++)s+=RDX.R(x0+j*(sq+1),y,sq,sq,'var(--soft)',{st:'var(--c5)'});
        for(let j=8;j<16;j++)s+=RDX.R(x0+j*(sq+1),y,sq,sq,'var(--c1)',{op:fresh?1:.75});
        if(r>1&&x0+16*(sq+1)+40<w)s+=RDX.T(x0+16*(sq+1)+4,y+sq-3,'hit',{fs:10,c:'var(--good)',w:600})}
    }
    svgEl.innerHTML=RD.svg(w,h,s,'KV cache blocks of four requests with prefix caching '+mode);
    const st=state(k);let t,p;
    if(i===0){t='Four requests, one system prompt';p='Each prompt is the same 1,000-token system prompt followed by 1,000 tokens of its own. Watch what the engine computes and stores.'}
    else if(i<=4){t='Request '+i+' arrives';p=on?(i===1?'Nothing is cached yet: all 2,000 tokens are prefilled; the 1,000-token system prompt\'s full blocks are hashed and registered.':'Its first blocks hash to entries already in the table: 1,000 tokens are reused (reference count +1); only its own 1,000 tokens are prefilled. TTFT falls by about half.'):'No reuse: all 2,000 tokens are prefilled and stored, though the first 1,000 are identical to what is already in memory.'}
    else{t='After four requests';p=on?'5,000 tokens computed instead of 8,000, and 1.53 GiB stored instead of 2.44 GiB. The saving grows with the share of the prompt that repeats: agents and long multi-turn chats save most.':'8,000 prompt tokens computed and stored, 4,000 of them duplicates. Switch prefix caching on to compare.'}
    RDX.cap(cap,t,p);
    RDX.cnt(cnt,[['Prompt tokens computed',RDX.nf(st.comp)],['Prefill time',RDX.nf(st.comp*PT)+' ms'],['Tokens reused',RDX.nf(st.hit)],['KV cache stored',RDX.nf(st.held*KV,2)+' GiB']]);
  }
  const A=RD.anim({card:'rd-pc-card',ctl:'rd-pc-ctl',n:6,draw,ms:1500,label:'Prefix caching step'});
  RD.seg(document.getElementById('rd-pc-mode'),v=>{mode=v;A.reset(6);A.play()});
  RD.onResize(()=>A.redraw());
})();
