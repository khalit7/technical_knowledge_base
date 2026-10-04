// ---- Real rollouts tab: the ten groups, every answer's verdicts, reward score and advantages; reward model against verifier ----
(function(){
  const E=window.LLE,D=window.LLD,TAB='t-roll';
  const pick=document.getElementById('ro-pick'),tab=document.getElementById('ro-tab'),Q=document.getElementById('ro-q'),TX=document.getElementById('ro-txt');
  let j=0,sel=-1;
  pick.innerHTML=D.groups.map((g,k)=>'<button data-j="'+k+'"'+(k?'':' class="on"')+'>#'+g.pid+': '+g.r.reduce((a,b)=>a+b,0)+'/16</button>').join('');
  const pill=v=>'<span class="pill '+(v?'ok':'no')+'">'+(v?'pass':'fail')+'</span>';
  function render(){const g=D.groups[j],gr=E.groupAdv(g.r,'grpo'),dr=E.groupAdv(g.r,'drgrpo'),rl=E.groupAdv(g.r,'rloo');
    Q.innerHTML='<b>GSM8K test #'+g.pid+'</b> (reference answer '+g.gold+'): '+RD.esc(g.q);
    tab.innerHTML='<thead><tr><th>#</th><th class="num">Tokens</th><th>Strict</th><th>Last number</th><th>Anywhere</th><th class="num">RM score</th><th class="num">GRPO Â</th><th class="num">Dr. GRPO Â</th><th class="num">RLOO Â</th><th class="num">KL/token vs base</th></tr></thead><tbody>'+
      g.r.map((v,k)=>'<tr class="lnk'+(k===sel?' on':'')+'" data-k="'+k+'" style="cursor:pointer'+(k===sel?';background:var(--soft)':'')+'"><td>'+(k+1)+'</td><td class="num">'+g.L[k]+(g.tr[k]?' (cut)':'')+'</td><td>'+pill(v)+'</td><td>'+pill(g.last[k])+'</td><td>'+pill(g.any[k])+'</td><td class="num">'+RD.n(g.rm[k],2)+'</td><td class="num">'+RD.sg(gr.A[k],3)+'</td><td class="num">'+RD.sg(dr.A[k],3)+'</td><td class="num">'+RD.sg(rl.A[k],3)+'</td><td class="num">'+RD.n(g.kl[k],3)+'</td></tr>').join('')+'</tbody>';
    TX.innerHTML=sel>=0?'<div class="rd-ph">Answer '+(sel+1)+', last part ('+g.L[sel]+' tokens in all)</div><pre style="white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px;background:var(--soft);border-radius:6px;padding:8px;max-height:260px;overflow:auto">…'+RD.esc(g.tail[sel])+'</pre>':'<p class="small mute">Click a row to read the end of that answer.</p>'}
  pick.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;j=+b.dataset.j;sel=-1;[...pick.children].forEach(x=>x.classList.toggle('on',x===b));render()});
  tab.addEventListener('click',e=>{const r=e.target.closest('tr[data-k]');if(!r)return;sel=+r.dataset.k;render()});
  render();
  // reward model against the verifier
  const all=[];D.groups.forEach(g=>g.r.forEach((v,k)=>all.push({v,rm:g.rm[k],L:g.L[k]})));
  const pos=all.filter(a=>a.v),neg=all.filter(a=>!a.v);let wins=0;pos.forEach(p=>neg.forEach(n=>{wins+=p.rm>n.rm?1:p.rm===n.rm?0.5:0}));
  const auc=pos.length&&neg.length?wins/(pos.length*neg.length):NaN;
  const corr=(x,y)=>{const mx=E.mean(x),my=E.mean(y);let a=0,b=0,c=0;x.forEach((v,i)=>{a+=(v-mx)*(y[i]-my);b+=(v-mx)*(v-mx);c+=(y[i]-my)*(y[i]-my)});return a/Math.sqrt(b*c)};
  const rL=corr(all.map(a=>a.rm),all.map(a=>a.L));
  const fp=neg.filter(n=>n.rm>E.mean(pos.map(p=>p.rm))).length;
  function scatter(){const P=document.getElementById('ro-sc'),W=RD.width(P),H=220,l=40,r=10,t=10,b=28;
    const x0=Math.min(...all.map(a=>a.rm)),x1=Math.max(...all.map(a=>a.rm)),y1=Math.max(...all.map(a=>a.L));
    const X=v=>l+(W-l-r)*(v-x0)/((x1-x0)||1),Y=v=>t+(H-t-b)*(1-v/y1);let s='';
    [0,Math.round(y1/2),y1].forEach(v=>s+=RD.t(l-4,Y(v)+4,String(v),{a:'end',fs:9.5,fill:'var(--mute)'}));
    [x0,(x0+x1)/2,x1].forEach(v=>s+=RD.t(X(v),H-10,RD.n(v,1),{a:'middle',fs:9.5,fill:'var(--mute)'}));
    all.forEach(a=>s+='<circle cx="'+X(a.rm).toFixed(1)+'" cy="'+Y(a.L).toFixed(1)+'" r="3.2" fill="'+(a.v?'var(--c3)':'none')+'" stroke="'+(a.v?'var(--c3)':'var(--c2)')+'" stroke-width="1.2"/>');
    P.innerHTML=RD.svg(W,H,s,'Reward score against length')+'<div class="leg"><span><i style="background:var(--c3)"></i>passes the strict verifier</span><span><i style="border:1.5px solid var(--c2);background:none"></i>fails</span><span>across: reward-model score; up: length in tokens</span></div>'}
  document.getElementById('ro-st').innerHTML=RD.stat('Pairs ranked right (AUC)',RD.pct(auc,0),'chance a correct answer outscores a wrong one')+RD.stat('Wrong answers above the correct mean',fp+' of '+neg.length,'')+RD.stat('Score against length','r = '+RD.n(rL,2),'Pearson, all 160')+RD.stat('Pass rate, strict',RD.pct(pos.length/all.length,0),pos.length+' of '+all.length);
  document.getElementById('ro-scT').innerHTML='The reward model has never seen these problems\' answers; it judges the text. It ranks a correct answer above a wrong one '+RD.pct(auc,0)+' of the time: useful, and exactly the kind of imperfect proxy a policy would learn to exploit if it were the reward. '+(Math.abs(rL)>=0.1?'Its score '+(rL>0?'rises':'falls')+' with length (r = '+RD.n(rL,2)+').':'Its score barely tracks length here (r = '+RD.n(rL,2)+').');
  // the Reading tab's sentences in section 10
  const s1=document.getElementById('rd-hkAuc');if(s1)s1.textContent='ranks a correct answer above a wrong one only '+RD.pct(auc,0)+' of the time, and scores '+fp+' of '+neg.length+' wrong answers above the average correct one';
  const s2=document.getElementById('rd-hkLen');if(s2)s2.textContent=rL>=0.1?'rise with length (r = '+RD.n(rL,2)+')':rL<=-0.1?'fall with length (r = '+RD.n(rL,2)+'): long answers here are mostly truncated or confused ones, so the sign of a length preference depends on the reward model and the data, which is why it has to be measured':'barely track length (r = '+RD.n(rL,2)+')';
  RD.onRender(scatter,TAB);RD.onResize(scatter,TAB);
})();
