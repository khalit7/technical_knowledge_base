// ---- Section 10: the real handler refactored step by step, against one rewrite (data: CD.steps from refactor/run_steps.py) ----
(function(){
  const CD=window.CD, esc=RD.esc;
  const STEPS=CD.steps.filter(s=>s.step!=='bigbang'), BANG=CD.steps.find(s=>s.step==='bigbang');
  let mode='steps', seq=STEPS;
  const $=id=>document.getElementById(id);
  function chart(cur){
    const el=$('rf-chart'),W=Math.min(860,RD.width(el)),H=140,padL=6,padR=6,top=8,bot=30;
    const pts=STEPS.concat([BANG]),n=pts.length,bw=(W-padL-padR)/n;
    const maxL=Math.max(...pts.map(p=>p.handler_lines)),maxC=10;
    const yL=v=>top+(H-top-bot)*(1-v/maxL),yC=v=>top+(H-top-bot)*(1-v/maxC);
    let b='';
    pts.forEach((p,i)=>{const x=padL+i*bw,on=p===cur,bang=p.step==='bigbang',dim=(mode==='steps'&&bang)||(mode==='bang'&&!bang&&p.step!==0);
      const op=dim?0.25:1;
      b+='<rect x="'+(x+bw*0.18)+'" y="'+yL(p.handler_lines)+'" width="'+(bw*0.64)+'" height="'+(H-bot-yL(p.handler_lines))+'" fill="var('+(bang?'--bad':'--acc2')+')" stroke="'+(on?'var(--ink)':'none')+'" stroke-width="2" opacity="'+op+'"/>';
      b+='<circle cx="'+(x+bw/2)+'" cy="'+yC(p.cc_handler)+'" r="'+(on?5:3.5)+'" fill="var(--c4)" opacity="'+op+'"/>';
      if(p.passed<p.total)b+=RD.t(x+bw/2,H-bot+24,'&#10007;',{a:'middle',fs:11,fill:'var(--bad)'});
      b+=RD.t(x+bw/2,H-bot+12,bang?'R':String(p.step),{a:'middle',fs:10,fill:on?'var(--ink)':'var(--mute)',w:on?700:400});
    });
    el.innerHTML=RD.svg(W,H,b,'Handler length and complexity per step');
  }
  function draw(i){
    const s=seq[i],prev=i>0?seq[i-1]:null,bang=s.step==='bigbang';
    $('rf-cap').innerHTML='<div class="t">'+(bang?'One rewrite':'Step '+s.step)+': '+esc(s.title)+'</div><p>'+esc(s.why)+'</p>'+
      (s.fails.length?'<p style="color:var(--bad)"><b>'+s.fails.length+' failing:</b> '+s.fails.map(f=>'<code>'+esc(f.name)+'</code>').join(', ')+'</p>':'');
    const d=(k,fmt)=>prev?(s[k]===prev[k]?'unchanged':(s[k]<prev[k]?'down from ':'up from ')+prev[k]):'start';
    $('rf-cnt').innerHTML=RD.stat('Handler lines',s.handler_lines,d('handler_lines'))+RD.stat('Complexity (McCabe)',s.cc_handler,d('cc_handler'))+
      RD.stat('Tests passing',s.passed+' / '+s.total,s.passed<s.total?'<span style="color:var(--bad)">red: stop and look</span>':'green')+
      RD.stat('Functions in file',s.n_funcs,d('n_funcs'))+RD.stat('ruff findings',s.ruff.length,s.ruff.join(', ')||'none');
    const failing=new Set(s.fails.map(f=>f.name));
    $('rf-tests').innerHTML='<div class="tp" role="img" aria-label="'+s.passed+' of '+s.total+' tests pass">'+s.tests.map(t=>'<span title="'+esc(t)+'"'+(failing.has(t)?' class="f"':'')+'></span>').join('')+'</div>';
    const lines=s.handler.split('\n'),old=new Set(prev?prev.handler.split('\n').map(x=>x.trim()):[]);
    RD.code($('rf-code'),lines,lines.map(l=>prev&&l.trim()&&!old.has(l.trim())?'add':''));
    $('rf-diff').innerHTML=s.diff.length?s.diff.map(l=>{const k=l[0];return '<span class="l'+(k==='+'?' add':k==='-'?' del':'')+'">'+(k==='@'?'<span class="cm">'+esc(l)+'</span>':RD.hl(l))+'</span>'}).join(''):'<span class="l"><span class="cm"># no change to the code: this step only adds tests (src/refactor/tests/)</span></span>';
    chart(s);
  }
  const A=RD.anim({card:'rf-card',ctl:'rf-ctl',n:seq.length,draw,ms:3000,label:'Refactoring step'});
  RD.seg($('rf-seg'),m=>{mode=m;seq=m==='bang'?[STEPS[0],BANG]:STEPS;A.reset(seq.length);A.play()});
  RD.onResize(()=>A.redraw());
})();
