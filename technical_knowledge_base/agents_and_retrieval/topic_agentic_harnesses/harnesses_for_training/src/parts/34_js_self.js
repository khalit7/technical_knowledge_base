// ---- Self-improvement: paper comparison table, environment papers, and the harness-search simulator ----
(function(){
  const HT=window.HT,esc=RD.esc,$=id=>document.getElementById(id);
  const P=HT.papers.papers,EP=HT.papers.env_papers;
  const link=(id,t)=>'<a href="https://app.notion.com/p/'+id+'" target="_blank" rel="noopener noreferrer">'+esc(t)+'</a>';
  const COLS={core:[['changes','What changes'],['proposer','Who proposes'],['signal','Score the loop optimises'],['result','Reported result']],
    ho:[['heldout','Held out'],['transfer','Transfer and caveats'],['seeds','Runs and error bars'],['hack','Leakage or hacking']],
    all:[['changes','What changes'],['proposer','Who proposes'],['signal','Score the loop optimises'],['heldout','Held out'],['result','Reported result'],['transfer','Transfer and caveats'],['seeds','Runs and error bars'],['hack','Leakage or hacking'],['toy','Live toy on its page']]};
  function tab(){
    const cs=COLS[$('sf-cols').value];
    $('sf-tab').innerHTML='<table class="ht-t"><thead><tr><th>Paper</th>'+cs.map(c=>'<th>'+c[1]+'</th>').join('')+'</tr></thead><tbody>'+
      P.map(p=>'<tr><td>'+link(p.notion,p.name)+'<div class="mu small">'+esc(p.org)+', arXiv '+esc(p.arxiv)+', '+esc(p.date)+'</div></td>'+cs.map(c=>'<td>'+esc(p[c[0]]||'')+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
  }
  $('sf-cols').addEventListener('change',tab);tab();
  $('sf-env').innerHTML='<table class="ht-t"><thead><tr><th>Paper</th><th>What it builds</th><th>Result</th><th>Caveat</th></tr></thead><tbody>'+
    EP.map(p=>'<tr><td>'+link(p.notion,p.name)+'<div class="mu small">arXiv '+esc(p.arxiv)+', '+esc(p.date)+'</div></td><td>'+esc(p.what)+'</td><td>'+esc(p.result)+'</td><td>'+esc(p.caveat)+'</td></tr>').join('')+'</tbody></table>';
  // ---- simulator (shared with the Reading animation) ----
  function rng(seed){let s=seed>>>0||1;return ()=>{s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;return s/4294967296}}
  function gauss(r){let u=0,v=0;while(u===0)u=r();v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
  function binom(r,n,p){if(n>60){return Math.min(1,Math.max(0,Math.round((p+gauss(r)*Math.sqrt(p*(1-p)/n))*n)/n))}let k=0;for(let i=0;i<n;i++)if(r()<p)k++;return k/n}
  // returns per-round arrays of mean visible, true, held-out; and 10th/90th percentiles of visible and true
  function sim(o){
    const S=o.sims||300,R=o.rounds,res={vis:[],tru:[],ho:[],vlo:[],vhi:[],tlo:[],thi:[],acc:0,accTrueGain:0};
    const runs=[];
    for(let s=0;s<S;s++){
      const r=rng(1000+s*7919);let tru=o.p0,vis=binom(r,o.n,tru);const vp=[vis],tp=[tru],hp=[binom(r,o.n,tru)];
      for(let k=1;k<=R;k++){
        let best=null;
        for(let c=0;c<o.K;c++){const t=Math.min(0.99,Math.max(0.01,tru+gauss(r)*o.spread/100));const m=binom(r,o.n,t);if(!best||m>best.m)best={t,m}}
        let ok=best.m>vis;
        if(ok&&o.rule==='guard'){const se=Math.sqrt(Math.max(0.0001,tru*(1-tru))/o.n);const hNew=binom(r,o.n,best.t),hOld=binom(r,o.n,tru);ok=(hNew-hOld)>2*se*Math.SQRT2}
        if(ok){res.acc++;res.accTrueGain+=(best.t-tru);tru=best.t;vis=best.m}
        vp.push(vis);tp.push(tru);hp.push(binom(r,o.n,tru));
      }
      runs.push([vp,tp,hp]);
    }
    const q=(a,f)=>{a=a.slice().sort((x,y)=>x-y);return a[Math.floor(f*(a.length-1))]};
    for(let k=0;k<=R;k++){const v=runs.map(x=>x[0][k]),t=runs.map(x=>x[1][k]),h=runs.map(x=>x[2][k]);
      const mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
      res.vis.push(mean(v));res.tru.push(mean(t));res.ho.push(mean(h));res.vlo.push(q(v,.1));res.vhi.push(q(v,.9));res.tlo.push(q(t,.1));res.thi.push(q(t,.9))}
    res.accPerSearch=res.acc/S;res.meanTrueGainPerAccept=res.acc?res.accTrueGain/res.acc:0;
    return res;
  }
  function chart(el,res,upto,w){
    const R=res.vis.length-1,h=230,L=40,B=26,T=10,Rt=10;
    const all=res.vhi.concat(res.tlo,res.vlo,res.thi);const lo=Math.min(...all)-0.01,hi=Math.max(...all)+0.01;
    const x=k=>L+(w-L-Rt)*k/R,y=v=>T+(h-T-B)*(1-(v-lo)/(hi-lo));
    const n=upto==null?R:upto;
    const line=(a,c,dash)=>'<polyline fill="none" stroke="'+c+'" stroke-width="2.2"'+(dash?' stroke-dasharray="5 4"':'')+' points="'+a.slice(0,n+1).map((v,k)=>x(k).toFixed(1)+','+y(v).toFixed(1)).join(' ')+'"/>';
    const band=(l,u,c)=>'<polygon fill="'+c+'" opacity=".15" points="'+l.slice(0,n+1).map((v,k)=>x(k)+','+y(v)).concat(u.slice(0,n+1).map((v,k)=>x(k)+','+y(v)).reverse()).join(' ')+'"/>';
    const dot=(a,c)=>'<circle cx="'+x(n)+'" cy="'+y(a[n])+'" r="4.5" fill="'+c+'"/>';
    let g='';for(let i=0;i<=4;i++){const v=lo+(hi-lo)*i/4;g+='<line x1="'+L+'" x2="'+(w-Rt)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/>'+RD.t(L-4,y(v)+4,Math.round(v*100)+'%',{a:'end',fs:10,fill:'var(--mute)'})}
    for(let k=0;k<=R;k+=Math.max(1,Math.round(R/6)))g+=RD.t(x(k),h-8,k,{a:'middle',fs:10,fill:'var(--mute)'});
    g+=RD.t((L+w)/2,h-0,'round',{a:'middle',fs:10,fill:'var(--mute)'});
    el.innerHTML=RD.svg(w,h,g+band(res.vlo,res.vhi,'var(--c2)')+band(res.tlo,res.thi,'var(--c3)')+line(res.vis,'var(--c2)')+line(res.tru,'var(--c3)')+line(res.ho,'var(--c1)',1)+dot(res.vis,'var(--c2)')+dot(res.tru,'var(--c3)')+dot(res.ho,'var(--c1)'),'Measured, true and held-out success over rounds of a simulated harness search')+
      '<div class="ht-legend"><span><i style="background:var(--c2)"></i>score the loop saw (kept candidates)</span><span><i style="background:var(--c3)"></i>true success rate</span><span><i style="background:var(--c1)"></i>a fresh held-out measurement</span></div>';
  }
  HTX.sim=sim;HTX.simChart=chart;
  function run(){
    const o={K:+$('sf-k').value,n:+$('sf-n').value,spread:+$('sf-s').value,rounds:+$('sf-r').value,p0:HTX.simP0||0.5,rule:HTX.sfRule||'greedy'};
    $('sf-kv').textContent=o.K;$('sf-nv').textContent=o.n;$('sf-sv').textContent=o.spread;$('sf-rv').textContent=o.rounds;
    const res=sim(o);const el=$('sf-svg');chart(el,res,null,Math.min(860,RD.width(el)));
    const R=o.rounds;
    $('sf-out').innerHTML='After '+R+' rounds the loop\'s own score rose by <b>'+((res.vis[R]-res.vis[0])*100).toFixed(1)+' points</b> on average; the true success rate by <b>'+((res.tru[R]-res.tru[0])*100).toFixed(1)+'</b>. The loop accepted '+res.accPerSearch.toFixed(1)+' changes per search. Starting rate '+Math.round(o.p0*100)+'% (the local model\'s overall rate in this page\'s runs); standard error of one evaluation at that rate: '+(100*Math.sqrt(o.p0*(1-o.p0)/o.n)).toFixed(1)+' points.';
  }
  ['sf-k','sf-n','sf-s','sf-r'].forEach(i=>$(i).addEventListener('input',run));
  RD.seg($('sf-rule'),v=>{HTX.sfRule=v;run()});
  RD.onRenderTab('t-self',run);RD.onResize(run,'t-self');
})();
