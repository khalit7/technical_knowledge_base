// ---- Reading: BM25 worked on the six questions, with k1 and b sliders; and the tf saturation curve ----
(function(){
  const D=window.SV&&SV.tiny;if(!D||!document.getElementById('bmCard'))return;
  const ql=D.query_lexemes.map(x=>x[0]),docs=D.docs,esc=RD.esc;
  const k1el=document.getElementById('bmK1'),bel=document.getElementById('bmB');
  function draw(){const k1=+k1el.value,b=+bel.value;document.getElementById('bmK1v').textContent=k1.toFixed(1);document.getElementById('bmBv').textContent=b.toFixed(2);
    const r=SV.bm25(docs.map(d=>d.lexemes),ql,k1,b);
    let h='<table class="mini"><tr><th>Lexeme</th><th>n (of '+r.N+')</th><th>idf</th></tr>'+ql.map(t=>'<tr><td class="key">'+esc(t)+'</td><td class="num">'+r.df[t]+'</td><td class="num">'+r.idf[t].toFixed(3)+'</td></tr>').join('')+'</table>';
    document.getElementById('bmIdf').innerHTML=h;
    const order=r.scores.map((s,j)=>[s,j]).sort((a,c)=>c[0]-a[0]||a[1]-c[1]);
    h='<table class="mini"><tr><th>Rank</th><th>Question</th><th>Length</th>'+ql.map(t=>'<th>'+esc(t)+'</th>').join('')+'<th>BM25</th></tr>';
    order.forEach(([s,j],k)=>{h+='<tr'+(k===0?' class="hl"':'')+'><td class="num">'+(k+1)+'</td><td style="white-space:normal;min-width:12em">'+esc(docs[j].text)+'</td><td class="num">'+r.dl[j]+'</td>'+
      r.parts[j].map(p=>'<td class="num">'+(p?p.toFixed(3):'.')+'</td>').join('')+'<td class="num"><b>'+s.toFixed(3)+'</b></td></tr>'});
    h+='</table><p class="small mute">Average length (avgdl) '+r.avg.toFixed(3)+' lexemes. Length counts lexemes. A dot means the lexeme is not in the question (contributes 0).</p>';
    document.getElementById('bmTab').innerHTML=h;
    // saturation: one term with idf 1 in a document of average length, tf 0..10
    const w=Math.min(560,RD.width(document.getElementById('bmSat'))),hh=170,pad=34;let g='';
    const ks=[0.5,1.2,2,k1];const xs=t=>pad+(w-pad-10)*t/10,ys=v=>hh-24-(hh-40)*v/4;
    for(let v=0;v<=4;v++)g+='<line x1="'+pad+'" x2="'+(w-10)+'" y1="'+ys(v)+'" y2="'+ys(v)+'" stroke="var(--line)"/>'+RD.t(pad-6,ys(v)+4,v,{a:'end',fs:10,fill:'var(--mute)'});
    for(let t=0;t<=10;t+=2)g+=RD.t(xs(t),hh-8,t,{a:'middle',fs:10,fill:'var(--mute)'});
    ks.forEach((k,ix)=>{let d='';for(let t=0;t<=10;t+=.25){const v=t+k>0?t*(k+1)/(t+k):0;d+=(t?'L':'M')+xs(t).toFixed(1)+' '+ys(v).toFixed(1)}
      g+='<path d="'+d+'" fill="none" stroke="'+(ix===3?'var(--c2)':'var(--dim)')+'" stroke-width="'+(ix===3?2.4:1.4)+'"/>'});
    g+='<path d="M'+xs(0)+' '+ys(0)+'L'+xs(4)+' '+ys(4)+'" stroke="var(--c1)" stroke-dasharray="4 3" fill="none"/>';
    document.getElementById('bmSat').innerHTML=RD.svg(w,hh,g,'Term score against term frequency');
    document.getElementById('bmSatCap').innerHTML='Score of one term (idf 1, average-length document) as it repeats 0 to 10 times. Orange: your k1 = '+k1.toFixed(1)+', limit '+(k1+1).toFixed(1)+'. Grey: k1 0.5, 1.2, 2. Dashed blue: plain term frequency, which never stops growing.'}
  k1el.addEventListener('input',draw);bel.addEventListener('input',draw);
  document.getElementById('bmReset').addEventListener('click',()=>{k1el.value=1.2;bel.value=.75;draw()});
  RD.onRender(draw);RD.onResize(draw);draw();
})();
// ---- Reading: reciprocal rank fusion of the BM25 ranking and the vector ranking on the same six questions ----
(function(){
  const D=window.SV&&SV.tiny;if(!D||!document.getElementById('rrfCard'))return;
  const ql=D.query_lexemes.map(x=>x[0]),docs=D.docs,esc=RD.esc,kel=document.getElementById('rrfK');
  function draw(){const k=+kel.value;document.getElementById('rrfKv').textContent=k;
    const r=SV.bm25(docs.map(d=>d.lexemes),ql,1.2,.75);
    const lex=r.scores.map((s,j)=>[s,j+1]).filter(x=>x[0]>0).sort((a,c)=>c[0]-a[0]||a[1]-c[1]).map(x=>x[1]);
    const vec=docs.map((d,j)=>[d.cos,j+1]).sort((a,c)=>c[0]-a[0]||a[1]-c[1]).map(x=>x[1]);
    const f=SV.rrf([lex,vec],k);
    const rk=(L,d)=>{const i=L.indexOf(d);return i<0?null:i+1};
    let h='<table class="mini"><tr><th>Fused rank</th><th>Question</th><th>BM25 rank</th><th>Vector rank (cosine)</th><th>RRF score</th></tr>';
    f.forEach(([d,s],i)=>{const a=rk(lex,d),b=rk(vec,d);h+='<tr'+(i===0?' class="hl"':'')+'><td class="num">'+(i+1)+'</td><td style="white-space:normal;min-width:12em">'+esc(docs[d-1].text)+'</td><td class="num">'+(a||'not matched')+'</td><td class="num">'+b+' ('+docs[d-1].cos.toFixed(3)+')</td><td class="num">'+
      (a?'1/('+k+'+'+a+')':'0')+' + 1/('+k+'+'+b+') = '+s.toFixed(5)+'</td></tr>'});
    document.getElementById('rrfTab').innerHTML=h+'</table>'}
  kel.addEventListener('input',draw);RD.onRender(draw);draw();
})();
