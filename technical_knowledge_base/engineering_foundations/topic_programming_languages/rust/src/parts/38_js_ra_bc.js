// ---- Part 1 (ra) tab "Borrow-checker lab": pick a scenario, predict, reveal the real rustc output, how to read it, the fix ----
(function(){
  const D=window.RA_DATA&&window.RA_DATA.bc;const pick=document.getElementById('ra-bc-pick');if(!D||!pick)return;
  const esc=RA.esc,body=document.getElementById('ra-bc-body'),score=document.getElementById('ra-bc-score');
  let cur=0,right=0,tried=0;const done={};
  const KIND={compile:'Refused by the compiler',panic:'Compiles, then panics at run time',ok:'Compiles and runs'};
  function chips(){let g='',h='';D.forEach((s,i)=>{if(s.group!==g){g=s.group;h+='<span class="ra-grp">'+esc(g)+'</span>'}
    h+='<button data-i="'+i+'" class="'+(i===cur?'on ':'')+(done[i]?'done':'')+'" aria-pressed="'+(i===cur)+'">'+(i+1)+'. '+esc(s.title)+'</button>'});pick.innerHTML=h}
  function show(i){cur=i;chips();const s=D[i];
    body.innerHTML='<h3 style="margin-top:6px">'+(i+1)+'. '+esc(s.title)+' <span class="small mute">'+esc(s.code)+'</span></h3>'+
      RA.code(s.err_src,s.id+'_err.rs')+
      '<p class="ra-note"><b class="k">In Python</b> '+s.py+'</p>'+
      '<div class="small"><b>What happens?</b></div><div class="ra-guess" id="ra-bc-guess">'+
      ['compile','panic','ok'].map(k=>'<button data-k="'+k+'">'+KIND[k]+'</button>').join('')+'</div>'+
      '<div id="ra-bc-rev" hidden></div>';
    body.querySelectorAll('#ra-bc-guess button').forEach(b=>b.addEventListener('click',()=>reveal(b.dataset.k)));
  }
  function reveal(g){const s=D[cur],rev=document.getElementById('ra-bc-rev');
    const truth=s.kind;const ok=g===truth;if(!done[cur]){tried++;if(ok)right++;done[cur]=1}
    body.querySelectorAll('#ra-bc-guess button').forEach(b=>{b.disabled=true;b.classList.toggle('right',b.dataset.k===truth);b.classList.toggle('wrong',b.dataset.k===g&&!ok)});
    let h='<div class="ra-verdict">'+(ok?'Right: ':'Not quite: ')+KIND[truth].toLowerCase()+'.</div>'+RA.out(s.err_out,'bc_'+s.id+'_err')+
      '<p class="ra-note"><b class="k">Read it</b> '+s.read+'</p>'+
      '<h3>The fix</h3>'+RA.code(s.fix_src,s.id+'_fix.rs')+RA.out(s.fix_out,'bc_'+s.id+'_fix')+
      '<p class="ra-note"><b class="k">Why</b> '+s.why+'</p>';
    (s.extras||[]).forEach(e=>{h+='<div class="small"><b>'+esc(e.label)+'</b></div>'+RA.out(e.out)});
    h+='<div class="ra-nav" style="margin-top:8px">'+(cur+1<D.length?'<button id="ra-bc-next">Next scenario &#9654;</button>':'<span class="small">That was the last one.</span>')+'</div>';
    rev.innerHTML=h;rev.hidden=false;score.textContent=right+' of '+tried;chips();
    const nx=document.getElementById('ra-bc-next');if(nx)nx.addEventListener('click',()=>{show(cur+1);document.getElementById('ra-bc-card').scrollIntoView({block:'start'})});
  }
  pick.addEventListener('click',e=>{const b=e.target.closest('button[data-i]');if(b)show(+b.dataset.i)});
  show(0);
})();
