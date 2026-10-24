// Tab "One task, every harness": files side by side, field table, extraction bench, live extractors.
(function(){
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const A=(u,t)=>'<a href="'+u+'" target="_blank" rel="noopener noreferrer">'+t+'</a>';
let field='extract',pa='lmeval_gsm8k',pb='inspect_evals_gsm8k',exI=0;

// ---- live JavaScript copies of six extraction rules (checked against the harnesses' code by src/recompute.py)
const EX={
 lmeval_strict:{n:'lm-eval strict-match',f:(t,g)=>{const m=/#### (\-?[0-9\.\,]+)/.exec(t);const p=m?m[1]:'[invalid]';return [p,lmEM(p,g)]}},
 lmeval_flex:{n:'lm-eval flexible-extract',f:(t,g)=>{const re=/(-?[$0-9.,]{2,})|(-?[0-9]+)/g;let m,last=null,all=[];while((m=re.exec(t))!==null){all.push(m);if(m[0]==='')re.lastIndex++}
   // lm-eval: findall, take the last match, then the first non-empty group of it
   if(!all.length)return ['[invalid]',0];last=all[all.length-1];const p=last[1]!==undefined?last[1]:(last[2]!==undefined?last[2]:'');return [p,lmEM(p,g)]}},
 inspect:{n:'Inspect match(numeric)',f:(t,g)=>{const v=stripNum(t.trim().toLowerCase());const words=v.split(/\s+/).reverse();for(const w of words){const n=normNum(w);if(n!==null)return [n,+(n===normNum(stripNum(g.trim())))]}return ['',0]}},
 helm:{n:'HELM final_number',f:(t,g)=>{const fin=x=>{const m=x.match(/-?[\d,]+(?:.\d+)?/g);return m?m[m.length-1].replace(/,/g,''):''};const p=fin(t),q=fin(g);return [p,(p&&p.trim()===q.trim())?1:0]}},
 simple_evals:{n:'simple-evals MGSM',f:(t,g)=>{if(t.indexOf('Answer')<0)return ['',0];const tail=t.split('Answer').pop().trim();const nums=tail.replace(/,/g,'').match(/\d+\.?\d*/g);let p=nums?nums[nums.length-1].replace(/\.$/,''):'';let q=p;if(q.indexOf('.')>=0)q=q.replace(/0+$/,'').replace(/\.$/,'');return [p,+(g.replace(/,/g,'')===q.replace(/,/g,''))]}},
 openai_evals:{n:'openai/evals Match',f:(t,g)=>[t.slice(0,g.length+12),+t.startsWith(g)]}
};
function lmEM(p,g){const clean=s=>{s=s.replace(/,/g,'').replace(/\$/g,'').replace(/[\s\S]*#### /,'').replace(/\.$/,'');return s.toLowerCase()};return +(clean(p)===clean(g))}
function stripNum(s){return s.replace(/[$€£,*_]/g,'')}
function normNum(w){const m=String(w).replace(/^[^\d\-.]+|[^\d.]+$/g,'');if(!/^-?\d*\.?\d+$/.test(m)&&!/^-?\d+\.?$/.test(m))return null;const x=parseFloat(m);if(!isFinite(x))return null;return String(x)}
window.HX_EX=EX;

function fieldChips(){const D=window.HX;
  $('sx-field').innerHTML=D.decisions.map(d=>'<button data-f="'+d[0]+'"'+(d[0]===field?' class="on"':'')+'>'+d[1]+'</button>').join('');}
function opts(sel,cur){const D=window.HX;
  sel.innerHTML='<optgroup label="GSM8K">'+D.panels.filter(p=>p.gsm).map(p=>'<option value="'+p.key+'"'+(p.key===cur?' selected':'')+'>'+esc(p.label)+'</option>').join('')+'</optgroup><optgroup label="Nearest real file (no GSM8K)">'+D.panels.filter(p=>!p.gsm).map(p=>'<option value="'+p.key+'"'+(p.key===cur?' selected':'')+'>'+esc(p.label)+'</option>').join('')+'</optgroup>';}
function panel(side,key){const D=window.HX;const p=D.panels.find(x=>x.key===key);const hl=new Set(p.hl[field]||[]);
  $('sx-'+side+'h').innerHTML=esc(p.label)+' <small>'+A(p.url,p.repo+' @ '+p.commit)+', '+p.date+'</small>';
  $('sx-'+side+'code').innerHTML=p.lines.map((l,i)=>'<span class="l'+(hl.has(i)?' hi':'')+'" data-n="'+(p.start+i)+'">'+(esc(l)||' ')+'</span>').join('');
  const n=hl.size;$('sx-'+side+'note').innerHTML=esc(p.note)+' '+(n?n+' line'+(n>1?'s':'')+' make this decision here.':'<b>Nothing in this file makes this decision</b>: it is a default elsewhere (see the table below).');
  const first=[...$('sx-'+side+'code').querySelectorAll('.hi')][0];const box=$('sx-'+side+'code');
  if(first){box.scrollTop=Math.max(0,first.offsetTop-box.offsetTop-30)}}
function table(){const D=window.HX;
  $('sx-tbl').querySelector('thead').innerHTML='<tr><th></th>'+D.cols.map(c=>'<th>'+c+'</th>').join('')+'</tr>';
  $('sx-tbl').querySelector('tbody').innerHTML=D.fields.map(r=>'<tr><td><b>'+r[0]+'</b></td>'+r.slice(1).map(c=>'<td>'+esc(c)+'</td>').join('')+'</tr>').join('');if(window.HX_CARDS)window.HX_CARDS();}
const RULES=[['lmeval_strict','lm-eval strict-match'],['lmeval_flex','lm-eval flexible-extract'],['inspect','Inspect match(numeric)'],['lighteval','lighteval math_scorer'],['helm','HELM final_number'],['simple_evals','simple-evals MGSM'],['openai_evals','openai/evals Match']];
function bench(){const B=window.HX.bench;if(!B){$('ex-out').textContent='(bench data missing)';return}
  const grp=run=>B.map((r,i)=>[r,i]).filter(([r])=>r.run===run).map(([r,i])=>'<button data-i="'+i+'"'+(i===exI?' class="on"':'')+'>'+(r.id+1)+'</button>').join('');
  $('ex-pick').innerHTML='<div style="width:100%" class="small mute">lm-eval run, problem</div>'+grp('lmeval')+'<div style="width:100%" class="small mute">Inspect run, problem</div>'+grp('inspect');
  const r=B[exI];
  $('ex-h').innerHTML='Problem '+(r.id+1)+' of GSM8K test, gold <b>'+esc(r.target)+'</b>; output from the '+(r.run==='lmeval'?'lm-eval run (raw 5-shot prompt)':'Inspect run (chat, 10 shots)')+', '+r.text.length+' characters';
  // highlight the strings the rules read
  let t=esc(r.text);const marks=new Set();RULES.forEach(([k])=>{const v=r.extract[k][0];if(v&&v.length>0&&v!=='[invalid]'&&v.length<14&&k!=='openai_evals'&&k!=='lighteval')marks.add(v)});
  [...marks].sort((a,b)=>b.length-a.length).forEach(v=>{const e=esc(v);const i=t.lastIndexOf(e);if(i>=0)t=t.slice(0,i)+'<mark>'+e+'</mark>'+t.slice(i+e.length)});
  $('ex-out').innerHTML=t;
  $('ex-tbl').querySelector('tbody').innerHTML=RULES.map(([k,n])=>{const v=r.extract[k];return '<tr><td>'+n+'</td><td><code>'+esc(String(v[0]).slice(0,40)||'(nothing)')+'</code></td><td class="r '+(v[1]?'y':'n')+'">'+(v[1]?'correct':'wrong')+'</td></tr>'}).join('');}
function totals(){const B=window.HX.bench;const el=$('ex-fig');if(!B||!el)return;
  // grouped bars: correct out of 10 per rule, on the lm-eval outputs and on the Inspect outputs (SVG at the measured width)
  const rows=RULES.map(([k,n])=>{const a=B.filter(r=>r.run==='lmeval'&&r.extract[k][1]).length,b=B.filter(r=>r.run==='inspect'&&r.extract[k][1]).length;return [n,a,b]});
  const W=RD.width(el),narrow=W<520,lab=narrow?Math.min(150,W*0.42):190,right=narrow?34:44,bw=W-lab-right-8,rh=30,top=34,H=top+rows.length*rh+30;
  const x=v=>lab+bw*v/10;
  let g='';
  for(let v=0;v<=10;v+=narrow?5:2){g+='<line x1="'+x(v)+'" x2="'+x(v)+'" y1="'+(top-6)+'" y2="'+(top+rows.length*rh)+'" stroke="var(--line)"/>'+RD.t(x(v),top+rows.length*rh+14,v,{a:'middle',fill:'var(--mute)'})}
  g+=RD.t(lab,14,'lm-eval outputs',{fill:'var(--c1)',w:600})+RD.t(lab+(narrow?100:120),14,'Inspect outputs',{fill:'var(--c2)',w:600});
  rows.forEach((r,i)=>{const y=top+i*rh;
    g+=RD.t(lab-8,y+15,RD.esc(narrow?r[0].replace('flexible-extract','flexible').replace(' math_scorer','').replace(' final_number','').replace('(numeric)',''):r[0]),{a:'end'});
    g+='<rect x="'+lab+'" y="'+(y+3)+'" width="'+Math.max(1.5,x(r[1])-lab)+'" height="10" fill="var(--c1)" rx="2"/><rect x="'+lab+'" y="'+(y+14)+'" width="'+Math.max(1.5,x(r[2])-lab)+'" height="10" fill="var(--c2)" rx="2"/>';
    g+=RD.t(x(Math.max(r[1],r[2]))+6,y+18,r[1]+' / '+r[2],{fill:'var(--ink)'});});
  g+=RD.t(lab+bw/2,H-2,'correct out of 10 (same 20 texts for every rule)',{a:'middle',fill:'var(--mute)'});
  el.innerHTML=RD.svg(W,H,g,'Correct answers out of 10 under seven extraction rules on the same outputs');}
function live(){const t=$('ex-in').value,g=$('ex-gold').value.trim();
  $('ex-live').querySelector('tbody').innerHTML=Object.keys(EX).map(k=>{const v=EX[k].f(t,g);return '<tr><td>'+EX[k].n+'</td><td><code>'+esc(String(v[0]).slice(0,40)||'(nothing)')+'</code></td><td class="r '+(v[1]?'y':'n')+'">'+(v[1]?'correct':'wrong')+'</td></tr>'}).join('')+'<tr><td>lighteval math_scorer</td><td colspan="2" class="mute">offline only (sympy)</td></tr>';}
function all(){panel('a',pa);panel('b',pb)}
if(window.RD)RD.onResize(()=>totals());
let done=false;
function init(){if(!window.HX)return;
  if(!done){done=true;fieldChips();opts($('sx-a'),pa);opts($('sx-b'),pb);table();
    $('sx-field').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;field=b.dataset.f;fieldChips();all()});
    $('sx-a').addEventListener('change',e=>{pa=e.target.value;panel('a',pa)});
    $('sx-b').addEventListener('change',e=>{pb=e.target.value;panel('b',pb)});
    $('ex-pick').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;exI=+b.dataset.i;bench()});
    $('ex-in').addEventListener('input',live);$('ex-gold').addEventListener('input',live);
    const B=window.HX.bench;if(B){const j=B.findIndex(r=>{const v=RULES.map(([k])=>r.extract[k][1]);return v.some(x=>x)&&v.some(x=>!x)});if(j>=0)exI=j}
  }
  all();bench();live();totals();}
(window.TAB_RENDER=window.TAB_RENDER||{})['t-same']=(window.TAB_RENDER['t-same']||[]).concat([init]);
// the extraction bench now lives in Reading section 2
(window.TAB_RENDER['t-read']=window.TAB_RENDER['t-read']||[]).push(init);
})();
