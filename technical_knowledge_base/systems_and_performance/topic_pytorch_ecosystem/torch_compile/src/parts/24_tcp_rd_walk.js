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
  // the long replay grouped into explained stretches (2026-11-12, the long-replay rule): one step-list item per stretch;
  // stepping forward plays the stretch's instructions one by one, any other move shows the stretch's last instruction
  const STR={dyn:[[0,1],[2,11],[12,19],[20,22],[23,23],[24,34],[35,35]],eager:[[0,7],[8,16],[17,18],[19,19],[20,30],[31,31]]};
  const short=s=>s.replace(/UnspecializedBuiltinNNModuleVariable/g,'NNModule').replace(/UnspecializedNNModuleVariable/g,'NNModule').replace(/<class '([^']+)'>/g,'$1').replace(/builtin_function_or_method/g,'builtin').replace(/TorchInGraphFunctionVariable\(<built-in function (\w+)>[^)]*\)/g,'TorchFn($1)').replace(/PythonModuleVariable\(<module '([\w.]+)'[^)]*\)/g,'Module($1)');
  const colr=s=>/Tensor/.test(s)?'var(--c3)':/NNModule/.test(s)?'var(--c2)':/Null/.test(s)?'var(--dim)':'var(--c1)';
  const cnt=$('tcp-walk-cnt'),bc=$('tcp-walk-bc'),right=$('tcp-walk-right'),fnh=$('tcp-walk-fn');
  function frame(i){
    if(mode==='dyn'){
      const s=dyn[i],L=listing[s.fn];
      fnh.textContent=s.fn+(s.d?' (inlined, depth 1)':'')+': bytecode as Dynamo traced it';
      bc.innerHTML=L.map(x=>'<div class="'+(x.off===s.off?'on':'')+'"><span class="o">'+x.off+'</span><span class="d">'+(s.d?'1':'0')+'</span><span>'+esc(x.op)+(x.arg?' '+esc(x.arg):'')+'</span></div>').join('');
      const nodes=[];let calls=0;for(let k=0;k<=i;k++){dyn[k].new.forEach((n,j)=>{if(!nodes.some(z=>z.n===n)){nodes.push({n,op:dyn[k].newop[j],k});if(dyn[k].newop[j]==='call_function')calls++}})}
      right.innerHTML='<h5>Dynamo\'s stack after this instruction</h5><div class="tcp-stack">'+(s.stack.length?s.stack.map(v=>'<span style="--sc:'+colr(v)+'">'+esc(short(v))+'</span>').join(''):'<span class="mute" style="border:0">(empty)</span>')+'</div>'+
        '<h5 style="margin-top:8px">FX graph so far</h5><ul class="tcp-list">'+(nodes.length?nodes.map(z=>'<li class="'+(z.k===i?'new':'')+'">'+esc(z.n)+' <span class="mute">'+z.op+'</span></li>').join(''):'<li class="mute">(empty)</li>')+'</ul>';
      cnt.innerHTML=TU.stat('Instructions traced',(i+1)+' / '+dyn.length)+TU.stat('Graph ops (call_function)',calls)+TU.stat('Guards',s.g)+TU.stat('Kernels run','0','fake tensors only');
    }else{
      const s=eag[i],L=T.dis[s.fn];
      fnh.textContent=s.fn+': original bytecode (dis)';
      bc.innerHTML=L.map(x=>'<div class="'+(x.off===s.off?'on':'')+'"><span class="o">'+x.off+'</span><span class="d">'+(s.fn==='MLP.forward'?'0':'1')+'</span><span>'+esc(x.op)+(x.arg&&x.arg!=='None'&&x.arg!=='0'?' '+esc(x.arg):'')+'</span></div>').join('');
      const done=[];for(let k=0;k<=i;k++)eag[k].calls.forEach(c=>done.push({c,k}));
      const by=done.reduce((t,z)=>t+(z.c.shape?z.c.shape.reduce((a,b)=>a*b,1)*4:0),0);
      right.innerHTML='<h5>ATen calls run so far (real data)</h5><ul class="tcp-list">'+(done.length?done.map(z=>'<li class="'+(z.k===i?'new':'')+'">'+esc(z.c.op.replace('aten.','').replace('.default',''))+' <span class="mute">('+z.c.shape.join(', ')+')</span></li>').join(''):'<li class="mute">(none yet)</li>')+'</ul>';
      cnt.innerHTML=TU.stat('Instructions run',(i+1)+' / '+eag.length)+TU.stat('ATen calls run',done.length)+TU.stat('Output bytes written',TU.comma(by))+TU.stat('Graph','none','eager keeps no graph');
    }
  }
  const card=$('tcp-walk-card');let sub=0;
  function draw(i){clearTimeout(sub);const [a,b]=STR[mode][i],m=mode;
    if(!card.classList.contains('rd-fwd')||RD.RM||a===b){frame(b);return}
    let j=a;const run=()=>{if(mode!==m)return;frame(j);if(j<b){j++;sub=setTimeout(run,330)}};run()}
  const A=RD.anim({card:'tcp-walk-card',ctl:'tcp-walk-ctl',n:STR.dyn.length,draw,ms:5600,label:'Stretch',list:'sx-walk-dyn'});
  RD.seg($('tcp-walk-seg'),m=>{clearTimeout(sub);mode=m;$('sx-walk-dyn').hidden=m!=='dyn';$('sx-walk-eag').hidden=m==='dyn';A.reset(STR[m].length,m==='dyn'?'sx-walk-dyn':'sx-walk-eag')});
  // section 2: guard tree and kinds
  const gt=$('tcp-guard-tree');if(gt)gt.textContent=TCP.guard_tree;
  const gk=$('tcp-guard-kinds');if(gk)gk.innerHTML=Object.entries(TCP.guard_kinds).map(([k,v])=>TU.stat(k.replace(/_/g,' ').toLowerCase(),v)).join('');
})();
