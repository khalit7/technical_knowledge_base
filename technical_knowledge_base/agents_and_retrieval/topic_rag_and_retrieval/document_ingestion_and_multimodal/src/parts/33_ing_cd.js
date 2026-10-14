// ---- Re-indexing lab (t-ingcd): hash every chunk of the new version, embed only unseen hashes (data: ING.cd) ----
(function(){
  const C=window.ING&&ING.cd;const viz=document.getElementById('ing-cd-viz');if(!C||!viz)return;
  const P=x=>(x>0&&x<0.01?(100*x).toFixed(2):(100*x).toFixed(1))+'%';const NAMES={fixed:'Fixed 200 words',overlap:'Fixed, 50 overlap',structure:'Structure-aware',cdc:'Content-defined'};
  const ids=Object.keys(C.papers);let pid=C.detail&&C.papers[C.detail]?C.detail:ids[0],mode='fixed';
  const sel=document.getElementById('ing-cd-paper');
  sel.innerHTML=ids.map(p=>{const r=C.papers[p];return '<option value="'+p+'"'+(p===pid?' selected':'')+'>arXiv '+p+' v'+r.versions[0]+' to v'+r.versions[1]+' ('+P(r.words_changed/r.words_new)+' changed)</option>'}).join('');
  const card=document.getElementById('ing-cd-card');
  function draw(i){
    const r=C.papers[pid],m=r[mode],W=RD.width(viz),pad=4,rowH=26;
    const total=m.sizes.reduce((a,b)=>a+b,0);let x=0,body='';const sc=(W-2*pad)/total;
    // track 1: where the revision changed words (diff), on the same word axis
    body+=RD.t(pad,11,'Words the revision changed (difflib)',{fs:11,fill:'var(--mute)'});
    body+='<rect x="'+pad+'" y="15" width="'+(W-2*pad)+'" height="8" fill="var(--soft)" stroke="var(--line)"/>';
    const ws=(W-2*pad)/r.words_new;
    r.changes.forEach(c=>{body+='<rect x="'+(pad+c[0]*ws).toFixed(1)+'" y="15" width="'+Math.max(1.5,(c[1]-c[0])*ws).toFixed(1)+'" height="8" fill="var(--bad)"/>'});
    body+=RD.t(pad,40,'Chunks of the new version, '+NAMES[mode],{fs:11,fill:'var(--mute)'});
    let reW=0,reC=0,done=0;
    m.sizes.forEach((n,k)=>{const w=n*sc,dec=k<=i;const ok=m.flags[k];
      const c=!dec?'var(--dim)':ok?'var(--good)':'var(--c2)';
      body+='<rect x="'+(pad+x).toFixed(1)+'" y="44" width="'+Math.max(1,w-1).toFixed(1)+'" height="'+rowH+'" fill="'+c+'" fill-opacity="'+(dec?0.75:0.35)+'"'+(k===i?' stroke="var(--ink)" stroke-width="1.5"':'')+'/>';
      if(dec){done+=n;if(!ok){reW+=n;reC++}}x+=w});
    const fl=r.words_changed/r.words_new;
    body+='<line x1="'+(pad+fl*(W-2*pad)).toFixed(1)+'" x2="'+(pad+fl*(W-2*pad)).toFixed(1)+'" y1="78" y2="96" stroke="var(--ink)" stroke-dasharray="3 2"/>';
    const share=reW/r.words_new;
    body+='<rect x="'+pad+'" y="82" width="'+(share*(W-2*pad)).toFixed(1)+'" height="10" fill="var(--c2)"/>'+RD.t(pad,110,'Re-embedded so far: '+P(share)+' of words',{fs:11});
    viz.innerHTML=RD.svg(W,116,body,'Chunks reused or re-embedded');
    const st=RD.stat;
    document.getElementById('ing-cd-stats').innerHTML=st('Chunks decided',(i+1)+' / '+m.sizes.length,'old version had '+m.chunks_old)+st('Re-embedded',reC+' chunks',reW.toLocaleString()+' words')+st('Reused','' +(i+1-reC)+' chunks','vector kept, no model call')+st('Final share re-embedded',P(m.reembed_words/r.words_new),'dashed line, the floor: '+P(fl)+' of words changed ('+r.words_changed+' of '+r.words_new.toLocaleString()+')');
    const k=i,ok=m.flags[k];
    document.getElementById('ing-cd-cap').innerHTML='Chunk '+(k+1)+' ('+m.sizes[k]+' words): its SHA-256 '+(ok?'<b>is</b> in the old version\'s set, so its stored vector is reused.':'<b>is not</b> in the old version\'s set, so it is embedded again.');
  }
  const an=RD.anim({card:'ing-cd-card',ctl:'ing-cd-ctl',n:C.papers[pid][mode].sizes.length,draw,ms:260,label:'Chunk'});
  // RD.anim registers redraws on t-read; this tab redraws itself when shown
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-ingcd']=window.TAB_RENDER['t-ingcd']||[]).push(()=>{an.redraw();all()});
  RD.seg(document.getElementById('ing-cd-mode'),v=>{mode=v;an.reset(C.papers[pid][mode].sizes.length);an.go(C.papers[pid][mode].sizes.length-1)});
  sel.addEventListener('change',()=>{pid=sel.value;an.reset(C.papers[pid][mode].sizes.length);an.go(C.papers[pid][mode].sizes.length-1)});
  addEventListener('resize',()=>{if(!card.offsetParent)return;an.redraw();all()});
  function all(){
    const el=document.getElementById('ing-cd-all');if(!el.offsetParent&&el.innerHTML)return;
    let h='<div class="tw"><table><thead><tr><th>Paper</th><th class="num">Words changed</th>'+Object.keys(NAMES).map(s=>'<th class="num">'+NAMES[s]+'</th>').join('')+'</tr></thead><tbody>';
    ids.forEach(p=>{const r=C.papers[p];h+='<tr><td>'+p+' v'+r.versions[0]+'&rarr;v'+r.versions[1]+'</td><td class="num">'+(100*r.words_changed/r.words_new).toFixed(1)+'%</td>'+Object.keys(NAMES).map(s=>'<td class="num">'+(100*r[s].reembed_words/r.words_new).toFixed(1)+'%</td>').join('')+'</tr>'});
    const T=C.totals;h+='<tr><td><b>All '+ids.length+'</b></td><td class="num"><b>'+(100*T.floor_changed_word_share).toFixed(1)+'%</b></td>'+Object.keys(NAMES).map(s=>'<td class="num"><b>'+(100*T[s].reembed_word_share).toFixed(1)+'%</b></td>').join('')+'</tr></tbody></table></div>';
    el.innerHTML=h;
  }
  all();
  document.getElementById('ing-cd-note').innerHTML=C.note;
})();
