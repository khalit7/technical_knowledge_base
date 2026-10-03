// ---- The paper tab: animations, the gate, the scan, IO and memory calculators, inline charts ----
const RCX=PAPER.rc,TBX=PAPER.tables,MV=window.MBW.variants,PB=PAPER.rc.probe;
const TOKC=['var(--dim)','var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)','var(--c7)','var(--c8)','var(--ink)'];
const pct=(v,d)=>(v*100).toFixed(d==null?(v>0.999&&v<1?2:1):d)+'%';
// measured toy numbers written into the prose
document.querySelectorAll('.rv').forEach(e=>{const [v,k]=e.dataset.k.split('.');const r=MV[v]&&MV[v].res_q;if(r)e.textContent=pct(r[k])});

// ---------- 1. Compression: KV cache against a fixed state ----------
(function(){
  const words=['The','cat','um','sat','on','uh','the','mat','and','um','purred','.'],fill=new Set([2,5,9]),T=words.length;
  const M=RCX.mem_28,kv=M.kv_per_token,st=M.state_bytes;
  const steps=k=>{const a=[];for(let i=0;i<T;i++)a.push({t:'token '+(i+1)+', "'+words[i]+'"',c:''});a.push({t:'the same at 2,048 tokens',c:''});return a};
  const cap={attn:i=>i<T?'The Transformer appends this token\'s key and value, for every layer, to its cache, and reads all '+(i+1)+' cached entries to produce the next output. Memory and per-token work both grow with the sequence; nothing is ever dropped, so recall is exact.':'At the 2,048-token prompts of the paper\'s throughput test the cache is '+fmtBytes(M.kv_2048)+' per sequence, '+M.ratio_2048+' times Mamba-2.8B\'s state: that is what limits the batch size.',
    ssm:i=>i<T?(fill.has(i)?'"'+words[i]+'" is filler: in the paper\'s reading, a selective Δ near 0 leaves the state almost unchanged and the token is skipped. ':'Mamba folds the token into its fixed state. ')+'Memory stays '+fmtBytes(st)+' and the work per token is constant, whatever came before. At this length the state is still larger than the cache would be: the crossover is at '+M.crossover_tokens+' tokens.':'At 2,048 tokens the state is unchanged, '+fmtBytes(st)+'; the price is that whatever the state did not keep cannot be recovered, the limit later work measured on copying and recall.'};
  const modes={attn:steps(),ssm:steps()};modes.attn.forEach((s,i)=>s.c=cap.attn(i));modes.ssm.forEach((s,i)=>s.c=cap.ssm(i));
  makeAnim({id:'cmp',mode:'attn',modes,dur:1600,
    draw(m,k,e,W){const pad=4,cw=(W-2*pad)/T,H=210;let s='';
      for(let i=0;i<T;i++){const on=i<k||(i===k);const op=i<k?1:i===k?e:.25,x=pad+i*cw;
        const f=m==='ssm'&&fill.has(i);s+=G(op,rc(x+1,6,cw-2,26,f?'var(--soft)':'var(--acc2)',{s:i===k&&k<T?'var(--acc)':'var(--line)'})+tx(x+cw/2,23,words[i],{fs:11,a:'middle',c:f?'var(--mute)':null}))}
      if(k>=T){// final: bars to scale
        const bw=W-2*pad,r=M.ratio_2048;s+=tx(pad,62,'Per sequence at 2,048 tokens, to scale:',{fs:12});
        s+=rc(pad,72,bw*e,22,'var(--c2)')+tx(pad+6,87,'KV cache '+fmtBytes(M.kv_2048),{fs:11,c:'var(--bg)'});
        s+=rc(pad,104,Math.max(2,bw/r),22,'var(--c1)')+tx(pad+bw/r+6,119,'Mamba state '+fmtBytes(st),{fs:11});
        return svgW(W,140,s,'memory at 2048 tokens')}
      const unit=(W-2*pad)/Math.max(M.crossover_tokens,T+1)*0.98;// one token's KV cache, so the state is 38 units wide
      if(m==='attn'){s+=tx(pad,56,'KV cache (one block per token, to scale with the state below)',{fs:11,c:'var(--mute)'});
        const n=k+1;for(let i=0;i<n;i++){const op=i<k?1:e;s+=G(op,rc(pad+i*unit,64,unit-1.5,40,'var(--c2)',{r:2}))}
        for(let i=0;i<n;i++)s+=G(.35*e,ln2(pad+k*cw+cw/2,32,pad+i*unit+unit/2,64,'var(--c2)',{sw:1}));
        s+=G(.35,rc(pad,120,unit*M.crossover_tokens,40,'none',{s:'var(--c1)',da:'4 3',r:3}))+tx(pad+4,178,'outline: the size of Mamba-2.8B\'s whole state ('+M.crossover_tokens+' tokens of cache)',{fs:11,c:'var(--mute)'})}
      else{s+=tx(pad,56,'Fixed state (the same size at every step)',{fs:11,c:'var(--mute)'});
        const w=unit*M.crossover_tokens,hue=fill.has(k)?0:e;s+=rc(pad,64,w,40,'var(--c1)',{op:.55+.35*Math.abs(Math.sin((k+hue)*1.3))});
        if(!fill.has(k))s+=G(.6*(1-Math.abs(2*e-1)),ln2(pad+k*cw+cw/2,32,pad+w/2,64,'var(--c1)',{sw:2}));
        s+=tx(pad+6,89,'SSM state + conv buffer: '+fmtBytes(st),{fs:11,c:'var(--bg)'});
        s+=G(.35,rc(pad,120,unit*(k+1),40,'none',{s:'var(--c2)',da:'4 3',r:3}))+tx(pad+4,178,'outline: a Transformer\'s cache after '+(k+1)+' token'+(k?'s':''),{fs:11,c:'var(--mute)'})}
      return svgW(W,H-20,s,'memory per sequence')},
    counters(m,k){const n=Math.min(k+1,T),t=k>=T?2048:n;return stat('tokens seen',fmt(t))+stat('Transformer KV cache',fmtBytes(t*kv),'2 × 32 layers × 2,560 × 2 bytes per token')+stat('Mamba state',fmtBytes(st),'constant')+stat('reads to make the next token',m==='attn'?fmt(t)+' cached token'+(t>1?'s':''):'1 state',m==='attn'?'grows with length':'constant')}});
})();

