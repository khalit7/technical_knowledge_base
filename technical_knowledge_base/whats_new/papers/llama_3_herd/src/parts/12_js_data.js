// ---- Shared data helpers: the paper's tables, recompute.py's results and the figure points (window.PAPER) ----
const PAP=window.PAPER,RC=PAP.rc,TB=PAP.tables,FG=PAP.figs;
const num=s=>{const v=parseFloat(String(s).replace(/,/g,'').replace(/[%△⊲♢]/g,''));return isNaN(v)?null:v};
const setH=(id,v)=>{const e=$(id);if(e)e.innerHTML=v};
const latexLR=s=>String(s).replace(/\$\\theta=([\d,]+)\$/,'θ = $1').replace(/\$\s*([\d.]+)\\times\s*10\^\{(-?\d+)\}\s*\$/,(m,a,e)=>a+' × 10<sup>'+e.replace('-','−')+'</sup>');
const bil=v=>(v/1e9).toFixed(v>=1e11?1:2)+'B',pB=v=>(v/1e9).toFixed(2)+'B';
const tril=v=>(v/1e12).toFixed(v>=1e13?2:2)+'T';
// 95% CI for a Table 2 score: printed in Tables 18, 21, 22 where the paper gives one, else 1.96 sqrt(S(1-S)/N)
// with N from the benchmark (recompute.py's bench_n), the formula of the paper's Section 5.1.1.
const T2PRINTED={'HumanEval (0-shot)':['t18',0],'MBPP EvalPlus (0-shot)':['t18',3],'BFCL':['t22',3],'Nexus':['t22',0],
  'ZeroSCROLLS/QuALITY':['t21',0],'InfiniteBench/En.MC':['t21',4],'NIH/Multi-needle':['t21',5]};
const MODEL_ALIAS={'GPT 3.5 Turbo':'GPT-3.5 Turbo','GPT-4 (0125)':'GPT-4'};
function ciFor(bench,model,score){if(score==null)return null;
  const p=T2PRINTED[bench];
  if(p){const t=TB[p[0]],row=t.rows.find(r=>r[0]===(MODEL_ALIAS[model]||model));if(row){const c=row[1+p[1]];if(c&&c[1]!=null&&Math.abs(num(c[0])-score)<0.05)return {h:+c[1],src:'printed'}}return null}
  const n=RC.bench_n[bench];if(!n)return null;const s=score/100;return {h:196*Math.sqrt(s*(1-s)/n),src:'formula',n}}
// stacked share bar (HTML, wraps on phones): parts=[[name,share,colour]]
function stackBar(title,parts,note){let s='<div class="stk"><div class="stkt">'+title+'</div><div class="stkb">';
  parts.forEach(p=>{s+='<span style="width:'+p[1]+'%;background:'+p[2]+'" title="'+p[0]+': '+p[1].toFixed(p[1]<1?2:1)+'%"></span>'});
  s+='</div><div class="stkl">';parts.forEach(p=>{s+='<span><i style="background:'+p[2]+'"></i>'+p[0]+' <b>'+(p[1]<1?p[1].toFixed(2):p[1]<10?p[1].toFixed(1):Math.round(p[1]))+'%</b></span>'});
  return s+'</div>'+(note?'<div class="small mute">'+note+'</div>':'')+'</div>'}
const CAT={'GPU':'var(--c2)','Host':'var(--c4)','Network':'var(--c6)','Unplanned Maintenance':'var(--c5)','Dependency':'var(--c1)','Unknown':'var(--mute)'};
