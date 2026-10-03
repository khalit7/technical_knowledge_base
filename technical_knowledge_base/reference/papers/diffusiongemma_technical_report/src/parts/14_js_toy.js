// ---- The toy run as a step animation: one problem, three decoders (multinomial, masked, AR) on the same scale ----
// toyView(id, {problem(), opts()}) builds a makeAnim over #<id>; .rerun() recomputes all three runs.
const TOYV=(function(){
  const C=TD.C,K=TD.K,NB=TD.NB,voc=TD.vocab,isBit=t=>t===0||t===1;
  const short=t=>{const w=voc[t];return w==='[m]'?'[m]':w==='<p>'?'·':w.length>3?w.slice(0,3):w};
  function plan(run,mode,pb,o){const S=[];const ref=pb.ref;
    S.push({t:'Encode the prompt',c:'The causal encoder reads the 45-token prompt ('+(pb.task==='seq'?'task "seq", the rule table and 3 starting bits':'task "conv", the rule table and 24 input bits')+') once and fills the KV cache. Every later pass attends to this cache instead of re-reading the prompt. Prefill is not counted as a pass, as in the paper\'s speed figures.',f:null,kind:'enc'});
    if(mode==='ar'){run.frames.forEach((fr,i)=>{const k=Math.floor(i/C);S.push({t:'AR pass '+(i+1)+': bit '+(i+1),
        c:'The same weights, causal attention only: one forward pass writes one token ('+fr.t+', probability '+fr.conf.toFixed(2)+')'+(fr.t===ref[i]?'':', <b>wrong</b>: the reference is '+ref[i])+'. '+(i<NB-1?'It is appended to the cache and the next pass reads it.':'24 passes for 24 bits: TPF = 1.'),f:fr,kind:'ar',i})});
      S.push({t:'Done',c:'Autoregressive decoding with the diffusion-trained weights: '+NB+' passes, '+run.ans.filter((b,i)=>b===ref[i]).length+' of 24 bits right.',f:null,kind:'end'});return S}
    let lastK=-1;run.frames.forEach((fr,j)=>{
      if(fr.k!==lastK&&fr.k>0)S.push({t:'Encode and append canvas '+fr.k,c:'Canvas '+fr.k+' is final. One causal encoder pass appends its 8 tokens to the KV cache (the K − 1 term of Eq. 10), so canvas '+(fr.k+1)+' can attend to it. Earlier canvases are frozen from now on.',f:null,kind:'app',k:fr.k});
      lastK=fr.k;
      const m=mode==='masked';let c='Mean entropy <b>'+fr.ebar.toFixed(3)+'</b> (stop at '+o.estop+'), temperature '+((o.tmax-o.tmin)*(1-(fr.n-1)/o.N)+o.tmin).toFixed(2)+'. ';
      if(fr.stop)c+='The mean entropy is below the threshold and the prediction equals the previous pass: <b>adaptive stopping</b> ends canvas '+(fr.k+1)+' after '+fr.n+' passes.';
      else if(!fr.U)c+='Pass '+o.N+' is the cap N: the prediction is taken as it is.';
      else{const acc=fr.U.map((u,i)=>u?i:-1).filter(i=>i>=0),es=acc.map(i=>fr.e[i]);const prevU=j>0&&run.frames[j-1].k===fr.k?run.frames[j-1]:null;
        c+='The entropy budget b = '+o.b+' accepts the <b>'+acc.length+'</b> lowest-entropy position'+(acc.length>1?'s':'')+' (entropies '+es.slice(0,4).map(e=>e.toFixed(3)).join(', ')+(es.length>4?', ...':'')+')';
        c+=acc.length<C?'; the other '+(C-acc.length)+(C-acc.length>1?' are ':' is ')+(m?'masked again.':'re-noised with random tokens, so the next pass cannot tell them from real ones.'):'.';
        if(prevU&&prevU.U){const rv=acc.filter(i=>prevU.U[i]&&prevU.next[i]!==fr.next[i]);if(rv.length)c+=' <b>Revised</b>: position'+(rv.length>1?'s ':' ')+rv.map(i=>i+1).join(', ')+' had been accepted last pass and now takes a different value.'}}
      S.push({t:'Canvas '+(fr.k+1)+', pass '+fr.n,c,f:fr,kind:'den',j})});
    const ok=run.ans.filter((b,i)=>b===ref[i]).length;
    S.push({t:'Done',c:(mode==='masked'?'Masked diffusion':'Multinomial diffusion')+': passes per canvas '+run.steps.join(', ')+', plus '+(K-1)+' encode passes: <b>'+run.fwd+'</b> forward passes for 24 tokens, TPF = 24 / '+run.fwd+' = <b>'+(NB/run.fwd).toFixed(2)+'</b>. '+ok+' of 24 bits right'+(ok===NB?' (exact).':'.')+' Revisions during sampling: '+run.revisions+'.',f:null,kind:'end'});
    return S}
  return function(id,src){const modes={multinomial:[],masked:[],ar:[]},runs={};let pb=null,o=null,A=null;
    function rerun(){pb=src.problem();o=src.opts();const Mm=TD.load('multinomial'),Mk=TD.load('masked');
      runs.multinomial=TD.diffuse(Mm,pb.prompt,o);runs.masked=TD.diffuse(Mk,pb.prompt,o);runs.ar=TD.autoregress(Mm,pb.prompt);
      for(const m of ['multinomial','masked','ar'])modes[m].splice(0,modes[m].length,...plan(runs[m],m,pb,o));
      if(src.after)src.after(runs,pb,o);
      if(A){A.st.k=0;A.st.t=RM?1:0;A.st.lk=-1;A.draw()}}
    function state(m,k){// what each canvas shows at step k: {rows:[{inp,pred,conf,U,status,final}], passes, tokens}
      const S=modes[m],run=runs[m],ref=pb.ref;const cv=[...Array(K)].map(()=>({inp:null,pred:null,conf:null,U:null,status:'waiting',final:null}));let passes=0,rev=0,cache=1;
      if(m==='ar'){for(let i=1;i<=k&&i<S.length;i++){const s=S[i];if(s.kind!=='ar')continue;passes++;const kk=Math.floor(s.i/C),c=cv[kk];if(!c.final)c.final=Array(C).fill(null),c.conf=Array(C).fill(0);c.final[s.i%C]=s.f.t;c.conf[s.i%C]=s.f.conf;c.status='writing';if(s.i%C===C-1)c.status='done'}
        return {cv,passes,cache:k>0?1+Math.floor(passes/C):0,ref}}
      let prevFr=null;for(let i=1;i<=k&&i<S.length;i++){const s=S[i];
        if(s.kind==='den'){const fr=s.f,c=cv[fr.k];passes++;c.inp=fr.x;c.pred=fr.xhat;c.conf=fr.conf;c.U=fr.U;c.status='pass '+fr.n;c.accPrev=prevFr&&prevFr.k===fr.k&&prevFr.U?prevFr.U:null;if(fr.stop||!fr.U){c.final=fr.xhat;c.status='done in '+fr.n}prevFr=fr}
        if(s.kind==='app'){passes++;cache++}}
      return {cv,passes,cache:k>0?cache:0,ref}}
    function draw(m,k,e,w){const st=state(m,k),narrow=w<560;const lw=narrow?0:92,cs=Math.min(54,Math.floor((w-lw-4)/C)),gx=lw;let s='',y=4;
      // cache strip
      const cw=(w-4)/(TD.P+NB);s+=tx(0,y+11,'KV cache',{fs:11,c:'var(--mute)'});y+=16;
      for(let i=0;i<TD.P+NB;i++){const filled=i<TD.P?st.cache>0:(st.cache-1)*C>i-TD.P;s+=rc(2+i*cw,y,Math.max(1,cw-1),10,i<TD.P?'var(--dim)':'var(--c1)',{r:1,op:filled?(i<TD.P?1:.8):.12})}
      y+=22;
      st.cv.forEach((c,kk)=>{const lab='Canvas '+(kk+1)+' · '+c.status;
        if(narrow){s+=tx(0,y+11,lab,{fs:11,c:'var(--mute)'});y+=16}else s+=tx(0,y+cs*0.55,'Canvas '+(kk+1),{fs:12,w:600})+tx(0,y+cs*0.55+15,c.status,{fs:11,c:'var(--mute)'});
        for(let i=0;i<C;i++){const x=gx+i*cs;
          // input row (diffusion only)
          if(m!=='ar'){const t=c.inp?c.inp[i]:null;const noise=t!=null&&!(c.accPrev&&c.accPrev[i]);
            s+=rc(x+1,y,cs-2,cs*0.46,'var(--soft)',{s:'var(--line)',r:3});
            if(c.final)s+=tx(x+cs/2,y+cs*0.32,'',{fs:11});
            else if(t!=null)s+='<text x="'+(x+cs/2).toFixed(1)+'" y="'+(y+cs*0.32).toFixed(1)+'" font-size="'+(cs<30?11:12)+'" text-anchor="middle" fill="'+(noise?'var(--mute)':'var(--ink)')+'"'+(noise?' font-style="italic"':'')+'>'+short(t)+'</text>'}
          const y2=m==='ar'?y:y+cs*0.5,hh=m==='ar'?cs*0.8:cs*0.5;
          const pv=c.final?c.final[i]:(c.pred?c.pred[i]:null),cf=c.conf?c.conf[i]:0;
          s+=rc(x+1,y2,cs-2,hh-2,pv==null?'none':'var(--c1)',{r:3,op:pv==null?1:(0.15+0.85*cf),s:pv==null?'var(--line)':undefined,da:pv==null?'3 3':undefined});
          if(c.U&&c.U[i]&&!c.final)s+=rc(x+1,y2,cs-2,hh-2,'none',{s:'var(--c2)',sw:2.4,r:3});
          if(pv!=null){const wrong=c.final&&isBit(pv)&&pv!==st.ref[kk*C+i];s+='<text x="'+(x+cs/2).toFixed(1)+'" y="'+(y2+hh/2+3).toFixed(1)+'" font-size="'+(cs<30?11:13)+'" text-anchor="middle" font-weight="600" fill="'+(cf>0.55?'#fff':'var(--ink)')+'">'+short(pv)+'</text>';
            if(wrong)s+=ln2(x+5,y2+hh-5,x+cs-5,y2+hh-5,'var(--bad)',{sw:2.5})}}
        y+=(m==='ar'?cs*0.8:cs)+(narrow?6:10)});
      return svgW(w,y+2,G(1,s),'Toy DiffusionGemma decoding')}
    function counters(m,k){const st=state(m,k),run=runs[m];const done=st.cv.filter(c=>c.final&&(m!=='ar'||c.status==='done')).length;
      const toks=m==='ar'?st.passes:done*C;const last=k>=modes[m].length-1;const ok=last?run.ans.filter((b,i)=>b===pb.ref[i]).length:null;
      return stat('Forward passes',st.passes,m==='ar'?'one per token':'denoise + encode')+stat('Final tokens',toks+' / 24','')+stat('TPF so far',st.passes?(toks/st.passes).toFixed(2):'0','AR = 1')+(m!=='ar'?stat('Revisions',last?run.revisions:'...','accepted, then changed'):'')+stat('Correct bits',ok==null?'...':ok+' / 24','against the rule')}
    rerun();A=makeAnim({id,modes,mode:'multinomial',draw,counters,dur:1500});
    return {rerun,runs:()=>runs,anim:A}}})();
