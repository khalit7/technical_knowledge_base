// ---- Reading tab, sections 2 and 3: predict widgets, Cosmopedia anatomy, openings bars, Nemotron-CC step animation, WRAP tables ----
(function(){
  const D=window.SY||{},esc=RD.esc;
  // shared text helpers (also used by the Rephrasing lab)
  const WRE=/[A-Za-z0-9]+(?:'[a-z]+)?/g;
  window.SYT={
    words:t=>(String(t).match(WRE)||[]).map(w=>w.toLowerCase()),
    // HTML of `after` with words inside a 4-word sequence also found in `before` wrapped in <span class=kept>; returns {html, share}
    kept(before,after,n){n=n||4;const bw=SYT.words(before),set=new Set();for(let i=0;i+n<=bw.length;i++)set.add(bw.slice(i,i+n).join(' '));
      const toks=[];let m;WRE.lastIndex=0;while((m=WRE.exec(after)))toks.push({s:m.index,e:m.index+m[0].length,w:m[0].toLowerCase()});
      const cov=new Array(toks.length).fill(false);
      for(let i=0;i+n<=toks.length;i++){const g=toks.slice(i,i+n).map(x=>x.w).join(' ');if(set.has(g))for(let k=i;k<i+n;k++)cov[k]=true}
      let h='',p=0;toks.forEach((t,i)=>{h+=esc(after.slice(p,t.s));h+=cov[i]?'<span class="kept">'+esc(after.slice(t.s,t.e))+'</span>':esc(after.slice(t.s,t.e));p=t.e});h+=esc(after.slice(p));
      const k=cov.filter(Boolean).length;return {html:h,share:toks.length?k/toks.length:0,n:toks.length}}
  };
  // predict-then-reveal blocks
  document.querySelectorAll('#t-read .pr').forEach(pr=>{const ans=pr.querySelector('.ans');pr.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{
    pr.querySelectorAll('.opts button').forEach(x=>{x.classList.remove('right','wrong');if(x.dataset.ok)x.classList.add('right')});if(!b.dataset.ok)b.classList.add('wrong');ans.hidden=false}))});

  // Cosmopedia anatomy
  (function(){const C=D.cosmo&&D.cosmo.examples;const seg=document.getElementById('sy-cz-seg');if(!C||!seg)return;
    const FLAG={0:['approximately 2.5% of global CO2 emissions'],1:['cotton candy, glass, etc.']};
    const NAME=['Web seed to textbook','Product listing to textbook','Story','Khan Academy unit'];
    seg.innerHTML=C.map((c,i)=>'<button data-m="'+i+'"'+(i?'':' class="on"')+'>'+NAME[i]+'</button>').join('');
    function show(i){const c=C[i];let p;
      if(c.seed){const parts=c.instructions.split('[EXTRACT]');p='<span class="ins">'+esc(parts[0])+'</span><span class="seed">'+esc(c.seed)+'</span><span class="ins">'+esc(parts[1]||'')+'</span>'}
      else p='<span class="ins">'+esc(c.instructions)+'</span>';
      let o=esc(c.text.trim());(FLAG[i]||[]).forEach(f=>{o=o.split(esc(f)).join('<span class="bad">'+esc(f)+'</span>')});
      document.getElementById('sy-cz-p').innerHTML=p;document.getElementById('sy-cz-o').innerHTML=o+' [...]';
      document.getElementById('sy-cz-note').innerHTML='Cosmopedia subset '+esc(c.set.replace('cosmo_',''))+', row '+c.row+' of the seeded 1,000-row sample; format '+esc(c.format)+', audience '+esc(c.audience)+(c.text_tokens?', '+c.text_tokens+' tokens of output':'')+'. '+esc(c.note)+'.'+(c.seed?'':' In this subset the seed is a question, a curriculum title or a snippet inside the instructions, not a separate web extract.')}
    RD.seg(seg,m=>show(+m));show(0)})();

  // openings bars
  (function(){const el=document.getElementById('sy-op');if(!el||!D.sets)return;
    const keys=['tinystories','cosmo_khan','cosmo_wikihow','cosmo_stories','megamath_qa','cosmo_web_v2','nemo_lq_wiki','wikipedia','fineweb'];
    const S={};D.sets.forEach(s=>S[s.key]=s);
    el.innerHTML=keys.filter(k=>S[k]).map(k=>{const s=S[k],o=s.openings_top3[0],v=o[1]/s.docs;
      return '<div title="'+esc(s.label)+'"><span class="nm">'+esc(s.label)+'<br><span class="small mute">"'+esc(o[0])+' ..."</span></span><span class="tr"><span style="width:'+(100*v).toFixed(1)+'%;background:'+(s.group==='real'?'var(--c3)':s.group==='rephrased'?'var(--c1)':'var(--c2)')+'"></span></span><span class="v">'+(100*v).toFixed(1)+'%</span></div>'}).join('')+
      '<div class="leg"><span style="--sw:var(--c2)">generated from seeds</span><span style="--sw:var(--c1)">rephrased or transformed</span><span style="--sw:var(--c3)">real</span></div>'})();

  // WRAP Tables 1 and 2
  (function(){const el=document.getElementById('sy-wrap'),seg=document.getElementById('sy-wrap-seg');if(!el)return;
    const R=['Half C4 (85B)','Full C4 (170B)','RefinedWeb 160B','RefinedWeb 320B','Pythia-Pile (300B)','TinyLlama (1T)','Synthetic (85B)','Synthetic + C4 (85B)'];
    const T={gen:[47.4,47.3,47.6,47.5,47.0,47.4,49.4,49.4],spec:[43.1,43.5,44.1,44.3,44.6,45.6,45.0,45.5]};
    function draw(m){const v=T[m],lo=Math.min(...v)-2,hi=Math.max(...v)+0.5;
      el.innerHTML=R.map((r,i)=>'<div'+(i>5?' class="hl"':'')+'><span class="nm">'+r+'</span><span class="tr"><span style="width:'+(100*(v[i]-lo)/(hi-lo)).toFixed(1)+'%;background:'+(i>5?'var(--c2)':'var(--c1)')+'"></span></span><span class="v">'+v[i].toFixed(1)+'</span></div>').join('')+
      '<p class="small mute">Bars start at '+lo.toFixed(1)+', not zero, so small gaps are visible; read the numbers. Source: '+(m==='gen'?'Table 1':'Table 2')+', arXiv 2401.16380.</p>'}
    RD.seg(seg,draw);draw('gen')})();

  // Nemotron-CC step animation on real pairs
  (function(){const P=D.pairs,seg=document.getElementById('sy-nm-seg');if(!P||!seg)return;
    const ORDER=['high_wrap','distill','extract_knowledge','knowledge_list','diverse_qa_pairs'];
    const NAME={high_wrap:'Wikipedia-style',distill:'Distill',extract_knowledge:'Extract knowledge',knowledge_list:'Knowledge list',diverse_qa_pairs:'Diverse QA'};
    const LIM={high_wrap:512,distill:2000,extract_knowledge:1400,knowledge_list:1000,diverse_qa_pairs:1000};
    const PROMPT={high_wrap:'"For the following paragraph give me a diverse paraphrase of the same in high quality English language as in sentences on Wikipedia. Begin your answer on a separate line with "Here is a paraphrased version:". Text: [DOCUMENT SEGMENT]" (Prompt 5)',
      distill:'"Your task is to read and paraphrase the provided text following these instructions: - Aim to create a condensed but accurate and informative version of the original text, not a simplistic summary. [...]" (Prompt 2, first lines)',
      extract_knowledge:'"[...] Do not add or alter details. Only restate what is already in the text. [...]" (Prompt 4, one instruction quoted)',
      knowledge_list:'The knowledge-list prompt is in Appendix H of the paper (not quoted here): it asks for the text\'s facts as a structured list.',
      diverse_qa_pairs:'"Task: Read the text, ask questions and answer them. Follow these instructions: 1. Ask diverse questions that require different cognitive skills or cover different aspects of the text. 2. Ask questions in various forms such as: [...]" (Prompt 1, first lines; it ends asking for up to 8 questions)'};
    const pairs=ORDER.map(k=>P.find(p=>p.kind===k)).filter(Boolean);let cur=0;
    seg.innerHTML=pairs.map((p,i)=>'<button data-m="'+i+'"'+(i?'':' class="on"')+'>'+NAME[p.kind]+'</button>').join('');
    const STEPS=['Crawled','Bucketed','Segmented','Prompted','Generated','Published'];
    const host=u=>{try{return new URL(u).hostname}catch(e){return u}};
    function draw(i){const p=pairs[cur],k=p.kind,b=document.getElementById('sy-nm-b'),a=document.getElementById('sy-nm-a'),al=document.getElementById('sy-nm-al');
      document.getElementById('sy-nm-steps').innerHTML=STEPS.map((s,j)=>'<span'+(j===i?' class="on"':'')+'>'+(j+1)+'. '+s+'</span>').join('');
      b.textContent=p.before;const K=SYT.kept(p.before,p.after);
      const cap=[['The page as crawled','A page from '+esc(host(p.url))+' captured in Common Crawl CC-MAIN-2024-30 (WARC record '+esc(p.warc_record_id.slice(0,8))+'...), its text extracted with jusText: '+p.before_words+' words. This is the "before".'],
        ['Sorted into a quality bucket','Nemotron-CC\'s classifier ensemble scored the page and put it in the <b>high-quality</b> bucket, so it gets the four transformation prompts as well as Wikipedia-style rephrasing (low-quality pages get only the rephrasing).'],
        ['Cut into segments','The text is cut at line boundaries into segments of at most <b>'+LIM[k]+' tokens</b> including the prompt (footnote 11), because longer inputs came back over-simplified. Lines longer than the limit are dropped.'],
        ['Wrapped in the '+NAME[k]+' prompt',esc(PROMPT[k])],
        ['Generated','Mistral NeMo 12B Instruct, FP8, temperature 0.5, top-p 0.9, run with TensorRT-LLM. The raw output (with any "Here is a paraphrased version:" preamble) was not published.'],
        ['Post-processed and published','Preambles and Markdown stripped, outputs under 50 tokens dropped'+(k==='diverse_qa_pairs'?', question-answer pairs shuffled and some appended after the source segment':', segments joined back per document')+'. The published row: '+p.after_words+' words. Green words sit in a four-word sequence copied from the page.']][i];
      document.getElementById('sy-nm-cap').innerHTML='<div class="t">'+cap[0]+'</div><p>'+cap[1]+'</p>';
      if(i<3){a.innerHTML='<span class="mute">(not yet generated)</span>';al.textContent='After'}
      else if(i===3){a.innerHTML='<span class="ins">'+esc(PROMPT[k])+'</span>\n\n<span class="seed">[segment of the page above]</span>';al.textContent='The prompt'}
      else if(i===4){a.textContent=p.after;al.textContent='After: the model output (as published)'}
      else{a.innerHTML=K.html;al.textContent='After: the published row'}
      document.getElementById('sy-nm-cnt').innerHTML=RD.stat('Words before',p.before_words,'jusText extract')+RD.stat('Words after',i>=4?p.after_words:'...','published row')+RD.stat('After / before',i>=4?(p.after_words/p.before_words).toFixed(2):'...','length ratio')+RD.stat('Copied phrasing',i>=5?(100*K.share).toFixed(0)+'%':'...','of output words in 4-grams from the page')}
    const A=RD.anim({card:'sy-nm-card',ctl:'sy-nm-ctl',n:6,draw,ms:2600,label:'Step'});
    RD.seg(seg,m=>{cur=+m;A.go(0)})})();
})();
