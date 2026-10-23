// ---- Reading section 3 (autograd); the modules-and-loop tables moved to Making training fast ----
(function(){
const D=window.TDA, A=D.ag, G=D.eng, M=D.mod, E=RD.esc, U=window.TDAU, $=id=>document.getElementById(id);
const fl=a=>'['+a.map(v=>+(+v).toFixed(4)).join(', ')+']';
// 3.1 graph summary
(function(){const p=G.cpu_plain, n=p.nodes, acc=n.filter(x=>x.name==='AccumulateGrad').length;
  const seen=new Map();n.forEach(x=>x.saved.forEach(s=>{if(!s.is_param||s.is_param==='x (input)')seen.set(s.sid,s.bytes)}));
  const act=[...seen.values()].reduce((a,b)=>a+b,0);
  $('tda-g5').innerHTML=[['nodes',n.length,(n.length-acc)+' operator nodes + '+acc+' AccumulateGrad (12 parameters and x)','var(--c1)'],['saved activations',U.mb(act),'unique storages, weights excluded <span class="der">derived from the record</span>','var(--c2)'],['live after forward',U.mb(p.live),'every storage forward made and still holds, incl. y and the loss','var(--c3)'],['backward calls',p.ops.length,'aten calls during loss.backward()','var(--c4)']].map(([k,v,d,c])=>'<div style="--sc:'+c+'"><div class="k">'+k+'</div><div class="v">'+v+'</div><p>'+d+'</p></div>').join('');
  const rows=n.filter(x=>x.saved.length).map(x=>{const own=x.saved.filter(s=>!s.is_param||s.is_param==='x (input)');return ['<code>'+x.name+'</code>',x.saved.map(s=>s.name+(s.is_param&&s.is_param!=='x (input)'?' <span class="mute">(weight)</span>':'')).join(', '),U.fmt(own.reduce((a,s)=>a+s.bytes,0))]});
  $('tda-gsaved').innerHTML=U.table(['node','saved','bytes (activations; shared storages counted per node)'],rows);})();
// 3.4 version summary
(function(){const L=A.version_lab;$('tda-versum').innerHTML=U.table(['case','outcome'],L.map(c=>[E(c.title),c.status==='error'?'<span class="tda-err">'+E(c.error.text.split('. Hint')[0].slice(0,140))+(c.error.text.length>140?'&hellip;':'')+'</span>':'<b style="color:var(--good)">runs</b>'+(c.grad_x?', x.grad = '+fl(c.grad_x):'')]))+'<p class="small mute">Each snippet run for real with torch 2.14.1 (src/exp/autograd_lab.py); step through any of them in the stepper above.</p>';
})();
// 3.6
(function(){const c=A.custom_function;$('tda-cf-out').textContent='gradcheck: '+c.gradcheck_good+'   gradgradcheck: '+c.gradgradcheck_good+'   grad_fn: '+c.grad_fn+'\nmax |gradient - autograd through F.gelu(approximate="tanh")| = '+c.matches_builtin.toExponential(2);})();
// 3.8
$('tda-gm').innerHTML=U.table(['context','y.requires_grad','y.grad_fn','inference tensor','later (y * w).sum().backward()'],A.grad_modes.map(g=>['<code>'+E(g.code).replace(/\n/g,'<br>')+'</code>',g.requires_grad,g.grad_fn||'None',g.is_inference,g.later_backward==='ok'?'ok':'<span class="tda-err">'+E(g.later_backward.split('. Please')[0])+'</span>']));
// 3.9 saved-tensor hooks and checkpoint, one block
(function(){const p=G.cpu_plain,c=G.cpu_checkpoint,mp=G.mps_plain,mo=G.mps_offload;
  const cnt=o=>o.ops.length, add=o=>o.ops.filter(([n])=>n==='addmm').length;
  $('tda-sth').innerHTML=U.table(['same block, same input','device memory held after forward','backward calls','gradients vs plain'],[
    ['plain (CPU)',U.fmt(p.live)+' B (live storages)',cnt(p),'reference'],
    ['checkpointed, non-reentrant (CPU)',U.fmt(c.live)+' B',cnt(c)+' (of which '+add(c)+' addmm recomputed)','max diff '+c.diff],
    ['plain (MPS)',U.fmt(mp.dev)+' B (torch.mps.current_allocated_memory)','','reference'],
    ['save_on_cpu-style pack hook (MPS)',U.fmt(mo.dev)+' B; '+mo.packed+' tensors, '+U.fmt(mo.packed_bytes)+' B moved to host memory','','max diff '+mo.diff],
    ['checkpointed (MPS)',U.fmt(G.mps_checkpoint_dev)+' B','','']]);
  const ck=A.checkpoint_variants;
  $('tda-ck').innerHTML=U.table(['variant','live after forward','forward calls','backward calls','addmm in backward','gradients vs plain'],['plain','non-reentrant','reentrant','unspecified'].map(k=>{const r=ck[k];return ['<code>'+(k==='unspecified'?'checkpoint(b, h)':k==='plain'?'b(h)':'use_reentrant='+(k==='reentrant'?'True':'False'))+'</code>',U.mb(r.live_after_forward),r.forward_calls,r.backward_calls,r.addmm_in_backward,k==='plain'?'reference':'max diff '+r.max_grad_diff]}));
})();
})();
