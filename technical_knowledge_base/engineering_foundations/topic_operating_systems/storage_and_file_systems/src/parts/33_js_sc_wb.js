// ---- Scene, Fig. 3 (section 4): three measured runs side by side, dirty pages in the page cache and bytes on the device over time (renderer v2) ----
// Every value is window.ST_DATA.wb (memory.stat file_dirty and file_writeback, io.stat wbytes, sampled every 100 ms in a fresh container, measured).
// Each lane's 16 tiles are sixteenths of what that run wrote; time is seconds after the first sample that saw the write (t_write).
(function(){
  if(!document.getElementById('stg-wb')||!window.ST_DATA)return;const {lerp,mix,cl}=S3,D=window.ST_DATA;
  const RUNS=[['small','16 MiB, fresh container',16],['primed2','16 MiB, primed (run 2)',16],['fsync','256 MiB, then fsync',256]];
  const LX=[-2.7,0,2.7],YP=1.7,TW=.42;
  // seconds after the write covered by each step (each step plays its stretch of the recording)
  const T=[[0,.25],[.25,.5],[.5,5],[5,29.6],[29.6,31]];
  function at(run,t){const w=D.wb[run],tc=w.t_write-.1+t;let r=null;for(const x of w.rows){if(x[0]<=tc+1e-9)r=x;else break}return r||[0,0,0,0,0]}
  const f1=x=>(Math.round(x*10)/10).toFixed(1);
  function draw(R,k,e){const P=R.P,t=lerp(T[k][0],T[k][1],e),tp=lerp(T[k][0],T[k][1],Math.max(0,e-.05));R.grid(-4.6,4.6,-2,2,.5);
    RUNS.forEach(([run,name,tot],i)=>{const x=LX[i],r=at(run,t),r0=at(run,tp),dirty=r[1],wbk=r[2],dev=Math.min(tot,r[3]);
      // composition: the lane this step is about at full strength, the others recede
      const focus=[[0,1,2],[2],[0],[1],[1]][k],a=focus.includes(i)?1:.32;
      R.box([x,0,0],[2.1,.42,1.7],{fill:mix(P.paper,P.c6,.3),a,lw:1});
      R.glass([x-1.05,YP,-.85],[2.1,0,0],[0,0,1.7],{c:P.c2,a:.55*a+.2,nu:4,nv:4,th:.03,dz:4});
      const nd=Math.round(16*dirty/tot),nw=Math.round(16*wbk/tot),nv=Math.round(16*dev/tot);
      for(let j=0;j<16;j++){const cx=x-.75+(j%4)*.5,cz=-.75+Math.floor(j/4)*.5;
        if(j<nd+nw)R.box([cx,YP+.02,cz],[TW,.06,TW],{fill:j<nd?mix(P.paper,P.c2,.85):mix(P.paper,P.c5,.8),a,shadow:false,lw:.6});
        if(j<nv)R.box([cx,.42,cz],[TW,.07,TW],{fill:mix(P.paper,P.c1,.6),a,shadow:false,lw:.6,dz:-2})}
      // bytes moving to the device while the device count rises
      if(r[3]>r0[3]+.05||(wbk>.5))R.flow([[x,YP,0],[x,.5,0]],{c:P.c2,a,r:.07,speed:1.6,n:6});
      const la=a===1?1:k===3?.45:0;R.label([x,0,.85],name,{fs:12.5,b:1,c:P.ink,dy:16,a:la});
      R.label([x,YP+.05,-.85],'dirty '+f1(dirty+wbk)+' MiB',{fs:12,mono:1,b:a===1,c:P.c2,dy:-12,a:la});
      R.label([x+1.05,.42,0],'device '+f1(dev),{al:'left',dx:6,fs:12,mono:1,c:P.c1,a:la,wide:1})});
    R.label([k===1?2.7:k===2?-2.7:0,YP+1.45,0],'t = '+f1(t)+' s after the write',{fs:13.5,mono:1,b:1,c:P.acc});
  }
  const full={cam:[-.18,.52],bounds:[[-3.9,0,-1.1],[3.9,3.2,1.2]]};
  S3.stage({id:'stg-wb',list:'sx-wb',fig:'Fig. 3 · dirty data over time, three measured runs',cam:full.cam,bounds:full.bounds,aspect:.5,dur:3200,hold:4400,draw,
    // the step about one run moves in on its lane
    view:k=>{if(innerWidth<560||k===0||k===3)return full;const x=[0,2.7,-2.7,0,0][k];return {cam:[-.18,.5],bounds:[[x-2.4,0,-1.1],[x+2.4,3.2,1.2]]}},
    margin:w=>w<520?[16,10,30,10]:[18,40,32,40]});
})();
