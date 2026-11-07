// ---- Reading: the borrow timeline (section 5) and the Python to Rust prediction prompts (sections 3 and 4) ----
(function(){
  const D=window.RA_DATA;if(!D||!document.getElementById('ra-nll-card'))return;
  // ----- borrow timeline: three versions of the same five-line program -----
  const M={
    err:{src:D.gate.err.src,out:D.gate.err.out,sh:[3,5],mu:4},
    reorder:{src:D.gate.reorder.src,out:D.gate.reorder.out,sh:[3,4],mu:5},
    fix:{src:D.gate.fix.src,out:D.gate.fix.out,sh:null,mu:4}
  };
  let mode='err';
  const box=document.getElementById('ra-nll-code'),outEl=document.getElementById('ra-nll-out');
  function lines(){return M[mode].src.split('\n')}
  function draw(i){const m=M[mode],L=lines(),n=L.length,cur=i+1;let h='';
    L.forEach((t,k)=>{const no=k+1;const shown=no<=Math.min(cur,n);
      const inSh=m.sh&&no>=m.sh[0]&&no<=m.sh[1]&&shown,isMu=no===m.mu&&shown;const conflict=inSh&&isMu;
      h+='<div class="ln'+(no===cur?' on':'')+'"><span class="no">'+no+'</span><span class="tx">'+RA.hl(t)+'</span><span class="bars">'+
        '<span class="bar" style="background:'+(conflict?'var(--ra-red)':inSh?'var(--c1)':'transparent')+'" title="shared borrow"></span>'+
        '<span class="bar" style="background:'+(conflict?'var(--ra-red)':isMu?'var(--c2)':'transparent')+'" title="exclusive borrow"></span></span></div>'});
    box.innerHTML=h;
    const last=i>=n;outEl.hidden=!last;if(last){const t=RA.out(m.out);outEl.className=/exit code/.test(m.out)?'ra-out ra-bad':'ra-out';outEl.innerHTML=t.replace(/^<pre[^>]*>\n?/,'').replace(/<\/pre>$/,'')}}
  // the step lists (ol#sx-nll-err, -reorder, -fix in the template) explain each step; one is shown at a time
  const A=RD.anim({card:'ra-nll-card',ctl:'ra-nll-ctl',n:lines().length+1,draw,ms:3600,label:'Line',list:'sx-nll-err'});
  // a mode switch shows the new version's step list at step 1 and replays it (RD.anim's one exception to stopping for good)
  RD.seg(document.getElementById('ra-nll-seg'),v=>{mode=v;['err','reorder','fix'].forEach(k=>{const l=document.getElementById('sx-nll-'+k);if(l)l.hidden=k!==v});A.reset(lines().length+1,'sx-nll-'+v)});
  // ----- prediction prompts: pick a candidate, then the recorded results open -----
  document.querySelectorAll('#t-read .ra-dq').forEach(q=>{q.addEventListener('click',e=>{const b=e.target.closest('button[data-pick]');if(!b||b.disabled)return;
    const ans=q.dataset.ans,p=b.dataset.pick;
    q.querySelectorAll('.ra-cand').forEach(c=>{const k=c.dataset.c;c.classList.toggle('pick',k===p);c.classList.toggle('ok',k===ans);
      const bt=c.querySelector('button[data-pick]');bt.disabled=true;bt.textContent=k===ans?'matches Python':'differs'});
    const d=q.querySelector('details.ra-drv');if(d)d.open=true;
    const h=q.querySelector('.ra-dqh');if(h&&!h.querySelector('.res')){const s=document.createElement('span');s.className='res';s.innerHTML=' <b>'+(p===ans?'Right.':'Not quite: '+ans.toUpperCase()+' is the one.')+'</b>';h.appendChild(s)}})});
})();
