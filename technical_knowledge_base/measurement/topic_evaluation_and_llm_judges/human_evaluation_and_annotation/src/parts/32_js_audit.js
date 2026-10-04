// Audit lab: models propose suspect questions, a review budget, scored against MMLU-Redux's human audit.
(function(){
const D=window.HE,S=window.HES;if(!D||!S)return;
const $=id=>document.getElementById(id);if(!$('lb-sub'))return;
const css=v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const SUBS=Object.keys(D.audit.subjects),L='ABCD';
$('lb-sub').innerHTML=SUBS.map(s=>{const a=S.AUD[s];return'<option value="'+s+'">'+S.SUBN[s]+' ('+a.errors+' flawed, '+a.wrong+' wrong keys)</option>'}).join('');
const SCN={self:'self-confidence',margin:'normalized margin',votes:'consensus votes'};
function chart(a,nm,what,k){
  const host=$('lb-chart'),W=Math.max(280,host.clientWidth||600),H=W<520?210:240,ml=34,mr=10,mt=10,mb=30,pw=W-ml-mr,ph=H-mt-mb;
  const tot=what==='err'?a.errors:a.wrong,n=a.n,ymax=Math.max(1,tot);
  const X=i=>ml+pw*i/n,Y=v=>mt+ph*(1-v/ymax);
  let s='<svg width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Errors found against items reviewed">';
  for(let t=0;t<=4;t++){const v=Math.round(ymax*t/4);s+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="'+css('--line')+'"/><text x="'+(ml-5)+'" y="'+(Y(v)+4)+'" font-size="10.5" text-anchor="end" fill="'+css('--mute')+'">'+v+'</text>'}
  [0,25,50,75,100].filter(v=>v<=n).forEach(v=>{s+='<text x="'+X(v)+'" y="'+(H-12)+'" font-size="10.5" text-anchor="middle" fill="'+css('--mute')+'">'+v+'</text>'});
  s+='<text x="'+(ml+pw/2)+'" y="'+(H-1)+'" font-size="10.5" text-anchor="middle" fill="'+css('--mute')+'">items reviewed, most suspect first</text>';
  // perfect and random
  s+='<polyline fill="none" stroke="'+css('--dim')+'" stroke-width="1.5" stroke-dasharray="4 3" points="'+X(0)+','+Y(0)+' '+X(tot)+','+Y(tot)+' '+X(n)+','+Y(tot)+'"/>';
  s+='<line x1="'+X(0)+'" y1="'+Y(0)+'" x2="'+X(n)+'" y2="'+Y(tot)+'" stroke="'+css('--mute')+'" stroke-width="1.2" stroke-dasharray="2 3"/>';
  const ns=['self','margin','votes'],cc={self:css('--c1'),margin:css('--c4'),votes:css('--c2')};
  ns.forEach(m=>{const c=a.curves[m][what];let p=X(0)+','+Y(0);c.forEach((v,i)=>{p+=' '+X(i+1)+','+Y(v)});
    s+='<polyline fill="none" stroke="'+cc[m]+'" stroke-width="'+(m===nm?2.6:1.2)+'" opacity="'+(m===nm?1:.45)+'" points="'+p+'"/>'});
  const f=a.curves[nm][what][k-1];s+='<line x1="'+X(k)+'" x2="'+X(k)+'" y1="'+mt+'" y2="'+(mt+ph)+'" stroke="'+css('--ink')+'" stroke-width="1"/><circle cx="'+X(k)+'" cy="'+Y(f)+'" r="4" fill="'+cc[nm]+'"/>';
  host.innerHTML=s+'</svg>';
  $('lb-leg').innerHTML=ns.map(m=>'<span><i style="background:'+cc[m]+'"></i>'+SCN[m]+'</span>').join('')+'<span><i style="background:'+css('--dim')+'"></i>perfect queue</span><span><i style="background:'+css('--mute')+'"></i>random order</span>';
}
function list(s,a,nm,k){
  const hasText=a.items[0].q!==undefined,o=a.order[nm].slice(0,k);
  $('lb-qnote').textContent=hasText?'The first '+k+' questions in the queue, with the official key, the models\' most common answer and the audit\'s verdict. Question text from MMLU, shortened.':'The first '+k+' questions in the queue (question text is kept for Virology and College Chemistry only, to keep the page small).';
  $('lb-list').innerHTML=o.map((i,r)=>{const x=a.items[i],tp=a.top(x),tag=x.t==='o'?'o':x.t==='w'?'w':'x';
    const h='<div class="h"><b>#'+(r+1)+'</b><span class="tg '+tag+'">'+S.TAGN[x.t]+'</span><span class="small mute">key '+L[x.k]+', models\' choice '+L[tp[0]]+' ('+tp[1]+' of 18)'+(x.c>=0?', audit\'s answer '+L[x.c]:'')+', mean probability of the key '+(100*x.mp[x.k]).toFixed(0)+'%</span></div>';
    if(!hasText)return'<div class="item">'+h+'</div>';
    return'<div class="item">'+h+'<div class="q">'+S.esc(x.q)+'</div><div class="op">'+x.o.map((t,j)=>(j===x.k?'<b>':'')+L[j]+'. '+S.esc(t)+(j===x.k?' (key)</b>':'')).join(' &nbsp; ')+'</div></div>'}).join('');
}
function acc(a){
  const M=S.M,se=(p,n)=>1.96*Math.sqrt(p*(1-p)/n),ord=M.map((m,i)=>i).sort((i,j)=>a.corr[j]-a.corr[i]||i-j);
  $('lb-acc').innerHTML='<thead><tr><th>Model</th><th class="num">Original key ('+a.n+')</th><th class="num">Sound only ('+a.ok+')</th><th class="num">Corrected key ('+a.fix+')</th><th class="num">Rank move</th></tr></thead><tbody>'+
    ord.map(i=>{const mv=a.rank_orig[i]-a.rank_corr[i];return'<tr><td>'+S.esc(M[i])+'</td><td class="num">'+S.pct(a.orig[i],0)+' <span class="mute">('+a.rank_orig[i]+')</span></td><td class="num">'+S.pct(a.clean[i],0)+' <span class="mute">('+a.rank_clean[i]+')</span></td><td class="num">'+S.pct(a.corr[i],0)+' ±'+(100*se(a.corr[i],a.fix)).toFixed(0)+' <span class="mute">('+a.rank_corr[i]+')</span></td><td class="num" style="color:'+(mv>0?css('--good'):mv<0?css('--bad'):css('--mute'))+'">'+(mv>0?'↑'+mv:mv<0?'↓'+(-mv):'=')+'</td></tr>'}).join('')+'</tbody>';
}
function render(){
  const s=$('lb-sub').value,nm=$('lb-sc').value,what=$('lb-what').value,a=S.AUD[s];
  const kEl=$('lb-k');kEl.max=a.n;const k=Math.min(+kEl.value,a.n);$('lb-kv').textContent=k;
  const tot=what==='err'?a.errors:a.wrong,f=a.curves[nm][what][k-1],base=tot/a.n;
  $('lb-out').innerHTML=[['Found',f+' of '+tot,what==='err'?'flawed questions':'wrong keys'],['Precision',S.pct(f/k,0),'of the reviewed queue'],['Recall',tot?S.pct(f/tot,0):'n/a','of all '+(what==='err'?'flaws':'wrong keys')],['Random queue',(base*k).toFixed(1),'expected finds at this budget'],['Base rate',S.pct(base,0),'in this subject\'s sample']]
    .map(x=>'<div class="stat"><div class="k">'+x[0]+'</div><div class="v">'+x[1]+'</div><div class="d">'+x[2]+'</div></div>').join('');
  chart(a,nm,what,k);
  $('lb-note').innerHTML='Self-confidence ranks by the 18 models\' mean probability of the official key (lowest first); normalized margin by that probability minus the largest other one, the score Northcutt et al. ranked by; consensus votes by how many models pick the same non-key answer (ties broken by question order). <span class="der">derived</span> from MMLU-Redux 2.0 verdicts and Open LLM Leaderboard v1 per-question log-likelihoods.';
  list(s,a,nm,k);acc(a);
}
['lb-sub','lb-sc','lb-what'].forEach(id=>$(id).onchange=render);$('lb-k').oninput=render;
let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{if(!$('t-audit').hidden)render()},120)});
(window.TAB_RENDER=window.TAB_RENDER||{})['t-audit']=[render];
})();
