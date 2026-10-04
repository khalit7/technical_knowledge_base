// ---- Guard model scorecards tab: bars by benchmark and metric, coloured by runner; spread of one model across runners ----
(function(){
  const esc=RD.esc,TAB='t-card';
  const R=SC.R.slice(),S=SC.S;
  // this page's own runs, computed from the Pipeline lab data (F1 x 100)
  const f1=(tp,fp,fn)=>tp?200*tp/(2*tp+fp+fn):0;
  const X=GR.X;
  [['loose',l=>l==='U'],['strict',l=>l!=='S']].forEach(([m,b])=>{
    let tp=0,fp=0,fn=0;X.forEach(x=>{const y=x.unsafe,p=b(x.qp);if(y&&p)tp++;else if(!y&&p)fp++;else if(y&&!p)fn++});
    R.push(['Qwen3Guard 0.6B ('+m+')','XSTest prompts','prompt','F1',+f1(tp,fp,fn).toFixed(1),'page','this page','page','450 XSTest prompts, one greedy run']);
    R.push(['Qwen3Guard 0.6B ('+m+')','XSTest prompts','prompt','FPR',+(100*fp/250).toFixed(1),'page','this page','page','share of the 250 safe prompts flagged']);
    let a=0,c=0,d=0;X.filter(x=>x.mi===1).forEach(x=>{const y=x.unsafe,p=b(x.qr);if(y&&p)a++;else if(!y&&p)c++;else if(y&&!p)d++});
    R.push(['Qwen3Guard 0.6B ('+m+')','XSTest responses','response','F1',+f1(a,c,d).toFixed(1),'page','this page','page','Mistral-7B-Instruct full compliances only (a different answer set from the published rows)']);
  });
  const KC={own:'var(--c1)',rival:'var(--c2)',copied:'var(--mute)',indep:'var(--c3)',page:'var(--c4)'},KN={own:'own',rival:'rival',copied:'copied',indep:'independent',page:'this page'};
  const keys=[];R.forEach(r=>{const k=r[1]+' | '+r[2]+' | '+r[3];if(!keys.includes(k))keys.push(k)});
  const st={k:'ToxicChat | prompt | F1',m:'ShieldGemma 9B',sort:'v'};
  const ctl=document.getElementById('sc-ctl');
  ctl.innerHTML='<label>Benchmark, task and metric<br><select id="sc-k">'+keys.map(k=>'<option'+(k===st.k?' selected':'')+'>'+esc(k)+'</option>').join('')+'</select></label><div><span class="small">Order</span><br><div class="seg" id="sc-sort"><button data-s="v">By value</button><button data-s="m">By model</button></div></div>';
  document.getElementById('sc-sort').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;st.sort=b.dataset.s;chart()});
  document.getElementById('sc-k').addEventListener('change',e=>{st.k=e.target.value;chart()});
  // normalise names that refer to one model across runners, for the spread box
  const base=n=>n.replace(/ \((strict|loose|strict\/loose average)\)$/,'').replace(/^Llama 3\.1 NemoGuard 8B$/,'NemoGuard 8B');
  function chart(){
    const [b,t,m]=st.k.split(' | ');
    const rows=R.filter(r=>r[1]===b&&r[2]===t&&r[3]===m).sort((p,q)=>st.sort==='m'?(base(p[0]).localeCompare(base(q[0]))||q[4]-p[4]):q[4]-p[4]);
    document.querySelectorAll('#sc-sort button').forEach(b=>b.classList.toggle('on',b.dataset.s===st.sort));
    const el=document.getElementById('sc-chart');
    const max=m==='FPR'?Math.max(...rows.map(r=>r[4]))*1.1:100;
    el.innerHTML='<div class="bars">'+rows.map(r=>'<div class="row" title="'+esc(r[6]+' ('+KN[r[5]]+'): '+S[r[7]][0]+(r[8]?'; '+r[8]:''))+'"><span class="nm">'+esc(r[0])+'<span class="ml" style="display:block;font-size:11px;color:'+KC[r[5]]+'">'+esc(r[6])+', '+KN[r[5]]+'</span></span><span class="track"><span class="fill" style="width:'+(100*r[4]/max)+'%;background:'+KC[r[5]]+'"></span></span><span class="val">'+r[4]+'</span></div>').join('')+'</div>';
    // spread: same model with two or more runners
    const g={};rows.forEach(r=>{const k=base(r[0]);(g[k]=g[k]||[]).push(r)});
    const sp=Object.entries(g).filter(([,v])=>new Set(v.map(r=>r[6])).size>1).map(([k,v])=>{const lo=Math.min(...v.map(r=>r[4])),hi=Math.max(...v.map(r=>r[4]));return [k,lo,hi,v]}).sort((a,b)=>(b[2]-b[1])-(a[2]-a[1]));
    document.getElementById('sc-spread').innerHTML='<div class="t">Same model, same set, different runners</div>'+(sp.length?'<p>'+sp.map(([k,lo,hi,v])=>'<b>'+esc(k)+'</b>: '+lo+' to '+hi+' ('+v.map(r=>esc(r[6])+' '+r[4]).join(', ')+')').join('; ')+'.</p>':'<p>No model on this benchmark was run by more than one party.</p>');
    const used=[...new Set(rows.map(r=>r[7]))];
    document.getElementById('sc-src').innerHTML='Sources for this view: '+used.map(k=>S[k][1].startsWith('#')?'<a href="#" data-tab="t-pipe">'+esc(S[k][0])+'</a>':'<a href="'+S[k][1]+'" target="_blank" rel="noopener noreferrer">'+esc(S[k][0])+'</a>').join('; ')+'.';
    window.SC.view={k:st.k,n:rows.length,spread:sp.map(s=>[s[0],s[1],s[2]])};
  }
  const models=[...new Set(R.map(r=>base(r[0])))].sort();
  document.getElementById('sc-mctl').innerHTML='<label>Model<br><select id="sc-m">'+models.map(m=>'<option'+(m===st.m?' selected':'')+'>'+esc(m)+'</option>').join('')+'</select></label>';
  document.getElementById('sc-m').addEventListener('change',e=>{st.m=e.target.value;mtab()});
  function mtab(){
    const rows=R.filter(r=>base(r[0])===st.m).sort((a,b)=>(a[1]+a[3]).localeCompare(b[1]+b[3]));
    document.getElementById('sc-mtab').innerHTML='<table class="rd-t"><thead><tr><th>Benchmark</th><th>Task</th><th>Metric</th><th class="num">Value</th><th>Run by</th><th>Note</th></tr></thead><tbody>'+
      rows.map(r=>'<tr><td>'+esc(r[1])+'</td><td>'+r[2]+'</td><td>'+esc(r[3])+'</td><td class="num">'+r[4]+'</td><td><span style="color:'+KC[r[5]]+'">'+esc(r[6])+', '+KN[r[5]]+'</span></td><td class="small">'+esc((r[0]!==st.m?r[0].replace(st.m,'').trim()+' ':'')+r[8])+'</td></tr>').join('')+'</tbody></table>';
  }
  chart();mtab();
})();
