// ---- Part 3 Reading tab: the repo map, the GGUF file map, the stride views, the graph trace, the chunk animation, threads and kernel counts ----
(function(){
  const X=window.CLX,CL=X.CL,TAB='t-cl-read',esc=X.esc,fmt=X.fmt;
  if(!document.getElementById(TAB)||!CL.v)return;
  const LANGC={'C++':'--c1','C':'--c2','C/C++ header':'--c5','CUDA':'--c3','Metal':'--c4','Objective-C':'--c4','Python':'--c6'};
  const lc=l=>X.css(LANGC[l]||'--dim');
  const svgEl=(w,h,body,lab)=>'<svg viewBox="0 0 '+w+' '+h+'" width="100%" height="'+h+'" role="img" aria-label="'+esc(lab||'')+'" preserveAspectRatio="none">'+body+'</svg>';

  // 1. repository map: one stacked bar per area
  function drawMap(){const el=document.getElementById('cl-map');if(!el)return;const W=X.width(el);
    const areas=CL.repo.slice().sort((a,b)=>b.total-a.total),max=areas[0].total;const rowH=34;let b='';
    const order=['C++','C','C/C++ header','CUDA','Metal','Objective-C','Python'];
    areas.forEach((a,i)=>{const y=i*rowH;b+='<text x="0" y="'+(y+11)+'" font-size="11.5" fill="'+X.css('--ink')+'">'+esc(a.area)+' <tspan fill="'+X.css('--mute')+'">'+fmt(a.total,0)+'</tspan></text>';
      let x=0;const langs=Object.keys(a.lines).sort((p,q)=>{const ip=order.indexOf(p),iq=order.indexOf(q);return (ip<0?99:ip)-(iq<0?99:iq)});
      langs.forEach(l=>{const w=a.lines[l]/max*(W-4);b+='<rect data-a="'+i+'" data-l="'+esc(l)+'" x="'+x.toFixed(1)+'" y="'+(y+15)+'" width="'+Math.max(.5,w).toFixed(1)+'" height="12" fill="'+lc(l)+'"><title>'+esc(a.area+': '+l+' '+fmt(a.lines[l],0)+' lines')+'</title></rect>';x+=w})});
    el.innerHTML=svgEl(W,areas.length*rowH,b,'Lines of code per area');
    const leg=document.getElementById('cl-mapleg');if(leg)leg.innerHTML=['C++','C','C/C++ header','CUDA','Metal','Python'].map(l=>'<span><i style="background:'+lc(l)+'"></i>'+(l==='Metal'?'Metal, Objective-C':l)+'</span>').join('')+'<span><i style="background:'+X.css('--dim')+'"></i>other (OpenCL, GLSL, WGSL)</span>';
    el.onclick=el.onmousemove=e=>{const r=e.target.closest('rect');if(!r)return;const a=areas[+r.dataset.a];
      document.getElementById('cl-maptip').innerHTML='<b>'+esc(a.area)+'</b>: '+Object.entries(a.lines).sort((p,q)=>q[1]-p[1]).map(([l,n])=>esc(l)+' '+fmt(n,0)+' lines in '+fmt(a.files[l],0)+' files').join('; ')}}

  // 2. the GGUF file to scale, grouped into header, embedding, layers, output norm
  function drawFile(){const el=document.getElementById('cl-gguf');if(!el)return;const W=X.width(el),v=CL.v,tot=v.model_bytes;
    const segs=[{n:'header (metadata, tokenizer)',a:0,b:v.hdr_end,c:'--c2'},{n:'padding to 32 bytes',a:v.hdr_end,b:v.data_start,c:'--dim'}];
    let cur=null;CL.fmap.forEach(([name,off,sz])=>{const g=name.startsWith('blk.')?name.split('.').slice(0,2).join('.'):name;
      if(cur&&cur.g===g){cur.b=v.data_start+off+sz;cur.k++}else{cur={g,n:g,a:v.data_start+off,b:v.data_start+off+sz,k:1,c:g==='token_embd.weight'?'--c1':g.startsWith('blk.')?(segs.length%2?'--c3':'--c6'):'--c4'};segs.push(cur)}});
    const h=26;let b='';segs.forEach((s,i)=>{const x=s.a/tot*W,w=Math.max(s.b-s.a>0?.6:0,(s.b-s.a)/tot*W);b+='<rect data-i="'+i+'" x="'+x.toFixed(2)+'" y="0" width="'+w.toFixed(2)+'" height="'+h+'" fill="'+X.css(s.c)+'" stroke="'+X.css('--bg')+'" stroke-width=".3"><title>'+esc(s.n)+'</title></rect>'});
    b+='<text x="2" y="'+(h+13)+'" font-size="11" fill="'+X.css('--mute')+'">byte 0</text><text x="'+(W-2)+'" y="'+(h+13)+'" font-size="11" text-anchor="end" fill="'+X.css('--mute')+'">'+fmt(tot,0)+'</text>';
    el.innerHTML=svgEl(W,h+18,b,'GGUF file map');
    el.onclick=el.onmousemove=e=>{const r=e.target.closest('rect');if(!r)return;const s=segs[+r.dataset.i];
      document.getElementById('cl-gguftip').innerHTML='<b>'+esc(s.n)+'</b>'+(s.k?' ('+s.k+' tensors)':'')+': bytes '+fmt(s.a,0)+' to '+fmt(s.b,0)+', '+fmt(s.b-s.a,0)+' bytes ('+fmt((s.b-s.a)/tot*100,2)+'% of the file)'}}

  // 3. strides: cache_k_l0 (F16) as stored, per head, transposed; a 6 x 4 corner of the grid shows memory order
  const VIEWS={
    base:{ne:[192,256],nb:[2,384],cap:'As stored: <code>ne = {192, 256}</code>, <code>nb = {2, 384}</code>. Step along <code>ne[0]</code> and you move 2 bytes (one F16); step to the next position and you move 192 &times; 2 = 384 bytes. Numbers in the cells are byte offsets from <code>data</code>.'},
    heads:{ne:[64,3,256],nb:[2,128,384],cap:'Per head (<code>get_k</code>, section 11): <code>ne = {64, 3, 256}</code>, <code>nb = {2, 128, 384}</code>. Same bytes, same <code>data</code> pointer; the 192 numbers of a position are read as 3 heads of 64. The grid shows head 0 and head 1 of position 0: head 1 starts at byte 128.'},
    tr:{ne:[256,192],nb:[384,2],cap:'Transposed (<code>ggml_transpose</code>): sizes and strides swapped, <code>ne = {256, 192}</code>, <code>nb = {384, 2}</code>. Still the same bytes; walking along <code>ne[0]</code> now jumps 384 bytes per step, so this view is not contiguous and a kernel reading it gets no help from the cache line it just loaded (Part 2).'}};
  function drawStrides(m){const el=document.getElementById('cl-strd-svg');if(!el)return;const V=VIEWS[m],W=X.width(el);
    const cols=Math.min(8,Math.max(4,Math.floor((W-60)/56))),rows=m==='heads'?6:4;const cw=Math.min(64,(W-60)/cols),ch=26;let b='';
    b+='<text x="0" y="12" font-size="11" fill="'+X.css('--mute')+'">i1 ↓  i0 →</text>';
    for(let r=0;r<rows;r++){for(let c=0;c<cols;c++){let off,lab;
      if(m==='heads'){const head=r<3?0:1;off=c*V.nb[0]+head*V.nb[1]+(r%3)*V.nb[2];lab=off}
      else{off=c*V.nb[0]+r*V.nb[1];lab=off}
      const x=48+c*cw,y=20+r*ch;
      b+='<rect x="'+x+'" y="'+y+'" width="'+(cw-3)+'" height="'+(ch-3)+'" rx="3" fill="'+X.css(m==='heads'?(r<3?'--acc2':'--closed2'):(c===0&&r===0?'--hl':'--soft'))+'" stroke="'+X.css('--line')+'"></rect>'+
        '<text x="'+(x+(cw-3)/2)+'" y="'+(y+16)+'" font-size="11" text-anchor="middle" fill="'+X.css('--ink')+'">'+lab+'</text>'}
      b+='<text x="40" y="'+(20+r*ch+16)+'" font-size="10.5" text-anchor="end" fill="'+X.css('--mute')+'">'+(m==='heads'?('h'+(r<3?0:1)+' p'+(r%3)):('i1='+r))+'</text>'}
    el.innerHTML=svgEl(Math.max(W,48+cols*cw),20+rows*ch,b,'Byte offsets under a view');
    document.getElementById('cl-strd-cap').innerHTML=V.cap+(m==='heads'?' Rows h0 p0 to p2 are head 0 at positions 0 to 2 (each position starts 384 bytes later); rows h1 are head 1.':'')}

  // 4. the graph of one token
  function shp(a){return '{'+a.join(', ')+'}'}
  function drawTrace(m){const t=document.getElementById('cl-trace-t'),cap=document.getElementById('cl-trace-cap');if(!t)return;const T=CL.trace;
    if(m==='hist'){t.innerHTML='<table class="cl-t"><thead><tr><th>Operation</th><th class="num">Nodes</th></tr></thead><tbody>'+T.hist.map(([o,n])=>'<tr><td><code>'+esc(o)+'</code></td><td class="num">'+n+'</td></tr>').join('')+'</tbody></table>';
      cap.innerHTML='All '+CL.v.nodes+' nodes of the graph for one token. VIEW, RESHAPE and PERMUTE change only sizes and strides and are skipped by the CPU backend; '+CL.v.real_ops+' do work.';return}
    const rows=T[m];t.innerHTML='<table class="cl-t"><thead><tr><th>#</th><th>Node</th><th>Operation</th><th>Inputs</th><th>Result</th></tr></thead><tbody>'+rows.map((n,i)=>'<tr><td>'+(i+1)+'</td><td><code>'+esc(n[0])+'</code></td><td><code>'+esc(n[2])+'</code> <span class="mute small">'+esc(n[1])+'</span></td><td class="small">'+n[3].map(s=>'<code>'+esc(s[0])+'</code> '+shp(s[1])).join('<br>')+'</td><td><code>'+shp(n[4])+'</code></td></tr>').join('')+'</tbody></table>';
    cap.innerHTML={head:'The token id goes in; GET_ROWS fetches its row of the embedding table (576 numbers). Two extra input nodes belong to a mixed token/embedding input path that this model does not use.',layer0:'One transformer layer, '+rows.length+' nodes, in the order the CPU computed them (real output of <code>llama-eval-callback</code>).',tail:'The last layer: GET_ROWS keeps only the rows whose logits were asked for (here the single token), then the final norm and the output projection to 49,152 logits.'}[m]}

  // 5. chunk animation: 4 threads, 16 chunks (or 4 fixed shares), thread 3 runs at half speed
  const CH={dyn:null,static:null};
  function simulate(mode){const nth=4,speed=[1,1,1,0.5];const ev=[];// {t,thread,chunk,start,end}
    if(mode==='static'){for(let i=0;i<nth;i++){const d=4/speed[i];ev.push({th:i,ch:i,s:0,e:d,w:4})}}
    else{const t=[0,0,0,0];let next=nth;const q=[0,1,2,3];// first chunk = ith
      const take=[];for(let i=0;i<nth;i++){const d=1/speed[i];ev.push({th:i,ch:i,s:0,e:d,w:1});t[i]=d}
      while(next<16){let i=0;for(let k=1;k<nth;k++)if(t[k]<t[i])i=k;const d=1/speed[i];ev.push({th:i,ch:next,s:t[i],e:t[i]+d,w:1});t[i]+=d;next++}}
    const end=Math.max(...ev.map(e=>e.e));return {ev,end}}
  let chkMode='dyn',chkAnim=null,chkSim=simulate('dyn');
  function stepsFor(sim){const ts=[...new Set([0].concat(sim.ev.map(e=>e.s),sim.ev.map(e=>e.e)))].sort((a,b)=>a-b);return ts}
  function drawChk(i){const el=document.getElementById('cl-chk-svg');if(!el)return;const W=X.width(el),sim=chkSim,ts=stepsFor(sim),now=ts[Math.min(i,ts.length-1)];
    const L=98,R=10,top=8,rowH=30,maxT=8.5,sx=(W-L-R)/maxT;let b='';
    for(let th=0;th<4;th++){const y=top+th*rowH;b+='<text x="0" y="'+(y+18)+'" font-size="11.5" fill="'+X.css('--ink')+'">thread '+th+(th===3?' (slow)':'')+'</text><rect x="'+L+'" y="'+y+'" width="'+(W-L-R)+'" height="'+(rowH-6)+'" fill="'+X.css('--soft')+'"></rect>'}
    sim.ev.forEach(e=>{if(e.s>=now)return;const y=top+e.th*rowH,x=L+e.s*sx,w=(Math.min(e.e,now)-e.s)*sx;const done=e.e<=now;
      b+='<rect x="'+x.toFixed(1)+'" y="'+y+'" width="'+Math.max(0,w-1).toFixed(1)+'" height="'+(rowH-6)+'" rx="3" fill="'+X.css(done?'--c1':'--c5')+'" opacity="'+(done?.85:1)+'"></rect>';
      if(w>16)b+='<text x="'+(x+w/2).toFixed(1)+'" y="'+(y+16)+'" font-size="10.5" text-anchor="middle" fill="'+X.css('--bg')+'">'+(e.w>1?'rows '+(e.ch*4)+'-'+(e.ch*4+3)+' of 16':'c'+e.ch)+'</text>'});
    const nx=L+now*sx;b+='<line x1="'+nx+'" x2="'+nx+'" y1="'+(top-4)+'" y2="'+(top+4*rowH)+'" stroke="'+X.css('--bad')+'" stroke-width="1.5"></line>';
    const bar=L+sim.end*sx;b+='<line x1="'+bar+'" x2="'+bar+'" y1="'+(top-4)+'" y2="'+(top+4*rowH)+'" stroke="'+X.css('--mute')+'" stroke-dasharray="3 3"></line><text x="'+(bar+170>W?bar-3:bar+3)+'" y="'+(top+4*rowH+12)+'" font-size="10.5" text-anchor="'+(bar+170>W?'end':'start')+'" fill="'+X.css('--mute')+'">barrier: all done at t = '+sim.end.toFixed(1)+'</text>';
    el.setAttribute('viewBox','0 0 '+W+' '+(top+4*rowH+18));el.setAttribute('height',top+4*rowH+18);el.innerHTML=b;
    const taken=sim.ev.filter(e=>e.s<now).length,counter=chkMode==='dyn'?Math.min(16,Math.max(4,taken)):null;
    document.getElementById('cl-chk-cap').innerHTML='t = '+now.toFixed(1)+' (time unit: one chunk on a fast thread). '+(chkMode==='dyn'?'Atomic counter <code>current_chunk</code> = '+counter+'. Each thread starts with chunk <code>ith</code>; when it finishes it calls <code>atomic_fetch_add(&amp;current_chunk, 1)</code> and takes the number it gets. The slow thread ends up doing fewer chunks, and everyone finishes at t = '+sim.end.toFixed(1)+'.':'Each thread owns a quarter of the rows. The fast threads finish at t = 4 and wait at the barrier; the slow thread\'s quarter takes until t = 8. The whole product takes as long as its slowest share.')}
  function initChk(){const ctl=document.getElementById('cl-chk-ctl');if(!ctl||!window.RD)return;
    chkAnim=RD.anim({card:'cl-chk',ctl:'cl-chk-ctl',n:stepsFor(chkSim).length,ms:700,draw:drawChk,label:'Time step'});
    RD.seg(document.getElementById('cl-chk-m'),m=>{chkMode=m;chkSim=simulate(m);chkAnim.reset(stepsFor(chkSim).length);chkAnim.play()})}

  // 6. threads and speed
  let thrMode='tg';
  function drawThr(){const el=document.getElementById('cl-thr');if(!el)return;const W=X.width(el),H=210,L=46,R=12,T=12,Bm=34;
    const rows=CL.bench.cpu.filter(r=>r.test===thrMode);const metal=CL.bench.metal.find(r=>r.test===thrMode);
    const all=rows.flatMap(r=>r.s).concat(metal?[metal.med]:[]);const raw=Math.max(...all)*1.05,stp=[50,100,200,250,500,1000,2000,2500,5000].find(s=>raw/s<=5)||5000,ymax=Math.ceil(raw/stp)*stp;const xs=[1,2,4,8];
    const px=t=>L+(xs.indexOf(t)+.5)*(W-L-R)/xs.length,py=y=>T+(H-T-Bm)*(1-y/ymax);let b='';
    for(let k=0;k<=Math.round(ymax/stp);k++){const y=stp*k;b+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+py(y)+'" y2="'+py(y)+'" stroke="'+X.css('--line')+'"></line><text x="'+(L-4)+'" y="'+(py(y)+4)+'" font-size="10.5" text-anchor="end" fill="'+X.css('--mute')+'">'+fmt(y,0)+'</text>'}
    xs.forEach(t=>{b+='<text x="'+px(t)+'" y="'+(H-Bm+16)+'" font-size="11" text-anchor="middle" fill="'+X.css('--ink')+'">'+t+' thread'+(t>1?'s':'')+'</text>'});
    [[true,'--c1','repack on (default)',-7],[false,'--c2','repack off',7]].forEach(([rp,c,lab,dx])=>{const rr=xs.map(t=>rows.find(r=>r.t===t&&r.rp===rp));
      b+='<polyline fill="none" stroke="'+X.css(c)+'" stroke-width="2" points="'+rr.map(r=>(px(r.t)+dx)+','+py(r.med)).join(' ')+'"></polyline>';
      rr.forEach(r=>{r.s.forEach(s=>{b+='<circle cx="'+(px(r.t)+dx)+'" cy="'+py(s)+'" r="2.2" fill="'+X.css(c)+'" opacity=".45"></circle>'});b+='<circle cx="'+(px(r.t)+dx)+'" cy="'+py(r.med)+'" r="4" fill="'+X.css(c)+'"><title>'+esc(lab+', '+r.t+' threads: median '+fmt(r.med,0)+' t/s; runs '+r.s.join(', '))+'</title></circle>'})});
    if(metal&&metal.med<ymax){b+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+py(metal.med)+'" y2="'+py(metal.med)+'" stroke="'+X.css('--c4')+'" stroke-dasharray="5 4"></line><text x="'+(W-R)+'" y="'+(py(metal.med)-4)+'" font-size="10.5" text-anchor="end" fill="'+X.css('--c4')+'">Metal GPU: '+fmt(metal.med,0)+'</text>'}
    b+='<text x="'+L+'" y="'+(H-4)+'" font-size="11" fill="'+X.css('--mute')+'">tokens/s, '+(thrMode==='tg'?'generating 32 tokens':'64-token prompt')+': <tspan fill="'+X.css('--c1')+'">● repack on</tspan> <tspan fill="'+X.css('--c2')+'">● repack off</tspan></text>';
    el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="100%" height="'+H+'" role="img" aria-label="Tokens per second against threads">'+b+'</svg>'}

  // 7. kernel counts
  function drawCounts(){const el=document.getElementById('cl-cnt');if(!el)return;const c=CL.counts;
    const K=[['gemv_q8_0_4x4','<code>ggml_gemv_q8_0_4x4_q8_0</code> (repacked, 1 row)'],['gemm_q8_0_4x4','<code>ggml_gemm_q8_0_4x4_q8_0</code> (repacked, 4 rows)'],['vec_dot_q8_0_q8_0','<code>ggml_vec_dot_q8_0_q8_0</code> (the NEON function above)'],['forward_mul_mat','<code>ggml_compute_forward_mul_mat</code> (generic path)'],['llamafile_sgemm','<code>llamafile_sgemm</code> (tinyBLAS, tried first)']];
    const C=[['n=1','prompt (5 tokens)'],['n=2','prompt + 1 token'],['repack=0','repack off, prompt, 2 runs']];
    el.innerHTML='<table class="cl-t"><thead><tr><th>Kernel</th>'+C.map(x=>'<th class="num">'+x[1]+'</th>').join('')+'</tr></thead><tbody>'+K.map(([k,l])=>'<tr><td>'+l+'</td>'+C.map(([ck])=>'<td class="num">'+fmt(c[ck][k],0)+'</td>').join('')+'</tr>').join('')+'</tbody></table><div class="cl-tip">Calls counted over a whole run of <code>llama-simple</code> (first two columns) and <code>llama-bench --repack 0 -p 5</code> (third), 4 threads, CPU only. Raw output on the <a href="#" data-tab="t-cl-run">Run it</a> tab.</div>'}

  function render(){drawMap();drawFile();const sm=document.querySelector('#cl-strd-m button.on');drawStrides(sm?sm.dataset.m:'base');
    const tm=document.querySelector('#cl-trace-m button.on');drawTrace(tm?tm.dataset.m:'layer0');if(chkAnim)chkAnim.redraw();drawThr();drawCounts()}
  if(window.RD){RD.seg(document.getElementById('cl-strd-m'),drawStrides);RD.seg(document.getElementById('cl-trace-m'),drawTrace);
    RD.seg(document.getElementById('cl-thr-m'),m=>{thrMode=m;drawThr()})}
  initChk();
  const ro=document.getElementById(TAB);if(ro&&window.RD&&RD.tabLinks)RD.tabLinks(document.getElementById('cl-cnt'));
  X.onRender(TAB,render);X.onResize(TAB,render);
})();
