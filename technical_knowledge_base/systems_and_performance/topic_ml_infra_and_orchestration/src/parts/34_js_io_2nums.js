// ---- Storage lab: numbers in the "In one screen" box, filled from the recorded data (window.IO_D) ----
// (The tier bars, checkpoint anatomy, write layouts, async animation and data-reading charts moved out on 2026-10-19
//  to src/for_children/storage_lab_cut/; their results are summarised in the tab's section 2 table.)
(function(){
  const H=window.IO_H,D=window.IO_D;if(!H||!D||!H.$('t-io'))return;const $=H.$;
  const fS=s=>s>=1?s.toFixed(s>=10?1:2)+' s':(s*1e3).toFixed(s>=0.1?0:1)+' ms';
  const set=(id,v)=>{const e=$(id);if(e)e.innerHTML=v};
  const T=D.tiers;
  const lv=T.ctr_volume.l.write_s,lb=T.ctr_hostdir.l.write_s;
  set('io-n-l-vol',fS(lv));set('io-n-l-bind',fS(lb));set('io-n-l-ratio',Math.round(lb/lv)+' times');
  set('io-n-k8s-ratio',Math.round(D.clusters.k8s.median_s/D.clusters.slurm.median_s)+' times');
  const blk=(tr)=>{const b=tr.steps.filter(s=>s[2]>0).map(s=>s[2]).sort((x,y)=>x-y);return (b[1]+b[2])/2};// median of 4
  set('io-n-sync',fS(blk(D.slow_bind.train.sync)));set('io-n-async',fS(blk(D.slow_bind.train.async)));
  H.drills($('t-io'));
})();
