// ---- Reading: prose numbers and tables are static HTML (so the ledger and the root can see them); BA_V resolves each
// data-v key from window.BAD (recorded outputs) and marks any static number that disagrees (check_data.mjs fails on it).
// Also: the loss chart, predict widgets, redraw when a closed block opens. ----
(function(){
  const B=window.BAD;if(!B||!window.RD)return;
  const $=id=>document.getElementById(id);
  const f3=x=>x.toFixed(3),pct=x=>Math.round(100*x)+'%',fi=n=>Math.round(n).toLocaleString('en-GB');
  const MiB=b=>(b/1048576).toFixed(1),GiB=b=>(b/1073741824).toFixed(2);
  const run=n=>(B.runs||[]).find(r=>r.run===n);
  const mem=k=>B.mem.models.find(m=>m.key===k);
  const cp=()=>{if(!B.copy)return null;const py=B.copy.models.find(m=>/pythia/.test(m.name)),mb=B.copy.models.find(m=>/mamba/.test(m.name));return py&&mb?{py,mb}:null};
  // value resolver for data-v="a.b.c"
  window.BA_V=function(key){
    const p=key.split('.');
    if(p[0]==='run'){const r=run(p[1]);if(!r)return null;return p[2]==='val'?f3(r.val):p[2]==='rs'?f3(r.rs):null}
    if(p[0]==='mem'){const m=mem(p[1]);if(!m)return null;
      if(p[2]==='cross')return m.kv_equals_state_at?fi(m.kv_equals_state_at):null;
      if(p[2]==='stateMiB')return MiB(m.state);return null}
    if(p[0]==='wr'){const q=p[1].split('_');const r=B.wr[q[0]+'_'+q[1]];if(!r)return null;
      return q[2]?(r.cos[q[2]]!==undefined?r.cos[q[2]].toFixed(2):null):r.mean.toFixed(2)}
    if(p[0]==='inside')return B.inside?B.inside.dual.toExponential(1):null;
    const c=cp();if(!c)return null;
    if(p[0]==='copy'&&/Fwd$/.test(p[1])){const m=p[1]==='mbFwd'?c.mb:c.py;return m.forward_1000_tokens_s!==undefined?m.forward_1000_tokens_s.toFixed(1):null}
    if(p[0]==='copy'){const L=c.py.copy[c.py.copy.length-1];const M=c.mb.copy[c.mb.copy.length-1];
      return p[1]==='longL'?fi(L.words):p[1]==='pyLong'?pct(L.acc):p[1]==='mbLong'?pct(M.acc):null}
    if(p[0]==='book'){const L=c.py.phonebook.find(z=>z.entries===40),M=c.mb.phonebook.find(z=>z.entries===40);
      return p[1]==='bigN'?fi(L.entries):p[1]==='pyBig'?pct(L.acc):p[1]==='mbBig'?pct(M.acc):null}
    return null};
  document.querySelectorAll('[data-v]').forEach(el=>{const v=BA_V(el.dataset.v);
    if(v===null||el.textContent.trim()!==v){el.dataset.stale=v===null?'pending':v;el.classList.add('unc')}});

  // loss curves
  const COL={at_mha:'var(--c1)',at_mha_s1:'var(--c1)',pe_nope:'var(--c6)',ba_ssm:'var(--c2)',ba_ssm_s1:'var(--c2)',ba_hybrid:'var(--c4)',ba_hybrid2:'var(--c5)'};
  function curves(){const el=$('rd-curves');if(!el||!B.runs)return;
    const W=Math.min(760,RD.width(el)),H=W<500?230:260,l=40,r=8,t=10,b=30;
    const x=s=>l+(W-l-r-14)*s/1500,y0=1.9,y1=3.4,y=v=>t+(H-t-b)*(1-(Math.min(y1,Math.max(y0,v))-y0)/(y1-y0));
    let s='';for(let v=2;v<=3.4;v+=0.2){s+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/>'+RD.t(l-4,y(v)+4,v.toFixed(1),{a:'end',fs:11})}
    for(let st=0;st<=1500;st+=500)s+=RD.t(x(st),H-12,String(st),{a:'middle',fs:11});
    B.runs.forEach(rr=>{const pts=rr.curve.filter(p=>p[0]>=200).map(p=>x(p[0]).toFixed(1)+','+y(p[1]).toFixed(1)).join(' ');
      s+='<polyline points="'+pts+'" fill="none" stroke="'+COL[rr.run]+'" stroke-width="1.8"'+(/_s1$/.test(rr.run)?' stroke-dasharray="4 3"':'')+'/>'});
    el.innerHTML=RD.svg(W,H,s,'training loss against step for each run')+'<div class="leg">'+B.runs.map(rr=>'<span style="--sw:'+COL[rr.run]+'">'+RD.esc(rr.run)+'</span>').join('')+'</div><p class="small mute">Training loss against training step (0 to 1,500), mean of each 50-step window, from step 200 (dashed: seed 1). The y axis is clipped at 3.4.</p>'}
  RD.onRender(curves);RD.onResize(curves);curves();

  // predict widgets
  document.querySelectorAll('#t-read .pr').forEach(pr=>{const ans=pr.querySelector('.ans');
    pr.querySelectorAll('.opts button').forEach(bt=>bt.addEventListener('click',()=>{
      pr.querySelectorAll('.opts button').forEach(x=>x.classList.toggle(x.dataset.ok==='1'?'right':'wrong',x===bt||x.dataset.ok==='1'));
      ans.hidden=false}))});
  // charts inside closed blocks are drawn at a guessed width: redraw when a block opens
  document.querySelectorAll('#t-read details').forEach(d=>d.addEventListener('toggle',()=>{if(d.open)dispatchEvent(new Event('resize'))}));
})();
