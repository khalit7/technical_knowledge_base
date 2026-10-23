// Effective context lab: recorded per-position losses of the tiny GPT past its trained length (src/past/out/past.json),
// the training-distance histogram (computed), and SmolLM2's pass-key grid (src/kv/out/map.json).
(function(){
  if(!window.EFD||!LC.$('ef-chart'))return;
  const $=LC.$,E=EFD;
  // ---------- 1. past the trained length
  const runs=(E.past&&E.past.runs)||[];
  const lab=r=>r.model==='at_mha'?(r.scaling==='plain'?'plain RoPE':r.scaling.replace('linear','linear (PI)').replace('ntk','NTK').replace('yarn','YaRN')):
    r.model==='lc_pi_ft'?'PI x4 + 300 steps at 1,024':r.model==='lc_plain_ft'?'plain + 300 steps at 1,024':r.model==='at_swa64'?'window 64 (trained)':r.model;
  const COL=['--ink','--c2','--c5','--c3','--acc','--c4','--c6','--bad'];
  let on=new Set(runs.map((r,i)=>i).filter(i=>['plain','yarn x8','linear x4'].includes(runs[i].scaling)&&runs[i].model==='at_mha'));
  runs.forEach((r,i)=>{if(r.model!=='at_mha')on.add(i)});
  function chart(){
    const el=$('ef-chart');if(!runs.length){el.innerHTML='<p class="small">Runs pending.</p>';return}
    const W=LC.width(el),H=Math.round(Math.min(300,Math.max(220,W*0.5))),L=38,R=10,T=10,B=32,bin=E.past.bin,n=E.past.length;
    const ymin=1.8,ymax=4.6,px=x=>L+(W-L-R)*x/n,py=v=>T+(H-T-B)*(1-(Math.min(ymax,v)-ymin)/(ymax-ymin));
    let g='<rect x="'+px(0)+'" y="'+T+'" width="'+(px(256)-px(0))+'" height="'+(H-T-B)+'" fill="var(--soft)"/>';
    [2,2.5,3,3.5,4,4.5].forEach(v=>{g+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+py(v)+'" y2="'+py(v)+'" stroke="var(--line)"/>'+LC.t(L-4,py(v)+4,v.toFixed(1),{a:'end'})});
    (W<520?[0,512,1024,1536,2048]:[0,256,512,768,1024,1280,1536,1792,2048]).forEach(x=>{g+=LC.t(px(x),H-B+14,x,{a:'middle'})});
    g+=LC.t(L,H-3,'position in the window (loss per token, nats)',{fill:'var(--mute)'});
    g+=LC.t(px(128),T+13,'trained',{a:'middle',fill:'var(--mute)'});
    const leg=[];
    runs.forEach((r,i)=>{const c='var('+COL[i%COL.length]+')';
      leg.push('<button data-i="'+i+'" class="'+(on.has(i)?'on':'')+'"><i style="background:'+c+'"></i>'+lab(r)+'</button>');
      if(!on.has(i))return;
      g+='<path d="'+r.curve.map((v,k)=>(k?'L':'M')+px(k*bin+bin/2).toFixed(1)+' '+py(v).toFixed(1)).join('')+'" fill="none" stroke="'+c+'" stroke-width="2.2"/>'});
    el.innerHTML=LC.svg(W,H,g,'Loss by position past the trained length');
    $('ef-sel').innerHTML=leg.join('');
  }
  $('ef-sel').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const i=+b.dataset.i;on.has(i)?on.delete(i):on.add(i);chart()});
  if(runs.length){
    const B=['0-255','256-511','512-1023','1024-2047'];
    $('ef-tab').innerHTML='<thead><tr><th>Run</th>'+B.map(b=>'<th class="num">positions '+b+'</th>').join('')+'</tr></thead><tbody>'+
      runs.map(r=>'<tr><td>'+lab(r)+'</td>'+B.map(b=>'<td class="num">'+r[b].toFixed(2)+'</td>').join('')+'</tr>').join('')+'</tbody>';
    const g=(m,s)=>runs.find(r=>r.model===m&&r.scaling===s);
    const pl=g('at_mha','plain'),ya=g('at_mha','yarn x8'),li=g('at_mha','linear x4'),nt=g('at_mha','ntk x8'),pf=runs.find(r=>r.model==='lc_pi_ft'),pp=runs.find(r=>r.model==='lc_plain_ft');
    let s='Plain RoPE: '+pl['0-255'].toFixed(2)+' inside the trained length, '+pl['1024-2047'].toFixed(2)+' at 1,024 to 2,047 tokens; the model loses its place as soon as it sees angles it never trained on. '+
      'Position interpolation (linear x4) squeezes every position into the trained range and so also blurs the short distances: the in-length loss rises to '+li['0-255'].toFixed(2)+'. '+
      'NTK-aware scaling keeps short distances almost exact ('+nt['0-255'].toFixed(2)+') and holds to 1,023 tokens ('+nt['512-1023'].toFixed(2)+') but not to 2,047 ('+nt['1024-2047'].toFixed(2)+'). '+
      'YaRN, which interpolates only the slow dimensions and adds an attention temperature, stays at '+ya['1024-2047'].toFixed(2)+' at 1,024 to 2,047 without any training.';
    if(pf)s+=' A short continuation at the longer length fixes what inference-time scaling cannot: with PI and 300 steps at 1,024 tokens the loss is '+pf['0-255'].toFixed(2)+' in the first 256 positions and '+pf['512-1023'].toFixed(2)+' at 512 to 1,023'+(pp?'; with plain RoPE and the same 300 steps, '+pp['512-1023'].toFixed(2)+' at 512 to 1,023 and '+pp['1024-2047'].toFixed(2)+' past the new length':'')+'.';
    const sw=runs.find(r=>r.model==='at_swa64');if(sw)s+=' The sliding-window model (window 64) has no wall: '+sw['0-255'].toFixed(2)+' in range and '+sw['1024-2047'].toFixed(2)+' at 1,024 to 2,047, because it never attends past 64 tokens.';
    s+=' These are local-modelling losses on concatenated short stories: they show the position wall, not whether the model uses distant context (section 3 tests that).';
    if($('ef-text'))$('ef-text').textContent=s;
    const pr=$('ef-pr1');pr.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{pr.classList.add('done');pr.querySelectorAll('.opts button').forEach(x=>x.classList.add(x.dataset.ok?'right':'wrong'))}));
    $('ef-pr1-a').textContent='YaRN: '+ya['1024-2047'].toFixed(2)+' at positions 1,024 to 2,047 against '+ya['0-255'].toFixed(2)+' in the trained range; NTK '+nt['1024-2047'].toFixed(2)+', linear x8 '+g('at_mha','linear x8')['1024-2047'].toFixed(2)+', plain '+pl['1024-2047'].toFixed(2)+'. Linear interpolation is the tempting answer because it never shows the model an unseen angle, but it compresses the fine positional detail every token needs (its in-length loss is '+g('at_mha','linear x8')['0-255'].toFixed(2)+' at x8). Published practice agrees: YaRN-style scaling is what gpt-oss (x32 from 4,096) and Qwen3 ship, with continued training at length.';
  }
  if(E.past&&E.past.learned_error&&$('ef-err'))$('ef-err').textContent='>>> model(ids)   # ref_baseline_s1500, learned positions, 300 tokens\n'+E.past.learned_error;
  // ---------- 2. distance histogram
  function dist(){
    const el=$('ef-dist'),W=LC.width(el),H=150,L=38,R=10,T=8,B=28,n=256,d=+$('ef-d').value;
    const tot=n*(n+1)/2,px=x=>L+(W-L-R)*x/n,py=v=>T+(H-T-B)*(1-v/n);
    let g='';for(let k=0;k<n;k+=1){const v=n-k;g+='<rect x="'+px(k)+'" y="'+py(v)+'" width="'+Math.max(1,(W-L-R)/n)+'" height="'+(H-B-py(v))+'" fill="'+(k>=d?'var(--bad)':'var(--acc)')+'" opacity=".8"/>'}
    g+='<rect x="'+px(256)+'" y="'+T+'" width="'+(W-R-px(256))+'" height="'+(H-T-B)+'" fill="var(--soft)"/>';
    [0,64,128,192,256].forEach(x=>{g+=LC.t(px(x),H-B+14,x,{a:'middle'})});
    g+=LC.t(L-4,py(256)+8,'256',{a:'end'})+LC.t(L-4,H-B,'0',{a:'end'});
    g+=LC.t(L,H-2,'query-key distance (pairs per 256-token window)',{fill:'var(--mute)'});
    el.innerHTML=LC.svg(W,H,g,'How often each distance is seen in training');
    let c=0;for(let k=d;k<n;k++)c+=n-k;
    $('ef-dv').textContent=d;
    $('ef-dtext').textContent='Pairs at distance '+d+' or more: '+LC.fmt(100*c/tot,1)+'% of all '+LC.int(tot)+' query-key pairs in a 256-token window (counting a token attending to itself). Every distance past 255 has a share of exactly 0: the plain-RoPE curve above is what that looks like.';
  }
  $('ef-d').addEventListener('input',dist);
  // ---------- 3. SmolLM2 map
  function map(){
    const M=E.map;if(!M){$('ef-hm').innerHTML='<tr><td>Run pending (src/kv/run_kv.py map).</td></tr>';return}
    let h='<thead><tr><th>tokens \\ depth</th>'+M.depths.map(d=>'<th>'+Math.round(d*100)+'%</th>').join('')+'<th>all</th></tr></thead><tbody>';
    M.lengths.forEach((L,i)=>{const row=M.exact[i],tot=row.reduce((a,b)=>a+b,0),nn=M.n[i].reduce((a,b)=>a+b,0);
      h+='<tr><th>'+LC.int(L)+(L>M.maxpos?' *':'')+'</th>'+row.map((v,j)=>{const f=M.n[i][j]?v/M.n[i][j]:0;
        return '<td style="background:color-mix(in srgb,var(--good) '+Math.round(f*70)+'%,var(--bad) '+Math.round((1-f)*45)+'%)">'+v+'/'+M.n[i][j]+'</td>'}).join('')+'<td><b>'+Math.round(100*tot/nn)+'%</b></td></tr>'});
    $('ef-hm').innerHTML=h+'</tbody>';
    $('ef-mtext').textContent='SmolLM2-135M, '+((window.LCF&&LCF.map_text)||'')+' * marks lengths past max_position_embeddings.';
  }
  LC.onTab('t-read',()=>{chart();dist();map()});LC.onResize($('t-read'),()=>{chart();dist()});chart();dist();map();
})();
