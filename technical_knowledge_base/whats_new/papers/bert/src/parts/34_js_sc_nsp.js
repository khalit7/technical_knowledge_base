// ---- Scene: next sentence prediction through [CLS] (renderer v2), with the toy BERT's real numbers: the same sentence A with its
// real next sentence (IsNext) and with a random one (NotNext). Flows into [CLS] are its layer-2 attention, heads averaged;
// C goes through the pooler (a 24 × 24 matrix and tanh) and a two-way softmax. ----
(function(){
  if(!$('stg-nsp'))return;const {at,lerp,mix}=S3;
  const A='the big dog barked at the farmer'.split(' '),BS=['the dog barked again'.split(' '),'florence flooded today'.split(' ')];
  let D=null;
  function data(){if(D)return D;D=[];try{const M=BM.load('bert');BS.forEach(b=>{const R=BM.run(M,A,b),L=R.att[1];
        D.push({words:R.words,seg:R.seg,p:R.nsp[1],att:R.words.map((_,j)=>L.reduce((s,h)=>s+h[0][j],0)/L.length)})})}
    catch(e){__jsErr('nsp scene: '+e.message);BS.forEach(b=>D.push({words:['[CLS]',...A,'[SEP]',...b,'[SEP]'],seg:[],p:0,att:[]}))}return D}
  const XS=.66,X=i=>(i-6.5)*XS,ZT=.9,Y1=.45,Y2=.83,LH=.26,TOP=Y2+LH,W=14*XS+.25,YC=TOP+.1,YG=TOP+.5,YB=TOP+1.25;
  function draw(R,k,e){const P=R.P,Dd=data(),nar=R.W<620,pi=k>=3?1:0,cur=Dd[pi];R.grid(-5.5,5.5,-1.6,2.6,.5);
    // the tokens; at step 4 sentence B is swapped for a random one
    const tokRow=(d,a,onlyB)=>d.words.forEach((w,i)=>{const b=d.seg[i]===1;if(onlyB&&!b)return;if(!onlyB&&b&&k===3)return;
      R.box([X(i),0,ZT],[.54,.26,.5],{fill:w[0]==='['?P.paper:mix(P.paper,b?P.c3:P.c1,.3),a});
      R.label([X(i),0,ZT+.3],w,{mono:w[0]==='[',serif:w[0]!=='[',fs:12,dy:nar&&i%2?27:13,a})});
    if(k===3){tokRow(Dd[0],1,false);tokRow(Dd[0],Math.max(0,1-2*e),true);tokRow(Dd[1],Math.max(0,2*e-1),true)}else tokRow(cur,1,false);
    R.label([X(0)-.4,.13,ZT],k>=3?'A + random B':'A + its next B',{al:'right',dx:-6,mono:true,fs:12,c:P.mute,grp:'L'});
    // the encoder, two layers in the toy
    const ea=Math.max(.22,at(k,e,1));R.box([0,Y1,ZT],[W,LH,.72],{fill:mix(P.paper,P.c1,.12),a:ea});R.box([0,Y2,ZT],[W,LH,.72],{fill:mix(P.paper,P.c1,.12),a:ea});
    R.label([X(0)-.4,Y1+.3,ZT],'encoder',{al:'right',dx:-6,mono:true,fs:12,c:P.ink,grp:'L',a:ea});
    // [CLS] gathers the pair: every token streams into its top state, in proportion to [CLS]'s layer-2 attention
    if(k===1||k===4){const a=k===1?e:Math.min(1,e*1.5);cur.att.forEach((w,j)=>{if(j===0||w<.015)return;
      R.flowArc([X(j),TOP+.02,ZT],[X(0),TOP+.02,ZT],.25+.05*j,{c:cur.seg[j]?P.c3:P.c1,a:a*(.3+.7*Math.min(1,w*4)),r:.035+.07*w,n:Math.max(2,Math.round(2+w*18)),speed:1.3})})}
    // C, the pooler (a glass plate) and the two-way softmax
    if(k>=1){const a=at(k,e,1);R.box([X(0),YC-.02,ZT],[.46,.18,.4],{fill:mix(P.paper,P.c4,.5),a,shadow:false});R.label([X(0)+.3,YC+.08,ZT],'C',{al:'left',dx:4,serif:true,fs:14,b:1,c:P.c4,a})}
    if(k>=2){const a=k===2?Math.min(1,e*1.6):1;R.glass([X(0)-.38,YG,ZT],[.76,0,0],[0,.5,0],{c:P.c4,a,nu:6,nv:6});
      R.label([X(0)+.45,YG+.3,ZT],'pooler · 24 × 24, tanh',{al:'left',dx:6,mono:true,fs:12,c:P.c4,a,wide:1});
      if(k===2||k===4)R.flow([[X(0),YC+.18,ZT],[X(0),YB,ZT]],{c:P.c4,a:k===2?e:Math.max(0,e*2-1),r:.06,n:5,speed:1})}
    const bars=(p,a)=>{R.box([X(0)+.15,YB-.04,ZT],[.85,.04,.34],{a,shadow:false});
      [[p,'IsNext',P.c4],[1-p,'NotNext',mix(P.paper,P.c4,.35)]].forEach(([q,nm,c],j)=>{const xb=X(0)-.08+j*.42,h=Math.max(.015,q*1.1);
        R.box([xb,YB,ZT],[.28,h,.22],{fill:c,a,shadow:false});R.label([xb+(j?.18:-.18),YB+h,ZT],nm+' '+(q*100).toFixed(q<.01?1:0)+'%',{al:j?'left':'right',mono:true,fs:12,dy:-8,b:q>=.5,c:j?P.mute:P.c4,a})})};
    if(k===2)bars(Dd[0].p*e,Math.min(1,e*1.5));else if(k===3)bars(Dd[0].p,Math.max(0,1-2*e));else if(k===4)bars(Dd[1].p*Math.max(0,e*2-1),Math.max(0,e*2-1));
  }
  const full={cam:[.22,.45],bounds:[[-4.7,0,.2],[4.7,2.9,1.6]]},close={cam:[.45,.36],bounds:[[X(0)-1.8,0,.2],[X(0)+2.6,3.2,1.6]]};
  S3.stage({id:'stg-nsp',list:'sx-nsp',fig:'Fig. 4 · next sentence prediction through [CLS]',cam:full.cam,bounds:full.bounds,aspect:.58,dur:1300,hold:4800,draw,
    view:k=>k===2||k===4?close:full,margin:w=>w<520?[14,10,14,10]:[16,14,34,150], // room under the token labels for the drag hint
    onStep:()=>{try{const d=data();$('nsP1').textContent=Math.round(d[0].p*100)+'%';$('nsP2').textContent=(d[1].p*100).toFixed(1)+'%'}catch(e){}}});
})();