// ---------- 2. Selective copying through two real toy models ----------
(function(){
  let seed=7,inp=null,runs={};
  function make(){const r=mulberry32(seed);inp=MB.makeSC(r);const marks=[];for(let i=0;i<6;i++)marks.push(48+i);
    ['sc_s6','sc_s4'].forEach(v=>{const M=MB.load(v);const o=MB.run(M,inp.x,{want:true});runs[v]={o,pred:marks.map(t=>MB.argmax(o.logits[t]))}});
    let mx=0;['sc_s6','sc_s4'].map(v=>runs[v]).forEach(R=>R.o.steps.forEach(s=>{mx=Math.max(mx,s[0].mean)}));runs.mx=mx}
  make();
  const stops=()=>[0].concat(inp.pos.map(p=>p+1),[54,54]);
  function steps(){const a=[{t:'the input',c:''}];inp.pos.forEach((p,j)=>a.push({t:'data token '+(j+1)+' of 6 (position '+(p+1)+')',c:''}));a.push({t:'the 6 markers: the model answers',c:''});a.push({t:'result',c:''});return a}
  const modes={s6:steps(),s4:steps()};
  function fillCaps(){const S6=runs.sc_s6,S4=runs.sc_s4;const ok=v=>runs[v].pred.filter((p,i)=>p===inp.y[i]).length;
    const md=(v,data)=>{let s=0,n=0;runs[v].o.steps.forEach((st,t)=>{if(t<48&&(inp.x[t]!==0)===data){s+=st[0].mean;n++}});return n?s/n:0};
    ['s6','s4'].forEach(m=>{const v='sc_'+m;modes[m]=steps();modes[m][0].c='Six coloured tokens are scattered among noise at random positions; after them come six markers, and at each marker the model must output the next data token in order. Nothing in the spacing says where the tokens are: the model has to notice them by content.';
      inp.pos.forEach((p,j)=>{modes[m][j+1].c=m==='s6'?(j===0?'The token enters the state through B<sub>t</sub>, and Δ<sub>t</sub> sets how strongly it is written and how fast the state decays. The paper reads Δ as a gate (large on what matters, near zero on noise); this trained toy did not learn that textbook pattern: averaged over channels Δ is about the same on data and noise ('+PB.delta[0].data+' against '+PB.delta[0].noise+' in layer 1). ':'')+(j===1?'Instead Δ varies with context. In layer 2 (the heat map) it drifts with position: the largest channel correlation is '+PB.corr_position_layer2+' with position against '+PB.corr_is_data_layer2+' with "this is a data token", a clock the model can use to keep the tokens in order. ':'')+(j===2?'It still depends on selection: freeze Δ at its average and held-out accuracy falls from '+pct(PB.base)+' to '+pct(PB.freeze_delta_layer1)+' (layer 1) or '+pct(PB.freeze_delta_layer2)+' (layer 2); freezing B in layer 1 gives '+pct(PB.freeze_B_layer1)+', freezing C in layer 2 '+pct(PB.freeze_C_layer2)+'. ':'')+(j>2?'Each data token is written into its own directions of the state (the grid), which the markers read back through C<sub>t</sub>. ':''):(j===0?'Δ, B and C are learned constants: every token, data or noise, is written with the same step and the same decay at every position (the heat map is flat along each row). The state is a fixed-kernel convolution of the whole input.':'Nothing in the layer can tell a data token from noise; only the block\'s gate and projections, which act on one position at a time, see the content.')});
      modes[m][7].c=m==='s6'?'At the markers the model reads the state out through C<sub>t</sub>. It answers '+ok(v)+' of 6 correctly on this input.':'Reading the state out, the time-invariant model has to undo a blur of every token it saw. It answers '+ok(v)+' of 6 correctly on this input.';
      modes[m][8].c='On 1,000 fresh sequences this '+(m==='s6'?'selective':'time-invariant')+' model gets '+pct(MV[v].res_q.tok)+' of copied tokens and '+pct(MV[v].res_q.seq)+' of whole sequences right (the paper, at length 4,096: '+(m==='s6'?'99.8%':'56.4%')+'). Same block, same training: only Δ, B and C differ.'})}
  fillCaps();
  const A=makeAnim({id:'sel',mode:'s6',modes,dur:1800,
    draw(m,k,e,W){const R=runs['sc_'+m],L=54,pad=2,cw=(W-2*pad)/L,st=stops();const from=st[Math.max(0,k-1)],to=st[k];
      const upto=k===0?0:Math.round(from+(to-from)*e);let s='';
      for(let t=0;t<L;t++){const v=inp.x[t],x=pad+t*cw;s+=rc(x+.5,4,cw-1,16,TOKC[v],{r:1.5,op:t<upto||k===0?1:.35});if(v===9)s+=tx(x+cw/2,16,'▸',{fs:11,a:'middle',c:'var(--bg)'})}
      // Delta heat map, layer 2: 64 channels x positions, each channel scaled to its own maximum in this run
      const by=26,ch=W<500?1.5:2,dl=R.o.steps;
      if(!R.cmax){R.cmax=new Float64Array(64);dl.forEach(st=>{for(let c=0;c<64;c++)R.cmax[c]=Math.max(R.cmax[c],st[1].delta[c])})}
      for(let t=0;t<Math.min(upto,L);t++){const dv=dl[t][1].delta;for(let c=0;c<64;c++){const v=dv[c]/R.cmax[c];s+=rc(pad+t*cw,by+c*ch,cw+.3,ch+.3,'var(--c4)',{r:0,op:(0.08+0.92*v).toFixed(2)})}}
      s+=rc(pad,by,W-2*pad,64*ch,'none',{s:'var(--line)',r:0});
      s+=tx(pad,by+64*ch+14,'Δ of layer 2 (rows: 64 channels)',{fs:11,c:'var(--mute)'});
      const bh=64*ch-46;
      // state grid of layer 1 at position upto-1
      const gy=by+64*ch+22,gh=W<500?3:4,gw=(W-2*pad)/64;const t0=Math.max(0,upto-1),hv=R.o.steps[t0][0].h;let mx=1e-9;for(const v of hv)mx=Math.max(mx,Math.abs(v));
      for(let c=0;c<64;c++)for(let n=0;n<16;n++){const v=upto?hv[c*16+n]:0;if(Math.abs(v)<mx*.04)continue;s+=rc(pad+c*gw,gy+n*gh,gw,gh,v>0?'var(--c1)':'var(--c2)',{r:0,op:Math.min(1,Math.abs(v)/mx).toFixed(2)})}
      s+=rc(pad,gy,W-2*pad,16*gh,'none',{s:'var(--line)',r:0});s+=tx(pad,gy+16*gh+14,'state h, layer 1, after position '+(upto||0),{fs:11,c:'var(--mute)'});
      // outputs
      const oy=gy+16*gh+26;if(k>=7){const ow=Math.min(40,(W-2*pad)/6.5);s+=tx(pad,oy+12,'answers:',{fs:11});
        for(let i=0;i<6;i++){const p=R.pred[i],ok=p===inp.y[i],x=pad+60+i*(ow+4);const op=k>7?1:cl01(e*6-i);
          s+=G(op,rc(x,oy,ow,18,TOKC[p]||'var(--soft)',{s:ok?'var(--good)':'var(--bad)',sw:2})+tx(x+ow/2,oy+31,ok?'✓':'✗ '+'',{fs:12,a:'middle',c:ok?'var(--good)':'var(--bad)'}))}}
      return svgW(W,oy+40,s,'selective copying through the toy model')},
    counters(m,k){const R=runs['sc_'+m],st=stops(),t=st[k];const ok=k>=7?R.pred.filter((p,i)=>p===inp.y[i]).length:0;
      let dd=0,dn=0,nd=0,nn=0;for(let i=0;i<Math.min(t,48);i++){const d=R.o.steps[i][0].mean;if(inp.x[i]){dd+=d;nd++}else{dn+=d;nn++}}
      return stat('position',fmt(Math.min(t,54))+' of 54')+stat('mean Δ, data / noise',nd&&nn?(dd/nd).toFixed(3)+' / '+(dn/nn).toFixed(3):'not yet')+stat('answers right',k>=7?ok+' of 6':'not yet')+stat('state size','2 × 64 × 16','fixed, any length')}});
  $('selNew').addEventListener('click',()=>{seed=(seed*7919+13)%100003;make();fillCaps();if(A){A.st.k=0;A.st.t=RM?1:0;A.st.lk=-1;A.draw()}});
})();

