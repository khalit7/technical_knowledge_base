// Memory wall tab: the root's window.CC applied to real configs, with design levers applied to a copy of the
// normalised layer list. The defaults (all levers "as in the config") reproduce the root calc.py's cache numbers
// (checked in the "Defaults reproduce" line and by src/wall/check_wall.mjs).
(function(){
  if(!window.CC||!window.WLD||!LC.$('wl-model'))return;
  const $=LC.$,D=WLD.models,BYTE_UTIL=0.92;
  const sel=$('wl-model');D.forEach((m,i)=>{const o=document.createElement('option');o.value=i;o.textContent=m.label;sel.appendChild(o)});
  sel.value=String(D.findIndex(m=>m.key==='llama-3.1-70b'));
  const BATCH=[1,2,4,8,16,32,64,128,256];
  const specs=D.map(m=>CC.normalise(m.cfg));
  const params=specs.map(s=>CC.params(s));
  // apply levers to a deep copy of the layer list
  function redesign(spec,lv){
    const s=Object.assign({},spec);let attnIdx=0;
    s.layers=spec.layers.map(l=>{const n=Object.assign({},l);
      for(const key of ['mix','mix2']){const m=l[key];if(!m||m.t!=='attn')continue;const c=Object.assign({},m);
        if(lv.kvh==='mha')c.nkv=c.nh;else if(lv.kvh==='1')c.nkv=1;
        if(lv.lay==='global')c.win=0;
        else if(lv.lay==='all')c.win=lv.win;
        else if(lv.lay!=='cfg'){const k=+lv.lay;c.win=((attnIdx+1)%(k+1)===0)?0:lv.win}
        attnIdx++;n[key]=c}
      return n});
    return s;
  }
  function levers(){return {kvh:$('wl-kvh').value,lay:$('wl-lay').value,win:+$('wl-win').value,kdt:+$('wl-kdt').value,keep:+$('wl-keep').value}}
  const AS={kvh:'cfg',lay:'cfg',win:1024,kdt:2,keep:1};
  function perSeq(spec,ctx,lv){const c=CC.cache(spec,ctx,lv.kdt,4);return {kv:c.kv*lv.keep,state:c.state,total:c.kv*lv.keep+c.state}}
  function free(i){const cap=+$('wl-gpu').value*1e9*(+$('wl-ngpu').value)*BYTE_UTIL;return {cap,w:params[i].total*(+$('wl-wdt').value)}}
  function maxSeq(spec,i,ctx,lv){const f=free(i);const room=f.cap-f.w;if(room<=0)return 0;return Math.floor(room/perSeq(spec,ctx,lv).total)}
  function maxCtx(spec,i,B,lv){const f=free(i);const room=f.cap-f.w;if(room<=0)return 0;
    if(perSeq(spec,1,lv).total*B>room)return 0;let lo=1,hi=1<<24;
    if(perSeq(spec,hi,lv).total*B<=room)return Infinity;
    while(hi-lo>1){const mid=(lo+hi)>>1;if(perSeq(spec,mid,lv).total*B<=room)lo=mid;else hi=mid}return lo}
  const ctxOf=()=>2**(+$('wl-ctx').value),bOf=()=>BATCH[+$('wl-b').value];
  const kfmt=n=>n>=1048576?(n/1048576)+'M':n>=1024?(n/1024)+'K':String(n);
  function hasAttn(spec){return spec.layers.some(l=>l.mix&&l.mix.t==='attn')}
  function draw(){
    const i=+sel.value,m=D[i],base=specs[i],lv=levers(),s=redesign(base,lv),ctx=ctxOf(),B=bOf();
    $('wl-ctxv').textContent=kfmt(ctx)+' tokens';$('wl-bv').textContent=B;
    const nAttn=base.layers.filter(l=>l.mix&&l.mix.t==='attn').length,nMla=base.layers.filter(l=>l.mix&&l.mix.t==='mla').length;
    const nWin=base.layers.filter(l=>l.mix&&l.mix.t==='attn'&&l.mix.win).length,nRec=base.layers.length-nAttn-nMla;
    const a0=base.layers.find(l=>l.mix&&l.mix.t==='attn');
    $('wl-mnote').innerHTML=LC.esc(m.label)+' ('+LC.esc(m.repo)+', config revision '+m.rev+'): '+base.layers.length+' layers, '+
      (nAttn?nAttn+' attention'+(a0?' ('+a0.mix.nh+' query heads, '+a0.mix.nkv+' KV heads of '+a0.mix.hd+')':'')+(nWin?', '+nWin+' of them windowed':''):'')+
      (nMla?nMla+' MLA (latent '+base.layers.find(l=>l.mix&&l.mix.t==='mla').mix.kvl+' + RoPE key)':'')+(nRec?', '+nRec+' recurrent':'')+
      '; '+LC.fmt(params[i].total/1e9,1)+'B parameters (all experts count for memory).';
    const notes=[];
    if(!hasAttn(base))notes.push('This model has no standard attention layers: the KV-head and layout levers do not apply (MLA caches a latent; see the DeepSeek MLA explainer).');
    if(lv.keep<1)notes.push('Eviction at '+(lv.keep*100)+'% is the algorithmic saving: it assumes freed entries are reclaimed and that quality holds, which the Eviction lab tests.');
    if(lv.kvh!=='cfg')notes.push('Changing KV heads would also change the K and V projection weights (a few percent of parameters), ignored here, and needs retraining (or uptraining, as in the GQA paper).');
    if(lv.lay!=='cfg'&&lv.lay!=='global')notes.push('A local/global layout is a training-time choice: imposing it on a trained full-attention model loses quality (Eviction lab, local/global policy).');
    $('wl-lnote').textContent=notes.filter(Boolean).join(' ');
    const f=free(i),before=perSeq(base,ctx,AS),after=perSeq(s,ctx,lv);
    // bars: before and after, weights + B x cache, against usable capacity
    const W=LC.width($('wl-bars')),pad=8,bw=W-2*pad,h=34;
    const tot=Math.max(f.cap,f.w+B*before.total,f.w+B*after.total);const X=v=>pad+bw*v/tot;
    let b='';
    [['as in the config',before,0],['with the levers',after,1]].forEach(([nm,ps,k])=>{const y=18+k*(h+30);
      b+=LC.t(pad,y-5,nm+': weights '+LC.gb(f.w)+' + '+B+' x '+LC.gb(ps.total)+' = '+LC.gb(f.w+B*ps.total),{fs:12});
      b+='<rect x="'+X(0)+'" y="'+y+'" width="'+(X(f.w)-X(0))+'" height="'+h+'" fill="var(--c2)" opacity=".85"/>';
      const kvw=X(f.w+B*ps.kv)-X(f.w);b+='<rect x="'+X(f.w)+'" y="'+y+'" width="'+Math.max(0,kvw)+'" height="'+h+'" fill="var(--acc)" opacity=".85"/>';
      if(ps.state)b+='<rect x="'+X(f.w+B*ps.kv)+'" y="'+y+'" width="'+Math.max(0,X(f.w+B*ps.total)-X(f.w+B*ps.kv))+'" height="'+h+'" fill="var(--c6)"/>';});
    const cx=X(f.cap);b+='<line x1="'+cx+'" x2="'+cx+'" y1="10" y2="'+(18+2*h+40)+'" stroke="var(--bad)" stroke-width="2" stroke-dasharray="4 3"/>';
    b+=LC.t(Math.min(cx,W-4),18+2*h+52,'usable '+LC.gb(f.cap),{fs:11,a:cx>W-80?'end':'middle',fill:'var(--bad)'});
    $('wl-bars').innerHTML=LC.svg(W,18+2*h+58,b,'Memory before and after the levers')+
      '<div class="wl-leg"><span style="color:var(--c2)">weights</span><span style="color:var(--acc)">KV cache</span>'+(after.state||before.state?'<span style="color:var(--c6)">recurrent state</span>':'')+'<span class="d" style="color:var(--bad)">usable memory</span></div>';
    const ms0=maxSeq(base,i,ctx,AS),ms1=maxSeq(s,i,ctx,lv),mc0=maxCtx(base,i,B,AS),mc1=maxCtx(s,i,B,lv);
    const cf=x=>x===Infinity?'over 16M':x?LC.int(x):'none';
    $('wl-stats').innerHTML=[
      ['Cache per token at this context',LC.bytes(before.kv/ctx)+' &rarr; '+LC.bytes(after.kv/ctx),'average over the context (windowed layers credited)'],
      ['Cache per sequence',LC.gb(before.total)+' &rarr; '+LC.gb(after.total),'at '+kfmt(ctx)+' tokens'],
      ['Sequences that fit',LC.int(ms0)+' &rarr; '+LC.int(ms1),'at '+kfmt(ctx)+' tokens'],
      ['Longest context at '+B+' sequences',cf(mc0)+' &rarr; '+cf(mc1),'tokens'],
      ['Change in cache',before.total?LC.fmt(before.total/Math.max(after.total,1e-9),1)+'x smaller':'-','before / after']
    ].map(r=>'<div class="stat"><div class="k">'+r[0]+'</div><div class="v">'+r[1]+'</div><div class="d">'+r[2]+'</div></div>').join('');
    // wall chart: max sequences vs context (log-log)
    const CW=LC.width($('wl-chart')),CH=Math.round(Math.min(300,Math.max(210,CW*0.5))),L=40,R=12,T=22,Bm=32;
    const xs=[];for(let e=10;e<=20;e+=0.25)xs.push(2**e);
    const y0=xs.map(c=>maxSeq(base,i,c,AS)),y1=xs.map(c=>maxSeq(s,i,c,lv));
    const ymax=Math.max(1,...y0,...y1);const lgmax=Math.ceil(Math.log10(ymax));
    const px=c=>L+(CW-L-R)*(Math.log2(c)-10)/10,py=v=>v<1?CH-Bm:T+(CH-Bm-T)*(1-Math.log10(v)/Math.max(1,lgmax));
    let g='';for(let k=0;k<=lgmax;k++){const y=py(10**k);g+='<line x1="'+L+'" x2="'+(CW-R)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/>'+LC.t(L-4,y+4,LC.cnt(10**k),{a:'end',fs:11})}
    const tick=CW<520?[10,12,14,16,18,20]:[10,11,12,13,14,15,16,17,18,19,20];
    tick.forEach(e=>{g+=LC.t(px(2**e),CH-Bm+15,kfmt(2**e),{a:'middle',fs:11})});
    g+=LC.t(L,CH-3,'context (tokens, log scale)',{fs:11,fill:'var(--mute)'});
    const path=(ys,st)=>'<path d="'+ys.map((v,k)=>(k?'L':'M')+px(xs[k]).toFixed(1)+' '+py(v).toFixed(1)).join('')+'" fill="none" '+st+'/>';
    g+=path(y0,'stroke="var(--mute)" stroke-width="2" stroke-dasharray="5 4"')+path(y1,'stroke="var(--acc)" stroke-width="2.5"');
    g+='<line x1="'+px(ctx)+'" x2="'+px(ctx)+'" y1="'+T+'" y2="'+(CH-Bm)+'" stroke="var(--c4)" stroke-width="1.5"/>';
    g+='<circle cx="'+px(ctx)+'" cy="'+py(ms1)+'" r="4" fill="var(--acc)"/>';
    g+=LC.t(4,12,'sequences that fit (log scale)',{fs:11,fill:'var(--mute)'});
    $('wl-chart').innerHTML=LC.svg(CW,CH,g,'Sequences that fit against context');
    // compute wall
    const p0=CC.flops(base,ctx),p1=CC.flops(s,ctx);
    const share=p=>p.prefill_attn/p.prefill;
    $('wl-flops').innerHTML=[
      ['Attention share of prefill FLOPs',LC.fmt(100*share(p0),1)+'% &rarr; '+LC.fmt(100*share(p1),1)+'%','prompt of '+kfmt(ctx)+' tokens'],
      ['Prefill FLOPs for the prompt',LC.fmt(p0.prefill*ctx/1e15,2)+' &rarr; '+LC.fmt(p1.prefill*ctx/1e15,2)+' PFLOP','forward pass'],
      ['Decode FLOPs per token at the end',LC.fmt(p0.decode/1e9,1)+' &rarr; '+LC.fmt(p1.decode/1e9,1)+' GFLOP','weights plus attention over the cache']
    ].map(r=>'<div class="stat"><div class="k">'+r[0]+'</div><div class="v">'+r[1]+'</div><div class="d">'+r[2]+'</div></div>').join('');
    $('wl-fnote').textContent='Fewer KV heads, a smaller dtype and eviction leave these FLOPs unchanged in this count: attention FLOPs depend on the number of query heads and the positions each reads, not on how the cache is stored (eviction does shorten what decode reads, ignored here). Only windows cut them. Memory and compute are different walls.';
    // defaults reproduce the root calc.py
    const chk=['4096','32768','131072'].map(c=>CC.cache(base,+c,2,4).total===m.ref[c].total);
    $('wl-check').innerHTML='<b>Defaults reproduce the root\'s calc.py</b> <span class="der">by construction</span>: with every lever "as in the config", the cache of '+LC.esc(m.label)+' at 4K, 32K and 128K tokens (bf16) is '+
      ['4096','32768','131072'].map(c=>LC.gb(m.ref[c].total)).join(', ')+', '+(chk.every(Boolean)?'equal to':'<b>different from</b>')+' the Python reference (src/calc/out/py_results.json). The same code, so this checks the wiring, not the formula; the formula is checked against 44 Hub parameter counts on the root\'s Config calculator.';
  }
  ['wl-model','wl-gpu','wl-ngpu','wl-wdt','wl-kvh','wl-lay','wl-win','wl-kdt','wl-keep'].forEach(id=>$(id).addEventListener('change',draw));
  ['wl-ctx','wl-b'].forEach(id=>$(id).addEventListener('input',draw));
  const pr=$('wl-pr1');if(pr)pr.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{pr.classList.add('done');pr.querySelectorAll('.opts button').forEach(x=>x.classList.add(x.dataset.ok?'right':'wrong'))}));
  LC.onTab('t-wall',draw);LC.onResize($('t-wall'),draw);draw();
  window.WL={specs,params,redesign,perSeq,maxSeq,maxCtx,draw};
})();
