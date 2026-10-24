// ---- Tool map: same input through datatrove and Dolma (before/after per stage), storage sizes, packing ----
(function(){
  const {D,$,esc,stat,anim,onRender,onResize,width,toolLink}=TM;
  const fmtB=b=>b>=1e9?(b/1e9).toFixed(2)+' GB':b>=1e6?(b/1e6).toFixed(2)+' MB':b>=1e3?(b/1e3).toFixed(1)+' kB':b+' B';
  const pend=(what,cmd)=>'<div class="tm-pend"><b>Pending:</b> '+what+(cmd?'<br><code>'+esc(cmd)+'</code>':'')+'</div>';
  // ---------------- toy pipeline ----------------
  const T=D.toy_check;
  if(!T){$('tm-tcard').innerHTML=pend('the toy run of datatrove and the Dolma toolkit waits for the shared environment (setup READY). The scripts are in src/map/toy/.','python -I toy_datatrove.py toy_docs.jsonl <work> out.json; python -I toy_dolma.py toy_docs.jsonl <work> out.json');}
  else{
    const docs=T.docs,ids=docs.map(d=>d.id);
    // stage lists: [key, label, caption, predicate(fate)->dropped at or before this stage]
    const DT=T.datatrove,DM=T.dolma;
    const dtStages=[['in','Input','Twelve documents go in. datatrove streams each one through the steps in order; a filter that rejects a document sends it to that filter\'s exclusion writer, so every drop is kept with its reason.']]
      .concat(DT.stages.map(s=>[s[0],s[1],T.capt.dt[s[0]]||''])).concat([['out','Output',T.capt.dt.out]]);
    const dmGroups=[['in','Input','The same twelve documents. The Dolma toolkit does not drop anything while it tags.'],
      ['tag','Tag',T.capt.dm.tag],['dedupe','Dedupe (Bloom filters)',T.capt.dm.dedupe],
      ['gopher','Mix: Gopher rules',T.capt.dm.gopher],['c4','Mix: C4 rules',T.capt.dm.c4],['bloom','Mix: duplicate documents',T.capt.dm.bloom],['spans','Mix: span replacement',T.capt.dm.spans],['out','Output',T.capt.dm.out]];
    const dmOrder=['in','tag','dedupe','gopher','c4','bloom','spans','out'];
    const dmKey=r=>!r.dropped_at?null:r.dropped_at==='emptied'?'spans':/^gopher/.test(r.reason||'')?'gopher':/^c4/.test(r.reason||'')?'c4':/^Bloom/.test(r.reason||'')?'bloom':'spans';
    let mode='dt';
    function fate(i,step){ // returns {out:bool, why:string, changed:bool, now:bool}
      if(mode==='dt'){const r=DT.docs[i],st=dtStages[step][0],order=dtStages.map(s=>s[0]);
        const at=r.dropped_at?order.indexOf(r.dropped_at):99;
        return {out:at<=step,now:at===step,why:r.dropped_at?(T.reasons.dt[i]||r.dropped_at):(r.changed&&step>=order.indexOf('c4')?'kept, text changed':''),changed:!r.dropped_at&&r.changed&&step>=order.length-1}}
      const r=DM.docs[i],k=dmKey(r),at=k?dmOrder.indexOf(k):99;
      return {out:at<=step&&!!r.dropped_at,now:at===step,why:r.dropped_at?(T.reasons.dm[i]||r.reason||''):(r.changed&&step>=dmOrder.indexOf('spans')?'kept, spans removed':''),changed:false};
    }
    const stages=()=>mode==='dt'?dtStages:dmGroups;
    function draw(step){
      const S=stages();step=Math.min(step,S.length-1);
      let kept=0;
      $('tm-tdocs').innerHTML=docs.map(d=>{const f=fate(d.id,step);if(!f.out)kept++;
        return '<div class="tm-doc'+(f.out?' out':'')+(f.now?' now':'')+'"><span class="id">'+d.id+' <span class="mute" style="font-weight:400">'+esc(d.design)+'</span></span><span class="tx">'+esc(d.excerpt)+'</span><span class="why">'+(f.out||f.why?esc(f.why):'')+'</span></div>'}).join('');
      $('tm-tcap').innerHTML='<b>'+(step+1)+'/'+S.length+' '+esc(S[step][1])+'.</b> '+S[step][2];
      const R=mode==='dt'?DT:DM;
      $('tm-tcnt').innerHTML=stat('Documents kept',kept+' of '+docs.length,'after this step')+stat('Toolkit',esc(R.tool)+' '+esc(R.version),'run '+esc(T.date))+stat('Wall time',R.seconds+' s','toy, one process; not a benchmark');
    }
    const A=anim({card:'tm-tcard',ctl:'tm-tctl',n:dtStages.length,ms:1700,label:'Stage',draw});
    $('tm-tmode').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;mode=b.dataset.m;$('tm-tmode').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));A.reset(stages().length)});
    // comparison table
    const fin=(r,dm)=>!r.dropped_at?(r.changed?'kept, changed':'kept'):(dm?(T.reasons.dm[r.id]||r.reason):(T.reasons.dt[r.id]||r.dropped_at));
    $('tm-tdiff').innerHTML='<div class="tm-tw"><table class="tm-t"><thead><tr><th>Document</th><th>Built to test</th><th>datatrove</th><th>Dolma toolkit</th></tr></thead><tbody>'+
      docs.map(d=>{const a=DT.docs[d.id],b=DM.docs[d.id],same=(!a.dropped_at)===(!b.dropped_at);
        return '<tr'+(same?'':' class="hl"')+'><td>'+d.id+'</td><td>'+esc(d.design)+'</td><td>'+esc(fin(Object.assign({id:d.id},a),false))+'</td><td>'+esc(fin(Object.assign({id:d.id},b),true))+'</td></tr>'}).join('')+
      '</tbody></table></div><div class="co key"><div class="t">What the run shows</div><p>'+T.summary+'</p></div>';
  }
  // ---------------- storage sizes ----------------
  const S=D.storage;
  if(!S){$('tm-sizes').innerHTML=pend('the size of the same documents in each format, measured on the running example, waits for setup READY (script src/map/storage/storage_sizes.py).');
    if($('tm-pcard'))$('tm-pcard').innerHTML+=pend('the packing animation uses the running example\'s token counts (same script).');return}
  const mx=Math.max(...S.sizes.map(s=>s.bytes));
  $('tm-sizes').innerHTML='<div class="tm-box"><h3 style="margin-top:0">The same '+S.n_docs.toLocaleString('en-US')+' documents in each format <span class="tm-lbl m">measured</span></h3><p class="small">'+S.note+'</p><div class="tm-bars">'+
    S.sizes.map(s=>'<div><span class="nm">'+esc(s.label)+'</span><span class="tr"><span style="width:'+(100*s.bytes/mx).toFixed(1)+'%;background:'+(s.kind==='tok'?'var(--c4)':'var(--acc)')+'"></span></span><span class="v">'+fmtB(s.bytes)+'</span></div>').join('')+'</div><p class="small mute">'+S.reading+'</p></div>';
  // ---------------- packing: card retired 2026-10-24 (Storage and loading, section 6, owns it); kept behind a guard ----------------
  if($('tm-pcard')){const P=S.pack;let pm='pad';
  function pdraw(step){
    const host=$('tm-pplot'),W=Math.max(300,Math.floor(width(host))),L=P.demo.L,lens=P.demo.lens;
    // build windows
    let wins=[];
    if(pm==='pad'){lens.forEach((n,i)=>{let left=n,part=0;while(left>0){const t=Math.min(L,left);wins.push([[i,t,part>0]]);left-=t;part++}})}
    else{let cur=[],room=L;lens.forEach((n,i)=>{let left=n+1,part=0;while(left>0){const t=Math.min(room,left);cur.push([i,t,part>0]);left-=t;room-=t;part++;if(room===0){wins.push(cur);cur=[];room=L}}});if(cur.length)wins.push(cur)}
    const shown=Math.min(wins.length,step+1),rowH=18,gap=4,lab=58,bw=W-lab-6,H=wins.length*(rowH+gap)+16;
    let s='';const cols=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)'];
    wins.forEach((w,r)=>{const y=r*(rowH+gap)+4,on=r<shown;let x=lab;
      s+='<text x="0" y="'+(y+13)+'" font-size="11" fill="var(--mute)">window '+(r+1)+'</text><rect x="'+lab+'" y="'+y+'" width="'+bw+'" height="'+rowH+'" fill="var(--soft)" stroke="var(--line)"/>';
      if(on)w.forEach(([i,t])=>{const ww=bw*t/L;s+='<rect x="'+x.toFixed(1)+'" y="'+y+'" width="'+Math.max(0.5,ww-0.5).toFixed(1)+'" height="'+rowH+'" fill="'+cols[i%6]+'" opacity=".85"/>'+(ww>26?'<text x="'+(x+4).toFixed(1)+'" y="'+(y+13)+'" font-size="10.5" fill="var(--bg)">d'+(i+1)+'</text>':'');x+=ww});
    });
    host.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Documents laid into context windows">'+s+'</svg>';
    const used=wins.slice(0,shown).reduce((a,w)=>a+w.reduce((b,x)=>b+x[1],0),0),cap=shown*L;
    $('tm-pcap').innerHTML='<b>'+(pm==='pad'?'One document per window':'Packed')+', window '+Math.min(shown,wins.length)+' of '+wins.length+'.</b> '+(pm==='pad'?'Each document starts a new window of '+L.toLocaleString('en-US')+' tokens; a long one is split across several, and the rest of each window is padding (grey).':'Documents are laid end to end with one end-of-document token between them; a window starts wherever the previous one ended, so a document can be cut in two.');
    const Wn=P.windows.find(x=>x.L===L)||P.windows[0];
    $('tm-pcnt').innerHTML=stat('Real tokens in the windows shown',(100*used/cap).toFixed(1)+'%',used.toLocaleString('en-US')+' of '+cap.toLocaleString('en-US'))+
      stat('All '+S.n_docs.toLocaleString('en-US')+' documents, '+L.toLocaleString('en-US')+'-token windows',(pm==='pad'?(100*(1-Wn.pad_frac)).toFixed(1):(100*Wn.pack_fill).toFixed(1))+'% real',(pm==='pad'?Wn.n_pad:Wn.n_pack).toLocaleString('en-US')+' windows')+
      stat('Window length',L.toLocaleString('en-US')+' tokens',esc(S.tokenizer));
    return wins.length;
  }
  const nWin=m=>{const o=pm;pm=m;const n=pdraw(0);pm=o;return n};
  const PA=anim({card:'tm-pcard',ctl:'tm-pctl',n:nWin('pad'),ms:900,label:'Window',draw:pdraw});
  $('tm-pmode').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;pm=b.dataset.m;$('tm-pmode').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));PA.reset(nWin(pm))});
  onRender(()=>PA.redraw());onResize(()=>PA.redraw());}
  $('tm-loader').innerHTML='<div class="co"><div class="t">How a training loader reads the shards</div><p>'+S.loader+'</p></div>';
})();
