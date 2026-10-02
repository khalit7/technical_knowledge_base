// ---- Count the refusals: the classifier over all 4,488 released answers, the 66 x 17 grid, the median check ----
(function(){
const X=CAI.x,S=CAI.s,M=S.models,DSN={PALMS:'PALMS',LAMDA:'LaMDA',INSTRUCTGPT:'InstructGPT'};
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
let gm='HH RLHF',sel=-1;
const opts=()=>({W:+$('cW').value,ph:$('cPh').checked,ds:$('cDs').value});
const isEv=(F,j,o)=>F.w[j]<=o.W&&(!o.ph||F.f[j]==='1');
const rows=o=>X.prompts.map((p,i)=>i).filter(i=>o.ds==='all'||X.prompts[i].ds===o.ds);
function bars(){const o=opts();$('cWv').textContent=o.W;const R=rows(o);
  const res=M.map(m=>{const F=X.feats[m];let n=0,e=0,b=0,v=0;R.forEach(i=>{for(let k=0;k<17;k++){const j=i*17+k;n++;if(isEv(F,j,o))e++;if(F.b1[j]==='1')b++;if(F.b2[j]==='1')v++}});return {m,n,e,b,v}});
  fit($('cBars'),w=>{const pl=Math.min(130,w*.34),pr=56,iw=w-pl-pr,rh=24;let s='',y=16;
    const grp=(title,key,col)=>{s+=tx(0,y,title,{fs:12,w:600});y+=8;res.forEach(r=>{const v=r[key]/r.n;s+=tx(pl-8,y+14,r.m,{fs:12,a:'end'})+rc(pl,y+3,iw,15,'var(--soft)',{r:3})+rc(pl,y+3,Math.max(1,iw*v),15,col,{r:3})+tx(pl+Math.max(1,iw*v)+6,y+15,(100*v).toFixed(1)+'%',{fs:11,w:600});y+=rh});y+=18};
    grp('Canned refusals',"e",'var(--bad)');grp('Contains "I\'m here to listen / support / help"','b','var(--c4)');
    $('cBars').innerHTML=svgEl(w,y-10,s,'Refusal and boilerplate shares per model')});
  $('cNote').innerHTML=res.map(r=>'<b>'+r.m+'</b>: '+fmt(r.e)+' refusals, '+fmt(r.b)+' "here to", '+fmt(r.v)+' "valid, valued" of '+fmt(r.n)).join(' · ')+'. '+(o.ph?'':'Without the phrase test every short answer counts, so helpful lists and poems start to appear: the phrase is what separates a refusal from a short answer. ')+'At the default (25 words, phrase required) the count is the one quoted on The paper tab.';
  grid()}
function grid(){const o=opts(),R=rows(o),F=X.feats[gm];
  fit($('cGrid'),w=>{const lab=w>=520?150:0,cw=Math.max(8,Math.min(22,Math.floor((w-lab-4)/17))),rh=w>=520?9:8,W=lab+17*cw+4,H=R.length*rh+18;let s='';
    for(let k=0;k<17;k+=4)s+=tx(lab+k*cw+cw/2,11,k+1,{fs:11,a:'middle',c:'var(--mute)'});
    R.forEach((i,r)=>{const y=16+r*rh;if(lab&&r%2===0)s+='<text x="'+(lab-6)+'" y="'+(y+rh-1)+'" font-size="11" text-anchor="end" fill="var(--mute)">'+esc(X.prompts[i].q.slice(0,22))+'</text>';
      for(let k=0;k<17;k++){const j=i*17+k,c=isEv(F,j,o)?'var(--bad)':F.b1[j]==='1'?'var(--c4)':'var(--dim)';s+='<rect data-r="'+i+'" x="'+(lab+k*cw+.5)+'" y="'+y+'" width="'+(cw-1)+'" height="'+(rh-1)+'" fill="'+c+'"'+(i===sel?' stroke="var(--ink)" stroke-width="1"':'')+'/>'}});
    $('cGrid').innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Every sample of '+gm+', prompt by prompt" style="max-width:100%;height:auto">'+s+'</svg>'});
  info()}
function info(){if(sel<0){$('cRow').innerHTML='Tap a row.';return}const o=opts(),p=X.prompts[sel];let h='<b>'+DSN[p.ds]+':</b> '+esc(p.q)+'<br>';
  h+=M.map(m=>{const F=X.feats[m];let e=0,b=0;for(let k=0;k<17;k++){const j=sel*17+k;if(isEv(F,j,o))e++;if(F.b1[j]==='1')b++}return m+': '+e+' refusals, '+b+' "here to"'}).join(' · ');
  if(X.pick.includes(sel))h+='<br><a href="#" id="cGo">Replay this prompt\'s critique chain and read the four median answers</a>';
  $('cRow').innerHTML=h;const g=$('cGo');if(g)g.addEventListener('click',e=>{e.preventDefault();const s=$('rpQ');s.value=sel;s.dispatchEvent(new Event('change'));document.querySelector('#tabs button[data-t=t-run]').click()})}
$('cGrid').addEventListener('click',e=>{const r=e.target.closest('rect');if(!r)return;sel=+r.dataset.r;grid()});
['cW','cPh','cDs'].forEach(id=>$(id).addEventListener(id==='cW'?'input':'change',bars));
segBind('cM',m=>{gm=m;grid()});
// audit list
$('cAudN').textContent=X.refusals.length+' distinct answers, '+X.refusals.reduce((a,b)=>a+b[1],0)+' in all';
$('cAudL').innerHTML=X.refusals.map(([t,n])=>'<li>'+esc(t)+(n>1?' <span class="mute">(×'+n+')</span>':'')+'</li>').join('');
// median check
const A=S.appendix_d,pos=a=>a.length?a.map(x=>x===8?'<b>'+(x+1)+'</b>':String(x+1)).join(', '):'not found';
$('cMedT').innerHTML='<thead><tr><th>Appendix D prompt</th><th>HH RLHF</th><th>RL-CAI with CoT</th></tr></thead><tbody>'+A.map(r=>'<tr><td>'+esc(r.q)+(r.q.length>=60?'...':'')+'</td><td>'+pos(r['HH RLHF'])+'</td><td>'+pos(r['RL-CAI with CoT'])+'</td></tr>').join('')+'</tbody>';
$('cMedN').innerHTML='The printed answer is sample 9 of 17, the median, for '+S.appendix_d_cot_at_median[0]+' of '+S.appendix_d_cot_at_median[1]+' RL-CAI with CoT answers and '+S.appendix_d_hh_includes_median[0]+' of '+S.appendix_d_hh_includes_median[1]+' HH RLHF answers (independently reproduced: the files are sorted by PM score and the paper says "median"). Where several positions are listed, several samples start with the same words (identical refusals mostly), so the match cannot tell them apart; sample 9 is always among them. Matching uses the first 45 characters of each sample against the appendix text.';
onTab('t-count',bars);
})();
