// ---- Reading tab, sections 2 and 3: the dispatch walk (five situations) and the tiny autograd graph (plain against checkpointed) ----
(function(){
  const D=window.RDD,fmt=n=>Number(n).toLocaleString('en-US');
  // ---------- section 2 ----------
  const KEYS=['PythonTLSSnapshot','AutocastCPU','AutogradCPU','ADInplaceOrView','Python','CPU'];
  const box=document.getElementById('rd-dsp-keys');
  if(box){
    const SC=D.dispatch;
    // what each key does in each situation; status: on (runs and acts), skip (present but nothing to do or switched off), na (not in the key set)
    function plan(si){const s=SC[si],ks=new Set(s.x_keys),calls=s.calls.map(c=>c.op+' ('+c.dtype+')').join(', ');
      const st={},tx={};
      KEYS.forEach(k=>{st[k]=ks.has(k)?'skip':'na'});
      tx.PythonTLSSnapshot=ks.has('PythonTLSSnapshot')?'Present because an input is a Python tensor subclass: saves the thread-local Python state, then passes the call on.':'Not in the key set: no input is a Python subclass.';
      if(ks.has('PythonTLSSnapshot'))st.PythonTLSSnapshot='on';
      if(si===3){st.AutocastCPU='on';tx.AutocastCPU='Autocast is on: <code>mm</code> is on its lower-precision list, so this kernel casts both inputs to bfloat16 (2 <code>_to_copy</code> calls) and calls <code>mm</code> again below itself.'}
      else tx.AutocastCPU=ks.has('AutocastCPU')?'In the key set but switched off for this thread (autocast is not active): skipped.':'Not in the key set.';
      if(!ks.has('AutogradCPU')){tx.AutogradCPU='Not in the key set: tensors made under <code>inference_mode</code> carry no autograd keys, so this layer is skipped entirely.'}
      else if(s.grad_fn){st.AutogradCPU='on';tx.AutogradCPU='w requires a gradient and grad mode is on: the autograd kernel creates <code>'+s.grad_fn+'</code>, saves what backward will need, then calls <code>mm</code> again below itself.'}
      else{st.AutogradCPU='on';tx.AutogradCPU='The autograd kernel still runs (the key is there), sees that grad mode is off, records nothing (grad_fn None) and passes the call on.'}
      tx.ADInplaceOrView=ks.has('ADInplaceOrView')?'Present, but <code>mm</code> is neither in-place nor a view: a fallthrough, skipped. For views and in-place ops it bumps version counters so autograd can detect stale saved tensors.':'Not in the key set (inference tensors).';
      if(ks.has('Python')){st.Python='on';tx.Python='The subclass\'s <code>__torch_dispatch__</code> runs here, below autograd: it saw <code>'+(s.subclass_saw||[]).join(', ')+'</code>, unwrapped its inner tensor and called the operator again.'}
      else tx.Python='Not in the key set: plain tensors.';
      st.CPU='on';tx.CPU='The CPU kernel does the arithmetic. Calls that reached the bottom: '+calls+'. Output dtype '+s.dtype+', requires_grad '+s.requires_grad+'.';
      return {st,tx,s}}
    let si=0,P=plan(0);
    box.innerHTML=KEYS.map(k=>'<div data-k="'+k+'"><b>'+k+'</b><span class="small"></span></div>').join('');
    const rows=[...box.children],cap=document.getElementById('rd-dsp-cap'),cnt=document.getElementById('rd-dsp-cnt');
    const N=KEYS.length+1;
    function drawDsp(i){rows.forEach((r,k)=>{const key=KEYS[k],st=P.st[key];r.className='';
        if(k<i)r.classList.add(st==='on'?'on':st==='skip'?'skip':'na');else if(k===i)r.classList.add(st==='on'?'on':st==='skip'?'skip':'na');else if(st==='na')r.classList.add('na');
        r.querySelector('span').innerHTML=k<=i?P.tx[key]:(st==='na'?'not in the key set':'')});
      const s=P.s;
      if(i<KEYS.length){const key=KEYS[i];cap.innerHTML='<div class="t">'+(i+1)+' / '+N+'. '+key+': '+(P.st[key]==='on'?'runs':P.st[key]==='skip'?'skipped':'absent')+'</div><p>'+P.tx[key]+'</p>'}
      else cap.innerHTML='<div class="t">'+N+' / '+N+'. Result</div><p>'+(s.grad_fn?'A graph node <code>'+s.grad_fn+'</code> now links the output to w.':'No graph node: this output cannot be backpropagated through.')+' Calls that reached the backend: '+s.calls.length+'.</p>';
      cnt.innerHTML=RD.stat('Keys on the input',s.x_keys.length,s.x_keys.join(', '))+RD.stat('Calls reaching the backend',i>=KEYS.length-1?s.calls.length:'&hellip;',i>=KEYS.length-1?s.calls.map(c=>c.op).join(', '):'')+RD.stat('grad_fn of the output',i>=2?(s.grad_fn||'None'):'&hellip;','')+RD.stat('Output dtype',i>=KEYS.length-1?s.dtype:'&hellip;','')}
    const an=RD.anim({card:'rd-dsp-card',ctl:'rd-dsp-ctl',n:N,draw:drawDsp,ms:2300,label:'Dispatch step'});
    RD.seg(document.getElementById('rd-dsp-seg'),m=>{si=+m;P=plan(si);an.reset(N);an.play()});
  }

  // ---------- section 3 ----------
  const svgBox=document.getElementById('rd-ag-svg');if(!svgBox)return;
  const T=D.tiny,CK=D.tinyck;
  // node list in forward order, from the recorded graph (walk order is loss-first, so reverse the non-AccumulateGrad nodes)
  const fwdNodes=T.nodes.filter(n=>n.name!=='AccumulateGrad').reverse();
  // sizes of saved activations taken from the record: plain saves x, a, h, o (+ W2, a parameter, already in memory)
  const pl=CK.plain.saved,ck=CK.checkpoint.saved;
  const by=(arr,shape,param)=>arr.filter(s=>s[0].join()===shape.join()&&s[2]===!!param).map(s=>s[1]);
  const actBytes=arr=>arr.filter(s=>!s[2]).reduce((a,s)=>a+s[1],0);
  const SAV={plain:{x:by(pl,[8,16])[0],a:by(pl,[8,32])[0],h:by(pl,[8,32])[1],o:by(pl,[8,4])[0],W2:by(pl,[32,4],1)[0]},
             ckpt:{x:by(ck,[8,16])[0],a:0,h:by(ck,[8,32])[0],o:by(ck,[8,4])[0],W2:by(ck,[32,4],1)[0]}};
  const totals={plain:actBytes(pl),ckpt:actBytes(ck)},bcalls={plain:CK.plain.backward_calls.length,ckpt:CK.checkpoint.backward_calls.length};
  // the graph: tensors on the top row, nodes on the bottom row
  const TEN=['x','a','h','o','o²','loss'],ND=[['MmBackward0','x @ W1'],['GeluBackward0','gelu'],['MmBackward0','h @ W2'],['PowBackward0','pow 2'],['MeanBackward0','mean']];
  function steps(m){const S=[],s=SAV[m];
    const F=[[1,'a = x @ W1',m==='plain'?'MmBackward0 is created and saves x ('+s.x+' B), the input it needs to compute W1\'s gradient.':'Inside the checkpointed region: MmBackward0 is created; checkpoint keeps only the region\'s input x ('+s.x+' B).',{0:['x']}],
      [2,'h = gelu(a)',m==='plain'?'GeluBackward0 saves its input a ('+s.a+' B): the derivative of GELU depends on it.':'Still inside the region: a is <b>not</b> kept. Backward will have to recompute it.',m==='plain'?{1:['a']}:{}],
      [3,'o = h @ W2','MmBackward0 saves h ('+s.h+' B) and a reference to W2 (a parameter, already in memory).',{2:['h','W2']}],
      [4,'p = o ** 2','PowBackward0 saves o ('+s.o+' B).',{3:['o']}],
      [5,'loss = p.mean()','MeanBackward0 saves only the input\'s shape. Forward is done: the graph runs from the loss back to W1 and W2.',{}]];
    let held={},made=0;
    F.forEach(f=>{made=f[0];Object.assign(held,f[3]);S.push({ph:'f',made,held:JSON.parse(JSON.stringify(held)),run:-1,t:'Forward: '+f[1],p:f[2],re:0,acc:[]})});
    const B=[[4,'MeanBackward0 runs first: the gradient of a mean spreads 1/32 to each of the 32 elements.',[]],
      [3,'PowBackward0: gradient 2o times the incoming one; o is released.',[]],
      [2,'MmBackward0 (h @ W2): uses h for W2\'s gradient and W2 for h\'s; AccumulateGrad adds the result into W2.grad.',['W2']],
      [1,m==='plain'?'GeluBackward0 uses the saved a; a is released.':'GeluBackward0 needs a, which was not kept: checkpoint re-runs x @ W1 (1 extra mm) to rebuild it, stops there (gelu itself is not re-run), then runs.',[]],
      [0,'MmBackward0 (x @ W1): uses x for W1\'s gradient; AccumulateGrad adds it into W1.grad. All saved tensors are gone.',['W1']]];
    let acc=[],re=0;
    B.forEach(b=>{const k=b[0];delete held[k];acc=acc.concat(b[2]);if(m==='ckpt'&&k===1)re=1;S.push({ph:'b',made:5,held:JSON.parse(JSON.stringify(held)),run:k,t:'Backward: '+ND[k][0],p:b[1],re,acc:acc.slice()})});
    return S}
  let mode='plain',S=steps('plain');
  const cap=document.getElementById('rd-ag-cap'),cnt=document.getElementById('rd-ag-cnt');
  function drawAg(i){const st=S[i],W=RD.width(svgBox),n=5,gap=6,bw=Math.max(54,(W-gap*(n-1))/n),H=196,y0=6,y1=86;
    const c=k=>k*(bw+gap)+bw/2;let b='';
    // tensors row
    TEN.slice(0,5).forEach((t,k)=>{const x=k*(bw+gap);b+='<rect x="'+x+'" y="'+y0+'" width="'+bw+'" height="26" rx="5" fill="var(--soft)" stroke="var(--line)"/>'+RD.t(x+bw/2,y0+17,t,{a:'middle',fs:12})});
    for(let k=0;k<n;k++){const vis=k<st.made;const x=k*(bw+gap);
      const run=st.run===k,done=st.ph==='b'&&st.run>=0&&k>st.run,cur=st.ph==='b'&&k===st.run;
      const fill=!vis?'none':cur?'var(--acc2)':done?'var(--soft)':'var(--bg)',stroke=!vis?'var(--line)':cur?'var(--acc)':'var(--mute)';
      b+='<rect x="'+x+'" y="'+y1+'" width="'+bw+'" height="40" rx="6" fill="'+fill+'" stroke="'+stroke+'" stroke-dasharray="'+(vis?'':'3 3')+'" opacity="'+(vis?1:.4)+'"/>';
      b+=RD.t(x+bw/2,y1+16,vis?ND[k][0].replace('Backward0',''):'',{a:'middle',fs:bw<70?10:11,w:600})+RD.t(x+bw/2,y1+31,vis?'Backward0':'',{a:'middle',fs:10,fill:'var(--mute)'});
      if(vis)b+='<line x1="'+c(k)+'" y1="'+(y0+26)+'" x2="'+c(k)+'" y2="'+y1+'" stroke="var(--line)"/>';
      if(vis&&k>0)b+='<line x1="'+(x)+'" y1="'+(y1+20)+'" x2="'+(x-gap)+'" y2="'+(y1+20)+'" stroke="var(--mute)" marker-end="url(#rdag-ar)"/>';
      // saved tensors as small chips under the node
      const held=st.held[k]||[];held.forEach((h,j)=>{const yy=y1+46+j*20,saved=SAV[mode][h];
        b+='<rect x="'+(x+4)+'" y="'+yy+'" width="'+(bw-8)+'" height="16" rx="3" fill="'+(h==='W2'?'var(--bg)':'var(--hl)')+'" stroke="var(--line)"/>'+RD.t(x+bw/2,yy+12,h+(h==='W2'?' (param)':' '+saved+' B'),{a:'middle',fs:10})});
      if(mode==='ckpt'&&k<2&&vis)b+='<rect x="'+(-2)+'" y="'+(y1-6)+'" width="'+(2*bw+gap+4)+'" height="52" rx="8" fill="none" stroke="var(--c4)" stroke-dasharray="5 3"/>';
    }
    if(mode==='ckpt')b+=RD.t(2,H-4,'dashed box: the checkpointed region',{fs:10,fill:'var(--c4)'});
    svgBox.innerHTML=RD.svg(W,H,'<defs><marker id="rdag-ar" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L6,3L0,6z" fill="var(--mute)"/></marker></defs>'+b,'Autograd graph of a two-layer network');
    const live=Object.values(st.held).flat().filter(h=>h!=='W2').reduce((a,h)=>a+SAV[mode][h],0);
    cap.innerHTML='<div class="t">'+(i+1)+' / '+S.length+'. '+st.t+'</div><p>'+st.p+'</p>';
    cnt.innerHTML=RD.stat('Activations held for backward',fmt(live)+' B','peak '+fmt(totals[mode])+' B in this mode')+RD.stat('Nodes in the graph',st.made+(st.made===5?' + 2 AccumulateGrad':''),'')+
      RD.stat('Recomputed in backward',st.re?'1 mm':'0','')+RD.stat('Backward calls (whole run)',bcalls[mode],'recorded at the backend')}
  const an=RD.anim({card:'rd-ag-card',ctl:'rd-ag-ctl',n:S.length,draw:drawAg,ms:2200,label:'Graph step'});
  RD.seg(document.getElementById('rd-ag-seg'),m=>{mode=m;S=steps(m);an.reset(S.length);an.play()});
  RD.onResize(()=>an.redraw());
  // checkpointing on the running example: three before/after pairs
  const bars=document.getElementById('rd-ck-bars');
  if(bars){const P=D.step,ph=D.phases,MB=b=>(b/1e6).toFixed(2)+' MB';
    const pairs=[['Memory added by forward',P.plain.fwd_added,P.ckpt.fwd_added,MB],['Calls in backward',P.plain.n_bwd,P.ckpt.n_bwd,fmt],['Step time (ms)',ph.cpu.step,ph.cpu_ck.step,v=>v.toFixed(1)+' ms']];
    bars.innerHTML=pairs.map(p=>{const mx=Math.max(p[1],p[2]);return ['Plain','Checkpointed'].map((nm,j)=>'<div class="row'+(j?' hl':'')+'"><div class="nm">'+(j?'':'<b>'+p[0]+'</b><span class="ml">')+nm+(j?'':'</span>')+'</div><div class="track"><div class="fill" style="width:'+(100*p[1+j]/mx).toFixed(1)+'%;background:'+(j?'var(--c4)':'var(--c1)')+'"></div></div><div class="val">'+p[3](p[1+j])+'</div></div>').join('')}).join('')}
})();
