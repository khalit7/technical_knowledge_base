// ---- Follow the audit: one square per question through the paper's pipeline, then the protocol simulator ----
(function(){const F=T.funnel,TB=Object.fromEntries(T.t1.map(r=>[r.b,r]));
  const C={n:'var(--dim)',ok:LC.ok,rej:'var(--bad)',Q:LC.Q,G:LC.G,M:LC.M,rp:LC.rp,un:'var(--c8)'};
  const g1=b=>TB[b].mean.gpt, p1=b=>TB[b].pass.gpt;
  // Each benchmark: dot categories with counts, then per step a map category -> [group order (-1 removed), colour, opacity].
  function rejBench(b,extra){const f=F[b],pre=extra.pre||0;const cats=[];if(pre)cats.push(['pre',pre]);cats.push(['acc',f.acc],['Q',f.Q],['G',f.G],['M',f.M]);
    const st=[{pre:[0,C.n,.3],acc:[0,C.n,1],Q:[0,C.n,1],G:[0,C.n,1],M:[0,C.n,1]},
              {pre:[-1,C.n,0],acc:[0,C.n,1],Q:[0,C.n,1],G:[0,C.n,1],M:[0,C.n,1]},
              {pre:[-1,C.n,0],acc:[0,C.ok,1],Q:[1,C.rej,1],G:[1,C.rej,1],M:[1,C.rej,1]},
              {pre:[-1,C.n,0],acc:[0,C.ok,1],Q:[3,C.Q,1],G:[1,C.G,1],M:[2,C.M,1]},
              {pre:[-1,C.n,0],acc:[0,C.ok,1],Q:[9,C.Q,.2],G:[1,C.G,1],M:[2,C.M,1]},
              {pre:[-1,C.n,0],acc:[0,C.ok,1],Q:[9,C.Q,.2],G:[0,C.ok,1],M:[2,C.M,1]}];
    return {cats,st}}
  const IMP=RC.implied;
  const B={
   'HLE-Physics':Object.assign(rejBench('HLE-Physics',{pre:28}),{steps:[
     ['230 physics questions','Humanity\'s Last Exam has 230 physics questions. The 28 that need an image (faded) are set aside, leaving 202 text-only questions ('+A(ax('A2.SS2.SSS1'),'Appendix B.2.1')+').'],
     ['202 text-only questions','The pre-audit score is measured on these 202 with the original materials and HLE\'s own judge: GPT-5.6-Sol 47.28% mean@4, 55.94% pass@4 ('+A(ax('S3.T1'),'Table 1')+').'],
     ['A separate audit run','GPT-5.6-Sol at High effort gets up to five attempts per question (tools on the fifth) and stops at the first accepted answer. 104 are accepted at least once; 98 are rejected every time and go to the experts ('+A(ax('A2.SS3'),'Appendix B.3')+').'],
     ['Experts label the 98 rejections','86 benchmark errors (broken question or wrong key), 4 grader errors (a correct answer marked wrong), 8 model errors. The 104 accepted answers are not reviewed.'],
     ['Benchmark errors are excluded','The 86 leave the benchmark (faded). 116 of 202 questions remain: 57% of the text-only set.'],
     ['Re-graded with the HLE-adapted judge','On the 116 kept, GPT-5.6-Sol scores 78.66% mean@4 and 91.38% pass@4. The audit counts alone imply (104 + 4) / 116 = '+IMP['HLE-Physics'].implied.toFixed(1)+'%: the corrected score is mostly fixed before the re-run.']]}),
   'PHYBench':Object.assign(rejBench('PHYBench',{}),{steps:[
     ['100 of 500 problems','PHYBench has 500 problems but public reference solutions for only 100; the authors asked for the rest and did not get them, so all analysis uses these 100 ('+A(ax('A2.SS1.SSS1'),'Appendix B.1.1')+').'],
     ['Pre-audit score','Graded by PHYBench\'s Expression Edit Distance, where acceptance needs an EED score of 100: GPT-5.6-Sol 26.50% mean@4, 34.00% pass@4.'],
     ['A separate audit run','Up to five attempts without tools, stopping at the first EED score of 100. 44 accepted, 56 rejected on all five.'],
     ['Experts label the 56 rejections','13 benchmark errors, 40 grader errors, 3 model errors. Most rejections here were correct answers the edit-distance grader could not recognise.'],
     ['Benchmark errors are excluded','The 13 leave (faded); 87 questions remain.'],
     ['Re-graded with the HLE-adapted judge','GPT-5.6-Sol: 90.23% mean@4, 95.40% pass@4 on the 87. The audit counts imply (44 + 40) / 87 = '+IMP['PHYBench'].implied.toFixed(1)+'%.']]}),
   'PRISM-Physics':Object.assign(rejBench('PRISM-Physics',{}),{steps:[
     ['100 sampled problems','PRISM-Physics has 1,401 problems; 549 need images and 19 have formatting or loading issues, leaving 833 text-only problems, from which 100 are sampled at random ('+A(ax('A2.SS1.SSS2'),'Appendix B.1.2')+').'],
     ['Pre-audit score','With PRISM-Physics\'s own final-answer grader: GPT-5.6-Sol 13.00% mean@4, 24.00% pass@4.'],
     ['A separate audit run','One attempt per problem: 26 accepted, 74 rejected.'],
     ['Experts label the 74 rejections','26 benchmark errors, 48 grader errors and no model errors at all.'],
     ['Benchmark errors are excluded','The 26 leave (faded); 74 questions remain.'],
     ['Re-graded with the HLE-adapted judge','GPT-5.6-Sol: 94.59% mean@4, 95.95% pass@4 on the 74. The audit counts imply (26 + 48) / 74 = '+IMP['PRISM-Physics'].implied.toFixed(1)+'%.']]}),
   'UGPhysics':Object.assign(rejBench('UGPhysics',{}),{steps:[
     ['100 sampled problems','100 sampled at random from the 5,520 English text-only problems. UGPhysics grades with SymPy plus an LLM judge; the paper swaps its gpt-4o judge for a frontier model ('+A(ax('A2.SS1.SSS3'),'Appendix B.1.3')+').'],
     ['Pre-audit score','GPT-5.6-Sol 83.00% mean@4, 85.00% pass@4: already high, because the LLM judge catches most equivalent answers.'],
     ['A separate audit run','One attempt per problem: 78 accepted, 22 rejected.'],
     ['Experts label the 22 rejections','18 benchmark errors, 3 grader errors, 1 model error.'],
     ['Benchmark errors are excluded','The 18 leave (faded); 82 questions remain.'],
     ['Re-graded with the HLE-adapted judge','GPT-5.6-Sol: 92.07% mean@4, 93.90% pass@4 on the 82. The audit counts imply (78 + 3) / 82 = '+IMP['UGPhysics'].implied.toFixed(1)+'%.']]}),
   'CMT-Benchmark':{cats:[['ok',18],['Qr',29],['Qx',1],['M',2]],st:[
     {ok:[0,C.n,1],Qr:[0,C.n,1],Qx:[0,C.n,1],M:[0,C.n,1]},
     {ok:[0,C.un,1],Qr:[1,C.Q,1],Qx:[1,C.Q,1],M:[2,C.M,1]},
     {ok:[0,C.un,1],Qr:[1,C.rp,1],Qx:[9,C.Q,.2],M:[2,C.M,1]},
     {ok:[0,C.un,1],Qr:[1,C.rp,1],Qx:[9,C.Q,.2],M:[2,C.M,1]}],steps:[
     ['50 expert-written questions','All 50 condensed matter theory questions. CMT-Benchmark has no public grader, so the HLE judge is adapted and used before and after. Pre-audit, GPT-5.6-Sol scores 61.00% mean@4, 72.00% pass@4 ('+A(ax('A2.SS2.SSS2'),'Appendix B.2.2')+').'],
     ['Every question reviewed','Condensed matter experts check each statement and reference, whatever the model answered: 30 of 50 have benchmark errors; 2 model errors are found on questions valid as written. Grader errors cannot be counted (no per-question pre-audit grades).'],
     ['Repair, or exclude','29 of the 30 are repaired (teal): a missing assumption added, a reference corrected. One cannot be repaired and leaves (faded). 49 remain.'],
     ['Re-graded with the same judge','GPT-5.6-Sol: 87.24% mean@4, 97.96% pass@4 on the 49. The judge did not change, so this rise is the materials alone.']]},
   'CritPt':{cats:[['aa',1],['na',14],['ok',30],['Qr',19],['Qx',2],['M',5]],st:[
     {aa:[0,C.n,.3],na:[0,C.n,1],ok:[0,C.n,1],Qr:[0,C.n,1],Qx:[0,C.n,1],M:[0,C.n,1]},
     {aa:[-1,C.n,0],na:[1,C.n,.35],ok:[0,C.n,1],Qr:[0,C.n,1],Qx:[0,C.n,1],M:[0,C.n,1]},
     {aa:[-1,C.n,0],na:[3,C.n,.35],ok:[0,C.un,1],Qr:[1,C.Q,1],Qx:[1,C.Q,1],M:[2,C.M,1]},
     {aa:[-1,C.n,0],na:[-1,C.n,0],ok:[0,C.un,1],Qr:[1,C.rp,1],Qx:[9,C.Q,.2],M:[2,C.M,1]},
     {aa:[-1,C.n,0],na:[-1,C.n,0],ok:[0,C.un,1],Qr:[1,C.rp,1],Qx:[9,C.Q,.2],M:[2,C.M,1]}],steps:[
     ['71 research challenges','CritPt has 71 challenges; Artificial Analysis evaluates 70 (one faded) and reports only an aggregate: GPT-5.6-Sol Max 32.29% mean@5, which is 113 correct attempts of 350 ('+A(ax('A2.SS2.SSS3'),'Appendix B.2.3')+').'],
     ['56 challenges selected for audit','The audit covers a 56-challenge subset; the other 14 (faded) are not reviewed. The paper does not say how the 56 were chosen.'],
     ['Every selected challenge reviewed and re-solved','A specialist per challenge checks the statement and, because the official references are private, solves it independently. 21 benchmark errors and 5 model errors; grader errors cannot be counted.'],
     ['Repair, or exclude','19 of the 21 are repaired (teal), for example by writing out the Hamiltonian of challenge 44; 2 leave (faded), as do the 14 never audited. 54 remain, with references written by the auditors.'],
     ['Re-graded with the HLE-adapted judge','GPT-5.6-Sol Max with Codex and tools: 87.50% mean@4, 94.44% pass@4 on the 54. Harness, references, judge, metric and questions all differ from the 32.29% before.']]}
  };
  const KEY={rej:[['Not yet graded',C.n],['Accepted',C.ok],['Rejected',C.rej],['Benchmark error (faded: excluded)',C.Q],['Grader error',C.G],['Model error',C.M]],
    full:[['Not graded or not audited',C.n],['Reviewed, no defect',C.un],['Benchmark error (faded: excluded)',C.Q],['Repaired',C.rp],['Model error',C.M]]};
  // counters per benchmark and step
  function counters(m,k,e){const f=F[m],b=B[m],r=TB[m];
    if(f.acc!=null){const N=f.sample||f.pool,kept=k>=4?f.kept:N;
      return stat('Questions in play',k===0&&m==='HLE-Physics'?'230':String(kept),k===0&&m==='HLE-Physics'?'28 need images':(k>=4?f.excluded+' excluded':'of '+N))+
        stat('Audit run',k>=2?f.acc+' accepted, '+f.rej+' rejected':'not yet run','GPT-5.6-Sol High')+
        stat('Expert labels',k>=3?'<span style="color:'+C.Q+'">'+f.Q+'</span> / <span style="color:'+C.G+'">'+f.G+'</span> / <span style="color:'+C.M+'">'+f.M+'</span>':'none yet','benchmark / grader / model')+
        stat('GPT-5.6-Sol, mean@4',k>=5?r.mean.gpt[1].toFixed(2)+'%':r.mean.gpt[0].toFixed(2)+'%',k>=5?'corrected, '+f.kept+' questions':'pre-audit, '+r.n0+' questions')}
    const N=f.audited||f.pool,kept=k>=(m==='CritPt'?3:2)?f.kept:(m==='CritPt'?(k>=1?56:70):50);
    return stat('Questions in play',String(kept),m==='CritPt'?(k>=3?'2 excluded':(k>=1?'of 70 evaluated':'71 in the benchmark')):(k>=2?'1 excluded':'all reviewed'))+
      stat('Expert labels',k>=(m==='CritPt'?2:1)?'<span style="color:'+C.Q+'">'+f.Q+'</span> / <span style="color:'+C.M+'">'+f.M+'</span>':'none yet','benchmark / model errors')+
      stat('Repaired',k>=(m==='CritPt'?3:2)?String(f.repaired):'0','problem statement or reference fixed')+
      stat('GPT-5.6-Sol',k>=b.steps.length-1?r.mean.gpt[1].toFixed(2)+'%':r.mean.gpt[0].toFixed(2)+'%',k>=b.steps.length-1?'mean@4, corrected, '+f.kept+' questions':(m==='CritPt'?'mean@5, Artificial Analysis, 70':'mean@4, pre-audit, 50'))}
  // dot layout for a step: visible dots grouped by order, placed row by row
  function layout(m,k,w){const b=B[m],st=b.st[Math.min(k,b.st.length-1)];const dots=[];b.cats.forEach(([c,n])=>{for(let i=0;i<n;i++)dots.push({c,i})});
    const N=dots.length,sz=N>150?(w<520?10:13):(w<520?14:19),gap=N>150?2:3,cols=Math.max(8,Math.floor((w-4)/(sz+gap)));
    const vis=dots.map((d,j)=>({j,s:st[d.c]})).filter(x=>x.s[0]>=0).sort((a,b2)=>a.s[0]-b2.s[0]||a.j-b2.j);
    const pos=new Array(N);let row=0,col=0,lastG=null;
    vis.forEach(x=>{if(lastG!==null&&x.s[0]!==lastG){if(col>0){row++;col=0}row+=.35}lastG=x.s[0];pos[x.j]={x:2+col*(sz+gap),y:2+row*(sz+gap)};col++;if(col>=cols){col=0;row++}});
    const hgt=2+(row+(col>0?1:0))*(sz+gap)+4;
    return {dots,pos,st,sz,h:hgt}}
  const anim=makeAnim({id:'au',mode:'HLE-Physics',dur:2600,modes:Object.fromEntries(Object.entries(B).map(([m,b])=>[m,b.steps.map(([t,c])=>({t,c}))])),
    draw(m,k,e,w){const cur=layout(m,k,w),prev=layout(m,Math.max(0,k-1),w);let s='';const H=Math.max(...B[m].st.map((x,j)=>layout(m,j,w).h));
      cur.dots.forEach((d,j)=>{const a=prev.pos[j],b=cur.pos[j],sa=prev.st[d.c],sb=cur.st[d.c];
        const pa=a||b,pb=b||a;if(!pa)return;const x=pa.x+(pb.x-pa.x)*e,y=pa.y+(pb.y-pa.y)*e,op=sa[2]+(sb[2]-sa[2])*e,col=e<.5?sa[1]:sb[1];
        if(op>0.01)s+=rc(x,y,cur.sz,cur.sz,col,{r:2,op:+op.toFixed(2)})});
      $('auKey').innerHTML=(F[m].acc!=null?KEY.rej:KEY.full).map(([n,c])=>'<span><i class="lk" style="background:'+c+'"></i>'+n+'</span>').join('');
      return svgW(w,H,s,'Questions of '+m+' through the audit')},
    counters});
})();

