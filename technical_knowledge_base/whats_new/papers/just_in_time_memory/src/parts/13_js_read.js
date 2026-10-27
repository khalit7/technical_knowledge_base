// ---- The paper tab: the read-time against write-time animation, results charts and the predict reveals ----
const TYC={pick_and_place_simple:'var(--c1)',pick_clean_then_place_in_recep:'var(--c3)',pick_heat_then_place_in_recep:'var(--c2)',pick_cool_then_place_in_recep:'var(--c6)',pick_two_obj_and_place:'var(--c5)',look_at_obj_in_light:'var(--c4)'};
const TYN={pick_and_place_simple:'place',pick_clean_then_place_in_recep:'clean',pick_heat_then_place_in_recep:'heat',pick_cool_then_place_in_recep:'cool',pick_two_obj_and_place:'two objects',look_at_obj_in_light:'look'};
const EXS={'Qwen3-8B':'Qwen3-8B','Gemini-2.5-Pro':'Gemini','GPT-5.4':'GPT-5.4'};
const T1=PAPER.tables.t1.rows,RC=PAPER.rc;

// 1. One past trajectory, two later tasks: read time against write time (the paper's Figure 3 example)
(function(){
  const ACT=[['go to countertop 1','f'],['take egg 1','f'],['go to fridge 1','s'],['cool egg 1 with fridge 1','s'],['go to microwave 1','p'],['open microwave 1','p'],['put egg 1 in microwave 1','p']];
  const KC={f:'var(--c1)',s:'var(--c6)',p:'var(--c5)'};
  const Q=t=>'<q>'+t+'</q>';
  const common1={t:'A past task is solved',c:'The agent solves <i>put a cool egg in microwave</i>, the past task in the paper\'s Figure 3. Its trajectory, drawn as seven actions (illustrative), mixes three kinds of know-how: finding the object (blue), changing its state (teal), placing it (gold).'};
  const modes={
    read:[common1,
      {t:'Store it raw',c:'JitMem stores the complete trajectory. Nothing is decided about what it is for, and nothing is discarded. The only gate: the executor, acting as judge, must think the task succeeded.'},
      {t:'Task A arrives: put a hot potato in fridge',c:'The retriever returns the egg trajectory among its top 3, as in the paper\'s figure.'},
      {t:'The curator writes payload A',c:'Reading task A and the raw trace together, the curator foregrounds the state change: '+Q('Heat the potato: Use a microwave or stove to make it hot.')+' '+Q('Move to the fridge: Go to the fridge, open it, and place the hot potato inside to cool it down.')+' (payload text from Figure 3).'},
      {t:'Task B arrives: put a newspaper in sofa',c:'The same egg trajectory is retrieved again, for a task with no state change at all.'},
      {t:'The curator writes payload B',c:'From the same trace it now foregrounds placement: '+Q('Move to the sofa: Navigate to the sofa and use the "move" action to place the newspaper on it.')+' '+Q('Verify placement: Confirm the newspaper is on the sofa. If not, repeat the process.')+' (Figure 3).'},
      {t:'The reward arrives at once',c:'Each payload is used once, by the task it was written for, so that task\'s success grades it immediately: the gap between the curator\'s action and its reward is zero. That is what lets GRPO train the curator from task success alone.'}],
    write:[common1,
      {t:'Distil it now',c:'A write-time memory distils the trajectory at once, before any later task is known. Following the paper\'s ReasoningBank-style prompt (at most 3 items, generalisable, no object names or locations), say: '+Q('1. Locate the object on countertops and tables first. 2. Change its temperature with the matching appliance. 3. Go to the target, open it if closed, and put the object in.')+' (illustrative). The raw trajectory is dropped.'},
      {t:'Task A arrives: put a hot potato in fridge',c:'The retriever returns the stored artifact: the same three items.'},
      {t:'Task A gets the fixed artifact',c:'Item 2 happens to fit (heat the potato), but nothing is specific to this task: that the potato must be heated first and only then go into the fridge is left to the executor.'},
      {t:'Task B arrives: put a newspaper in sofa',c:'The same artifact is retrieved again.'},
      {t:'Task B gets the same artifact',c:'Placement is one generic line among three, and the temperature advice is noise for this task. Whatever the distillation dropped (where the egg was, which receptacles had to be opened) is gone for both tasks.'},
      {t:'The reward comes later, and shared',c:'Was the distillation at step 2 a good one? Only tasks A and B can say, after the fact, and their success mixes the artifact\'s quality with everything else the executor did. A learned write-time curator has to learn from that signal; in the paper\'s real test stream a stored trajectory is first used about 20 tasks later, and a fifth to a quarter are never used (the replay tab).'}]};
  function chips(x0,y,cw,ch,hl,op){let s='';ACT.forEach((a,i)=>{const on=!hl||hl.includes(a[1]);s+=rc(x0+i*(cw+3),y,cw,ch,KC[a[1]],{op:(on?1:.22)*(op==null?1:op),r:3})});return s}
  function draw(m,k,e,W){const H=330,cw=Math.min(30,(W-30)/7-3),ch=14,rowW=7*(cw+3)-3,x0=(W-rowW)/2;let s='';
    const fs=11,mid=W/2,colW=(W-12)/2;
    // row 1: the past task
    s+=tx(mid,14,'Past task: put a cool egg in microwave',{a:'middle',fs:12,w:600});
    s+=chips(x0,22,cw,ch,null,k===0?e:1);
    const lg=[['find','f'],['change state','s'],['place','p']];let lx=mid-105;lg.forEach(([n,c])=>{s+=rc(lx,44,9,9,KC[c],{r:2})+tx(lx+12,52,n,{fs});lx+=n.length*6.6+24});
    // row 2: the bank
    const by=70,bh=62;s+=rc(6,by,W-12,bh,'none',{s:'var(--line)',sw:1.2,r:8})+tx(14,by+14,'Memory bank',{fs,c:'var(--mute)'});
    if(k>=1){const op=k===1?e:1;
      if(m==='read'){s+=G(op,chips(x0,by+26,cw,ch)+tx(mid,by+bh-6,'raw trajectory, all 7 actions kept',{a:'middle',fs}))}
      else{s+=G(op*.9,chips(x0,by+20,cw,ch,null,.18)+ln2(x0,by+20+ch/2,x0+rowW,by+20+ch/2,'var(--bad)',{sw:1.5}));
        const iw=Math.min(110,(W-40)/3);['1 locate','2 temperature','3 place'].forEach((t,i)=>{const xx=mid-1.5*iw-6+i*(iw+6);s+=G(op,rc(xx,by+40,iw,16,'var(--soft)',{s:'var(--mute)',r:3})+tx(xx+iw/2,by+52,t,{a:'middle',fs}))})}}
    // row 3: tasks A and B
    const ty=150;[['A','put a hot potato in fridge',2,3,['s'],'heat first, then the fridge'],['B','put a newspaper in sofa',4,5,['p'],'place, then verify']].forEach(([L,g,ka,kp,hl,why],j)=>{
      const cx=6+j*(colW+0)+colW/2,X=6+j*colW+4,w=colW-8;if(k<ka)return;const op=k===ka?e:1;
      s+=G(op,rc(X,ty,w,40,'var(--soft)',{s:'var(--line)',r:6})+tx(cx,ty+16,'Task '+L,{a:'middle',fs,w:600})+tx(cx,ty+32,g,{a:'middle',fs}));
      s+=G(op,'<line x1="'+cx+'" y1="'+(by+bh)+'" x2="'+cx+'" y2="'+ty+'" stroke="var(--mute)" stroke-width="1.2" stroke-dasharray="3 3"/>');
      if(k>=kp){const o2=k===kp?e:1,py=ty+52;
        s+=G(o2,rc(X,py,w,70,'none',{s:m==='read'?'var(--acc)':'var(--mute)',sw:1.4,r:6}));
        if(m==='read'){const cw2=Math.min(18,(w-20)/7-2),rw2=7*(cw2+2)-2;let ss='';ACT.forEach((a,i)=>{ss+=rc(cx-rw2/2+i*(cw2+2),py+10,cw2,10,KC[a[1]],{op:hl.includes(a[1])?1:.18,r:2})});
          s+=G(o2,ss+tx(cx,py+38,'payload '+L+': tailored',{a:'middle',fs,c:'var(--acc)',w:600})+tx(cx,py+56,why,{a:'middle',fs}))}
        else{s+=G(o2,tx(cx,py+24,'the same 3 items',{a:'middle',fs,w:600})+tx(cx,py+42,'1 locate · 2 temperature',{a:'middle',fs,c:'var(--mute)'})+tx(cx,py+58,'· 3 place',{a:'middle',fs,c:'var(--mute)'}))}}
      if(k>=6){const o3=k===6?e:1,ry=ty+136;
        if(m==='read')s+=G(o3,tx(cx,ry,'✓ reward now (gap 0)',{a:'middle',fs,c:'var(--good)',w:600}));
        else s+=G(o3,tx(cx,ry,'reward for step 2, '+(j?'two':'one')+' task'+(j?'s':'')+' later',{a:'middle',fs,c:'var(--bad)',w:600}))}
    });
    if(m==='write'&&k>=6){const o3=k===6?e:1;s+=G(o3,'<path d="M'+(6+colW/2)+' '+(ty+124)+' C 0 '+(by+80)+', 0 '+(by+60)+', '+(mid-60)+' '+(by+bh)+'" fill="none" stroke="var(--bad)" stroke-width="1.3" stroke-dasharray="4 3"/><path d="M'+(6+colW*1.5)+' '+(ty+124)+' C '+W+' '+(by+80)+', '+W+' '+(by+60)+', '+(mid+60)+' '+(by+bh)+'" fill="none" stroke="var(--bad)" stroke-width="1.3" stroke-dasharray="4 3"/>')}
    return svgW(W,H,s,'One past trajectory used by two later tasks, '+(m==='read'?'curated at read time':'distilled at write time'))}
  function counters(m,k){const tail=m==='read'?Math.max(0,(k>=3?1:0)+(k>=5?1:0)):0;
    return stat('Kept from the past trajectory',k<1?'not stored yet':m==='read'?'all 7 actions':'3 generic items','')+
      stat('Payloads tailored to their task',k<3?'none yet':(tail+' of '+(k>=5?2:1)),m==='read'?'curated with the task in view':'one artifact for every task')+
      stat('Delay before the curation is graded',m==='read'?'0 tasks':'until a later task uses it',m==='read'?'reward from the same task':'about 20 tasks in the real test stream')}
  makeAnim({id:'tl',modes,mode:'read',draw,counters,dur:3200});
})();

