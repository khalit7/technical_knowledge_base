// ---- IVF-PQ lab (t-vixpq): a real FAISS IndexIVFPQ, recomputed in the browser from its codes and lookup tables ----
(function(){
  const P=window.VIX&&window.VIX.pq;if(!P)return;
  const $=id=>document.getElementById(id),esc=RD.esc;
  const b64=s=>{const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u};
  const codes=b64(P.codes),assign=b64(P.assign),M=P.m,KS=P.ksub,S=P.scale,n=P.sub_n;
  const Qs=P.queries.map(q=>{const t=new Int16Array(b64(q.T).buffer),e=new Int16Array(b64(q.exact).buffer);
    return Object.assign({},q,{Tf:Float32Array.from(t,x=>x/S),ex:Float32Array.from(e,x=>x/S),order:q.cs.map((v,i)=>[v,i]).sort((a,b)=>b[0]-a[0]).map(x=>x[1])})});
  const st={q:0,np:1,m:'flat'};
  Qs.forEach((q,i)=>{const o=document.createElement('option');o.value=i;o.textContent=(i+1)+'. '+(q.text.length>80?q.text.slice(0,78)+'...':q.text);$('vix-p-q').appendChild(o)});
  $('vix-p-err').textContent=P.recompute_max_abs_err.toExponential(1);
  function approx(q,j){let s=q.cs[assign[j]];for(let m=0;m<M;m++)s+=q.Tf[m*KS+codes[j*M+m]];return s}
  function run(qi,np,m){const q=Qs[qi];const cells=q.order.slice(0,np),cs=new Set(cells);const cand=[];for(let j=0;j<n;j++)if(cs.has(assign[j]))cand.push(j);
    const ap=new Map(cand.map(j=>[j,approx(q,j)]));let top;
    if(m==='flat')top=cand.slice().sort((a,b)=>q.ex[b]-q.ex[a]).slice(0,10);
    else{const byA=cand.slice().sort((a,b)=>ap.get(b)-ap.get(a));top=m==='pq'?byA.slice(0,10):byA.slice(0,100).sort((a,b)=>q.ex[b]-q.ex[a]).slice(0,10)}
    const gt=q.gt;const found=top.filter(j=>gt.includes(j)).length;return {q,cells,cand,ap,top,found}}
  const STEPS=['coarse','probe','score','one','rank','result'];
  let W=600;
  function bars(q,np){const h=120,w=W;const v=q.order.map(i=>q.cs[i]);const mx=Math.max(...v),mn=Math.min(...v);const bw=(w-40)/72;let s='';
    q.order.forEach((c,k)=>{const y=h-14-(q.cs[c]-mn)/(mx-mn||1)*(h-30);s+='<rect x="'+(34+k*bw).toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+Math.max(1,bw-1).toFixed(1)+'" height="'+(h-14-y).toFixed(1)+'" fill="'+(k<np?'var(--acc)':'var(--dim)')+'"><title>cell '+c+': similarity '+q.cs[c].toFixed(3)+', '+P.list_sizes[c]+' abstracts</title></rect>'});
    s+=RD.t(2,12,'query &middot; centroid, all 72 cells, sorted',{fs:11,fill:'var(--mute)'})+RD.t(34,h-2,'nearest cell',{fs:10,fill:'var(--mute)'})+RD.t(w-6,h-2,'farthest',{fs:10,fill:'var(--mute)',a:'end'});
    return RD.svg(w,h,s,'Similarity of the claim to the 72 centroids')}
  function heat(q,j){const cv=document.createElement('canvas');const cw=Math.min(W,620),ch=Math.round(cw*0.28);cv.width=cw*2;cv.height=ch*2;cv.style.width=cw+'px';cv.style.height=ch+'px';
    const g=cv.getContext('2d');g.scale(2,2);const cx=(cw-30)/KS,cy=(ch-14)/M;let mx=0;for(const v of q.Tf)mx=Math.max(mx,Math.abs(v));
    const dark=matchMedia('(prefers-color-scheme: dark)').matches;
    for(let m=0;m<M;m++)for(let k=0;k<KS;k++){const v=q.Tf[m*KS+k]/mx;const a=Math.min(1,Math.abs(v));g.fillStyle=v>=0?'rgba(47,111,181,'+a+')':'rgba(194,112,58,'+a+')';g.fillRect(28+k*cx,m*cy,cx+0.3,cy-0.5)}
    g.fillStyle=dark?'#9b9a97':'#787774';g.font='9px sans-serif';for(let m=0;m<M;m+=3)g.fillText('m'+m,0,m*cy+cy*0.8);g.fillText('256 centroids per sub-vector; colour = claim piece \u00b7 centroid (blue +, orange \u2212)',28,ch-2);
    if(j!==undefined){g.strokeStyle=dark?'#e6e5e3':'#2f3437';g.lineWidth=1.5;for(let m=0;m<M;m++){const k=codes[j*M+m];g.strokeRect(28+k*cx-1.5,m*cy-0.5,cx+3,cy)}}
    return cv}
  function scatter(R){const w=Math.min(W,560),h=Math.round(w*0.62);const xs=R.cand.map(j=>R.q.ex[j]),ys=R.cand.map(j=>R.ap.get(j));
    const x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys);const X=v=>40+(v-x0)/(x1-x0||1)*(w-52),Y=v=>h-28-(v-y0)/(y1-y0||1)*(h-40);
    let s='<line x1="40" y1="'+(h-28)+'" x2="'+(w-12)+'" y2="'+(h-28)+'" stroke="var(--line)"/><line x1="40" y1="8" x2="40" y2="'+(h-28)+'" stroke="var(--line)"/>';
    const top=new Set(R.top),gt=new Set(R.q.gt);
    R.cand.forEach(j=>{const g=gt.has(j),t=top.has(j);s+='<circle cx="'+X(R.q.ex[j]).toFixed(1)+'" cy="'+Y(R.ap.get(j)).toFixed(1)+'" r="'+(g||t?3.6:2.2)+'" fill="'+(g&&t?'var(--good)':g?'var(--bad)':t?'var(--c5)':'var(--dim)')+'"/>'});
    s+=RD.t(w/2,h-6,'exact similarity (float32)',{a:'middle',fs:11,fill:'var(--mute)'})+RD.t(4,14,'PQ score',{fs:11,fill:'var(--mute)'});
    return RD.svg(w,h,s,'PQ score against exact similarity for every candidate')}
  function fmt(x){return x>=1e6?(x/1e6).toFixed(2)+' M':x>=1e3?(x/1e3).toFixed(1)+' k':String(Math.round(x))}
  function draw(i){W=Math.max(270,Math.min(RD.width($('vix-p-fig')),720));const R=run(st.q,st.np,st.m),q=R.q,step=STEPS[i];const fig=$('vix-p-fig');fig.innerHTML='';
    const D=P.d,nc=R.cand.length;let mac=72*D,bytes=72*D*4;let cap='';
    const firstMissing=R.cand.find(j=>q.gt.includes(j))!==undefined?R.cand.find(j=>q.gt.includes(j)):R.cand[0];
    if(step==='coarse'){fig.innerHTML=bars(q,0);cap='<b>1. Coarse step.</b> The claim is compared with the 72 k-means centroids (72 &times; 1,024 multiply-adds). Each abstract lives in exactly one cell, the one whose centroid is nearest to it. &ldquo;'+esc(q.text)+'&rdquo;'}
    else if(step==='probe'){fig.innerHTML=bars(q,st.np);const out=q.gt.filter(j=>j<0||!R.cand.includes(j)).length;cap='<b>2. Probe the '+st.np+' nearest cell'+(st.np>1?'s':'')+'</b> (blue): '+nc+' candidate abstracts out of 5,183. '+(out?out+' of the exact top 10 live in cells not probed: no later step can find them (the boundary problem).':'All of the exact top 10 are inside the probed cells.')}
    else if(step==='score'){if(st.m==='flat'){fig.innerHTML=bars(q,st.np);cap='<b>3. Score every candidate exactly.</b> IVF-Flat keeps the full float32 vectors in the cells: '+nc+' &times; 1,024 multiply-adds, reading '+fmt(nc*4096)+' bytes.'}
      else{fig.appendChild(heat(q));cap='<b>3. Build the lookup table once per query.</b> Split the claim into 16 pieces of 64 numbers; for each piece compute its dot product with all 256 centroids of that piece: a 16 &times; 256 table (262,144 multiply-adds, 16 KB). Blue: the centroid points the same way as the claim\'s piece; orange: the opposite way.'}}
    else if(step==='one'){const j=firstMissing;if(st.m==='flat'){fig.innerHTML=bars(q,st.np);cap='<b>4. One candidate.</b> &ldquo;'+esc(P.titles[j]||'abstract')+'&rdquo;: exact similarity '+q.ex[j].toFixed(4)+' from 1,024 multiply-adds over its 4,096 stored bytes.'}
      else{fig.appendChild(heat(q,j));const c=[];let sum=q.cs[assign[j]];for(let m=0;m<M;m++){c.push(codes[j*M+m]);}
        const d=document.createElement('div');d.className='code';d.innerHTML='code: '+c.map(x=>'<span class="on">'+x+'</span>').join('');fig.appendChild(d);
        cap='<b>4. Score one candidate from its 16 bytes.</b> &ldquo;'+esc(P.titles[j]||'abstract')+'&rdquo; is stored as the 16 byte values above (outlined in the table). Its score is the claim&middot;centroid term ('+q.cs[assign[j]].toFixed(4)+') plus 16 table look-ups: '+R.ap.get(j).toFixed(4)+', against an exact similarity of '+q.ex[j].toFixed(4)+'. No multiplication per candidate: 16 additions.'}}
    else if(step==='rank'){if(st.m==='flat'){fig.innerHTML=bars(q,st.np);cap='<b>5. Rank.</b> Exact scores give the exact order inside the probed cells.'}
      else{fig.innerHTML=scatter(R);const r2=R.cand.length;cap='<b>5. Rank by PQ score.</b> Every dot is a candidate: exact similarity across, PQ score up. If PQ were perfect they would lie on a rising line; the spread is the quantization error. Green: exact top 10 that made the cut; red: exact top 10 that PQ ranked too low; gold: PQ\'s picks that are not in the exact top 10.'+(st.m==='rs'?' With rescoring, the 100 best by PQ score are re-scored with their float32 vectors (100 &times; 1,024 multiply-adds) and re-sorted.':'')}}
    else{fig.innerHTML='';cap='<b>6. Result.</b> '+R.found+' of the exact top 10 found with '+(st.m==='flat'?'IVF-Flat':st.m==='pq'?'IVF-PQ':'IVF-PQ and rescoring')+' at nprobe '+st.np+'. Switch the method to run the same claim through the others.'}
    if(i>=2){if(st.m==='flat'){mac+=nc*D;bytes+=nc*D*4}else{mac+=M*KS*(D/M);bytes+=nc*M+M*KS*4;if(st.m==='rs'&&i>=4){mac+=Math.min(100,nc)*D;bytes+=Math.min(100,nc)*D*4}}}
    $('vix-p-cap').innerHTML=cap;
    $('vix-p-stats').innerHTML=RD.stat('Candidates',i>=1?nc:'...',i>=1?st.np+' of 72 cells':'')+RD.stat('Multiply-adds',fmt(mac),'exact search: 5.31 M')+RD.stat('Bytes read',fmt(bytes),'exact search: 21.2 M')+RD.stat('Exact top 10 found',i>=5?R.found+' / 10':'...','');
    const gt=q.gt;$('vix-p-res').innerHTML=i>=5?'<table class="res"><tr><th>#</th><th>returned</th><th class="num">exact sim.</th></tr>'+R.top.map((j,k)=>'<tr><td>'+(k+1)+'</td><td><span class="'+(gt.includes(j)?'ok':'no')+'">'+(gt.includes(j)?'&#10003;':'&#215;')+'</span> '+esc(P.titles[j]||'(abstract)')+(q.rel.includes(j)?' <span class="tag">labelled relevant</span>':'')+'</td><td class="num">'+q.ex[j].toFixed(3)+'</td></tr>').join('')+'</table>':''}
  const A=RD.anim({card:'vix-p-card',ctl:'vix-p-ctl',n:STEPS.length,draw,ms:1800,label:'Step'});
  function all(){let h='<table><tr><th>Claim</th><th class="num">nprobe</th><th class="num">candidates</th><th class="num">IVF-Flat</th><th class="num">IVF-PQ</th><th class="num">+ rescore</th></tr>';
    Qs.forEach((q,qi)=>{[1,2,4,8].forEach(np=>{const a=run(qi,np,'flat'),b=run(qi,np,'pq'),c=run(qi,np,'rs');h+='<tr><td>'+(np===1?(qi+1)+'. '+esc(q.text.slice(0,48))+'...':'')+'</td><td class="num">'+np+'</td><td class="num">'+a.cand.length+'</td><td class="num">'+a.found+'</td><td class="num">'+b.found+'</td><td class="num">'+c.found+'</td></tr>'})});
    $('vix-p-all').innerHTML=h+'</table><p class="small mute">Exact top 10 found (of 10). Rescoring re-ranks the 100 best by PQ score with the float32 vectors; it cannot recover a neighbour whose cell was not probed.</p>'}
  RD.seg($('vix-p-np'),v=>{st.np=+v;A.redraw()});
  RD.seg($('vix-p-meth'),v=>{st.m=v;A.redraw()});
  $('vix-p-q').addEventListener('change',e=>{st.q=+e.target.value;A.go(0)});
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-vixpq']=[()=>A.redraw()];
  addEventListener('resize',()=>{if(!$('t-vixpq').hidden)A.redraw()});
  all();
})();
