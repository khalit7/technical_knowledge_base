// ---- Scene, Fig. 5 (section 6): the safe checkpoint save on the layers: write to a temporary name, fsync it, rename, fsync the directory (renderer v2) ----
// The call sequence is window.ST_DATA.trace.safe (strace of the running job's checkpoint, measured); the times are window.ST_DATA.ckpt (256 MiB state, medians of 5, measured).
// What each layer holds after each call follows fsync(2) and rename(2) (POSIX only; ext4's extra ordering is in the crash lab).
(function(){
  if(!document.getElementById('stg-ar')||!window.ST_DATA||!window.STL)return;const {lerp,mix,at,off}=S3,D=window.ST_DATA;
  const safe=D.ckpt.find(r=>/rename/.test(r.label)),plain=D.ckpt.find(r=>/straight/.test(r.label));
  const tf=+/file fsync ([\d.]+) ms/.exec(safe.note)[1],td=+/directory fsync ([\d.]+) ms/.exec(safe.note)[1];
  if(!/renameat\(.*ckpt\.pt\.tmp.*ckpt\.pt"\)/.test(D.trace.safe)||!/fsync\(5<DIR>\)/.test(D.trace.safe))throw new Error('Fig. 5: the traced safe save no longer has the rename and the directory fsync');
  const YS=[3.7,2.3,.55],NAMES=['Your program','Page cache','Disk'],SUBS=['torch.save, os.fsync, os.replace','kernel memory','stable media'];
  const XD=-1.55,XF=1.45,ZA=-.45,ZB=.45;
  // directory entries per step: [cache, disk]; files: which inode is dirty in the cache, which are on disk
  const DIR=[[{'ckpt.pt':'A'},{'ckpt.pt':'A'}],[{'ckpt.pt':'A','ckpt.pt.tmp':'B'},{'ckpt.pt':'A'}],[{'ckpt.pt':'A','ckpt.pt.tmp':'B'},{'ckpt.pt':'A'}],[{'ckpt.pt':'B'},{'ckpt.pt':'A'}],[{'ckpt.pt':'B'},{'ckpt.pt':'B'}]];
  function entries(R,P,y,m,a,hl){Object.keys(m).forEach((nm,i)=>{const z=i?ZB:ZA,isB=m[nm]==='B';
      R.box([XD,y,z],[1.5,.1,.62],{fill:mix(P.paper,isB?P.acc:P.c1,hl?.5:.25),a,shadow:false,lw:hl?1.4:.8,ec:hl?P.acc:undefined,dz:-3});
      R.label([XD,y+.1,z],nm+' → '+m[nm],{fs:12.5,mono:1,b:1,c:P.ink,a})})}
  function draw(R,k,e){const P=R.P;R.grid(-4,4,-2,2,.5);
    STL.stack(R,{ys:YS,names:NAMES,subs:SUBS,x0:-2.6,x1:2.6,z0:-1,z1:1,a:i=>1,tint:[P.c3,P.c2]});
    R.label([XD,YS[1],-1],'directory',{fs:12,c:P.mute,dy:-12,wide:1});R.label([XF,YS[1],-1],'file data',{fs:12,c:P.mute,dy:-12,wide:1});
    // the directory: in the cache it changes at once; on disk only after an fsync of the directory
    entries(R,P,YS[1],k===3&&e<.5?DIR[2][0]:DIR[k][0],1,k===1||k===3);
    entries(R,P,YS[2],k===4&&e<.6?DIR[3][1]:DIR[k][1],1,k===4&&e>=.6);
    // the files: A, the last good checkpoint, on disk until the new name is durable; B, the new one
    const aGone=k===4?e:0;R.box([XF,YS[2],ZA],[1.7,.32,.62],{fill:mix(P.paper,P.c1,.45),a:1-.8*aGone,shadow:false,lw:1});R.label([XF,YS[2]+.32,ZA],'A: last good checkpoint',{fs:12,b:1,c:P.c1,a:1-.7*aGone,wide:1});
    if(k>=1){const dirty=k===1;R.box([XF,YS[1],ZB],[1.7,.3,.62],{fill:mix(P.paper,dirty?P.c2:P.acc,dirty?.8:.35),a:k===1?e:1,shadow:false,lw:1,dz:-2});
      R.label([XF+.85,YS[1]+.3,ZB],dirty?'B: 256 MiB, dirty':'B: clean, on disk too',{al:'left',dx:8,fs:12,b:1,c:dirty?P.c2:P.acc,a:k===1?e:.8})}
    if(k>=2){R.box([XF,YS[2],ZB],[1.7,.32,.62],{fill:mix(P.paper,P.acc,.55),a:k===2?e:1,shadow:false,lw:1,dz:-2});R.label([XF+.85,YS[2]+.32,ZB],'B: durable',{al:'left',dx:8,fs:12,b:1,c:P.acc,a:k===2?e:1})}
    // flows: the bytes into the page cache, B down to disk, the directory entry down to disk
    if(k===1)STL.down(R,XF,ZB,YS[0]+.1,YS[1]+.35,P.c2,1,8);
    if(k===2)STL.down(R,XF,ZB,YS[1]+.1,YS[2]+.4,P.acc,1,7);
    if(k===3)R.flowArc([XF-.6,YS[1]+.3,ZB],[XD+.6,YS[1]+.12,ZA],.5,{c:P.acc,r:.06,n:6,speed:1.2});
    if(k===4)STL.down(R,XD,ZA,YS[1]+.05,YS[2]+.15,P.acc,1,6);
    const call=['before the save','torch.save(state, f) into ckpt.pt.tmp','os.fsync(f): '+tf+' ms','os.replace(tmp, "ckpt.pt")','fsync(directory): '+td+' ms'][k];
    R.label([0,YS[0]+.55,0],call,{fs:13,mono:1,b:1,c:P.acc,a:k?1:.7});
    if(k===4)R.label([0,0,1],'whole protocol '+Math.round(safe.med)+' ms, plain save '+Math.round(plain.med)+' ms',{fs:12.5,b:1,c:P.good,dy:18,a:e});
    if(k===3)R.label([XD,YS[2]+.12,1],'disk still says A',{fs:12.5,b:1,c:P.bad,dy:18,a:e});
  }
  const full={cam:[-.32,.42],bounds:[[-3,0,-1.1],[2.9,4.3,1.1]]};
  S3.stage({id:'stg-ar',list:'sx-ar',fig:'Fig. 5 · the safe save, call by call',cam:full.cam,bounds:full.bounds,aspect:.66,dur:1600,hold:5000,draw,
    // the rename and the directory fsync are about the directory: the camera turns towards it
    view:k=>innerWidth>=560&&(k===3||k===4)?{cam:[-.5,.42],bounds:full.bounds}:full,
    margin:w=>w<520?[16,10,30,90]:[18,130,30,130]});
})();