// ---------- 3. Delta as a gate (Theorem 1) ----------
(function(){
  const sp=z=>z>20?z:Math.log1p(Math.exp(z)),sg=z=>1/(1+Math.exp(-z));
  function draw(W){const z=+$('gateZ').value;$('gateZv').textContent=z.toFixed(2);
    const H=200,pl=36,pr=10,pt=10,pb=28,X=v=>pl+(W-pl-pr)*(v+6)/12,Y=v=>pt+(H-pt-pb)*(1-Math.min(v,2.5)/2.5);let s='';
    [0,.5,1,1.5,2,2.5].forEach(v=>{s+=ln2(pl,Y(v),W-pr,Y(v),'var(--line)')+tx(pl-5,Y(v)+4,v,{fs:11,a:'end',c:'var(--mute)'})});
    [-6,-3,0,3,6].forEach(v=>{s+=tx(X(v),H-pb+15,v,{fs:11,a:'middle',c:'var(--mute)'})});s+=tx((pl+W)/2,H-2,'z',{fs:11,a:'middle',c:'var(--mute)'});
    const path=(f,c,da)=>{let d='';for(let i=0;i<=120;i++){const v=-6+i/10;d+=(i?'L':'M')+X(v).toFixed(1)+' '+Y(f(v)).toFixed(1)}return '<path d="'+d+'" fill="none" stroke="'+c+'" stroke-width="2"'+(da?' stroke-dasharray="'+da+'"':'')+'/>'};
    s+=path(v=>1-sg(v),'var(--c2)')+path(sg,'var(--c1)')+path(sp,'var(--c3)','5 4');
    const pts=[[1-sg(z),'var(--c2)'],[sg(z),'var(--c1)'],[sp(z),'var(--c3)']];pts.forEach(([v,c])=>{s+='<circle cx="'+X(z)+'" cy="'+Y(v)+'" r="4" fill="'+c+'"/>'});
    const lg=legend([['Ā = exp(−Δ): keep the state','var(--c2)'],['B̄ = 1 − Ā = σ(z): write the token (theorem)','var(--c1)'],['B̄ = Δ (released code)','var(--c3)','5 4']],pl,H+14,W-pl);
    $('gateSvg').innerHTML=svgW(W,H+lg.h+6,s+lg.s,'gate curves');
    $('gateOut').innerHTML=stat('Δ = softplus(z)',sp(z).toFixed(3))+stat('Ā = exp(Δ · (−1))',(1-sg(z)).toFixed(3),'share of the old state kept')+stat('B̄, zero-order hold',sg(z).toFixed(3),'= g in Theorem 1')+stat('B̄, released code',sp(z).toFixed(3),sp(z)>sg(z)+.005?'larger than the gate':'about the gate')}
  fit($('gateSvg'),draw);$('gateZ').addEventListener('input',()=>refit($('gateSvg')));
})();

