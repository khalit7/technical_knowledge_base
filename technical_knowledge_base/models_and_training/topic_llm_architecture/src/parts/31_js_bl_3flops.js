// Block lab section 4: where the FLOPs of one token go, by operation, against context length.
// Weight FLOPs and the attention term come from window.CC (the Config calculator's port of src/calc/calc.py);
// this file only splits CC's weight FLOPs by operation and checks that the split sums back to CC's total.
(function(){
  const B=window.BL;if(!B||!B.$('bl-fl'))return;
  const $=B.$;let ready=false,model='tiny',mode='decode',lc=8;
  const OPS=[['proj','attention projections (Q, K, V, O)','--c1'],['ctx','attention over the context (q·k and weighted V)','--c2'],
    ['ffn','feed-forward (active experts only for MoE)','--c3'],['head','unembedding (LM head)','--c4'],['ssm','SSM or linear-attention layers','--c5']];
  function split(s){const d=s.d;let proj=0,ffn=0,ssm=0;
    for(const lay of s.layers){for(const key of ['mix','mix2']){const m=lay[key];if(!m)continue;
        if(m.t==='attn')proj+=d*m.nh*m.hd*(m.gate?2:1)+2*d*m.nkv*m.hd+m.nh*m.hdv*d;
        else if(m.t==='mla')proj+=window.CC.mixerParams(m,d)[0];
        else ssm+=window.CC.mixerParams(m,d)[0]}
      const f=window.CC.ffnParams(lay.ffn,d);ffn+=f.dense+f.shared+f.router;if(lay.ffn&&lay.ffn.t==='moe')ffn+=3*d*lay.ffn.ff*lay.ffn.k}
    return {proj:2*proj,ffn:2*ffn,ssmw:2*ssm,head:2*s.V*d}}
  function at(s,ctx,sp){const f=window.CC.flops(s,ctx);const a=mode==='decode'?f.decode_attn:f.prefill_attn;
    const o={proj:sp.proj,ctx:a,ffn:sp.ffn,head:sp.head,ssm:sp.ssmw+f.state};o.total=o.proj+o.ctx+o.ffn+o.head+o.ssm;o.weights=f.weights;return o}
  function cross(s,sp){let lo=1,hi=1<<26;const g=c=>at(s,c,sp);if(g(hi).ctx<g(hi).weights)return null;
    while(hi-lo>1){const m=Math.floor((lo+hi)/2);if(g(m).ctx>=g(m).weights)hi=m;else lo=m}return hi}
  function maxctx(){if(model==='tiny')return B.D.trace.config.ctx;const m=window.CCD.models.find(x=>x.key===model);const c=m.cfg.text_config||m.cfg;return c.max_position_embeddings||c.n_positions||c.max_seq_len||Infinity}
  function draw(){if(!ready)return;
    const s=B.spec(model),sp=split(s),ctx=Math.round(Math.pow(2,lc)),r=at(s,ctx,sp);
    const ok=Math.abs(sp.proj+sp.ffn+sp.ssmw+sp.head-r.weights)<1;
    $('bl-fl-ctx').textContent=B.comma(ctx);
    const el=$('bl-fl-bar'),w=B.W(el);let x=0,svg='';
    OPS.forEach(([k,,c])=>{const f=r[k]/r.total;if(f<=0)return;svg+='<rect x="'+(x*w).toFixed(1)+'" y="0" width="'+Math.max(0.5,f*w).toFixed(1)+'" height="26" fill="var('+c+')" fill-opacity=".85"/>';x+=f});
    el.innerHTML='<svg viewBox="0 0 '+w+' 26" width="'+w+'" height="26" role="img" aria-label="FLOPs by operation">'+svg+'</svg>';
    $('bl-fl-leg').innerHTML=OPS.filter(o=>r[o[0]]>0).map(([k,n,c])=>'<div><i style="background:var('+c+')"></i><span class="n">'+n+'</span><span class="v">'+B.fmt(r[k])+' ('+(r[k]/r.total*100).toFixed(1)+'%)</span></div>').join('');
    const cx=cross(s,sp);
    const p=window.CC.params(s);
    $('bl-fl-stats').innerHTML=[
      ['forward FLOPs per token',B.fmt(r.total),(mode==='decode'?'decoding the token at position '+B.comma(ctx):'average over a '+B.comma(ctx)+'-token prefill (causal)')+(ctx>maxctx()?'; past this model\u2019s '+B.comma(maxctx())+'-token context (arithmetic only)':'')],
      ['2N (weights only)',B.fmt(r.weights),'N = '+B.fmt(p.matmul_active)+' matrix weights touched per token'],
      ['attention over the context',B.fmt(r.ctx),r.ctx<=r.weights?(r.ctx/r.weights*100).toFixed(1)+'% of 2N':(r.ctx/r.weights).toFixed(r.ctx<10*r.weights?2:0)+' x 2N'],
      ['training step per token',B.fmt(3*r.total),'3x forward (backward is 2x); "6N" when attention is small'],
      ['attention = weights at',cx?B.comma(cx)+' tokens':'never',cx?(mode==='decode'?'decode position':'prefill length')+' where the attention term reaches 2N':'every attention layer has a window or the model has no full attention']
    ].map(q=>'<div class="stat"><div class="k">'+q[0]+'</div><div class="v">'+q[1]+'</div><div class="d">'+q[2]+'</div></div>').join('');
    $('bl-fl-chk').textContent=ok?'Check: the split sums to the Config calculator’s 2N for this model (window.CC).':'Check failed: split and Config calculator differ.';
    // share against context (stacked area, log x)
    const ch=$('bl-fl-chart'),cw=B.W(ch),H=200,ml=34,mr=8,mt=8,mb=30,pw=cw-ml-mr,ph=H-mt-mb;
    const xs=[];for(let e=7;e<=20.001;e+=0.125)xs.push(e);
    const X=e=>ml+(e-7)/13*pw,Y=f=>mt+ph*(1-f);
    let g='';for(let f=0;f<=1.001;f+=0.25)g+='<line x1="'+ml+'" x2="'+(ml+pw)+'" y1="'+Y(f)+'" y2="'+Y(f)+'" stroke="var(--line)"/><text x="'+(ml-4)+'" y="'+(Y(f)+4)+'" font-size="11" text-anchor="end" fill="var(--mute)">'+Math.round(f*100)+'%</text>';
    const ticks=cw<520?[7,10,13,16,20]:[7,9,11,13,15,17,20];
    ticks.forEach(e=>{const v=Math.pow(2,e);g+='<text x="'+X(e)+'" y="'+(H-14)+'" font-size="11" text-anchor="middle" fill="var(--mute)">'+(v>=1048576?'1M':v>=1024?(v/1024)+'k':v)+'</text>'});
    g+='<text x="'+(ml+pw/2)+'" y="'+(H-1)+'" font-size="11" text-anchor="middle" fill="var(--mute)">context (tokens, log scale)</text>';
    const rows=xs.map(e=>at(s,Math.round(Math.pow(2,e)),sp));
    let base=xs.map(()=>0);
    OPS.forEach(([k,,c])=>{if(rows.every(q=>q[k]===0))return;const top=rows.map((q,i)=>base[i]+q[k]/q.total);
      const pts=xs.map((e,i)=>X(e).toFixed(1)+','+Y(top[i]).toFixed(1)).join(' ')+' '+xs.slice().reverse().map((e,i)=>X(e).toFixed(1)+','+Y(base[xs.length-1-i]).toFixed(1)).join(' ');
      g+='<polygon points="'+pts+'" fill="var('+c+')" fill-opacity=".7"/>';base=top});
    g+='<line x1="'+X(lc)+'" x2="'+X(lc)+'" y1="'+mt+'" y2="'+(mt+ph)+'" stroke="var(--ink)" stroke-width="1.5"/>';
    if(cx){const e=Math.log2(cx);if(e<=20)g+='<line x1="'+X(e)+'" x2="'+X(e)+'" y1="'+mt+'" y2="'+(mt+ph)+'" stroke="var(--ink)" stroke-dasharray="4 3"/><text x="'+(X(e)+(X(e)>cw-90?-4:4))+'" y="'+(mt+12)+'" font-size="11"'+(X(e)>cw-90?' text-anchor="end"':'')+' fill="var(--ink)">attention = 2N</text>'}
    ch.innerHTML='<svg viewBox="0 0 '+cw+' '+H+'" width="'+cw+'" height="'+H+'" role="img" aria-label="Share of FLOPs by operation against context">'+g+'</svg>';
  }
  function build(){if(ready||!window.CC||!window.CCD)return;ready=true;
    const sel=$('bl-fl-model');const ms=[{key:'tiny',label:'Tiny GPT (running example)'}].concat(window.CCD.models.map(m=>({key:m.key,label:m.label})));
    sel.innerHTML=ms.map(m=>'<option value="'+m.key+'">'+B.esc(m.label)+'</option>').join('');
    sel.addEventListener('change',e=>{model=e.target.value;if(model!=='tiny'&&lc===8){lc=13;$('bl-fl-slider').value=13}draw()});
    $('bl-fl-slider').addEventListener('input',e=>{lc=+e.target.value;draw()});
    B.seg($('bl-fl-mode'),m=>{mode=m;draw()});
  }
  B.onRender(()=>{build();draw()});
  B.onResize(draw);
})();
