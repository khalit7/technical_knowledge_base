// ---- Reading: optimiser state memory, recounted from real config.json files ----
(function(){
  const host=document.getElementById('mem-out');if(!host)return;
  const M=window.MEM_MODELS;let mi=M.length-1;
  // state floats for one optimiser over one model; bytes per state value: 4 (fp32) except 8-bit Adam (1)
  const OPTS=[
    {k:'sgd',n:'SGD, no momentum',b:4,f:(r,c,io)=>0,v:0,why:'no state'},
    {k:'mom',n:'SGD + momentum, Nesterov',b:4,f:(r,c)=>r*c,v:1,why:'one velocity buffer'},
    {k:'lion',n:'Lion',b:4,f:(r,c)=>r*c,v:1,why:'one momentum buffer (Chen et al. 2023)'},
    {k:'muon',n:'Muon (+ AdamW elsewhere)',b:4,f:(r,c,io)=>(io?2:1)*r*c,v:2,why:'one buffer on hidden matrices; embeddings, head and 1-D parameters on AdamW'},
    {k:'adam',n:'Adam, AdamW',b:4,f:(r,c)=>2*r*c,v:2,why:'m and v'},
    {k:'adam8',n:'8-bit Adam',b:1,f:(r,c)=>2*r*c,v:2,why:'m and v in 8 bits (Dettmers et al. 2021: 8 bytes to 2)'},
    {k:'adafactor',n:'Adafactor (no momentum)',b:4,f:(r,c)=>r+c,v:1,why:'row and column sums of g² per matrix (Shazeer and Stern 2018)'},
    {k:'soap',n:'SOAP (soap.py defaults)',b:4,f:(r,c)=>2*r*c+(r<=10000?2*r*r:0)+(c<=10000?2*c*c:0),v:2,why:'Adam\'s m and v, plus a factor and its eigenbasis for every side of 10,000 or less'}];
  function count(o,m){let s=0;for(const [lab,r,c,n] of m.mats){const io=lab==='embedding'||lab==='output head';s+=o.f(r,c,io)*n}return s+o.v*m.vec}
  const fmtB=b=>b>=1e12?(b/1e12).toFixed(2)+' TB':b>=1e9?(b/1e9).toFixed(b>=1e11?0:1)+' GB':(b/1e6).toFixed(0)+' MB';
  function draw(){const m=M[mi];const N=m.total;
    const rows=OPTS.map(o=>{const s=count(o,m);return{o,s,per:s/N,bytes:s*o.b,train:2+2+4+(s*o.b)/N}});
    const mx=Math.max(...rows.map(r=>r.bytes));
    let hidden=0;for(const [lab,r,c,n] of m.mats)if(lab!=='embedding'&&lab!=='output head')hidden+=r*c*n;
    let h='<p class="small mute">'+m.name+': '+(N/1e9).toFixed(N>1e11?0:2)+'B parameters recounted from its <a href="'+m.url+'" target="_blank" rel="noopener noreferrer">config.json</a> (published: '+m.pub+'); '+(100*hidden/N).toFixed(1)+'% of them sit in hidden 2-D matrices, the share Muon handles.</p>';
    h+='<div class="tw"><table><thead><tr><th>Optimiser</th><th class="num">state values per parameter</th><th class="num">state memory</th><th class="num">training bytes per parameter</th><th style="min-width:110px">state memory, to scale</th></tr></thead><tbody>';
    rows.forEach(r=>{h+='<tr><td>'+r.o.n+'<br><span class="mute small">'+r.o.why+'</span></td><td class="num">'+r.per.toFixed(r.per<0.01&&r.per>0?4:2)+'</td><td class="num">'+fmtB(r.bytes)+'</td><td class="num">'+r.train.toFixed(1)+'</td><td><div class="evb"><i style="width:'+(100*r.bytes/mx).toFixed(1)+'%;background:var(--acc)"></i></div></td></tr>'});
    h+='</tbody></table></div>';host.innerHTML=h}
  const seg=document.getElementById('mem-model');
  seg.innerHTML=M.map((m,i)=>'<button data-i="'+i+'"'+(i===mi?' class="on"':'')+'>'+m.name+'</button>').join('');
  seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{mi=+b.dataset.i;seg.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));draw()}));
  draw();
})();
