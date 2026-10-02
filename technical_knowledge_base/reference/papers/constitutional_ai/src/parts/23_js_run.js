// ---- Replay the critiques: the released critique-revision chains, step by step, and the four models' median answers ----
(function(){
const X=CAI.x,SL=X.principles.sl,DSN={PALMS:'PALMS',LAMDA:'LaMDA',INSTRUCTGPT:'InstructGPT'};
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
// word-level LCS diff: which words of b are new relative to a
function diff(a,b){const A=a.split(/\s+/).filter(Boolean),B=b.split(/\s+/).filter(Boolean),n=A.length,m=B.length;
  const L=Array.from({length:n+1},()=>new Uint16Array(m+1));for(let i=n-1;i>=0;i--)for(let j=m-1;j>=0;j--)L[i][j]=A[i]===B[j]?L[i+1][j+1]+1:Math.max(L[i+1][j],L[i][j+1]);
  const out=[];let i=0,j=0;while(j<m){if(i<n&&A[i]===B[j]){out.push([B[j],0]);i++;j++}else if(i<n&&L[i+1][j]>=L[i][j+1])i++;else{out.push([B[j],1]);j++}}return out}
const sel=$('rpQ');X.pick.forEach(i=>{const p=X.prompts[i],o=document.createElement('option');o.value=i;o.textContent=DSN[p.ds]+': '+(p.q.length>70?p.q.slice(0,67)+'...':p.q);sel.appendChild(o)});
const start=X.pick.indexOf(57)>=0?57:X.pick[0];sel.value=start;
let cur=+sel.value,seq=[];
function build(i){const C=X.chains[i];seq=[{kind:'init',text:C.init}];let prev=C.init;
  C.steps.forEach((s,k)=>{seq.push({kind:'crit',k,p:s.p,text:s.c,ans:prev});const d=diff(prev,s.r);seq.push({kind:'rev',k,p:s.p,text:s.r,d,prevLen:prev.split(/\s+/).filter(Boolean).length});prev=s.r});
  return seq.map(s=>s.kind==='init'?{t:'the helpful RLHF model answers',c:'The first answer, sampled from the 52B helpful-only RLHF model. This is what the critiques start from.'}
    :s.kind==='crit'?{t:'critique '+(s.k+1)+', principle '+s.p,c:'<b>Critique request:</b> '+esc(SL[s.p].c)}
    :{t:'revision '+(s.k+1),c:'<b>Revision request:</b> '+esc(SL[s.p].r)})}
const o={id:'crx',modes:{x:build(cur)},mode:'x',dur:3600,
 draw:(m,k,e,w)=>{const s=seq[k],q=X.prompts[cur].q;let h='<div class="conv"><div class="msg h pv"><span class="who">Human ('+DSN[X.prompts[cur].ds]+' prompt)</span>'+esc(q)+'</div>';
  const reveal=(words,f)=>{const n=Math.max(1,Math.ceil(words.length*f));return words.slice(0,n)};
  if(s.kind==='init'){const ws=s.text.split(/\s+/);h+='<div class="msg pv"><span class="who">Assistant, first answer</span>'+esc(reveal(ws,e).join(' '))+'</div>'}
  else if(s.kind==='crit'){h+='<div class="msg dim pv"><span class="who">Assistant, current answer</span>'+esc(s.ans)+'</div><div class="msg req"><span class="who">Critique request, principle '+s.p+'</span>'+esc(SL[s.p].c)+'</div><div class="msg crit pv"><span class="who">Critique '+(s.k+1)+' (sampled)</span>'+esc(reveal(s.text.split(/\s+/),e).join(' '))+'</div>'}
  else{const ws=reveal(s.d,e);h+='<div class="msg req"><span class="who">Revision request, principle '+s.p+'</span>'+esc(SL[s.p].r)+'</div><div class="msg rev pv"><span class="who">Revision '+(s.k+1)+' (sampled), spliced after the prompt</span>'+ws.map(([t,ins])=>ins?'<mark class="ins">'+esc(t)+'</mark>':esc(t)).join(' ')+'</div>'}
  return h+'</div>'},
 counters:(m,k,e)=>{const s=seq[k];let ans=seq[0].text,nw=null,prevLen=null;for(let i=1;i<=k;i++)if(seq[i].kind==='rev'){ans=seq[i].text;nw=seq[i].d.filter(x=>x[1]).length;prevLen=seq[i].prevLen}
  const words=ans.split(/\s+/).filter(Boolean).length,drawn=seq.filter((x,i)=>x.kind==='crit'&&i<=k).map(x=>x.p);
  return '<div class="grid">'+stat('Answer length',words+' words',k?'first answer: '+seq[0].text.split(/\s+/).filter(Boolean).length:'')+stat('New words in the last revision',nw==null?'none yet':nw+' of '+words,nw==null?'':Math.round(100*nw/words)+'% of the revision')+stat('Principles drawn',drawn.length?drawn.join(', '):'none yet','random, with replacement, from 16')+'</div>'}};
const anim=makeAnim(o);
function models(i){const P=X.median[i];const names=CAI.s.models;let h='';
  names.forEach(m=>{const F=X.feats[m],j=i*17+8,w=F.w[j],ev=F.f[j]==='1'&&w<=25,bp=F.b1[j]==='1',vv=F.b2[j]==='1';
    h+='<div class="sp"><div class="n">'+m+'</div><p>'+(ev?'<span class="tag ev">canned refusal</span>':'')+(bp?'<span class="tag bp">"I\'m here to ..."</span>':'')+(vv?'<span class="tag bp">"valid, valued"</span>':'')+'<span class="tag">'+w+' words</span></p><p class="pv">'+esc(P[m])+'</p></div>'});
  $('rpM').innerHTML=h;
  const hh=X.feats['HH RLHF'];let n=0;for(let j=0;j<17;j++)if(hh.f[i*17+j]==='1'&&hh.w[i*17+j]<=25)n++;
  $('rpMn').innerHTML='On this prompt, '+n+' of HH RLHF\'s 17 samples are canned refusals (every one is in the Count the refusals tab). The order and the median come from the pm_score stored in the files; the repository does not say which PM computed it.'}
sel.addEventListener('change',()=>{cur=+sel.value;o.modes.x=build(cur);anim.st.k=0;anim.st.t=RM?1:0;anim.st.lk=-1;anim.draw();models(cur);$('crxHead').textContent=headTxt()});
const headTxt=()=>'Chain for prompt '+(X.pick.indexOf(cur)+1)+' of '+X.pick.length+': 1 answer, 4 critiques, 4 revisions.';
$('crxHead').textContent=headTxt();models(cur);
onTab('t-run',()=>{refit($('crxSvg'))});
})();
