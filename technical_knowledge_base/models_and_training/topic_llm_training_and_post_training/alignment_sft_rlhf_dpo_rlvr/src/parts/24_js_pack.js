// ---- Reading, Packing: eight real conversations padded (before) or packed into 4,096-token rows (after) ----
(function(){
  const $=id=>document.getElementById(id);if(!$('pk'))return;
  const D=window.AL_DATA,B=D.sft.batch,M=D.maxlen;
  const COL=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)','var(--good)','var(--closed)'];
  const fmt=x=>Math.round(x).toLocaleString('en-US');
  const pct=x=>(100*x).toFixed(1)+'%';
  // best-fit decreasing into rows of M, as recompute.py
  function bfd(){const bins=[];B.map((b,i)=>({i,t:b.t})).sort((a,b)=>b.t-a.t).forEach(it=>{let best=null;
      bins.forEach(bn=>{if(bn.free>=it.t&&(!best||bn.free<best.free))best=bn});
      if(!best){best={free:M,items:[]};bins.push(best)}best.items.push(it.i);best.free-=it.t});return bins}
  const BINS=bfd();
  const tri=n=>n*(n+1)/2;
  const sumT=B.reduce((a,b)=>a+b.t,0),sumL=B.reduce((a,b)=>a+b.l,0),mx=Math.max(...B.map(b=>b.t));
  // cross-document causal pairs in the packed rows, and all causal pairs computed
  let cross=0,allPk=0;BINS.forEach(bn=>{let before=0;bn.items.forEach(i=>{const l=B[i].t;cross+=l*before;allPk+=tri(l)+l*before;before+=l})});
  const ownPairs=B.reduce((a,b)=>a+tri(b.t),0);
  const STEPS={
    pad:[
      {t:'Eight conversations',p:'Eight rows of the Tulu 3 SFT mixture, from '+fmt(Math.min(...B.map(b=>b.t)))+' to '+fmt(mx)+' tokens. Each bar is drawn against a 4,096-token row; the solid part of each is the graded answer.',v:'raw'},
      {t:'Pad every row to the longest',p:'A batch is a rectangle: each conversation gets its own row, filled with padding up to the longest one ('+fmt(mx)+' tokens). The GPU computes every padded position and then throws the result away.',v:'pad'},
      {t:'Attention stays inside each row',p:'Each row holds one conversation, so the causal mask never mixes conversations; padding is masked out of attention and loss. Correct, and wasteful: '+pct(1-sumT/(8*mx))+' of the positions computed are padding.',v:'pad',mask:1},
      {t:'Grade the answers',p:'Only the answer tokens carry loss: '+fmt(sumL)+' of '+fmt(sumT)+' real tokens ('+pct(sumL/sumT)+'). The padded batch spends '+fmt(8*mx)+' positions to grade them.',v:'pad',mask:1,loss:1}],
    pack:[
      {t:'Eight conversations',p:'The same eight conversations, the same 4,096-token budget per row.',v:'raw'},
      {t:'Pack them into full rows',p:'Best-fit decreasing: the longest goes first into the row with the least room that still fits it. Eight conversations fit in '+BINS.length+' rows instead of 8, and only the end of each row is left empty. With just eight conversations the second row is mostly empty; over the whole 1,000-row sample packed rows are '+pct(D.sft.pack_eff)+' full.',v:'pack'},
      {t:'A plain causal mask leaks',p:'With the ordinary causal mask, every token can attend to the conversations packed before it in its row: '+pct(cross/allPk)+' of the attention pairs computed here cross a boundary. The model learns from text it will never see together at inference time.',v:'pack',mask:1,leak:1},
      {t:'Restart at each boundary',p:'Restart the position ids at each conversation and give the kernel the boundaries (FlashAttention\'s variable-length mode): attention becomes block-diagonal, exactly as if each conversation had its own row, with no padding computed.',v:'pack',mask:1},
      {t:'Grade the answers',p:'The same '+fmt(sumL)+' graded tokens, now for '+fmt(BINS.length*M)+' positions instead of '+fmt(8*mx)+'. Packing changes the number of conversations per step, so keep the loss a sum over tokens (section on sum or mean) for the step size to mean the same thing.',v:'pack',mask:1,loss:1}]};
  let mode='pad',A;
  const parts=(b,c)=>{const p=100*(b.t-b.l)/b.t;return '<span style="left:0;width:'+p+'%;background:'+c+';opacity:.38"></span><span style="left:'+p+'%;right:0;background:'+c+'"></span>'};
  function rows(st){
    let h='';
    if(st.v==='raw'||st.v==='pad'){
      B.forEach((b,i)=>{h+='<div class="pk-row"><span>#'+(i+1)+'</span><div class="pk-bar">'+
        '<div class="pk-seg" style="left:0;width:'+(100*b.t/M)+'%">'+parts(b,COL[i])+'</div>'+
        (st.v==='pad'?'<div class="pk-pad" style="left:'+(100*b.t/M)+'%;width:'+(100*(mx-b.t)/M)+'%"></div>':'')+'</div></div>'})}
    else{BINS.forEach((bn,r)=>{let x=0,segs='';bn.items.forEach(i=>{const b=B[i];
        segs+='<div class="pk-seg" title="#'+(i+1)+', '+fmt(b.t)+' tokens" style="left:'+(100*x/M)+'%;width:'+(100*b.t/M)+'%">'+parts(b,COL[i])+'</div>';x+=b.t});
        segs+='<div class="pk-pad" style="left:'+(100*x/M)+'%;width:'+(100*(M-x)/M)+'%"></div>';
        h+='<div class="pk-row"><span>row '+(r+1)+'</span><div class="pk-bar">'+segs+'</div></div>'})}
    return h}
  // an attention-mask thumbnail for one row: query positions down, key positions across
  let hid=0;
  function maskSvg(items,lenRow,leak,title){const pid='pkH'+(hid++);
    const W=Math.min(260,Math.max(180,RD.width($('pkMask'))/ (mode==='pack'?BINS.length:1) - 12)),s=W/lenRow;let g='',x=0;
    const bnd=[];items.forEach(it=>{bnd.push([x,it.t,it.c]);x+=it.t});
    // computed causal lower triangle
    g+='<path d="M0 0 L0 '+W+' L'+W+' '+W+' Z" fill="var(--soft)"/>';
    bnd.forEach(([x0,l,c],k)=>{
      // own block: triangle
      g+='<path d="M'+(x0*s)+' '+(x0*s)+' L'+(x0*s)+' '+((x0+l)*s)+' L'+((x0+l)*s)+' '+((x0+l)*s)+' Z" fill="'+c+'" opacity=".8"/>';
      if(leak&&x0>0)g+='<rect x="0" y="'+(x0*s)+'" width="'+(x0*s)+'" height="'+(l*s)+'" fill="var(--bad)" opacity=".55"/>'});
    if(x<lenRow)g+='<rect x="0" y="'+(x*s)+'" width="'+W+'" height="'+((lenRow-x)*s)+'" fill="url(#'+pid+')" opacity=".8"/><rect x="'+(x*s)+'" y="0" width="'+((lenRow-x)*s)+'" height="'+W+'" fill="url(#'+pid+')" opacity=".8"/>';
    return '<div><svg width="'+W+'" height="'+W+'" viewBox="0 0 '+W+' '+W+'" role="img" aria-label="'+RD.esc(title)+'"><defs><pattern id="'+pid+'" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="3" height="6" fill="var(--dim)"/></pattern></defs>'+g+'</svg><div class="small mute">'+title+'</div></div>'}
  function draw(i){
    const st=STEPS[mode][i];
    $('pkM').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.m===mode));
    $('pkR').innerHTML=rows(st);
    $('pkL').innerHTML='<span><i style="background:var(--c1)"></i>conversation: faint part read only, solid part graded</span><span><i style="background:repeating-linear-gradient(45deg,var(--dim) 0 3px,transparent 3px 7px)"></i>padding, computed and discarded</span>'+(st.mask&&st.leak?'<span><i style="background:var(--bad);opacity:.6"></i>attention across conversations</span>':'');
    let mk='';
    if(st.mask){if(mode==='pad'){const b=B[3];mk=maskSvg([{t:b.t,c:COL[3]}],mx,0,'Attention in row #4 of '+fmt(mx)+' positions: one conversation, the rest padding')+
        maskSvg([{t:B[6].t,c:COL[6]}],mx,0,'Row #7: '+fmt(B[6].t)+' real tokens of '+fmt(mx))}
      else BINS.forEach((bn,r)=>{mk+=maskSvg(bn.items.map(k=>({t:B[k].t,c:COL[k]})),M,st.leak,'Row '+(r+1)+(st.leak?': plain causal mask':': block-diagonal mask'))})}
    $('pkMask').innerHTML=mk;
    let comp,real=sumT,cr=0,att;
    if(st.v==='raw'){comp=null}else if(mode==='pad'){comp=8*mx;att=8*tri(mx)}else{comp=BINS.length*M;cr=st.leak?cross:0;att=st.leak?allPk:ownPairs}
    $('pkN').innerHTML=RD.stat('Rows',st.v==='raw'?8:(mode==='pad'?8:BINS.length),mode==='pad'?'one per conversation':'of 4,096 positions')+
      RD.stat('Positions computed',comp?fmt(comp):'not yet',comp?pct(real/comp)+' real tokens':'')+
      RD.stat('Attention pairs across conversations',st.mask?fmt(cr):'not yet',st.mask?(cr?pct(cr/att)+' of the pairs computed':'none'):'')+
      RD.stat('Tokens graded',st.loss?fmt(sumL):'not yet',st.loss?pct(sumL/sumT)+' of real tokens':'');
    $('pkC').innerHTML='<div class="t">'+(i+1)+' of '+STEPS[mode].length+' · '+st.t+'</div>'+st.p;
  }
  A=RD.anim({card:'pk',ctl:'pkCtl',n:STEPS.pad.length,draw,ms:2600,label:'Step'});
  $('pkM').addEventListener('click',e=>{const b=e.target.closest('button[data-m]');if(!b)return;mode=b.dataset.m;A.reset(STEPS[mode].length);A.play()});
  window.addEventListener('resize',()=>A.redraw());
})();
