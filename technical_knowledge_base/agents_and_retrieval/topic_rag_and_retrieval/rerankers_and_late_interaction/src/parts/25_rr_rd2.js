// ---- Reading tab (t-read), part 2: score histograms and reliability, abstention, LLM rerankers, sliding window, ColBERT, PLAID ----
(function(){
  const R=window.RR;if(!R)return;const $=id=>document.getElementById(id),esc=RRL.esc;
  const draws=[];const reg=f=>{draws.push(f);RD.onRender(f)};RD.onResize(()=>draws.forEach(f=>{try{f()}catch(e){window.__jsErr&&window.__jsErr(e.message)}}));
  const on=id=>$(id).querySelector('.on').dataset.m;
  // ---------- score distributions and reliability
  function hist(){const n=on('rr-hist-m'),H=R.hist[n],el=$('rr-hist-svg');const e=H.edges;const sr=H.rel.reduce((a,b)=>a+b,0),sn=H.non.reduce((a,b)=>a+b,0);
    const mid=i=>(e[i]+e[i+1])/2;
    const rel=H.rel.map((c,i)=>[mid(i),c/sr]),non=H.non.map((c,i)=>[mid(i),c/sn]);const ymax=Math.max(...rel.map(p=>p[1]),...non.map(p=>p[1]));
    RRL.chart(el,[{name:'unlabelled pairs',color:'var(--mute)',pts:non,dots:false,w:2},{name:'relevant pairs',color:'var(--good)',pts:rel,dots:false,w:2.4}],
      {x0:-14,x1:12,y0:0,y1:Math.ceil(ymax*20)/20,xticks:[-12,-8,-4,0,4,8],xfmt:v=>String(v),yticks:[0,0.1,0.2,0.3].filter(v=>v<=ymax+0.05),yfmt:v=>Math.round(v*100)+'%',xlabel:'score on the logit scale',ylabel:'share of pairs in each bin',h:220,
       hlines:[]});
    const C=R.calib[n].raw.filter(b=>b.n);
    $('rr-hist-txt').innerHTML='Medians: relevant <b>'+H.rel_median.toFixed(2)+'</b>, unlabelled <b>'+H.non_median.toFixed(2)+'</b>. Chance that a relevant pair outscores an unlabelled one: <b>'+H.pair_auroc.toFixed(3)+'</b>.'+
      '<div class="small" style="margin-top:6px">Reliability of sigmoid(score), per bin with at least one pair: observed share labelled relevant / what the sigmoid predicts:</div>'+
      '<div class="bars">'+C.map(b=>'<div class="row"><div class="nm">'+b.lo.toFixed(1)+' to '+b.hi.toFixed(1)+' ('+b.n+')</div><div class="track" style="position:relative"><div class="fill" style="width:'+(100*b.acc).toFixed(1)+'%;background:var(--good)"></div><div style="position:absolute;top:-2px;bottom:-2px;left:'+(100*b.conf).toFixed(1)+'%;border-left:2px solid var(--bad)"></div></div><div class="val">'+Math.round(100*b.acc)+'% vs '+Math.round(100*b.conf)+'%</div></div>').join('')+'</div>'+
      '<div class="small mute">Red tick: what the sigmoid predicts; green bar: the share labelled relevant.</div>'}
  reg(hist);RD.seg($('rr-hist-m'),hist);
  // ---------- abstention
  const AB=R.abstain;
  function abst(){RRL.bars($('rr-abst-bars'),[['qwen3-reranker-0.6b','Qwen3-Reranker'],['bge-reranker-v2-m3','bge-reranker'],['ce-minilm-l6','MiniLM CE'],['qwen3-cosine','Qwen3 cosine'],['bm25','BM25 score']].map(([k,nm])=>({name:nm,v:AB[k].auroc,txt:AB[k].auroc.toFixed(3),color:k.indexOf('re')>0||k==='ce-minilm-l6'?'var(--acc)':'var(--mute)'})),{min:0.5,max:1});
    const n=on('rr-abst-m'),sw=AB[n].sweep,i=Math.min(sw.length-1,+$('rr-abst-t').value),x=sw[i];$('rr-abst-tv').textContent=x.t.toFixed(1);
    $('rr-abst-out').innerHTML='<div class="grid">'+RD.stat('Answerable claims still answered',Math.round(100*x.kept_ans)+'%','of '+AB[n].n_ans+'; with the right abstract first: '+Math.round(100*x.kept_ans_correct)+'%')+RD.stat('"Nothing relevant" claims abstained',Math.round(100*x.abstain_none)+'%','of '+AB[n].n_none+' constructed')+'</div>'}
  $('rr-abst-t').max=AB['qwen3-reranker-0.6b'].sweep.length-1;
  reg(abst);RD.seg($('rr-abst-m'),abst);$('rr-abst-t').addEventListener('input',abst);
  // ---------- LLM rerankers table
  reg(()=>{const el=$('rr-llm-tab'),L=R.llm;if(!L){el.innerHTML='<span class="small mute">Runs pending.</span>';return}
    el.innerHTML='<div class="tw"><table><thead><tr><th>Reranker (BM25 candidates, '+L.n_claims+' claims)</th><th class="num">nDCG@10</th><th class="num">Model calls per claim</th><th class="num">Prompt tokens per claim</th><th class="num">Seconds per claim here</th></tr></thead><tbody>'+
      L.rows.map(r=>'<tr'+(r.hl?' style="background:var(--soft)"':'')+'><td>'+esc(r.name)+'</td><td class="num">'+r.ndcg10.toFixed(3)+'</td><td class="num">'+r.calls+'</td><td class="num">'+r.tokens+'</td><td class="num">'+r.secs+'</td></tr>').join('')+'</tbody></table></div>'});
  // ---------- listwise sliding window animation
  (function(){const L=R.llm;if(!L||!L.sw){$('rr-sw-cap').textContent='Runs pending.';return}
    const S=L.sw,steps=S.windows.length+1;
    function draw(st){const el=$('rr-sw-svg'),W=Math.max(270,Math.min(RD.width(el),760));const n=S.start.length,rh=17,top=18,Hh=top+n*rh+6;
      const order=st===0?S.start:S.windows[st-1].after;const win=st===0?null:S.windows[st-1];
      let s='';if(win){const y0=top+win.start*rh-2;s+='<rect x="2" y="'+y0+'" width="'+(W-4)+'" height="'+(win.size*rh+2)+'" fill="var(--acc2)" rx="4"/>';}
      order.forEach((d,i)=>{const y=top+i*rh;const r=S.rel.includes(d);
        s+=RD.t(6,y+12,String(i+1),{fs:10.5,fill:'var(--mute)'})+'<rect x="30" y="'+(y+3)+'" width="'+Math.max(10,(W-160)*(1-i/n))+'" height="11" rx="3" fill="'+(r?'var(--good)':'var(--dim)')+'"/>'+RD.t(W-124,y+12,esc((S.titles[d]||d).slice(0,20)),{fs:10,fill:r?'var(--good)':'var(--mute)'})});
      s+=RD.t(6,12,st===0?'BM25 order (input)':'after call '+st+' of '+S.windows.length,{fs:11,fill:'var(--ink)'});
      el.innerHTML=RD.svg(W,Hh,s,'sliding window');
      $('rr-sw-cap').textContent=st===0?'Claim '+S.qid+': "'+S.claim+'". BM25 put the relevant abstract at rank '+(1+S.start.findIndex(d=>S.rel.includes(d)))+'.':
        'Window over ranks '+(win.start+1)+' to '+(win.start+win.size)+': the model returned "'+win.text.slice(0,90)+(win.text.length>90?'...':'')+'"'+(win.missing?' (it skipped '+win.missing+' identifiers; appended in input order)':'')+'. The relevant abstract is now at rank '+(1+order.findIndex(d=>S.rel.includes(d)))+'.'}
    const a=RD.anim({card:'rr-sw-card',ctl:'rr-sw-ctl',n:steps,ms:2400,draw});RD.onResize(()=>a.redraw())})();
  // ---------- ColBERT as first stage or reranker
  function cbc(){const el=$('rr-cb-svg'),C=R.colbert_rerank;const col={bm25:'var(--c2)',dense:'var(--c1)',hybrid:'var(--c3)'};
    const ser=Object.keys(C).map(fs=>({name:'rerank '+RRL.FS[fs],color:col[fs],pts:[[1,C[fs].first_ndcg10,RRL.FS[fs]+' alone']].concat(Object.entries(C[fs].sweep).map(([k,v])=>[+k,v.ndcg10,'MaxSim over '+RRL.FS[fs]+' top '+k+': '+v.ndcg10.toFixed(3)]))}));
    RRL.chart(el,ser,{xlog:true,x0:1,x1:100,y0:0.66,y1:0.78,xticks:[1,10,20,30,50,100],xfmt:v=>v===1?'alone':String(v),yticks:[0.68,0.7,0.72,0.74,0.76,0.78],yfmt:v=>v.toFixed(2),xlabel:'K (candidates rescored with MaxSim)',ylabel:'nDCG@10',h:240,
      hlines:[[R.colbert.exhaustive.all32['ndcg@10'],'exhaustive MaxSim '+R.colbert.exhaustive.all32['ndcg@10'].toFixed(3),'var(--c4)']]});
    el.insertAdjacentHTML('beforeend','<div class="rr-leg">'+ser.map(s=>'<span><i style="background:'+s.color+'"></i>'+s.name+'</span>').join('')+'</div>')}
  reg(cbc);
  // ---------- PLAID grid
  function plg(){const nb=on('rr-pl-nb'),G=R.plaid[nb];const pr=[...new Set(G.map(g=>g.probe))],fu=[...new Set(G.map(g=>g.full))];
    const cell=(p,f)=>G.find(g=>g.probe===p&&g.full===f);
    let h='<div class="hmwrap"><table class="hm"><thead><tr><th class="mh" style="width:6.5em">probes \\ full scores</th>'+fu.map(f=>'<th>'+f+'</th>').join('')+'</tr></thead><tbody>';
    pr.forEach(p=>{h+='<tr><th>'+p+'</th>'+fu.map(f=>{const c=cell(p,f);const a=Math.max(0,Math.min(1,(c.top10_overlap-0.6)/0.4));
      return '<td class="v" style="background:color-mix(in srgb,var(--c3) '+Math.round(15+60*a)+'%,var(--bg))">'+c.ndcg10.toFixed(3)+'<br><span class="small">'+Math.round(100*c.top10_overlap)+'%</span></td>'}).join('')+'</tr>'});
    $('rr-pl-svg').innerHTML=h+'</tbody></table></div>';
    $('rr-pl-txt').innerHTML='Exhaustive MaxSim on the uncompressed vectors: nDCG@10 '+R.colbert.exhaustive.setup_run['ndcg@10'].toFixed(3)+'. Darker = more of the exact top 10 recovered.'}
  reg(plg);RD.seg($('rr-pl-nb'),plg);
})();
