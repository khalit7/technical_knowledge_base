// ---- Quality lab: document inspector (any square of the shard; excerpts for the 100 hand-labelled documents) ----
window.QI=(function(){
  const D=window.QD,Q=window.QL;if(!D||!document.getElementById('q-insp'))return null;
  const N=D.docs.edu.length;
  const SN={S1:'both drop, FineWeb-Edu score below 1.5',S2:'both drop, FineWeb-Edu score 1.5 to 2.5',S3:'FineWeb-Edu keeps, DCLM drops',S4:'DCLM keeps, FineWeb-Edu drops',S5:'both keep'};
  const KN={y:'worth training on',n:'not worth training on',u:'unsure'};
  const rank=a=>{const r=Q.ranks(a);return i=>r[i]/(a.length-1)};
  const R={edu:rank(D.docs.edu),dclm:rank(D.docs.dclm),own:rank(D.docs.own),ppl:D.docs.ppl[0]==null?null:rank(D.docs.ppl.map(v=>v==null?1e9:-v))};
  let filt='all',cur=-1;
  function bar(label,val,txt,pos,cutPos,keep,note){
    return '<div class="q-sb"><div class="q-sbl">'+label+'</div><div class="q-sbt"><span class="q-sbf" style="width:'+(100*pos).toFixed(1)+'%;background:'+(keep?'var(--c3)':'var(--dim)')+'"></span>'+
      (cutPos!=null?'<span class="q-sbc" style="left:'+(100*cutPos).toFixed(1)+'%"></span>':'')+'</div><div class="q-sbv">'+txt+' <span class="'+(keep?'q-k':'q-d')+'">'+(keep?'kept':'dropped')+'</span>'+(note?'<br><span class="small mute">'+note+'</span>':'')+'</div></div>'}
  function show(i){cur=i;const el=document.getElementById('q-insp-doc');const d=D.docs,L=d.lab[i]>=0?D.labels[d.lab[i]]:null;
    const e=d.edu[i],c=d.dclm[i],o=d.own[i],p=d.ppl[i];
    const ePos=Math.max(0,Math.min(1,(e+0.5)/5.5)),cPos=Math.max(0,Math.min(1,(Math.log10(Math.max(c,1e-5))+5)/5));
    let h='<div class="q-dh"><b>Document '+(i+1)+' of '+Q.fmt(N)+'</b> &middot; '+Q.fmt(d.words[i])+' words'+(L?' &middot; '+Q.esc(L.host):'')+(d.fwedu[i]?' &middot; <span class="q-k">in the published FineWeb-Edu</span>':'')+'</div>';
    h+=bar('FineWeb-Edu',e,'score '+e.toFixed(2)+' (int '+Math.round(Math.max(0,Math.min(5,e)))+'), top '+Q.pct(1-R.edu(i),0),ePos,3/5.5,e>=2.5,'cut: int_score ≥ 3 (score ≥ 2.5)');
    h+=bar('DCLM fastText',c,'P(hq) '+(c<0.001?c.toExponential(1):c.toFixed(4))+', top '+Q.pct(1-R.dclm(i),0),cPos,(Math.log10(D.cut)+5)/5,c>=D.cut,'cut: '+D.cut.toFixed(4)+' (axis log scale)');
    h+=bar('Our fastText',o,'P(hq) '+o.toFixed(3)+', top '+Q.pct(1-R.own(i),0),o,D.own_thr,o>=D.own_thr,'cut: '+D.own_thr+' (chosen on validation)');
    if(p!=null)h+=bar('CCNet perplexity',p,Q.fmt(p)+' (lower is more Wikipedia-like)',1-Math.min(1,Math.log10(p)/4),1-Math.log10(340)/4,p<340,'head &lt; 340, tail ≥ 520 (cc_net cutoff.csv)');
    if(d.qppl){const q=d.qppl[i],s=[...d.qppl].sort((a,b)=>a-b),c30=s[Math.floor(0.3*s.length)-1];h+=bar('Qwen3-0.6B perplexity',q,q.toFixed(1)+' (first 512 tokens)',1-Math.min(1,Math.log10(q)/3),1-Math.log10(c30)/3,q<=c30,'lowest 30%: ≤ '+c30.toFixed(1))}
    if(L){h+='<div class="q-lab"><b>Hand label:</b> <span class="'+(L.k==='y'?'q-k':L.k==='n'?'q-d':'')+'">'+KN[L.k]+'</span> &middot; '+Q.esc(L.f.replace('_',' '))+(L.g?' &middot; reads like generated or spun text':'')+' &middot; '+Q.esc(L.note)+'<br><span class="small mute">stratum: '+SN[L.s]+'</span></div>';
      h+=L.x?'<blockquote class="q-x">'+Q.esc(L.x)+'</blockquote>':'<p class="small mute">Excerpt withheld: the page is about a private individual.</p>'}
    else h+='<p class="small mute">Not in the hand-labelled sample, so no excerpt is embedded (only the 100 labelled documents carry text, to keep the page small). Pick one from the list for its text.</p>';
    el.innerHTML=h;const sel=document.getElementById('q-insp-sel');if(L)sel.value=String(L.n)}
  function list(){const sel=document.getElementById('q-insp-sel');const ls=D.labels.filter(L=>filt==='all'||L.s===filt||(filt==='wrong'&&L.k==='y'&&(L.s==='S1'||L.s==='S2')));
    sel.innerHTML=ls.map(L=>'<option value="'+L.n+'">'+L.s+' &middot; '+(L.k==='y'?'keep':L.k==='n'?'drop':'unsure')+' &middot; '+Q.esc(L.note)+'</option>').join('');
    if(ls.length)show(D.labels[+sel.value].i)}
  document.getElementById('q-insp-sel').addEventListener('change',e=>show(D.labels[+e.target.value].i));
  Q.seg(document.getElementById('q-insp-f'),m=>{filt=m;list()});
  document.getElementById('q-insp-rand').addEventListener('click',()=>show(Math.floor(Math.random()*N)));
  Q.onRender(()=>{if(cur<0)list()});
  return {show:i=>{show(i);const c=document.getElementById('q-insp');if(c&&c.scrollIntoView)c.scrollIntoView({block:'nearest'})}};
})();
