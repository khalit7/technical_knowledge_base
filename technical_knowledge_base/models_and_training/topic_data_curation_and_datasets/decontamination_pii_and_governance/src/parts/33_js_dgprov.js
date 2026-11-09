// ---- Reading 9, Fig. 4: the provenance stepper (was the Provenance tab). Its steps are explained by the step list sx-pv on the left (2026-11-09);
// the chain shows each step's title, and the current step's fields in full, so the card stays short enough to stay in view. ----
(function(){
  const E=RD.esc,$=id=>document.getElementById(id),V=DG.prov;if(!V||!$('pv-chain'))return;
  const f=n=>Number(n).toLocaleString('en-GB'),w=V.warc,fw=V.fineweb,fe=V.fineweb_edu||{},rn=V.robots_now||{agents:{}},r0=V.run0||{};
  const kv=o=>'<dl class="pv-kv">'+Object.entries(o).map(([k,v])=>'<dt>'+E(k)+'</dt><dd>'+E(v)+'</dd>').join('')+'</dl>';
  const ag=rn.agents||{};
  const S=[
    {h:'1. The page on its website',k:{url:w.url,'robots.txt now':Object.keys(ag).map(a=>a+(ag[a]?' allowed':' blocked')).join(', ')+' ('+(DG.robots_now?DG.robots_now.date:'')+')'},
     lic:'<b>Terms:</b> FDA: "Unless otherwise noted, the contents of the FDA website ... are not copyrighted. They are in the public domain". Most pages are not: the page\'s own copyright is the bottom licence layer.',
     rm:'Removal here is the site owner\'s: robots.txt, or taking the page down.'},
    {h:'2. Common Crawl fetches it',k:{crawl:w.crawl+', segment '+w.segment,'WARC file':w.file,'record id':w.record_id,'fetched':w.date,'offset, length':f(w.offset)+', '+f(w.length)+' bytes (gzip member)','HTTP':w.http_status+', '+w.content_type,'X-Robots-Tag':w.x_robots_tag||'none','meta robots':(w.meta_robots||[]).length?w.meta_robots.join(' '):'none'},
     lic:'<b>Terms:</b> Common Crawl\'s terms of use apply to the archive; they do not change the page\'s copyright.',
     rm:'Common Crawl honours CCBot rules at crawl time and publishes an opt-out ledger for later requests; old crawls stay downloadable.'},
    {h:'3. Extraction and filtering (run0)',k:{'HTML bytes':f(w.html_bytes),'extracted text':(r0.extracted?f(r0.extracted.chars):'?')+' characters (trafilatura)','language':'en, score '+(r0.filtered?r0.filtered.language_score.toFixed(3):'?'),'filters':'URL blocklist, Gopher repetition and quality, C4, FineWeb rules: passed','kept fields':(r0.final?r0.final.metadata_keys.join(', '):'')},
     lic:'<b>Terms:</b> unchanged: extraction is copying.',rm:'run0 writes every removed document with its reason under removed/<step>/, so "why was this dropped" is a lookup.'},
    {h:'4. Deduplication and PII',k:{'MinHash':'kept (its own cluster; the cluster id is in the metadata)','PII step':'PIIFormatter ran; no email or public IP in this page'},
     lic:'',rm:'If a person asked for removal here, the record id finds every copy; near-duplicates of it are found through the MinHash cluster id.'},
    {h:'5. FineWeb row',k:{id:fw.id,dump:fw.dump,date:fw.date,file_path:fw.file_path,token_count:f(fw.token_count)+' (GPT-2 tokens)',language_score:fw.language_score},
     lic:'<b>Terms:</b> FineWeb is released under ODC-By 1.0, and its card adds that use is subject to Common Crawl\'s terms: a second layer over the page\'s own.',
     rm:'FineWeb has a PII removal form; a removal is a filter on id or url.'},
    {h:'6. FineWeb-Edu row',k:{'educational score':fe.score!=null?fe.score.toFixed(2):'not in FineWeb-Edu','int_score':fe.int_score!=null?fe.int_score+' (kept: threshold 3)':''},
     lic:'',rm:'Same id again.'},
    {h:'7. Into a training run',k:{'tokenised shard':'ids of tokens, usually no document id','what to keep beside it':'document id, source, licence field, signals present, data version, decontamination and PII actions'},
     lic:'<b>Obligations:</b> an EU general-purpose model provider must publish a summary of training content (top domains, opt-out protocols honoured); it is computed from these fields.',
     rm:'Without a document-to-shard index, removing this page means re-tokenising; with one, it means rebuilding one shard.'}];
  $('pv-chain').innerHTML=S.map((s,i)=>'<div class="pv-st" id="pv-'+i+'"><h4>'+E(s.h)+'</h4>'+kv(s.k)+(s.lic?'<div class="pv-lic">'+s.lic+'</div>':'')+'<div class="pv-rm">'+E(s.rm)+'</div></div>').join('');
  function draw(i){S.forEach((_,k)=>{const el=$('pv-'+k);el.classList.toggle('done',k<i);el.classList.toggle('cur',k===i)})}
  RD.anim({card:'dg-prov',ctl:'pv-ctl',n:S.length,draw,ms:4200,label:'Step',list:'sx-pv'});
  const ds=[['Motivation','Teach data curation on real data: one WARC through a FineWeb-style pipeline so every page of the topic measures the same documents.'],
    ['Composition','20,991 responses from one Common Crawl WARC (CC-MAIN-2024-30, file 00000); 2,617 English documents kept. Web pages of every kind; may contain personal data and offensive text.'],
    ['Collection','Common Crawl\'s July 2024 crawl (CCBot, robots.txt honoured at crawl time), downloaded 2026-10-14 with sha256 recorded.'],
    ['Preprocessing','datatrove 0.10.1: URL filter, trafilatura, lid.176 English > 0.65, Gopher, C4 and FineWeb rules, MinHash within the file, PIIFormatter (emails, public IPs). Every removed document kept with its reason.'],
    ['Uses','Teaching and measurement on this topic\'s pages. Not for training models: one file is too small, and the removed sets are not scrubbed.'],
    ['Distribution','Not redistributed: the repository keeps ids, counts and short scrubbed excerpts; the data stays in a local scratch folder.'],
    ['Maintenance','Rebuildable from the README\'s commands and checksums; the macOS scratch cleaner deletes files after 3 days unused.']];
  $('pv-ds').innerHTML=ds.map(d=>'<div><b>'+E(d[0])+'</b>'+E(d[1])+'</div>').join('');
})();
