// ---- Replay the evolution runs: every lineage version by version, the held-out line hidden until asked for ----
(function(){if(!$('ev'))return;
  const sg=(v,d)=>(v>=0?'+':'−')+(d==null?Math.abs(v):Math.abs(v).toFixed(d));
  const LIN=DV.lineages,T7=PT.T7.rows;
  const name=l=>(l.setting==='Self'?l.creator+' runs its own harness':l.creator+' edits, Gemini 3.1 Pro runs');
  // the creator's own reasoning, Appendices H and I (paraphrased; numbers as printed)
  const NOTE={'Self|GPT-5.5':['The frozen Creation harness. GPT-5.5 began rewriting before this result arrived, inferring failures from the source and a local compileall error.',
      'Architecture first, not feedback-driven: stat_path, mkdir, chmod and plan tools, artifact-path discovery, JSON-action recovery, a python3 entry point (4 files, +426/−48). Both benchmarks regressed.',
      'A final-review gate: low evidence or failed verification blocks finish(success); paths, permissions, output format and real verification are checked first (1 file, +70/−1). Terminal failures had shown the agent declaring success after weak self-written checks.',
      'Extended the review to every successful Terminal task, with test-path filtering (+129/−12): an existing mechanism stretched, not a new failure found.',
      'The five-task Terminal probe fell from 4/5 to 3/5, so it removed the forced verification-gap prompt and kept path filtering (+5/−12). No link between the probe and the full run was estimated.',
      'Shell commands were changing files the tracker never saw: snapshot files before and after run_command (+48/−68). No new SWE failure case was opened.',
      'Kept the head and tail of long outputs; final review now checks asynchronous cancellation (2 files, +6/−34), narrowed from probes at SWE 0.6 and Terminal 0.8.',
      'Tried and reverted large-file offset reads; made finish a standalone action (+8/−3). Probes then reached 4/5 and 5/5, and did not transfer to the full run.'],
    'Self|Opus 4.8':['The frozen Creation harness. 56 SWE events had score=null; Opus refused to score from the event stream and read cases.json and the raw results to confirm 68 of 100.',
      'Diagnosis first: about 10 of 32 SWE failures were hidden-grader build, compile or import errors. Added a pre-finish verification gate, always-finalize on SIGTERM and SIGALRM, exact interface constraints (8 files, +304/−18).',
      'Of 728 edits only 14 (1.8%) failed to match, so a stronger editor was not the lever. Added one mandatory self-review against the real git diff (+68/−0); the hypothesis went into the ledger first.',
      'Terminal artifacts are made by shell commands, so the git-diff review never fired there: recorded written paths and command state and reviewed recent files for non-git tasks (+88/−10).']};
  const FINAL={'Self|GPT-5.5':'Declared T2 from its combined-score ledger, 13 seconds after T7 settled, leaving 3 of 10 pairs unused. It never repaired its own 54% tool-call rejection rate.',
    'Self|Opus 4.8':'Ever-passed, always-passed and never-passed counts across versions: SWE 81, 65, 19; Terminal 71, 59, 18. A process-group kill was tried by one session and reverted by another. Judging the noise at about 3 to 4 tasks per evaluation, Opus declared T3 after 3 of 10 pairs; T1\'s pair was higher by about 0.06 points with the same total of tasks passed.'};
  const key=l=>l.setting+'|'+l.creator;
  function build(l){const t7=T7.find(r=>r.setting===l.setting&&r.creator===l.creator),N=NOTE[key(l)];const fb=[],ho=[];
    for(let k=0;k<=l.n;k++){let t,c;
      if(k<l.n){const sw=l.swe100[k],te=l.term89[k],ds=k?sw-l.swe100[k-1]:0,dt=k?te-l.term89[k-1]:0;
        t=(k?'H'+k:'H0')+': pair '+l.pair[k].toFixed(1)+(k?' ('+sg(l.pair[k]-l.pair[k-1],1)+')':'');
        c='SWE '+sw+'/100'+(k?' ('+sg(ds)+')':'')+', Terminal '+te+'/89'+(k?' ('+sg(dt)+')':'')+'. '+(N?N[k]:(k?'One more official pair spent.':'The frozen Creation harness this lineage starts from.'));}
      else{t='Declared final: H'+l.declared;c=(FINAL[key(l)]||('Main edit focus over the lineage: '+t7.focus.toLowerCase()+'; '+t7.files+' files, +'+t7.add+'/−'+t7.del+' from H0 to the declared version.'))+' '+(l.declared===l.best_fb?'It is the best visible version.':'The best visible version was H'+l.best_fb+'.');}
      fb.push({t,c});
      let hc=c;if(k<l.n)hc+=' <b>Held-out:</b> '+l.ho630[k]+'/630 ('+l.ho[k].toFixed(2)+'%'+(k?', '+sg(l.ho[k]-l.ho[k-1],2):'')+').';
      else hc+=' <b>Held-out:</b> the declared version scores '+l.ho[l.declared].toFixed(2)+'%; the best held-out version is H'+l.best_ho+' at '+l.ho[l.best_ho].toFixed(2)+'%'+(l.best_ho===l.declared?', the same one.':', a gap of '+(l.ho[l.best_ho]-l.ho[l.declared]).toFixed(2)+'.');
      ho.push({t,c:hc})}
    return {fb,ho}}
  let cur=LIN.find(l=>key(l)==='Self|GPT-5.5');
  const sel=$('evEp');LIN.forEach((l,i)=>{const o=document.createElement('option');o.value=i;o.textContent=name(l);if(l===cur)o.selected=true;sel.appendChild(o)});
  const o={id:'ev',modes:build(cur),mode:'fb',dur:2600,
    draw(m,k,e,w){const l=cur,n=l.n,H=Math.min(340,Math.max(250,w*.55)),pl=38,pr=w<480?40:64,pt=14,pb=34;
      const all=[...l.pair,...l.swe100,...l.term89.map(v=>100*v/89),...l.ho,l.pair[0]-4.75,l.pair[0]+4.75];let lo=Math.max(0,Math.floor(Math.min(...all)/10)*10),hi=Math.min(100,Math.ceil(Math.max(...all)/10)*10);
      const sx=i=>pl+(w-pl-pr)*(n>1?i/(n-1):.5),sy=v=>pt+(H-pt-pb)*(1-(v-lo)/(hi-lo));let s='';
      for(let v=lo;v<=hi;v+=10)s+=ln2(pl,sy(v),w-pr,sy(v),'var(--line)')+tx(pl-5,sy(v)+4,v,{fs:11,a:'end',c:'var(--mute)'});
      for(let i=0;i<n;i++)s+=tx(sx(i),H-pb+15,'H'+i,{fs:11,a:'middle',c:i<=k?'var(--ink)':'var(--dim)'});
      s+=tx((pl+w-pr)/2,H-4,'official version',{fs:11,a:'middle',c:'var(--mute)'});
      s+=rc(pl,sy(l.pair[0]+4.75),w-pl-pr,sy(l.pair[0]-4.75)-sy(l.pair[0]+4.75),'var(--dim)',{r:0,op:.4});
      const kk=Math.min(k,n-1),part=k<n?e:1;
      const path=(arr,c,sw,da,lab)=>{let d='';for(let i=0;i<=kk;i++){let x=sx(i),y=sy(arr[i]);if(i===kk&&i>0&&part<1){x=sx(i-1)+(sx(i)-sx(i-1))*part;y=sy(arr[i-1])+(sy(arr[i])-sy(arr[i-1]))*part}d+=(i?'L':'M')+x.toFixed(1)+','+y.toFixed(1)}
        let r='<path d="'+d+'" fill="none" stroke="'+c+'" stroke-width="'+sw+'"'+(da?' stroke-dasharray="'+da+'"':'')+'/>';for(let i=0;i<kk||(i===kk&&(part>=1||i===0));i++)r+='<circle cx="'+sx(i).toFixed(1)+'" cy="'+sy(arr[i]).toFixed(1)+'" r="'+(sw>2?4:2.5)+'" fill="'+c+'"/>';
        if(kk>=0&&(part>=1||kk===0))r+=tx(Math.min(w-2,sx(kk)+7),sy(arr[kk])+4,lab,{fs:11,c});return r};
      s+=path(l.swe100,'var(--c6)',1.3,'4 3','SWE');s+=path(l.term89.map(v=>100*v/89),'var(--c5)',1.3,'4 3','Term');
      if(m==='ho')s+=path(l.ho,'var(--c2)',2.6,null,'held-out');
      s+=path(l.pair,'var(--acc)',3,null,'pair');
      if(k>=n){const d=l.declared;s+='<path d="'+star(sx(d),sy(l.pair[d]),10)+'" fill="var(--hl)" stroke="var(--ink)" stroke-width="1.2"/>';
        if(m==='ho'){s+='<path d="'+star(sx(d),sy(l.ho[d]),10)+'" fill="var(--hl)" stroke="var(--ink)" stroke-width="1.2"/>';const b=l.best_ho;if(b!==d)s+='<circle cx="'+sx(b).toFixed(1)+'" cy="'+sy(l.ho[b]).toFixed(1)+'" r="9" fill="none" stroke="var(--c2)" stroke-width="2"/>'+tx(sx(b),sy(l.ho[b])-13,'best held-out',{fs:11,a:'middle',c:'var(--c2)'})}}
      return svgW(w,H,s,'Evolution trajectory of one lineage')},
    counters(m,k,e){const l=cur,i=Math.min(k,l.n-1);let best=0;for(let j=1;j<=i;j++)if(l.pair[j]>l.pair[best])best=j;
      const dv=l.pair[i]-l.pair[0];let h='';h+=stat('Version',k>=l.n?'declared H'+l.declared:'H'+i+' of H'+(l.n-1),'pairs spent: '+i+' of 10');
      h+=stat('Visible pair',l.pair[k>=l.n?l.declared:i].toFixed(1),(k>=l.n?'declared minus H0: ':'vs H0: ')+sg(k>=l.n?l.pair[l.declared]-l.pair[0]:dv,1)+(Math.abs(k>=l.n?l.pair[l.declared]-l.pair[0]:dv)<=4.75?' (inside ±4.75)':''));
      h+=stat('Best visible so far','H'+best,l.pair[best].toFixed(1));
      const j=k>=l.n?l.declared:i;h+=stat('Held-out-630',m==='ho'?l.ho630[j]+'/630':'hidden',m==='ho'?l.ho[j].toFixed(2)+'%, vs H0 '+sg(l.ho[j]-l.ho[0],2):'never shown to the creator');return h}};
  function star(cx,cy,r){let d='';for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.45:r;d+=(i?'L':'M')+(cx+rr*Math.cos(a)).toFixed(1)+','+(cy+rr*Math.sin(a)).toFixed(1)}return d+'Z'}
  const an=makeAnim(o);
  function table(){const l=cur;let h='<tr><th>Version</th><th class="num">SWE-100</th><th class="num">Terminal-89</th><th class="num">Pair</th><th class="num">Feedback rank</th><th class="num">Held-out-630</th><th class="num">%</th><th class="num">Held-out rank</th></tr>';
    const rk=a=>a.map(v=>1+a.filter(x=>x>v).length);const rf=rk(l.pair),rh=rk(l.ho);
    for(let i=0;i<l.n;i++)h+='<tr'+(i===l.declared?' style="background:var(--hl)"':'')+'><td>H'+i+(i===l.declared?' (declared)':'')+'</td><td class="num">'+l.swe100[i]+'</td><td class="num">'+l.term89[i]+'</td><td class="num">'+l.pair[i].toFixed(2)+'</td><td class="num">'+rf[i]+'</td><td class="num">'+l.ho630[i]+'</td><td class="num">'+l.ho[i].toFixed(2)+'</td><td class="num">'+rh[i]+'</td></tr>';
    $('evTab').innerHTML=h}
  function pick(){const l=cur,b=$('pick');b.innerHTML='';$('pickOut').innerHTML='';
    for(let i=1;i<l.n;i++){const x=document.createElement('button');x.textContent='H'+i;x.id='pk'+i;x.addEventListener('click',()=>{b.querySelectorAll('button').forEach(y=>y.classList.toggle('on',y===x));
      const rk=a=>v=>1+a.filter(z=>z>v).length,rf=rk(l.pair),rh=rk(l.ho);
      $('pickOut').innerHTML=stat('Your pick, H'+i,'held-out '+l.ho[i].toFixed(2)+'%','visible rank '+rf(l.pair[i])+' of '+l.n+', held-out rank '+rh(l.ho[i])+' of '+l.n)
        +stat('The creator\'s pick, H'+l.declared,'held-out '+l.ho[l.declared].toFixed(2)+'%','visible rank '+rf(l.pair[l.declared])+', held-out rank '+rh(l.ho[l.declared]))
        +stat('Best held-out, H'+l.best_ho,l.ho[l.best_ho].toFixed(2)+'%','H0 was '+l.ho[0].toFixed(2)+'%')});b.appendChild(x)}}
  sel.addEventListener('change',()=>{cur=LIN[+sel.value];o.modes=build(cur);an.st.play=false;an.st.k=0;an.st.t=1;an.st.lk=-1;an.draw();table();pick()});
  table();pick();
  onTab('t-run',()=>{refit($('evSvg'))});
})();