// 2. Results bars: one executor block, one metric
(function(){let ex='Qwen3-8B',c=0;const host=$('rcSvg');
  function draw(W){const rows=T1.filter(r=>r.exec===ex),lw=Math.min(170,W*.44),rh=24,H=rows.length*rh+30,x0=lw+6,x1=W-36,sx=v=>x0+(x1-x0)*v/100;let s='';
    [0,25,50,75,100].forEach(v=>{s+=ln2(sx(v),4,sx(v),H-22,'var(--line)')+tx(sx(v),H-8,v,{a:'middle',fs:11,c:'var(--mute)'})});
    rows.forEach((r,i)=>{const y=6+i*rh,v=r.v[c],jm=r.method.startsWith('JitMem'),cp=r.src[c]==='skillos';
      s+=tx(lw,y+13,r.method+(r.curator?' ('+(r.trained?'RL ':'')+EXS[r.curator]+')':''),{a:'end',fs:11,w:jm?600:400});
      const col=jm?'var(--acc)':'var(--mute)';s+=rc(sx(0),y+3,sx(v[0])-sx(0),14,cp?'none':col,{s:col,sw:1.3,op:jm?1:.75,r:2});
      s+=ln2(sx(v[0]-v[1]),y+10,sx(v[0]+v[1]),y+10,'var(--ink)',{sw:1.2})+tx(sx(Math.min(100,v[0]+v[1]))+4,y+14,v[0].toFixed(1),{fs:11})});
    host.innerHTML=svgW(W,H,s,'Results, '+ex);
    const g=RC.gains[ex+' '+['alf','wss','ws'][c]];$('rcO').innerHTML='JitMem '+g.jitmem.toFixed(1)+' against the strongest baseline, '+g.best_name+', '+g.best.toFixed(1)+': '+(g.gain>0?'+':'')+g.gain.toFixed(1)+' points.'}
  segBind('rcE',m=>{ex=m;refit(host)});segBind('rcC',m=>{c=+m;refit(host)});
  fit(host,draw)})();

