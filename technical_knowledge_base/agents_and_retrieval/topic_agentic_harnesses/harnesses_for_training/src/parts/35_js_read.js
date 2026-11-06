// ---- Reading tab: facts, section 1 charts, environment animation, advantages, loss masks, papers, frameworks, search animation ----
(function(){
  const HT=window.HT,esc=RD.esc,$=id=>document.getElementById(id);
  const HN=HT.harness,MN={local:'Qwen3-4B (local)',haiku:'Claude Haiku 4.5'},HORD=['bash','tools','plain','ccfull'];
  // 1. numbers quoted in prose
  document.querySelectorAll('[data-ht]').forEach(el=>{const v=HT.f[el.dataset.ht];el.textContent=v==null?'?':v;if(v==null)el.style.color='var(--bad)'});
  // 2. section 1 is drawn by the Fig. 2 stage (41_js_sc_scaf.js)
  // 3. held-out checks failed by rollouts that passed every visible test
  (function(){const el=$('ht-hofail');if(!el)return;
    const R=HT.runs.filter(r=>r.vis&&!r.bin);const c={};R.forEach(r=>r.ho.forEach(n=>{c[n]=c[n]||{n,k:0,m:{}};c[n].k++;const key=r.m+' '+r.h;c[n].m[key]=(c[n].m[key]||0)+1}));
    const L=Object.values(c).sort((a,b)=>b.k-a.k);
    el.innerHTML='<div class="tw"><table class="ht-t"><thead><tr><th>Held-out check that failed</th><th>Rollouts</th><th>Where</th></tr></thead><tbody>'+L.map(x=>{const ck=HT.checks.find(q=>q.n===x.n);
      return '<tr><td><code>'+esc(x.n)+'</code><div class="mu small"><code>'+esc(ck?ck.expr:'')+'</code></div></td><td class="ht-num">'+x.k+'</td><td class="small">'+Object.entries(x.m).map(([k,v])=>{const p=k.split(' ');return esc((p[0]==='local'?'4B':'Haiku')+', '+HN[p[1]])+': '+v}).join('; ')+'</td></tr>'}).join('')+'</tbody></table></div><p class="small mute">Rollouts that passed every test in their workspace but not the hidden verifier, by the held-out check they failed (a rollout can fail more than one).</p>';
  })();
  // 4 and 5. the environment walk-through and the groups are the Fig. 1 and Fig. 3 stages (40_js_sc_hero.js, 42_js_sc_grp.js)
  // 6. loss mask viewer
  (function(){
    const sel=$('ht-masksel');if(!sel)return;
    const M=HT.mask.filter(m=>m.runs);if(!M.length){$('ht-maskcard').innerHTML+='<p class="mu">No token view embedded.</p>';return}
    sel.innerHTML=M.map((m,i)=>'<option value="'+i+'">'+esc(m.id)+' (reward '+m.reward+')</option>').join('');
    // open on the rollout whose sampled share is closest to the share over all local rollouts
    {const tg=parseFloat(HT.f.gen_share)/100;let bi=0,bd=9;M.forEach((m,i)=>{const d=Math.abs((m.counts.gen||0)/m.total-tg);if(d<bd){bd=d;bi=i}});sel.value=bi}
    const NAME={sys:'system prompt and tool schemas',user:'task',gen:'sampled by the model',obs:'tool output',tmpl:'template markers',ins:'inserted by the template, never sampled'};
    const COL={sys:'var(--c4)',user:'var(--c6)',gen:'var(--c3)',obs:'var(--c2)',tmpl:'var(--dim)',ins:'var(--ink)'};
    function draw(){
      const m=M[+sel.value],mode=HTX.maskMode||'mask';
      const trained=c=>mode==='naive'?true:c==='gen';
      $('ht-maskleg').innerHTML=Object.keys(NAME).map(k=>'<span><i style="background:'+COL[k]+'"></i>'+NAME[k]+'</span>').join('');
      const tot=m.total;let h='';
      Object.keys(NAME).forEach(k=>{const n=m.counts[k]||0;h+='<div class="row"><div class="nm">'+NAME[k]+'</div><div class="track"><span style="width:'+(100*n/tot)+'%;background:'+COL[k]+';opacity:'+(trained(k)?1:0.35)+'"></span></div><div class="val">'+n.toLocaleString()+'</div></div>'});
      $('ht-maskbars').innerHTML=h;
      const seg=([s,c])=>'<span class="k-'+c+'" style="'+(trained(c)?'':'opacity:.45')+'">'+esc(s)+'</span>';
      // inline: the end of the rollout (last observation, the final reply and the template's insertion); the whole rollout sits in a closed block
      let st=m.runs.length-1;for(let j=m.runs.length-1;j>=0;j--){if(m.runs[j][1]==='obs'){st=j;break}}
      let ex=m.runs.slice(st);const txt=ex.map(x=>x[0]).join('');
      if(txt.length>600){ex=[[ '... '+txt.slice(0,160).replace(/\s+$/,'')+' ... ','obs']].concat(m.runs.slice(st+1))}
      $('ht-masktok').innerHTML=ex.map(seg).join('');
      const all=$('ht-maskall');if(all.open)$('ht-masktokall').innerHTML=m.runs.map(seg).join('');else $('ht-masktokall').innerHTML='';
      HTX.maskDraw=draw;
      const tr=Object.keys(m.counts).filter(trained).reduce((a,k)=>a+m.counts[k],0);
      $('ht-maskcap').textContent=(mode==='naive'?'Loss on everything: ':'Loss only on sampled tokens: ')+tr.toLocaleString()+' of '+tot.toLocaleString()+' tokens get a gradient. Checks against the server: '+m.checks.filter(c=>c.rendered_prompt===c.server_prompt).length+' of '+m.checks.length+' prompts and '+m.checks.filter(c=>c.gen_tokens===c.server_reply).length+' of '+m.checks.length+' replies have exactly the token counts mlx_lm.server reported.';
    }
    sel.addEventListener('change',draw);RD.seg($('ht-maskmode'),v=>{HTX.maskMode=v;draw()});$('ht-maskall').addEventListener('toggle',draw);draw();
  })();
  // 7. papers (compact) and frameworks
  (function(){
    const link=(id,t)=>'<a href="https://app.notion.com/p/'+id+'" target="_blank" rel="noopener noreferrer">'+esc(t)+'</a>';
    const el=$('ht-paptab');if(el)el.innerHTML='<div class="tw"><table class="ht-t"><thead><tr><th>Paper</th><th>What changes</th><th>Held out</th></tr></thead><tbody>'+
      HT.papers.papers.map(p=>'<tr><td>'+link(p.notion,p.name)+'<div class="mu small">'+esc(p.date)+'</div></td><td class="small">'+esc(p.changes)+'</td><td class="small">'+esc(p.heldout)+'</td></tr>').join('')+'</tbody></table></div>';
    const fw=$('ht-fwtab');if(fw)fw.innerHTML='<div class="tw"><table class="ht-t"><thead><tr><th>Project</th><th>What it says it is</th><th>Its abstraction</th></tr></thead><tbody>'+
      HT.frameworks.map(f=>'<tr><td><a href="'+f.url+'" target="_blank" rel="noopener noreferrer">'+esc(f.name)+'</a><div class="mu small">'+esc(f.ver)+', '+esc(f.lic)+'</div></td><td class="small">'+esc(f.def)+'</td><td class="small">'+esc(f.abs)+'</td></tr>').join('')+'</tbody></table></div>';
  })();
  // 8. Fig. 5, the search animation (simulation): four explained stretches (start, round 1, rounds 2 to 10, the guarded rule), its steps in the ol.sx on the left
  (function(){
    const card=$('ht-curcard');if(!card||!HTX.sim)return;
    const loc=HT.table.filter(x=>x.m==='local');const p0=loc.length?loc.reduce((a,x)=>a+x.bin*x.n,0)/loc.reduce((a,x)=>a+x.n,0):0.5;
    HTX.simP0=Math.round(p0*100)/100;
    const cache={};
    const get=rule=>cache[rule]||(cache[rule]=HTX.sim({K:8,n:40,spread:1,rounds:10,p0:HTX.simP0,rule,sims:300}));
    const UPTO=[0,1,10,10],RULE=['greedy','greedy','greedy','guard'];
    function span(){const g=get('greedy'),a=g.vhi.concat(g.tlo,g.vlo,g.thi);return [Math.min(...a)-0.01,Math.max(...a)+0.01]}
    function draw(s){HTX.simChart($('ht-cursvg'),get(RULE[s]),UPTO[s],Math.min(860,RD.width($('ht-cursvg'))),RULE[s]==='guard'?'Rule: keep only held-out gains beyond 2 SE':'Rule: keep the best score',span())}
    HTX.curGet=get;
    const A=RD.anim({card:'ht-curcard',ctl:'ht-curctl',n:4,draw,ms:4600,label:'Stretch of the search',list:'sx-cur'});
    RD.onResize(()=>A.redraw());
  })();
})();
