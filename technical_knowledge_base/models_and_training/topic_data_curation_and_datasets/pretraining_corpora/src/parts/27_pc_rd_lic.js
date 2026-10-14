// ---- Reading section 7: the four licence layers of one corpus ----
(function(){
  const C=(window.PC&&PC.corpora)||[],esc=RD.esc,el=document.getElementById('pc-lic');if(!el||!C.length)return;
  const WEB=['Web pages: each page\'s copyright stays with its owner; most pages state no licence (all rights reserved)','Common Crawl terms of use: a licence to access the service; "respect the copyrights and other applicable rights of third parties"'];
  const L={
    fineweb:WEB, dclm:WEB, nemotron_cc:WEB, nemotron_cc2:[WEB[0]+'; plus LLM-written text, which may carry the generating models\' licence terms (the card names Qwen and DeepSeek)',WEB[1]],
    ultrafineweb:[WEB[0]+'; the Chinese part comes from sources with their own terms',WEB[1]],
    stack2:['Source files, each under its repository\'s licence (permissive, or none detected); copyleft and commercial excluded','Software Heritage: bulk content from its S3 bucket under an agreement with Software Heritage and Inria, following its principles for LLM training'],
    commonpile:['Only public-domain text and text under Open Definition licences (CC BY, CC BY-SA, CC0, permissive software), checked per source against licence laundering','Each source\'s own terms (government sites, archives, Common Crawl for the CC-licensed web part)'],
    wikipedia:['Wikipedia articles: CC BY-SA (3.0, now 4.0) and GFDL, share-alike','Wikimedia dumps'],
    instbooks:['Public-domain books (per HathiTrust rights data); may still be restricted outside the US','Harvard Library scans made by Google Books'],
    pile:['Mixed: web, papers, code, and contested sources (Books3 was pirated; subtitles and OpenWebText2 are scraped)','Each component\'s source terms']};
  const ids=Object.keys(L).filter(id=>C.find(c=>c.id===id));let cur='fineweb';
  const ch=document.getElementById('pc-lic-chips');
  ch.innerHTML=ids.map(id=>'<button data-c="'+id+'"'+(id===cur?' class="on"':'')+'>'+esc(C.find(c=>c.id===id).name.replace(/ \(.*\)$/,''))+'</button>').join('');
  ch.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;cur=b.dataset.c;ch.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));draw()});
  function draw(){const c=C.find(x=>x.id===cur),l=L[cur];
    const cls=c.lic_cls==='open'?'open':c.lic_cls==='res'?'res':'mid';
    const lay=[['4. Access gate',esc(c.gated.replace(/^no\b/,'not gated'))],['3. Dataset licence (the card\'s field)','<span class="pc-lic '+cls+'">'+esc(c.lic)+'</span> '+esc(c.terms)],['2. Crawler or archive terms',esc(l[1])],['1. The content',esc(l[0])]];
    el.innerHTML=lay.map((x,i)=>'<div style="border:1px solid var(--line);border-left:4px solid '+['var(--c4)','var(--c2)','var(--c6)','var(--c1)'][i]+';border-radius:6px;padding:6px 10px;margin:5px 0;background:var(--bg)"><div class="small mute" style="font-weight:600">'+x[0]+'</div><div class="small">'+x[1]+'</div></div>').join('')+
      '<p class="small mute">Read from the bottom: a layer can add conditions but cannot remove one from the layer below it.</p>'}
  draw();
})();
