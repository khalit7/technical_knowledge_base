// ---- Split a layer across GPUs: the MLP block forward and backward, Megatron against Option 1; and a communication-only scaling model ----
(function(){if(!$('lay'))return;const BS=[1,2,4,8,16,32];
  const P=()=>({h:T.t1.rows[+$('layP').value].h,t:+$('layT').value,bw:+$('layL').value,b:BS[+$('layB').value],s:1024});
  // lanes(i,t) -> [[x0,x1,kind]] in units of H; kind: full | shard | part
  const full=(x)=>(i,t)=>[[0,x,'full']],part=(x)=>(i,t)=>[[0,x,'part']],sh=(x)=>(i,t)=>[[i*x/t,(i+1)*x/t,'shard']];
  const ST={meg:[
    {t:'Input X, the same on every GPU',c:'Every GPU starts with the whole input for its tokens (H numbers each). The <i>f</i> operator in front of the block does nothing in the forward pass.',L:full(1)},
    {t:'First GEMM, column-parallel: X A<sub>i</sub>',c:'GPU <i>i</i> holds the columns A<sub>i</sub> of the H × 4H matrix, so it computes 4H/t whole output columns. Nothing is missing from them.',L:sh(4)},
    {t:'GeLU, locally',c:'Because each GPU owns complete columns, GeLU applies to its slice on its own: Equation 3. No communication, and each GPU evaluates only 1/t of the GeLUs.',L:sh(4),gelu:1},
    {t:'Second GEMM, row-parallel: Y<sub>i</sub> B<sub>i</sub>',c:'GPU <i>i</i> holds the matching rows B<sub>i</sub> and multiplies its own GeLU output straight away. Each result is H wide but only a partial sum.',L:part(1)},
    {t:'g: one all-reduce',c:'The partial sums are added across GPUs; afterwards every GPU has Z, H numbers per token. This is the block\'s only forward communication.',L:full(1),comm:['ar',1]},
    {t:'Dropout and residual, duplicated',c:'Cheap elementwise work is repeated on every GPU rather than computed once and sent (the dropout masks match because the generators share a seed outside parallel regions).',L:full(1)},
    {t:'Backward: the gradient arrives',c:'The gradient of Z is the same on every GPU, and <i>g</i>\'s backward pass is the identity: nothing to send.',L:full(1),bwd:1},
    {t:'Back through B<sub>i</sub>, GeLU and A<sub>i</sub>, all local',c:'Each GPU computes the gradients of its own weights and its contribution to the gradient of X: a partial sum, because X fed every GPU\'s columns.',L:part(1),bwd:1},
    {t:'f backward: one all-reduce of the gradient of X',c:'Summing the contributions gives the full gradient on every GPU. Block total: 2 all-reduces, each of H numbers per token; the attention block adds the same again, so a layer needs 4.',L:full(1),comm:['ar',1],bwd:1}],
   row:[
    {t:'Input X; each GPU uses its slice X<sub>i</sub>',c:'Option 1 splits A by rows, so GPU <i>i</i> needs only the matching H/t columns of X, which it can take from its copy for free.',L:sh(1)},
    {t:'First GEMM, row-parallel: X<sub>i</sub> A<sub>i</sub>',c:'Each GPU produces all 4H outputs, but only as a partial sum over its slice of the inner dimension (Equation 2).',L:part(4)},
    {t:'All-reduce before the GeLU',c:'GeLU of a sum is not the sum of GeLUs, so the partials must be added first: an all-reduce of 4H numbers per token, four times the size of Megatron\'s.',L:full(4),comm:['ar',4]},
    {t:'GeLU on all 4H, on every GPU',c:'Every GPU now holds the whole hidden layer, so every GPU evaluates every GeLU: t times the work, and 4H activations kept per GPU instead of 4H/t.',L:full(4),gelu:1},
    {t:'Second GEMM, row-parallel',c:'B is split by rows too; each GPU uses its 4H/t slice of the GeLU output and produces a partial sum of Z.',L:part(1)},
    {t:'All-reduce of Z',c:'The second synchronisation, H numbers per token, the same as Megatron\'s only one.',L:full(1),comm:['ar',1]},
    {t:'Dropout and residual',c:'Duplicated, as in Megatron.',L:full(1)},
    {t:'Backward: through B<sub>i</sub>',c:'The gradient of Z is the same everywhere; through B<sub>i</sub> each GPU gets the gradient of its own 4H/t slice of the hidden layer.',L:sh(4),bwd:1},
    {t:'All-gather before the GeLU backward',c:'The all-reduce in front of the GeLU means every GPU used the full pre-activation, so each needs its full gradient: an all-gather of 4H (derived here as the conjugate of that all-reduce).',L:full(4),comm:['ag',4],bwd:1},
    {t:'Back through GeLU and A<sub>i</sub>',c:'Through A<sub>i</sub> each GPU gets the gradient of its own H/t slice of X.',L:sh(1),bwd:1},
    {t:'All-gather of the gradient of X',c:'The slices are gathered into the full gradient. Block total: 4 collectives, 5H all-reduced and 5H all-gathered per token, against Megatron\'s 2 collectives of H each.',L:full(1),comm:['ag',1],bwd:1}]};
  const ring=(c,t)=>c?(c[0]==='ar'?2:1)*(t-1)/t*c[1]:0;
  const tot=(m,t,k)=>ST[m].slice(0,k+1).reduce((a,S)=>a+ring(S.comm,t),0);
  function lanes(L,t,w,y0,op,lh,u,x0){let q='';for(let i=0;i<t;i++){const y=y0+i*(lh+5);L(i,t).forEach(([a,b,k])=>{const c=k==='shard'?'var(--c1)':k==='part'?'var(--c2)':'var(--mute)';
      q+=rc(x0+a*u,y,(b-a)*u,lh,c,{r:2,op:k==='part'?.35*op:k==='full'?.55*op:.9*op,s:k==='part'?'var(--c2)':null,da:k==='part'?'3 2':null,sw:1.4})})}return q}
  function draw(m,k,e,w){const p=P(),t=p.t,S=ST[m][k],pv=k?ST[m][k-1]:null,lh=t>4?14:t>2?18:22,x0=52,u=(w-x0-10)/4,y0=24;let q='';
    q+=tx(x0,13,(S.bwd?'backward':'forward')+' · lane = 4H = '+fmt(4*p.h)+' numbers',{fs:11,c:'var(--mute)'});
    for(let i=0;i<t;i++){const y=y0+i*(lh+5);q+=rc(x0,y,4*u,lh,'var(--soft)',{r:2,s:'var(--line)'})+ln2(x0+u,y,x0+u,y+lh,'var(--line)')+tx(x0-6,y+lh/2+4,'GPU '+(i+1),{fs:11,a:'end'})}
    if(pv&&e<1)q+=lanes(pv.L,t,w,y0,1-e,lh,u,x0);q+=lanes(S.L,t,w,y0,pv?e:1,lh,u,x0);
    const yb=y0+t*(lh+5)+6;
    if(S.comm){const op=Math.sin(Math.PI*Math.min(1,e))*.9+.1,ax=x0+S.comm[1]*u+10;if(ax<w-4){q+=G(op,ln2(ax,y0+lh/2,ax,y0+(t-1)*(lh+5)+lh/2,'var(--c2)',{sw:2.5}));for(let i=0;i<t;i++)q+=G(op,'<circle cx="'+ax+'" cy="'+(y0+i*(lh+5)+lh/2)+'" r="3" fill="var(--c2)"/>')}
      q+=tx(x0,yb+10,(S.comm[0]==='ar'?'all-reduce':'all-gather')+' of '+(S.comm[1]===1?'H':S.comm[1]+'H')+' per token: each GPU sends '+((S.comm[0]==='ar'?2:1)*(t-1)/t*S.comm[1]).toFixed(2)+'H',{fs:11,c:'var(--c2)',w:600})}
    else if(S.gelu)q+=tx(x0,yb+10,'GeLU evaluations per GPU: '+(m==='meg'?'4H/'+t:'4H (all of them)'),{fs:11,c:'var(--mute)'});
    // cumulative communication per GPU, to scale against the other mode's total
    const yc=yb+22,mx=Math.max(tot('meg',t,99),tot('row',t,99)),cu=(4*u)/mx,me=tot(m,t,k)-(S.comm?ring(S.comm,t)*(1-e):0),oth=m==='meg'?'row':'meg';
    q+=tx(x0-6,yc+10,'sent',{fs:11,a:'end',c:'var(--mute)'})+rc(x0,yc,tot(oth,t,99)*cu,12,'none',{r:2,s:'var(--mute)',da:'3 2'})+rc(x0,yc,me*cu,12,'var(--c2)',{r:2});
    q+=tx(x0,yc+27,'so far '+me.toFixed(2)+'H per token sent by each GPU',{fs:11,c:'var(--mute)'})+tx(x0,yc+41,'dashed: '+(m==='meg'?'Option 1':'Megatron')+'\'s whole block, '+tot(oth,t,99).toFixed(2)+'H',{fs:11,c:'var(--mute)'});
    return svgW(w,yc+47,q,'One MLP block split across GPUs')}
  const cnt=(m,k)=>{const p=P(),t=p.t,S=ST[m];let n=0,el=0;S.slice(0,k+1).forEach(x=>{if(x.comm){n++;el+=ring(x.comm,t)}});
    const bytes=el*p.b*p.s*p.h*2,ms=bytes/(p.bw*1e9)*1e3,mw=1e3*48*p.b*p.s*p.h*p.h/(t*39e12);
    return stat('Collectives so far',n,m==='meg'?'of 2 for the block':'of 4 for the block')+stat('Sent per GPU',fmtBytes(bytes),'at b = '+p.b+', s = 1,024, fp16')+
      stat('Time on the link',ms<1?ms.toFixed(2)+' ms':ms.toFixed(1)+' ms','at '+p.bw+' GB/s; its GEMMs, forward and backward, about '+mw.toFixed(1)+' ms at 39 TFLOP/s')+stat('GeLU work per GPU',m==='meg'?'1/'+t:'1 (all)','of a single GPU\'s')};
  const an=makeAnim({id:'lay',modes:{meg:ST.meg,row:ST.row},mode:'meg',dur:2800,draw,counters:cnt});
  ['layP','layT','layL'].forEach(id=>$(id).addEventListener('change',()=>{refit($('laySvg'));an&&an.draw()}));
  $('layB').addEventListener('input',()=>{$('layBv').textContent=BS[+$('layB').value];an&&an.draw()});
  // ---- communication-only scaling model ----
  function model(r,t,bw,nar,b){b=b||8;const s=1024,h=r.h;const comp=r.l*96*b*s*h*h*(1+s/(6*h))/(t*39e12),comm=t>1?r.l*nar*2*(t-1)/t*b*s*h*2/(bw*1e9):0;return {comp,comm}}
  function scl(){const kind=segVal('sclK'),bw=+$('sclL').value,nar=$('sclR').checked?6:4,TS=[1,2,4,8];
    const pts=TS.map((t,i)=>{if(kind==='weak'){const r=T.t1.rows[i],M=model(r,t,bw,nar),eff=M.comp/(M.comp+M.comm);return {t,eff,meas:T.f5.mp[i][1]/100,M}}
      const r=T.t1.rows[0],M1=model(r,1,bw,nar),M=model(r,t,bw,nar),sp=(M1.comp)/(M.comp+M.comm);return {t,eff:sp/t,meas:+T.t8.rows[i].s/t,sp,M}});
    const other=[300,150,6.25].filter(x=>x!==bw);
    fit($('sclSvg'),w=>{const pl=40,pr=10,top=14,H=230,bwid=(w-pl-pr)/4,Y=v=>top+(H-top-36)*(1-v);let q='';
      [0,.2,.4,.6,.8,1].forEach(v=>q+=ln2(pl,Y(v),w-pr,Y(v),'var(--line)')+tx(pl-4,Y(v)+4,Math.round(v*100)+'%',{fs:11,a:'end',c:'var(--mute)'}));
      pts.forEach((p,i)=>{const x=pl+i*bwid;q+=rc(x+bwid*.2,Y(p.meas),bwid*.6,Y(0)-Y(p.meas),'var(--c1)',{r:2,op:.8})+tx(x+bwid/2,Y(0)-6,Math.round(p.meas*100)+'%',{fs:11,a:'middle',c:'var(--bg)',w:600});
        q+=tx(x+bwid/2,H-20,(kind==='weak'?T.t1.rows[i].p+'B, ':'')+p.t+' GPU'+(p.t>1?'s':''),{fs:11,a:'middle',c:'var(--mute)'})});
      const line=(arr,c,da,sw)=>{let d='';arr.forEach((v,i)=>{d+=(i?'L':'M')+(pl+(i+.5)*bwid).toFixed(1)+','+Y(Math.max(0,Math.min(1,v))).toFixed(1)});return '<path d="'+d+'" fill="none" stroke="'+c+'" stroke-width="'+sw+'"'+(da?' stroke-dasharray="'+da+'"':'')+'/>'};
      other.forEach(o=>{const a=TS.map((t,i)=>{const r=kind==='weak'?T.t1.rows[i]:T.t1.rows[0],M=model(r,t,o,nar);if(kind==='weak')return M.comp/(M.comp+M.comm);const M1=model(r,1,o,nar);return M1.comp/(M.comp+M.comm)/t});q+=line(a,'var(--mute)','3 3',1.2)});
      q+=line(pts.map(p=>p.eff),'var(--c2)',null,2.4);pts.forEach((p,i)=>q+='<circle cx="'+(pl+(i+.5)*bwid)+'" cy="'+Y(Math.max(0,Math.min(1,p.eff)))+'" r="3.5" fill="var(--c2)"/>');
      q+=tx(pl,H-4,'bars: measured · orange: model at '+bw+' GB/s',{fs:11,c:'var(--mute)'})+tx(pl,H+10,'dashed: the model at the other two links',{fs:11,c:'var(--mute)'});
      $('sclSvg').innerHTML=svgW(w,H+14,q,'Measured scaling against a communication-only model')});
    const L=pts[3];$('sclO').innerHTML=stat(kind==='weak'?'8.3B on 8 GPUs, model':'1.2B on 8 GPUs, model',Math.round(L.eff*100)+'%',kind==='weak'?'communication '+(L.M.comm*1e3/T.t1.rows[3].l).toFixed(2)+' ms against compute '+(L.M.comp*1e3/T.t1.rows[3].l).toFixed(1)+' ms per layer':'speedup '+L.sp.toFixed(2)+'×')+
      stat('Measured',Math.round(L.meas*100)+'%',kind==='weak'?'Figure 5':'Table 8: speedup '+T.t8.rows[3].s+'×')+stat('Left unexplained by communication',Math.max(0,Math.round((L.eff-L.meas)*100))+' points',L.eff>L.meas?'of the '+Math.round((1-L.meas)*100)+' lost':'the model is below the measurement');
    $('sclNo').innerHTML=kind==='weak'?'At NVSwitch speed, communication alone predicts '+Math.round(model(T.t1.rows[3],8,150,nar).comp/(model(T.t1.rows[3],8,150,nar).comp+model(T.t1.rows[3],8,150,nar).comm)*100)+'% for the 8.3B model on 8 GPUs (at 150 GB/s), against the measured 77%. Most of the loss is something the model leaves out: Appendix D attributes it to smaller GEMMs and a larger softmax as heads change (%T7%), and per-GPU work shrinking until memory bandwidth dominates. Over InfiniBand the same model collapses to '+Math.round(pts.length&&model(T.t1.rows[3],8,6.25,nar).comp/(model(T.t1.rows[3],8,6.25,nar).comp+model(T.t1.rows[3],8,6.25,nar).comm)*100)+'%, which is why the 8-way groups stay inside one server.':'With the batch fixed at 8, communication alone would allow a '+pts[3].sp.toFixed(1)+'× speedup on 8 GPUs at this link; the paper measured 2.98×. Its explanation: "as the per-GPU computation decreases ... the memory bandwidth and communication overheads begin to dominate" (%T8%). A constant 39 TFLOP/s per GPU is the assumption that fails: GEMMs a t-th the size run far slower.';
    $('sclNo').innerHTML=$('sclNo').innerHTML.replace('%T7%','<a href="'+PAPER.meta.ax+'#A4.T7" target="_blank" rel="noopener noreferrer">Table 7</a>').replace('%T8%','<a href="'+PAPER.meta.ax+'#A4.SS2" target="_blank" rel="noopener noreferrer">Appendix D.2</a>')}
  segOn('sclK',scl);$('sclL').addEventListener('change',scl);$('sclR').addEventListener('change',scl);onTab('t-run',()=>{scl();if(an){refit($('laySvg'))}})})();
