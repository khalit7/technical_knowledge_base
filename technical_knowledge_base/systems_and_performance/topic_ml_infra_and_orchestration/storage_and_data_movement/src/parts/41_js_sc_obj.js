// ---- Scene, Fig. 2 (section 5): object storage as a bucket of whole objects behind an HTTP API; one large object uploaded in parts and
// downloaded as ranged GETs (renderer v2). Rates, the rename and the listing are measured on the SeaweedFS 4.48 stand-in (window.SD.multipart,
// .semantics.rename, .list: one 256 MiB object, medians of 3); the 100-200 ms and the per-prefix request rates are quoted from S3's documentation.
// Object sizes and positions are schematic. Uploads orange, downloads blue (as in the bars beside it). Steps: #sx-obj.
(function(){
  if(!document.getElementById('stg-obj')||!window.SD||!SD.multipart)return;const {at,off,lerp,mix}=S3;
  const M=SD.multipart,mb=k=>Math.round(M[k].MBps);
  window.SD_OBJ={up1:mb('upload_8_1'),up8:mb('upload_8_8'),dn1:mb('download_8_1'),dn8:mb('download_8_8'),ren:SD.semantics.rename.copy_delete_s,put:SD.semantics.rename.put_s,listReq:SD.list.requests,listKeys:SD.list.keys};
  const O=window.SD_OBJ,CL=[0,0,2.5],ZA=.7,OBJ=[0,0,-1.9],OW=2,KEYS=['ckpt/step_000200/__0_0.distcp','ckpt/step_000200/__1_0.distcp','ckpt/step_000200/.metadata','data/shard-00017.tar'];
  const HL=[0,2.2,-4.4]; // the headline of each step sits high behind the bucket
  const SIDE=[[-2.6,-1.1],[-2.6,-2.7],[2.6,-1.1],[2.6,-2.7]]; // the other objects in the bucket
  function draw(R,k,e){const P=R.P,UP=P.c2,DN=P.c1,lab=(p,t,o)=>R.label(p,t,Object.assign({mono:true,fs:12.5},o||{}));
    R.grid(-5,5,-4.2,3.8,.5);
    // the bucket: a flat tray of keys, no directories; at step 6 it is cut into four prefixes
    const pre=k===5?e:0;
    if(pre<1)R.glass([-3.8,.02,-3.7],[7.6,0,0],[0,0,3.6],{c:P.c5,a:.55*(1-pre),nu:8,nv:4,th:.02});
    if(pre>0)[0,1,2,3].forEach(i=>R.glass([-3.8+i*1.94,.02,-3.7],[1.8,0,0],[0,0,3.6],{c:[P.c1,P.c2,P.c3,P.c4][i],a:.5*pre,nu:2,nv:4,th:.02}));
    lab([-3.8,0,-3.7],pre>0?'4 prefixes':'bucket',{al:'left',dx:4,dy:-10,b:1,c:P.c5});
    // the other objects, then the big one (256 MiB) in the middle
    const oa=k===0?1:.3;
    SIDE.forEach((p,i)=>R.box([p[0],0,p[1]],[1.3,.4,1],{fill:mix(P.paper,P.c5,.25),a:pre>0?.25:oa}));
    if(k===0){KEYS.forEach((t,i)=>lab([SIDE[i][0]+(SIDE[i][0]<0?-.65:.65),.2,SIDE[i][1]],t,{al:SIDE[i][0]<0?'right':'left',dx:SIDE[i][0]<0?-6:6,fs:12,c:P.ink,wide:1,grp:SIDE[i][0]<0?'kl':'kr'}));
      lab(HL,'LIST: '+O.listKeys.toLocaleString('en-US')+' keys = '+O.listReq+' requests',{b:1,c:P.c5,a:e})}
    const bigIn=k===1?(e>.85?1:.12):1,parts=k===2||k===4?8:0,ph=.62;
    if(k!==5){if(parts){for(let j=0;j<8;j++){const x=OBJ[0]-OW/2+(j+.5)*OW/8,arr=k===2?at(1,e,1)*Math.min(1,Math.max(0,e*1.6-j*.08)):1;
          R.box([x,0,OBJ[2]],[OW/8-.04,ph,.9],{fill:mix(P.paper,k===2?UP:DN,.55),a:k===2?.25+.75*arr:1,shadow:j===0})}}
      else R.box(OBJ,[OW,ph,.9],{fill:mix(P.paper,k===1?UP:k===3?DN:P.c5,.5),a:bigIn})}
    lab([OBJ[0],ph,OBJ[2]],k===0?'one 256 MiB object':'256 MiB',{dy:-12,b:1,a:k===5?.4:1});
    // the HTTP API every request crosses, and the client
    R.glass([-3.4,0,ZA],[6.8,0,0],[0,1.25,0],{c:P.c6,a:.45,nu:10,nv:2});lab([3.4,1.25,ZA],'HTTP API',{al:'right',dy:-10,b:1,c:P.c6});
    R.box(CL,[3,.24,1.1],{fill:mix(P.paper,P.ink,.06),dz:200});lab([CL[0],0,CL[2]+.55],'client node',{dy:14,b:1});
    const cp=x=>[x,.4,CL[2]-.3],op=x=>[x,ph+.05,OBJ[2]+.3];
    if(k===1){R.flowArc(cp(0),op(0),1.4,{c:UP,a:e,r:.09,n:10,speed:1.4});lab(HL,'PUT: all or nothing, no rename',{b:1,c:UP,a:e});
      lab(HL,'copy + delete '+O.ren.toFixed(2)+' s vs upload '+O.put.toFixed(2)+' s (64 MiB)',{dy:18,c:P.mute,a:e,wide:1})}
    if(k===2){for(let j=0;j<8;j++){const x=OBJ[0]-OW/2+(j+.5)*OW/8;R.flowArc(cp(-1.2+j*.34),op(x),1.2+.04*j,{c:UP,a:e,r:.055,n:5,speed:1.1})}
      lab(HL,'8 parts at once · '+O.up8+' MB/s (one at a time '+O.up1+')',{b:1,c:UP,a:e})}
    if(k===3){R.flowArc(op(0),cp(0),1.4,{c:DN,a:e,r:.09,n:10,speed:1.6});lab(HL,'one GET stream · '+O.dn1+' MB/s',{b:1,c:DN,a:e});
      lab(HL,'S3: 100-200 ms to the first byte',{dy:18,c:P.mute,a:e,wide:1})}
    if(k===4){for(let j=0;j<8;j++){const x=OBJ[0]-OW/2+(j+.5)*OW/8;R.flowArc(op(x),cp(-1.2+j*.34),1.2+.04*j,{c:DN,a:e,r:.06,n:6,speed:1.9})}
      lab(HL,'8 ranged GETs at once · '+O.dn8+' MB/s',{b:1,c:DN,a:e})}
    if(k===5){[0,1,2,3].forEach(i=>{const x=-3.8+i*1.94+.9;R.flowArc(cp(-1.2+i*.8),[x,.1,-1.9],1.3,{c:[P.c1,P.c2,P.c3,P.c4][i],a:e,r:.06,n:7,speed:1.3});
        lab([x,0,-.1],'rank-'+i+'/',{dy:14,c:[P.c1,P.c2,P.c3,P.c4][i],b:1,a:e})});
      lab(HL,'each prefix: 3,500 PUT/s, 5,500 GET/s',{b:1,c:P.ink,a:e})}
  }
  const full={cam:[.3,.62],bounds:[[-4.4,0,-4.6],[4.4,2.4,3.2]]};
  const st=S3.stage({id:'stg-obj',list:'sx-obj',fig:'Fig. 2 · a bucket, an API, one big object',cam:full.cam,bounds:full.bounds,aspect:.64,dur:1500,hold:4800,draw,
    view:k=>k===0?{cam:[.3,.72],bounds:[[-4.4,0,-4.6],[4.4,2.3,1.4]]}:full});
  (window.SDSTG=window.SDSTG||{})['stg-obj']=st;
})();