// 3. Untrained read-time against untrained write-time, same curator model (reveal of the first results question)
PRED_REVEAL['pr-untr']=function(){const host=$('unSvg'),cells=RC.untrained;
  fit(host,W=>{const nar=W<560,lw=nar?0:190,rh=nar?36:22,H=cells.length*rh+30,x0=nar?8:lw+8,x1=W-10,lo=0,hi=100,sx=v=>x0+(x1-x0)*(v-lo)/(hi-lo);let s='';
    [0,25,50,75,100].forEach(v=>{s+=ln2(sx(v),2,sx(v),H-22,'var(--line)')+tx(sx(v),H-8,v,{a:'middle',fs:11,c:'var(--mute)'})});
    cells.forEach((q,i)=>{const y=4+i*rh+(nar?24:10),m=q.metric.replace('WebShop','WS').replace('ALFWorld','ALF').replace('tau2 micro','tau2');
      const lab=EXS[q.exec]+' / '+EXS[q.curator]+' · '+m;s+=nar?tx(x0,y-10,lab,{fs:11,c:q.win?'var(--ink)':'var(--bad)',w:q.win?400:600}):tx(lw,y+4,lab,{a:'end',fs:11,c:q.win?'var(--ink)':'var(--bad)',w:q.win?400:600});
      s+=ln2(sx(q.nomem),y-6,sx(q.nomem),y+6,'var(--mute)',{sw:2});
      s+=ln2(sx(Math.min(q.read,q.write_best)),y,sx(Math.max(q.read,q.write_best)),y,q.win?'var(--acc)':'var(--bad)',{sw:2});
      s+='<circle cx="'+sx(q.write_best).toFixed(1)+'" cy="'+y+'" r="4.5" fill="var(--bg)" stroke="var(--ink)" stroke-width="1.4"/><circle cx="'+sx(q.read).toFixed(1)+'" cy="'+y+'" r="4.5" fill="'+(q.win?'var(--acc)':'var(--bad)')+'"/>'});
    host.innerHTML=svgW(W,H,s,'Untrained read-time against untrained write-time memory')})};

