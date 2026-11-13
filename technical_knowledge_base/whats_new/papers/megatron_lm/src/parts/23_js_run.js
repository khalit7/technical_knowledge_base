// ---- Split a layer across GPUs: the MLP block forward and backward, Megatron against Option 1; and a communication-only scaling model ----
(function(){if(!$('lay'))return;const BS=[1,2,4,8,16,32];
  const P=()=>({h:T.t1.rows[+$('layP').value].h,t:+$('layT').value,bw:+$('layL').value,b:BS[+$('layB').value],s:1024});
  // One MLP block, step by step; the explanations are the step lists #sx-lay-meg and #sx-lay-row in 03_paper.html, the drawing is Fig. 2 (31_js_sc_lay.js).
  // Each step: L, what every GPU holds for one token: [kind, width in units of H] with kind full | shard | part; at, where it sits
  // (x: the block input, y: the hidden layer under A, z: the output of B, o: after g); comm [all-reduce 'ar' or all-gather 'ag', size in H, gate f | m | g];
  // w: which weight plates are in use (A, B); gelu, bwd; fl: the local flow along the lane [from, to].
  const ST={meg:[
    {L:['full',1],at:'x'},
    {L:['shard',4],at:'y',w:'A',fl:['x','A']},
    {L:['shard',4],at:'y',gelu:1},
    {L:['part',1],at:'z',w:'B',fl:['y','B']},
    {L:['full',1],at:'o',comm:['ar',1,'g']},
    {L:['full',1],at:'o',dup:1},
    {L:['full',1],at:'o',bwd:1},
    {L:['part',1],at:'x',bwd:1,w:'AB',fl:['o','x']},
    {L:['full',1],at:'x',bwd:1,comm:['ar',1,'f']}],
   row:[
    {L:['shard',1],at:'x'},
    {L:['part',4],at:'y',w:'A',fl:['x','A']},
    {L:['full',4],at:'y',comm:['ar',4,'m']},
    {L:['full',4],at:'y',gelu:1},
    {L:['part',1],at:'z',w:'B',fl:['y','B']},
    {L:['full',1],at:'o',comm:['ar',1,'g']},
    {L:['full',1],at:'o',dup:1},
    {L:['shard',4],at:'y',bwd:1,w:'B',fl:['o','y']},
    {L:['full',4],at:'y',bwd:1,comm:['ag',4,'m']},
    {L:['shard',1],at:'x',bwd:1,w:'A',fl:['y','x']},
    {L:['full',1],at:'x',bwd:1,comm:['ag',1,'f']}]};
  const ring=(c,t)=>c?(c[0]==='ar'?2:1)*(t-1)/t*c[1]:0;
  const tot=(m,t,k)=>ST[m].slice(0,k+1).reduce((a,S)=>a+ring(S.comm,t),0);
  const cnt=(m,k)=>{const p=P(),t=p.t,S=ST[m];let n=0,el=0;S.slice(0,k+1).forEach(x=>{if(x.comm){n++;el+=ring(x.comm,t)}});
    const bytes=el*p.b*p.s*p.h*2,ms=bytes/(p.bw*1e9)*1e3,mw=1e3*48*p.b*p.s*p.h*p.h/(t*39e12);
    return stat('Collectives so far',n,m==='meg'?'of 2 for the block':'of 4 for the block')+stat('Sent per GPU',fmtBytes(bytes),el.toFixed(2)+'H per token, at b = '+p.b+', s = 1,024, fp16')+
      stat('Time on the link',ms<1?ms.toFixed(2)+' ms':ms.toFixed(1)+' ms','at '+p.bw+' GB/s; its GEMMs, forward and backward, about '+mw.toFixed(1)+' ms at 39 TFLOP/s')+stat('GeLU work per GPU',m==='meg'?'1/'+t:'1 (all)','of a single GPU\'s')};
  const L={mode:'meg',k:0,ST,P,ring,tot};window.MEG_LAY=L;
  L.counters=()=>{$('layCnt').innerHTML=cnt(L.mode,L.k)};
  const redraw=()=>{L.counters();if(L.stage)L.stage.draw()};
  ['layP','layT','layL'].forEach(id=>$(id).addEventListener('change',redraw));
  $('layB').addEventListener('input',()=>{$('layBv').textContent=BS[+$('layB').value];redraw()});
  L.counters();
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
  segOn('sclK',scl);$('sclL').addEventListener('change',scl);$('sclR').addEventListener('change',scl);onTab('t-read',()=>{scl()});const d=$('scl-d');if(d)d.addEventListener('toggle',()=>{if(d.open)scl()})})();
