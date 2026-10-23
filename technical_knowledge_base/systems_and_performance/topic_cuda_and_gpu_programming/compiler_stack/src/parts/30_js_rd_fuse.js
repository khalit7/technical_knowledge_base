// ---- Reading section 1: Inductor's fusion rounds on the running example, as a stepper ----
// Nodes and rounds are Inductor's own, from src/out/tc/inductor_cpu.log (TORCH_LOGS=fusion, torch 2.14.1);
// the round lines themselves are window.CSD.tc.fusion_log, and check/check_embed.py checks this file against the log.
(function(){
  if(!document.getElementById('cs-fuCard'))return;
  const T=window.CSD.tc,E=RD.esc;
  const N=[ // [name, short label, kind, what it computes]
    ['op0','any','reduction','per row: is every scaled value finite? (the guard for the rewrite)'],
    ['op1','max','reduction','per row: a maximum (amax of one form of the input)'],
    ['op2','max','reduction','per row: the other maximum (amax of the other form)'],
    ['op3','exp','pointwise','64 x 256: subtract, scale, exp'],
    ['op4','sum','reduction','per row: the sum of the exps'],
    ['op5','div','pointwise','64 x 256: divide by the sum'],
    ['op6','mm','extern','the matmul by w: a library call, never fused']];
  const F=[ // groups per frame, refused pair, caption
    {g:[[0],[1],[2],[3],[4],[5],[6]],cap:['Seven scheduler nodes','Dynamo recorded three operations (a multiply, a softmax, a matmul); decomposed and rewritten they are seven nodes: four row reductions, two full-size pointwise nodes and the external matmul. Unfused, every arrow between them would be a tensor written to memory and read back.']},
    {g:[[0,1,2],[3,4],[5],[6]],bad:[3,5],cap:['Round 1: seven nodes into four','The three reductions over the same rows merge, and exp merges with the sum that consumes it. op3 with op5 is refused: "cannot fuse op3 with op5: intermediate nodes between node1 &amp; node2" (the sum must finish before any divide).']},
    {g:[[0,1,2,3,4,5],[6]],cap:['Round 2: four nodes into two','With the sum now inside, everything that loops over rows becomes one outer loop over the 64 rows (Inductor’s OuterLoopFusedSchedulerNode). The matmul stays outside: it is an extern kernel.']},
    {g:[[0,1,2,3,4,5],[6]],code:true,cap:['Round 3 finds nothing: code generation','One C++ kernel for the six nodes plus one library call. The wrapper allocates the buffers, calls the kernel, then extern_kernels.mm. The intermediates never leave the kernel’s row loop.']}];
  const nodesAfter=[7,4,2,2];
  const R={};let rk=0;T.fusion_log.forEach(l=>{const m=l.match(/attempting fusion \((\d+)\//);if(m)rk=+m[1];else if(/^(fusing|cannot)/.test(l))(R[rk]=R[rk]||[]).push(l)});
  function draw(i){const el=document.getElementById('cs-fuSvg'),W=RD.width(el),f=F[i];
    const pad=6,n=N.length,bw=(W-pad*(n+1))/n,bh=46,y0=26,H=y0+bh+(f.code?44:34);
    let s='';const X=k=>pad+k*(bw+pad);
    // groups
    f.g.forEach(gr=>{if(gr.length<2&&!f.code)return;const x1=X(gr[0])-3,x2=X(gr[gr.length-1])+bw+3;const ext=gr[0]===6;
      s+='<rect x="'+x1+'" y="'+(y0-8)+'" width="'+(x2-x1)+'" height="'+(bh+16)+'" rx="8" fill="'+(ext?'none':'var(--acc2)')+'" stroke="'+(ext?'var(--mute)':'var(--acc)')+'" stroke-dasharray="'+(ext?'4 3':'0')+'"/>'});
    N.forEach((nd,k)=>{const x=X(k);const ext=nd[2]==='extern';
      s+='<rect x="'+x+'" y="'+y0+'" width="'+bw+'" height="'+bh+'" rx="5" fill="var(--bg)" stroke="'+(ext?'var(--mute)':'var(--line)')+'"/>'+
        RD.t(x+bw/2,y0+18,nd[0],{a:'middle',fs:11,fill:'var(--mute)'})+RD.t(x+bw/2,y0+35,nd[1],{a:'middle',fs:12,fill:'var(--ink)',w:600});});
    if(f.bad){const a=X(f.bad[0])+bw/2,b=X(f.bad[1])+bw/2,yy=y0+bh+18;
      s+='<path d="M'+a+','+(y0+bh+8)+' L'+a+','+yy+' L'+b+','+yy+' L'+b+','+(y0+bh+8)+'" fill="none" stroke="var(--bad)" stroke-dasharray="4 3"/>'+RD.t((a+b)/2,yy+13,'refused',{a:'middle',fs:11,fill:'var(--bad)'});}
    if(f.code){const g=f.g[0];const x1=X(g[0]),x2=X(g[g.length-1])+bw,ym=y0+bh+30;
      s+=RD.t((x1+x2)/2,ym+4,W<520?'one C++ kernel':'cpp_fused_..._0: one C++ kernel',{a:'middle',fs:12,fill:'var(--acc)',w:600})+RD.t(X(6)+bw/2,ym+4,'mm',{a:'middle',fs:12,fill:'var(--mute)'});
    }
    s+=RD.t(pad,14,'scheduler nodes after this step: '+nodesAfter[i],{fs:11,fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,s,'Inductor fusion, step '+(i+1));
    document.getElementById('cs-fuCap').innerHTML='<div class="t">Step '+(i+1)+' of '+F.length+': '+f.cap[0]+'</div><p>'+f.cap[1]+'</p>'+(i===0?'<p class="small mute">'+N.map(nd=>'<b>'+nd[0]+'</b> '+E(nd[3])).join('; ')+'.</p>':'')+(R[i]?'<p class="small mute">Inductor\u2019s log: <code>'+E(R[i].join(' | '))+'</code></p>':'')+(f.code?'<p class="small mute"><code>'+E(T.cpp_name)+'</code></p>':'');
    document.getElementById('cs-fuCnt').innerHTML=RD.stat('fusion round',i===0?'not yet':Math.min(i,3)+' of 3')+RD.stat('scheduler nodes',nodesAfter[i])+RD.stat('kernels written',f.code?'1 + library mm':'not yet');}
  const an=RD.anim({card:'cs-fuCard',ctl:'cs-fuCtl',n:F.length,draw:draw,ms:2600,label:'Fusion step'});
  RD.onResize(()=>an.redraw());
})();