// ---------- 4. Sequential loop against the Blelloch scan ----------
(function(){
  const r=mulberry32(11),n=8,E=[];for(let i=0;i<n;i++)E.push([+(0.3+0.65*r()).toFixed(2),+(2*r()-1).toFixed(2)]);
  const comb=(p,q)=>[p[0]*q[0],q[0]*p[1]+q[1]];// p then q
  const seqH=[];let h=0;E.forEach(([a,b])=>{h=a*h+b;seqH.push(h)});
  // Blelloch levels, each a list of [i, j] (combine) and the array after it
  const lev=[],x=E.map(e=>e.slice());lev.push({ops:[],arr:x.map(v=>v.slice()),name:'start: (Ā_t, B̄_t x_t) pairs'});
  for(let d=1;d<n;d*=2){const ops=[];for(let j=2*d-1;j<n;j+=2*d){const i=j-d;x[j]=comb(x[i],x[j]);ops.push([i,j])}lev.push({ops,arr:x.map(v=>v.slice()),name:'up-sweep, stride '+d})}
  x[n-1]=[1,0];lev.push({ops:[],arr:x.map(v=>v.slice()),name:'clear the root to the identity (1, 0)',clear:true});
  for(let d=n/2;d>=1;d/=2){const ops=[];for(let j=2*d-1;j<n;j+=2*d){const i=j-d,t=x[i];x[i]=x[j];x[j]=comb(x[j],t);ops.push([i,j])}lev.push({ops,arr:x.map(v=>v.slice()),name:'down-sweep, stride '+d})}
  const fin=x.map((p,i)=>comb(p,E[i]));lev.push({ops:E.map((_,i)=>[i,i]),arr:fin,name:'combine each prefix with its own element',final:true});
  const parH=fin.map(p=>p[1]),err=Math.max(...parH.map((v,i)=>Math.abs(v-seqH[i])));
  const work={seq:n,par:lev.reduce((a,l)=>a+l.ops.length,0)};
  const modes={seq:E.map((_,i)=>({t:'h'+'₀₁₂₃₄₅₆₇'[i]+' = Ā·h + B̄x',c:i===0?'The loop starts from h = 0 and applies one update per position: h<sub>t</sub> = Ā<sub>t</sub> h<sub>t−1</sub> + B̄<sub>t</sub> x<sub>t</sub>. Each step needs the previous one, so 8 positions take 8 dependent steps; a million positions take a million.':'Step '+(i+1)+' waits for step '+i+'. The work is minimal (one multiply-add per position) but nothing runs in parallel.'})),
    par:lev.map((l,i)=>({t:l.name,c:i===0?'Each position becomes a pair (a, b) meaning "h ↦ a h + b". Two consecutive pairs compose into one: (a₁, b₁) then (a₂, b₂) = (a₁a₂, a₂b₁ + b₂). Because this is associative, the prefixes can be built as a tree.':l.clear?'The up-sweep left the composition of the whole block at the root. Replace it with the identity and walk back down.':l.final?'Every position now holds the composition of everything before it; one more combine with its own pair gives h<sub>t</sub>. All 8 match the loop (largest difference '+err.toExponential(1)+'), in '+(lev.length-1)+' parallel steps instead of 8: for length L the depth is about 2 log₂ L.':(l.name.startsWith('up')?'Combine pairs that are '+l.name.split('stride ')[1]+' apart, all at once: each right element now summarises its block.':'Pass prefixes down: the left child takes the parent\'s prefix, the right child the parent\'s prefix followed by the left block. All combines at this level are independent.')}))};
  makeAnim({id:'scn',mode:'seq',modes,dur:1700,
    draw(m,k,e,W){const pad=4,cw=(W-2*pad)/n,rowH=32;let s='';
      for(let i=0;i<n;i++)s+=tx(pad+i*cw+cw/2,12,'t = '+i,{fs:11,a:'middle',c:'var(--mute)'});
      if(m==='seq'){// input row and output row
        E.forEach(([a,b],i)=>{s+=rc(pad+i*cw+2,20,cw-4,26,'var(--soft)',{s:'var(--line)'})+tx(pad+i*cw+cw/2,37,b.toFixed(2),{fs:11,a:'middle'})});
        s+=tx(pad,62,'inputs B̄x (Ā between 0.30 and 0.95)',{fs:11,c:'var(--mute)'});
        for(let i=0;i<=k;i++){const op=i<k?1:e;s+=G(op,rc(pad+i*cw+2,74,cw-4,26,'var(--acc2)',{s:'var(--acc)'})+tx(pad+i*cw+cw/2,91,seqH[i].toFixed(2),{fs:11,a:'middle'}));if(i>0)s+=G(op,ln2(pad+(i-1)*cw+cw-2,87,pad+i*cw+2,87,'var(--acc)',{sw:1.5}))}
        s+=tx(pad,116,'states h_t, one after another',{fs:11,c:'var(--mute)'});return svgW(W,124,s,'sequential scan')}
      const show=Math.min(k,lev.length-1);
      for(let li=0;li<=show;li++){const L=lev[li],y=20+li*rowH,op=li<show?1:e;
        L.arr.forEach((p,i)=>{const hit=L.ops.some(o=>o[1]===i||(L.name.startsWith('down')&&o[0]===i));s+=G(li===0||li<show?1:(hit?op:1),rc(pad+i*cw+2,y,cw-4,22,L.final?'var(--acc2)':hit?'var(--hl)':'var(--soft)',{s:L.final?'var(--acc)':'var(--line)'})+tx(pad+i*cw+cw/2,y+15,p[1].toFixed(2),{fs:11,a:'middle'}))});
        L.ops.forEach(([i,j])=>{if(i!==j)s+=G(op*.8,ln2(pad+i*cw+cw/2,y-10,pad+j*cw+cw/2,y,'var(--acc)',{sw:1.4}))})}
      return svgW(W,24+(show+1)*rowH,s,'parallel scan')},
    counters(m,k){if(m==='seq')return stat('dependent steps',(k+1)+' of 8')+stat('combines',k+1)+stat('h₇ (loop)',k===7?seqH[7].toFixed(4):'not yet');
      const done=lev.slice(0,k+1).reduce((a,l)=>a+l.ops.length,0);return stat('parallel steps',k+' of '+(lev.length-1))+stat('combines so far',done,'work stays O(L): '+work.par+' for 8')+stat('h₇ (scan)',k===lev.length-1?parH[7].toFixed(4):'not yet',k===lev.length-1?'loop: '+seqH[7].toFixed(4):'')}});
})();

