// ---- Twelve decoders tab: perplexity against diversity, table, sample reader ----
(function(){
  const $=id=>document.getElementById(id);
  const D=SD.DEG,S=D.settings;
  const ppl=lp=>Math.exp(-lp);
  const hum=D.passages.reduce((a,p)=>a+p.human_lp,0)/D.passages.length;
  const H=ppl(hum);
  const col=s=>s.det?'var(--c2)':/min-p/.test(s.label)?'var(--c5)':/top-p/.test(s.label)?'var(--c1)':'var(--c4)';
  const fmtp=v=>v>=1000?SD.fmtN(v):v>=100?v.toFixed(0):v.toFixed(1);
  function plot(){
    const el=$('dg-plot');const W=Math.max(300,RD.width(el)),Hh=W<520?300:340,pl=46,pr=14,pt=14,pb=40;
    const x0=Math.log10(1.5),x1=Math.log10(1e5);
    const X=v=>pl+(W-pl-pr)*(Math.log10(v)-x0)/(x1-x0),Y=v=>pt+(Hh-pt-pb)*(1-v);
    let s='';
    [2,5,10,30,100,1000,1e4,1e5].forEach(v=>{s+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="'+pt+'" y2="'+(Hh-pb)+'" stroke="var(--line)"/><text x="'+X(v)+'" y="'+(Hh-pb+14)+'" text-anchor="middle" fill="var(--mute)" font-size="10.5">'+(v>=1000?(v/1000)+'k':v)+'</text>'});
    [0,0.25,0.5,0.75,1].forEach(v=>{s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/><text x="'+(pl-6)+'" y="'+(Y(v)+4)+'" text-anchor="end" fill="var(--mute)" font-size="10.5">'+v+'</text>'});
    s+='<text x="'+((pl+W-pr)/2)+'" y="'+(Hh-6)+'" text-anchor="middle" fill="var(--mute)" font-size="11">perplexity under GPT-2 small (log scale)</text>';
    s+='<text x="12" y="'+((pt+Hh-pb)/2)+'" text-anchor="middle" fill="var(--mute)" font-size="11" transform="rotate(-90 12 '+((pt+Hh-pb)/2)+')">diversity (distinct-2)</text>';
    s+='<line x1="'+X(H)+'" x2="'+X(H)+'" y1="'+pt+'" y2="'+(Hh-pb)+'" stroke="var(--good)" stroke-width="2" stroke-dasharray="5 3"/><text x="'+(X(H)+4)+'" y="'+(pt+12)+'" fill="var(--good)" font-size="11">human text '+H.toFixed(1)+'</text>';
    // labels: short names, placed right of the dot unless near the edge
    const short=l=>l.replace('Pure sampling, ','pure ').replace('Beam search, 4 beams','beam 4').replace(', ',' ');
    const placed=[];
    S.forEach((d,i)=>{const x=X(ppl(d.mean_lp)),y=Y(d.div);s+='<circle cx="'+x+'" cy="'+y+'" r="5" fill="'+col(d)+'"><title>'+d.label+': perplexity '+fmtp(ppl(d.mean_lp))+', diversity '+d.div.toFixed(3)+'</title></circle>';
      let lx=x+7,anchor='start';const tw=short(d.label).length*5.6;if(lx+tw>W-pr){lx=x-7;anchor='end'}
      let ly=y+4;for(let k=0;k<6&&placed.some(p=>Math.abs(p[0]-lx)<tw&&Math.abs(p[1]-ly)<11);k++)ly+=11;placed.push([lx,ly]);
      if(W>=600||d.det||/T 2, top-p|T 3/.test(d.label))s+='<text x="'+lx+'" y="'+ly+'" font-size="10.5" text-anchor="'+anchor+'" fill="var(--ink)">'+short(d.label)+'</text>'});
    el.innerHTML='<svg viewBox="0 0 '+W+' '+Hh+'" width="'+W+'" role="img" aria-label="Perplexity against diversity for twelve decoders" class="scat">'+s+'</svg>';
    $('dg-leg').innerHTML=[['var(--c2)','search (greedy, beam)'],['var(--c4)','pure sampling, top-k'],['var(--c1)','top-p'],['var(--c5)','min-p'],['var(--good)','human continuation']].map(([c,t])=>'<span><span class="sw" style="background:'+c+'"></span>'+t+'</span>').join('');
  }
  // table
  let h='<tr><th>Decoder</th><th class="num">Perplexity</th><th class="num">Repetition</th><th class="num">Diversity</th></tr>';
  h+='<tr><td><b>Human continuation</b></td><td class="num"><b>'+H.toFixed(1)+'</b></td><td class="num">n/a</td><td class="num">n/a</td></tr>';
  S.forEach(d=>{h+='<tr><td>'+d.label+'</td><td class="num">'+fmtp(ppl(d.mean_lp))+'</td><td class="num">'+(d.rep4*100).toFixed(1)+'%</td><td class="num">'+d.div.toFixed(3)+'</td></tr>'});
  $('dg-tab').innerHTML=h;
  const g=S.find(s=>s.key==='greedy'),b=S.find(s=>s.key==='beam'),pu=S.find(s=>s.key==='pure'),p95=S.find(s=>s.key==='p95');
  $('dg-repro').innerHTML='Defaults reproduce the ordering of Holtzman et al.\'s Table 1 independently (GPT-2 small and 4 passages here; GPT-2 Large and 5,000 WebText passages there): search far below human perplexity (greedy '+fmtp(ppl(g.mean_lp))+', beam '+fmtp(ppl(b.mean_lp))+' against '+H.toFixed(1)+'; theirs 1.50 and 1.48 against 12.38), pure sampling above it ('+fmtp(ppl(pu.mean_lp))+'; theirs 22.73) and top-p 0.95 closest ('+fmtp(ppl(p95.mean_lp))+'; theirs 13.13). The absolute values do not compare across the two studies: a smaller model is more surprised by everything. Perplexity near human is a necessary condition for human-like text, not a measure of quality.';
  // sample reader
  S.forEach((d,i)=>$('dg-set').insertAdjacentHTML('beforeend','<option value="'+i+'">'+d.label+'</option>'));
  D.passages.forEach((p,i)=>$('dg-pas').insertAdjacentHTML('beforeend','<option value="'+i+'">Passage '+(i+1)+': "'+RD.esc(p.prompt.split(' ').slice(0,5).join(' '))+' …"</option>'));
  const nl=s=>RD.esc(s).replace(/\n/g,' ↵ ');
  function samples(){const d=S[+$('dg-set').value],pi=+$('dg-pas').value,p=D.passages[pi];
    $('dg-ctx').innerHTML='<span class="q">'+nl(p.prompt)+'</span>';
    let h='<div class="samp" style="border-color:var(--good)"><span class="m">Human continuation (the book): perplexity '+ppl(p.human_lp).toFixed(1)+'</span>'+nl(p.human)+'</div>';
    d.samples.filter(x=>x.p===pi).forEach((x,k)=>{h+='<div class="samp"><span class="m">'+d.label+(d.det?'':', sample '+(k+1))+': perplexity '+fmtp(ppl(x.lp))+', repetition '+(x.rep4*100).toFixed(0)+'%</span>'+nl(x.text)+'</div>'});
    $('dg-samp').innerHTML=h}
  $('dg-set').addEventListener('change',samples);$('dg-pas').addEventListener('change',samples);
  $('dg-set').value=String(S.findIndex(s=>s.key==='t15p95'));samples();
  (window.TAB_RENDER=window.TAB_RENDER||{});(TAB_RENDER['t-deg']=TAB_RENDER['t-deg']||[]).push(plot);
  addEventListener('resize',()=>{if(!$('t-deg').hidden)plot()});
})();
