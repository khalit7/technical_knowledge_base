// ---- Method: the four stages of Eq. 8, task-agnostic (the released huggingface_hub Creator run) against
// task-oriented (the MLE-bench protocol of Appendix A.2.1). Same stages, same layout, two anchors. ----
function wrapT(s,max){const w=s.split(' '),out=[];let l='';w.forEach(x=>{if((l+' '+x).trim().length>max&&l){out.push(l);l=x}else l=(l+' '+x).trim()});if(l)out.push(l);return out}
(function(){
  const H=LIB.hub, nPass=H.checks.filter(c=>c[1]==='PASS').length, nChk=H.checks.length;
  const ST=['Anchor z','Scope 𝒬','Ground 𝒳','Construct 𝒢̃','Verify','Accept (𝒢, R)'];
  const TXT={
    ag:['A source, before any task exists: the huggingface/huggingface_hub repository, package version 1.29.0, pinned to one commit.',
        'Source understanding, then capability identification: an include and exclude map over source, docs, examples, tests, scripts and config. Build outputs, vendored code and caches are left out.',
        'Knowledge extraction in a private Python environment: live checks of imports, versions, public signatures and CLI entry points. Docs and tests give intent; source and live inspection confirm the API claims.',
        'Tool encapsulation and skill packaging: a router-like entry skill and five sub-skills (Hub operations, downloads and storage, inference and endpoints, CLI and automation, hosted compute), with references and four bundled scripts.',
        nChk+' checks: '+nPass+' pass (shape, frontmatter, licence, links, privacy, routing, scripts, usability-case shape, self-refine, backend gate), 1 warning. The package\'s own unit and mocked tests: 720 pass; 2 native failures and 3 unsafe selections excluded.',
        'Accepted "verified with warnings", with its record R (evidence, checks, known gaps). Classified against the fixed taxonomy as MLOps, Model Hubs and Registries; the router is rebuilt.'],
    to:['A problem: one MLE-bench competition. Its own web page and competition-specific content are blocked as sources.',
        'Task decomposition, then capability gap analysis: a research plan before any code. Which pretrained model to fine-tune, how to preprocess, whether the domain needs related work.',
        'Source discovery: web search assembles the evidence for the gaps. The evidence is gathered for this task, not selected from a fixed source.',
        'Skill generation: the evidence is synthesised into an execution-oriented skill. Codex reads it, writes the code and runs a diagnostic trial on the competition.',
        'Execution feedback is the check: after each trial, summarise the log, analyse the result, revise the skill (Eq. 9). Repeat until the exploration budget, up to 24 GPU-hours, runs out or refinement stops paying.',
        'Freeze a descriptive skill: diagnoses, model and preprocessing choices, training strategies, expected observations and checks, no runnable scripts. Then a separate run of up to 24 GPU-hours, the only budget the comparison counts.']};
  const CAP={
    ag:['The task-agnostic form starts from what a source makes possible. Nothing is known yet about who will use the skills.','Scoping decides which capabilities are worth exposing; the evidence boundary keeps the graph tied to public package behaviour, not to the checkout\'s state.','Grounding gathers support for each capability from the source itself; no claim enters the graph without a confirming source file or live check.','Construction turns the evidence into the three layers of Eq. 6: SKILL.md files, references, scripts.','Verification is mostly structural and package-level. The 15 usability cases are checked for their shape; the report does not record an agent being run on them.','Paid once (about $40 of model time per repository in the library) and reused by every later task.'],
    to:['The task-oriented form starts from the problem. The skills will be built for this competition and used on it.','The plan decides what the agent does not yet know how to do for this task.','Sources are searched for, so the evidence set is built for the task.','The first skill version is tried at once on the real task data.','Verification here is the task\'s own feedback: what worked in the last trial shapes the next skill. "Exploration optimizes learning progress, not medal attainment."','The result is the notes of a previous attempt at this exact competition. The 24 GPU-hours spent making it are outside the "matched budget".']};
  const modes={ag:ST.map((t,i)=>({t:t+': task-agnostic',c:CAP.ag[i]})),to:ST.map((t,i)=>({t:t+': task-oriented',c:CAP.to[i]}))};
  const CNT={ag:{skill:[0,0,0,6,6,6],scr:[0,0,0,4,4,4],gpu:['0','0','0','0','0','0'],ver:['','','','',nPass+' of '+nChk+' pass; 720 package tests','accepted with warnings']},
             to:{skill:[0,0,0,1,1,1],scr:[0,0,0,'trial code','trial code',0],gpu:['0','0','0','1 trial','up to 24','up to 24'],ver:['','','','','each trial\'s log and result','frozen']}};
  makeAnim({id:'mt',mode:'ag',modes,dur:3200,
    draw(m,k,e,w){const narrow=w<560,lw=narrow?92:120,bx0=lw+10,bw=w-bx0-4,fs=12,mc=Math.max(18,Math.floor(bw/(fs*0.56)));
      let y=8,s='';const rows=[];
      TXT[m].forEach((t,i)=>{const L=wrapT(t,mc);rows.push({L,h:Math.max(34,L.length*16+12)})});
      rows.forEach((r,i)=>{const done=i<k,cur=i===k,op=done?1:cur?0.35+0.65*e:0.18;
        const col=m==='ag'?'var(--c1)':'var(--c2)';
        s+=rc(0,y,lw,r.h,cur?col:'var(--soft)',{op:done||cur?1:0.6,s:'var(--line)'});
        s+=tx(lw/2,y+r.h/2+4,ST[i],{fs:12,a:'middle',w:cur?'700':'400',c:cur?'#fff':'var(--ink)'});
        if(i<5)s+=ln2(lw/2,y+r.h,lw/2,y+r.h+8,'var(--mute)');
        s+=G(op,rc(bx0,y,bw,r.h,'none',{s:cur?col:'var(--line)',sw:cur?2:1})+r.L.map((l,j)=>tx(bx0+8,y+18+j*16,l,{fs})).join(''));
        y+=r.h+8});
      // budget strip: what the comparison counts
      y+=6;const bw2=w-8,u=bw2/48;
      if(m==='to'){const ex=k<3?0:k===3?2*e:k===4?2+22*e:24;
        s+=tx(0,y+12,'Per competition, GPU-hours (up to):',{fs:12,c:'var(--mute)'});y+=20;
        s+=rc(0,y,24*u,22,'var(--c2)',{op:.25,s:'var(--c2)',da:'4 3'})+rc(0,y,ex*u,22,'var(--c2)');
        s+=tx(4,y+15,'explore '+(ex>=24?'24':ex.toFixed(0)),{fs:12,c:ex*u>70?'#fff':'var(--ink)'});
        const ron=k===5?e:0;s+=rc(24*u,y,24*u,22,'var(--c1)',{op:.25+.75*ron});s+=tx(24*u+4,y+15,'run 24 (counted)',{fs:12,c:ron>.5?'#fff':'var(--ink)'});
        s+=tx(0,y+38,'Only the run is matched between the two arms.',{fs:12,c:'var(--mute)'});y+=46}
      else{s+=tx(0,y+12,'Cost: about $40 of model time per repository, paid once',{fs:12,c:'var(--mute)'});y+=20;
        s+=rc(0,y,bw2,22,'var(--c1)',{op:k===5?1:.25});s+=tx(6,y+15,'amortised over every later task that opens the graph',{fs:12,c:k===5?'#fff':'var(--ink)'});y+=30}
      return svgW(w,y+4,s,'Four stages of skill distillation, step '+(k+1))},
    counters(m,k){const c=CNT[m];return stat('SKILL.md files',c.skill[k])+stat('Runnable scripts',c.scr[k])+stat('GPU-hours on the task before the run',c.gpu[k])+stat('Verification',c.ver[k]||'not yet')}});
})();
