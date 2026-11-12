// ---- Scene: write the caption against pick the pair (Figure 2's question, Figure 3's loss), on the same four real pairs of the toy web (renderer v2).
// Pick the pair: image and text encoders (glass plates) into two embedding sets, the 4 x 4 logits on a glass plate, the row softmax, the column softmax and
// the symmetric loss. Write the caption: every token is one choice out of the toy's 66-token vocabulary (a glass plate of 6 x 11 cells, the chosen
// token lit); most tokens are phrasing the picture cannot predict. Numbers: the shipped toy CLIP and the toy captioner's training log. ----
(function(){
  if(!$('stg-obj')||!window.CS)return;const {at,lerp,mix}=S3;
  const xs=j=>(j-1.5),zs=i=>(i-1.5),YM=.55,YP=.32,XI=-3.15,ZT=-3.15,XC=-5.3,ZC=-5.15,XE=-4.35,ZE=-4.25;
  const WX=q=>-2.1+q*.68;
  let mode='con';
  function inputs(R,k,e,P,D,showText){
    D.OBS.forEach((p,i)=>{CS.card(R,p.img,[XC,0,zs(i)],.6,1);R.label([XC-.4,.3,zs(i)],'I'+(i+1),{al:'right',dx:-4,mono:true,fs:12,b:1,grp:'img'})});
    R.glass([XE,.08,-2],[0,0,4],[0,.75,0],{c:P.c1,nu:8,nv:4,a:1});R.label([XE,.95,-2],'image encoder',{mono:true,fs:12,c:P.c1,dy:-6});
    if(k===0)D.OBS.forEach((_,i)=>R.flow([[XC+.35,.3,zs(i)],[XE,.4,zs(i)],[XI-.62,YP+.05,zs(i)]],{c:P.c1,a:e,r:.06,n:6}));
    const ia=k===0?e:1;D.I.forEach((x,i)=>CS.comb(R,[XI,YP,zs(i)],x.e,D.mE,mix(P.paper,P.c1,.55),ia,.42,1.3,'x'));
    if(!showText)return;
    const ta=at(k,e,1);D.OBS.forEach((_,j)=>CS.tag(R,[xs(j),0,ZC],.74,'T'+(j+1),ta,{lab:{dy:-9,b:1}}));
    R.glass([-2,.08,ZE],[4,0,0],[0,.75,0],{c:P.c4,nu:8,nv:4,a:ta});R.label([2.1,.5,ZE],'text encoder',{al:'left',dx:6,mono:true,fs:12,c:P.c4,a:ta});
    if(k===1)D.OBS.forEach((_,j)=>R.flow([[xs(j),.12,ZC+.2],[xs(j),.4,ZE],[xs(j),YP+.05,ZT-.62]],{c:P.c4,a:e,r:.06,n:6}));
    D.T.forEach((x,j)=>CS.comb(R,[xs(j),YP,ZT],x.e,D.mE,mix(P.paper,P.c4,.55),ta,.42,1.3,'z'))}
  function con(R,k,e){const P=R.P,D=CS.data(),n=D.n;inputs(R,k,e,P,D,true);
    const ga=at(k,e,2);if(ga<=0)return;R.glass([-2,YM,-2],[4,0,0],[0,0,4],{c:P.c5,a:ga,nu:4,nv:4});
    if(k===2)for(let i=0;i<n;i++){R.flow([[XI+.62,YP+.1,zs(i)],[1.9,YM+.08,zs(i)]],{c:P.c1,a:e*.8,r:.05,n:7,speed:1.4});R.flow([[xs(i),YP+.1,ZT+.62],[xs(i),YM+.08,1.9]],{c:P.c4,a:e*.8,r:.05,n:7,speed:1.4})}
    // rows: each image picks its caption (k = 3); columns: each caption picks its image (k = 4); dots stream along what is being normalised
    if(k===3)for(let i=0;i<n;i++)R.flow([[XI+.62,YM+.15,zs(i)],[1.9,YM+.15,zs(i)]],{c:P.c1,a:e,r:.06,n:9,speed:1.5});
    if(k===4)for(let j=0;j<n;j++)R.flow([[xs(j),YM+.15,ZT+.62],[xs(j),YM+.15,1.9]],{c:P.c4,a:e,r:.06,n:9,speed:1.5});
    for(let i=0;i<n;i++)for(let j=0;j<n;j++){const lg=D.L[i][j],d=i===j,hL=Math.abs(lg)/D.mL*1.15,hR=D.row[i][j]*1.5,hC=D.col[i][j]*1.5;
      const h=Math.max(.015,k===2?hL*e:k===3?lerp(hL,hR,e):k===4?lerp(hR,hC,e):hL),neg=lg<0&&k<=2;
      const fill=k>=3?(d?mix(P.paper,P.good,.75):mix(P.paper,k===3?P.c1:P.c4,.25)):(lg>=0?mix(P.paper,P.c5,.55):mix(P.paper,P.c5,.2));
      R.box([xs(j),neg?YM-h:YM,zs(i)],[.46,h,.46],{fill,a:ga,shadow:false});
      if(d||k<3)R.label([xs(j),neg?YM:YM+h,zs(i)],k<3?lg.toFixed(1):CS.pct(k===3?D.row[i][j]:D.col[i][j]),{mono:true,fs:12,dy:neg?10:-10,b:d,c:d?(k>=3?P.good:P.ink):P.mute,a:ga*(d?1:.85)})}
    R.label([2.1,YM,-2],k===2?'logits = cos × scale':k===3?'softmax along each row':'softmax down each column',{al:'left',dx:6,mono:true,fs:12,c:k===3?P.c1:k===4?P.c4:P.c5,a:ga,grp:'hd'})}
  function cap(R,k,e){const P=R.P,D=CS.data();inputs(R,k,e,P,D,false);if(k<1)return;
    const fade=k===4?1-.75*e:1;
    D.caps.forEach((ws,i)=>{if(k===1&&i>0)return;const z=zs(i),upto=k===1?Math.min(ws.length,Math.floor(e*ws.length*1.15+.001)):ws.length,ids=TG.tokens(D.OBS[i].cap).slice(1);
      ws.forEach((w,q)=>{if(q>=upto)return;const about=CS.ABOUT.has(w),eos=w==='<eos>',hl=k>=3&&!about&&!eos;
        const fill=hl?mix(P.paper,P.c2,.75):k>=3&&about?mix(P.paper,P.c1,.45):P.paper,lift=hl?.18*(k===3?e:1):0;
        R.box([WX(q),lift,z],[.58,.16,.42],{fill,a:fade,shadow:!lift});R.label([WX(q),.16+lift,z],w,{mono:true,fs:12,dy:-9,a:fade,b:hl,c:hl?P.c2:P.ink,wide:(k===1&&q===upto-1)||(k===3&&hl)?0:1});
        // the vocabulary behind each written word: 66 cells, the chosen token lit
        if(k===1){const cur=q===upto-1,id=ids[q]==null?2:ids[q],u=id%6,v=Math.floor(id/6),o0=[WX(q)-.27,.3,z-.4];
          R.glass(o0,[.54,0,0],[0,.99,0],{c:P.c4,nu:6,nv:11,a:cur?1:.35});R.ball([o0[0]+.045+u*.09,o0[1]+.99-.045-v*.09,z-.38],.05,{c:P.c2,a:cur?1:.5});
          if(cur)R.flow([[XI+.62,YP+.15,z],[WX(q),.6,z-.2]],{c:P.c1,r:.05,n:6,speed:1.4})}})});
    if(k===1)R.label([WX(0)-.3,1.3,zs(0)-.4],'one choice out of '+D.V+' tokens, per word',{al:'left',mono:true,fs:12,c:P.c4,wide:1});
    if(k>=4){const a=e,bits=D.toks*Math.log2(D.V),paid=D.lmLoss!=null?D.lmLoss/Math.LN2*D.toks:null,pick=D.n*Math.log2(D.n),sc=1.9/bits;
      [[bits,'write: at most '+bits.toFixed(0)+' bits',P.c4],[paid,'captioner still pays '+(paid==null?'?':paid.toFixed(0))+' bits',mix(P.paper,P.c4,.5)],[pick,'pick the pair: at most '+pick.toFixed(0)+' bits',P.c1]].forEach(([v,t,c],j)=>{if(v==null)return;
        const z=-1.3+j*1.2,h=Math.max(.02,v*sc*a);R.box([4.9,0,z],[.6,h,.6],{fill:c,a});R.label([5.25,h,z],t,{al:'left',dx:6,mono:true,fs:12,b:j!==1,c:j===2?P.c1:P.c4,a,grp:'bits'})})}}
  function draw(R,k,e){R.grid(-6,6,-5.8,2.4,.5);if(mode==='con')con(R,k,e);else cap(R,k,e)}
  const full={cam:[.4,.7],bounds:[[-5.7,0,-5.5],[2.3,1.7,2.1]]},words={cam:[.22,.72],bounds:[[-5.7,0,-2.2],[4.4,.9,2.1]]},bars={cam:[.22,.62],bounds:[[-5.7,0,-2.2],[8.2,2.1,2.1]]},closeV={cam:[.25,.42],bounds:[[-5.7,0,-2.6],[4.4,1.5,-.6]]};
  const st=S3.stage({id:'stg-obj',list:'sx-con',fig:'Fig. 2 and 3 · what each objective asks of the model',cam:full.cam,bounds:full.bounds,aspect:.64,dur:1400,hold:5000,draw,
    view:k=>mode==='con'?full:k===1?closeV:k===4?bars:words,margin:w=>w<520?[14,10,14,10]:[18,14,14,60],
    onStep:()=>{try{const D=CS.data();$('ob-loss').textContent=D.loss.toFixed(3);$('ob-li').textContent=D.li.toFixed(2);$('ob-lt').textContent=D.lt.toFixed(2);
      $('ob-toks').textContent=D.toks;$('ob-bits').textContent=(D.toks*Math.log2(D.V)).toFixed(0);$('ob-paid').textContent=D.lmLoss==null?'(log missing)':(D.lmLoss/Math.LN2*D.toks).toFixed(0)+' bits ('+(D.lmLoss/Math.LN2).toFixed(2)+' bits per token at the end of training, from its log)'}catch(err){__jsErr('objective: '+err.message)}}});
  segBind('obM',m=>{mode=m;$('obM').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===m?'true':'false'));['con','cap'].forEach(x=>$('sx-'+x).hidden=x!==m);if(st)st.list('sx-'+m)});
})();
