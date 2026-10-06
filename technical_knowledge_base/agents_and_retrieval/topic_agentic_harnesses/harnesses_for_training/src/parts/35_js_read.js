// ---- Reading tab: facts, section 1 charts, environment animation, advantages, loss masks, papers, frameworks, search animation ----
(function(){
  const HT=window.HT,esc=RD.esc,$=id=>document.getElementById(id);
  const HN=HT.harness,MN={local:'Qwen3-4B (local)',haiku:'Claude Haiku 4.5'},HORD=['bash','tools','plain','ccfull'];
  // 1. numbers quoted in prose
  document.querySelectorAll('[data-ht]').forEach(el=>{const v=HT.f[el.dataset.ht];el.textContent=v==null?'?':v;if(v==null)el.style.color='var(--bad)'});
  // 2. section 1: success and input tokens by harness, per model
  function res1(){
    const el=$('ht-res');if(!el)return;let h='';
    ['local','haiku'].forEach(m=>{
      h+='<div class="band">'+esc(MN[m])+'</div>';
      const rows=HORD.map(k=>HT.table.find(x=>x.m===m&&x.h===k)).filter(Boolean);
      const mx=Math.max(...HT.table.filter(x=>x.m===m).map(x=>x.inp));
      rows.forEach(r=>{
        h+='<div class="row"><div class="nm">'+esc(HN[r.h])+'</div><div class="track" title="success"><span style="width:'+(r.bin*100)+'%;background:var(--good)"></span><span style="width:'+((r.vis-r.bin)*100)+'%;background:var(--c5)"></span></div><div class="val">'+Math.round(r.bin*100)+'% <span class="mu">('+Math.round(r.vis*100)+')</span></div></div>'+
          '<div class="row"><div class="nm mu small">input tokens</div><div class="track"><span style="width:'+(100*r.inp/mx)+'%;background:var(--c1)"></span></div><div class="val mu">'+(r.inp/1000).toFixed(1)+'k</div></div>';
      });
    });
    el.innerHTML=h;
  }
  res1();
  // 3. held-out checks failed by rollouts that passed every visible test
  (function(){const el=$('ht-hofail');if(!el)return;
    const R=HT.runs.filter(r=>r.vis&&!r.bin);const c={};R.forEach(r=>r.ho.forEach(n=>{c[n]=c[n]||{n,k:0,m:{}};c[n].k++;const key=r.m+' '+r.h;c[n].m[key]=(c[n].m[key]||0)+1}));
    const L=Object.values(c).sort((a,b)=>b.k-a.k);
    el.innerHTML='<div class="tw"><table class="ht-t"><thead><tr><th>Held-out check that failed</th><th>Rollouts</th><th>Where</th></tr></thead><tbody>'+L.map(x=>{const ck=HT.checks.find(q=>q.n===x.n);
      return '<tr><td><code>'+esc(x.n)+'</code><div class="mu small"><code>'+esc(ck?ck.expr:'')+'</code></div></td><td class="ht-num">'+x.k+'</td><td class="small">'+Object.entries(x.m).map(([k,v])=>{const p=k.split(' ');return esc((p[0]==='local'?'4B':'Haiku')+', '+HN[p[1]])+': '+v}).join('; ')+'</td></tr>'}).join('')+'</tbody></table></div><p class="small mute">Rollouts that passed every test in their workspace but not the hidden verifier, by the held-out check they failed (a rollout can fail more than one).</p>';
  })();
  // 4. environment animation on one real rollout
  (function(){
    const card=$('ht-envcard');if(!card)return;
    const r=HT.runs.find(x=>x.m==='haiku'&&x.h==='bash'&&x.vis&&!x.bin&&HT.traj[x.id])||HT.runs.find(x=>x.vis&&!x.bin&&HT.traj[x.id])||HT.runs.find(x=>HT.traj[x.id]);
    const tr=HT.traj[r.id];const task=HT.tasks.find(t=>t.id===r.t);
    const steps=[{node:'task',t:'Reset',p:'A fresh copy of the clean library gets the bug for task '+r.t+' ('+task.bugs.join(', ')+'); a new container starts with no network and the workspace mounted at /work. The model receives the system prompt, the tool list and the task: "'+task.prompt+'"'}];
    let i=0,inp=0;
    tr.forEach((e,k)=>{if(e[0]!=='c')return;i++;inp+=e[1]||0;
      const obs=[];for(let j=k+1;j<tr.length&&tr[j][0]==='o';j++)obs.push(tr[j]);
      const act=e[4].length?e[4].map(t=>t[0]+' '+t[1]).join(' ; '):'(no tool call: the episode ends)';
      steps.push({node:e[4].length?'env':'model',t:'Call '+i+(e[4].length?': action':': final reply'),p:'<code>'+esc(act.slice(0,260))+'</code>'+(obs.length?'<br>Observation: <code>'+esc(obs.map(o=>o[2]).join(' | ').replace(/\s+/g,' ').slice(0,220))+'</code>':(e[3]?'<br>'+esc(e[3].slice(0,240)):'')),inp:inp,calls:i})});
    steps.push({node:'ver',t:'Verify',fin:true});
    const W=()=>Math.min(860,RD.width(card));
    function draw(s){
      const st=steps[s],mode=HTX.envMode||'vis',w=W(),narrow=w<520;
      const nodes=narrow?{task:[0,0],model:[1,0],env:[0,1],harness:[1,1],ver:[0,2],rew:[1,2]}:{task:[0,0],model:[1,0],harness:[2,0],env:[3,0],ver:[2,1],rew:[3,1]};
      const cols=narrow?2:4,bw=(w-20)/cols-14,bh=48,gy=70;
      const lab={task:'Task + buggy repo',model:'Model (policy)',harness:'Harness: tools, loop',env:'Container, /work',ver:mode==='vis'?'Workspace tests':'20 hidden checks',rew:'Reward'};
      const act=st.node==='env'?['model','harness','env']:st.node==='ver'?['ver','rew']:[st.node];
      let g='';
      Object.entries(nodes).forEach(([k,[c,rw]])=>{const x=10+c*(bw+14),y=6+rw*gy,on=act.indexOf(k)>=0;
        g+='<rect x="'+x+'" y="'+y+'" width="'+bw+'" height="'+bh+'" rx="8" fill="'+(on?'var(--acc2)':'var(--soft)')+'" stroke="'+(on?'var(--acc)':'var(--line)')+'" stroke-width="'+(on?2:1)+'"/>'+RD.t(x+bw/2,y+20,lab[k],{a:'middle',fs:11.5,w:600});
        let sub='';
        if(k==='rew'&&st.fin)sub=mode==='vis'?'visible: '+r.vis:'binary '+r.bin+', partial '+r.part.toFixed(2);
        if(k==='ver'&&st.fin)sub=mode==='vis'?(r.vis?'all 9 pass':'some fail'):(r.res.split('1').length-1)+' of 20 pass';
        if(k==='env'&&st.calls)sub='call '+st.calls;
        if(k==='model'&&st.inp)sub=st.inp.toLocaleString()+' tokens read';
        if(sub)g+=RD.t(x+bw/2,y+37,esc(sub),{a:'middle',fs:11,fill:k==='rew'?(mode==='vis'?(r.vis?'var(--good)':'var(--bad)'):(r.bin?'var(--good)':'var(--bad)')):'var(--mute)'});
      });
      $('ht-envsvg').innerHTML=RD.svg(w,(narrow?3:2)*gy,g,'The environment, with the active part highlighted');
      let cap;
      if(st.fin){cap=mode==='vis'?'The agent\'s own check: the workspace tests '+(r.vis?'all pass, so this verifier pays <b>1</b>. It also reads tests the agent could have edited.':'do not all pass: reward 0.'):
        'Copy textstats/ out of the workspace, ignore its tests, run 20 checks in a fresh read-only container: '+(r.res.split('1').length-1)+' of 20 pass'+(r.ho.length?', failing '+r.ho.map(n=>'<code>'+esc(n)+'</code>').join(', '):'')+'. Binary reward <b>'+r.bin+'</b>.';
        cap+=' Final change: <code>'+esc((HT.diffs[r.d]||'').split('\n').filter(l=>/^[+-][^+-]/.test(l)).join('  ').slice(0,200))+'</code>'}
      else cap=st.p;
      $('ht-envcap').innerHTML='<div class="t">'+st.t+' <span class="mu small">('+esc(r.id)+')</span></div><p>'+cap+'</p>';
    }
    const A=RD.anim({card:'ht-envcard',ctl:'ht-envctl',n:steps.length,draw,ms:1700,label:'Step of the rollout'});
    RD.seg($('ht-envmode'),v=>{HTX.envMode=v;A.redraw()});RD.onResize(()=>A.redraw());
  })();
  // 5. groups and advantages
  (function(){
    const card=$('ht-advcard');if(!card)return;
    const G=HT.groups;const sel=$('ht-advsel');
    const score=g=>{const b=g.bin;const s=b.reduce((x,y)=>x+y,0);return s>0&&s<b.length?0:1};
    const order=G.map((g,i)=>i).sort((a,b)=>score(G[a])-score(G[b]));
    sel.innerHTML=order.map(i=>{const g=G[i];return '<option value="'+i+'">'+(g.m==='local'?'4B':'Haiku')+', '+esc(HN[g.h])+', '+g.t+': '+g.bin.join(' ')+'</option>'}).join('');
    const tok=id=>{const m=HT.mask.find(x=>x.id===id);if(m&&m.counts)return m.counts.gen;const r=HT.runs.find(x=>x.id===id);return r&&r.out||0};
    function adv(rs,norm){const n=rs.length,mu=rs.reduce((a,b)=>a+b,0)/n,sd=Math.sqrt(rs.reduce((a,b)=>a+(b-mu)*(b-mu),0)/n);
      return {mu,sd,a:rs.map((x,i)=>norm==='grpo'?(sd>0?(x-mu)/sd:0):norm==='dr'?x-mu:(n>1?x-(rs.reduce((a,b)=>a+b,0)-x)/(n-1):0))}}
    const STEPS=['Rewards','Group mean (the baseline)','Advantage of each rollout','Every sampled token gets its rollout\'s advantage'];
    function draw(s){
      const g=G[+sel.value],k=HTX.advK||'bin',nm=HTX.advN||'grpo',rs=g[k],A=adv(rs,nm),w=Math.min(860,RD.width(card)),narrow=w<520;
      const L=narrow?70:120,rowH=34,h=rs.length*rowH+30,mid=L+(w-L-10)*0.55,half=(w-L-10)*0.4;
      const maxA=Math.max(1e-9,...A.a.map(Math.abs)),tk=g.ids.map(tok),maxT=Math.max(1,...tk);
      let s2='';
      rs.forEach((r,i)=>{const y=14+i*rowH;
        s2+=RD.t(4,y+14,esc(g.ids[i].split('_').pop()),{fs:11,fill:'var(--mute)'});
        // reward bar (0..1)
        const rw=(mid-L-20)*r;
        s2+='<rect x="'+L+'" y="'+(y+2)+'" width="'+(mid-L-20)+'" height="16" fill="var(--soft)"/><rect x="'+L+'" y="'+(y+2)+'" width="'+rw+'" height="16" fill="var(--c1)"/>'+RD.t(L+4,y+14,(k==='bin'?r:r.toFixed(2)),{fs:11,fill:'var(--ink)'});
        if(s>=1){const mx=L+(mid-L-20)*A.mu;s2+='<line x1="'+mx+'" x2="'+mx+'" y1="'+y+'" y2="'+(y+20)+'" stroke="var(--ink)" stroke-width="2"/>'}
        if(s>=2){const a=A.a[i],len=half*Math.abs(a)/maxA*(s>=3?Math.min(1,0.25+0.75*tk[i]/maxT):1);
          const col=a>0?'var(--good)':a<0?'var(--bad)':'var(--dim)';
          s2+='<line x1="'+mid+'" x2="'+mid+'" y1="'+y+'" y2="'+(y+20)+'" stroke="var(--line)"/><rect x="'+(a>=0?mid:mid-len)+'" y="'+(y+3)+'" width="'+Math.max(1,len)+'" height="'+(s>=3?14:14)+'" fill="'+col+'" opacity="'+(s>=3?0.85:1)+'"/>'+
            RD.t(a>=0?mid+len+4:mid-len-4,y+14,(a>0?'+':'')+a.toFixed(2)+(s>=3?' x '+tk[i]+' tok':''),{fs:11,a:a>=0?'start':'end',fill:'var(--ink)'})}
      });
      s2+=RD.t(L,h-4,'reward',{fs:10,fill:'var(--mute)'})+(s>=2?RD.t(mid,h-4,'advantage',{fs:10,a:'middle',fill:'var(--mute)'}):'');
      $('ht-advsvg').innerHTML=RD.svg(w,h,s2,'Rewards and advantages of one real group');
      const zero=A.a.every(x=>Math.abs(x)<1e-9);
      const txt=[ 'Group of '+rs.length+' real rollouts ('+esc(MN[g.m])+', '+esc(HN[g.h])+', task '+g.t+'), '+(k==='bin'?'pass/fail':'partial')+' reward from the hidden verifier.',
        'Mean '+A.mu.toFixed(3)+(nm==='grpo'?', standard deviation '+A.sd.toFixed(3):'')+'. '+(nm==='rloo'?'RLOO uses the mean of the other rollouts instead, a different baseline for each.':''),
        zero?'Every advantage is zero: all rewards are equal, so this group gives no gradient, only cost. Try the partial reward, or another group.':(nm==='grpo'?'(reward minus mean) divided by the standard deviation.':nm==='dr'?'Reward minus mean, no division: Dr. GRPO.':'Reward minus the mean of the other '+(rs.length-1)+'.')+' Green rollouts are made more likely, red less.',
        'The trainer multiplies each sampled token\'s log-probability gradient by its rollout\'s advantage, so a longer rollout moves more tokens. Token counts: '+(g.m==='local'?'sampled tokens from the loss mask (section 5)':'output tokens reported by Claude Code (thinking included)')+'.'];
      $('ht-advcap').innerHTML='<div class="t">'+STEPS[s]+'</div><p>'+txt[s]+'</p>';
    }
    const A=RD.anim({card:'ht-advcard',ctl:'ht-advctl',n:4,draw,ms:1800,label:'Step'});
    const pick=G.findIndex(g=>g.m==='local'&&g.bin.reduce((a,b)=>a+b,0)===1);if(pick>=0)sel.value=pick;
    sel.addEventListener('change',()=>A.go(0));
    RD.seg($('ht-advrew'),v=>{HTX.advK=v;A.redraw()});RD.seg($('ht-advnorm'),v=>{HTX.advN=v;A.redraw()});RD.onResize(()=>A.redraw());
  })();
  // 6. loss mask viewer
  (function(){
    const sel=$('ht-masksel');if(!sel)return;
    const M=HT.mask.filter(m=>m.runs);if(!M.length){$('ht-maskcard').innerHTML+='<p class="mu">No token view embedded.</p>';return}
    sel.innerHTML=M.map((m,i)=>'<option value="'+i+'">'+esc(m.id)+' (reward '+m.reward+')</option>').join('');
    const NAME={sys:'system prompt and tool schemas',user:'task',gen:'sampled by the model',obs:'tool output',tmpl:'template markers',ins:'inserted by the template, never sampled'};
    const COL={sys:'var(--c4)',user:'var(--c6)',gen:'var(--c3)',obs:'var(--c2)',tmpl:'var(--dim)',ins:'var(--ink)'};
    function draw(){
      const m=M[+sel.value],mode=HTX.maskMode||'mask';
      const trained=c=>mode==='naive'?true:c==='gen';
      $('ht-maskleg').innerHTML=Object.keys(NAME).map(k=>'<span><i style="background:'+COL[k]+'"></i>'+NAME[k]+'</span>').join('');
      const tot=m.total;let h='';
      Object.keys(NAME).forEach(k=>{const n=m.counts[k]||0;h+='<div class="row"><div class="nm">'+NAME[k]+'</div><div class="track"><span style="width:'+(100*n/tot)+'%;background:'+COL[k]+';opacity:'+(trained(k)?1:0.35)+'"></span></div><div class="val">'+n.toLocaleString()+'</div></div>'});
      $('ht-maskbars').innerHTML=h;
      $('ht-masktok').innerHTML=m.runs.map(([s,c])=>'<span class="k-'+c+'" style="'+(trained(c)?'':'opacity:.45')+'">'+esc(s)+'</span>').join('');
      const tr=Object.keys(m.counts).filter(trained).reduce((a,k)=>a+m.counts[k],0);
      $('ht-maskcap').textContent=(mode==='naive'?'Loss on everything: ':'Loss only on sampled tokens: ')+tr.toLocaleString()+' of '+tot.toLocaleString()+' tokens get a gradient. Checks against the server: '+m.checks.filter(c=>c.rendered_prompt===c.server_prompt).length+' of '+m.checks.length+' prompts and '+m.checks.filter(c=>c.gen_tokens===c.server_reply).length+' of '+m.checks.length+' replies have exactly the token counts mlx_lm.server reported.';
    }
    sel.addEventListener('change',draw);RD.seg($('ht-maskmode'),v=>{HTX.maskMode=v;draw()});draw();
  })();
  // 7. papers (compact) and frameworks
  (function(){
    const link=(id,t)=>'<a href="https://app.notion.com/p/'+id+'" target="_blank" rel="noopener noreferrer">'+esc(t)+'</a>';
    const el=$('ht-paptab');if(el)el.innerHTML='<div class="tw"><table class="ht-t"><thead><tr><th>Paper</th><th>What changes</th><th>Score the loop optimises</th><th>Held out</th></tr></thead><tbody>'+
      HT.papers.papers.map(p=>'<tr><td>'+link(p.notion,p.name)+'<div class="mu small">'+esc(p.date)+'</div></td><td class="small">'+esc(p.changes)+'</td><td class="small">'+esc(p.signal)+'</td><td class="small">'+esc(p.heldout)+'</td></tr>').join('')+'</tbody></table></div>';
    const fw=$('ht-fwtab');if(fw)fw.innerHTML='<div class="tw"><table class="ht-t"><thead><tr><th>Project</th><th>What it says it is</th><th>Its abstraction</th></tr></thead><tbody>'+
      HT.frameworks.map(f=>'<tr><td><a href="'+f.url+'" target="_blank" rel="noopener noreferrer">'+esc(f.name)+'</a><div class="mu small">'+esc(f.ver)+', '+esc(f.lic)+'</div></td><td class="small">'+esc(f.def)+'</td><td class="small">'+esc(f.abs)+'</td></tr>').join('')+'</tbody></table></div>';
  })();
  // 8. search animation (simulation)
  (function(){
    const card=$('ht-curcard');if(!card||!HTX.sim)return;
    const loc=HT.table.filter(x=>x.m==='local');const p0=loc.length?loc.reduce((a,x)=>a+x.bin*x.n,0)/loc.reduce((a,x)=>a+x.n,0):0.5;
    HTX.simP0=Math.round(p0*100)/100;
    const cache={};
    const get=rule=>cache[rule]||(cache[rule]=HTX.sim({K:8,n:40,spread:1,rounds:10,p0:HTX.simP0,rule,sims:300}));
    function draw(s){
      const rule=HTX.curMode||'greedy',res=get(rule),w=Math.min(860,RD.width(card));
      HTX.simChart($('ht-cursvg'),res,s,w);
      const dv=(res.vis[s]-res.vis[0])*100,dt=(res.tru[s]-res.tru[0])*100;
      $('ht-curcap').innerHTML='<div class="t">Round '+s+' of 10</div><p>'+(s===0?'Start: one harness, true success '+Math.round(HTX.simP0*100)+'% (the local model\'s overall rate here), scored on 40 pass/fail tasks: one evaluation has a standard error of about '+(100*Math.sqrt(HTX.simP0*(1-HTX.simP0)/40)).toFixed(1)+' points. Each round tries 8 candidates whose true effects are spread by 1 point.':
        'The score the loop saw has risen '+dv.toFixed(1)+' points; the true rate '+(dt>=0?'+':'')+dt.toFixed(1)+'. '+(rule==='greedy'?'Keeping the best of 8 noisy scores mostly keeps lucky measurements.':'The guard rejects most changes, so the visible score stops running away from the true one; the price is fewer accepted changes.'))+'</p>';
    }
    const A=RD.anim({card:'ht-curcard',ctl:'ht-curctl',n:11,draw,ms:1100,label:'Round'});
    RD.seg($('ht-curmode'),v=>{HTX.curMode=v;A.redraw()});RD.onResize(()=>A.redraw());
  })();
})();
