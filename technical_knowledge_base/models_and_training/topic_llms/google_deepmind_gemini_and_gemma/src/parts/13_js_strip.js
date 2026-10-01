// ---- Layer strip, p-RoPE accounting, distillation storage (Reading) ----
const CTX=[512,1024,4096,8192,16384,32768,65536,131072,262144];
const ctxLab=v=>v>=1024?(v/1024)+'K':String(v);
(function(){
  // per-layer pattern: g = global every k-th layer; el, eg = elements per token per layer (keys plus values)
  const MD={
    g3:{n:'Gemma 3 27B',L:62,every:6,W:1024,el:2*16*128,eg:2*16*128,max:131072,note:'5 local : 1 global, window 1,024'},
    g2:{n:'Gemma 3 27B, Gemma 2 layout',L:62,every:2,W:4096,el:2*16*128,eg:2*16*128,max:131072,note:'1 local : 1 global, window 4,096 (illustrative)'},
    g4:{n:'Gemma 4 31B',L:60,every:6,W:1024,el:2*16*256,eg:4*512,max:262144,note:'5:1, window 1,024; global heads 4 × 512, keys reused as values'}
  };
  let cur='g3';
  function draw(){
    const m=MD[cur],T=Math.min(CTX[+$('stpT').value],m.max);$('stpTv').textContent=fmt(T)+' tokens'+(CTX[+$('stpT').value]>m.max?' (the model\'s maximum)':'');
    const isG=i=>(i+1)%m.every===0;let s='',Lg=0;
    for(let i=0;i<m.L;i++){const g=isG(i);if(g)Lg++;const bytes=(g?T*m.eg:Math.min(T,m.W)*m.el)*2;s+='<span class="'+(g?'g':'l')+'" title="layer '+(i+1)+': '+(g?'global':'local')+', '+fmtBytes(bytes)+' at '+fmt(T)+' tokens"></span>'}
    $('stpStrip').innerHTML='<div class="cells" style="grid-template-columns:repeat('+m.L+',1fr)">'+s+'</div><div class="leg"><span><i style="background:var(--acc)"></i>global layer ('+Lg+')</span><span><i style="background:var(--acc2)"></i>local layer ('+(m.L-Lg)+')</span><span>'+m.note+'</span></div>';
    const Ll=m.L-Lg,gB=Lg*T*m.eg*2,lB=Ll*Math.min(T,m.W)*m.el*2,all=m.L*T*Math.max(m.el,m.eg)*2,allG=(m.L*T*(cur==='g4'?m.el:m.eg))*2;
    const allGlobal=cur==='g4'?m.L*T*m.el*2:m.L*T*m.eg*2;
    $('stpOut').innerHTML=stat('KV cache, one sequence',fmtBytes(gB+lB),'bf16, at '+fmt(T)+' tokens')
      +stat('Held by global layers',fmtBytes(gB),Lg+' × '+fmt(T)+' × '+fmt(m.eg)+' × 2 bytes')
      +stat('Held by local layers',fmtBytes(lB),Ll+' × '+fmt(Math.min(T,m.W))+' × '+fmt(m.el)+' × 2 bytes, fixed past the window')
      +stat('If every layer were global',fmtBytes(allGlobal),'×'+(allGlobal/(gB+lB)).toFixed(1)+' the windowed layout');
  }
  segBind('stpM',v=>{cur=v;draw()});$('stpT').addEventListener('input',draw);draw();
})();
(function(){
  function draw(){const p=+$('prpP').value/100,sv=(1-p)/2;$('prpPv').textContent=p.toFixed(2);
    const W=520,H=70,u=(W-150)/2;let s='';
    s+='<text x="0" y="22" font-size="12">key + value</text><rect x="140" y="10" width="'+u+'" height="16" fill="var(--acc)"/><rect x="'+(140+u)+'" y="10" width="'+u+'" height="16" fill="var(--c3)"/>';
    s+='<text x="0" y="52" font-size="12">value + rotated part</text><rect x="140" y="40" width="'+u+'" height="16" fill="var(--c3)"/><rect x="'+(140+u)+'" y="40" width="'+(u*p)+'" height="16" fill="var(--acc)"/>';
    $('prpOut').innerHTML=svgEl(W,H,s,'Stored elements per global head')+'<div class="out">'+stat('Stored per global head',(1+p).toFixed(2)+' d','against 2 d')+stat('Saving, (1 − p) / 2',(sv*100).toFixed(1)+'%',p===0.25?'the report\'s "up to 37.5%"':'')+'</div>'}
  $('prpP').addEventListener('input',draw);draw();
})();
(function(){
  const V=262144,Ks=[1,2,4,8,16,32,64,128,256,512,1024,4096,16384,65536,262144];
  function draw(){const k=Ks[+$('dstK').value],N=+$('dstN').value;$('dstKv').textContent=fmt(k);
    const full=V*4,sp=k>=V?full:k*8;const big=v=>v>=1e18?(v/1e18).toFixed(1)+' EB':v>=1e15?(v/1e15).toFixed(1)+' PB':(v/1e12).toFixed(1)+' TB';
    $('dstOut').innerHTML=stat('Full distribution, per token',fmtBytes(full),fmt(V)+' × 4 bytes')+stat('k entries, per token',fmtBytes(sp),k>=V?'the whole vocabulary':fmt(k)+' × 8 bytes')
      +stat('Full, whole run',big(full*N),fmt(N/1e12)+'T tokens')+stat('k entries, whole run',big(sp*N),'×'+fmt(full/sp,0)+' smaller')}
  ['dstK','dstN'].forEach(id=>$(id).addEventListener('input',draw));draw();
})();
