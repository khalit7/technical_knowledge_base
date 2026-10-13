// ---- Reading tab: every table, number and small chart filled from window.DPT (recorded data) ----
(function(){
  const D=window.DPT,U=window.DU,{$,esc,comma,table,set}=U;
  const COL={all_reduce:'var(--c1)',all_gather:'var(--c3)',all_gather_into_tensor:'var(--c3)',reduce_scatter_tensor:'var(--c2)',broadcast:'var(--c4)',all_to_all_single:'var(--c6)',all_to_all:'var(--c6)'};
  // ---- 1. c10d ----
  const env=D.c10d.env;
  set('dpt-env',table(['Variable','Value on rank 1 of 4'],Object.keys(env).filter(k=>env[k]!=null).map(k=>['<code>'+k+'</code>',esc(env[k])])));
  set('dpt-store',D.c10d.store.map(s=>'<code>'+s+'</code>').join(' &rarr; '));
  set('dpt-storeread',D.c10d.store_read.map(s=>'"'+esc(s)+'"').join(', '));
  const na=D.c10d.noarg;
  set('dpt-noarg','With no backend argument, <code>init_process_group()</code> picked one for the detected accelerator (<code>'+na.accelerator+'</code>): backend config <code>"'+na.backend_config+'"</code>. Every collective on CPU tensors then failed: <code>'+esc(na.world_cpu_all_reduce.error)+'</code>, on the world group and on a new group alike. Naming it, <code>init_process_group("gloo")</code>, gives <code>"'+D.c10d.config+'"</code>. And gloo does not take MPS tensors, although the default map sends "mps" to gloo (<code>'+esc(JSON.stringify(D.c10d.map))+'</code>, <a href="https://github.com/pytorch/pytorch/blob/v2.14.1/torch/distributed/distributed_c10d.py#L506-L511" target="_blank" rel="noopener noreferrer">distributed_c10d.py L506</a>): an all-reduce of an MPS tensor raised <code>'+esc(D.c10d.mps.split(' If you want')[0])+'</code> So on a Mac, distributed work moves tensors to the CPU. Backends available in this build: '+Object.keys(D.c10d.avail).filter(k=>D.c10d.avail[k]).join(', ')+'.');
  // elastic timeline
  function drawElastic(){
    const el=$('dpt-el');if(!el)return;const w=U.W(el),h=96,L=58,R=12;const ev=D.elastic.events;
    const tmax=Math.max(...ev.map(e=>e[5]))*1.03;const x=t=>L+(w-L-R)*t/tmax;
    let s='';
    [0,1].forEach(r=>{const y=26+r*34;s+=RD.t(4,y+4,'rank '+r,{fill:'var(--mute)'})+'<line class="ax" x1="'+L+'" x2="'+(w-R)+'" y1="'+y+'" y2="'+y+'"/>';
      ev.filter(e=>e[1]===r).forEach(e=>{const X=x(e[5]);
        if(e[2]==='step')s+='<circle cx="'+X+'" cy="'+y+'" r="4" fill="'+(e[0]?'var(--c3)':'var(--c1)')+'"><title>attempt '+e[0]+', step '+e[3]+', loss '+e[4]+'</title></circle>';
        else if(e[2]==='crash')s+='<text x="'+X+'" y="'+(y+5)+'" text-anchor="middle" font-size="15" fill="var(--bad)">&#10007;</text>';
        else if(e[2]==='start')s+='<line x1="'+X+'" x2="'+X+'" y1="'+(y-9)+'" y2="'+(y+9)+'" stroke="var(--mute)"/>';
        else s+='<rect x="'+(X-3)+'" y="'+(y-6)+'" width="6" height="12" fill="var(--good)"/>'})});
    const crash=ev.find(e=>e[2]==='crash'),res=ev.filter(e=>e[2]==='start'&&e[0]>0)[0];
    if(crash&&res)s+=RD.t((x(crash[5])+x(res[5]))/2,h-4,'restart: '+(res[5]-crash[5]).toFixed(2)+' s',{a:'middle',fill:'var(--bad)'});
    el.innerHTML='<div class="dpt-svg">'+RD.svg(w,h,s,'Elastic restart timeline')+'</div>'+
      '<div class="leg"><span style="--sw:var(--c1)">step, first attempt</span><span style="--sw:var(--c3)">step after restart</span><span style="--sw:var(--bad)">crash (rank 1, step 3)</span><span style="--sw:var(--good)">done</span></div>';
  }
  const lg=D.elastic.log.filter(l=>/attempts left|restart_count|simulated failure on rank 1 at step 3$/.test(l)&&!/^\[rank1\]:\s+raise/.test(l));
  set('dpt-ellog','<code>'+lg.map(l=>esc(l.replace(/^torch\/distributed\/elastic\/agent\/server\/api\.py:\d+\]\s*/,'').trim())).join('</code>; <code>')+'</code>.');
  const rp=D.elastic.repeats,n1=rp.filter(v=>v===1).length,n2=rp.filter(v=>v===2).length,n0=rp.filter(v=>v==null).length;
  const rs=D.elastic.resume_s.filter((v,i)=>rp[i]===1);
  set('dpt-elrep','The same run was repeated '+rp.length+' times. '+n1+' finished on the first restart (crash to resumed training '+Math.min(...rs).toFixed(2)+' to '+Math.max(...rs).toFixed(2)+' s); in '+n2+' the first restart\'s workers both timed out in their first barrier and the second restart worked; in '+n0+' both restarts failed that way and the job gave up.');
  // ---- 2. collectives ----
  const ring={all_reduce:'2(n&minus;1)/n &middot; S',broadcast:'(n&minus;1)/n &middot; S to S (tree or pipeline)',reduce:'(n&minus;1)/n &middot; S',all_gather_into_tensor:'(n&minus;1)/n &middot; nS',all_gather:'(n&minus;1)/n &middot; nS','all_gather (list)':'(n&minus;1)/n &middot; nS',reduce_scatter_tensor:'(n&minus;1)/n &middot; S',all_to_all_single:'(n&minus;1)/n &middot; S',gather:'S, to the root',scatter:'S/n, from the root',barrier:'none'};
  const ends={all_reduce:'the sum, everywhere',broadcast:"rank 0's tensor, everywhere",reduce:'the sum, on rank 0 only',all_gather_into_tensor:"every rank's piece, concatenated",'all_gather (list)':"every rank's piece, as a list",reduce_scatter_tensor:'its 1/n of the sum',all_to_all_single:'piece r of every rank',gather:"every rank's tensor, on rank 0",scatter:'its piece of rank 0\'s list',barrier:'nothing (a sync)'};
  set('dpt-colltbl',table(['Called','Recorded by the flight recorder as','In (B)','Out (B)','Each rank ends with','Bytes a ring sends per rank'],
    D.c10d.coll.map(c=>['<code>'+c[0]+'</code>','<code>'+c[1]+'</code>'+(c[0]==='reduce_scatter_tensor'?' <span class="ann">gloo</span>':''),comma(c[2]),comma(c[3]),ends[c[0]]||'',ring[c[0]]||''])));
  const a2=D.c10d.a2a[1];set('dpt-a2a','['+a2.sent.join(', ')+'] and received ['+a2.received.join(', ')+']');
  // collective timing chart
  let ctw=2;
  function fit(rows){const n=rows.length;let sx=0,sy=0,sxx=0,sxy=0;rows.forEach(r=>{sx+=r[0];sy+=r[1];sxx+=r[0]*r[0];sxy+=r[0]*r[1]});
    const b=(n*sxy-sx*sy)/(n*sxx-sx*sx),a=(sy-b*sx)/n;return {a,B:1/b}}
  DU.fit=fit;
  function drawCT(){
    const el=$('dpt-ct');if(!el)return;const d=D.ct[ctw],w=U.W(el),h=Math.min(320,Math.max(220,w*0.5)),L=46,R=10,T=10,B=34;
    const ops=Object.keys(d.ops);const all=ops.flatMap(k=>d.ops[k]);
    const xs=all.map(r=>r[0]),ys=all.map(r=>r[1]*1e3);
    const x0=Math.log10(Math.min(...xs)),x1=Math.log10(Math.max(...xs)),y0=Math.log10(Math.min(...ys)*0.8),y1=Math.log10(Math.max(...ys)*1.2);
    const X=v=>L+(w-L-R)*(Math.log10(v)-x0)/(x1-x0),Y=v=>T+(h-T-B)*(1-(Math.log10(v)-y0)/(y1-y0));
    let s='';
    for(let e=Math.ceil(y0);e<=Math.floor(y1);e++){const v=Math.pow(10,e);s+='<line class="ax" x1="'+L+'" x2="'+(w-R)+'" y1="'+Y(v)+'" y2="'+Y(v)+'"/>'+RD.t(L-4,Y(v)+4,(v>=1?v:v.toString())+' ms',{a:'end',fill:'var(--mute)',fs:10})}
    const tk=[4096,65536,1048576,16777216,67108864].filter(v=>v<=Math.max(...xs));tk.forEach((v,i)=>{s+=RD.t(X(v),h-B+14,U.kib(v),{a:i===0?'start':i===tk.length-1?'end':'middle',fill:'var(--mute)',fs:10})});
    s+=RD.t((L+w-R)/2,h-4,'bytes per rank (log)',{a:'middle',fill:'var(--mute)',fs:10});
    const fits=[];
    ops.forEach(k=>{const r=d.ops[k];const c=COL[k];
      s+='<polyline fill="none" stroke="'+c+'" stroke-width="2" points="'+r.map(q=>X(q[0])+','+Y(q[1]*1e3)).join(' ')+'"/>';
      r.forEach(q=>{s+='<circle cx="'+X(q[0])+'" cy="'+Y(q[1]*1e3)+'" r="2.6" fill="'+c+'"><title>'+k+' '+U.kib(q[0])+': median '+(q[1]*1e3).toFixed(3)+' ms (min '+(q[2]*1e3).toFixed(3)+', max '+(q[3]*1e3).toFixed(3)+')</title></circle>'});
      const f=fit(r.map(q=>[q[0],q[1]]));fits.push([k,f]);
      if($('dpt-ct-fit').checked){const pts=[];for(let i=0;i<=40;i++){const v=Math.pow(10,x0+(x1-x0)*i/40);const t=(f.a+v/f.B)*1e3;if(t>0)pts.push(X(v)+','+Y(Math.max(t,Math.pow(10,y0))))}
        s+='<polyline fill="none" stroke="'+c+'" stroke-dasharray="4 3" stroke-width="1" points="'+pts.join(' ')+'"/>'}});
    el.innerHTML=RD.svg(w,h,s,'Collective time against message size');
    set('dpt-ct-fitt','<div class="leg">'+ops.map(k=>'<span style="--sw:'+COL[k]+'">'+k+'</span>').join('')+'</div>'+
      table(['Collective','&alpha; (fixed cost per call)','B (effective bandwidth)','Largest size, median'],fits.map(([k,f])=>{const r=d.ops[k][d.ops[k].length-1];return ['<code>'+k+'</code>',(f.a*1e3).toFixed(3)+' ms',(f.B/1e9).toFixed(2)+' GB/s',U.kib(r[0])+': '+(r[1]*1e3).toFixed(2)+' ms']}).map(r=>r)).replace('<thead>','<table class="rd-tbl" style="margin-top:6px"><thead>')+'</table>');
    set('dpt-ct-load',d.load.join(', ')+' (1, 5 and 15 minutes)');
  }
  U.seg($('dpt-ct-w'),m=>{ctw=+m;drawCT()});$('dpt-ct-fit').addEventListener('change',drawCT);
  // ---- 3. DDP ----
  const un=D.unused;
  set('dpt-unused',table(['DDP option','Step 0','Step 1','Step 2','Result'],Object.keys(un).map(k=>{const v=un[k];
    const cell=i=>{const s=v.steps[i];if(!s)return i===v.steps.length&&!v.ok?'<span class="dpt-no">fails</span>':'';return s[2].length?s[2].map(c=>c[0].replace('_','-')+' '+comma(c[1])).join('<br>'):'no collective issued'};
    return ['<code>'+esc(k)+'</code>',cell(0),cell(1),cell(2),v.ok?'<span class="dpt-ok">trains</span>; unused weight\'s <code>.grad</code> '+(v.steps[0][3]?'stays None':'set on every rank'):'<span class="dpt-no">'+esc(v.error.split('This error indicates')[0])+'</span>']})));
  const ns=D.nosync;
  set('dpt-nosync','10 and 4. All-reducing every micro-batch: '+ns['sync every micro-batch'].length+' collectives (the rebuild broadcasts of '+ns['sync every micro-batch'][0][1]+' and '+ns['sync every micro-batch'][1][1]+' bytes, then 2 bucket all-reduces per micro-batch). With <code>no_sync</code> for the first three: '+ns['no_sync for 3 of 4'].length+' (the broadcasts and one pair of bucket all-reduces). The accumulated gradients agree to '+U.sci(ns.max_abs_grad_diff)+': summing locally then averaging equals averaging four times, up to float rounding. <span class="meas">Measured, 2 CPU processes.</span>');
  const j0=D.join[0],j1=D.join[1];
  set('dpt-join-t',j0.without.seconds);
  set('dpt-join','rank 0 (5 batches) and rank 1 (3 batches) both issued '+j0.with.n_coll+' collectives: '+j0.with.ops.filter((o,i)=>j0.with.bytes[i]===4).length+' of them 4-byte join all-reduces, and a final 8-byte all-reduce and a '+comma(j0.with.bytes[j0.with.bytes.length-1])+'-byte broadcast, in which the last rank to finish sends its parameters to the others so every copy ends identical.');
  const hk=D.hooks[2];const base=hk[0].s[29][0];
  set('dpt-hooksum',table(['Hook','Bytes per step per rank','Relative gradient error (step 5)','Loss after 30 steps'],hk.map(v=>[ '<code>'+esc(v.name)+'</code>',v.error?'<span class="dpt-no">refused</span>':comma(v.s[5][2]),v.error?'':U.sci(v.s[5][1],2),v.error?'':v.s[29][0].toFixed(4)])));
  set('dpt-bf16','<code>'+esc(hk.find(v=>v.name==='bf16_compress_hook').error)+'</code>.');
  const rc=D.race;
  set('dpt-race','ranks 1 and 2 issued '+rc.per_rank[1].map(c=>comma(c[0])+' B ('+c[1]+')').join(', ')+'; rank 3 issued '+rc.per_rank[3].map(c=>comma(c[0])+' B ('+c[1]+')').join(', ')+'; rank 0 had only reached '+rc.per_rank[0].map(c=>comma(c[0])+' B').join(', ')+' when the mismatched sizes met and gloo aborted.');
  // ---- 4. FSDP2 ----
  const sumBy=(coll,f)=>coll.filter(f).reduce((a,c)=>a+c[3]*c[4],0),cnt=(coll,f)=>coll.filter(f).reduce((a,c)=>a+c[4],0);
  const fp32=D.mesh.fsdp4;  // 4 ranks; the 2-rank float32 reference losses are the lab's
  const mpRow=(name,o)=>{const c=o.coll;const ag=c.filter(x=>x[0]==='all_gather'),ar=c.filter(x=>x[0]==='all_reduce');
    return [name,ag.length?ag[0][2]+', '+comma(sumBy(c,x=>x[0]==='all_gather'))+' B':'',ar.length?ar[0][2]+', '+comma(sumBy(c,x=>x[0]==='all_reduce'))+' B':'',o.losses.join(', '),U.mb(o.peak,1)]};
  set('dpt-mp',table(['Policy','All-gathers: dtype, bytes in per step','Gradient reductions: dtype, bytes in per step','Losses, steps 0 to 2','Step peak above persistent state'],[
    mpRow('float32, no policy (the lab tab\'s run)',D.fsdp2_w2_ref),
    mpRow('param bfloat16, reduce float32',D.mp),mpRow('param bfloat16, reduce bfloat16',D.mp_bf16reduce)]));
  set('dpt-raf',D.mesh.raf2.pfm?('<code>'+JSON.stringify(D.mesh.raf2.pfm.mesh)+'</code> (rank 0\'s post-forward group: ranks '+D.mesh.raf2.pfm.shard_group_ranks.join(' and ')+')'):'');
  const ac=D.accum.variants;const ak=Object.keys(ac);
  set('dpt-acc',ak.map(k=>'<b>'+esc(k)+'</b>: '+ac[k].n_coll+' collectives ('+Object.keys(ac[k].ops).map(o=>ac[k].ops[o]+' '+o.replace('_','-')+'s').join(', ')+', '+U.mb(ac[k].bytes_in,1)+' in)').join('; ')+'. Gradients equal to '+U.sci(D.accum.diff)+'.');
  set('dpt-off',D.offload.losses.join(', '));
  set('dpt-sd0',D.statedict.sharded.n_coll+' collectives and returned '+D.statedict.sharded.n_keys+' entries, all '+D.statedict.sharded.types.join(', ')+'s');
  set('dpt-sd1',D.statedict.full.n_coll);
  set('dpt-rootplain',D.dcp.root_plain.map(n=>'<code>'+n+'</code>').join(', '));
  const f1=D.fsdp1;
  set('dpt-f1',table(['','FSDP1 (FullyShardedDataParallel)','FSDP2 (fully_shard)'],[
    ['Unit of sharding','one FlatParameter per wrapped module: '+f1.flat.slice(0,2).map(x=>'<code>'+x[0]+'</code> '+JSON.stringify(x[1])).join(', ')+' per rank','each parameter, as a DTensor Shard(0): block 0 <code>mlp.fc.weight</code> [512, 256] of [1024, 256] per rank'],
    ['API','a wrapper module, auto-wrap policies','in place on your module (class becomes FSDP&lt;Name&gt;)'],
    ['Frozen and trainable in one unit',f1.frozen['fsdp1 use_orig_params=False'].ok?'accepted':'<span class="dpt-no">'+esc(f1.frozen['fsdp1 use_orig_params=False'].error.split('. The following')[0])+'</span>',f1.frozen.fsdp2.ok?'<span class="dpt-ok">accepted</span>':'refused'],
    ['Collectives per step (2 ranks)',f1.ncoll,'14'],
    ['Losses, steps 0 and 1',f1.losses.map(v=>v.toFixed(6)).join(', '),D.fsdp2_w2_ref_losses.slice(0,2).join(', ')],
    ['Sharded state dict','needs FSDP state-dict configuration','plain <code>state_dict()</code>: DTensors, 0 collectives'],
    ['Deprecation warning at 2.14.1',f1.warnings.length?esc(f1.warnings.join('; ')):'none printed','n/a']]));
  // prefetch chart
  let pfv='implicit (default)';
  function drawPF(){
    const el=$('dpt-pf');if(!el)return;const d=D.prefetch[pfv],w=U.W(el),h=150,L=62,R=10;
    const tmax=Math.max(d.t[3],...d.coll.map(c=>c[2]))*1.02;const X=t=>L+(w-L-R)*t/tmax;
    let s='';const st={};d.marks.forEach(m=>{st[m[0]+m[1]]=m[2]});
    for(let i=0;i<4;i++){const y=14+i*22;s+=RD.t(4,y+12,'block '+i,{fill:'var(--mute)'});
      if(st['fwd_start'+i]!=null)s+='<rect x="'+X(st['fwd_start'+i])+'" y="'+y+'" width="'+Math.max(2,X(st['fwd_end'+i])-X(st['fwd_start'+i]))+'" height="14" fill="var(--c1)" opacity=".75"><title>forward</title></rect>';
      if(st['bwd_start'+i]!=null)s+='<rect x="'+X(st['bwd_start'+i])+'" y="'+y+'" width="'+Math.max(2,X(st['bwd_end'+i])-X(st['bwd_start'+i]))+'" height="14" fill="var(--c4)" opacity=".75"><title>backward</title></rect>'}
    const yc=14+4*22+10;s+=RD.t(4,yc+4,'issued',{fill:'var(--mute)'});
    d.coll.forEach(c=>{const x=X(c[2]);const col=c[0]==='all_gather'?'var(--c3)':'var(--c2)';s+='<path d="M'+x+' '+(yc-6)+' l5 6 l-5 6 l-5 -6z" fill="'+col+'"><title>'+c[0]+' '+comma(c[1])+' B at '+c[2]+' ms</title></path>'});
    s+=RD.t(w-R,h-2,tmax.toFixed(0)+' ms',{a:'end',fill:'var(--mute)',fs:10});
    el.innerHTML=RD.svg(w,h,s,'FSDP2 prefetch timeline')+'<div class="leg"><span style="--sw:var(--c1)">forward</span><span style="--sw:var(--c4)">backward</span><span style="--sw:var(--c3)">all-gather issued</span><span style="--sw:var(--c2)">gradient reduction issued</span></div>';
    const ag=d.coll.filter(c=>c[0]==='all_gather'),f0=st.fwd_start0;
    set('dpt-pf-cap','All-gathers issued before block 0\'s forward began: <b>'+ag.filter(c=>c[2]<f0).length+'</b> of '+ag.length+'; before the last block\'s forward ended: <b>'+ag.filter(c=>c[2]<st.fwd_end3).length+'</b>. Step peak above persistent state: '+U.mb(d.peak,1)+'. Earlier gathers keep more gathered weights alive at once: prefetching trades memory for overlap.');
  }
  U.seg($('dpt-pf-seg'),m=>{pfv=m;drawPF()});
  // ---- 5. DTensor ----
  const pr=D.dprop.cases;
  set('dpt-prop',table(['Operation','Inputs','Output placement','Collectives inserted','Local output shape','Correct'],pr.map(c=>['<code>'+c[0]+'</code>',c[1].map(p=>p.replace('S0','S(0)').replace('S1','S(1)')).join(' , '),c[2]?c[2].map(U.pl).join(', ').replace('P(sum)','P'):'',c[6]?'<span class="dpt-no">'+esc(c[6])+'</span>':(Object.keys(c[3]).length?Object.keys(c[3]).map(k=>c[3][k]+' '+k.replace(/_/g,'-')).join(', '):'none'),c[4]?'('+c[4].join(', ')+')':'',c[5]?'<span class="dpt-ok">yes</span>':''])));
  const fl=D.dprop.from_local;
  set('dpt-fl','two (2, 3) pieces became a global '+JSON.stringify(fl.global_shape)+' DTensor with no collective, and <code>to_local()</code> returned the same storage ('+fl.to_local_is_same_storage+'); <code>run_check=True</code>, which verifies the metadata agrees across ranks, cost '+Object.values(fl.comms_run_check_true)[0]+' all-gathers.');
  set('dpt-fl-uneven','without a shape, pieces of 2 and 1 rows were taken as '+JSON.stringify(fl.uneven_without_shape.global_shape)+'; with <code>shape=(3, 2)</code>, '+JSON.stringify(fl.uneven_with_shape.global_shape)+' and a correct full tensor of '+fl.uneven_with_shape.full_rows+' rows');
  const cop=D.dprop.custom;
  set('dpt-cop0','<code>'+esc(cop.without_strategy.error)+'</code>');
  set('dpt-cop',Object.keys(cop).filter(k=>k!=='without_strategy').map(k=>esc(k.replace('with_strategy ','x/s placements ').replace(/S0/g,'S(0)').replace(/S1/g,'S(1)'))+' &rarr; output '+cop[k].out.join(',')+', '+(Object.keys(cop[k].comms).length?Object.keys(cop[k].comms).map(c=>cop[k].comms[c]+' '+c):'no collective')+', correct: '+cop[k].ok).join('\n'));
  // ---- 7. CP ----
  const c2=D.cp.cp,c4=D.cp.cp_w4;
  set('dpt-cp0','<code>'+esc(c2[0].public.error)+'</code>');
  set('dpt-cp1',U.sci(Math.max(...c2.concat(c4).map(r=>r.ring.max_abs_diff_vs_full)))+' on 2 and on 4 processes');
  set('dpt-cp2',c2[0].ring.coll.map(c=>c[0].replace('_','-')+' of '+comma(c[1])+' B in').join(', ')+' on 2 processes');
  set('dpt-cp3',c4[0].a2a.coll.length+' all-to-alls of '+comma(c4[0].a2a.coll[0][1])+' B on 4 processes, '+c2[0].a2a.coll.length+' on 2');
  // ---- 8. PP table ----
  const SCH=['GPipe','1F1B','Interleaved1F1B','LoopedBFS','InterleavedZeroBubble','ZBVZeroBubble','DualPipeV'];
  const fm=(p,m)=>((p-1)/(m+p-1)).toFixed(2);
  set('dpt-pptbl',table(['Schedule','Stages per rank','Bubble m = 4 (rank 0, rank 1)','Bubble m = 8','Formula m = 4, 8','Step m = 4','Peak m = 4 (rank 0, 1)'],SCH.map(s=>{const a=D.pp[s+'_w2_m4'],b=D.pp[s+'_w2_m8'];
    return [s,a[0].stages.length+(a[0].stages.length>1?' ('+a.map(r=>'['+r.stages.join(',')+']').join(' ')+')':''),a.map(r=>r.bubble.toFixed(2)).join(', '),b.map(r=>r.bubble.toFixed(2)).join(', '),fm(2,4)+', '+fm(2,8),a[0].step.toFixed(0)+' ms',a.map(r=>U.mb(r.mem,0)).join(', ')]})));
  const zr=D.pp['ZBVZeroBubble_w2_m4'][0].tied_ratio;set('dpt-tied',zr.toFixed(2));
  // ---- 9. DCP ----
  set('dpt-samepg',esc(D.dcp.samepg.outcome.split(';')[0]));
  const as=D.dcp.async;const med=U.med;
  set('dpt-async','control came back after '+(med(as.map(a=>a.async_return_s))*1e3).toFixed(0)+' ms (median over 4 ranks; a blocking <code>dcp.save</code> took '+(med(as.map(a=>a.sync_save_s))*1e3).toFixed(0)+' ms), one forward and backward ran, and the files were committed '+(med(as.map(a=>a.async_committed_s))*1e3).toFixed(0)+' ms after the call. <span class="meas">Measured, 4 CPU processes, bench lock, load average '+as[0].loadavg[0].toFixed(1)+'; a 12.75 MB model, so the absolute times say little.</span>');
  set('dpt-rs',D.dcp.reshard.max_abs_param_diff);
  const cv=D.dcp.convert;
  set('dpt-pt','one '+comma(cv.pt_bytes)+'-byte file (keys '+cv.top_keys.join(' and ')+', '+cv.n_model_keys+' model tensors, identical to the live model: largest difference '+cv.max_abs_diff_vs_live_model+') from the DCP directory of '+cv.dcp_files.map(f=>'<code>'+f[0]+'</code> '+comma(f[1])).join(', ')+' bytes');
  set('dpt-hf0','<code>'+esc(D.dcp.hf_all.error.split(' A potential')[0])+'</code>');
  set('dpt-hf1',D.dcp.hf_drop.files.map(f=>'<code>'+f[0]+'</code> '+comma(f[1])+' B').join(', ')+'.');
  // ---- 10. 3-D ----
  const c3=D.c3;
  set('dpt-c3',table(['Rank','(pp, dp, tp)','pp group','dp group','tp group','Local weights','Loss (last stage, micro-batches)','Gradient vs one process'],c3.map((r,i)=>[i,'('+r.coord.pp+', '+r.coord.dp+', '+r.coord.tp+')',r.groups.pp.join(','),r.groups.dp.join(','),r.groups.tp.join(','),comma(r.local)+' B',r.losses.length?r.losses.map(v=>v.toFixed(4)).join(', '):'(first stage)',U.sci(r.gd)])));
  const axes=r=>['tp','dp','pp'].map(a=>{const m={};r.coll.filter(c=>c[1]===a).forEach(c=>{m[c[0]]=(m[c[0]]||0)+c[4]});return a+': '+Object.keys(m).map(o=>m[o]+' '+o.replace('_','-')+'s').join(' and ')}).join('; ');
  set('dpt-c3c','rank 0 (first stage) '+axes(c3[0])+'. Rank 4 (last stage) '+axes(c3[4])+'. The dp reductions happen once per step, not per micro-batch: the pipeline asks FSDP2 to reduce only after the last micro-batch.');
  const pq=c3[0].params.find(p=>p[0]==='blocks.0.mlp.fc.weight');
  set('dpt-c3p','<code>'+pq[4].map(U.pl).join(', ')+'</code> on <code>('+pq[3].join(', ')+')</code>, local '+JSON.stringify(pq[2])+' of '+JSON.stringify(pq[1]));
  // ---- 11. flight recorder ----
  const fr=D.fr;
  const e0=fr.torchfrtrace.filter(l=>/Error/.test(l)).slice(-1)[0]||'';
  set('dpt-fr0','<code>'+esc(e0)+'</code>');
  set('dpt-fr1',esc(fr.torchfrtrace_patched_pg_config.filter(l=>!/^\s*(wrapper|barrier) at/.test(l)).join('\n')));
  function all(){drawElastic();drawCT();drawPF()}
  RD.onRender(all);RD.onResize(all);all();
  U.wirePredict(document.getElementById('t-read'));
})();
