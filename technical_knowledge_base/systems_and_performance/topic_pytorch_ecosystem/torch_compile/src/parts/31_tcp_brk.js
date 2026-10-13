// ---- Graph-break fixer tab ----
(function(){
  const {$,esc}=TU,F=TCP.fix;if(!$('t-tcp-brk'))return;
  let k=0,mode='b',A;
  function seq(r){ // the forward as a list of segments
    const s=[];
    if(r.graphs===1&&r.breaks===0)return [{c:true,t:'whole forward compiled ('+r.piece_ops[0]+' ops)'}];
    s.push({c:false,t:'embeddings (eager)'});
    const per=Math.max(1,Math.round(r.pieces_per_forward/4)),ops=r.piece_ops.slice(0,per);
    for(let b=0;b<4;b++){ops.forEach((n,j)=>{s.push({c:true,t:'block '+b+' piece '+(j+1)+' ('+n+' ops)'});if(j<per-1)s.push({c:false,t:'block '+b+': the break line (eager)'})})}
    s.push({c:false,t:'ln_f, head, loss (eager)'});return s;
  }
  function draw(i){const K=F[k],r=mode==='b'?K.b:K.f,S=seq(r);i=Math.min(i,S.length-1);
    $('tcpb-strip').innerHTML=S.map((x,j)=>'<span class="'+(x.c?'c':'e')+(j===i?' on':'')+'">'+esc(x.t)+'</span>').join('');
    const done=S.slice(0,i+1);
    $('tcpb-cap').innerHTML='<div class="t">'+esc(S[i].t)+'</div><p>'+(S[i].c?'Compiled code: guards checked, then the generated kernels run.':'Plain Python, op by op, with eager kernels; no fusion across this point.')+'</p>';
    $('tcpb-cnt').innerHTML=TU.stat('Compiled piece calls',done.filter(x=>x.c).length+' / '+S.filter(x=>x.c).length)+TU.stat('Eager segments',done.filter(x=>!x.c).length+' / '+S.filter(x=>!x.c).length)+TU.stat('explain(): graphs / breaks',r.graphs+' / '+r.breaks)+TU.stat('Compiled pieces that exist',r.piece_ops.length,'ops: '+r.piece_ops.join(', '))+TU.stat('Max diff vs original',mode==='f'?r.max_diff_vs_original.toExponential(1):'(broken run)');
  }
  function pick(j){k=+j;const K=F[k];
    $('tcpb-src-b').textContent=K.src_b.replace(/^def \w+/,'def forward');$('tcpb-src-f').textContent=K.src_f.replace(/^def \w+/,'def forward').replace(/^@[\s\S]*?\ndef /,'def ');
    $('tcpb-how').textContent='('+K.how+')';$('tcpb-reason').textContent=K.b.reason;$('tcpb-full').textContent=K.b.fullgraph_error||'no error: one graph was captured';
    if(A)A.reset(seq(mode==='b'?K.b:K.f).length)}
  TU.seg($('tcpb-kind'),F.map((K,j)=>[String(j),esc(K.label)]),pick,'0');
  A=RD.anim({card:'tcpb-card',ctl:'tcpb-ctl',n:seq(F[0].b).length,draw,ms:900,label:'Segment'});
  // RD.anim registers redraws on the Reading tab only; this tab redraws itself when shown
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-tcp-brk']=[()=>A.redraw()];
  RD.seg($('tcpb-mode'),m=>{mode=m;A.reset(seq(mode==='b'?F[k].b:F[k].f).length)});
})();
