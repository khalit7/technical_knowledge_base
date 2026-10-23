// ---- Reading section 5: the same edited prompt with and without --cache-reuse (LO.reuse, measured by scripts/srvlab.py) ----
(function(){
  const el=document.getElementById('lo-cr-svg');if(!el||!window.LO||!LO.reuse)return;
  const R=LO.reuse;let mode='off';
  const S=R.S,A=R.A,B=R.B;
  const caps={off:[
    ['Request 1 is in the slot','The slot holds the keys and values of request 1: the system text ('+S+' tokens), document A ('+A+') and document B with the question ('+B+').'],
    ['Request 2 arrives without document A','The new prompt is the system text, then document B and the question. It shares the first '+S+' tokens with the cache.'],
    ['Keep the common prefix, drop the rest','Prompt caching compares from the start: everything up to the first different token is kept; everything after it is thrown away, including document B, which is still in the new prompt.'],
    ['Recompute what follows','The server computes the '+R.off.prompt_n+' tokens after the prefix again: '+R.off.prompt_ms+' ms of prefill (measured).'],
    ['Result','Reused '+R.off.cache_n+' tokens, computed '+R.off.prompt_n+'. Exact: identical to a fresh run.']],
  on:[
    ['Request 1 is in the slot','Same slot, same cache: system text ('+S+'), document A ('+A+'), document B with the question ('+B+').'],
    ['Request 2 arrives without document A','Same new prompt. The common prefix is again the first '+S+' tokens.'],
    ['Keep the prefix, then look further','With <code>--cache-reuse 256</code> the server scans the rest of the old cache for runs of at least 256 tokens that match the new prompt in order.'],
    ['Shift the matching chunk','Document B and the question match. Their cached keys and values are moved '+A+' positions earlier (the keys re-rotated to their new positions) instead of being recomputed.'],
    ['Result','Reused '+R.on.cache_n+' tokens, computed '+R.on.prompt_n+': '+R.on.prompt_ms+' ms of prefill instead of '+R.off.prompt_ms+'. Approximate: document B\'s keys and values were computed after document A, not after the system text.']]};
  function draw(i){
    const W=Math.max(300,Math.min(860,RD.width(el))),H=W<480?150:160,L=W<480?54:80,Rm=10,tot=S+A+B,X=v=>L+(W-L-Rm)*v/tot;
    const bar=(x0,len,y,c,lab,op,dash)=>{const w=X(len)-L;return '<rect x="'+x0.toFixed(1)+'" y="'+y+'" width="'+Math.max(0,w).toFixed(1)+'" height="26" fill="'+c+'" opacity="'+(op==null?1:op)+'"'+(dash?' stroke="var(--bad)" stroke-dasharray="4 3" stroke-width="2"':'')+'/>'+(w>34?RD.t(x0+w/2,y+17,lab,{a:'middle',fs:10.5,fill:'var(--bg)'}):'')};
    let b=RD.t(4,38,'slot cache',{fs:10.5,fill:'var(--mute)'})+RD.t(4,98,'request 2',{fs:10.5,fill:'var(--mute)'});
    // cache row
    const gone=i>=2;
    b+=bar(L,S,20,'var(--c1)','system',i>=2?1:0.85);
    if(mode==='off'){b+=bar(X(S),A,20,'var(--c2)','doc A',gone?0.2:0.85,gone);b+=bar(X(S+A),B,20,'var(--c3)','doc B + q',gone?0.2:0.85,gone)}
    else{if(i<3)b+=bar(X(S),A,20,'var(--c2)','doc A',gone?0.2:0.85,gone);
      if(i<3)b+=bar(X(S+A),B,20,'var(--c3)','doc B + q',0.85);
      else{b+=bar(X(S),B,20,'var(--c3)','doc B + q (moved)',1);b+='<path d="M'+X(S+A+B/2)+' 18 C '+X(S+A+B/2)+' 4, '+X(S+B/2)+' 4, '+X(S+B/2)+' 18" fill="none" stroke="var(--ink)" stroke-width="1.5" marker-end="url(#lo-arr)"/>'}}
    // request row
    if(i>=1){b+=bar(L,S,80,'var(--c1)','system',1);
      const comp=mode==='off'?(i>=3):false;
      b+=bar(X(S),B,80,comp?'var(--bad)':'var(--c3)',comp?'computed again':'doc B + q',i>=3?1:0.5)}
    if(i>=2)b+='<line x1="'+X(S)+'" x2="'+X(S)+'" y1="14" y2="112" stroke="var(--ink)" stroke-dasharray="2 2"/>'+RD.t(X(S)+3,124,'first difference',{fs:10,fill:'var(--mute)'});
    b='<defs><marker id="lo-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--ink)"/></marker></defs>'+b;
    b+=RD.t(L,H-6,'bars to scale: '+tot.toLocaleString('en-US')+' tokens in request 1',{fs:10,fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,b,'cache reuse '+mode);
    const c=caps[mode][i];document.getElementById('lo-cr-cap').innerHTML='<div class="t">'+(i+1)+'/5 '+c[0]+'</div><p>'+c[1]+'</p>';
    const M=R[mode];document.getElementById('lo-cr-cnt').innerHTML=RD.stat('tokens reused',i>=4?M.cache_n:'&ndash;','from the slot')+RD.stat('tokens computed',i>=3?M.prompt_n:'&ndash;','prefill work')+RD.stat('prefill time',i>=3?M.prompt_ms+' ms':'&ndash;','measured, first repeat');
  }
  const AN=RD.anim({card:'lo-cr',ctl:'lo-cr-ctl',n:5,draw,ms:1900,label:'Cache reuse step'});
  RD.seg(document.getElementById('lo-cr-seg'),m=>{mode=m;AN.reset(5)});
  RD.onResize(()=>AN.redraw());
})();