// The protocol simulator: expected counts under the paper's protocol against the true accuracy.
(function(){const host=$('smPlot');let P='HLE-Physics';const ids=['D','A','G','F','C','E'];
  // state holds exact values: a preset sets the paper's ratios exactly, a slider sets its own value
  const key={D:'d',A:'a',G:'g',F:'f',C:'c',E:'e'};let cur={};
  function preset(b){cur=Object.assign({},PRESET[b]);ids.forEach(k=>$('sm'+k).value=(100*cur[key[k]]).toFixed(1))}
  const get=()=>cur;
  function draw(w){const p=get(),r=auditSim(p);ids.forEach(k=>$('sm'+k+'v').textContent=(100*cur[key[k]]).toFixed(1)+'%');
    const segs=[['Accepted, correct',r.accC,LC.ok,1],['Accepted, wrong (false accept)',r.accW,LC.M,.45],['Accepted, defective',r.accQ,LC.Q,.45],['Grader error',r.G,LC.G,1],['Model error, kept',r.Mk,LC.M,1],['Model error, excluded',r.Mx,LC.M,.2],['Benchmark error, excluded',r.Q,LC.Q,1]];
    const x0=4,x1=w-4,X=v=>x0+(x1-x0)*v/r.N;let s='',acc=0;
    s+=tx(x0,14,'The '+r.N+' questions, by what happens to them',{fs:12,w:600});
    segs.forEach(([n,v,c,op])=>{if(v<=0)return;const xx=X(acc),ww=X(acc+v)-xx;s+='<g><title>'+n+': '+v.toFixed(1)+' questions</title>'+rc(xx,22,Math.max(0,ww-.5),26,c,{r:1,op})+'</g>';acc+=v});
    // bracket: what the audit reviews (the rejections)
    const ra=r.accC+r.accW+r.accQ;s+=ln2(X(0),56,X(ra),56,'var(--mute)')+tx((X(0)+X(ra))/2,70,'accepted: never reviewed',{fs:11,a:'middle',c:'var(--mute)'});
    s+=ln2(X(ra),56,X(r.N),56,'var(--ink)',{sw:1.6})+tx(Math.min(x1-4,(X(ra)+X(r.N))/2),84,'rejected: reviewed by experts',{fs:11,a:(X(ra)+X(r.N))/2>x1-90?'end':'middle'});
    const lg=segs.filter(x=>x[1]>0.05);let lx=x0,ly=104;lg.forEach(([n,v,c,op])=>{const lw2=n.length*6.2+24;if(lx+lw2>x1){lx=x0;ly+=16}s+=rc(lx,ly-9,10,10,c,{r:2,op})+tx(lx+14,ly,n,{fs:11});lx+=lw2});
    const top=ly+14,nr=w<520,rows=[['Raw score',r.raw,'var(--mute)'],[nr?'Paper\'s corrected':'Paper\'s corrected score',r.prot,LC.ok],[nr?'True accuracy':'True accuracy, valid questions',r.truth,'var(--ink)']];
    const lw=w<520?124:200,bx0=lw,bx1=w-56,BX=v=>bx0+(bx1-bx0)*v;
    rows.forEach(([n,v,c],i)=>{const y=top+i*28;s+=tx(4,y+17,n,{fs:12})+rc(bx0,y+4,bx1-bx0,20,'var(--soft)',{r:3})+rc(bx0,y+4,BX(v)-bx0,20,c,{r:3})+tx(BX(v)+5,y+19,(100*v).toFixed(1)+'%',{fs:12,w:600})});
    host.innerHTML=svgW(w,top+3*28+6,s,'Simulated audit');
    const bias=100*(r.prot-r.truth),pr=PRESET[P];
    $('smOut').innerHTML=stat('Protocol minus truth',(Math.abs(bias)<0.05?'0.0':(bias>0?'+':'')+bias.toFixed(1))+' points','the corrected score\'s bias')+stat('Questions kept',r.kept.toFixed(1),'of '+r.N)+stat('Errors the audit cannot see',r.unseen.toFixed(1),'questions counted correct, never reviewed')+stat('Rejections reviewed',r.rej.toFixed(1),'model share '+(r.rej?100*(r.Mk+r.Mx)/r.rej:0).toFixed(0)+'%');
    const atP=p.d===pr.d&&p.a===pr.a&&p.g===pr.g&&p.f===0&&p.c===0&&p.e===0;
    $('smNote').innerHTML=atP?'<b>Defaults reproduce '+P+'\'s audit counts by construction</b> ('+A(ax('A3.T2'),'Table 2')+'): '+pr.rej+' of '+pr.N+' rejected, and the protocol returns the true accuracy exactly ('+(100*pr.a).toFixed(1)+'%) because nothing it cannot see is switched on. The paper re-ran the model, so its reported pass@4 ('+RC.implied[P].pass4.toFixed(2)+'%) differs from this by sampling. Move the last three sliders to see the bias.':'The last three rates are not measured anywhere in the paper; any value above zero is illustrative. '+(bias>0.05?'The protocol now overstates the true accuracy.':bias<-0.05?'The protocol now understates the true accuracy.':'The protocol is still unbiased.')}
  ids.forEach(k=>$('sm'+k).addEventListener('input',e=>{cur[key[k]]=+e.target.value/100;refit(host)}));
  segBind('smP',m=>{P=m;setPressed('smP',m);preset(m);refit(host)});preset(P);fit(host,draw)})();
