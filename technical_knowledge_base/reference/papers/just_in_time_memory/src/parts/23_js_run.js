// ---- Replay tab: the paper's test-time memory stream on the 140 real ALFWorld goals ----
(function(){
  const goals=PAPER.alf.map(x=>x[1]),types=PAPER.alf.map(x=>x[0]),n=goals.length,B=10,NB=Math.ceil(n/B);
  let p=.774,seed=7,R=null,S=null,anim=null,agT=0,aggDirty=true;
  const modes={read:[],write:[]};
  const typ=pos=>types[R.order[pos]],gl=pos=>goals[R.order[pos]];
  function firstUse(){const f={};R.ret.forEach((r,pos)=>r.forEach(q=>{if(f[q]==null||pos<f[q])f[q]=pos}));return f}
  let FU={};
  function rebuild(){R=JS_STREAM.run(goals,seed,p,B,3);S=JS_STREAM.stats(types,R,B);FU=firstUse();
    for(const m of ['read','write']){modes[m].length=0;
      for(let b=0;b<NB;b++){const lo=b*B,hi=Math.min(n,lo+B),got=[];for(let q=lo;q<hi;q++)got.push(R.ret[q].length);
        const bank=R.ok.slice(0,lo).filter(Boolean).length,stored=R.ok.slice(lo,hi).filter(Boolean).length;
        let c;
        if(m==='read'){c=b===0?'The bank is empty, so the first 10 tasks get no memory at all (the cold start). '+stored+' of them succeed and are stored after the batch.':
          'The bank holds '+bank+' trajectories. Each task retrieves '+(got.every(x=>x===3)?'3':'up to 3')+'; its curator writes a payload for it, and the task\'s own success grades that payload at once. '+stored+' trajectories are stored after the batch.'}
        else{const graded=[];for(let q=0;q<lo;q++)if(R.ok[q]&&FU[q]!=null&&FU[q]>=lo&&FU[q]<hi)graded.push(FU[q]-q);
          const waiting=[];for(let q=0;q<lo;q++)if(R.ok[q]&&(FU[q]==null||FU[q]>=hi))waiting.push(q);
          c=b===0?'Nothing is stored yet. A write-time curator would distil each successful trajectory now, and learn whether that was useful only when some later task retrieves it.':
            (graded.length?graded.length+' earlier storage decision'+(graded.length>1?'s are':' is')+' used for the first time in this batch, '+Math.min(...graded)+' to '+Math.max(...graded)+' tasks after being stored: only now could a write-time curator get any reward for '+(graded.length>1?'them':'it')+'.':'No earlier storage decision is used for the first time in this batch.')+' '+waiting.length+' stored trajectories are still waiting for their first use.'+(b===NB-1?' The test set ends here: those still waiting never get a reward.':'')}
        modes[m].push({t:'Batch '+(b+1)+' of '+NB+' (tasks '+(lo+1)+' to '+hi+')',c})}}
    if(anim){anim.st.lk=-1;anim.st.k=Math.min(anim.st.k,NB-1);anim.draw()}
    inspect();if(!$('t-run').hidden)scheduleAgg();else aggDirty=true}
  function draw(m,k,e,W){const lw=58,cs=Math.min(38,(W-lw-8)/B),rh=Math.max(18,Math.min(26,cs)),H=NB*rh+22,r=Math.max(4,Math.min(8,cs/2-4));
    const cx=pos=>lw+(pos%B)*cs+cs/2,cy=pos=>8+Math.floor(pos/B)*rh+rh/2;let s='';
    for(let b=0;b<NB;b++)s+=tx(lw-8,cy(b*B)+4,'batch '+(b+1),{a:'end',fs:11,c:b===k?'var(--ink)':'var(--mute)',w:b===k?600:400});
    const lo=k*B,hi=Math.min(n,lo+B);
    // links of the current batch: each task to the trajectories it retrieved
    let L='';for(let q=lo;q<hi;q++)R.ret[q].forEach(t=>{const same=typ(t)===typ(q);L+=ln2(cx(q),cy(q),cx(t),cy(t),same?'var(--acc)':'var(--bad)',{sw:1.1,op:.75})});
    s+=G(RM?1:e,L);
    for(let pos=0;pos<n;pos++){const b=Math.floor(pos/B),x=cx(pos),y=cy(pos),c=TYC[typ(pos)];
      if(b>k){s+='<circle cx="'+x.toFixed(1)+'" cy="'+y+'" r="'+r+'" fill="none" stroke="var(--line)"/>';continue}
      const st=R.ok[pos];let ring='';
      if(m==='write'&&st&&b<k){const fu=FU[pos];const used=fu!=null&&fu<hi;ring='<circle cx="'+x.toFixed(1)+'" cy="'+y+'" r="'+(r+2.5)+'" fill="none" stroke="'+(used?'var(--good)':'var(--bad)')+'" stroke-width="1.6"'+(used?'':' stroke-dasharray="2 2"')+'/>'}
      if(m==='read'&&b<=k){ring=b===k?'':'<circle cx="'+x.toFixed(1)+'" cy="'+y+'" r="'+(r+2.5)+'" fill="none" stroke="var(--good)" stroke-width="1.2" opacity=".55"/>'}
      s+=ring+'<circle cx="'+x.toFixed(1)+'" cy="'+y+'" r="'+r+'" fill="'+(st?c:'var(--bg)')+'" stroke="'+c+'" stroke-width="1.6"><title>#'+(pos+1)+' '+gl(pos)+'</title></circle>'}
    s+=tx(lw,H-4,m==='read'?'ring: payload graded by its own task':'green ring: used (graded); dashed red: still waiting',{fs:11,c:'var(--mute)'});
    return svgW(W,H,s,'Memory stream replay')}
  function counters(m,k){const hi=Math.min(n,(k+1)*B),lo=k*B;let R2=0,same=0;for(let q=0;q<hi;q++)R.ret[q].forEach(t=>{R2++;if(typ(t)===typ(q))same++});
    const bank=R.ok.slice(0,lo).filter(Boolean).length;
    if(m==='read')return stat('Tasks run',hi,'of '+n)+stat('Bank size during this batch',bank,'successful trajectories')+stat('Retrieved trajectories of the same type',R2?Math.round(100*same/R2)+'%':'none yet','so far; the rest are other task types');
    let g=0,w=0,dl=[];for(let q=0;q<lo;q++)if(R.ok[q]){if(FU[q]!=null&&FU[q]<hi){g++;dl.push(FU[q]-q)}else w++}
    const md=dl.length?dl.reduce((a,b)=>a+b,0)/dl.length:0;
    return stat('Storage decisions graded',g,'first used by a later task')+stat('Still waiting',w,k===NB-1?'never graded':'not used yet')+stat('Mean wait for the first use',dl.length?md.toFixed(1)+' tasks':'none yet','read time: 0')}
  rebuild();
  anim=makeAnim({id:'cap',modes,mode:'read',draw,counters,dur:1800});
  function inspect(){const i=+$('iR').value-1;$('iV').textContent=i+1;const b=Math.floor(i/B);
    const li=pos=>'<span style="color:'+TYC[typ(pos)]+'">●</span> #'+(pos+1)+' '+gl(pos)+' <span class="mute">('+TYN[typ(pos)]+')</span>';
    const cons=[];R.ret.forEach((r,pos)=>{if(r.includes(i))cons.push(pos)});
    let h='<p>'+li(i)+', batch '+(b+1)+'; '+(R.ok[i]?'succeeds and is stored after its batch.':'fails (in this ordering\'s coin flips) and is not stored.')+'</p>';
    h+='<p><b>It retrieves</b> '+(R.ret[i].length?'':'nothing: the bank is empty.')+'</p>'+(R.ret[i].length?'<ul>'+R.ret[i].map(q=>'<li>'+li(q)+'</li>').join('')+'</ul>':'');
    if(R.ok[i])h+='<p><b>Later tasks that retrieve it:</b> '+(cons.length?cons.length+', of '+new Set(cons.map(typ)).size+' type'+(new Set(cons.map(typ)).size>1?'s':'')+'; first after '+(Math.min(...cons)-i)+' tasks':'none')+'</p>'+(cons.length?'<ul>'+cons.slice(0,8).map(q=>'<li>'+li(q)+'</li>').join('')+(cons.length>8?'<li class="mute">and '+(cons.length-8)+' more</li>':'')+'</ul>':'');
    $('iO').innerHTML=h}
  function scheduleAgg(){clearTimeout(agT);agT=setTimeout(agg,60)}
  function agg(){aggDirty=false;const keys=['first_delay_mean','never_used','consumers_mean','consumer_types_mean','other_type_share','same_type','zero_ret'],acc={},pool=[];let never=0,stored=0;keys.forEach(k=>acc[k]=0);
    for(let sd=1;sd<=50;sd++){const r=JS_STREAM.run(goals,sd,p,B,3),st=JS_STREAM.stats(types,r,B);keys.forEach(k=>acc[k]+=st[k]/50);st.first.forEach(d=>pool.push(d));never+=Math.round(st.never_used*st.stored);stored+=st.stored}
    $('agO').innerHTML=stat('First use of a stored trajectory',acc.first_delay_mean.toFixed(1)+' tasks','mean wait; read time: 0')+stat('Never used before the test set ends',Math.round(100*acc.never_used)+'%','of trajectories stored before the last batch')+
      stat('Later tasks fed by a used trajectory',acc.consumers_mean.toFixed(1),'of '+acc.consumer_types_mean.toFixed(1)+' task types on average')+stat('Used by another task type too',Math.round(100*acc.other_type_share)+'%','of used trajectories')+
      stat('Retrieved trajectories of the same type',Math.round(100*acc.same_type)+'%','BM25 over the goal text')+stat('Tasks that get no memory',acc.zero_ret.toFixed(1),'of 140: the empty first batch');
    const host=$('hgSvg');fit(host,W=>{const bw=10,bins=[];pool.forEach(d=>{const b=Math.floor((d-1)/bw);bins[b]=(bins[b]||0)+1});for(let i=0;i<bins.length;i++)bins[i]=bins[i]||0;
      const all=bins.map(v=>v/50).concat([never/50]),H=160,x0=30,x1=W-6,y0=H-34,mx=Math.max(...all),bwp=(x1-x0)/all.length;let s='';
      all.forEach((v,i)=>{const h=(y0-14)*v/mx;s+=rc(x0+i*bwp+1,y0-h,Math.max(1,bwp-2),h,i===all.length-1?'var(--bad)':'var(--acc)',{r:2})});
      for(let i=0;i<all.length-1;i+=Math.max(1,Math.ceil(all.length/6)))s+=tx(x0+i*bwp+2,y0+14,i*bw+1,{fs:11,c:'var(--mute)'});
      s+=tx(x1,y0+14,'never',{a:'end',fs:11,c:'var(--bad)'})+tx(x0,H-4,'tasks until first use (bins of 10), mean count per ordering',{fs:11,c:'var(--mute)'});
      host.innerHTML=svgW(W,H,s,'First-use delay over 50 orderings')});
    $('hgO').innerHTML='Averaged over orderings 1 to 50 at p = '+(100*p).toFixed(1)+'%. The page\'s quoted figures (p = 77.4%, 200 orderings, src/stream_sim.py): first use after '+PAPER.stream['0.774'].first_delay_mean.toFixed(1)+' tasks, '+Math.round(100*PAPER.stream['0.774'].never_used)+'% never used; at p = 100%: '+PAPER.stream['1.0'].first_delay_mean.toFixed(1)+' tasks and '+Math.round(100*PAPER.stream['1.0'].never_used)+'%.'}
  $('pR').addEventListener('input',e=>{p=+e.target.value/100;$('pV').textContent=(+e.target.value).toFixed(1);rebuild()});
  $('sR').addEventListener('input',e=>{seed=+e.target.value;$('sV').textContent=seed;rebuild()});
  $('iR').addEventListener('input',inspect);
  onTab('t-run',()=>{refit($('capSvg'));if(aggDirty)agg();else refit($('hgSvg'))});
})();
