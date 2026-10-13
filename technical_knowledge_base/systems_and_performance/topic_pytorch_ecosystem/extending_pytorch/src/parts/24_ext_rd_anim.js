// ---- Reading animations: Dynamo tracing the forward (2.1) and one weight through a matmul (5.3) ----
(function(){
  const E=window.EXT,esc=RD.esc,$=id=>document.getElementById(id);
  // ---------- 2.1: positions of one forward, before (direct call) and after (custom op) ----------
  const G=E.graphs,cg=G.custom_op.graphs[0],pg=G.pybind.graphs;
  function positions(mode){
    const P=[];let k=0;const take=n=>{const s=cg.slice(k,k+n);k+=n;return s};
    const pro=take(4);
    P.push(mode==='pybind'?{kind:'eager',ops:pro,label:'GPT.forward: positions and embeddings'}:{kind:'graph',g:1,ops:pro,label:'GPT.forward: positions and embeddings'});
    for(let b=0;b<4;b++){
      const a=take(19),fc=take(1),act=take(1),pj=take(1),ad=take(1);
      if(mode==='pybind'){
        P.push({kind:'graph',g:1,ops:pg[0],label:'block '+b+': ln1, attention, residual, ln2',b});
        P.push({kind:'graph',g:2,ops:pg[1],label:'block '+b+': MLP fc',b});
        P.push({kind:'break',ops:['raw_gelu (C++)'],label:'block '+b+': GELU, run by Python',b});
        P.push({kind:'graph',g:3,ops:pg[2],label:'block '+b+': MLP proj',b});
        P.push({kind:'graph',g:4,ops:pg[3],label:'block '+b+': residual add',b});
      }else{
        P.push({kind:'graph',g:1,ops:a,label:'block '+b+': ln1, attention, residual, ln2',b});
        P.push({kind:'graph',g:1,ops:fc,label:'block '+b+': MLP fc',b});
        P.push({kind:'node',g:1,ops:act,label:'block '+b+': GELU, one node',b});
        P.push({kind:'graph',g:1,ops:pj,label:'block '+b+': MLP proj',b});
        P.push({kind:'graph',g:1,ops:ad,label:'block '+b+': residual add',b});
      }
    }
    const ep=take(5);
    P.push(mode==='pybind'?{kind:'eager',ops:ep,label:'GPT.forward: ln_f, head, loss'}:{kind:'graph',g:1,ops:ep,label:'GPT.forward: ln_f, head, loss'});
    return P;
  }
  const CAP={
    pybind:i=>{const P=PS.pybind[i];
      if(i===0)return ['Dynamo starts at GPT.forward','It inlines every call it can, block, attention, MLP, looking for one graph. The direct C++ call inside the MLP stops it ("'+esc(G.pybind.breaks[0].reason)+'"). In the recording, the outer GPT.forward ended up running uncompiled: these embedding operations run eagerly in Python.'];
      if(P.kind==='break')return ['Graph break: Python runs the call','The compiled graph before it ends; the C++ function runs eagerly, outside any graph; a new graph starts after it. Inductor sees neither the call nor anything that could be fused across it.'];
      if(P.kind==='eager')return ['Back in the uncompiled outer frame','Final norm, head and loss run eagerly too, op by op.'];
      if(P.b>0&&P.g===1&&P.ops.length>1)return ['Block '+P.b+' reuses the compiled pieces','The same four small graphs, compiled once for block 0, run again: '+G.pybind.gc+' graphs compiled for the whole model, with a trip through Python at each GELU.'];
      return ['Compiled graph '+P.g+' of '+G.pybind.gc,'A short graph between two exits to Python: '+P.ops.length+' operation'+(P.ops.length>1?'s':'')+'.'];},
    custom_op:i=>{const P=PS.custom_op[i];
      if(i===0)return ['One graph from the first operation','Dynamo traces GPT.forward and everything it calls into a single graph.'];
      if(P.kind==='node')return ['The custom op is one node','Dynamo does not look inside ext::gelu. It asks the fake for the output shape, records <code>ext.gelu.default</code> and keeps tracing: no break.'];
      if(i===PS.custom_op.length-1)return ['Done: one graph','One graph of '+G.custom_op.n0+' operations, with ext.gelu.default once per block. Export of the same model also gives one graph.'];
      return ['Still graph 1','Tracing continues without leaving the graph.'];}
  };
  const PS={pybind:positions('pybind'),custom_op:positions('custom_op')};
  let dmode='pybind';
  function ddraw(i){const P=PS[dmode];const seen=new Set();let runs=0,eager=0,inG=0,inE=0;
    for(let j=0;j<=i;j++){const p=P[j];if(p.kind==='graph'||p.kind==='node'){seen.add(p.g);if(j===0||P[j-1].kind==='break'||P[j-1].kind==='eager'||P[j-1].g!==p.g||dmode==='pybind')runs+=dmode==='pybind'?1:(j===0?1:0);inG+=p.ops.length}else{eager++;inE+=p.ops.length}}
    if(dmode==='custom_op')runs=1;
    const box=(p,j)=>{const cls=p.kind==='graph'||p.kind==='node'?'':' eager';const st=j===i?'outline:2px solid var(--ink);':'';const op=j>i?'opacity:.35;':'';
      const col=p.kind==='break'?'border-color:var(--bad);':(p.kind==='graph'||p.kind==='node')?'border-color:'+['','var(--acc)','var(--c4)','var(--c6)','var(--c3)'][p.g]+';':'';
      return '<span class="ext-gbox'+cls+'" style="'+col+st+op+'" title="'+esc(p.label)+'"><span style="font-size:11px">'+(p.kind==='break'?'break':p.kind==='eager'?'eager':'g'+p.g)+' &middot; '+p.ops.length+'</span></span>'};
    const cur=P[i];
    $('ext-dyn-view').innerHTML='<div class="small mute" style="margin:4px 0">The forward, left to right (box: what ran, and how many operations):</div><div style="display:flex;flex-wrap:wrap;gap:2px">'+P.map(box).join('')+'</div>'+
      '<div class="ext-lane" style="margin-top:8px"><div class="nm">'+esc(cur.label)+'</div><div class="ext-ops">'+cur.ops.map(o=>'<span class="'+(cur.kind==='break'?'brk':cur.kind==='eager'?'e':cur.kind==='node'?'g cur':'g')+'">'+esc(o)+'</span>').join('')+'</div></div>';
    const c=CAP[dmode](i);$('ext-dyn-cap').innerHTML='<div class="t">'+c[0]+'</div><p>'+c[1]+'</p>';
    $('ext-dyn-cnt').innerHTML=RD.stat('Graphs compiled',seen.size,'unique, so far')+RD.stat('Eager stretches run',eager,dmode==='pybind'?'GELU once per block, plus the outer frame':'none')+RD.stat('Operations in graphs',inG,'so far')+RD.stat('Operations run eagerly',inE,'so far');}
  const dan=RD.anim({card:'ext-dyn-card',ctl:'ext-dyn-ctl',n:PS.pybind.length,draw:ddraw,ms:1100,label:'Step of the forward'});
  RD.seg($('ext-dyn-seg'),m=>{dmode=m;dan.reset(PS[m].length)});

  // ---------- 5.3: one weight through one matmul ----------
  const W=1024*256,X=512*256*4,Y=512*1024*4;
  const S={
    f32:[{t:'At rest: a float32 weight',p:'1024 &times; 256 numbers at 4 bytes each.',w:W*4,tmp:0,rd:0,op:''},
         {t:'aten.t: a transpose is a view',p:'nn.Linear computes x W<sup>T</sup>; the transpose writes a new header and moves no data.',w:W*4,tmp:0,rd:0,op:'t'},
         {t:'aten.addmm: x W<sup>T</sup> + b',p:'The BLAS kernel reads the activation and the float32 weight and writes the output.',w:W*4,tmp:0,rd:W*4,op:'addmm'}],
    i8:[{t:'At rest: int8 values plus one scale per row',p:'qdata 1024 &times; 256 at 1 byte, scale 1,024 floats at 4 bytes: a quarter of the memory.',w:W+4096,tmp:0,rd:0,op:''},
        {t:'aten._to_copy: int8 to float32',p:'The compiled graph converts the whole weight to float32 first: a temporary as large as the float weight.',w:W+4096,tmp:W*4,rd:W,op:'_to_copy'},
        {t:'aten.t: flip the view',p:'Same as before: no data moves.',w:W+4096,tmp:W*4,rd:W,op:'t'},
        {t:'aten.mm: the multiply, on the converted copy',p:'The same BLAS kernel as float32, reading the float temporary.',w:W+4096,tmp:W*4,rd:W+W*4,op:'mm'},
        {t:'aten.mul: apply the scale per output column',p:'(x q<sup>T</sup>) &times; s: the scale factors out of the sum, so it is applied once per output.',w:W+4096,tmp:0,rd:W+W*4+4096,op:'mul'},
        {t:'aten.add: the bias',p:'The result equals x W&#770;<sup>T</sup> + b with W&#770; = q &times; s, the dequantized weight.',w:W+4096,tmp:0,rd:W+W*4+4096,op:'add'}]};
  let qm='f32';const B=n=>n.toLocaleString('en-US')+' B';
  function qdraw(i){const s=S[qm][i],mx=W*4+W*4;
    const seg=(n,c,l)=>n?'<span style="width:'+(100*n/mx).toFixed(1)+'%;background:'+c+'">'+l+'</span>':'';
    $('ext-q8-cap').innerHTML='<div class="t">'+s.t+'</div><p>'+s.p+'</p>';
    $('ext-q8-view').innerHTML='<div class="small mute">Weight memory, to scale (full width = 2 MiB):</div><div class="ext-bytes" style="background:var(--soft)">'+seg(s.w,qm==='f32'?'var(--c1)':'var(--c4)',qm==='f32'?'float32 weight':'int8 + scales')+seg(s.tmp,'var(--c2)','float32 temporary')+'</div>'+
      '<div class="ext-ops" style="margin-top:6px">'+S[qm].slice(1).map((x,j)=>'<span class="'+(j+1===i?'g cur':j+1<i?'g':'fut')+'">'+x.op+'</span>').join('')+'</div>';
    $('ext-q8-cnt').innerHTML=RD.stat('Weight stored',B(s.w),qm==='f32'?'float32':'int8 + scales')+RD.stat('Weight temporary',B(s.tmp),s.tmp?'alive during the multiply':'none')+RD.stat('Weight bytes read so far',B(s.rd),'per forward call')+RD.stat('Activation in / out',B(X)+' / '+B(Y),'unchanged by the format');}
  const qan=RD.anim({card:'ext-q8-card',ctl:'ext-q8-ctl',n:S.f32.length,draw:qdraw,ms:1500,label:'Step'});
  RD.seg($('ext-q8-seg'),m=>{qm=m;qan.reset(S[m].length)});
})();
