// Shared computations over the 400 trials (window.ATJ.rows); every number written into the Reading tab comes from here.
// window.ATJ_OUT is compared with src/recompute.json by checks/check_ui.mjs.
(function(){
const D=window.ATJ;if(!D)return;
const C=D.meta.cols;const R=D.rows.map(r=>{const o={};C.forEach((c,k)=>o[c]=r[k]);return o});
const NULLS=new Set(D.meta.null.airline.tasks);
function comb(n,k){if(k>n)return 0;let r=1;for(let j=1;j<=k;j++)r=r*(n-k+j)/j;return r}
function grade(r,g){
  if(g==='msg')return r.nl_n===0?null:+(r.nl_met===r.nl_n);
  if(g==='state')return r.db;
  if(g==='steps')return r.ac_n===0?null:+(r.ac_ok===r.ac_n);
  if(g==='writes')return +(r.w_matched===r.gold_w&&r.w_extra===0);
  if(g==='reward')return r.reward;
  if(g==='wsteps')return r.acw_n===0?null:+(r.acw_ok===r.acw_n);
}
const out={};
['gpt52','opus45'].forEach(m=>{
  const xs=R.filter(r=>r.model===m);const by={};xs.forEach(r=>(by[r.task]=by[r.task]||[]).push(r.reward));
  const tasks=Object.values(by);
  const o={};
  o.pass_hat=[1,2,3,4].map(k=>Math.round(10000*tasks.reduce((a,v)=>a+comb(v.reduce((x,y)=>x+y,0),k)/comb(v.length,k),0)/tasks.length)/100);
  o.passes=xs.reduce((a,r)=>a+r.reward,0);
  o.passes_on_null_tasks=xs.filter(r=>NULLS.has(r.task)).reduce((a,r)=>a+r.reward,0);
  o.null_task_trials=xs.filter(r=>NULLS.has(r.task)).length;
  const nn=xs.filter(r=>!NULLS.has(r.task));o.pass1_non_null=Math.round(10000*nn.reduce((a,r)=>a+r.reward,0)/nn.length)/100;
  const ok=xs.filter(r=>r.reward===1),bad=xs.filter(r=>r.reward===0);
  const mean=(a,f)=>a.reduce((s,r)=>s+r[f],0)/a.length;
  o.cost_pass=Math.round(10000*mean(ok,'agent_cost'))/10000;o.cost_fail=Math.round(10000*mean(bad,'agent_cost'))/10000;
  o.calls_pass=Math.round(100*mean(ok,'calls'))/100;o.calls_fail=Math.round(100*mean(bad,'calls'))/100;
  o.cost_total=Math.round(100*xs.reduce((s,r)=>s+r.agent_cost,0))/100;
  o.max_calls=Math.max(...xs.map(r=>r.calls));
  out[m]=o;
});
function agree(a,b){const t={'11':0,'10':0,'01':0,'00':0,na:0};R.forEach(r=>{const x=grade(r,a),y=grade(r,b);if(x===null||y===null)t.na++;else t[''+x+y]++});return t}
[['msg','state'],['state','steps'],['msg','steps'],['state','writes']].forEach(([a,b])=>out['agree_'+a+'_'+b]=agree(a,b));
const tk={};R.forEach(r=>(tk[r.task]=tk[r.task]||[]).push(r.reward));
out.tasks_0_of_8=Object.keys(tk).filter(t=>tk[t].reduce((a,b)=>a+b,0)===0).sort((a,b)=>a-b);
out.tasks_8_of_8=Object.keys(tk).filter(t=>tk[t].reduce((a,b)=>a+b,0)===8).length;
out.tasks_mixed=Object.keys(tk).length-out.tasks_0_of_8.length-out.tasks_8_of_8;
out.devai_cost_share=Math.round(10000*30.58/1297.50)/100;out.devai_time_share=Math.round(10000*118.43/5190)/100;
out.statem_after_flags=[420,415,411].map(x=>Math.round(10000*x/445)/100);
window.ATJ_OUT=out;window.ATJ_R=R;window.ATJ_grade=grade;window.ATJ_NULLS=NULLS;
// write the numbers into the Reading tab
const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};
const ms=out.agree_msg_state,ss=out.agree_state_steps,sw=out.agree_state_writes,g=out.gpt52,op=out.opus45,N=D.meta.null;
set('o-msgdis',ms['10']+ms['01']);set('o-null',N.airline.pass+' of '+N.airline.n);set('o-stepdis',ss['10']);
set('o-wagree',sw['11']+sw['00']);set('nb-air',N.airline.pass+' of '+N.airline.n);
set('nb-g',g.passes_on_null_tasks+" of GPT-5.2's "+g.passes);set('nb-gc',g.pass1_non_null.toFixed(1)+'%');set('nb-oc',op.pass1_non_null.toFixed(1)+'%');
set('r-g',g.pass_hat.map(x=>x.toFixed(1)).join(', '));set('r-o',op.pass_hat.map(x=>x.toFixed(1)).join(', '));
set('r-8',out.tasks_8_of_8);set('r-mix',out.tasks_mixed);set('r-0',out.tasks_0_of_8.length);
set('c-gf','$'+g.cost_fail.toFixed(3));set('c-gp','$'+g.cost_pass.toFixed(3));set('c-gcf',g.calls_fail.toFixed(1));set('c-gcp',g.calls_pass.toFixed(1));
set('c-gt','$'+g.cost_total.toFixed(2));set('c-ot','$'+op.cost_total.toFixed(2));
set('c-gps','$'+(g.cost_total/g.passes).toFixed(3));set('c-ops','$'+(op.cost_total/op.passes).toFixed(3));
set('o-devc',out.devai_cost_share.toFixed(2)+'%');set('o-devt',out.devai_time_share.toFixed(2)+'%');const MM=D.meta.match;set('m-sp',MM['gpt52|strict|exact|0'][0]);set('m-sa',MM['gpt52|strict|exact|0'][1]);set('m-ua',MM['gpt52|unordered|exact|1'][1]);
set('h-sm',out.statem_after_flags[2].toFixed(2)+'%');
})();
