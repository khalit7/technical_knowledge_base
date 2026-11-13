// ---- Scene: Fig. 1, the hero (stg-hero): the chat product spread over machines. Three shards (key ranges as tinted glass plates), each a
// leader and two followers with their logs; Ana's "hello" flowing to shard 2's leader and on to its followers, a read landing on the
// lagging follower, and the etcd group that decides who leads each shard. Illustrative layout and log positions (100 "hi", 101 "hello"). ----
(function(){
  if(!document.getElementById('stg-hero')||!window.DSK)return;
  const {mix}=S3,{node,stack,slot,win,legs}=DSK;
  const SX=[-3.3,0,3.3],RANGE=['users A to H','users I to P','users Q to Z'];
  const LP=x=>[x,0,-.55],FP=(x,j)=>[x+(j?.68:-.68),0,.7],ANA=[-1.7,0,3.05],APP=[.55,0,2.85],ETC=[[-.9,0,-3.1],[0,0,-3.1],[.9,0,-3.1]];
  function draw(R,k,e){const P=R.P,SC=[P.c1,P.c6,P.c5];R.grid(-5.6,5.6,-4.2,4.4,.5);
    // composition: step 1 is about the key ranges, 2 about the copies, 3 and 4 about shard 2 only, 5 about the etcd group
    const focus2=k===2||k===3,nodesA=k===0?.22:1;
    SX.forEach((x,i)=>{const sa=focus2&&i!==1?.1:1,c=SC[i];
      R.glass([x-1.35,.012,-1.45],[2.7,0,0],[0,0,2.75],{c,a:(k===0?1:.55)*sa,nu:6,nv:5,th:.02});
      R.label([x,0,1.35],'Shard '+(i+1)+' · '+RANGE[i],{b:1,fs:12.5,dy:16,c,a:focus2&&i!==1?.12:1});
      // leader and followers; their logs: 100 "hi" for all, 101 "hello" on shard 2 from step 3
      const lead=LP(x),has=i===1&&k>=2,f1=has&&(k>2||win(e,.55,.8)>0),fa=nodesA*sa;
      node(R,lead,[.95,.62,.72],P.good,{a:fa,lab:k>=1?'leader':null,dy:-14-(has?14:0)});
      stack(R,lead,.78,.56,.64,has?[P.c2,P.acc]:[P.c2],null,fa,{al:has?[1,k===2?win(e,.2,.45):1]:null});
      [0,1].forEach(j=>{const p=FP(x,j),got=j===0?f1:(i===1?k>=5:false);
        node(R,p,[.82,.42,.6],P.acc,{a:fa,lab:k>=1?'F'+(j+1):null,fs:12.5,dy:-12-(i===1&&k>=2?14:0)});
        const cols=[P.c2].concat(i===1&&got?[P.acc]:[]);const y=stack(R,p,.66,.46,.44,cols,null,fa);
        if(i===1&&k>=2&&!got)slot(R,p,.66,.46,y+.02,fa);
        // the log streams from the leader to its followers
        if(k>=1&&!(focus2&&i!==1))R.flow(legs(R,[[lead[0],.85,lead[2]+.2],[p[0],.62,p[2]-.1]],.25,12),{c:i===1&&k>=2?P.acc:c,a:(k===1?.85:i===1&&k>=2?(j===0?1:.55):.35)*fa,r:.055,speed:j===1&&i===1&&k>=2?.45:1.1,n:j===1&&i===1&&k>=2?3:6})});
      if(k===0)R.flow(legs(R,[[APP[0],.4,APP[2]-.3],[x,.3,.4]],.5,16),{c,a:.9,r:.06,n:7})});
    // Ana and the app servers
    const fa2=k===4?.35:1;
    node(R,ANA,[.55,.5,.5],P.c4,{a:fa2});R.label([ANA[0]-.3,.25,ANA[2]],'Ana',{b:1,fs:13,al:'right',dx:-8,dy:-8,a:Math.max(.4,fa2)});
    if(k>=2)R.label([ANA[0]-.3,.25,ANA[2]],k===3?'"hello" is gone':'sent "hello"',{fs:12,al:'right',dx:-8,dy:8,wide:1,c:k===3?P.bad:P.mute,b:k===3,a:Math.max(.4,fa2)});
    node(R,APP,[1.1,.4,.55],P.mute,{a:fa2,t:.18});R.label([APP[0]+.6,.2,APP[2]],'app servers',{b:1,fs:12.5,al:'left',dx:8,a:Math.max(.4,fa2)});
    R.flow(legs(R,[[ANA[0]+.3,.3,ANA[2]],[APP[0]-.55,.25,APP[2]]],.15,8),{c:P.c4,a:.6*fa2,r:.05,n:3});
    // 3. the write: Ana to the app to shard 2's leader
    if(k===2){const pts=legs(R,[[APP[0],.45,APP[2]-.25],[LP(0)[0],1.05,LP(0)[2]+.3]],.7,18);R.flow(pts,{c:P.acc,a:1,r:.075,speed:1.3,n:8});
      R.label([0,1.5,-.55],'write "hello" · position 101',{fs:12.5,b:1,c:P.acc,dy:-30,a:win(e,0,.3)})}
    // 4. the read lands on the lagging follower and comes back without "hello"
    if(k===3){const f2=FP(0,1);R.flow(legs(R,[[f2[0],.6,f2[2]+.2],[APP[0]+.3,.45,APP[2]-.2]],.45,14),{c:P.bad,a:1,r:.075,speed:1.2,n:7});
      R.label([f2[0],.6,f2[2]],'replayed up to 100',{fs:12.5,b:1,c:P.bad,al:'left',dx:30,dy:-6})}
    // 5. the etcd group decides which node leads each shard
    const ea=k===4?e:k<4?0:1;
    if(ea>.01){R.glass([-1.45,.012,-3.55],[2.9,0,0],[0,0,.9],{c:P.c4,a:ea*.8,nu:3,nv:1,th:.02});
      ETC.forEach((p,j)=>node(R,p,[.5,j===1?.5:.36,.42],j===1?P.good:P.c4,{a:ea,t:.4}));
      R.label([0,.5,-3.1],'etcd · 3 nodes, Raft',{b:1,fs:12.5,dy:-14,c:P.c4,a:ea});
      SX.forEach(x=>R.flow(legs(R,[[0,.55,-3],[x,.75,-.8]],.5,16),{c:P.c4,a:ea*.9,r:.06,n:6}))}
  }
  const full={cam:[.2,.66],bounds:[[-4.8,0,-1.6],[4.8,1.0,3.4]]};
  let st=null;const narrow=()=>st&&st.R&&st.R.W<520;
  st=S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · one product, many machines',cam:full.cam,bounds:full.bounds,aspect:.6,dur:1500,hold:4600,draw,
    margin:w=>w<520?[22,8,14,8]:[26,16,16,16],
    view:k=>narrow()?(k===2||k===3?{cam:[1.25,.95],bounds:[[-2.2,0,-1.5],[2.2,1.2,3.4]]}:{cam:[1.3,.95],bounds:k===4?[[-4.8,0,-3.6],[4.8,1.0,1.4]]:full.bounds}):k===2||k===3?{cam:[.12,.58],bounds:[[-2.6,0,-1.5],[2.2,1.2,3.4]]}:k===4?{cam:[.2,.7],bounds:[[-4.8,0,-3.6],[4.8,1.0,1.4]]}:full});
})();
