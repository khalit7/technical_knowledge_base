// ---- Post-training data lab: the example browser (section 2) ----
(function(){
  const P=window.PT,D=P.D,S=D.stats,F=D.filter,esc=P.esc,fmt=P.fmt,pct=P.pct;
  const NAMES={sft:'Tulu 3 SFT mixture',pref:'UltraFeedback binarized',rlvr:'Tulu 3 RLVR',cosmo:'Cosmopedia web_samples_v2'};
  const short=g=>g.replace('tulu_v3.9_','').replace('_decontaminated_50k','').replace('synthetic_finalresp_','').replace('_v5_regen_149960','').replace('_100k','');
  const FIELDS={sft:[['response_tok','last assistant turn'],['prompt_tok','first user turn'],['asst_tok','all assistant turns']],
    pref:[['chosen_tok','chosen answer'],['rejected_tok','rejected answer'],['prompt_tok','prompt']],
    rlvr:[['question_tok','the question alone'],['prompt_tok','the whole prompt, few-shot examples included']],
    cosmo:[['text_tok','generated document'],['seed_tok','seed web extract']]};
  const INTRO={
    sft:'<b>One row is a conversation</b>: user turns and the assistant turns to imitate. Tulu 3\'s mixture combines curated prompts with responses distilled from strong models; this sample has 1,000 rows from each of five subsets: PersonaHub maths (synthetic problems written from personas), Aya (multilingual, human-written), WildChat (real user conversations with GPT-4-era assistants), and two safety subsets (WildJailbreak, WildGuardMix) that pair adversarial or harmful requests with refusals and harmless look-alikes with helpful answers.',
    pref:'<b>One row is a prompt with a chosen and a rejected answer</b> and a judge score for each. UltraFeedback had four completions per prompt from a pool of models, each scored by GPT-4; the binarized version keeps the highest-scored completion as chosen and draws one of the other three at random as rejected (%CARD%). Scores run from 1 to 10.',
    rlvr:'<b>One row is a prompt and a label a program can check</b>: a number for GSM8K, a LaTeX answer for MATH, a constraint for instruction following (IF: "answer in all lowercase", "include the word X 27 times"). GSM8K and MATH prompts carry their own worked few-shot examples before the question; the label is the answer to the last question.',
    cosmo:'<b>One row is a synthetic document</b> written by Mixtral-8x7B-Instruct from a prompt that quotes a real web extract (the seed) and asks for a blog post, a textbook section or a WikiHow article for a given audience. This is pretraining data more than post-training data, kept here as the generator side of the story.'};
  const card=(k,v,d)=>'<div class="stat"><div class="k">'+k+'</div><div class="v">'+v+'</div><div class="d">'+(d||'')+'</div></div>';
  let ds='sft';
  function stats(){
    const s=S[ds],f=F[ds];let h='';
    const dup=s.dup_full||s.dup_prompt||s.dup_question||s.dup_text,da=dup.all,L=s.len.all;
    if(ds==='sft')h+=card('Rows',fmt(f.n),'5 subsets, 1,000 each')+card('Median tokens, prompt and response',fmt(L.prompt_tok['0.5'])+' / '+fmt(L.response_tok['0.5']),'90th percentile '+fmt(L.prompt_tok['0.9'])+' / '+fmt(L.response_tok['0.9']))+
      card('Multi-turn conversations',pct(1-(s.turns['1']||0)/f.n),fmt(f.n-(s.turns['1']||0))+' rows with 2 or more user turns')+
      card('Exact duplicate conversations',fmt(da.exact_dup_rows),'near-duplicate prompts: '+fmt(s.dup_prompt.all.near_removable)+' removable')+
      card('Removed by the simple filter',fmt(f.removed),'section 3');
    if(ds==='pref')h+=card('Pairs',fmt(f.n),'')+card('Median tokens, chosen and rejected',fmt(L.chosen_tok['0.5'])+' / '+fmt(L.rejected_tok['0.5']),'means '+fmt(s.mean_chosen_tok)+' / '+fmt(s.mean_rejected_tok))+
      card('Ties (same judge score)',fmt(s.ties),pct(s.ties/f.n))+card('Chosen longer than rejected',pct(s.chosen_longer/f.n),fmt(s.length_ties)+' pairs of equal length')+
      card('Removed by the simple filter',fmt(f.removed),'section 3');
    if(ds==='rlvr')h+=card('Prompts',fmt(f.n),'GSM8K '+fmt(s.datasets.gsm8k)+', MATH '+fmt(s.datasets.MATH)+', IF '+fmt(s.datasets.ifeval))+
      card('Median tokens, question and whole prompt',fmt(L.question_tok['0.5'])+' / '+fmt(L.prompt_tok['0.5']),'few-shot examples make up most of a maths prompt')+
      card('Exact duplicate questions',fmt(da.exact_dup_rows),'near-duplicate clusters: '+fmt(da.near_clusters))+
      card('Rows copying a test question',fmt(F.rlvr.by_rule.contam||0),'MMLU high-school maths (section 6)')+card('Removed by the simple filter',fmt(f.removed),'section 3');
    if(ds==='cosmo')h+=card('Documents',fmt(f.n),'formats: '+Object.entries(s.formats).map(([k,v])=>k.replace(/_/g,' ')+' '+fmt(v)).join(', '))+
      card('Median tokens, seed and document',fmt(L.seed_tok['0.5'])+' / '+fmt(L.text_tok['0.5']),'median ratio '+fmt(s.ratio['0.5'],1)+'×')+
      card('Near-duplicate documents',fmt(da.near_dup_rows),'MinHash at Jaccard 0.8')+card('Removed by the simple filter',fmt(f.removed),'Ai2\'s text rules find nothing');
    document.getElementById('pt-dsstats').innerHTML=h;
    document.getElementById('pt-dsint').innerHTML=INTRO[ds].replace('%CARD%','<a href="https://huggingface.co/datasets/HuggingFaceH4/ultrafeedback_binarized" target="_blank" rel="noopener noreferrer">dataset card</a>');
  }
  const hf=document.getElementById('pt-hfield'),hg=document.getElementById('pt-hgroup');
  function setupHist(){
    hf.innerHTML=FIELDS[ds].map(([k,l])=>'<option value="'+k+'">'+esc(l)+'</option>').join('');
    const gs=Object.keys(S[ds].len).filter(g=>g!=='all');
    hg.innerHTML='<option value="all">all rows</option>'+gs.map(g=>'<option value="'+esc(g)+'">'+esc(short(g))+'</option>').join('');
    hg.disabled=!gs.length;
  }
  function hist(){
    const el=document.getElementById('pt-hist'),w=P.width(el),E=S.edges;
    const o=S[ds].len[hg.value]||S[ds].len.all,f=hf.value,c=o[f+'_hist'],q=o[f];
    const H=170,l=36,b=34,t=10,bw=(w-l-8)/c.length,mx=Math.max(1,...c);
    let s='';for(let k=0;k<=4;k++){const y=t+(H-t-b)*(1-k/4);s+='<line x1="'+l+'" x2="'+(w-6)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/><text x="'+(l-4)+'" y="'+(y+4)+'" text-anchor="end" font-size="10" fill="var(--mute)">'+fmt(mx*k/4)+'</text>'}
    c.forEach((v,k)=>{const h=(H-t-b)*v/mx,x=l+k*bw;s+='<rect x="'+(x+1)+'" y="'+(H-b-h)+'" width="'+Math.max(1,bw-2)+'" height="'+h+'" fill="var(--c1)"><title>'+fmt(v)+' rows</title></rect>';
      const lab=k===c.length-1?fmt(E[k])+'+':fmt(E[k]);if(bw>26||k%2===0)s+='<text x="'+(x+bw/2)+'" y="'+(H-b+13)+'" text-anchor="middle" font-size="10" fill="var(--mute)">'+lab+'</text>'});
    s+='<text x="'+(l+(w-l)/2)+'" y="'+(H-4)+'" text-anchor="middle" font-size="10.5" fill="var(--mute)">Qwen3 tokens (bins double in width)</text>';
    el.innerHTML='<svg viewBox="0 0 '+w+' '+H+'" width="'+w+'" height="'+H+'" role="img" aria-label="Histogram of token counts">'+s+'</svg>';
    document.getElementById('pt-histsrc').textContent='Rows: '+fmt(o.n)+'. Median '+fmt(q['0.5'])+', 90th percentile '+fmt(q['0.9'])+', 99th '+fmt(q['0.99'])+', longest '+fmt(q.max)+' tokens. Measured on Apple M1 Pro (CPU), Qwen3 tokenizer, no chat template.';
  }
  function bars(rows,colour,fmtv){const mx=Math.max(1,...rows.map(r=>r[1]));
    return '<div class="pt-bars">'+rows.map(r=>'<div class="row"><div class="nm">'+r[0]+'</div><div class="track"><div class="fill" style="width:'+(100*r[1]/mx)+'%;background:'+(r[2]||colour)+'"></div></div><div class="val">'+(fmtv?fmtv(r):fmt(r[1]))+'</div></div>').join('')+'</div>'}
  function special(){
    const el=document.getElementById('pt-special'),s=S[ds],f=F[ds];let h='';
    if(ds==='sft'){
      h+='<h4>The five subsets side by side</h4><div class="pt-tw"><table><thead><tr><th>Subset</th><th class="num">median prompt</th><th class="num">median response</th><th>languages (lid.176, top 3)</th><th class="num">duplicate conversations</th><th class="num">removed by filter</th><th class="num">English-only would remove</th></tr></thead><tbody>';
      Object.keys(s.sources).sort().forEach(g=>{const L=s.len[g],lg=Object.entries(s.lang[g]).slice(0,3).map(([k,v])=>k+' '+v).join(', '),bg=f.by_group[g]||{};
        const ne=(f.optional.non_english.by_group||{})[g]||0;
        h+='<tr><td>'+esc(short(g))+'</td><td class="num">'+fmt(L.prompt_tok['0.5'])+'</td><td class="num">'+fmt(L.response_tok['0.5'])+'</td><td>'+esc(lg)+'</td><td class="num">'+fmt(s.dup_full[g].exact_dup_rows)+'</td><td class="num">'+fmt(Object.entries(bg).filter(([k])=>k!=='n').reduce((a,[,v])=>a+v,0))+'</td><td class="num">'+fmt(ne)+'</td></tr>'});
      h+='</tbody></table></div><p class="small mute">lid.176 is unreliable on short prompts in lower-resource languages: some Aya prompts in Yoruba or Igbo come out as Malagasy or English (row examples below), which is one more reason not to filter a multilingual subset by language ID. WildChat holds most of the multi-turn conversations (up to '+fmt(s.len['tulu_v3.9_wildchat_100k'].turns.max)+' user turns) and most duplicates: the same request sent by many users.</p>';
    }
    if(ds==='pref'){
      const sp=s.score_pairs,xs=[...new Set(sp.map(r=>r[0]).concat(sp.map(r=>r[1])))].sort((a,b)=>a-b);
      const w=P.width(el),n=xs.length,cell=Math.max(12,Math.min(30,(w-60)/n)),W=60+cell*n,H=40+cell*n;const mx=Math.max(...sp.map(r=>r[2]));
      let g='';sp.forEach(([a,b,c])=>{const x=60+xs.indexOf(b)*cell,y=10+(n-1-xs.indexOf(a))*cell;g+='<rect x="'+x+'" y="'+y+'" width="'+(cell-1)+'" height="'+(cell-1)+'" fill="'+(a===b?'var(--c2)':'var(--c1)')+'" opacity="'+(0.12+0.88*Math.sqrt(c/mx)).toFixed(2)+'"><title>chosen '+a+', rejected '+b+': '+c+' pairs</title></rect>'});
      xs.forEach((v,k)=>{if(n<=16||k%2===0){g+='<text x="'+(60+k*cell+cell/2)+'" y="'+(16+n*cell)+'" text-anchor="middle" font-size="9.5" fill="var(--mute)">'+v+'</text><text x="54" y="'+(10+(n-1-k)*cell+cell/2+3)+'" text-anchor="end" font-size="9.5" fill="var(--mute)">'+v+'</text>'}});
      g+='<text x="'+(60+n*cell/2)+'" y="'+(34+n*cell)+'" text-anchor="middle" font-size="10.5" fill="var(--mute)">rejected score</text><text x="12" y="'+(10+n*cell/2)+'" text-anchor="middle" font-size="10.5" fill="var(--mute)" transform="rotate(-90 12 '+(10+n*cell/2)+')">chosen score</text>';
      h+='<h4>Judge scores: chosen against rejected</h4><div style="overflow-x:auto"><svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Heatmap of chosen against rejected judge scores">'+g+'</svg></div>'+
        '<div class="pt-leg"><span style="--sw:var(--c1)">chosen scored higher (stronger colour = more pairs)</span><span style="--sw:var(--c2)">tie: same score</span></div>'+
        '<p class="small">The diagonal is '+fmt(s.ties)+' pairs ('+pct(s.ties/f.n)+') where the judge saw no difference; the binarization script allows it because it only re-draws when the same completion comes up.</p>';
      const bm=s.by_margin,keys=['0','0-1','1-2','2-3','3-5','5+'];
      h+='<h4>Is the longer answer chosen? By score margin</h4>'+bars(keys.map(k=>[k==='0'?'tie (margin 0)':'margin '+k,bm[k][1]/(bm[k][0]-bm[k][2]),'var(--c3)',bm[k][0]]),'',r=>pct(r[1],0)+' of '+fmt(r[3]))+
        '<p class="small">Share of pairs (equal lengths excluded) where the chosen answer has more tokens. A length-blind judge would sit near 50% at every margin. Here the chosen answer is longer in '+pct(s.chosen_longer/(f.n-s.length_ties))+' of pairs with a length difference, '+pct(bm['0'][1]/(bm['0'][0]-bm['0'][2]))+' even among ties, where the pick was random. The bias is mild, but a DPO run sees it on every batch.</p>';
    }
    if(ds==='rlvr'){
      const gk=s.gt_kind.MATH;
      h+='<h4>What a MATH label looks like</h4>'+bars(Object.entries(gk).sort((a,b)=>b[1]-a[1]).map(([k,v])=>[esc(k),v]),'var(--c4)',r=>fmt(r[1])+' ('+pct(r[1]/7500,0)+')')+
        '<p class="small">Only '+pct(gk.integer/7500,0)+' of MATH labels are plain integers; the rest need a checker that understands LaTeX (fractions, radicals, intervals, expressions). GSM8K labels are integers except '+fmt(s.gt_kind.gsm8k.other)+' written with a thousands comma, which matters in section 4.</p>'+
        '<h4>Instruction-following prompts are near-duplicates by design</h4><p class="small">'+fmt(s.dup_question.ifeval.near_dup_rows)+' of '+fmt(s.datasets.ifeval)+' IF prompts fall into '+fmt(s.dup_question.ifeval.near_clusters)+' near-duplicate clusters: the same base prompt (a summarisation task, an inference question) reused with different constraints, '+Object.keys(s.constraint_types).length+' constraint types with about '+fmt(s.datasets.ifeval/Object.keys(s.constraint_types).length)+' prompts each. A near-dedup pass would delete the variation the set was built for.</p>';
    }
    if(ds==='cosmo'){
      h+='<h4>How the generated documents open (first three words)</h4>'+bars(s.openers.map(([k,v])=>['"'+esc(k)+' ..."',v]),'var(--c5)',r=>fmt(r[1]))+
        '<p class="small">The blog-post prompt ends: "do not start with sentences like \'Have you ever...\'". '+fmt(F.cosmo.optional.ignored_instruction.n)+' of '+fmt(s.formats.blogpost)+' blog posts ('+pct(F.cosmo.optional.ignored_instruction.n/s.formats.blogpost)+') start with exactly that. Generated data drifts toward a few openings; Cosmopedia\'s authors added the instruction for that reason, and it is only partly obeyed. Lengths: the dataset\'s own <code>text_token_length</code> (Mixtral\'s tokenizer) differs from Qwen3\'s count by up to '+fmt(s.tok_vs_published_maxdiff)+' tokens on one document.</p>';
    }
    el.innerHTML=h;
  }
  const rs=document.getElementById('pt-rowsel');
  const RULE={dup:'exact duplicate',identity:'identity (Ai2 keyword filter)',cutoff:'knowledge cutoff (Ai2)',repeat:'repetition (Ai2)',tie:'tie',same_text:'identical texts',empty:'empty answer',contam:'copies a test question',empty_label:'empty label',unrewardable:'label the checker cannot match'};
  function rows(){
    const all=D.rows[ds],m=rs.value,list=all.filter(r=>m==='all'||(m==='rm'?r.rule:!r.rule));
    const fl=(t,c)=>'<span class="pt-flag'+(c?' '+c:'')+'">'+esc(t)+'</span>';
    document.getElementById('pt-rows').innerHTML=list.map(r=>{let h='<div class="pt-row"><div class="h">row '+fmt(r.i)+' ';
      if(r.rule)h+=fl('removed: '+(RULE[r.rule]||r.rule),'bad');else h+=fl('kept','good');
      if(ds==='sft'){h+=fl(r.src)+fl('lid.176: '+r.lang)+fl(r.turns+(r.turns>1?' user turns':' user turn'))+fl(r.pt+' / '+r.rt+' tokens')+'</div><div class="pt-lab">prompt</div><div class="t">'+esc(r.p)+'</div><div class="pt-lab">response</div><div class="t">'+esc(r.r)+'</div>'}
      if(ds==='pref'){h+=fl('score '+r.sc+' vs '+r.sj,r.sc===r.sj?'bad':'')+fl(r.ct+' vs '+r.jt+' tokens')+'</div><div class="pt-lab">prompt</div><div class="t">'+esc(r.p)+'</div><div class="pt-two"><div><div class="pt-lab">chosen ('+r.sc+')</div><div class="t">'+esc(r.c)+'</div></div><div><div class="pt-lab">rejected ('+r.sj+')</div><div class="t">'+esc(r.j)+'</div></div></div>'}
      if(ds==='rlvr'){h+=fl(r.ds)+(r.ct?fl(r.ct):'')+fl(r.qt+' / '+r.ft+' tokens')+'</div><div class="pt-lab">question (few-shot examples omitted)</div><div class="t">'+esc(r.p)+'</div><div class="pt-lab">label</div><div class="t">'+esc(r.gt||'(empty)')+'</div>'}
      if(ds==='cosmo'){h+=fl(r.fmt.replace(/_/g,' '))+fl(r.aud.replace(/_/g,' '))+fl(r.st+' to '+r.tt+' tokens')+'</div><div class="pt-lab">seed web extract</div><div class="t">'+esc(r.seed)+'</div><div class="pt-lab">generated</div><div class="t">'+esc(r.r)+'</div>'}
      return h+'</div>'}).join('')||'<p class="small mute">No row of this kind among the examples.</p>';
  }
  function setDs(m){ds=m;stats();setupHist();hist();special();rows()}
  rs.innerHTML='<option value="all">all example rows</option><option value="rm">rows the filter removes</option><option value="keep">rows it keeps</option>';
  P.seg(document.getElementById('pt-ds'),setDs);
  hf.addEventListener('change',hist);hg.addEventListener('change',hist);rs.addEventListener('change',rows);
  setDs('sft');
  P.onRender(()=>{hist();special()});P.onResize(()=>{hist();special()});
})();
