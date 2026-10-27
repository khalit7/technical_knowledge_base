// ---- Rebuild tab: the ladder, the rank explorer, the replay animation and the noise table ----
(function(){const O=(PAPER.rc||{}).ours,NZ=(PAPER.rc||{}).noise,DM=window.DEMO;if(!O||!$('ldSvg'))return;
  const c1=O.stage_a_c1,c28=O.stage_a_c28;
  // 1. the ladder
  const L=[
    ['Random init / uniform guess',3.3923,'random initialisation of the target',O.uniform_bpb,'uniform over 50,257 tokens'],
    ['Unigram prior',2.5151,'unigram prior from GPT-2 predictions',c28.unigram_bpb,'anchor u alone (28 contexts)'],
    ['Bigram, one context, rank 671',2.1284,'bigram matrix, randomized SVD',c1.ranks['671'].T1,'GPT-2 small, token alone, T = 1'],
    ['Many contexts, rank 671',1.9136,'six donors, 28 contexts (Apr 29)',c28.ranks['671'].Tpaper,'GPT-2 small only, 28 contexts, paper\'s T'],
    ['Final recipe (with Stage B)',1.899044,'the winner at cutoff',null,'not rebuilt'],
    ['Trained GPT-2 124M',1.0,'"about 1.0"',O.gpt2_bpb,'GPT-2 small with full context']];
  fit($('ldSvg'),w=>{const lw=Math.min(210,w*.42),pl=lw+6,pr=54,rh=44,H=L.length*rh+26,xs=v=>pl+(w-pl-pr)*(v-0.8)/(3.6-0.8);let s='';
    [1,1.5,2,2.5,3,3.5].forEach(v=>{s+=ln2(xs(v),14,xs(v),H-12,'var(--line)')+tx(xs(v),H-1,v.toFixed(1),{fs:11,a:'middle',c:'var(--mute)'})});
    L.forEach(([n,p,pn,o,on],i)=>{const y=14+i*rh;s+=tx(0,y+13,n,{fs:12,w:600});
      const nm=w<560?'':'';s+=rc(xs(0.8),y+3,xs(p)-xs(0.8),12,'var(--c4)',{r:2,op:.85})+tx(xs(p)+4,y+13,p.toFixed(4),{fs:11,c:'var(--c4)'});
      if(o!=null)s+=rc(xs(0.8),y+19,xs(o)-xs(0.8),12,'var(--acc)',{r:2})+tx(xs(o)+4,y+29,o.toFixed(4),{fs:11,c:'var(--acc)'});
      else s+=tx(xs(0.8)+4,y+29,'not rebuilt here',{fs:11,c:'var(--mute)'});
      s+='<title>paper: '+pn+'; ours: '+on+'</title>'});
    $('ldSvg').innerHTML=svgW(w,H,s,'paper against rebuild')});
  $('ldNote').innerHTML='<span style="color:var(--c4)">■</span> paper (Table 4) &nbsp; <span style="color:var(--acc)">■</span> our rebuild on a different 200-text sample. <b>Defaults reproduce:</b> the one-context rank-671 bigram lands on Table 4\'s 2.1284 to within '+Math.abs(c1.ranks['671'].T1-2.1284).toFixed(4)+' bits per byte, independently (nothing was tuned to it; the near-equality is partly luck, since our texts differ). GPT-2 with full context gives '+O.gpt2_bpb.toFixed(3)+' ("about 1.0") and a uniform guess '+O.uniform_bpb.toFixed(3)+' (random initialisation 3.3923). <b>Does not reproduce exactly:</b> the unigram row (ours '+c28.unigram_bpb.toFixed(3)+' against 2.5151; the paper does not say how its first unigram prior was read off GPT-2) and the many-context row, where one donor with equal context weights gives '+c28.ranks['671'].Tpaper.toFixed(4)+' against six donors\' 1.9136, that is '+(100*(3.3923-c28.ranks['671'].Tpaper)/(3.3923-1.899044)).toFixed(1)+'% of the paper\'s whole descent.';
  // 2. rank explorer
  const RK=['1','4','16','64','256','671','full'];const st={r:5,c:'c28',t:'Tpaper'};
  const val=(c,t,r)=>{const S=O['stage_a_'+c];return r==='full'?S.full_bpb:S.ranks[r][t]};
  function drawRk(w){const H=Math.round(Math.min(280,Math.max(220,w*.36))),pl=46,pr=14,pt=12,pb=34;const xs=i=>pl+(w-pl-pr)*i/6;
    const all=[];['c1','c28'].forEach(c=>['T1','Tpaper'].forEach(t=>RK.forEach(r=>all.push(val(c,t,r)))));
    const y0=Math.floor(Math.min(...all)*20)/20-.02,y1=Math.ceil(Math.max(...all,c28.unigram_bpb)*20)/20,ys=v=>pt+(H-pt-pb)*(1-(v-y0)/(y1-y0));let s='';
    for(let v=Math.ceil(y0*10)/10;v<=y1+1e-9;v+=.1)s+=ln2(pl,ys(v),w-pr,ys(v),'var(--line)')+tx(pl-5,ys(v)+4,v.toFixed(1),{fs:11,a:'end',c:'var(--mute)'});
    RK.forEach((r,i)=>{s+=tx(xs(i),H-pb+15,r==='full'?'full':r,{fs:11,a:'middle',c:'var(--mute)'})});
    s+=tx((pl+w-pr)/2,H-3,'rank of the factorisation',{fs:11,a:'middle',c:'var(--mute)'});
    [[1.9136,'paper, 6 donors, 28 contexts (Apr 29)'],[2.1284,'paper, bigram + SVD (Apr 27)']].forEach(([v,l])=>{if(v>y0&&v<y1)s+=ln2(pl,ys(v),w-pr,ys(v),'var(--c4)',{da:'5 4'})+tx(pl+4,ys(v)+13,l,{fs:11,c:'var(--c4)'})});
    [['c1','T1','var(--mute)',.5],['c1','Tpaper','var(--mute)',.5],['c28','T1','var(--acc)',.5],['c28','Tpaper','var(--acc)',.5]].forEach(([c,t,col])=>{
      const on=c===st.c&&t===st.t;let d='';RK.forEach((r,i)=>{d+=(i?'L':'M')+xs(i).toFixed(1)+','+ys(val(c,t,r)).toFixed(1)});
      s+='<path d="'+d+'" fill="none" stroke="'+col+'" stroke-width="'+(on?2.4:1)+'" opacity="'+(on?1:.35)+'"'+(t==='T1'?' stroke-dasharray="5 3"':'')+'/>'});
    const v=val(st.c,st.t,RK[st.r]);s+='<circle cx="'+xs(st.r).toFixed(1)+'" cy="'+ys(v).toFixed(1)+'" r="6" fill="var(--bad)"/>'+tx(xs(st.r)+(st.r>4?-9:9),ys(v)-9,v.toFixed(4),{fs:12,w:600,a:st.r>4?'end':'start'});
    $('rkSvg').innerHTML=svgW(w,H,s,'bits per byte against rank')}
  function upd(){const r=RK[st.r];$('rkV').textContent=r==='full'?'full table':r;const v=val(st.c,st.t,r),S=O['stage_a_'+st.c];
    $('rkK').innerHTML=stat('bits per byte',v.toFixed(4),st.c==='c28'?'28 contexts':'one context')+stat('energy of C captured',r==='full'?'100%':(100*S.energy[r]).toFixed(1)+'%','top '+r+' singular values')+stat('share of the paper\'s descent',(100*(3.3923-v)/(3.3923-1.899044)).toFixed(1)+'%','(3.3923 − x) / 1.4933')+stat('parameters for E and H',r==='full'?'2.5 × 10⁹ (table)':fmt(2*50257*(+r+1)),r==='full'?'50,257² entries':'2 × 50,257 × (r + 1)');
    refit($('rkSvg'))}
  $('rkR').addEventListener('input',e=>{st.r=+e.target.value;upd()});
  segBind('rkC',m=>{st.c=m;upd()});segBind('rkT',m=>{st.t=m;upd()});
  fit($('rkSvg'),drawRk);onTab('t-run',()=>{refit($('ldSvg'));fit($('rkSvg'),drawRk);upd()});upd();
  // 3. replay
  if(DM){const N=DM.tokens.length-1,PER=5,NS=Math.ceil(N/PER);let rank='671';
    const bitsOf=m=>m==='stage_a'?DM.rank_bits[rank]:DM.models[m].bits;
    const steps=m=>Array.from({length:NS},(_,k)=>({t:'Tokens '+(k*PER+1)+' to '+Math.min(N,(k+1)*PER),c:''}));
    const NAMES={uniform:'a uniform guess over 50,257 tokens',unigram:'the unigram anchor u',stage_a:'the Stage A prior',gpt2:'GPT-2 with the whole passage so far'};
    const modes={};['uniform','unigram','stage_a','gpt2'].forEach(m=>modes[m]=steps(m));
    function caption(m,k){const b=bitsOf(m),a=k*PER,z=Math.min(N,(k+1)*PER);let hi=a;for(let i=a;i<z;i++)if(b[i]>b[hi])hi=i;let lo=a;for(let i=a;i<z;i++)if(b[i]<b[lo])lo=i;
      const q=s=>'"'+s.replace(/\n/g,'↵')+'"';return 'Under '+NAMES[m]+', the cheapest token here is '+q(DM.tokens[lo+1])+' ('+b[lo].toFixed(1)+' bits) and the costliest '+q(DM.tokens[hi+1])+' ('+b[hi].toFixed(1)+' bits).'}
    Object.keys(modes).forEach(m=>modes[m].forEach((s,k)=>s.c=caption(m,k)));
    function draw(m,k,e){const b=bitsOf(m),z=Math.min(N,(k+1)*PER),shown=k*PER+Math.round(e*(z-k*PER));let h='<div class="tokrow">';
      const sh=t=>esc(t).replace(/\n/g,'↵');h+='<span class="tok"><span>'+sh(DM.tokens[0])+'</span><small>given</small></span>';
      for(let i=0;i<N;i++){const t=DM.tokens[i+1],vis=i<shown,bb=b[i],a=Math.min(1,bb/16);
        h+='<span class="tok'+(i===shown-1?' cur':'')+(vis?'':' fut')+'" style="'+(vis?'background:color-mix(in srgb,var(--bad) '+Math.round(a*70)+'%,var(--bg))':'')+'"><span>'+sh(t)+'</span><small>'+(vis?bb.toFixed(1):'')+'</small></span>'}
      return h+'</div>'}
    function counters(m,k,e){const b=bitsOf(m),z=Math.min(N,(k+1)*PER),shown=Math.max(1,k*PER+Math.round(e*(z-k*PER)));let bits=0,by=0;for(let i=0;i<shown;i++){bits+=b[i];by+=DM.bytes[i+1]}
      const tp=m==='uniform'?'every token: 1 / 50,257':(m==='stage_a'&&rank!=='671')?'shown at rank 671 only':DM.models[m].top[shown-1].map(([t,p])=>'"'+esc(t).replace(/\n/g,'↵')+'" '+(100*p).toFixed(0)+'%').join(', ');
      return stat('bits so far',bits.toFixed(1),shown+' tokens, '+by+' bytes')+stat('bits per byte so far',(bits/by).toFixed(3),'')+stat('next-token guesses before "'+esc(DM.tokens[shown]).replace(/\n/g,'↵')+'"',tp,'')}
    const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;');
    const an=makeAnim({id:'rp',modes,mode:'stage_a',draw,counters,dur:2400});
    $('rpRank').addEventListener('change',e=>{rank=e.target.value;modes.stage_a.forEach((s,k)=>s.c=caption('stage_a',k));if(an){an.st.lk=-1;an.draw()}});}
  // 4. noise
  if(NZ){const nm={uniform:'uniform guess',unigram_c28:'unigram anchor u',c1_r671_T1:'1 context, rank 671, T = 1',c28_r256_T1:'28 contexts, rank 256, T = 1',c28_r671_T1:'28 contexts, rank 671, T = 1',c28_r671_Tpaper:'28 contexts, rank 671, paper\'s T',c28_full:'28 contexts, full table',gpt2:'GPT-2, full context'};
    let t='<div class="tw"><table><thead><tr><th>model (our rebuild)</th><th class="num">bpb, 200 texts</th><th class="num">± SE over texts</th><th class="num">texts 0 to 99</th><th class="num">texts 100 to 199</th></tr></thead><tbody>';
    Object.keys(nm).forEach(k=>{t+='<tr><td>'+nm[k]+'</td><td class="num">'+NZ.bpb[k].toFixed(4)+'</td><td class="num">'+NZ.se[k].toFixed(4)+'</td><td class="num">'+NZ.halves[k][0].toFixed(4)+'</td><td class="num">'+NZ.halves[k][1].toFixed(4)+'</td></tr>'});
    t+='</tbody></table></div><div class="tw"><table><thead><tr><th>paired difference, same texts</th><th class="num">difference</th><th class="num">± SE</th></tr></thead><tbody>';
    Object.entries(NZ.pairs).forEach(([k,v])=>{const [a,b]=k.split(' - ');t+='<tr><td>'+nm[a]+' minus '+nm[b]+'</td><td class="num">'+v.diff.toFixed(4)+'</td><td class="num">'+v.se.toFixed(4)+'</td></tr>'});
    $('nzTab').innerHTML=t+'</tbody></table></div>';
    $('nzNote').innerHTML='Standard errors from 2,000 bootstrap resamples of the 200 texts. Read it this way: another 200 FineWeb-Edu texts would move an absolute score by about ±'+NZ.se.c28_r671_Tpaper.toFixed(3)+' (the two halves of our sample differ by '+Math.abs(NZ.halves.c28_r671_Tpaper[0]-NZ.halves.c28_r671_Tpaper[1]).toFixed(3)+'), so the paper\'s absolute 1.899 is specific to its sample; differences between close variants on the same texts are measured far more precisely, which is why a fixed development set can rank them, and also why 1,124 attempts tuned against one fixed set can fit its quirks. The paper never scores the winner on a held-out set.'}
})();
