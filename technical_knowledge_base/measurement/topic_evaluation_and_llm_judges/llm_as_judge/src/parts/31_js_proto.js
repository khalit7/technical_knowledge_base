// ---- Protocol lab (t-proto): agreement of GPT-4 judge protocols with MT-Bench human votes ----
(function(){
  const L=window.LJ,$=id=>document.getElementById(id),P=(x,d)=>L.pct(x,d),esc=RD.esc;
  const PROTOS=[
    ['F','One order, model shown first',['g35']],
    ['B','One order, model shown second',['g35']],
    ['FB','Both orders, leaderboard run',['g35']],
    ['P','Both orders, released with the votes',['all','nov','g35']],
    ['S','Pointwise 1 to 10, higher score wins',['nov','g35']]
  ];
  let sel='FB';
  function opts(){return {scope:$('pl-scope').value,experts:$('pl-vot').value==='e',turn:+$('pl-turn').value,noties:$('pl-ties').value==='1',exclGpt4:$('pl-g4').checked}}
  function render(){
    const o=opts(),avail=PROTOS.filter(p=>p[2].includes(o.scope));
    if(!avail.find(p=>p[0]===sel))sel=avail[avail.length>2?2:0][0];
    const H=L.humans(o),chance=o.noties?0.5:1/3;
    const R=avail.map(p=>({p,r:L.agree(p[0],o)}));
    $('pl-ceil').innerHTML=RD.stat('Human against human',P(H.agree),H.n.toLocaleString()+' pairs of different voters on the same comparison')+
      RD.stat('Chance',P(chance,0),o.noties?'two outcomes':'three outcomes (A, B, tie)')+
      RD.stat('Votes in this slice',(R[0]?R[0].r.n:0).toLocaleString(),'after the filters, for the first protocol');
    const mx=1;
    let h='<thead><tr><th>Protocol</th><th class="num hv">Votes</th><th style="min-width:6.5em">Agreement with humans</th><th class="num">Kappa</th><th class="num">Ties</th></tr></thead><tbody>';
    for(const {p,r} of R){
      const w=isFinite(r.agree)?r.agree*100:0;
      h+='<tr data-p="'+p[0]+'"'+(p[0]===sel?' class="sel"':'')+'><td>'+p[1]+'</td><td class="num hv">'+r.n.toLocaleString()+'</td><td><div class="mb" title="'+P(r.agree)+'"><div class="f" style="width:'+w.toFixed(1)+'%"></div>'+
        (isFinite(H.agree)?'<div class="ln" style="left:'+(H.agree*100).toFixed(1)+'%" title="human against human"></div>':'')+'<div class="ln ch" style="left:'+(chance*100).toFixed(1)+'%" title="chance"></div></div><span class="small">'+P(r.agree)+'</span></td><td class="num">'+(isFinite(r.kappa)?r.kappa.toFixed(3):'n/a')+'</td><td class="num">'+(o.noties?'dropped':P(r.ties))+'</td></tr>';
    }
    $('pl-tbl').innerHTML=h+'</tbody>';
    $('pl-note').innerHTML='Bars: agreement; the dark tick is human-human agreement on the same filters, the thin grey tick chance. Kappa is Cohen\'s, over '+(o.noties?'two':'three')+' outcomes, and is the fair comparison between rows: with ties dropped, a protocol that declares more ties discards its hardest items. Tap a row for its confusion matrix and ranking.';
    const cur=R.find(x=>x.p[0]===sel);detail(cur,o);
  }
  function detail(cur,o){
    const r=cur.r,cm=r.cm,lab=['A wins','B wins','tie'];
    $('pl-cmt').textContent='Confusion matrix: '+cur.p[1];
    let h='<table class="cm"><tr><th>human \\ judge</th>'+lab.map(x=>'<th>'+x+'</th>').join('')+'</tr>';
    for(let i=0;i<3;i++){if(o.noties&&i===2)continue;h+='<tr><th>'+lab[i]+'</th>';for(let j=0;j<3;j++){if(o.noties&&j===2)continue;h+='<td'+(i===j?' class="d"':'')+'>'+cm[i][j]+'</td>'}h+='</tr>'}
    $('pl-cm').innerHTML=h+'</table><div class="note">"A" is the pair\'s first model in a fixed order (GPT-4, Claude-v1, GPT-3.5-turbo, Vicuna, Alpaca, LLaMA), not the slot it was shown in.</div>';
    $('pl-len').innerHTML=isFinite(r.judgeLonger)?'Length: over '+r.ln.toLocaleString()+' votes where both sides picked a winner and the answers differ in length, the humans chose the longer answer '+P(r.humanLonger)+' of the time and the judge '+P(r.judgeLonger)+'. Where they disagreed ('+r.dis+'), the judge took the longer answer '+P(r.judgeLongerInDis)+' of the time.':'';
    const W=L.winRates(cur.p[0],o);
    if(W.length<3){$('pl-list').innerHTML='<div class="note">Fewer than three models in this slice.</div>';$('pl-ls').textContent='';return}
    W.sort((a,b)=>b.h-a.h);
    const wd=RD.width($('pl-list')),lw=Math.min(110,wd*0.3),pw=wd-lw-24,rh=24,hh=W.length*rh+26;
    let s='';[0,25,50,75,100].forEach(t=>{const x=lw+pw*t/100;s+='<line x1="'+x+'" y1="14" x2="'+x+'" y2="'+(hh-4)+'" stroke="var(--line)"/>'+RD.t(x,10,t+'%',{a:'middle',fs:11,fill:'var(--mute)'})});
    W.forEach((w,i)=>{const y=24+i*rh,xh=lw+pw*w.h,xj=lw+pw*w.j;
      s+=RD.t(lw-6,y+4,esc(L.nm(w.m)),{a:'end',fs:11})+'<line x1="'+xh+'" y1="'+y+'" x2="'+xj+'" y2="'+y+'" stroke="var(--mute)" stroke-width="2"/>'+
        '<circle cx="'+xh+'" cy="'+y+'" r="5" fill="var(--c3)"><title>humans '+P(w.h)+'</title></circle><circle cx="'+xj+'" cy="'+y+'" r="5" fill="var(--c2)"><title>judge '+P(w.j)+'</title></circle>'});
    $('pl-list').innerHTML=RD.svg(wd,hh,s,'Win rates by model, humans against the judge')+'<div class="leg"><span style="--sw:var(--c3)">humans</span><span style="--sw:var(--c2)">judge</span></div>';
    const rho=L.spearman(W.map(w=>w.h),W.map(w=>w.j));
    $('pl-ls').innerHTML='Win rate over non-tie verdicts, same votes. Spearman between the two rankings: <b>'+(isFinite(rho)?rho.toFixed(3):'n/a')+'</b>, over '+W.length+' models; agreement on single votes in this slice: <b>'+P(r.agree)+'</b>.'+(rho>=0.85&&r.agree<0.8?' The judge orders the systems almost right while missing many single verdicts: errors that are not tied to one system cancel in the average.':rho<0.85?(o.scope==='g35'?' With only the pairs against GPT-3.5, the other models\' win rates rest on one opponent each, and the ranking is less stable; choose all 15 pairs for the full comparison.':' On this slice the two rankings differ more; with fewer votes per model, win rates are noisier.'):'');
  }
  $('pl-tbl').addEventListener('click',e=>{const tr=e.target.closest('tr[data-p]');if(!tr)return;sel=tr.dataset.p;render()});
  ['pl-scope','pl-vot','pl-turn','pl-ties','pl-g4'].forEach(id=>$(id).addEventListener('change',render));
  $('pl-t5').addEventListener('click',()=>{$('pl-scope').value='all';$('pl-vot').value='e';$('pl-turn').value='1';$('pl-ties').value='0';$('pl-g4').checked=false;sel='P';render()});
  // reproduction box: Zheng et al. Table 5 against this data
  (function(){
    const pub={1:[[66,1343,63,721],[85,859,81,479]],2:[[66,1325,67,707],[85,864,82,474]]};
    let h='<div class="t">Defaults reproduce Zheng et al. Table 5 (independently)</div><div class="tw"><table><thead><tr><th>Turn, setup</th><th class="num">GPT-4 pair vs experts: paper</th><th class="num">this data</th><th class="num">Expert vs expert: paper</th><th class="num">this data</th></tr></thead><tbody>';
    for(const t of [1,2])[0,1].forEach(s=>{const o={scope:'all',experts:true,turn:t,noties:!!s},a=L.agree('P',o),hh=L.humans(o),p=pub[t][s];
      h+='<tr><td>Turn '+t+', '+(s?'S2 (ties dropped)':'S1 (ties counted)')+'</td><td class="num">'+p[0]+'% ('+p[1]+')</td><td class="num">'+P(a.agree)+' ('+a.n+')</td><td class="num">'+p[2]+'% ('+p[3]+')</td><td class="num">'+P(hh.agree)+' ('+hh.n+')</td></tr>'});
    h+='</tbody></table></div><p class="small">With expert votes only, every vote count matches the paper exactly and every percentage rounds to it. The paper\'s pointwise row (60%, 1,280 votes) does not reproduce: the released single-grading file is a later run that graded a different Vicuna. Source: {{Zheng et al. 2023, Table 5|https://arxiv.org/abs/2306.05685}}.</p>';
    $('pl-repro').innerHTML=h;
  })();
  RD.onRender(render,'t-proto');RD.onResizeTab('t-proto',render);
})();
