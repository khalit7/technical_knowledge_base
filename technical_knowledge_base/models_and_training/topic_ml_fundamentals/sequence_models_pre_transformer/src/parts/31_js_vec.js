// ---- Word vectors tab: real GloVe 6B 50d (2,000 words, int8), neighbours, analogies, the test, a projection ----
(function(){
  const $=id=>document.getElementById(id);
  if(!$('t-vec'))return;
  const G=SQ.glove,W=G.w,D=G.d,N=W.length,EV=G.ev;
  // decode int8 and renormalise to unit length
  const raw=atob(G.b),X=new Float32Array(N*D);
  for(let i=0;i<N;i++){let s=0;for(let k=0;k<D;k++){let v=raw.charCodeAt(i*D+k);if(v>127)v-=256;X[i*D+k]=v;s+=v*v}s=Math.sqrt(s)||1;for(let k=0;k<D;k++)X[i*D+k]/=s}
  const IDX={};W.forEach((w,i)=>IDX[w]=i);
  window.SQV={X,IDX,W,D};
  const esc=RD.esc,F=(v,d)=>v.toFixed(d);
  function sims(v){const out=new Float32Array(N);for(let i=0;i<N;i++){let s=0;const o=i*D;for(let k=0;k<D;k++)s+=X[o+k]*v[k];out[i]=s}return out}
  function vec(i){return X.subarray(i*D,i*D+D)}
  function top(s,k,skip){const r=[];for(let i=0;i<N;i++){if(skip&&skip.has(i))continue;const v=s[i];if(r.length<k||v>r[r.length-1][1]){r.push([i,v]);r.sort((a,b)=>b[1]-a[1]);if(r.length>k)r.pop()}}return r}
  const dl=$('vn-list');dl.innerHTML=W.slice(0,N).filter((w,i)=>i%1===0).map(w=>'<option value="'+esc(w)+'">').join('');
  // ---- neighbours
  const PN=['frog','king','paris','computer','happy','bank','apple','cold','memory'];
  $('vn-pre').innerHTML=PN.filter(w=>w in IDX).map(w=>'<button data-w="'+w+'">'+w+'</button>').join('');
  $('vn-pre').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;$('vn-w').value=b.dataset.w;nn()});
  function nn(){
    const w=$('vn-w').value.trim().toLowerCase();$('vn-msg').textContent='';
    if(!(w in IDX)){$('vn-msg').textContent=w?'"'+w+'" is not among the 2,000 words in this page; pick one from the list.':'';$('vn-a').innerHTML='';$('vn-b').innerHTML='';$('vn-bn').textContent='';return}
    const i=IDX[w],t=top(sims(vec(i)),10,new Set([i]));
    $('vn-a').innerHTML=t.map(([j,s])=>'<li>'+esc(W[j])+'<span class="s">'+F(s,3)+'</span></li>').join('');
    const f=EV.presets_full_vocab.nn[w];
    $('vn-b').innerHTML=f?f.map(([x,s])=>'<li>'+esc(x)+(x in IDX?'':' <span class="s">(not in page)</span>')+'<span class="s">'+F(s,3)+'</span></li>').join(''):'';
    $('vn-bn').textContent=f?'':'Computed offline for the preset words only.';
  }
  $('vn-w').addEventListener('input',nn);
  // ---- analogies
  const PA=[['man','king','woman'],['france','paris','japan'],['big','bigger','small'],['good','better','bad'],['walking','walked','swimming'],['man','doctor','woman'],['man','programmer','woman'],['man','surgeon','woman']];
  $('va-pre').innerHTML=PA.map((q,k)=>'<button data-k="'+k+'">'+q[0]+' : '+q[1]+' :: '+q[2]+'</button>').join('');
  $('va-pre').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const q=PA[+b.dataset.k];$('va-a').value=q[0];$('va-b').value=q[1];$('va-c').value=q[2];an()});
  function an(){
    const q=['va-a','va-b','va-c'].map(id=>$(id).value.trim().toLowerCase());$('va-msg').textContent='';
    const miss=q.filter(w=>!(w in IDX));
    if(miss.length){$('va-msg').textContent='Not among the 2,000 words in this page: '+miss.join(', ');$('va-x').innerHTML=$('va-i').innerHTML='';$('va-full').textContent='';return}
    const [a,b,c]=q.map(w=>IDX[w]),v=new Float32Array(D);let s=0;
    for(let k=0;k<D;k++){v[k]=X[b*D+k]-X[a*D+k]+X[c*D+k];s+=v[k]*v[k]}s=Math.sqrt(s);for(let k=0;k<D;k++)v[k]/=s;
    const S=sims(v),ins=new Set([a,b,c]);
    const li=(j,sc)=>'<li><span class="'+(ins.has(j)?'in':'')+'">'+esc(W[j])+'</span>'+(ins.has(j)?' <span class="s">(a question word)</span>':'')+'<span class="s">'+F(sc,3)+'</span></li>';
    $('va-x').innerHTML=top(S,5,ins).map(([j,sc])=>li(j,sc)).join('');
    $('va-i').innerHTML=top(S,5,null).map(([j,sc])=>li(j,sc)).join('');
    const f=EV.presets_full_vocab.analogy.find(x=>x.q.join()===q.join());
    if(f){const inc=f.top.slice(0,5).map(x=>x[0]),exc=f.top.filter(x=>!q.includes(x[0])).slice(0,5).map(x=>x[0]);
      $('va-full').innerHTML='All 400,000 words (offline): excluding, '+exc.map(esc).join(', ')+'; not excluding, '+inc.map(esc).join(', ')+'.'}
    else $('va-full').textContent='Full-vocabulary answers are computed offline for the presets only.';
  }
  ['va-a','va-b','va-c'].forEach(id=>$(id).addEventListener('input',an));
  // ---- the test
  const SECN=G.secs,pct=v=>F(100*v,1)+'%';
  function fullTable(){
    const r=(nm,o)=>'<tr><td>'+nm+'</td><td class="num">'+o.n.toLocaleString('en-GB')+'</td><td class="num">'+pct(o.semantic)+'</td><td class="num">'+pct(o.syntactic)+'</td><td class="num"><b>'+pct(o.total)+'</b></td></tr>';
    const it=EV.include_top_answer,nq=EV.full_include.n,inw=it.a+it.b+it.c;
    $('vt-full').innerHTML='<tr><th>Offline, GloVe 6B 50d</th><th class="num">Questions</th><th class="num">Semantic</th><th class="num">Syntactic</th><th class="num">Total</th></tr>'+
      r('400,000 words, question words excluded',EV.full_exclude)+r('400,000 words, not excluded',EV.full_include)+r('top 30,000 words, excluded',EV.top30k_exclude)+
      '<tr><td colspan="5" class="small mute">Not excluded, the top answer is a question word in '+inw.toLocaleString('en-GB')+' of '+nq.toLocaleString('en-GB')+' questions ('+pct(inw/nq)+'): <i>c</i> in '+it.c.toLocaleString('en-GB')+', <i>b</i> in '+it.b.toLocaleString('en-GB')+', <i>a</i> in '+it.a+'.</td></tr>';
  }
  fullTable();
  let running=false;
  function runTest(){
    if(running)return;running=true;$('vt-run').disabled=true;
    const Q=G.q,res={x:{},i:{}};let k=0;
    function chunk(){
      const end=Math.min(Q.length,k+40);
      for(;k<end;k++){const [s,a,b,c,d]=Q[k];const v=new Float32Array(D);let n=0;
        for(let j=0;j<D;j++){v[j]=X[b*D+j]-X[a*D+j]+X[c*D+j];n+=v[j]*v[j]}
        const S=sims(v);let bx=-1,bxv=-9,bi=-1,biv=-9;
        for(let j=0;j<N;j++){const t=S[j];if(t>biv){biv=t;bi=j}if(j!==a&&j!==b&&j!==c&&t>bxv){bxv=t;bx=j}}
        for(const [m,p] of [['x',bx],['i',bi]]){const o=res[m][s]=res[m][s]||[0,0];o[1]++;if(p===d)o[0]++}}
      $('vt-st').textContent=k+' of '+Q.length+' questions';
      if(k<Q.length){setTimeout(chunk,0);return}
      running=false;$('vt-run').disabled=false;draw(res);
    }
    chunk();
  }
  function draw(res){
    const secs=Object.keys(res.x).map(Number).sort((a,b)=>a-b);
    const tot=m=>{let a=0,b=0;secs.forEach(s=>{a+=res[m][s][0];b+=res[m][s][1]});return a/b};
    let h='<div class="out">'+RD.stat('In this page, excluded',pct(tot('x')),'560 questions, 2,000 candidates')+RD.stat('In this page, not excluded',pct(tot('i')),'same questions')+RD.stat('Full vocabulary, excluded',pct(EV.full_exclude.total),'19,544 questions, 400,000 candidates')+'</div>';
    h+='<div class="bars">';
    secs.forEach(s=>{const x=res.x[s],i=res.i[s];
      h+='<div class="row"><span class="nm" title="'+SECN[s]+'">'+SECN[s].replace('gram','g').replace(/-/g,' ')+'</span><span class="track"><span class="fill" style="width:'+(100*x[0]/x[1])+'%;background:var(--c1);opacity:.85"></span><span class="fill" style="width:'+(100*i[0]/i[1])+'%;background:var(--c2);height:5px;top:auto"></span></span><span class="val">'+Math.round(100*x[0]/x[1])+' / '+Math.round(100*i[0]/i[1])+'%</span></div>'});
    h+='</div><p class="small mute"><span style="color:var(--c1)">&#9632;</span> excluded, <span style="color:var(--c2)">&#9644;</span> not excluded; 40 questions per section, so each bar is uncertain by several points.</p>';
    $('vt-out').innerHTML=h;
  }
  $('vt-run').addEventListener('click',runTest);
  // ---- projection
  const SETS={'Countries and capitals':[['china','beijing'],['japan','tokyo'],['russia','moscow'],['france','paris'],['germany','berlin'],['italy','rome'],['spain','madrid'],['greece','athens'],['egypt','cairo'],['canada','ottawa']],
    'Comparatives':[['big','bigger'],['small','smaller'],['good','better'],['bad','worse'],['cold','colder'],['hot','hotter'],['strong','stronger'],['young','younger'],['old','older'],['fast','faster']],
    'Gendered pairs':[['man','woman'],['king','queen'],['boy','girl'],['father','mother'],['son','daughter'],['brother','sister'],['husband','wife'],['uncle','aunt'],['prince','princess'],['he','she']]};
  let cur='Countries and capitals';
  $('vp-set').innerHTML=Object.keys(SETS).map(k=>'<button data-k="'+k+'"'+(k===cur?' class="on"':'')+'>'+k+'</button>').join('');
  $('vp-set').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;cur=b.dataset.k;[...$('vp-set').children].forEach(x=>x.classList.toggle('on',x===b));pca()});
  function pca(){
    const P=SETS[cur].filter(p=>p[0] in IDX&&p[1] in IDX),ws=[].concat(...P),n=ws.length;
    const M=ws.map(w=>Array.from(vec(IDX[w]))),mu=new Array(D).fill(0);M.forEach(r=>r.forEach((v,k)=>mu[k]+=v/n));M.forEach(r=>r.forEach((v,k)=>r[k]=v-mu[k]));
    // two principal components by power iteration with deflation (deterministic start)
    const comps=[];
    for(let c=0;c<2;c++){let v=new Array(D).fill(0).map((_,k)=>Math.cos(k*1.7+c));
      for(let it=0;it<300;it++){const u=new Array(D).fill(0);M.forEach(r=>{let d=0;for(let k=0;k<D;k++)d+=r[k]*v[k];for(let k=0;k<D;k++)u[k]+=d*r[k]});
        comps.forEach(cv=>{let d=0;for(let k=0;k<D;k++)d+=u[k]*cv[k];for(let k=0;k<D;k++)u[k]-=d*cv[k]});
        let s=0;for(let k=0;k<D;k++)s+=u[k]*u[k];s=Math.sqrt(s)||1;v=u.map(x=>x/s)}
      comps.push(v)}
    const Y=M.map(r=>comps.map(cv=>{let d=0;for(let k=0;k<D;k++)d+=r[k]*cv[k];return d}));
    let tv=0;M.forEach(r=>r.forEach(v=>tv+=v*v));const ev=comps.map((cv,c)=>Y.reduce((s,y)=>s+y[c]*y[c],0)/tv);
    const box=$('vp-svg'),Wd=RD.width(box),H=Math.round(Math.min(380,Math.max(260,Wd*.62))),m=34;
    const xs=Y.map(y=>y[0]),ys=Y.map(y=>y[1]),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);
    const X_=v=>m+(Wd-2*m)*(v-x0)/((x1-x0)||1),Y_=v=>m/1.5+(H-1.5*m)*(1-(v-y0)/((y1-y0)||1));
    let s='<svg viewBox="0 0 '+Wd+' '+H+'" width="'+Wd+'" height="'+H+'" role="img" aria-label="Two-dimensional projection of word pairs"><defs><marker id="vp-ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--c1)"/></marker></defs>';
    P.forEach((p,k)=>{const a=Y[2*k],b=Y[2*k+1];s+='<line x1="'+X_(a[0])+'" y1="'+Y_(a[1])+'" x2="'+X_(b[0])+'" y2="'+Y_(b[1])+'" stroke="var(--c1)" stroke-width="1.4" opacity=".75" marker-end="url(#vp-ar)"/>'});
    ws.forEach((w,k)=>{const y=Y[k],first=k%2===0;s+='<circle cx="'+X_(y[0])+'" cy="'+Y_(y[1])+'" r="3" fill="'+(first?'var(--c2)':'var(--c3)')+'"/><text x="'+X_(y[0])+'" y="'+(Y_(y[1])-6)+'" font-size="11" text-anchor="middle" fill="'+(first?'var(--c2)':'var(--c3)')+'">'+esc(w)+'</text>'});
    box.innerHTML=s+'</svg>';
    // how parallel are the pair offsets in the full 50 dimensions?
    const off=P.map(p=>{const a=vec(IDX[p[0]]),b=vec(IDX[p[1]]);return Array.from(b).map((v,k)=>v-a[k])});
    let cs=0,c=0;for(let i=0;i<off.length;i++)for(let j=i+1;j<off.length;j++){let d=0,na=0,nb=0;for(let k=0;k<D;k++){d+=off[i][k]*off[j][k];na+=off[i][k]**2;nb+=off[j][k]**2}cs+=d/Math.sqrt(na*nb);c++}
    $('vp-note').innerHTML='The two axes keep '+F(100*(ev[0]+ev[1]),0)+'% of the variance of these '+n+' vectors. In all 50 dimensions the pair offsets (second word minus first) have a mean cosine similarity of '+F(cs/c,2)+' with each other: 1 would be perfectly parallel, 0 unrelated. A projection chosen for these words flatters the pattern, so the 50-dimension number is the honest one.';
  }
  let drawn=false;
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-vec']=window.TAB_RENDER['t-vec']||[]).push(()=>{nn();an();pca();drawn=true});
  let rt;addEventListener('resize',()=>{if(!drawn||$('t-vec').hidden)return;clearTimeout(rt);rt=setTimeout(pca,150)});
})();
