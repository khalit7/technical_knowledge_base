// ---- Reading section 1: one MLP call, instruction by instruction (Dynamo tracing against CPython running it), and section 2's guard tree ----
(function(){
  const T=TCP.walk,{$,esc}=TU;if(!$('tcp-walk-card'))return;
  // Dynamo: the recorded steps. Listing per frame = that frame's instructions as Dynamo saw them.
  const dyn=T.steps;
  const listing={};dyn.forEach(s=>{const L=listing[s.fn]=listing[s.fn]||[];if(!L.some(x=>x.off===s.off))L.push({off:s.off,op:s.op,arg:s.arg})});
  Object.values(listing).forEach(L=>L.sort((a,b)=>a.off-b.off));
  // CPython: the original bytecode (dis), with each recorded ATen call placed at the CALL that ran it
  const groups=[];T.eager.forEach(c=>{const g=groups[groups.length-1];const k=c.at.join(':');if(g&&g.k===k&&!(c.at[0]==='linear.py'&&g.calls.length>=4))g.calls.push(c);else groups.push({k,file:c.at[0],calls:[c]})});
  const eag=[];let gi=0;
  const pushLin=()=>T.dis['Linear.forward'].forEach(li=>{const st={fn:'Linear.forward',off:li.off,op:li.op,arg:li.arg,calls:[]};if(li.op==='CALL'){st.calls=groups[gi++].calls}eag.push(st)});
  T.dis['MLP.forward'].forEach(ins=>{const st={fn:'MLP.forward',off:ins.off,op:ins.op,arg:ins.arg,calls:[]};
    if(ins.op==='CALL'){const g=groups[gi];if(g&&g.file==='linear.py'){eag.push(st);pushLin();return}st.calls=g?groups[gi++].calls:[]}
    eag.push(st)});
  let mode='dyn';
  const short=s=>s.replace(/UnspecializedBuiltinNNModuleVariable/g,'NNModule').replace(/UnspecializedNNModuleVariable/g,'NNModule').replace(/<class '([^']+)'>/g,'$1').replace(/builtin_function_or_method/g,'builtin').replace(/TorchInGraphFunctionVariable\(<built-in function (\w+)>[^)]*\)/g,'TorchFn($1)').replace(/PythonModuleVariable\(<module '([\w.]+)'[^)]*\)/g,'Module($1)');
  const colr=s=>/Tensor/.test(s)?'var(--c3)':/NNModule/.test(s)?'var(--c2)':/Null/.test(s)?'var(--dim)':'var(--c1)';
  function capDyn(s,i){
    const a=s.arg?' '+esc(s.arg):'';
    if(s.op==='RESUME')return [s.d?'Inline Linear.forward':'Start tracing MLP.forward',s.d?'A call into a module: Dynamo does not compile it separately, it follows the call and keeps tracing inside it (depth 1), so both frames end up in one graph.':'Dynamo intercepted the frame through its PEP 523 hook. Nothing has run; the stack starts empty.'];
    if(s.op==='LOAD_FAST')return ['LOAD_FAST'+a,'Push a local variable. Dynamo wraps it lazily: a LazyVariableTracker is inspected (and guarded) only if the code uses it.'];
    if(s.op==='LOAD_GLOBAL')return ['LOAD_GLOBAL'+a,'A global (the torch.nn.functional module). Its identity will be guarded: if F were replaced, the compiled code would be invalid.'];
    if(s.op==='LOAD_ATTR'){const p=s.new.length?' The attribute is a parameter, so it becomes a graph input (placeholder '+esc(s.new.join(', '))+').':' Answered now, at trace time; a guard records what it was.';return ['LOAD_ATTR'+a,'Attribute lookup.'+p]}
    if(s.op==='PUSH_NULL'||s.op==='SWAP')return [s.op,'Bookkeeping Dynamo inserted when it normalised the bytecode for a method call; no effect on the graph.'];
    if(s.op==='CALL'){const fx=s.new.filter(n=>!/^l_|^L_/.test(n));
      if(s.d&&fx.length)return ['CALL F.linear','A tensor function on TensorVariables: Dynamo runs it on fake tensors (shapes only) to learn the output shape, and adds node '+esc(fx.join(', '))+' to the FX graph. No arithmetic happened.'];
      if(fx.length===1)return ['CALL F.gelu','Same: one more graph node, '+esc(fx[0])+'. A real run would have launched a kernel here; Dynamo only wrote it down.'];
      return ['CALL (module)','Return from the inlined frame: its result, a TensorVariable, is now on this frame\'s stack.']}
    if(s.op==='RETURN_VALUE')return [s.d?'Return from Linear.forward':'RETURN_VALUE: the graph is complete',s.d?'Back to MLP.forward.':'Dynamo marks the returned TensorVariable as the graph output, compiles the graph, and writes new bytecode for the frame that calls it. Next call: run the guards, then the compiled code.'];
    return [s.op+a,''];
  }
  function capEag(s){
    const a=s.arg?' '+esc(s.arg):'';
    if(s.calls.length)return [s.op+' runs '+s.calls.length+' ATen call'+(s.calls.length>1?'s':''),s.fn==='Linear.forward'?'F.linear reaches the dispatcher and, on the CPU, decomposes into a view, a transpose and addmm (the matrix multiply plus bias), then a view back. Each one is a kernel launch that reads and writes memory now.':'GELU runs now as its own kernel over all 524,288 elements.'];
    if(s.op==='CALL')return ['CALL (module)','Calls Module.__call__, which runs hooks and then Linear.forward: a new frame.'];
    if(s.op==='RESUME')return [s.fn+' starts','CPython evaluates the frame instruction by instruction, with real values on its stack.'];
    return [s.op+a,'Ordinary Python: '+(s.op==='LOAD_ATTR'?'an attribute lookup, done again on every call.':s.op==='RETURN_VALUE'?'return the result.':'push a value.')];
  }
  const cnt=$('tcp-walk-cnt'),cap=$('tcp-walk-cap'),bc=$('tcp-walk-bc'),right=$('tcp-walk-right'),fnh=$('tcp-walk-fn');
  function draw(i){
    if(mode==='dyn'){
      const s=dyn[i],L=listing[s.fn];
      fnh.textContent=s.fn+(s.d?' (inlined, depth 1)':'')+': bytecode as Dynamo traced it';
      bc.innerHTML=L.map(x=>'<div class="'+(x.off===s.off?'on':'')+'"><span class="o">'+x.off+'</span><span class="d">'+(s.d?'1':'0')+'</span><span>'+esc(x.op)+(x.arg?' '+esc(x.arg):'')+'</span></div>').join('');
      const nodes=[];let calls=0;for(let k=0;k<=i;k++){dyn[k].new.forEach((n,j)=>{if(!nodes.some(z=>z.n===n)){nodes.push({n,op:dyn[k].newop[j],k});if(dyn[k].newop[j]==='call_function')calls++}})}
      right.innerHTML='<h5>Dynamo\'s stack after this instruction</h5><div class="tcp-stack">'+(s.stack.length?s.stack.map(v=>'<span style="--sc:'+colr(v)+'">'+esc(short(v))+'</span>').join(''):'<span class="mute" style="border:0">(empty)</span>')+'</div>'+
        '<h5 style="margin-top:8px">FX graph so far</h5><ul class="tcp-list">'+(nodes.length?nodes.map(z=>'<li class="'+(z.k===i?'new':'')+'">'+esc(z.n)+' <span class="mute">'+z.op+'</span></li>').join(''):'<li class="mute">(empty)</li>')+'</ul>';
      const c=capDyn(s,i);cap.innerHTML='<div class="t">'+c[0]+'</div><p>'+c[1]+'</p>';
      cnt.innerHTML=TU.stat('Instructions traced',(i+1)+' / '+dyn.length)+TU.stat('Graph ops (call_function)',calls)+TU.stat('Guards',s.g)+TU.stat('Kernels run','0','fake tensors only');
    }else{
      const s=eag[i],L=T.dis[s.fn];
      fnh.textContent=s.fn+': original bytecode (dis)';
      bc.innerHTML=L.map(x=>'<div class="'+(x.off===s.off?'on':'')+'"><span class="o">'+x.off+'</span><span class="d">'+(s.fn==='MLP.forward'?'0':'1')+'</span><span>'+esc(x.op)+(x.arg&&x.arg!=='None'&&x.arg!=='0'?' '+esc(x.arg):'')+'</span></div>').join('');
      const done=[];for(let k=0;k<=i;k++)eag[k].calls.forEach(c=>done.push({c,k}));
      const by=done.reduce((t,z)=>t+(z.c.shape?z.c.shape.reduce((a,b)=>a*b,1)*4:0),0);
      right.innerHTML='<h5>ATen calls run so far (real data)</h5><ul class="tcp-list">'+(done.length?done.map(z=>'<li class="'+(z.k===i?'new':'')+'">'+esc(z.c.op.replace('aten.','').replace('.default',''))+' <span class="mute">('+z.c.shape.join(', ')+')</span></li>').join(''):'<li class="mute">(none yet)</li>')+'</ul>';
      const c=capEag(s);cap.innerHTML='<div class="t">'+c[0]+'</div><p>'+c[1]+'</p>';
      cnt.innerHTML=TU.stat('Instructions run',(i+1)+' / '+eag.length)+TU.stat('ATen calls run',done.length)+TU.stat('Output bytes written',TU.comma(by))+TU.stat('Graph','none','eager keeps no graph');
    }
  }
  const A=RD.anim({card:'tcp-walk-card',ctl:'tcp-walk-ctl',n:dyn.length,draw,ms:1500,label:'Instruction'});
  RD.seg($('tcp-walk-seg'),m=>{mode=m;A.reset(m==='dyn'?dyn.length:eag.length)});
  // section 2: guard tree and kinds
  const gt=$('tcp-guard-tree');if(gt)gt.textContent=TCP.guard_tree;
  const gk=$('tcp-guard-kinds');if(gk)gk.innerHTML=Object.entries(TCP.guard_kinds).map(([k,v])=>TU.stat(k.replace(/_/g,' ').toLowerCase(),v)).join('');
})();
