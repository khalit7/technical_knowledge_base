// ---- Reading tab, part 1: predictions, chunking (tables, the section cut by fixed windows and the recursive splitter, shared with Fig. 2; small-to-big bars, mixed index)
(function(){
  const $=id=>document.getElementById(id),D=RP.D,E=RP.esc,f3=RP.f3,pct=RP.pct;
  // predict-then-reveal
  document.querySelectorAll('#t-read .prd').forEach(p=>{const ans=+p.dataset.ans;const bs=[...p.querySelectorAll('.opts button')];
    bs.forEach((b,i)=>b.addEventListener('click',()=>{bs.forEach((x,j)=>{x.classList.toggle('right',j===ans);x.classList.toggle('wrong',j===i&&i!==ans)});
      const a=p.querySelector('.ans');a.hidden=false;let v=a.querySelector('.verdict');if(!v){a.insertAdjacentHTML('afterbegin','<span class="verdict"></span>');v=a.querySelector('.verdict')}v.textContent=i===ans?'Right.':'Not quite.'}))});
  // 1.1 tokenizer and truncation tables
  const CI=D.chunk_internals||{};
  if(CI.tokenizers)$('rp-tok-rows').innerHTML=Object.entries(CI.tokenizers).map(([k,v])=>'<tr><td>'+E(k)+'</td><td class="num">'+RP.fmt(v.tokens)+'</td><td class="num">'+v.chars_per_token.toFixed(2)+'</td><td class="num">'+v.tokens_per_word.toFixed(2)+'</td></tr>').join('');
  const TN={'lc-rec-char4000':'library default: 4,000 characters, 200 overlap','lc-rec-char1000':'tutorial setting: 1,000 characters, 200 overlap','lc-rec-tok256':'256 Qwen3 tokens, 32 overlap'};
  if(CI.truncation)$('rp-trunc-rows').innerHTML=Object.keys(TN).map(k=>{const v=CI.truncation[k];const m=v['MiniLM-L6 (256)'],b=v['bge-small (512)'];
    return '<tr><td>'+TN[k]+'</td><td class="num">'+m.median_tokens+'</td><td class="num">'+pct(m.share_over)+'</td><td class="num">'+pct(m.share_of_tokens_seen)+'</td><td class="num">'+pct(b.share_over)+'</td><td class="num">'+pct(b.share_of_tokens_seen)+'</td></tr>'}).join('');
  // 1.2 animation: one section cut by fixed windows, then by the recursive splitter
  (function(){
    const P=RP.D.wb[1],full=RP.Doc(P);
    // the section holding the most evidence spans
    const secs={};full.paras.forEach(([s,e,sec])=>{(secs[sec]=secs[sec]||[]).push([s,e])});
    let best=null,bn=-1;for(const k in secs){const a=secs[k][0][0],b=secs[k][secs[k].length-1][1];const n=full.qs.reduce((t,q)=>t+q.ev.filter(([x,y])=>x>=a&&y<=b).length,0);
      const len=full.ntok(a,b);if(n>bn&&len>300&&len<1600){bn=n;best=[k,a,b]}}
    if(!best){const k=Object.keys(secs)[1];best=[k,secs[k][0][0],secs[k][secs[k].length-1][1]]}
    const [secName,A,B]=best;
    const i0=RP.bisectLeft(full.starts,A),i1=RP.bisectLeft(full.starts,B);
    const sub={id:P.id,title:P.title,text:full.text.slice(A,B),ts:[],te:[],paras:full.paras.filter(p=>p[0]>=A&&p[1]<=B).map(p=>[p[0]-A,p[1]-A,p[2]]),qs:[]};
    let pv=0;for(let i=i0;i<i1;i++){sub.ts.push(full.starts[i]-A-pv);pv=full.starts[i]-A}pv=0;for(let i=i0;i<i1;i++){sub.te.push(Math.min(full.ends[i],B)-A-pv);pv=Math.min(full.ends[i],B)-A}
    const doc=RP.Doc(sub);
    const evs=[],seen={};full.qs.forEach(q=>q.ev.forEach(([x,y])=>{if(x>=A&&y<=B&&!seen[x+':'+y]){seen[x+':'+y]=1;evs.push([x-A,y-A])}})); // each evidence paragraph once (several questions share one)
    const SIZE=128,OVER=16;
    const cut={fixed:RP.fixed(doc,SIZE,OVER),recursive:RP.recursive(doc,SIZE,OVER,["\n\n","\n",". "," "])};
    // shared with Fig. 2 (28b_sc_chunk.js), which draws the same section and cuts in 3D
    RP.sec={doc,evs,cut,secName,SIZE,OVER,paper:P.id};
    // the same cuts on the real text: a static view of one mode (the stage's step or the reader's switch picks it)
    function show(m){const all=cut[m];
      const cuts=new Set([0,doc.text.length]);all.forEach(([a,b])=>{cuts.add(a);cuts.add(b)});evs.forEach(([a,b])=>{cuts.add(a);cuts.add(b)});
      const pts=[...cuts].sort((a,b)=>a-b);let h='';const ends=new Set(all.map(x=>x[1]));
      for(let k=0;k<pts.length-1;k++){const a=pts[k],b=pts[k+1];const inn=[];all.forEach(([x,y],j)=>{if(x<=a&&b<=y)inn.push(j)});
        const cls=[];if(inn.length>1)cls.push('ov');else if(inn.length===1)cls.push('c'+(inn[0]%2));
        if(evs.some(([x,y])=>x<=a&&b<=y))cls.push('ev');
        h+='<span class="'+cls.join(' ')+'">'+E(doc.text.slice(a,b))+'</span>';if(ends.has(b)&&b<doc.text.length)h+='<span class="cut"></span>'}
      $('rp-an-split-doc').innerHTML=h;
      const intactN=evs.filter(ev=>all.some(([x,y])=>x<=ev[0]&&ev[1]<=y)).length;
      const midPara=all.filter(([x,y])=>!doc.paras.some(p=>Math.abs(p[1]-y)<3||y>=doc.text.length-1)).length;
      $('rp-an-split-ctr').innerHTML='<span>section <b>'+E(secName)+'</b> ('+doc.starts.length+' tokens)</span><span>'+(m==='fixed'?'fixed windows':'recursive splitter')+': <b>'+all.length+'</b> chunks</span><span>ending inside a paragraph <b>'+midPara+'</b></span><span>evidence paragraphs intact <b>'+intactN+' / '+evs.length+'</b></span>';
      $('rp-an-split-m').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x.dataset.m===m))}
    RP.secShow=show;
    RD.seg($('rp-an-split-m'),show);show('fixed');
  })();
  // 1.5 small to big
  function pcChart(){const el=$('rp-pc-chart');const S=(D.parent_child||{}).strategies;if(!S)return;
    el.innerHTML=Object.keys(S).map(n=>{const v=S[n].budget['1024'],a=S[n].answer['1024'];
      const lab=n.replace(' (retrieve = return)',': retrieve and return the same unit').replace('sentence window: ','sentence window, ');
      return '<div style="margin:6px 0 2px;font-size:12.5px">'+E(lab)+'</div>'+RP.bars([{name:'evidence covered',v:v,color:'var(--c1)'},{name:'answer string',v:a,color:'var(--c3)'}],1)}).join('')}
  // 1.9 mixed index
  const MX=D.mixed||{};
  if(MX['uniform 128'])$('rp-mixed-rows').innerHTML=['uniform 128','uniform 512','mixed (half 128, half 512)'].map(k=>{const v=MX[k];
    return '<tr'+(k.startsWith('mixed')?' class="hl"':'')+'><td>'+k+'</td><td class="num">'+f3(v.all['1024'])+'</td><td class="num">'+f3(v.recall['group B (512 in mixed)']['1024'])+'</td><td class="num">'+f3(v.recall['group A (128 in mixed)']['1024'])+'</td><td class="num">'+pct(v.long_chunk_share_of_index,0)+' / '+pct(v.long_chunk_share_of_top10,0)+'</td></tr>'}).join('');
  RD.onRender(pcChart);RD.onResize(pcChart);
})();
