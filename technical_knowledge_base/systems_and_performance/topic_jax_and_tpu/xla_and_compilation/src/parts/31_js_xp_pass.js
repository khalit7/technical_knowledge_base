// ---- Pass diff viewer (tab t-xppass) ----
(function(){
  const D=XP.D, esc=XP.esc, f=XP.f, $=id=>document.getElementById(id);
  const RM=RD.RM;
  let prog='attn', idx=0, only=false, timer=0;
  const cat={};D.pipe.cat.forEach(c=>cat[c[0]]=c);
  const steps=()=>{const S=D.pass[prog].steps.map((s,i)=>Object.assign({i},{s}));return only?S.filter(o=>Object.keys(o.s[7]||{}).length):S};
  function fillSel(){const S=steps();$('xq-sel').innerHTML=S.map((o,k)=>'<option value="'+k+'">'+(k+1)+'. '+esc(o.s[2])+' ('+esc(o.s[1])+')</option>').join('');if(idx>=S.length)idx=S.length-1;$('xq-sel').value=idx}
  function chart(){
    const P=D.pass[prog], S=steps(), host=$('xq-chart'), W=RD.width(host), H=150, pl=44, pb=18, pt=6, n=S.length, bw=(W-pl-4)/n;
    const maxI=Math.max(P.start,...P.steps.map(s=>s[3])), y=v=>H-pb-(H-pb-pt)*v/maxI;
    let s='';for(let t=0;t<=2;t++){const v=maxI*t/2;s+='<line x1="'+pl+'" x2="'+(W-2)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/>'+RD.t(pl-4,y(v)+3,f(Math.round(v)),{a:'end'})}
    S.forEach((o,k)=>{s+='<rect data-k="'+k+'" x="'+(pl+k*bw+0.5)+'" y="'+y(o.s[3])+'" width="'+Math.max(1,bw-1)+'" height="'+(H-pb-y(o.s[3]))+'" fill="'+(k===idx?'var(--c2)':o.s[2]==='fusion'?'var(--c3)':'var(--acc)')+'"><title>'+esc(o.s[2])+': '+o.s[3]+'</title></rect>'});
    s+=RD.t(pl,H-4,'first changed pass')+RD.t(W-4,H-4,'last',{a:'end'});
    host.innerHTML=RD.svg(W,H,s,'Instructions after each pass');
  }
  function show(){
    const S=steps();if(!S.length)return;const o=S[idx], st=o.s, P=D.pass[prog], prevI=o.i?P.steps[o.i-1][3]:P.start;
    $('xq-sel').value=idx;chart();
    $('xq-cnt').innerHTML=RD.stat('Pass',(idx+1)+' of '+S.length,esc(st[1]))+RD.stat('Instructions',f(prevI)+' to '+f(st[3]))+RD.stat('Fusions',f(st[4]))+RD.stat('Lines',('+'+st[5]+' / -'+st[6]),'added / removed');
    const c=cat[st[2]];
    const lines=a=>a&&a.length?a.map(x=>esc(String(x))).join(', '):'none';
    $('xq-what').innerHTML='<h3 style="margin:8px 0 2px"><code>'+esc(st[2])+'</code></h3><p>'+esc(XP.pdesc(st[2])||'')+'</p>'+(c?'<p class="xq-src">Class <code>'+esc(c[1])+'</code>; <code>name()</code> at <a href="https://github.com/openxla/xla/blob/'+D.meta.xla+'/'+c[2]+'#L'+c[3]+'" target="_blank" rel="noopener noreferrer"><code>'+esc(c[2])+':'+c[3]+'</code></a>. Added in <code>cpu_compiler.cc</code> at lines '+lines(c[4])+'; on GPU at '+lines(c[5])+'.</p>':'<p class="xq-src">A pipeline boundary, not a pass.</p>');
    const d=Object.entries(st[7]||{});
    $('xq-delta').innerHTML=d.length?d.map(([k,v])=>'<span class="'+(v>0?'p':'m')+'">'+esc(k)+' '+(v>0?'+':'')+v+'</span>').join(''):'<span>no change in opcode counts</span>';
    $('xq-diff').innerHTML=(st[8]||[]).map(l=>'<span class="'+(l[0]==='+'?'a':l[0]==='-'?'r':'h')+'">'+esc(l)+'</span>').join('\n')||'(no text change)';
    $('xq-trunc').textContent=st[9]?st[9]+' more diff lines not shown.':'';
  }
  function setProg(m){prog=m;idx=0;fillSel();const P=D.pass[m];$('xq-prog-note').textContent='Module '+P.module+': '+P.per_pass+' per-pass dump files, '+P.changed+' with a change in the program text; '+f(P.start)+' instructions at the start.';show()}
  function stop(){if(timer){clearTimeout(timer);timer=0}$('xq-play').innerHTML='&#9654; Play'}
  function tick(){const S=steps();if(idx>=S.length-1||$('t-xppass').hidden){stop();return}idx++;show();timer=setTimeout(tick,1300)}
  $('xq-play').addEventListener('click',()=>{if(timer){stop();return}if(RM){idx=Math.min(steps().length-1,idx+1);show();return}if(idx>=steps().length-1)idx=0;$('xq-play').innerHTML='&#10073;&#10073; Pause';show();timer=setTimeout(tick,1300)});
  $('xq-prev').addEventListener('click',()=>{stop();idx=Math.max(0,idx-1);show()});
  $('xq-next').addEventListener('click',()=>{stop();idx=Math.min(steps().length-1,idx+1);show()});
  $('xq-sel').addEventListener('change',e=>{stop();idx=+e.target.value;show()});
  $('xq-only').addEventListener('change',e=>{stop();only=e.target.checked;idx=0;fillSel();show()});
  $('xq-chart').addEventListener('click',e=>{const r=e.target.closest('rect[data-k]');if(r){stop();idx=+r.dataset.k;show()}});
  RD.seg($('xq-prog'),m=>{stop();setProg(m)});
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-xppass']=[()=>show()];
  addEventListener('resize',()=>{if(!$('t-xppass').hidden)chart()});
  setProg('attn');
})();
