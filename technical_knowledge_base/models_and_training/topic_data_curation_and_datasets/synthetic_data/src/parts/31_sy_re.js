// ---- Rephrasing lab: real Nemotron-CC pairs and the Qwen3 WRAP-style run ----
(function(){
  const D=window.SY||{},esc=RD.esc,$=id=>document.getElementById(id);if(!$('re-nm'))return;
  const NUM=/\b\d+(?:[.,]\d+)?\b/g,CAP=/(?<=[a-z,;] )[A-Z][a-z]+/g;
  function stats(before,after){const K=SYT.kept(before,after);const bw=SYT.words(before).length,aw=SYT.words(after).length;
    const sn=[...new Set(before.match(NUM)||[])],sc=[...new Set(before.match(CAP)||[])];
    return {K,bw,aw,ratio:aw/Math.max(1,bw),copied:K.share,num:sn.length?sn.filter(x=>after.includes(x)).length/sn.length:null,names:sc.length?sc.filter(x=>after.includes(x)).length/sc.length:null,nn:sn.length,nc:sc.length}}
  const pct=x=>x==null?'n/a':(100*x).toFixed(0)+'%';
  window.SYRE={stats};
  // Nemotron-CC pairs
  const ORDER=['high_wrap','distill','extract_knowledge','knowledge_list','diverse_qa_pairs'],NAME={high_wrap:'Wikipedia-style',distill:'Distill',extract_knowledge:'Extract knowledge',knowledge_list:'Knowledge list',diverse_qa_pairs:'Diverse QA'};
  const P=ORDER.map(k=>(D.pairs||[]).find(p=>p.kind===k)).filter(Boolean),ST=P.map(p=>stats(p.before,p.after));
  $('re-nm-seg').innerHTML=P.map((p,i)=>'<button data-m="'+i+'"'+(i?'':' class="on"')+'>'+NAME[p.kind]+'</button>').join('');
  function showP(i){const p=P[i],s=ST[i];$('re-nm-b').textContent=p.before;$('re-nm-a').innerHTML=s.K.html;
    $('re-nm-src').innerHTML='Source page: '+esc(p.url)+' (WARC record '+esc(p.warc_record_id)+', file '+esc(p.warc_file.split('/').pop())+'); the record id was checked against the Nemotron-CC row.';
    [...$('re-nm-tab').querySelectorAll('tbody tr')].forEach((r,j)=>r.style.fontWeight=j===i?'600':'')}
  $('re-nm-tab').innerHTML='<thead><tr><th>Prompt</th><th class="num">Words before</th><th class="num">Words after</th><th class="num">After / before</th><th class="num">Copied phrasing</th><th class="num">Numbers kept</th><th class="num">Names kept</th></tr></thead><tbody>'+
    P.map((p,i)=>{const s=ST[i];return '<tr><td>'+NAME[p.kind]+'</td><td class="num">'+s.bw+'</td><td class="num">'+s.aw+'</td><td class="num">'+s.ratio.toFixed(2)+'</td><td class="num">'+pct(s.copied)+'</td><td class="num">'+pct(s.num)+(s.nn?' of '+s.nn:'')+'</td><td class="num">'+pct(s.names)+(s.nc?' of '+s.nc:'')+'</td></tr>'}).join('')+'</tbody>';
  RD.seg($('re-nm-seg'),m=>showP(+m));showP(0);

  // WRAP styles on running-example pages (rows shown: two pages of the 200-page GPU run, or the CPU smoke test)
  const R=D.rephrase_smoke||[],docs=[...new Set(R.map(r=>r.id))],STY=['easy','medium','hard','qa'],SN={easy:'Easy',medium:'Medium (Wikipedia)',hard:'Hard',qa:'Q/A'};
  const PR={easy:'"For the following paragraph give me a paraphrase of the same using a very small vocabulary and extremely simple sentences that a toddler will understand:"',
    medium:'"For the following paragraph give me a diverse paraphrase of the same in high quality English language as in sentences on Wikipedia:"',
    hard:'"For the following paragraph give me a paraphrase of the same using very terse and abstruse language that only an erudite scholar will understand. Replace simple words and phrases with rare and complex ones:"',
    qa:'"Convert the following paragraph into a conversational format with multiple tags of "Question:" followed by "Answer:":"'};
  if(!docs.length){$('re-wr').hidden=true;return}
  const GPU=D.rephrase_rows_from==='gpu200';
  $('re-wr-note').innerHTML='Qwen3-4B (Q4_K_M GGUF) through llama.cpp'+(GPU?' on the M1 Pro GPU (llama-server, 4 parallel requests)':' on the CPU')+', thinking off, temperature 0.5, top-p 0.9 (Nemotron-CC\'s settings), up to 450 new tokens, WRAP\'s Vicuna-style system line and prompts verbatim (Appendix G). '+(GPU?'Two of the 200 pages of the full run are shown here; the table below this card covers all 200.':'<b>CPU smoke test: 2 documents, 8 generations</b>, run to check the pipeline (about 12 minutes on 4 CPU threads). Two documents show behaviour, not rates.');
  let di=0;const host=u=>{try{return new URL(u).hostname}catch(e){return u}};
  $('re-wr-doc').innerHTML=docs.map((d,i)=>{const r=R.find(x=>x.id===d);return '<button data-m="'+i+'"'+(i?'':' class="on"')+'>'+esc(host(r.url))+'</button>'}).join('');
  function step(i){const d=docs[di],src=R.find(x=>x.id===d).source;$('re-wr-b').textContent=src;
    if(i===0){$('re-wr-a').innerHTML='<span class="mute">Step through the four styles.</span>';$('re-wr-al').textContent='Rewritten';
      $('re-wr-cap').innerHTML='<div class="t">The source segment</div>'+SYT.words(src).length+' words: the first 300 words at most of a page from the running example\'s crawl file.';$('re-wr-cnt').innerHTML='';return}
    const st=STY[i-1],r=R.find(x=>x.id===d&&x.style===st),s=stats(src,r.output);
    $('re-wr-a').innerHTML=s.K.html;$('re-wr-al').textContent='Rewritten: '+SN[st];
    $('re-wr-cap').innerHTML='<div class="t">'+SN[st]+'</div>Prompt: '+esc(PR[st]);
    $('re-wr-cnt').innerHTML=RD.stat('After / before',s.ratio.toFixed(2),s.aw+' / '+s.bw+' words')+RD.stat('Copied phrasing',pct(s.copied),'words in copied 4-grams')+RD.stat('Numbers kept',pct(s.num),s.nn+' in source')+RD.stat('Names kept',pct(s.names),s.nc+' in source')+RD.stat('Tokens generated',r.completion_tokens||'n/a',(r.seconds||0).toFixed(0)+' s'+(GPU?', GPU, 4 requests at once':' on CPU'))}
  const A=RD.anim({card:'re-wr',ctl:'re-wr-ctl',n:5,draw:step,ms:3200,label:'Style'});
  RD.seg($('re-wr-doc'),m=>{di=+m;A.go(0);A.play()});
  // per-style table over the rows shown
  $('re-wr-tab').innerHTML='<thead><tr><th>Style</th><th class="num">After / before</th><th class="num">Copied phrasing</th><th class="num">Numbers kept</th><th class="num">Names kept</th><th class="num">Opens with Markdown</th></tr></thead><tbody>'+
    STY.map(st=>{const rs=R.filter(r=>r.style===st),ss=rs.map(r=>stats(r.source,r.output));const avg=f=>{const v=ss.map(f).filter(x=>x!=null);return v.length?v.reduce((a,b)=>a+b,0)/v.length:null};
      return '<tr><td>'+SN[st]+'</td><td class="num">'+avg(s=>s.ratio).toFixed(2)+'</td><td class="num">'+pct(avg(s=>s.copied))+'</td><td class="num">'+pct(avg(s=>s.num))+'</td><td class="num">'+pct(avg(s=>s.names))+'</td><td class="num">'+rs.filter(r=>/^\s*(\*\*|#)/.test(r.output)).length+' of '+rs.length+'</td></tr>'}).join('')+'</tbody>';
  $('re-wr-obs').innerHTML=(GPU?['<b>What the 200-page run shows</b> (all 800 generations; table below):',
    'Easy halves the page (length ratio @@rp_easy_len@@) and keeps only @@rp_easy_num@@ of its numbers and @@rp_easy_names@@ of its names: detail is thrown away, not just simplified.',
    'Medium (Wikipedia) is the faithful style: length @@rp_medium_len@@, @@rp_medium_num@@ of numbers and @@rp_medium_names@@ of names kept. But @@rp_medium_pre@@ of outputs open with a chat preamble ("Here is..."), which Nemotron-CC\'s post-processing strips.',
    'Hard rewrites almost every phrase (@@rp_hard_nov@@ of 4-grams are new) and drifts: on the game page it adds "uncharted territories", which the page never says.',
    'Q/A copies the most phrasing (only @@rp_qa_nov@@ of 4-grams new), wraps tags in Markdown bold in @@rp_qa_md@@ of 200 outputs, and @@rp_qa_cap@@ of 200 hit the 450-token cap, so they end mid-answer: a larger cap or smaller segments are needed for this style.',
    'The FineWeb-Edu classifier barely moves: @@rp_src_edu3@@ of the source pages score 3 or more, against @@rp_easy_edu3@@ (Easy), @@rp_medium_edu3@@ (Medium), @@rp_qa_edu3@@ (Q/A) and @@rp_hard_edu3@@ (Hard). A new style does not make a page educational (Reading, section 6).',
    'The game page itself reads like model-written marketing copy ("Dive into the adrenaline-rushing world..."): some "real" seeds are already synthetic.']:
   ['<b>What the smoke test shows</b> (2 documents; behaviour, not rates):','Q/A copies the source almost sentence for sentence; Easy drops detail; Hard embellishes; Qwen3 wraps Q/A tags in Markdown bold.']).map((x,i)=>i?'<li>'+x+'</li>':'<li style="list-style:none;margin-left:-18px">'+x+'</li>').join('');
  // the 200-page run's statistics
  const S=D.rephrase_stats,EX=(D.rephrase_extra||{}).per_style||{};if(S&&S.styles){
    const p1=x=>x==null?'n/a':(100*x).toFixed(1)+'%';
    $('re-stats').innerHTML='<div class="card"><h3>200 running-example pages, four styles, Qwen3-4B on the M1 Pro GPU <span class="meas">measured</span></h3><p class="small mute">800 generations in '+((D.rephrase_extra||{}).wall_minutes||'?')+' minutes (llama-server, 4 parallel requests, 2026-10-16). Novel 4-grams: share of the output\'s 4-word sequences not in the source (median per page). Numbers and names kept: pooled over pages. Preamble: opens with "Here is", "Sure", "Certainly" or "Of course". Edu score: the FineWeb-Edu classifier on CPU.</p><div class="tw"><table><thead><tr><th>Style</th><th class="num">After / before</th><th class="num">Novel 4-grams</th><th class="num">Numbers kept</th><th class="num">Names kept</th><th class="num">Preamble</th><th class="num">Edu score &ge; 3</th><th class="num">Hit the 450-token cap</th><th class="num">Markdown</th></tr></thead><tbody>'+
      STY.filter(s=>S.styles[s]).map(s=>{const x=S.styles[s];return '<tr><td>'+SN[s]+'</td><td class="num">'+x.len_ratio.toFixed(2)+'</td><td class="num">'+p1(x.novel4)+'</td><td class="num">'+p1(x.num_kept)+'</td><td class="num">'+p1(x.names_kept)+'</td><td class="num">'+p1(x.preamble)+'</td><td class="num">'+(x.edu_ge3!=null?p1(x.edu_ge3):'n/a')+'</td><td class="num">'+(EX[s]?EX[s].cap450+' of '+EX[s].n:'n/a')+'</td><td class="num">'+(EX[s]?EX[s].markdown+' of '+EX[s].n:'n/a')+'</td></tr>'}).join('')+'</tbody></table></div>'+(S.edu_source?'<p class="small">Sources: edu score &ge; 3 for '+p1(S.edu_source.ge3)+'.</p>':'')+'</div>'}
})();
