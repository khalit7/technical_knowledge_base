// Reading: the do-nothing bars (rd-outcome), the task strip (rd-rel) and the cost bars (rd-cost). Plain HTML bars, sized by percentage.
(function(){
const $=id=>document.getElementById(id);const D=window.ATJ,O=window.ATJ_OUT,R=window.ATJ_R,NULLS=window.ATJ_NULLS;if(!D||!O)return;
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
const col={a:'var(--c3)',b:'var(--c5)',c:'var(--dim)',p:'var(--c1)',f:'var(--c2)'};
function bar(label,parts,val){return '<div class="sbar"><div class="nm">'+label+'</div><div class="tr">'+parts.map(([w,c,t])=>'<span style="width:'+w+'%;background:'+c+'" title="'+esc(t)+'"></span>').join('')+'</div><div class="v">'+val+'</div></div>'}
// do-nothing bars
if($('nullBars')){const N=D.meta.null;let h='<div class="band">Do-nothing agent, share of tasks passed</div>';
  [['airline','Airline'],['retail','Retail (DB only)'],['telecom','Telecom']].forEach(([k,l])=>{const p=100*N[k].pass/N[k].n;h+=bar(l+' <span class="mute">('+N[k].n+')</span>',[[p,col.b,N[k].pass+' of '+N[k].n]],N[k].pass+'/'+N[k].n)});
  h+='<div class="band">Each agent\'s airline passes, by whether the do-nothing agent also passes the task</div>';
  [['gpt52','GPT-5.2 (high)'],['opus45','Claude Opus 4.5 (high)']].forEach(([m,l])=>{const o=O[m];const a=o.passes_on_null_tasks,b=o.passes-a;h+=bar(l,[[100*a/200,col.b,a+' passes on no-change tasks'],[100*b/200,col.a,b+' passes on change tasks']],o.passes+'/200')});
  $('nullBars').innerHTML=h;$('nullLeg').innerHTML='<span><i style="background:'+col.b+'"></i>passed by doing nothing (no-change tasks)</span><span><i style="background:'+col.a+'"></i>passed on tasks that need a change</span>'}
// task strip
if($('taskStrip')){const tk={};R.forEach(r=>{(tk[r.task]=tk[r.task]||{gpt52:[],opus45:[]})[r.model][r.trial]=r.reward});
  const ids=Object.keys(tk).sort((a,b)=>a-b);
  const shade=s=>s===8?'var(--good)':s===0?'var(--bad)':'var(--c5)';
  $('taskStrip').innerHTML='<div class="tlist" role="list">'+ids.map(t=>{const s=[...tk[t].gpt52,...tk[t].opus45].reduce((a,b)=>a+b,0);return '<button role="listitem" data-task="'+t+'" style="border-color:'+(NULLS.has(t)?'var(--ink)':'var(--line)')+';border-width:'+(NULLS.has(t)?2:1)+'px;background:'+shade(s)+';color:var(--bg);min-width:2.6em" aria-label="Task '+t+', '+s+' of 8">'+t+'<br><small>'+s+'/8</small></button>'}).join('')+'</div>';
  $('taskLeg').innerHTML='<span><i style="background:var(--good)"></i>8 of 8</span><span><i style="background:var(--c5)"></i>mixed</span><span><i style="background:var(--bad)"></i>0 of 8</span>';
  $('taskStrip').onclick=e=>{const b=e.target.closest('button');if(!b)return;const t=b.dataset.task,x=tk[t];const f=a=>a.map(v=>v?'<span class="ok">pass</span>':'<span class="no">fail</span>').join(' ');
    $('taskNote').innerHTML='Task '+t+(NULLS.has(t)?' (the do-nothing agent passes it)':'')+': GPT-5.2 '+f(x.gpt52)+' · Opus 4.5 '+f(x.opus45)+'.'}}
// cost bars
if($('costBars')){const mx=Math.max(O.gpt52.cost_fail,O.opus45.cost_fail);let h='<div class="band">Mean agent cost per trial, US dollars (as recorded)</div>';
  [['gpt52','GPT-5.2'],['opus45','Opus 4.5']].forEach(([m,l])=>{const o=O[m];h+=bar(l+', pass',[[100*o.cost_pass/mx,col.p,'']],'$'+o.cost_pass.toFixed(3))+bar(l+', fail',[[100*o.cost_fail/mx,col.f,'']],'$'+o.cost_fail.toFixed(3))});
  const mc=Math.max(O.gpt52.calls_fail,O.opus45.calls_fail);h+='<div class="band">Mean tool calls per trial</div>';
  [['gpt52','GPT-5.2'],['opus45','Opus 4.5']].forEach(([m,l])=>{const o=O[m];h+=bar(l+', pass',[[100*o.calls_pass/mc,col.p,'']],o.calls_pass.toFixed(1))+bar(l+', fail',[[100*o.calls_fail/mc,col.f,'']],o.calls_fail.toFixed(1))});
  $('costBars').innerHTML=h;$('costLeg').innerHTML='<span><i style="background:'+col.p+'"></i>passing trials</span><span><i style="background:'+col.f+'"></i>failing trials</span>'}
})();
