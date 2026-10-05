// ---- Benchmark tab: interpreter vs compiled code on the same characters (data: BM_DATA.breakdown, BM_DATA.loop_probe) ----
(function(){
  const D=window.BM_DATA;if(!D||!window.RD)return;
  const $=id=>document.getElementById(id);
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const text=D.breakdown.trace_short, ops=D.breakdown.trace_short_per_char, asm=D.loop_probe.cpp_scalar_asm;
  const chars=[...text];
  const bytes=chars.map(c=>new TextEncoder().encode(c).length);
  const isTok=c=>/[A-Za-z0-9]/.test(c);
  // step 0: nothing processed; step k: characters 0..k-1 processed, character k-1 is current
  const n=chars.length+1;
  let mode='both';
  function draw(k){
    const cur=k-1;
    $('bm-an-in').innerHTML=chars.map((c,i)=>{const start=isTok(c)&&(i===0||!isTok(chars[i-1]));
      return '<span class="'+(i===cur?'cur ':'')+(i<k&&start?'tok':'')+'">'+(c===' '?'&nbsp;':esc(c))+'<small>'+bytes[i]+' B</small></span>'}).join('');
    const o=cur>=0?ops[cur]:[];
    $('bm-an-pyops').innerHTML=cur<0?'<span>press Play or step</span>':o.map(x=>'<span class="on">'+esc(x)+'</span>').join('');
    $('bm-an-natops').innerHTML=cur<0?'<span>press Play or step</span>':(bytes[cur]>1?'<div class="small mute" style="width:100%">run '+bytes[cur]+' times, once per byte of <code>'+esc(chars[cur])+'</code></div>':'')+asm.map(x=>'<span class="on">'+esc(x)+'</span>').join('');
    let bc=0,mi=0,tk=0;for(let i=0;i<k;i++){bc+=ops[i].length;mi+=asm.length*bytes[i];if(isTok(chars[i])&&(i===0||!isTok(chars[i-1])))tk++}
    $('bm-an-ctr').innerHTML='<span>characters <b>'+Math.max(0,k)+' / '+chars.length+'</b></span><span>tokens so far <b>'+tk+'</b></span>'+
      (mode!=='nat'?'<span>bytecode instructions run <b>'+bc+'</b></span>':'')+(mode!=='py'?'<span>machine instructions run (scalar form) <b>'+mi+'</b></span>':'');
    let cap='';
    if(cur>=0){const c=chars[cur];
      if(!/[\x00-\x7f]/.test(c))cap='<code>'+esc(c)+'</code> is not ASCII: Python\'s <code>isascii()</code> is false, so <code>and</code> skips <code>isalnum()</code> ('+o.length+' instructions). C++ sees '+bytes[cur]+' bytes, each 0x80 or above, each a separator.';
      else if(isTok(c)&&(cur===0||!isTok(chars[cur-1])))cap='<code>'+esc(c)+'</code> starts a token: both method calls run, then <code>n += 1</code> ('+o.length+' bytecode instructions). The machine code does the same work with compares and a conditional select, no jump.';
      else if(isTok(c))cap='<code>'+esc(c)+'</code> continues a token: both calls run, no increment ('+o.length+' instructions).';
      else cap='<code>'+esc(c===' '?'space':c)+'</code> is a separator: <code>isalnum()</code> is false, no increment ('+o.length+' instructions).'}
    else cap='The input <code>'+esc(text)+'</code>: '+chars.length+' characters, '+bytes.reduce((a,b)=>a+b,0)+' bytes in UTF-8.';
    $('bm-an-cap').innerHTML=cap;
    $('bm-an-py').style.display=mode==='nat'?'none':'';$('bm-an-nat').style.display=mode==='py'?'none':'';
  }
  const A=RD.anim({card:'bm-an-card',ctl:'bm-an-ctl',n,draw,ms:1500,label:'Character'});
  RD.seg($('bm-an-mode'),m=>{mode=m;A.redraw()});
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-bench']=(window.TAB_RENDER['t-bench']||[]).concat([()=>A.redraw()]);
})();
