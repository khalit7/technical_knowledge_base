// ---- MRCR tab (ids mr-): difflib.SequenceMatcher ported from CPython (isjunk=None, autojunk=True) ----
window.SeqMatch=function(a,b){
  a=Array.from(a);b=Array.from(b);const n=b.length,b2j=new Map();
  for(let i=0;i<n;i++){const c=b[i];if(!b2j.has(c))b2j.set(c,[]);b2j.get(c).push(i)}
  if(n>=200){const ntest=Math.floor(n/100)+1;for(const [c,idx] of [...b2j]){if(idx.length>ntest)b2j.delete(c)}}
  function longest(alo,ahi,blo,bhi){let bi=alo,bj=blo,bs=0,j2len=new Map();
    for(let i=alo;i<ahi;i++){const nj=new Map();const idx=b2j.get(a[i]);if(idx){for(const j of idx){if(j<blo)continue;if(j>=bhi)break;const k=(j2len.get(j-1)||0)+1;nj.set(j,k);if(k>bs){bi=i-k+1;bj=j-k+1;bs=k}}}j2len=nj}
    while(bi>alo&&bj>blo&&a[bi-1]===b[bj-1]){bi--;bj--;bs++}
    while(bi+bs<ahi&&bj+bs<bhi&&a[bi+bs]===b[bj+bs])bs++;
    return [bi,bj,bs]}
  const q=[[0,a.length,0,n]];let M=0,blocks=0;
  while(q.length){const [alo,ahi,blo,bhi]=q.pop();const [i,j,k]=longest(alo,ahi,blo,bhi);
    if(k){M+=k;blocks++;if(alo<i&&blo<j)q.push([alo,i,blo,j]);if(i+k<ahi&&j+k<bhi)q.push([i+k,ahi,j+k,bhi])}}
  const T=a.length+n;return {M,blocks,ratio:T?2*M/T:1,la:a.length,lb:n}};
window.MRCRgrade=function(resp,answer,prefix){if(!resp.startsWith(prefix))return {score:0,gate:false};
  const r=SeqMatch(resp.slice(prefix.length),answer.slice(prefix.length));return {score:r.ratio,gate:true,r}};
(function(){
const D=window.LD.mrcr,esc=RD.esc;if(!document.getElementById('t-mrcr'))return;
const P=D.prefix,T=D.texts,ans=P+T.target;
const ask='write a short scene in a play about blueberries';
const PY={correct:1.0,other_needle:0.032376,no_prefix:0,same_format_other_topic:0.02684,first_half:0.666667,with_preamble:0.992184};
const C=[['correct','The right needle (1st scene)',P+T.target],['other_needle','The other needle (2nd scene)',P+T.other],['no_prefix','Right scene, prefix missing',T.target],
  ['same_format_other_topic','A different play scene (about glass)',P+T.glass],['first_half','Right scene, cut in half',P+T.target.slice(0,Math.floor(Array.from(T.target).length/2))],
  ['with_preamble','Right scene after a polite preamble',P+'Here is the scene you asked for:\n\n'+T.target]];
let built=false;
function build(){if(built)return;built=true;
  const map=document.getElementById('mr-map');
  map.innerHTML=D.msgs.map(([i,r,n,a])=>{let cl=r==='u'?'u':'a';if(i===0)cl='ex';else if(r==='u'&&a===ask)cl='nu';else if(r==='a'&&D.needles.indexOf(i-1)>=0)cl='nd';if(i===D.msgs.length-1)cl='fi';
    const w=r==='u'&&i>0&&i<D.msgs.length-1?6:Math.max(4,Math.round(n/40));return '<span class="'+cl+'" data-i="'+i+'" style="width:'+w+'px" title="message '+i+'"></span>'}).join('');
  map.addEventListener('click',e=>{const s=e.target.closest('span[data-i]');if(!s)return;show(+s.dataset.i)});
  document.getElementById('mr-final').textContent=D.final;
  document.getElementById('mr-facts').innerHTML=RD.stat('Size',D.n_chars.toLocaleString('en-US')+' chars',D.tokens.toLocaleString('en-US')+' tokens (o200k), bin 8K to 16K')+RD.stat('Messages',D.msgs.length,'incl. the final question')+
    RD.stat('Needles',D.needles.length+' requests','user turns '+D.needles.join(' and '))+RD.stat('Target','message '+(D.needles[0]+1),'reply to the 1st request');
  document.getElementById('mr-cands').innerHTML=C.map((c,k)=>'<button data-k="'+k+'">'+esc(c[1])+'</button>').join('');
  document.getElementById('mr-cands').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;load(+b.dataset.k)});
  document.getElementById('mr-resp').addEventListener('input',()=>grade(null));
  show(D.needles[0]+1);load(0)}
function show(i){const m=D.msgs[i];const el=document.getElementById('mr-detail');document.querySelectorAll('#mr-map span').forEach(s=>s.classList.toggle('on',+s.dataset.i===i));
  let t='Message '+i+' ('+(m[1]==='u'?'user':'assistant')+', '+m[2].toLocaleString('en-US')+' characters)\n\n';
  if(i===0)t+='Worked examples of the task, shown before the conversation (not embedded here).';
  else if(m[1]==='u')t+=m[3]||D.final;
  else if(i===D.needles[0]+1)t+='[1st needle: the target]\n'+T.target;else if(i===D.needles[1]+1)t+='[2nd needle]\n'+T.other;else if(i===14)t+=T.glass;
  else t+='Reply to "'+D.msgs[i-1][3]+'". Text not embedded, to keep the page small.';
  el.textContent=t}
let cur=null;
function load(k){cur=k;document.getElementById('mr-resp').value=C[k][2];document.querySelectorAll('#mr-cands button').forEach((b,j)=>b.classList.toggle('on',j===k));grade(k)}
function grade(k){const v=document.getElementById('mr-resp').value;if(k===null){cur=null;document.querySelectorAll('#mr-cands button').forEach(b=>b.classList.remove('on'))}
  const g=MRCRgrade(v,ans,P);
  document.getElementById('mr-out').innerHTML=RD.stat('Score',g.score.toFixed(4),g.gate?'similarity ratio':'prefix '+P+' missing: 0')+RD.stat('Prefix gate',g.gate?'passed':'failed',P)+
    RD.stat('Matching characters',g.gate?g.r.M.toLocaleString('en-US'):'n/a',g.gate?g.r.blocks+(g.r.blocks===1?' block':' blocks'):'')+RD.stat('Lengths',g.gate?g.r.la.toLocaleString('en-US')+' vs '+g.r.lb.toLocaleString('en-US'):'n/a','reply vs target, prefix removed');
  document.getElementById('mr-py').textContent=cur!=null?('Python difflib on this preset: '+PY[C[cur][0]].toFixed(6)+' (recompute.py); this page: '+g.score.toFixed(6)+'.'):'Edited reply: graded live in the page.'}
(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-mrcr']=window.TAB_RENDER['t-mrcr']||[]).push(build);
})();
