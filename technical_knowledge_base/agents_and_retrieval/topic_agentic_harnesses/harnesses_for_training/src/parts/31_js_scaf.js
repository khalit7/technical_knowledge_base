// ---- Scaffold experiment tab: success by harness, paired differences, cost, every rollout ----
(function(){
  const HT=window.HT,esc=RD.esc,$=id=>document.getElementById(id);
  const HN=HT.harness,MN={local:'Qwen3-4B (local)',haiku:'Claude Haiku 4.5'};
  const HORD=['bash','tools','plain','ccfull'];
  const pct=x=>x==null?'n/a':Math.round(x*100)+'%';
  const sgn=x=>(x>0?'+':x<0?'−':'')+Math.abs(Math.round(x*100));
  window.HTX=window.HTX||{};
  // a rollout card: header, then calls and observations, then the diff
  function runCard(r,full){
    const tr=HT.traj[r.id];
    let h='<div class="sc-run"><div class="hd">'+esc(r.id)+' <span class="mu">'+esc(MN[r.m])+', '+esc(HN[r.h])+', task '+r.t+'</span></div>'+
      '<div class="mu">reward '+r.bin+' (partial '+r.part.toFixed(2)+'), visible tests '+(r.vis?'all pass':'not all pass')+', '+r.calls+' model calls, '+r.inp.toLocaleString()+' input tokens'+(r.cost!=null?', $'+r.cost.toFixed(4)+' API-price equivalent':'')+(r.ho.length?', held-out checks failed: '+r.ho.map(esc).join(', '):'')+(r.tu?'':', <b>edited tests/</b>')+', stop: '+esc(r.stop||'')+'</div>';
    if(tr&&full){let ci=0;
      tr.forEach(e=>{
        if(e[0]==='c'){h+='<div><b>call '+(++ci)+'</b> <span class="mu">('+(e[1]||0).toLocaleString()+' in'+(e[2]!=null?', '+e[2]+' out':'')+(e[5]?', thinking':'')+')</span>'+(e[3]?' '+esc(e[3]):'')+'</div>';
          e[4].forEach(t=>{h+='<pre>'+esc(t[0])+' '+esc(t[1])+'</pre>'})}
        else h+='<pre class="mu">'+esc(e[1]||'')+' → '+esc(e[2])+(e[3]>260?'\n['+e[3].toLocaleString()+' characters in full]':'')+'</pre>';
      });
    } else if(full) h+='<div class="mu small">The step-by-step record of this rollout is in the repository (src/recordings/'+esc(r.id)+'.jsonl); the page embeds the first rollout of each cell to stay small.</div>';
    const d=HT.diffs[r.d];
    if(full)h+='<div class="mu small">Final change to the repository:</div><pre>'+(d?esc(d):'(no change)')+'</pre>';
    return h+'</div>';
  }
  HTX.runCard=runCard;
  function bars(){
    const k=HTX.scMetric||'bin';let h='';
    ['local','haiku'].forEach(m=>{
      h+='<div class="band">'+esc(MN[m])+'</div>';
      HORD.forEach(hh=>{const row=HT.table.find(x=>x.m===m&&x.h===hh);if(!row)return;
        const v=row[k];
        h+='<div class="sc-bar"><div>'+esc(HN[hh])+' <span class="mu small">('+row.n+')</span></div><div class="tr"><span style="width:'+(v*100)+'%;background:'+(k==='bin'?'var(--good)':'var(--c5)')+'"></span></div><div class="ht-num">'+pct(v)+'</div></div>'});
    });
    $('sc-bars').innerHTML=h;
    $('sc-barcap').textContent=k==='bin'?'Share of rollouts that passed all 20 hidden checks. Bracketed: number of rollouts.':'Share of rollouts whose workspace tests all passed when the agent stopped (what the agent itself could check).';
  }
  function pairs(){
    let h='<table class="ht-t"><thead><tr><th>Model</th><th>Harness A</th><th>Harness B</th><th>A minus B, hidden verifier</th><th>A minus B, visible tests</th></tr></thead><tbody>';
    const P=HT.pairs;const seen={};
    P.forEach(p=>{const key=p.m+p.a+p.b;if(seen[key])return;seen[key]=1;
      const b=P.find(x=>x.m===p.m&&x.a===p.a&&x.b===p.b&&x.key==='bin'),v=P.find(x=>x.m===p.m&&x.a===p.a&&x.b===p.b&&x.key==='vis');
      const cell=x=>{const sig=x.lo>0||x.hi<0;return '<span class="ht-num"'+(sig?' style="font-weight:600"':'')+'>'+sgn(x.diff)+' pts</span> <span class="mu small">['+sgn(x.lo)+', '+sgn(x.hi)+']</span>'};
      h+='<tr><td>'+esc(MN[p.m])+'</td><td>'+esc(HN[p.a])+'</td><td>'+esc(HN[p.b])+'</td><td>'+cell(b)+'</td><td>'+cell(v)+'</td></tr>'});
    $('sc-pairs').innerHTML=h+'</tbody></table><p class="small mute">Bold: the interval excludes zero. Ten tasks is a small set: intervals are wide, and only large effects are visible.</p>';
  }
  function cost(){
    let h='<table class="ht-t"><thead><tr><th>Model</th><th>Harness</th><th>Model calls</th><th>Input tokens per rollout</th><th>First call</th><th>Cost per rollout</th><th>Failed exact-text edits</th></tr></thead><tbody>';
    ['local','haiku'].forEach(m=>HORD.forEach(hh=>{const r=HT.table.find(x=>x.m===m&&x.h===hh);if(!r)return;
      h+='<tr><td>'+esc(MN[m])+'</td><td>'+esc(HN[hh])+'</td><td class="ht-num">'+r.calls.toFixed(1)+'</td><td class="ht-num">'+r.inp.toLocaleString()+'</td><td class="ht-num">'+r.first.toLocaleString()+'</td><td class="ht-num">'+(r.cost!=null?'$'+r.cost.toFixed(4):'free (local)')+'</td><td class="ht-num">'+(hh==='tools'||hh==='plain'?r.edit_err:'n/a')+'</td></tr>'}));
    $('sc-cost').innerHTML=h+'</tbody></table><p class="small mute">Means over rollouts. Input tokens count every token the model read on every call (for Haiku: fresh, cache-write and cache-read tokens together). Cost is the CLI\'s total_cost_usd, an API-price equivalent at Haiku 4.5 list prices; the runs used a subscription. The local model\'s time is not priced.</p>';
  }
  function grid(){
    const tasks=HT.tasks.map(t=>t.id);const cols=[];
    ['local','haiku'].forEach(m=>HORD.forEach(hh=>{if(HT.table.find(x=>x.m===m&&x.h===hh))cols.push([m,hh])}));
    let h='<table class="sc-grid"><thead><tr><th class="l">Task</th>'+cols.map(c=>'<th>'+(c[0]==='local'?'4B':'Haiku')+'<br><span class="mu small">'+esc(HN[c[1]])+'</span></th>').join('')+'</tr></thead><tbody>';
    tasks.forEach(t=>{h+='<tr><td class="l">'+t+'</td>';
      cols.forEach(c=>{const rs=HT.runs.filter(r=>r.m===c[0]&&r.h===c[1]&&r.t===t).sort((a,b)=>a.r<b.r?-1:1);
        h+='<td class="c" data-k="'+c[0]+'|'+c[1]+'|'+t+'">'+rs.map(r=>'<i class="sc-d '+(r.stop==='infra_error'?'x':r.bin?'p':r.vis?'v':'f')+'"></i>').join('')+'</td>'});
      h+='</tr>'});
    $('sc-gridw').innerHTML=h+'</tbody></table>';
  }
  function view(k){
    const [m,hh,t]=k.split('|');
    document.querySelectorAll('#sc-gridw td.c').forEach(td=>td.classList.toggle('on',td.dataset.k===k));
    const rs=HT.runs.filter(r=>r.m===m&&r.h===hh&&r.t===t).sort((a,b)=>a.r<b.r?-1:1);
    const task=HT.tasks.find(x=>x.id===t);
    $('sc-view').innerHTML='<div class="detail"><h3>'+esc(MN[m])+', '+esc(HN[hh])+', task '+t+'</h3><p class="small">'+esc(task.prompt)+'</p>'+rs.map(r=>runCard(r,true)).join('')+'</div>';
  }
  function init(){
    bars();pairs();cost();grid();
    RD.seg($('sc-metric'),v=>{HTX.scMetric=v;bars()});
    $('sc-gridw').addEventListener('click',e=>{const td=e.target.closest('td.c');if(td)view(td.dataset.k)});
    const first=HT.runs.find(r=>r.vis&&!r.bin);if(first)view(first.m+'|'+first.h+'|'+first.t);
  }
  init();
})();
