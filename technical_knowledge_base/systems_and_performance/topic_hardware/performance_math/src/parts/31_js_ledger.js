// ---- FLOP and memory ledger tab (t-ledger); formulas in window.PMA (25_js_rd_mem.js), checked against src/recompute.py ----
window.PML=(function(){
  const A=window.PMA,X=window.CALCX,P=window.PMD;
  // per-token training FLOPs by part; conv: full or causal; impl: eager (attention backward 2x) or flash (2.5x); ckpt adds the recompute
  function flops(m,T,conv,ck){
    const lg=A.ledger(m,T),c=conv==='causal'?0.5:1,cf=lg.core_fwd*c,cb=(ck==='eager'?2:2.5)*cf;
    const rec=ck==='ckpt'?((lg.proj+lg.mlp)/3-2*m.h*lg.f*m.L)+cf:0;
    return {proj:lg.proj,mlp:lg.mlp,head:lg.head,core_fwd:cf,core_bwd:cb,rec:rec,model:lg.proj+lg.mlp+lg.head+cf+cb,hw:lg.proj+lg.mlp+lg.head+cf+cb+rec,six_n:lg.six_n,f:lg.f};
  }
  function mem(m,T,mb,ck,tp){const lay=m.L*A.actLayerTok(m,T,ck)*T*mb/tp,post=(A.actPostTok(m)+8)*T*mb;return {layers:lay,post:post,total:lay+post,per_h:A.actLayerTok(m,T,ck)/m.h}}
  // sequence length where the attention core (forward + backward) equals the MLP, per token
  function crossT(m,conv,ck){const f=A.ffOf(m),d=m.nh*m.hd,c=(conv==='causal'?0.5:1)*(1+(ck==='eager'?2:2.5));return 18*m.h*f/(c*4*d)}
  return {flops,mem,crossT};
})();
(function(){
  const X=window.CALCX,A=window.PMA,L=window.PML,P=window.PMD,$=id=>document.getElementById(id);
  const parts=[['proj','Attention projections','var(--c1)'],['mlp','MLP','var(--c3)'],['head','Output head','var(--c4)'],['core_fwd','Attention core forward','var(--c2)'],['core_bwd','Attention core backward','var(--c5)'],['rec','Recompute (hardware only)','var(--c6)']];
  const G=1e9;
  function st(){const T=Math.pow(2,+$('lg-seq').value),mb=+$('lg-mb').value;
    return {key:$('lg-model').value,m:X.M[$('lg-model').value],T:T,mb:mb,conv:$('lg-conv').value,ck:$('lg-ck').value,tp:+$('lg-tp').value,chip:X.C[$('lg-chip').value]}}
  function bar(el,vals,total,ref,refLabel,fmt){const W=RD.width(el),H=64,pl=4,pr=4,mx=Math.max(total,ref||0)*1.08,sx=v=>pl+(W-pl-pr)*v/mx;let b='',acc=0;
    vals.forEach(([v,c])=>{if(v<=0)return;b+='<rect x="'+sx(acc)+'" y="14" width="'+Math.max(0,sx(acc+v)-sx(acc))+'" height="28" fill="'+c+'"/>';acc+=v});
    if(ref){const x=sx(ref);b+='<line x1="'+x+'" x2="'+x+'" y1="4" y2="52" stroke="var(--ink)" stroke-dasharray="4 3"/>'+RD.t(Math.min(x+3,W-120),10,refLabel,{fs:10.5})}
    b+=RD.t(W-pr-2,60,fmt(total),{a:'end',fs:11,w:600});
    el.innerHTML=RD.svg(W,H,b,'Stacked bar');}
  function curve(s){const el=$('lg-curve'),W=RD.width(el),H=210,pl=50,pr=20,pt=10,pb=30;
    const Ts=[];for(let e=9;e<=17;e+=0.25)Ts.push(Math.pow(2,e));
    const ys=Ts.map(T=>L.flops(s.m,T,s.conv,s.ck==='ckpt'?'flash':s.ck).model),mlp=L.flops(s.m,512,s.conv,'flash').mlp,six=L.flops(s.m,512,s.conv,'flash').six_n;
    const lo=Math.min(mlp,six)*0.7,hi=Math.max(...ys)*1.2,lx=v=>pl+(W-pl-pr)*(Math.log2(v)-9)/8,ly=v=>pt+(H-pt-pb)*(1-(Math.log(v)-Math.log(lo))/(Math.log(hi)-Math.log(lo)));
    let b='';[512,2048,8192,32768,131072].forEach(T=>{b+='<line x1="'+lx(T)+'" x2="'+lx(T)+'" y1="'+pt+'" y2="'+(H-pb)+'" stroke="var(--line)"/>'+RD.t(lx(T),H-12,T>=1024?(T/1024)+'K':T,{a:'middle',fs:10,fill:'var(--mute)'})});
    for(let e=Math.floor(Math.log10(lo));e<=Math.floor(Math.log10(hi));e++){[1,2,5].forEach(k=>{const v=k*Math.pow(10,e);if(v<lo||v>hi)return;b+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+ly(v)+'" y2="'+ly(v)+'" stroke="var(--line)"/>'+RD.t(pl-4,ly(v)+4,X.sig(v/G,2),{a:'end',fs:10,fill:'var(--mute)'})})}
    b+='<polyline fill="none" stroke="var(--c1)" stroke-width="2" points="'+Ts.map((T,i)=>lx(T)+','+ly(ys[i])).join(' ')+'"/>';
    b+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+ly(six)+'" y2="'+ly(six)+'" stroke="var(--ink)" stroke-dasharray="5 3"/>'+RD.t(pl+4,ly(six)-4,'6N',{fs:10.5});
    b+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+ly(mlp)+'" y2="'+ly(mlp)+'" stroke="var(--c3)" stroke-dasharray="1 3" stroke-width="2"/>'+RD.t(pl+4,ly(mlp)+12,'MLP alone',{fs:10.5,fill:'var(--c3)'});
    const cx=L.crossT(s.m,s.conv,s.ck==='ckpt'?'flash':s.ck);if(cx>=512&&cx<=131072)b+='<circle cx="'+lx(cx)+'" cy="'+ly(L.flops(s.m,cx,s.conv,s.ck==='ckpt'?'flash':s.ck).model)+'" r="4" fill="var(--c2)"/>';
    const x0=lx(s.T);b+='<line x1="'+x0+'" x2="'+x0+'" y1="'+pt+'" y2="'+(H-pb)+'" stroke="var(--ink)"/>';
    b+=RD.t(pl,H-0,'',{});el.innerHTML=RD.svg(W,H,b,'FLOPs per token against sequence length')+'<div class="small mute">GFLOP per token. Orange dot: attention core equals the MLP, at '+Math.round(cx).toLocaleString('en-US')+' tokens.</div>';}
  function render(){const s=st();$('lg-seq-v').textContent=s.T.toLocaleString('en-US')+' tokens';$('lg-mb-v').textContent=s.mb;
    const f=L.flops(s.m,s.T,s.conv,s.ck),tok=s.T*s.mb;
    $('lg-stats').innerHTML=RD.stat('Model FLOPs per token',X.sig(f.model/G,4)+' GFLOP',X.sig((f.model/f.six_n-1)*100,3)+'% over 6N ('+X.sig(f.six_n/G,4)+')')+
      RD.stat('Attention core share',X.sig((f.core_fwd+f.core_bwd)/f.model*100,3)+'%',s.conv==='causal'?'causal half':'full square')+
      RD.stat('Step FLOPs ('+tok.toLocaleString('en-US')+' tokens)',X.fE(f.hw*tok),s.ck==='ckpt'?'hardware, incl. recompute: '+X.sig(f.hw/f.model,3)+' &times; model':'model = hardware')+
      RD.stat('Time at 40% MFU',X.fT(f.hw*tok/(s.chip.peak.bf16*1e12*0.4)),'one '+s.chip.name);
    bar($('lg-bar'),parts.map(p=>[f[p[0]],p[2]]),f.hw,f.six_n,'6N',v=>X.sig(v/G,4)+' GFLOP');
    $('lg-bar').innerHTML+='<div class="leg">'+parts.map(p=>'<span style="--sw:'+p[2]+'">'+p[1]+'</span>').join('')+'</div>';
    const rows=[['Attention projections (q, k, v, o)',f.proj],['MLP',f.mlp],['Output head',f.head],['Attention core forward',f.core_fwd],['Attention core backward ('+(s.ck==='eager'?'2':'2.5')+' &times; forward)',f.core_bwd]];
    if(s.ck==='ckpt')rows.push(['Recompute (forward again, minus the down projection)',f.rec]);
    $('lg-table').innerHTML='<tr><th>Part</th><th class="num">GFLOP per token</th><th class="num">Share</th></tr>'+rows.map(r=>'<tr><td>'+r[0]+'</td><td class="num">'+X.sig(r[1]/G,4)+'</td><td class="num">'+X.sig(r[1]/f.hw*100,3)+'%</td></tr>').join('')+
      '<tr><td><b>Total</b></td><td class="num"><b>'+X.sig(f.hw/G,4)+'</b></td><td></td></tr>';
    // traced badge
    let tr=null;if(s.conv==='full'&&s.ck==='flash'){if(s.key==='l8'&&P.ledger_l8[s.T])tr=P.ledger_l8[s.T].traced_total;if(s.key==='l70'&&s.T===8192)tr=(1+P.l70_traced_over_6n)*6*s.m.P}
    const bd=$('lg-badge');if(tr){bd.className='lg-badge';bd.textContent='Counted by PyTorch on the real model: '+X.sig(tr/G,5)+' GFLOP per token (formula '+X.sig(f.model/G,5)+')'}else{bd.className='lg-badge off';bd.textContent='Formula only at this setting (traced points: 8B at 2K, 8K, 32K, 128K and 70B at 8K, full count, FlashAttention)'}
    curve(s);
    const mm=L.mem(s.m,s.T,s.mb,s.ck,s.tp),cap=s.chip.mem;
    $('lg-mstats').innerHTML=RD.stat('Per layer, per token',X.sig(mm.per_h,3)+'h bytes','h = '+s.m.h.toLocaleString('en-US')+' (GPT-3 count: 34h)')+
      RD.stat('Layers, per GPU',X.fGB(mm.layers/G),s.m.L+' layers'+(s.tp>1?', / TP '+s.tp:''))+RD.stat('Logits for the loss',X.fGB(mm.post/G),'FP32, vocabulary '+s.m.V.toLocaleString('en-US'))+
      RD.stat('Activations total',X.fGB(mm.total/G),mm.total/G>cap?'more than the '+cap+' GB GPU':(X.sig(mm.total/G/cap*100,2)+'% of '+cap+' GB'));
    bar($('lg-mem'),[[mm.layers,'var(--c1)'],[mm.post,'var(--c2)']],mm.total,cap*G,cap+' GB',v=>X.fGB(v/G));
  }
  ['lg-model','lg-seq','lg-mb','lg-conv','lg-ck','lg-tp','lg-chip'].forEach(id=>$(id).addEventListener('input',render));
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-ledger']=window.TAB_RENDER['t-ledger']||[]).push(render);
  addEventListener('resize',()=>{if(!$('t-ledger').hidden)render()});
})();
