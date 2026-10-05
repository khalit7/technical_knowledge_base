// ---- Part 1 (ra) tab "Python to Rust drill": one Python snippet, three Rust candidates, real results revealed ----
(function(){
  const D=window.RA_DATA&&window.RA_DATA.drill;const bodyEl=document.getElementById('ra-dr-body');if(!D||!bodyEl)return;
  const esc=RA.esc,dots=document.getElementById('ra-dr-dots'),pos=document.getElementById('ra-dr-pos'),sc=document.getElementById('ra-dr-score');
  const res={};let cur=0;
  const VERB={compile:'refused by the compiler',panic:'compiles, panics at run time',warn:'compiles (with a warning) and runs',ok:'compiles and runs'};
  function drawDots(){dots.innerHTML=D.map((d,i)=>'<button data-i="'+i+'" class="'+(i===cur?'on ':'')+(res[i]===undefined?'':res[i]?'good':'badd')+'" aria-label="Snippet '+(i+1)+'">'+(i+1)+'</button>').join('');
    const n=Object.keys(res).length,r=Object.values(res).filter(Boolean).length;sc.textContent=n?('score '+r+' of '+n):'';pos.textContent=(cur+1)+' of '+D.length}
  function show(i){cur=i;drawDots();const d=D[i];
    let h='<h3 style="margin-top:6px">'+(i+1)+'. '+esc(d.title)+'</h3><div class="ra-two"><div>'+RA.code(d.py_src,d.id+'.py',true)+'</div><div>'+RA.out(d.py_out,'dr_'+d.id+'_py')+'</div></div>'+
      '<p class="small"><b>Which Rust version prints the same?</b> Click one.</p><div class="ra-dc">';
    d.cands.forEach((c,j)=>{const L='abc'[j];h+='<div class="ra-cand" data-j="'+j+'"><div class="h"><span>'+L.toUpperCase()+'</span><button data-pick="'+j+'">This one</button></div>'+RA.code(c.src,d.id+'_'+L+'.rs')+'<div class="ra-rv" hidden></div></div>'});
    h+='</div><div id="ra-dr-extra"></div>';bodyEl.innerHTML=h;
    if(res[i]!==undefined)reveal(-1);
  }
  function reveal(p){const d=D[cur],ans='abc'.indexOf(d.answer);
    if(p>=0&&res[cur]===undefined)res[cur]=p===ans;
    bodyEl.querySelectorAll('.ra-cand').forEach((el,j)=>{const c=d.cands[j],v=RA.verdict(c.out),L='abc'[j];
      el.classList.toggle('ok',j===ans);el.classList.toggle('no',j!==ans);el.classList.toggle('pick',j===p);
      const b=el.querySelector('button[data-pick]');b.disabled=true;b.textContent=j===ans?'matches Python':'differs';
      const rv=el.querySelector('.ra-rv');rv.hidden=false;
      rv.innerHTML='<div class="ra-res"><b>'+VERB[v]+'</b></div>'+RA.out(c.out,'dr_'+d.id+'_'+L)+'<div class="ra-res">'+d.notes[L]+'</div>'});
    const ex=document.getElementById('ra-dr-extra');ex.innerHTML=(d.extras||[]).map(e=>'<div class="small"><b>'+esc(e.label)+'</b></div>'+RA.out(e.out)).join('');
    drawDots()}
  bodyEl.addEventListener('click',e=>{const b=e.target.closest('button[data-pick]');if(b&&!b.disabled)reveal(+b.dataset.pick)});
  dots.addEventListener('click',e=>{const b=e.target.closest('button[data-i]');if(b)show(+b.dataset.i)});
  document.getElementById('ra-dr-prev').addEventListener('click',()=>show((cur+D.length-1)%D.length));
  document.getElementById('ra-dr-next').addEventListener('click',()=>show((cur+1)%D.length));
  show(0);
})();