// ---------- 5. IO count of the scan ----------
(function(){
  function io(L,D,N){const naive=2*L*D+2*L*N+D*N+2*L*D*N+3*L*D*N+L*D*N+L*N+L*D,fused=3*L*D+2*L*N+D*N;return [naive,fused]}
  function draw(W){const L=2**+$('ioL').value,N=+$('ioN').value,D=+$('ioD').value;$('ioLv').textContent=fmt(L);$('ioNv').textContent=N;$('ioDv').textContent=fmt(D);
    const [a,b]=io(L,D,N),bw=W-150;let s='';s+=tx(0,16,'naive',{fs:12})+rc(70,4,bw,18,'var(--c2)')+tx(76,17,fmtBytes(2*a),{fs:11,c:'var(--bg)'});
    s+=tx(0,46,'fused',{fs:12})+rc(70,34,Math.max(2,bw*b/a),18,'var(--c1)')+tx(70+Math.max(2,bw*b/a)+6,47,fmtBytes(2*b),{fs:11});
    $('ioSvg').innerHTML=svgW(W,60,s,'HBM traffic');
    $('ioOut').innerHTML=stat('naive HBM traffic',fmtBytes(2*a),'≈ 6 L·D·N elements, bf16')+stat('fused',fmtBytes(2*b),'≈ 3 L·D elements')+stat('ratio',(a/b).toFixed(1)+'×','about 2N')}
  fit($('ioSvg'),draw);['ioL','ioN','ioD'].forEach(i=>$(i).addEventListener(i==='ioL'?'input':'change',()=>refit($('ioSvg'))));
})();

