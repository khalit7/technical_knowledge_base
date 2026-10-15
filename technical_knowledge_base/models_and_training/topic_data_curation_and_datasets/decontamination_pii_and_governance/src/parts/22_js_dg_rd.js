// ---- Reading tab: n-gram animation, predict-then-reveal, measured panels (data: window.DG) ----
(function(){
  const E=RD.esc, $=id=>document.getElementById(id);
  // predict-then-reveal: <div class="pr" data-r="index of the right option">
  document.querySelectorAll('#t-read .pr').forEach(pr=>{
    const r=pr.dataset.r;pr.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{
      pr.querySelectorAll('.opts button').forEach(x=>{x.classList.toggle('right',x.dataset.a===r);x.classList.toggle('wrong',x===b&&x.dataset.a!==r)});
      const a=pr.querySelector('.ans');a.hidden=false;RD.tabLinks(a)}))});

  // ---------- n-gram animation ----------
  const A=DG.anim, card=$('dg-ng-card'); if(!card||!A)return;
  const lab={copy:'A copied question',passage:'A famous passage',phrase:'A question stem',diagram:'Diagram code'};
  const seg=$('dg-ng-pair');
  seg.innerHTML=A.map((a,i)=>'<button data-m="'+i+'"'+(i?'':' class="on"')+'>'+lab[a.cat]+'</button>').join('')+
    '<span style="width:12px"></span><button data-n="8" class="on">8-grams</button><button data-n="13">13-grams</button>';
  let P=0,N=8;
  function grams(t,n){const s=new Set();for(let i=0;i+n<=t.length;i++)s.add(t.slice(i,i+n).join(' '));return s}
  function marks(a,b,n){ // tokens of a inside an n-gram also in b
    const g=grams(b,n),m=new Array(a.length).fill(false);let hits=0;
    for(let i=0;i+n<=a.length;i++)if(g.has(a.slice(i,i+n).join(' '))){hits++;for(let k=i;k<i+n;k++)m[k]=true}
    return {m,hits,total:Math.max(0,a.length-n+1)}}
  function longest(m){let b=0,c=0;m.forEach(x=>{c=x?c+1:0;b=Math.max(b,c)});return b}
  function chips(t,m,cls){return '<div class="dg-tok">'+t.map((w,i)=>'<span'+(m&&m[i]?' class="'+cls+'"':'')+'>'+E(w)+'</span>').join(' ')+'</div>'}
  const steps=[
    ['1. Normalise both texts','Lower-case, punctuation to spaces, accents removed, split on spaces (datatrove\'s simplify_text with numbers kept). This is what every rule sees: note what happened to symbols and maths.'],
    ['2. Index the item\'s n-grams','Every run of n consecutive item tokens is hashed into the index. Building it for all seven benchmarks takes seconds; it is the small side.'],
    ['3. Stream the document','Slide the same window over the training document and look up each n-gram. Green: document tokens inside an n-gram the index holds.'],
    ['4. Mark the item tokens covered','Item tokens inside a shared n-gram. Coverage = covered tokens / all item tokens; the longest unbroken covered run is what ConTAM uses.'],
    ['5. Apply the published rules','The same marks, four verdicts. The label underneath says what the document really contains (read by hand).']];
  function draw(i){
    const a=A[P], it=a.item, dc=a.doc;
    const mi=marks(it,dc,N), md=marks(dc,it,N);
    const cov=mi.m.filter(Boolean).length, lg=longest(mi.m);
    $('dg-ng-cap').innerHTML='<div class="t">'+steps[i][0]+'</div><p>'+steps[i][1]+'</p>';
    let h='<div class="dg-lab">Benchmark item: '+E(DG.bench_names[a.bench])+' #'+a.bidx+(a.item_full_len>it.length?' (tokens '+(a.item_off+1)+' to '+(a.item_off+it.length)+' of '+a.item_full_len+')':'')+'</div>';
    h+=chips(it,i>=3?mi.m:(i==1?it.map((_,k)=>k<N):null),i>=3?'hit':'idx');
    h+='<div class="dg-lab">Training document: '+E(a.label)+' (matched part, '+dc.length+' tokens shown)</div>';
    h+=chips(dc,i>=2?md.m:null,'hit');
    if(i>=4){const fr=a.v;
      const r=(n,ok,why)=>'<div class="dg-v '+(ok?'y':'n')+'"><b>'+n+'</b><span>'+(ok?'flags it':'passes it')+'</span><i>'+why+'</i></div>';
      h+='<div class="dg-vs">'+r('GPT-3: any 13-gram',fr.m13>0,fr.m13+' shared 13-grams')+r('Tulu 3: > 50% of item by 8-grams',fr.cov8>0.5,'coverage '+Math.round(fr.cov8*100)+'% of all '+a.item_full_len+' tokens')+
        r('ConTAM: longest match',fr.lm>=0.5,'longest run '+fr.run+' tokens = '+Math.round(fr.lm*100)+'% of the item')+r('datatrove default: 12-gram on the answer',fr.dt,fr.dt?'an answer or answer-straddling 12-gram matched':'no answer 12-gram in the document')+'</div>'+
        '<p class="small"><b>What it really is:</b> '+E(a.cat)+(a.note?': '+E(a.note):'')+'. '+E(a.why||'')+'</p>'}
    $('dg-ng-view').innerHTML=h;
    $('dg-ng-cnt').innerHTML=RD.stat('n',N,N==8?'Tulu 3, Llama 3':'GPT-3')+RD.stat('item n-grams',i>=1?mi.total:'-','indexed')+
      RD.stat('shared n-grams',i>=2?mi.hits:'-','item side')+RD.stat('item coverage',i>=3?Math.round(100*cov/it.length)+'%':'-','of tokens shown')+RD.stat('longest run',i>=3?lg:'-','tokens');
  }
  const an=RD.anim({card:'dg-ng-card',ctl:'dg-ng-ctl',n:steps.length,draw,ms:2600,label:'Step'});
  seg.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
    if(b.dataset.m!=null){P=+b.dataset.m;seg.querySelectorAll('button[data-m]').forEach(x=>x.classList.toggle('on',x===b))}
    if(b.dataset.n!=null){N=+b.dataset.n;seg.querySelectorAll('button[data-n]').forEach(x=>x.classList.toggle('on',x===b))}
    an.redraw()});
})();
