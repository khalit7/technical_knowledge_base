// ---- Scene, Fig. 4 (section 5): one 4 KiB overwrite through fsync, fdatasync and sync_file_range, layer by layer (renderer v2) ----
// Order from fs/ext4/fsync.c (ext4_sync_file, line 129; ext4_fsync_journal, line 104), fs/jbd2/commit.c line 157 and fs/sync.c lines 351 to 355 (v5.10);
// the whole-call costs are window.ST_DATA.sync (medians of 1,000 overwrites on ext4, measured). The step lists sx-fs-* explain every step.
(function(){
  if(!document.getElementById('stg-fs')||!window.ST_DATA||!window.STL)return;const {lerp,mix}=S3,D=window.ST_DATA;
  const med=m=>D.sync.find(r=>r.fs==='ext4'&&r.shape==='overwrite'&&r.mode===m).med;
  const YS=[5.6,4.5,3.4,2.3,1.2,.5],NAMES=['Your program','Page cache','ext4 and jbd2 journal','Block layer, driver','Device cache','Stable media'];
  // d: layer of the data page, t: layer of the inode change (the new mtime; -1 not yet), fl: the device cache is flushed in this step, cm: a journal commit block
  const COMMON=[{d:0,t:-1},{d:1,t:2},{d:3,t:2},{d:4,t:2}];
  const SEQ={fsync:COMMON.concat([{d:4,t:3,cm:1},{d:5,t:5,fl:1,cm:1},{d:5,t:5,end:'fsync'}]),
    fdatasync:COMMON.concat([{d:4,t:2},{d:5,t:2,fl:1},{d:5,t:2,end:'fdatasync'}]),
    sfr:COMMON.concat([{d:4,t:2,end:'sfr'}])};
  let mode='fsync';const XD=-.75,XM=.75;
  const y=l=>l<0?YS[0]+.6:YS[l];
  function draw(R,k,e){const P=R.P,S=SEQ[mode],kk=Math.min(k,S.length-1),s=S[kk],p=S[Math.max(0,kk-1)];R.grid(-3.5,3.5,-2,2,.5);
    STL.stack(R,{ys:YS,names:NAMES,x0:-2.2,x1:2.2,z0:-1,z1:1,cutAt:5,cutY:.85,a:i=>1,tint:[P.c3,P.c2,P.c4,P.c6,P.c5]});
    const yd=lerp(y(p.d),y(s.d),e),yt=lerp(y(p.t),y(s.t),e);
    if(p.d!==s.d)STL.down(R,XD,0,y(p.d)+.1,y(s.d)+.12,P.acc,1);
    if(p.t!==s.t&&s.t>=0)STL.down(R,XM,0,(p.t<0?YS[0]:y(p.t))+.1,y(s.t)+.1,P.c4,1);
    STL.tok(R,[XD,yd,0],[.7,.18,.6],mix(P.paper,P.acc,.75),1);
    R.label([XD,yd,0],'4 KiB data page',{al:'right',dx:-26,dy:-4,fs:12.5,b:1,c:P.acc,grp:'tok'});
    if(s.t>=0){const a=p.t<0?e:1;STL.tok(R,[XM,yt,0],[.6,.14,.5],mix(P.paper,P.c4,.7),a);R.label([XM,yt,0],'inode change (mtime)',{al:'left',dx:26,dy:-4,fs:12.5,b:1,c:P.c4,a,grp:'tok2'})}
    if(s.cm){R.box([XM+.85,YS[2],0],[.3,.2,.3],{fill:mix(P.paper,P.good,.6),a:e,shadow:false,dz:-3});R.label([XM+.85,YS[2]+.2,0],'commit block',{al:'left',dx:12,fs:12,c:P.good,a:e,wide:1})}
    if(s.fl){R.glow([0,YS[4]+.05,0],1.6,{c:P.good,a:.6*e});R.label([2.2,YS[4],-1],'FLUSH: cache to media',{al:'left',dx:8,fs:12,b:1,c:P.good,a:e})}
    if(s.end){R.label([0,YS[0]+.75,0],(mode==='sfr'?'sync_file_range':mode)+' returns: '+Math.round(med(s.end)).toLocaleString('en-US')+' us',{fs:13,b:1,mono:1,c:s.d===5?P.good:P.bad,a:e})}
  }
  const full={cam:[-.32,.32],bounds:[[-2.3,0,-1.1],[2.3,6.4,1.1]]};
  const st=S3.stage({id:'stg-fs',list:'sx-fs-fsync',fig:'Fig. 4 · one overwrite, layer by layer',cam:full.cam,bounds:full.bounds,aspect:.8,dur:1400,hold:4800,draw,
    margin:w=>w<520?[16,10,16,100]:[18,150,18,160]});
  const seg=document.getElementById('rd-fs-mode');
  seg.addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b)return;mode=b.dataset.m;seg.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
    ['fsync','fdatasync','sfr'].forEach(m=>{document.getElementById('sx-fs-'+m).hidden=m!==mode});st.list('sx-fs-'+mode)});
})();
