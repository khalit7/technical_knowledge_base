// Reading: the task strip (rd-rel). The other Reading figures are SVG, in 25_js_viz.js.
(function(){
const $=id=>document.getElementById(id);const D=window.ATJ,O=window.ATJ_OUT,R=window.ATJ_R,NULLS=window.ATJ_NULLS;if(!D||!O)return;
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
const col={a:'var(--c3)',b:'var(--c5)',c:'var(--dim)',p:'var(--c1)',f:'var(--c2)'};
function bar(label,parts,val){return '<div class="sbar"><div class="nm">'+label+'</div><div class="tr">'+parts.map(([w,c,t])=>'<span style="width:'+w+'%;background:'+c+'" title="'+esc(t)+'"></span>').join('')+'</div><div class="v">'+val+'</div></div>'}
// task strip
if($('taskStrip')){const tk={};R.forEach(r=>{(tk[r.task]=tk[r.task]||{gpt52:[],opus45:[]})[r.model][r.trial]=r.reward});
  const ids=Object.keys(tk).sort((a,b)=>a-b);
  const shade=s=>s===8?'var(--good)':s===0?'var(--bad)':'var(--c5)';
  $('taskStrip').innerHTML='<div class="tlist" role="list">'+ids.map(t=>{const s=[...tk[t].gpt52,...tk[t].opus45].reduce((a,b)=>a+b,0);return '<button role="listitem" data-task="'+t+'" style="border-color:'+(NULLS.has(t)?'var(--ink)':'var(--line)')+';border-width:'+(NULLS.has(t)?2:1)+'px;background:'+shade(s)+';color:var(--bg);min-width:2.6em" aria-label="Task '+t+', '+s+' of 8">'+t+'<br><small>'+s+'/8</small></button>'}).join('')+'</div>';
  $('taskLeg').innerHTML='<span><i style="background:var(--good)"></i>8 of 8</span><span><i style="background:var(--c5)"></i>mixed</span><span><i style="background:var(--bad)"></i>0 of 8</span>';
  $('taskStrip').onclick=e=>{const b=e.target.closest('button');if(!b)return;const t=b.dataset.task,x=tk[t];const f=a=>a.map(v=>v?'<span class="ok">pass</span>':'<span class="no">fail</span>').join(' ');
    $('taskNote').innerHTML='Task '+t+(NULLS.has(t)?' (the do-nothing agent passes it)':'')+': GPT-5.2 '+f(x.gpt52)+' · Opus 4.5 '+f(x.opus45)+'.'}}
})();
