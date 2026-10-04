// Tab t-grade: pass rate per grader and the 2x2 agreement between any two graders, trial lists and trial cards.
(function(){
const $=id=>document.getElementById(id);const D=window.ATJ,R=window.ATJ_R,G=window.ATJ_grade,NULLS=window.ATJ_NULLS;if(!D||!R||!$('gr-m22'))return;
const NAME={msg:'Message judge',state:'Final state',steps:'Gold actions',writes:'Write audit',reward:'Reward'};
const MOD={gpt52:'GPT-5.2',opus45:'Opus 4.5'};
let cell=null;
function rows(){const m=$('gr-m').value,t=$('gr-t').value;return R.filter(r=>(m==='all'||r.model===m)&&(t==='all'||(t==='null')===NULLS.has(r.task)))}
function rates(){let h='<table class="mx"><thead><tr><th>Agent</th>'+Object.keys(NAME).map(k=>'<th>'+NAME[k]+'</th>').join('')+'</tr></thead><tbody>';
  ['gpt52','opus45'].forEach(m=>{const xs=R.filter(r=>r.model===m);h+='<tr><td>'+MOD[m]+'</td>'+Object.keys(NAME).map(g=>{const v=xs.map(r=>G(r,g)).filter(x=>x!==null);const p=100*v.reduce((a,b)=>a+b,0)/v.length;return '<td>'+p.toFixed(1)+'%<br><small class="mute">n='+v.length+'</small></td>'}).join('')+'</tr>'});
  $('gr-rates').innerHTML=h+'</tbody></table><p class="small mute">Same 200 trials per agent; only the grader changes. Gold actions has no verdict on tasks without gold actions, so its n is smaller.</p>'}
function lab(r){return r.task+'·'+r.trial+' '+(r.model==='gpt52'?'G':'O')}
function draw(){const a=$('gr-a').value,b=$('gr-b').value,xs=rows();
  const t={'11':[],'10':[],'01':[],'00':[]};let na=0;xs.forEach(r=>{const x=G(r,a),y=G(r,b);if(x===null||y===null)na++;else t[''+x+y].push(r)});
  const btn=(k,cls,txt)=>'<button data-c="'+k+'" class="'+cls+(cell===k?' sel':'')+'"><b>'+t[k].length+'</b>'+txt+'</button>';
  $('gr-m22').innerHTML='<div class="h"></div><div class="h">'+NAME[b]+': pass</div><div class="h">'+NAME[b]+': fail</div>'+
   '<div class="h">'+NAME[a]+': pass</div>'+btn('11','agree','both pass')+btn('10','dis','only '+NAME[a]+' passes')+
   '<div class="h">'+NAME[a]+': fail</div>'+btn('01','dis','only '+NAME[b]+' passes')+btn('00','agree','both fail');
  $('gr-na').textContent=xs.length+' trials; '+na+' without a verdict from one of the two graders. Agreement '+(t['11'].length+t['00'].length)+' of '+(xs.length-na)+'.';
  if(cell&&t[cell]){const L=t[cell];const cs=new Set(Object.keys(D.cases));
    $('gr-list').innerHTML='<div class="small mute">'+L.length+' trials (task·trial, G = GPT-5.2, O = Opus 4.5; outlined: stepped through in Reading)</div><div class="tlist">'+L.map(r=>{const k=r.model+'/'+r.task+'/'+r.trial;return '<button data-k="'+k+'" class="'+(cs.has(k)?'cs':'')+'">'+lab(r)+'</button>'}).join('')+'</div>'}
  else $('gr-list').innerHTML='<div class="small mute">Tap a cell to list its trials.</div>';
}
function card(k){const [m,t,tr]=k.split('/');const r=R.find(x=>x.model===m&&x.task===t&&x.trial===+tr);if(!r)return;
  const v=g=>{const x=G(r,g);return x===null?'<span class="na">no verdict</span>':x?'<span class="ok">pass</span>':'<span class="no">fail</span>'};
  let h='<h3>'+MOD[m]+', task '+t+', trial '+tr+(NULLS.has(t)?' <span class="tag">no change is right</span>':'')+'</h3><dl class="kv">'+Object.keys(NAME).map(g=>'<dt>'+NAME[g]+'</dt><dd>'+v(g)+'</dd>').join('')+'</dl>';
  h+='<div class="small">Message-judge assertions met: '+r.nl_met+' of '+r.nl_n+' · gold actions matched: '+r.ac_ok+' of '+r.ac_n+' (writes '+r.acw_ok+' of '+r.acw_n+') · gold writes '+r.gold_w+', agent writes '+r.agent_w+', unexpected writes '+r.w_extra+' · tool calls '+r.calls+' · turns '+r.turns+' · agent cost $'+r.agent_cost.toFixed(3)+' · '+Math.round(r.dur_s)+' s</div>';
  if(D.cases[k])h+='<p><button id="gr-go">Step through this trial in Reading</button></p>';
  $('gr-detail').innerHTML=h;$('gr-detail').hidden=false;
  const go=$('gr-go');if(go)go.onclick=()=>{const b=document.querySelector('#tabs button[data-t="t-read"]');b.click();window.ATJ_ANIM&&window.ATJ_ANIM.set(k,0);document.getElementById('rd-anim').scrollIntoView({block:'start'})}}
['gr-a','gr-b','gr-m','gr-t'].forEach(id=>$(id).onchange=()=>{cell=null;$('gr-detail').hidden=true;draw()});
$('gr-m22').onclick=e=>{const b=e.target.closest('button');if(!b)return;cell=b.dataset.c;draw()};
$('gr-list').onclick=e=>{const b=e.target.closest('button');if(b&&b.dataset.k)card(b.dataset.k)};
rates();draw();
})();
