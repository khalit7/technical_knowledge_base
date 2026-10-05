// ---- Performance calculator (t-calc): inference calculator UI ----
(function(){
  const X=window.CALCX,$=id=>document.getElementById(id);
  const BS=[1,2,4,8,16,32,64,128,256,512,1024];
  const PRE={
    l8:{lab:'Llama 3.1 8B in BF16 on one H100, 4K context',o:{model:'l8',chip:'h100',chips:1,fmt:'native',kvb:2,prec:'bf16',bi:0,ctx:4096,prompt:1024,eff:1}},
    old5090:{lab:'Llama 3.1 8B in FP8 on an RTX 5090 (the old page\'s example)',o:{model:'l8',chip:'rtx5090',chips:1,fmt:'fp8',kvb:2,prec:'fp8',bi:0,ctx:512,prompt:1024,eff:1}},
    l70:{lab:'Llama 3.1 70B in BF16 on an 8x H100 server (TP 8)',o:{model:'l70',chip:'h100',chips:8,fmt:'bf16',kvb:2,prec:'bf16',bi:0,ctx:4096,prompt:4096,eff:1}},
    l70long:{lab:'70B at 128K context for 32 users: does it fit?',o:{model:'l70',chip:'h100',chips:8,fmt:'bf16',kvb:2,prec:'bf16',bi:5,ctx:131072,prompt:32768,eff:1}},
    dsv3:{lab:'DeepSeek-V3 in FP8 on 8x H200, 64 users',o:{model:'dsv3',chip:'h200',chips:8,fmt:'native',kvb:2,prec:'fp8',bi:6,ctx:4096,prompt:4096,eff:1}},
    oss:{lab:'gpt-oss-120b on one H100 (MXFP4 experts as released)',o:{model:'oss120',chip:'h100',chips:1,fmt:'native',kvb:2,prec:'bf16',bi:0,ctx:8192,prompt:1024,eff:1}},
    q235:{lab:'Qwen3 235B-A22B in NVFP4 on 4 B200s, 32K context',o:{model:'q235',chip:'b200',chips:4,fmt:'nvfp4',kvb:1,prec:'fp4',bi:4,ctx:32768,prompt:4096,eff:1}},
    m1:{lab:'Llama 3.1 8B in 4 bits on this page\'s laptop GPU (M1 Pro, measured roofline)',o:{model:'l8',chip:'m1pro',chips:1,fmt:'mxfp4',kvb:2,prec:'bf16',bi:0,ctx:2048,prompt:1024,eff:1}}};
  const CTX=[512,2048,4096,8192,32768,131072],PR=[128,1024,4096,32768];
  const PN={bf16:'BF16',fp8:'FP8',fp4:'FP4'};
  function init(){
    $('calc-ipre').innerHTML=Object.keys(PRE).map(k=>'<option value="'+k+'">'+X.esc(PRE[k].lab)+'</option>').join('')+'<option value="custom">Custom</option>';
    $('calc-imodel').innerHTML=Object.keys(X.M).map(k=>'<option value="'+k+'">'+X.esc(X.M[k].name)+'</option>').join('');
    $('calc-ichip').innerHTML=Object.keys(X.C).map(k=>'<option value="'+k+'">'+X.esc(X.C[k].name)+'</option>').join('');
    $('calc-in').innerHTML=[1,2,4,8].map(v=>'<option>'+v+'</option>').join('');
    $('calc-ictx').innerHTML=CTX.map(v=>'<option value="'+v+'">'+v.toLocaleString('en-US')+' tokens</option>').join('');
    $('calc-ipr').innerHTML=PR.map(v=>'<option value="'+v+'">'+v.toLocaleString('en-US')+' tokens</option>').join('');
    setPre('l8');
    $('calc-ipre').addEventListener('change',e=>{if(e.target.value!=='custom')setPre(e.target.value)});
    ['calc-imodel','calc-ifmt','calc-ikv','calc-ichip','calc-in','calc-iprec','calc-ictx','calc-ipr'].forEach(id=>$(id).addEventListener('change',()=>{$('calc-ipre').value='custom';if(id==='calc-ichip')precOpts();render()}));
    ['calc-ib','calc-ief'].forEach(id=>$(id).addEventListener('input',()=>{$('calc-ipre').value='custom';render()}));
    X.onRender(render);addEventListener('resize',()=>{if(!$('t-calc').hidden)render()});
  }
  function precOpts(want){const ch=X.C[$('calc-ichip').value],cur=want||$('calc-iprec').value,ks=Object.keys(ch.peak);
    $('calc-iprec').innerHTML=ks.map(k=>'<option value="'+k+'">'+PN[k]+' ('+X.sig(ch.peak[k])+' TFLOP/s)</option>').join('');$('calc-iprec').value=ks.indexOf(cur)>=0?cur:ks[0]}
  function setPre(k){const o=PRE[k].o;$('calc-ipre').value=k;$('calc-imodel').value=o.model;$('calc-ifmt').value=o.fmt;$('calc-ikv').value=o.kvb;$('calc-ichip').value=o.chip;
    precOpts(o.prec);$('calc-in').value=o.chips;$('calc-ib').value=o.bi;$('calc-ictx').value=o.ctx;$('calc-ipr').value=o.prompt;$('calc-ief').value=o.eff;render()}
  function read(){return {model:$('calc-imodel').value,chip:$('calc-ichip').value,chips:+$('calc-in').value,fmt:$('calc-ifmt').value,prec:$('calc-iprec').value,kvb:+$('calc-ikv').value,
    batch:BS[+$('calc-ib').value],ctx:+$('calc-ictx').value,eff:+$('calc-ief').value}}
  function memBar(o,r,el){
    const W=Math.max(260,el.clientWidth),H=58,cap=r.mem_have,scale=Math.max(r.mem_need,cap)*1.04,x=v=>v/scale*(W-2);
    const kvAll=r.mem_need-r.wbytes,ww=x(r.wbytes),kw=x(kvAll);
    let s='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Memory needed against capacity">';
    s+='<text x="2" y="10" font-size="11" style="fill:var(--mute)">all '+o.chips+' chip'+(o.chips>1?'s':'')+' together, to scale</text>';
    s+='<rect x="1" y="14" width="'+ww+'" height="24" style="fill:var(--c1)"/>';
    if(kw>0.3)s+='<rect x="'+(1+ww)+'" y="14" width="'+kw+'" height="24" style="fill:var(--c2)"/>';
    const xm=1+x(cap),right=xm>W*0.55;
    s+='<line x1="'+xm+'" x2="'+xm+'" y1="6" y2="46" style="stroke:var(--ink);stroke-width:2"/><text x="'+(xm+(right?-4:4))+'" y="56" font-size="11" text-anchor="'+(right?'end':'start')+'">capacity '+X.sig(cap)+' GB</text></svg>';
    el.innerHTML=s+'<div class="calc-leg"><span><i style="background:var(--c1)"></i>weights '+X.fGB(r.wbytes)+'</span><span><i style="background:var(--c2)"></i>KV cache '+X.fGB(kvAll)+' ('+o.batch+' x '+X.fGB(r.kv_seq)+')</span></div>';
  }
  function chart(o,el){
    const W=Math.max(280,el.clientWidth),H=Math.round(Math.min(330,Math.max(220,W*0.5))),m={l:52,r:10,t:12,b:34},iw=W-m.l-m.r,ih=H-m.t-m.b;
    const pts=[],free=[];let maxFit=0;
    for(let i=0;i<=60;i++){const B=Math.max(1,Math.round(Math.pow(1024,i/60)));const r=X.decode(Object.assign({},o,{batch:B}));pts.push([B,r.tps,r.bound]);
      const f=X.decode(Object.assign({},o,{batch:B,ctx:1}));free.push([B,f.tps]);if(r.fits)maxFit=B}
    const ys=pts.map(p=>p[1]).concat(free.map(p=>p[1])),y0=Math.floor(Math.log10(Math.min.apply(null,ys))),y1=Math.ceil(Math.log10(Math.max.apply(null,ys)));
    const X0=0,X1=Math.log10(1024),xp=b=>m.l+(Math.log10(b)-X0)/(X1-X0)*iw,yp=v=>m.t+ih-(Math.log10(v)-y0)/(y1-y0)*ih;
    let s='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Decode tokens per second against batch size">';
    for(let k=y0;k<=y1;k++){const y=yp(Math.pow(10,k));s+='<line x1="'+m.l+'" x2="'+(W-m.r)+'" y1="'+y+'" y2="'+y+'" style="stroke:var(--line)"/><text x="'+(m.l-4)+'" y="'+(y+4)+'" text-anchor="end" font-size="10.5" style="fill:var(--mute)">'+(k>=3?Math.pow(10,k-3)+'K':Math.pow(10,k))+'</text>'}
    [1,4,16,64,256,1024].forEach(b=>{const x=xp(b);s+='<line x1="'+x+'" x2="'+x+'" y1="'+m.t+'" y2="'+(m.t+ih)+'" style="stroke:var(--line)"/><text x="'+x+'" y="'+(H-m.b+14)+'" text-anchor="'+(b===1024?'end':'middle')+'" font-size="10.5" style="fill:var(--mute)">'+b+'</text>'});
    s+='<text x="'+(m.l+iw/2)+'" y="'+(H-4)+'" text-anchor="middle" font-size="11" style="fill:var(--mute)">batch (sequences decoded together, log scale)</text>';
    s+='<text x="12" y="'+(m.t+ih/2)+'" text-anchor="middle" font-size="11" transform="rotate(-90 12 '+(m.t+ih/2)+')" style="fill:var(--mute)">tokens/s, all sequences (log)</text>';
    if(maxFit<1024){const x=xp(Math.max(1,maxFit));s+='<rect x="'+x+'" y="'+m.t+'" width="'+(m.l+iw-x)+'" height="'+ih+'" style="fill:var(--bad);opacity:.09"/><text x="'+(m.l+iw-4)+'" y="'+(m.t+12)+'" text-anchor="end" font-size="11" style="fill:var(--bad)">'+(maxFit?'does not fit above batch '+maxFit:'does not fit at all')+'</text>'}
    s+='<polyline fill="none" style="stroke:var(--mute);stroke-width:1.5;stroke-dasharray:4 3" points="'+free.map(p=>xp(p[0])+','+yp(p[1])).join(' ')+'"/>';
    s+='<polyline fill="none" style="stroke:var(--c1);stroke-width:2.5" points="'+pts.map(p=>xp(p[0])+','+yp(p[1])).join(' ')+'"/>';
    const cb=X.crossover(o);if(cb&&cb<=1024){const x=xp(cb);s+='<line x1="'+x+'" x2="'+x+'" y1="'+m.t+'" y2="'+(m.t+ih)+'" style="stroke:var(--c4);stroke-dasharray:3 3"/><text x="'+(x-4)+'" y="'+(m.t+ih-6)+'" text-anchor="end" font-size="11" style="fill:var(--c4)">compute-bound from '+cb+'</text>'}
    const r=X.decode(o),cx=xp(o.batch),cy=yp(r.tps);
    s+='<circle cx="'+cx+'" cy="'+cy+'" r="6" style="fill:none;stroke:var(--ink);stroke-width:2"/><circle cx="'+cx+'" cy="'+cy+'" r="2.4" style="fill:var(--ink)"/>';
    s+='</svg>';el.innerHTML=s;
    $('calc-ileg').innerHTML='<span><i style="background:var(--c1)"></i>this context ('+o.ctx.toLocaleString('en-US')+' tokens per sequence)</span><span><i style="background:var(--mute)"></i>dashed: if the KV cache cost nothing (context 1)</span><span>ring: your batch</span>';
  }
  function render(){
    if($('t-calc').hidden)return;
    const o=read(),r=X.decode(o),m=X.M[o.model],ch=X.C[o.chip],pf=X.prefill({model:o.model,chip:o.chip,chips:o.chips,prec:o.prec,prompt:+$('calc-ipr').value,eff:o.eff});
    $('calc-ibv').textContent=o.batch;$('calc-iefv').textContent=Math.round(o.eff*100)+'%';
    memBar(o,r,$('calc-imem'));
    const cb=X.crossover(o);
    let out=X.stat('Memory needed',X.fGB(r.mem_need),r.fits?'<span class="calc-ok">fits</span> in '+X.sig(r.mem_have)+' GB':'<span class="calc-no">does not fit</span> in '+X.sig(r.mem_have)+' GB');
    out+=X.stat('KV cache per token',X.sig(r.kv_tok/1024)+' KiB',X.fGB(r.kv_seq)+' per sequence');
    out+=X.stat('One decode step',X.sig(r.t_ms)+' ms',r.bound+'-bound; tensor cores busy '+X.pct(r.busy));
    out+=X.stat('Tokens/s per sequence',X.sig(r.tps_seq),'aggregate '+X.sig(r.tps)+' tokens/s');
    out+=X.stat('Compute-bound from batch',cb?cb.toLocaleString('en-US'):'never (to 4,096)',cb?'needs '+X.fGB(X.decode(Object.assign({},o,{batch:cb})).mem_need)+' of memory':'the KV cache grows as fast as the batch');
    out+=X.stat('Prefill of '+(+$('calc-ipr').value).toLocaleString('en-US')+' tokens',X.fT(pf.t_ms/1e3),'compute-bound: '+X.fE(pf.flops)+' FLOPs');
    $('calc-iout').innerHTML=out;
    chart(o,$('calc-ichart'));
    let fx='<b>Decode step</b> = max(bytes / bandwidth, FLOPs / peak) = max('+X.fGB(r.bytes/1e9)+' / '+X.sig(ch.bw*o.chips*o.eff/1000)+' TB/s, '+X.fE(r.flops)+' / '+X.sig(ch.peak[o.prec]*o.chips*o.eff)+' TFLOP/s) = max('+X.sig(r.t_mem_ms)+', '+X.sig(r.t_cmp_ms)+') ms. ';
    fx+='Bytes = weights read '+X.fGB(r.wread)+' + KV read '+X.fGB(r.kvread)+'. ';
    if(m.E)fx+='MoE: each token uses '+m.k+' of '+m.E+' experts per layer, so a step reads only the experts some token in the batch picked: E(1 &#8722; (1 &#8722; k/E)<sup>B</sup>) = '+X.sig(X.touched(m,o.batch),3)+' per layer at batch '+o.batch+' (uniform routing assumed). ';
    fx+='KV per token = '+(o.model==='dsv3'?'(512 latent + 64 rope) x 61 layers':'2 (K and V) x '+(m.kv_full+m.kv_slide)+' layers x '+m.nkv+' KV heads x '+m.hd+' head size')+' x '+o.kvb+' B'+(m.kv_slide?'; the '+m.kv_slide+' sliding-window layers keep only the last '+m.window+' tokens':'')+'. ';
    fx+='Weights: '+X.esc(o.fmt==='native'?m.fmt_note:$('calc-ifmt').selectedOptions[0].text)+'. ';
    if(o.chips>1)fx+='Split over '+o.chips+' chips with tensor parallelism, as if perfectly (the all-reduces between them are not counted). ';
    if(o.chip==='m1pro')fx+='M1 Pro figures are the <a href="#" data-calcgo="t-roof">Roofline lab</a>\'s measurements (about 5.0 TFLOP/s and 165 GB/s), not vendor specs. ';
    fx+='Model shape from <a href="'+m.src+'" target="_blank" rel="noopener noreferrer">config.json</a>. Real servers reach some fraction of these ceilings: set the efficiency slider.';
    $('calc-ifx').innerHTML=fx;
    const a=$('calc-ifx').querySelector('[data-calcgo]');if(a)a.addEventListener('click',e=>{e.preventDefault();const b=document.querySelector('#tabs button[data-t="t-roof"]');if(b)b.click()});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
