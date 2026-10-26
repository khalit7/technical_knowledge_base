// ---- Reading: the borrow timeline (section 5) and the Python to Rust prediction prompts (sections 3 and 4) ----
(function(){
  const D=window.RA_DATA;if(!D||!document.getElementById('ra-nll-card'))return;
  // ----- borrow timeline: three versions of the same five-line program -----
  const M={
    err:{src:D.gate.err.src,out:D.gate.err.out,sh:[3,5],mu:4,
      cap:['<code>main</code> starts.','<code>v</code> owns a vector with one element.','<code>first</code> borrows <code>v</code> (shared, blue). The borrow lives until <code>first</code> is last used.','<code>push</code> needs <code>&amp;mut v</code> (orange) while the blue borrow is still alive (it is used on line 5): <b>conflict</b>.','Line 5 is why the blue borrow was alive at line 4. Remove this use and the conflict disappears.','<code>}</code>: <code>v</code> goes out of scope and its buffer is freed.','The compiler refuses the program, with the three labels you just saw: borrow, conflicting use, later use.']},
    reorder:{src:D.gate.reorder.src,out:D.gate.reorder.out,sh:[3,4],mu:5,
      cap:['<code>main</code> starts.','<code>v</code> owns a vector with one element.','<code>first</code> borrows <code>v</code> (shared, blue).','<code>first</code> is used for the last time: the blue borrow ends here.','<code>push</code> takes <code>&amp;mut v</code>; no other borrow is alive, so it is allowed.','Printing <code>v</code> borrows it again briefly.','<code>}</code>: <code>v</code> goes out of scope and its buffer is freed.','Compiles and runs: the bars do not overlap.']},
    fix:{src:D.gate.fix.src,out:D.gate.fix.out,sh:null,mu:4,
      cap:['<code>main</code> starts.','<code>v</code> owns a vector with one element.','<code>v[0]</code> is an <code>i32</code>, which is <code>Copy</code>: <code>first</code> is a copy of the number, not a borrow.','<code>push</code> takes <code>&amp;mut v</code>; nothing else borrows <code>v</code>.','<code>first</code> is an independent number; the vector may have moved, it does not matter.','<code>}</code>: <code>v</code> goes out of scope and its buffer is freed.','Compiles and runs.']}
  };
  let mode='err';
  const box=document.getElementById('ra-nll-code'),cap=document.getElementById('ra-nll-cap'),outEl=document.getElementById('ra-nll-out');
  function lines(){return M[mode].src.split('\n')}
  function draw(i){const m=M[mode],L=lines(),n=L.length,cur=i+1;let h='';
    L.forEach((t,k)=>{const no=k+1;const shown=no<=Math.min(cur,n);
      const inSh=m.sh&&no>=m.sh[0]&&no<=m.sh[1]&&shown,isMu=no===m.mu&&shown;const conflict=inSh&&isMu;
      h+='<div class="ln'+(no===cur?' on':'')+'"><span class="no">'+no+'</span><span class="tx">'+RA.hl(t)+'</span><span class="bars">'+
        '<span class="bar" style="background:'+(conflict?'var(--ra-red)':inSh?'var(--c1)':'transparent')+'" title="shared borrow"></span>'+
        '<span class="bar" style="background:'+(conflict?'var(--ra-red)':isMu?'var(--c2)':'transparent')+'" title="exclusive borrow"></span></span></div>'});
    box.innerHTML=h;
    cap.innerHTML='<b>Step '+(i+1)+' of '+(n+1)+'.</b> '+(m.cap[Math.min(i,m.cap.length-1)]||'');
    const last=i>=n;outEl.hidden=!last;if(last){const t=RA.out(m.out);outEl.className=/exit code/.test(m.out)?'ra-out ra-bad':'ra-out';outEl.innerHTML=t.replace(/^<pre[^>]*>\n?/,'').replace(/<\/pre>$/,'')}}
  const A=RD.anim({card:'ra-nll-card',ctl:'ra-nll-ctl',n:lines().length+1,draw,ms:1700,label:'Line'});
  // a mode switch shows the new version at step 1; nothing moves until the reader presses play or steps
  RD.seg(document.getElementById('ra-nll-seg'),v=>{mode=v;A.reset(lines().length+1)});
  // ----- prediction prompts: pick a candidate, then the recorded results open -----
  document.querySelectorAll('#t-read .ra-dq').forEach(q=>{q.addEventListener('click',e=>{const b=e.target.closest('button[data-pick]');if(!b||b.disabled)return;
    const ans=q.dataset.ans,p=b.dataset.pick;
    q.querySelectorAll('.ra-cand').forEach(c=>{const k=c.dataset.c;c.classList.toggle('pick',k===p);c.classList.toggle('ok',k===ans);
      const bt=c.querySelector('button[data-pick]');bt.disabled=true;bt.textContent=k===ans?'matches Python':'differs'});
    const d=q.querySelector('details.ra-drv');if(d)d.open=true;
    const h=q.querySelector('.ra-dqh');if(h&&!h.querySelector('.res')){const s=document.createElement('span');s.className='res';s.innerHTML=' <b>'+(p===ans?'Right.':'Not quite: '+ans.toUpperCase()+' is the one.')+'</b>';h.appendChild(s)}})});
})();
