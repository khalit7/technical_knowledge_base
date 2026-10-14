// ---- Tool map: which tool for which job (rules of thumb, labelled as judgement) ----
(function(){
  const {D,$,esc,toolLink:L}=TM;
  const sel=['tm-pj','tm-ph','tm-ps','tm-pl'].map($);
  // each rule returns [stage, pick id, why, runner-up html]
  function plan(j,h,s,c){
    const gpu=h==='gpu',big=s==='l',small=s==='s',R=[];
    const engine=h==='laptop'?['datatrove','LocalPipelineExecutor on one machine; the same script later moves to Slurm or Ray unchanged.',L('datajuicer')]
      :h==='slurm'?['datatrove','SlurmPipelineExecutor splits files into tasks; FineWeb ran this way.',L('dolma_tk')+' (one big machine) or '+L('datamap_rs')]
      :h==='spark'?['spark','Keep the platform you have; MinHash and joins are DataFrame jobs (start from '+L('textdedup')+"'s Spark MinHash).",L('datatrove')+' for the per-document filters']
      :['curator','Ray-based stages that place model scoring and fuzzy dedup on GPUs.',L('datatrove')+' on its RayPipelineExecutor, with an inference server for model stages'];
    if(j==='web'||j==='multi'){
      R.push(['Run the pipeline'].concat(engine));
      R.push(['Read WARC files','datatrove','Its WarcReader iterates records with warcio (pipeline/readers/warc.py line 73) and hands HTML to the extractor.','FastWARC, from the '+L('resiliparse')+' project, a faster WARC reader']);
      R.push(['Extract text',big?'resiliparse':'trafilatura',big?'At many crawls extraction time dominates; DCLM measured resiliparse about 8 times faster than trafilatura with similar downstream scores (published).':'Main-content extraction as in FineWeb; affordable at this size.',big?L('trafilatura')+' (what FineWeb used)':L('resiliparse')+' if CPU time matters; '+L('wet')+' only as a baseline']);
      R.push(['Language ID',j==='multi'?'glotlid':'lid176',j==='multi'?'2,102 labels including scripts; FineWeb-2 used it.':'English or major languages; datatrove default; Dolma 3 kept English score of at least 0.65.',j==='multi'?L('lid176')+' (176 languages)':L('glotlid')]);
      R.push(['Heuristic filters','datatrove','Gopher quality and repetition, C4 and FineWeb rules are ready-made steps (the Pipeline lab measures each rule).',big?L('datamap_rs')+' (Rust, Dolma 3)':L('dolma_tk')+' taggers']);
      R.push(['Deduplicate',gpu?'curator':(h==='spark'?'textdedup':(big?'datatrove':'datatrove')),gpu?'GPU MinHash and connected components; also semantic dedup.':(h==='spark'?'Spark MinHash script as a starting point.':'MinHash in four stages (signatures, buckets, clusters, filter) that shard across tasks.'),L('duplodocus')+' (Rust) or '+L('datasketch')+(small?' (fine at this size)':'')]);
      R.push(['Score quality',gpu?'fwedu_clf':'dclm_clf',gpu?'An embedding-model regressor; run it only on documents that survived the cheaper stages.':'A bigram fastText model runs on CPU over every document.',gpu?L('nemo_clf')+' ensemble (Nemotron-CC) for less single-classifier bias':L('fwedu_clf')+' on a GPU queue later']);
      R.push(['PII','dt_pii','Regex emails and IP addresses: cheap, partial, what FineWeb did.',L('presidio')+' only for sources with names that matter']);
      R.push(['Write','parquet','Columnar shards for analysis and publishing; tokenize to .bin shards as the last step.',L('jsonlzst')]);
    }else if(j==='clean'){
      R.push(['Read',small?'hfstream':'parquet',small?'Stream from the Hub, no full download.':'Download Parquet shards and process locally.',L('jsonlzst')]);
      R.push(['Run the pipeline'].concat(small&&h==='laptop'?['datatrove','Local executor; or a plain script with datasketch at this size.',L('textdedup')]:engine));
      R.push(['Exact dedup','datatrove','Hash of normalised text per document; cheapest win.',L('duplodocus')]);
      R.push(['Near-dup',small?'datasketch':(gpu?'curator':'datatrove'),small?'MinHash LSH in memory is fine under 100 GB.':'Sharded MinHash.',L('rensa')+' for faster signatures']);
      R.push(['Quality',gpu?'fwedu_clf':'dclm_clf','Score before deciding a threshold; look at what falls just under it (Quality lab).',L('kenlm')+' perplexity as a second signal']);
    }else if(j==='pdf'){
      R.push(['Text from PDFs',gpu?'olmocr':'olmocr',gpu?'A VLM transcribes pages, including scans; Dolma 3 cites its filters.':'Needs a GPU: without one, take the PDF text layer directly and queue only the PDFs where it fails for OCR later (FinePDFs mixed direct extraction and OCR).',L('datatrove')+' for filtering and dedup afterwards']);
      R.push(['Run the pipeline'].concat(engine));
      R.push(['Dedup','datatrove','PDFs repeat across crawls; MinHash as for web text (Dolma 3 used FineWeb\'s parameters with Duplodocus).',L('duplodocus')]);
    }else if(j==='post'){
      R.push(['Run the pipeline','datajuicer','Many ready operators for SFT and multimodal data cleaning.',L('datatrove')+' if you already use it']);
      R.push(['Language of short turns','lingua','Short strings are where fastText LID is weakest.',L('glotlid')]);
      R.push(['Near-dup prompts','datasketch','Thousands to millions of rows: in-memory MinHash LSH.',L('rensa')]);
      R.push(['Decontaminate','datatrove','n-gram overlap against benchmark test sets (NGramsDecontIndexer and Filter in pipeline/decont/n_grams.py); the Post-training data lab checks the Tulu 3 method.',L('bigcode_ds')+' for code benchmarks']);
      R.push(['PII','presidio','Names and IDs matter in conversations; NER cost is affordable at this size.',L('dt_pii')]);
    }else{
      R.push(['Format on disk',h==='laptop'||h==='slurm'?'tokbin':'mds',h==='laptop'||h==='slurm'?'A shared filesystem: memory-map flat token arrays plus an index; no parsing at training time.':'Object storage and many nodes: each rank streams only its shards, with deterministic shuffling and resumption.',h==='laptop'||h==='slurm'?L('mds')+' if you later read from object storage':L('litdata')+'; '+L('tokbin')+' if you copy shards to local disks']);
      R.push(['Tokenize','datatrove','DocumentTokenizer writes uint16 (vocabularies up to 65,536) or uint32 tokens plus document ends; MegatronDocumentTokenizer writes .bin/.idx.',L('tokbin')]);
      R.push(['Inspect samples','hfstream','Streaming is for looking and small runs, not for feeding a big run.',L('parquet')]);
    }
    // licence notes
    const W=[];const ids=R.map(r=>r[1]);
    if(c==='y'){
      if(ids.includes('lid176'))W.push(L('lid176')+': the model file is CC-BY-SA 3.0 (fasttext.cc), unlike the MIT code; check what share-alike means for your use. Avoid '+L('nllb_lid')+' (CC-BY-NC 4.0, non-commercial).');
      if(ids.includes('curator')||j==='web')W.push('NVIDIA\'s classifiers ('+L('nemo_clf')+') are under the NVIDIA Open Model License Agreement, and Nemotron-CC v2 requires the NVIDIA Data Agreement for Model Training: read both before relying on them.');
      W.push('Whatever the tools, the pages inside a web corpus keep their own copyright; corpus licences such as ODC-By cover only the compilation (see Licences below).');
    }else{
      W.push('Research only: '+L('nllb_lid')+' (non-commercial) becomes an option; '+L('bsade')+' has no licence file, so ask its author before reuse either way.');
    }
    if(gpu)W.push('Vendor speed claims (NeMo Curator\'s 16 times faster fuzzy dedup) are not checked here; measure on your data.');
    if(small&&(j==='web'||j==='multi'))W.push('Under 100 GB you are at sample scale: a single machine with datatrove\'s local executor is enough, and dedup will find fewer duplicates than at full scale (duplicates grow with corpus size).');
    return {R,W};
  }
  function draw(){
    const p=plan(...sel.map(s=>s.value));
    $('tm-pout').innerHTML=p.R.map(r=>'<div class="tm-rec"><h4>'+esc(r[0])+': '+L(r[1])+'</h4><p>'+r[2]+'</p><p class="mute">Runner-up: '+r[3]+'</p></div>').join('')+
      '<div class="tm-rec warn"><h4>Licence and caveats</h4>'+p.W.map(w=>'<p>'+w+'</p>').join('')+'</div>';
  }
  sel.forEach(s=>s.addEventListener('change',draw));
  draw();
})();
