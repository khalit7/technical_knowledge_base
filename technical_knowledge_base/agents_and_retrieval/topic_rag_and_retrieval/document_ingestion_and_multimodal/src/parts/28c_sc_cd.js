// ---- Scene: Fig. 6, one revision under four chunkers (renderer v2). Data: ING.cd (src/scripts/change_detect.py: the revised QASPER papers, last two arXiv versions, both parsed by Docling).
// The new version's words run left to right (to scale); the red marks on the front strip are the words the revision changed; each chunk is a slab as wide as its words,
// green when its SHA-256 is already stored (its vector is reused), orange when it must go through the embedding model again. The last step is all ten papers. ----
(function(){
  if(!document.getElementById('stg-cd')||!window.ING||!ING.cd)return;const {mix,at,off,cl}=S3;
  const C=ING.cd,ids=Object.keys(C.papers),MODES=['fixed','overlap','structure','cdc'];
  const NAMES={fixed:'Fixed 200 words',overlap:'Fixed, 50 overlap',structure:'Structure-aware',cdc:'Content-defined'};
  let pid=C.detail&&C.papers[C.detail]?C.detail:ids[0];
  const X0=-4.5,LEN=9,ZS=1.55,ZC=.35,ZE=-.8,YE=.75,ZV=-2.0;
  const pc=x=>(x>0&&x<.01?(100*x).toFixed(2):(100*x).toFixed(1))+'%',fi=n=>n.toLocaleString('en-GB');
  function chunks(r,m){const d=r[m],sc=LEN/r.words_new;let s=0;return d.sizes.map((n,j)=>{const x=X0+s*sc,w=n*sc;s+=m==='overlap'?n-50:n;return {x,w,n,ok:!!d.flags[j],j}})}
  function draw(R,k,e){const P=R.P,r=C.papers[pid],sc=LEN/r.words_new;R.grid(-5.2,5.2,-2.4,2.4,.5);
    const sa=k===5?1-e:1;
    // the new version's words and what the revision changed
    R.box([0,0,ZS],[LEN,.05,.3],{fill:P.paper,a:sa,shadow:false});
    // a changed word is a hair's width at this scale, so each change also gets a pin and a glow (the first 24)
    r.changes.forEach((c,i)=>{const x=X0+(c[0]+c[1])/2*sc;R.box([x,.05,ZS],[Math.max(.05,(c[1]-c[0])*sc),.07,.3],{fill:P.bad,a:sa,shadow:false});
      if(i<24){R.box([x,.05,ZS],[.025,.35,.025],{fill:P.bad,a:sa*(k===0?e:1),shadow:false});R.glow([x,.42,ZS],.14,{c:P.bad,a:sa*(k===0?e:.8)})}});
    if(k<5){R.label([X0,.05,ZS],'v'+r.versions[1]+': '+fi(r.words_new)+' words',{al:'right',dx:-8,fs:12.5,c:P.mute,grp:'rows'});
      R.label([X0+(r.changes[0]?(r.changes[0][0]+r.changes[0][1])/2:0)*sc,.42,ZS],fi(r.words_changed)+(r.words_changed===1?' word':' words')+' changed',{fs:12.5,b:1,c:P.bad,dy:-12,a:k===0?e:1})}
    // the embedding model, and the vector store the chunks' vectors live in
    R.glass([X0,YE,ZE-.35],[LEN,0,0],[0,0,.7],{c:P.c2,a:k===0?.18:k===5?.25*(1-e):.55,nu:18,nv:2});
    R.glass([X0,.02,ZV-.35],[LEN,0,0],[0,0,.7],{c:P.c1,a:k===0?.25:k===5?.25*(1-e):.6,nu:18,nv:2});
    if(k>=1&&k<=4){R.label([X0,YE,ZE],'embedding model',{al:'right',dx:-8,fs:12.5,c:P.c2,grp:'rows'});R.label([X0,.02,ZV],'vector store',{al:'right',dx:-8,fs:12.5,c:P.c1,grp:'rows'})}
    // chunks of one strategy: they arrive left to right, each decided by its hash
    if(k>=1&&k<=4){const m=MODES[k-1],cs=chunks(r,m),n=cs.length;let re=0;
      cs.forEach(c=>{const aj=cl((e-.75*c.j/n)/.25,0,1);if(aj<=0)return;const z=m==='overlap'?ZC+(c.j%2?-.17:.17):ZC,d=m==='overlap'?.3:.62;
        R.box([c.x+c.w/2,0,z],[Math.max(.025,c.w-.03),.3,d],{fill:c.ok?mix(P.paper,P.good,.55):mix(P.paper,P.c2,.75),a:aj,shadow:n<60,lw:.6});
        if(!c.ok){re+=c.n;const top=[c.x+c.w/2,.32,z];R.flowArc(top,[c.x+c.w/2,YE,ZE],.45,{c:P.c2,a:aj,n:Math.max(2,Math.round(c.w*3)),speed:1.2,r:.05})}});
      if(re>0)R.flowArc([0,YE,ZE],[0,.1,ZV],.4,{c:P.c2,a:e,n:Math.max(3,Math.round(12*re/r.words_new)),speed:1.2,r:.06});
      R.label([X0,.3,ZC],NAMES[m],{al:'right',dx:-8,fs:12.5,b:1,grp:'rows'});
      const d=r[m];R.label([0,YE+.05,ZE],d.reembed_chunks+' of '+d.chunks_new+' chunks embedded again',{fs:12.5,b:1,c:P.c2,dy:-12,a:e})}
    // all ten papers: share of words re-embedded per strategy, against the floor (words really changed)
    if(k===5){const T=C.totals,H=4;MODES.forEach((m,i)=>{const x=-3+i*2,v=T[m].reembed_word_share;
        R.box([x,0,0],[1.1,.06,.9],{a:e,shadow:false});R.box([x,.06,0],[.8,v*H*e,.6],{fill:i<2?mix(P.paper,P.c2,.75):mix(P.paper,P.good,.6),a:e});
        R.label([x,.06+v*H*e,0],pc(v),{fs:13,b:1,mono:true,dy:-16,a:e});R.label([x,0,.5],NAMES[m],{fs:12.5,dy:14,a:e})});
      const f=T.floor_changed_word_share*H;R.glass([-4.3,f,-.8],[8.6,0,0],[0,0,1.6],{c:P.bad,a:e*.8,nu:12,nv:2});
      R.label([-4.3,f,.8],'floor: '+pc(T.floor_changed_word_share)+' changed',{al:'right',dx:-6,fs:12.5,b:1,c:P.bad,a:e})}
  }
  function readout(k){const el=document.getElementById('ing-cd-read');if(!el)return;const r=C.papers[pid];
    let h='arXiv '+pid+' v'+r.versions[0]+' to v'+r.versions[1]+': '+fi(r.words_changed)+' of '+fi(r.words_new)+' words changed ('+pc(r.words_changed/r.words_new)+', the floor).';
    if(k>=1&&k<=4){const m=MODES[k-1],d=r[m];h+=' <b>'+NAMES[m]+'</b>: '+d.reembed_chunks+' of '+d.chunks_new+' chunks embedded again, '+pc(d.reembed_words/r.words_new)+' of words'+(m==='overlap'?' (overlapping words counted in each chunk)':'')+'; the old version had '+d.chunks_old+' chunks.'}
    else if(k===5)h='All '+ids.length+' revised papers: fixed windows '+pc(C.totals.fixed.reembed_word_share)+', with overlap '+pc(C.totals.overlap.reembed_word_share)+', structure-aware '+pc(C.totals.structure.reembed_word_share)+', content-defined '+pc(C.totals.cdc.reembed_word_share)+' of words re-embedded; floor '+pc(C.totals.floor_changed_word_share)+'.';
    el.innerHTML=h}
  const sel=document.getElementById('ing-cd-paper');
  if(sel){sel.innerHTML=ids.map(p=>{const r=C.papers[p];return '<option value="'+p+'"'+(p===pid?' selected':'')+'>arXiv '+p+' v'+r.versions[0]+' to v'+r.versions[1]+' ('+pc(r.words_changed/r.words_new)+' changed)</option>'}).join('')}
  const full={cam:[.18,.95],bounds:[[-5.2,0,-2.4],[5,1.2,1.9]]};
  const st=S3.stage({id:'stg-cd',list:'sx-cd',fig:'Fig. 6 · one revision, four chunkers',cam:full.cam,bounds:full.bounds,aspect:.55,dur:1700,hold:5200,draw,
    margin:w=>w<520?[12,8,12,8]:[16,14,14,150],
    view:k=>k===5?{cam:[.3,.42],bounds:[[-5.2,0,-1],[4.4,3.2,1]]}:full,onStep:k=>{try{readout(k)}catch(e){}}});
  if(sel&&st)sel.addEventListener('change',()=>{pid=sel.value;readout(st.st.k);st.list('sx-cd')});
  readout(0);
  // the closed block's table: every revised paper, re-embedded share per strategy
  const el=document.getElementById('ing-cd-all');
  if(el){let h='<div class="tw"><table><thead><tr><th>Paper</th><th class="num">Words changed</th>'+MODES.map(s=>'<th class="num">'+NAMES[s]+'</th>').join('')+'</tr></thead><tbody>';
    ids.forEach(p=>{const r=C.papers[p];h+='<tr><td>'+p+' v'+r.versions[0]+'&rarr;v'+r.versions[1]+'</td><td class="num">'+(100*r.words_changed/r.words_new).toFixed(1)+'%</td>'+MODES.map(s=>'<td class="num">'+(100*r[s].reembed_words/r.words_new).toFixed(1)+'%</td>').join('')+'</tr>'});
    const T=C.totals;h+='<tr><td><b>All '+ids.length+'</b></td><td class="num"><b>'+(100*T.floor_changed_word_share).toFixed(1)+'%</b></td>'+MODES.map(s=>'<td class="num"><b>'+(100*T[s].reembed_word_share).toFixed(1)+'%</b></td>').join('')+'</tr></tbody></table></div>';
    el.innerHTML=h}
})();