// 4. Where the headline gain comes from (reveal of the second results question)
PRED_REVEAL['pr-norag']=function(){const host=$('dcSvg');let key='Qwen3-8B ws';
  function draw(W){const d=RC.decomp[key],nar=W<560,lw=nar?0:200,rh=nar?38:26,items=[['No memory',d.no_memory,'var(--mute)'],['Untrained read-time (JitMem-base)',d.base,'var(--c6)'],['RL curator, no retrieval',d.rl_no_retrieval,'var(--c5)'],['RL curator with retrieval (JitMem)',d.full,'var(--acc)']];
    if(d.skillos!=null)items.push(['RL-trained SkillOS (reference)',d.skillos,'var(--bad)']);
    const H=items.length*rh+12,x0=nar?4:lw+8,x1=W-40,mx=Math.max(...items.map(x=>x[1]))*1.05,sx=v=>x0+(x1-x0)*v/mx;let s='';
    items.forEach(([n,v,c],i)=>{const y=6+i*rh+(nar?14:0);s+=nar?tx(x0,y,n,{fs:11}):tx(lw,y+14,n,{a:'end',fs:11});s+=rc(x0,y+3,sx(v)-x0,15,c,{r:2})+tx(sx(v)+4,y+15,v.toFixed(1),{fs:11})});
    host.innerHTML=svgW(W,H,s,'Decomposition of the gain');
    const m=key.endsWith('alf')?'ALFWorld SR':'WebShop SR';
    $('dcO').innerHTML=key.split(' ')[0]+' executor, '+m+': no memory to untrained read-time +'+d.read_time_untrained.toFixed(1)+'; RL training +'+d.rl.toFixed(1)+', which is '+Math.round(100*d.share_rl)+'% of the total gain over no memory. Tables 1 and 9.'}
  segBind('dcM',m=>{key=m;refit(host)});fit(host,draw)};

