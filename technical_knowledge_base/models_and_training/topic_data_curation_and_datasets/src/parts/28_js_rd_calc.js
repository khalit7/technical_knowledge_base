// ---- Reading tab, interview: back-of-envelope calculator for a pretraining data pipeline (all inputs published; see the caption) ----
(function(){
  const out=document.getElementById('rd-c-out');if(!out)return;
  const C={perCrawlB:18305.9/110,crawls:110,warcTiB:82.73,h100PerB:6000/15000};
  const $=id=>document.getElementById(id),cap=$('rd-c-cap');
  const f0=v=>Math.round(v).toLocaleString('en-US'),f1=v=>v>=100?f0(v):v.toFixed(1);
  function calc(){
    const tok=Math.max(1,+$('rd-c-tok').value||0),keep=+$('rd-c-sel').value,mbps=+$('rd-c-ext').value,rep=+$('rd-c-rep').value;
    const uniq=tok/rep,perCrawl=C.perCrawlB*keep,need=uniq/perCrawl;
    const warcTiB=need*C.warcTiB,bytes=warcTiB*Math.pow(1024,4);
    const coreH=bytes/(mbps*1e6)/3600,scoredB=need*C.perCrawlB,gpuH=keep<1?scoredB*C.h100PerB:0;
    const ok=need<=C.crawls;
    out.innerHTML=RD.stat('Unique tokens needed',f0(uniq)+'B',tok.toLocaleString('en-US')+'B / '+rep+' repeat'+(rep>1?'s':''))+
      RD.stat('Kept per crawl',f1(perCrawl)+'B','166.4B x '+(100*keep).toFixed(keep<0.1?2:0).replace(/\.?0+$/,'')+'%')+
      RD.stat('Crawls needed',f1(need),ok?'of '+C.crawls+' in FineWeb':'more than the '+C.crawls+' that exist')+
      RD.stat('WARC to process',f0(warcTiB)+' TiB','compressed')+
      RD.stat('Extraction CPU',f0(coreH)+' core-hours','= '+f0(coreH/24/1000)+'k core-days')+
      RD.stat('Quality scoring',keep<1?f0(gpuH)+' H100 hours':'none','FineWeb-Edu rate');
    cap.innerHTML='<div class="t">'+(ok?'Feasible from the crawls that exist':'Not enough web: '+f1(need)+' crawls needed, '+C.crawls+' exist')+'</div><p>'+
      (ok?'This selection supplies the budget with '+f1(C.crawls-need)+' crawls to spare. Extraction alone is '+f0(coreH)+' core-hours: about '+f0(coreH/1000/24)+' days on 1,000 cores.':
      'A strict cut cannot supply this many unique tokens. The options are the ones real corpora took: relax the threshold, keep and rephrase lower tiers (Nemotron-CC), add other sources (PDFs, code), or repeat the best tokens (try 4 repeats).')+'</p>';
  }
  ['rd-c-tok','rd-c-sel','rd-c-ext','rd-c-rep'].forEach(id=>{$(id).addEventListener('input',calc);$(id).addEventListener('change',calc)});
  calc();
})();
