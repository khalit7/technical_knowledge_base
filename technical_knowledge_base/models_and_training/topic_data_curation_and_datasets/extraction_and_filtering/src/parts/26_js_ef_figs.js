// ---- Reading tab: static figures drawn at the measured width: the hero funnel, trafilatura's cascade, the fastText identifier ----
(function(){
  const H=EFH,E=window.EF,$=H.$;
  const esc=H.esc,T=(x,y,s,o)=>RD.t(x,y,s,o);

  // hero: run0's funnel, documents surviving each stage, bars to scale, the largest drop reason per stage
  (function(){const el=$('ef-hero');if(!el||!E.pipe||!E.pipe.run0)return;const R=E.pipe.run0,W0=(E.wb&&E.wb.reasons)||{},U=(E.pipe.url&&E.pipe.url.reasons)||{};
    const RN={dup_line_frac:'duplicate lines',gopher_below_alpha_threshold:'too few words with a letter',too_few_sentences:'fewer than 5 sentences',line_punct_ratio:'few lines end in punctuation',domain:'blocklisted domain'};
    const fam={rep:['dup_line_frac','dup_line_char_frac','top_2_gram','top_3_gram','top_4_gram','duplicated_5_n_grams','duplicated_6_n_grams','duplicated_7_n_grams','duplicated_8_n_grams','duplicated_9_n_grams','duplicated_10_n_grams'],
      qual:['gopher_short_doc','gopher_below_alpha_threshold','gopher_too_many_end_ellipsis','gopher_too_many_bullets','gopher_enough_stop_words','gopher_above_avg_threshold','gopher_too_many_ellipsis'],
      c4:['too_few_sentences','lorem_ipsum','curly_bracket'],fw:['line_punct_ratio','short_line_ratio','char_dup_ratio']};
    const top=(ks,src)=>{let b=null;ks.forEach(k=>{if(src[k]!=null&&(!b||src[k]>src[b]))b=k});return b?(RN[b]||b.replace(/_/g,' '))+' ('+H.n(src[b])+')':''};
    const S=[
      {nm:'Responses in one WARC file',v:R.responses,why:''},
      {nm:'HTML pages',sh:'HTML',v:R.html_read,why:'not HTML'},
      {nm:'URL filter (section 10)',sh:'URL filter',v:R.url_kept,why:top(Object.keys(U),U)},
      {nm:'Text extracted (sections 1 to 5)',sh:'Extraction',v:R.extracted,why:'no text returned'},
      {nm:'English above 0.65 (section 6)',sh:'Language ID',v:R.english,why:'not English',hl:1},
      {nm:'Gopher repetition (section 7)',sh:'Gopher repetition',v:R.gopher_rep,why:top(fam.rep,W0)},
      {nm:'Gopher quality',sh:'Gopher quality',v:R.gopher_qual,why:top(fam.qual,W0)},
      {nm:'C4 rules',sh:'C4',v:R.c4,why:top(fam.c4,W0)},
      {nm:'FineWeb rules: kept',sh:'FineWeb rules',v:R.fineweb,why:top(fam.fw,W0),hl:2},
      {nm:'Near-duplicate removal (next page)',sh:'Dedup',v:R.minhash,why:'near-duplicates',next:1}];
    function draw(){const W=RD.width(el),narrow=W<560,rh=narrow?44:30,mx=R.responses,lab=narrow?0:215,rc=narrow?0:Math.min(260,W*0.3),bx=narrow?2:lab+8,bw=W-bx-rc-52;
      let g='';S.forEach((s,i)=>{const y=i*rh+4,w=Math.max(2,bw*s.v/mx),prev=i?S[i-1].v:null,d=prev!=null?prev-s.v:null;
        const by=narrow?y+17:y+4,bh=narrow?14:16;
        const fill=s.next?'none':s.hl===2?'var(--good)':s.hl===1?'var(--acc)':'var(--c1)';
        g+=T(narrow?2:0,narrow?y+11:y+16,esc(s.nm),{fs:narrow?11.5:12,w:s.hl?600:null});
        g+='<rect x="'+bx+'" y="'+by+'" width="'+w.toFixed(1)+'" height="'+bh+'" rx="3" fill="'+fill+'"'+(s.next?' stroke="var(--mute)" stroke-dasharray="4 3"':(s.hl?'':' opacity=".55"'))+'/>';
        g+=T(bx+w+5,by+bh-3,H.n(s.v),{fs:11.5,w:600});
        if(d)g+=T(W-2,narrow?y+11:y+16,'-'+H.n(d)+(s.why&&!narrow?' '+esc(s.why):''),{a:'end',fs:11,fill:'var(--bad)'})});
      const h=S.length*rh+8;
      el.innerHTML=RD.svg(W,h,g,'Documents surviving each stage of run0, from 20,991 responses to 2,692 kept');
      if(narrow){/* reasons go in a list under the figure at phone width */
        el.insertAdjacentHTML('beforeend','<p class="ef-note">Largest reason per stage: '+S.filter((s,i)=>i&&s.why).map(s=>esc(s.sh)+', '+esc(s.why)).join('; ')+'.</p>')}}
    draw();RD.onRender(draw);RD.onResize(draw);
  })();

  // trafilatura's cascade with the measured share of pages whose text each branch produced
  (function(){const el=$('ef-casc'),t=E.traf;if(!el||!t)return;const P=t.paths,N=Object.values(P).reduce((a,b)=>a+b,0);
    const rows=[['Clean the tree','delete nav, footer, form, figure, math, script ...',null,null],
      ['Its own XPath rules find the body','class "entry-content", then &lt;article&gt;, then "main"','own','var(--c1)'],
      ['readability-lxml wins','when it finds more than twice as much text','readability','var(--c4)'],
      ['jusText rescues a short result','when the result is under 250 characters','justext','var(--c5)'],
      ['"Baseline" last resort','the &lt;article&gt;, its paragraphs, or all body text','baseline','var(--c2)'],
      ['No text at all','','none','var(--dim)']];
    function draw(){const W=RD.width(el),rh=50,tx=30,bw=Math.max(60,W-tx-62);let g='';
      g+='<line x1="12" x2="12" y1="12" y2="'+((rows.length-1)*rh+12)+'" stroke="var(--line)" stroke-width="2"/>';
      rows.forEach((r,i)=>{const y=i*rh+4;
        g+='<circle cx="12" cy="'+(y+8)+'" r="9" fill="var(--bg)" stroke="var(--mute)"/>'+T(12,y+12,String(i+1),{a:'middle',fs:11});
        g+=T(tx,y+12,r[0],{fs:12,w:600})+(r[1]?T(tx,y+26,r[1],{fs:11,fill:'var(--mute)'}):'');
        if(r[2]){const v=P[r[2]]||0,w=Math.max(2,bw*v/N),by=r[1]?y+31:y+18;
          g+='<rect x="'+tx+'" y="'+by+'" width="'+w.toFixed(1)+'" height="11" rx="2" fill="'+r[3]+'"/>'+T(tx+w+5,by+10,H.p(v,N),{fs:11,w:600})}});
      el.innerHTML=RD.svg(W,rows.length*rh+4,g,'trafilatura cascade with the share of pages whose text each branch produced')}
    draw();RD.onRender(draw);RD.onResize(draw);
    const x=t.own_by_body_xpath||{};
    $('ef-path-note').innerHTML='Bars: share of the '+H.n(N)+' pages whose final text came from each branch (trafilatura 1.11.0, favor_precision=True, deduplicate=False, no timeout) <span class="ef-lbl meas">measured</span>: its own rules 58.6%, the baseline 27.6%, readability and jusText together 11.1%.';
    const n2=$('ef-path-note2');if(n2)n2.innerHTML='Within "its own rules", the first BODY_XPATH expression (class names such as "entry-content") found the body on '+H.n(x['0'])+' pages, the first &lt;article&gt; on '+H.n(x['1'])+', the later class lists on '+H.n((x['2']||0)+(x['3']||0))+', a "main" element on '+H.n(x['4'])+', and none matched on '+H.n(x['None'])+' (trafilatura then scavenges loose paragraphs, recover_wild_text, which it tried on '+H.n(t.wild_text_recovery)+' pages in all) <span class="ef-lbl meas">measured</span>.';
  })();

  // fastText language identification: one word's features, hashing, averaging, softmax
  (function(){const el=$('ef-ft');if(!el)return;
    const feats=[['the','word'],['&lt;t','2'],['th','2'],['he','2'],['e&gt;','2'],['&lt;th','3'],['the','3'],['he&gt;','3'],['&lt;the','4'],['the&gt;','4']];
    function draw(){const W=RD.width(el);let g='',y=4;const bw=W-4;
      const box=(h,fill)=>{const s='<rect x="2" y="'+y+'" width="'+bw+'" height="'+h+'" rx="6" fill="'+(fill||'var(--soft)')+'" stroke="var(--line)"/>';return s};
      const arrow=()=>{g+='<path d="M'+(W/2)+' '+(y+2)+' v10 m-5 -5 l5 5 l5 -5" fill="none" stroke="var(--mute)" stroke-width="1.5"/>';y+=16};
      g+=box(34)+T(12,y+15,'Document text, newlines replaced by spaces',{fs:12,w:600})+T(12,y+29,'"... the herbivore eats ...": take the word "the"',{fs:11,fill:'var(--mute)'});y+=34;arrow();
      // feature chips, wrapped
      const cw=Math.max(40,Math.min(58,(bw-20)/5-6)),per=Math.max(1,Math.floor((bw-16)/(cw+6))),nr=Math.ceil(feats.length/per),bh=26+nr*30;
      g+=box(bh)+T(12,y+15,'"&lt;the&gt;": the word and its 2- to 4-grams',{fs:12,w:600});
      feats.forEach((f,i)=>{const r=Math.floor(i/per),c=i%per,x=12+c*(cw+6),yy=y+22+r*30;
        g+='<rect x="'+x+'" y="'+yy+'" width="'+cw+'" height="24" rx="4" fill="'+(f[1]==='word'?'var(--acc2)':'var(--bg)')+'" stroke="'+(f[1]==='word'?'var(--acc)':'var(--line)')+'"/>'+T(x+cw/2,yy+16,f[0],{a:'middle',fs:11.5})});
      y+=bh;arrow();
      g+=box(34)+T(12,y+15,'Hash each feature to one of 2,000,000 rows',{fs:12,w:600})+T(12,y+29,'each row is a learned vector of 16 numbers',{fs:11,fill:'var(--mute)'});y+=34;arrow();
      g+=box(34,'var(--acc2)')+T(12,y+15,'Average every feature of every word',{fs:12,w:600})+T(12,y+29,'one 16-number vector for the document; order is lost',{fs:11,fill:'var(--mute)'});y+=34;arrow();
      g+=box(34)+T(12,y+15,'Linear layer and softmax over 176 labels',{fs:12,w:600})+T(12,y+29,'P(en), P(de), P(fr) ... sum to 1',{fs:11,fill:'var(--mute)'});y+=34;arrow();
      g+=box(26,'var(--open2)')+T(12,y+17,'Keep as English if P(en) is above the threshold',{fs:12,w:600});y+=28;
      el.innerHTML=RD.svg(W,y+2,g,'fastText language identification: features, hashing, averaging, softmax')}
    draw();RD.onRender(draw);RD.onResize(draw);
  })();
})();