// 5. First-use delay of stored trajectories under the paper's test protocol (reveal of the method question)
PRED_REVEAL['pr-delay']=function(){const host=$('dlSvg'),goals=PAPER.alf.map(x=>x[1]),types=PAPER.alf.map(x=>x[0]);
  const R=JS_STREAM.run(goals,7,0.774),S=JS_STREAM.stats(types,R);
  fit(host,W=>{const bins=[],bw=10;S.first.forEach(d=>{const b=Math.floor((d-1)/bw);bins[b]=(bins[b]||0)+1});for(let i=0;i<bins.length;i++)bins[i]=bins[i]||0;
    const never=Math.round(S.never_used*S.stored),all=bins.concat([never]),H=170,x0=30,x1=W-6,y0=H-34,mx=Math.max(...all),bwp=(x1-x0)/all.length;let s='';
    all.forEach((v,i)=>{const h=(y0-12)*v/mx,last=i===all.length-1;s+=rc(x0+i*bwp+1,y0-h,bwp-2,h,last?'var(--bad)':'var(--acc)',{r:2});if(v)s+=tx(x0+i*bwp+bwp/2,y0-h-3,v,{a:'middle',fs:11})});
    for(let i=0;i<all.length-1;i+=Math.max(1,Math.ceil(all.length/6)))s+=tx(x0+i*bwp+2,y0+14,i*bw+1,{fs:11,c:'var(--mute)'});
    s+=tx(x1,y0+14,'never',{a:'end',fs:11,c:'var(--bad)'})+tx(x0,H-4,'tasks until the first retrieval (bins of 10), one ordering',{fs:11,c:'var(--mute)'});
    host.innerHTML=svgW(W,H,s,'Delay until first use');
    $('dlO').innerHTML='This ordering (seed 7): '+S.stored+' trajectories stored before the last batch, first used after '+S.first_delay_mean.toFixed(1)+' tasks on average (median '+S.first_delay_median+'), '+Math.round(100*S.never_used)+'% never used, and a used trajectory feeds '+S.consumers_mean.toFixed(1)+' later tasks of '+S.consumer_types_mean.toFixed(1)+' types on average.'})};

// 6. Ablations: drop from the parent, one dot per executor
(function(){const host=$('abSvg');let c=0;const AB=RC.ablations,keys=[['JitMem-base w/o task adaptivity','base: no task in the curator\'s input'],['JitMem-base w/o successful traj. filtering','base: store all, with labels'],['JitMem-base w/o raw traj.','base: distil before storing'],['JitMem w/o task adaptivity','trained: no task in the input'],['JitMem w/o retrieved traj.','trained: no retrieval at all']];
  const EC={'Qwen3-8B':'var(--c1)','Gemini-2.5-Pro':'var(--c2)','GPT-5.4':'var(--c3)'};
  function draw(W){const nar=W<560,lw=nar?0:190,rh=nar?36:26,H=keys.length*rh+58,x0=nar?8:lw+10,x1=W-12;let mx=0,mn=0;keys.forEach(([k])=>Object.values(AB[k]).forEach(v=>{if(v[c]!=null){mx=Math.max(mx,v[c]);mn=Math.min(mn,v[c])}}));
    mx=Math.ceil((mx+1)/5)*5;mn=Math.floor(mn/5)*5;const sx=v=>x0+(x1-x0)*(v-mn)/(mx-mn);let s='';
    for(let v=mn;v<=mx;v+=5)s+=ln2(sx(v),2,sx(v),H-44,v===0?'var(--mute)':'var(--line)')+tx(sx(v),H-30,v,{a:'middle',fs:11,c:'var(--mute)'});
    keys.forEach(([k,n],i)=>{const y=12+i*rh+(nar?14:0);s+=nar?tx(x0,y-10,n,{fs:11}):tx(lw,y+4,n,{a:'end',fs:11});Object.entries(AB[k]).forEach(([ex,v])=>{if(v[c]!=null)s+='<circle cx="'+sx(v[c]).toFixed(1)+'" cy="'+y+'" r="5" fill="'+EC[ex]+'" opacity=".9"><title>'+ex+': '+v[c]+'</title></circle>'})});
    s+=tx(x1,H-30+14,'points lost',{a:'end',fs:11,c:'var(--mute)'});let lx=8;[['Qwen3-8B','Qwen3-8B'],['Gemini','Gemini-2.5-Pro'],['GPT-5.4','GPT-5.4']].forEach(([n,k])=>{s+='<circle cx="'+(lx+5)+'" cy="'+(H-8)+'" r="5" fill="'+EC[k]+'"/>'+tx(lx+14,H-4,n,{fs:11});lx+=n.length*6.6+30});
    host.innerHTML=svgW(W,H,s,'Ablation drops')}
  segBind('abC',m=>{c=+m;refit(host)});fit(host,draw)})();