// ---------- 6. The block diagram ----------
(function(){
  let mode='mamba';const P=RCX.twelve_d2;
  function box(x,y,w,h,t,cls){return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="6" class="'+(cls||'box')+'"/>'+tx(x+w/2,y+h/2+4,t,{fs:12,a:'middle'})}
  const ar=(x1,y1,x2,y2)=>ln2(x1,y1,x2,y2,'var(--mute)',{sw:1.4});
  function draw(W){const cx=W/2,bw=Math.min(120,W*.3),L=cx-bw-14,R=cx+14,H=300;let s='';
    s+=tx(cx,H-6,'input x',{fs:11,a:'middle',c:'var(--mute)'})+tx(cx,14,'output',{fs:11,a:'middle',c:'var(--mute)'});
    if(mode==='mamba'){s+=box(L,236,bw,28,'Linear (×E)')+box(R,236,bw,28,'Linear (×E)')+box(L,190,bw,28,'Conv (k = 4)','boxa')+box(L,148,bw,28,'σ (SiLU)')+box(L,104,bw,30,'selective SSM','boxc')+box(R,148,bw,28,'σ (SiLU)')+box(cx-bw/2,24,bw,28,'Linear (to D)');
      s+=ar(L+bw/2,236,L+bw/2,218)+ar(L+bw/2,190,L+bw/2,176)+ar(L+bw/2,148,L+bw/2,134)+ar(R+bw/2,236,R+bw/2,176)+ar(L+bw/2,104,cx-8,76)+ar(R+bw/2,148,cx+8,76)+'<circle cx="'+cx+'" cy="70" r="9" class="box"/>'+tx(cx,74,'⊗',{fs:12,a:'middle'})+ar(cx,61,cx,52)+ar(cx,H-18,L+bw/2,264)+ar(cx,H-18,R+bw/2,264)}
    else if(mode==='mlp'){s+=box(L,236,bw,28,'Linear (×E)')+box(R,236,bw,28,'Linear (×E)')+box(R,148,bw,28,'σ (SiLU)')+box(cx-bw/2,24,bw,28,'Linear (to D)');
      s+=ar(L+bw/2,236,cx-8,76)+ar(R+bw/2,236,R+bw/2,176)+ar(R+bw/2,148,cx+8,76)+'<circle cx="'+cx+'" cy="70" r="9" class="box"/>'+tx(cx,74,'⊗',{fs:12,a:'middle'})+ar(cx,61,cx,52)+ar(cx,H-18,L+bw/2,264)+ar(cx,H-18,R+bw/2,264)}
    else{s+=box(L,236,bw,28,'Linear')+box(R,236,bw,28,'Linear')+box(L,190,bw,28,'Conv (shift SSM)','boxa')+box(cx-bw/2,104,bw,30,'SSM (LTI)','boxc')+box(cx-bw/2,24,bw,28,'Linear');
      s+=ar(L+bw/2,236,L+bw/2,218)+ar(L+bw/2,190,cx-8,166)+ar(R+bw/2,236,cx+8,166)+'<circle cx="'+cx+'" cy="160" r="9" class="box"/>'+tx(cx,164,'⊗',{fs:12,a:'middle'})+ar(cx,151,cx,134)+ar(cx,104,cx,80)+'<circle cx="'+cx+'" cy="70" r="9" class="box"/>'+tx(cx,74,'⊗',{fs:12,a:'middle'})+ar(cx,61,cx,52)+ar(cx,H-18,L+bw/2,264)+ar(cx,H-18,R+bw/2,264)+tx(R+bw+2,70,'⊗ third projection',{fs:11,c:'var(--mute)'})}
    $('blkSvg').innerHTML=svgW(W,H,s,'block diagram');
    const d=P.d,per=P.two_blocks/2;
    $('blkOut').innerHTML=mode==='mamba'?stat('parameters per block (D = 2,560)',fmt(per),'projections 6D² = '+fmt(6*d*d))+stat('two blocks against 12D²',(P.ratio).toFixed(3)+'×',fmt(P.two_blocks)+' against '+fmt(P.twelve_d2))+stat('SSM-specific share',P.ssm_extra_pct+'%','conv, Δ, B, C projections, A, skip')
      :mode==='mlp'?stat('what Mamba adds','conv + SSM','on the main branch, before the gate')+stat('with E = 2','6D²','the same projection budget as Mamba')
      :stat('what Mamba changes','first gate → σ','and one homogeneous block instead of H3 + MLP')+stat('SSM','LTI (S4)','Mamba makes it selective')}
  segBind('blkM',m=>{mode=m;refit($('blkSvg'))});fit($('blkSvg'),draw);
})();

// ---------- 7. Zero-shot average against size ----------
function sizeOf(n){const m=n.match(/([\d.]+)\s*([MB])\b/i);return m?(+m[1])*(m[2].toUpperCase()==='B'?1e9:1e6):null}
onTab('t-read',()=>fit($('zsSvg'),W=>{const rows=TBX.t3.rows,H=250,pl=40,pr=12,pt=10,pb=34;const F=logFrame({W,H,pl,pr,pt,pb,x:[1e8,1e10],y:[1,1],xt:[[1e8,'100M'],[3e8,'300M'],[1e9,'1B'],[3e9,'3B'],[1e10,'10B']],yt:[],xl:'parameters (log scale)'});
  const Y=v=>pt+(H-pt-pb)*(1-(v-38)/(66-38));let s=F.s;[40,45,50,55,60,65].forEach(v=>{s+=ln2(pl,Y(v),W-pr,Y(v),'var(--line)')+tx(pl-5,Y(v)+4,v,{fs:11,a:'end',c:'var(--mute)'})});
  const fam=[['Mamba','var(--c1)'],['Pythia','var(--c2)'],['RWKV','var(--c3)']];
  fam.forEach(([f,c])=>{const pts=rows.filter(r=>r.model.startsWith(f)).map(r=>[F.lx(sizeOf(r.model)),Y(+r.v[8])]);s+='<polyline points="'+pts.map(p=>p.join(',')).join(' ')+'" fill="none" stroke="'+c+'" stroke-width="2"/>'+pts.map(p=>'<circle cx="'+p[0]+'" cy="'+p[1]+'" r="3.5" fill="'+c+'"/>').join('')});
  rows.filter(r=>!fam.some(([f])=>r.model.startsWith(f))).forEach(r=>{s+='<circle cx="'+F.lx(sizeOf(r.model))+'" cy="'+Y(+r.v[8])+'" r="3" fill="none" stroke="var(--mute)"><title>'+r.model+' '+r.v[8]+'</title></circle>'});
  const lg=legend([['Mamba','var(--c1)'],['Pythia','var(--c2)'],['RWKV','var(--c3)'],['others (open circles)','var(--mute)','2 3']],pl,H+12,W-pl);
  $('zsSvg').innerHTML=svgW(W,H+lg.h+4,s+lg.s,'zero-shot average against size')}));

// ---------- 8. Inference memory and batch size ----------
(function(){const M=RCX.mem_28;
  function draw(W){const T=2**+$('memT').value,G=+$('memG').value;$('memTv').textContent=fmt(T);$('memGv').textContent=G+' GB';
    const kv=T*M.kv_per_token,st=M.state_bytes,free=G*1e9-2.8e9*2,bk=Math.max(0,Math.floor(free/kv)),bm=Math.max(0,Math.floor(free/st));
    const mx=Math.max(kv,st),bw=W-130;let s='';s+=tx(0,16,'Pythia-2.8B',{fs:12})+rc(90,4,Math.max(2,bw*kv/mx),18,'var(--c2)')+tx(96+Math.max(2,bw*kv/mx)*(kv/mx>.5?0:1),17,fmtBytes(kv),{fs:11,c:kv/mx>.5?'var(--bg)':null});
    s+=tx(0,46,'Mamba-2.8B',{fs:12})+rc(90,34,Math.max(2,bw*st/mx),18,'var(--c1)')+tx(96+Math.max(2,bw*st/mx)*(st/mx>.5?0:1),47,fmtBytes(st),{fs:11,c:st/mx>.5?'var(--bg)':null});
    $('memSvg').innerHTML=svgW(W,60,s,'memory per sequence');
    $('memOut').innerHTML=stat('Transformer: sequences that fit',fmt(bk),fmtBytes(kv)+' each')+stat('Mamba: sequences that fit',fmt(bm),fmtBytes(st)+' each')+stat('ratio',kv>st?(kv/st).toFixed(1)+'× more for Mamba':'cache is smaller here',T<M.crossover_tokens?'below the '+M.crossover_tokens+'-token crossover':'')}
  fit($('memSvg'),draw);$('memT').addEventListener('input',()=>refit($('memSvg')));$('memG').addEventListener('change',()=>refit($('memSvg')));
})();

// ---------- 9. Predict reveals ----------
PRED_REVEAL['pr-ext']=()=>fit($('prExt'),W=>{const ex=window.MBW.extrap||{},paper=TBX.t11.rows,mult=[1,2,4,8,16,32,64],H=170,pl=36,pt=12,pb=30;
  const rope=paper[1][2].slice(2,9),mam=paper[5][2].slice(2,9),val=v=>v==='ok'?100:+v;
  const toy=k=>ex[k]?mult.map((_,i)=>ex[k][String(6+i)]?100*ex[k][String(6+i)].acc:null):null;
  const series=[['paper MHA-RoPE',rope.map(val),'var(--c2)'],['paper Mamba',mam.map(val),'var(--c1)'],['toy attention (RoPE)',toy('ih_attn'),'var(--c2)','5 4'],['toy Mamba (S6)',toy('ih_s6'),'var(--c1)','5 4']].filter(x=>x[1]);
  const X=i=>pl+(W-pl-12)*i/(mult.length-1),Y=v=>pt+(H-pt-pb)*(1-v/100);let s='';
  [0,25,50,75,100].forEach(v=>{s+=ln2(pl,Y(v),W-12,Y(v),'var(--line)')+tx(pl-5,Y(v)+4,v+'%',{fs:11,a:'end',c:'var(--mute)'})});
  mult.forEach((m,i)=>{s+=tx(X(i),H-pb+15,'×'+m,{fs:11,a:'middle',c:'var(--mute)'})});s+=tx((pl+W)/2,H-2,'test length / training length',{fs:11,a:'middle',c:'var(--mute)'});
  series.forEach(([n,v,c,da])=>{const pts=v.map((y,i)=>y==null?null:[X(i),Y(y)]).filter(Boolean);s+='<polyline points="'+pts.map(p=>p.join(',')).join(' ')+'" fill="none" stroke="'+c+'" stroke-width="2"'+(da?' stroke-dasharray="'+da+'"':'')+'/>'});
  const lg=legend(series.map(x=>[x[0],x[2],x[3]]),pl,H+12,W-pl);$('prExt').innerHTML=svgW(W,H+lg.h+4,s+lg.s,'extrapolation')});
PRED_REVEAL['pr-n']=()=>fit($('prN'),W=>{const t=TBX.t10,H=170,pl=36,pt=12,pb=30,X=i=>pl+(W-pl-12)*i/4,Y=v=>pt+(H-pt-pb)*(1-(v-8.6)/(10-8.6));let s='';
  [8.6,9,9.4,9.8].forEach(v=>{s+=ln2(pl,Y(v),W-12,Y(v),'var(--line)')+tx(pl-5,Y(v)+4,v.toFixed(1),{fs:11,a:'end',c:'var(--mute)'})});
  t.const.forEach((r,i)=>{s+=tx(X(i),H-pb+15,'N = '+r[0],{fs:11,a:'middle',c:'var(--mute)'})});s+=tx((pl+W)/2,H-2,'state size (perplexity, lower is better)',{fs:11,a:'middle',c:'var(--mute)'});
  [['B, C constant',t.const,'var(--c2)'],['B, C selective',t.sel,'var(--c1)']].forEach(([n,rows,c])=>{s+='<polyline points="'+rows.map((r,i)=>X(i)+','+Y(r[2])).join(' ')+'" fill="none" stroke="'+c+'" stroke-width="2"/>'+rows.map((r,i)=>'<circle cx="'+X(i)+'" cy="'+Y(r[2])+'" r="3.5" fill="'+c+'"/>').join('')});
  const lg=legend([['B, C constant','var(--c2)'],['B, C selective','var(--c1)']],pl,H+12,W-pl);$('prN').innerHTML=svgW(W,H+lg.h+4,s+lg.s,'state size ablation')});
