// ---- Post-training data lab: the simple quality filter, before and after (section 3) ----
(function(){
  const P=window.PT,D=P.D,F=D.filter,esc=P.esc,fmt=P.fmt,pct=P.pct;
  const DESC={dup:'exact duplicates (same text after lower-casing and collapsing whitespace; the first copy stays)',
    identity:'Ai2\'s identity filter: an assistant turn names a model or provider ("As an AI developed by OpenAI", "I am ChatGPT", any sentence with DeepSeek or Qwen)',
    cutoff:'Ai2\'s cutoff filter: any message mentions a knowledge cutoff ("as of my last update in April 2023")',
    repeat:'Ai2\'s repetition filter: the last answer repeats a block 10 times, a sentence 40 times or a sentence 4 times in a row',
    tie:'ties: chosen and rejected have the same judge score, so the pair carries no preference',
    same_text:'identical texts: chosen and rejected are the same answer (with different scores)',
    empty:'an empty chosen or rejected answer',contam:'rows labelled a copy of a benchmark test question (Decontamination child page)',
    empty_label:'an empty label: nothing to check against',unrewardable:'labels Tulu 3\'s own checker can never match (section 4)'};
  const OPT={non_english:'English-only (lid.176 on the prompt)',refusal:'drop refusal phrases ("I\'m sorry, but I can\'t", "as an AI")',over_4096:'longer than 4,096 tokens (Tulu 3 trains SFT at 4,096: these would be cut, not dropped)',
    near_dup_prompt:'near-duplicate prompts (MinHash, Jaccard 0.8)',margin_below_1:'margin below 1 point',near_dup_question:'near-duplicate questions (MinHash, Jaccard 0.8)',
    ignored_instruction:'blog posts opening "Have you ever" against the prompt\'s instruction',near_dup_text:'near-duplicate documents'};
  const OPTWHY={non_english:'removes the multilingual Aya subset almost whole, and WildChat\'s non-English users',refusal:'removes the safety subsets\' refusals, which are the point of those subsets',
    near_dup_question:'removes IF rows that share a base prompt but carry different constraints',margin_below_1:'small margins are noisy, but this halves nothing: it is a trade of size for signal'};
  let ds='sft',opts={},geo=null;
  const cvs=document.getElementById('pt-fcv');
  function steps(){return F[ds].order.filter(r=>(F[ds].by_rule[r]||0)>0)}
  function codeOf(){const c=new Array(F[ds].n).fill(0);let i=0;String(F[ds].removed_rows).replace(/([a-z])(\d+)/g,(m,l,d)=>{i+=+d;c[i]=l.charCodeAt(0)-96;return m});return c}
  function maskRows(b64){const s=atob(b64),out=[];for(let k=0;k<s.length;k++){const v=s.charCodeAt(k);for(let j=0;j<8;j++)if(v&(1<<j))out.push(k*8+j)}return out}
  let codes=codeOf();
  function groups(){const g=new Uint8Array(F[ds].n);if(F[ds].group_runs){let k=0;F[ds].group_runs.forEach(([gi,n])=>{for(let j=0;j<n;j++)g[k++]=gi})}return g}
  let grp=groups();
  const GC=['--c1','--c3','--c4','--c5','--c6'];
  function layout(){const w=P.width(cvs.parentElement),n=F[ds].n;let cell=Math.max(2,Math.floor(Math.sqrt(w*240/n)));cell=Math.min(cell,9);
    const cols=Math.floor(w/cell),rows=Math.ceil(n/cols);geo={w,cell,cols,h:rows*cell+4}}
  function draw(i){
    layout();const dpr=window.devicePixelRatio||1,{w,cell,cols,h}=geo;cvs.width=w*dpr;cvs.height=h*dpr;cvs.style.width=w+'px';cvs.style.height=h+'px';
    const x=cvs.getContext('2d');x.setTransform(dpr,0,0,dpr,0,0);x.clearRect(0,0,w,h);
    const st=steps(),ord=F[ds].order,cur=i>0&&i<=st.length?ord.indexOf(st[i-1])+1:0,after=i>st.length;
    const col={};GC.forEach(c=>col[c]=P.cv(c));const bad=P.cv('--bad'),dim=P.cv('--line'),opc=P.cv('--c4');
    const om=new Set();Object.keys(opts).forEach(k=>{if(opts[k]&&F[ds].optional[k].mask)maskRows(F[ds].optional[k].mask).forEach(r=>om.add(r))});
    const s=Math.max(1,cell-1),big=[];let kept=0,gone=0;
    for(let r=0;r<F[ds].n;r++){const cx=(r%cols)*cell,cy=Math.floor(r/cols)*cell,c=codes[r],idx=c?ord.indexOf(ord[c-1])+1:0;
      if(c&&(after||(cur&&idx<cur))){gone++;x.fillStyle=dim;x.fillRect(cx,cy,s,s);continue}
      if(c&&cur&&idx===cur){big.push([cx,cy,bad]);continue}
      if(after&&om.has(r)){big.push([cx,cy,opc]);kept++;continue}
      kept++;x.fillStyle=F[ds].group_runs?col[GC[grp[r]%GC.length]]:col['--c1'];x.globalAlpha=.75;x.fillRect(cx,cy,s,s);x.globalAlpha=1}
    big.forEach(([cx,cy,c])=>{x.fillStyle=c;const z=Math.max(5,cell*2.2);x.fillRect(cx+s/2-z/2,cy+s/2-z/2,z,z)});
    const cap=document.getElementById('pt-fcap');
    if(i===0)cap.innerHTML='<b>Before.</b> All '+fmt(F[ds].n)+' rows of the '+({sft:'Tulu 3 SFT',pref:'UltraFeedback',rlvr:'Tulu 3 RLVR',cosmo:'Cosmopedia'})[ds]+' sample, one square each'+(F[ds].group_runs?', coloured by subset.':'.')+(st.length?' Press play to apply the rules in order.':' None of the rules fires on this sample.');
    else if(!after){const r=st[i-1];cap.innerHTML='<b>Rule '+i+' of '+st.length+':</b> '+esc(DESC[r]||r)+'. Removes <b>'+fmt(F[ds].by_rule[r])+'</b> rows (enlarged).'}
    else{const rm=F[ds].removed;cap.innerHTML='<b>After.</b> '+fmt(F[ds].n-rm)+' rows kept, '+fmt(rm)+' removed ('+pct(rm/F[ds].n,1)+'). '+(om.size?'Purple: what the ticked optional rules would remove on top.':'Tick an optional rule to see what it would take.')}
    const lg=document.getElementById('pt-fleg');
    lg.innerHTML=(F[ds].group_runs?F[ds].gnames.map((g,k)=>'<span style="--sw:var('+GC[k%GC.length]+')">'+esc(g.replace('tulu_v3.9_','').replace('_decontaminated_50k','').replace('synthetic_finalresp_','').replace('_v5_regen_149960','').replace('_100k',''))+'</span>').join(''):'<span style="--sw:var(--c1)">row</span>')+
      '<span style="--sw:var(--bad)">removed by the current rule</span><span style="--sw:var(--line)">removed</span><span style="--sw:var(--c4)">optional rule</span>';
  }
  const A=P.anim({card:'pt-fcard',ctl:'pt-fctl',n:steps().length+2,draw,ms:2000,label:'Filter step'});
  function optUI(){const o=F[ds].optional,el=document.getElementById('pt-fopt');opts={};
    el.innerHTML='<b>Optional rules</b> (shown on the "after" step): '+Object.keys(o).map(k=>'<label class="chk"><input type="checkbox" data-o="'+k+'"'+(o[k].mask?'':' disabled')+'> '+esc(OPT[k]||k)+': '+fmt(o[k].n)+(o[k].mask?'':' (counts only)')+'</label>').join(' ')+
      '<div class="small mute" id="pt-fwhy"></div>';
    el.querySelectorAll('input').forEach(c=>c.addEventListener('change',()=>{opts[c.dataset.o]=c.checked;
      const why=Object.keys(opts).filter(k=>opts[k]).map(k=>{const v=o[k];let t=esc(OPT[k])+': '+fmt(v.n)+' rows';if(v.by_group)t+=' ('+Object.entries(v.by_group).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([g,n])=>esc(g.replace('tulu_v3.9_','').replace('_decontaminated_50k','').replace('synthetic_finalresp_','').replace('_v5_regen_149960','').replace('_100k',''))+' '+fmt(n)).join(', ')+')';return t+(OPTWHY[k]?': '+OPTWHY[k]:'')}).join('<br>');
      document.getElementById('pt-fwhy').innerHTML=why;A.go(steps().length+1)}))}
  function table(){const all=['sft','pref','rlvr','cosmo'],nm={sft:'SFT',pref:'Preference',rlvr:'RLVR',cosmo:'Cosmopedia'};
    let h='<table><thead><tr><th>Sample</th><th class="num">rows</th><th>removed, by rule (first rule that fires)</th><th class="num">removed</th><th>optional rules would remove</th></tr></thead><tbody>';
    all.forEach(d=>{const f=F[d];h+='<tr><td>'+nm[d]+'</td><td class="num">'+fmt(f.n)+'</td><td>'+(f.order.filter(r=>f.by_rule[r]).map(r=>esc(r.replace('_',' '))+' '+fmt(f.by_rule[r])).join(', ')||'none')+'</td><td class="num">'+fmt(f.removed)+' ('+pct(f.removed/f.n,1)+')</td><td>'+Object.entries(f.optional).map(([k,v])=>esc(OPT[k]||k)+' '+fmt(v.n)).join('; ')+'</td></tr>'});
    document.getElementById('pt-ftab').innerHTML=h+'</tbody></table>'}
  P.seg(document.getElementById('pt-fds'),m=>{ds=m;codes=codeOf();grp=groups();optUI();A.reset(steps().length+2)});
  optUI();table();P.onResize(()=>A.redraw());
})();
