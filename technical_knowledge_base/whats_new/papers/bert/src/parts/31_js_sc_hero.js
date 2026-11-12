// ---- Scene: the hero, the paper's Figure 1 in 3D (renderer v2): one pair of sentences, one encoder pretrained with two losses,
// then copied once per task and given one small output layer. The pretraining numbers are the page's toy BERT on this pair. ----
(function(){
  if(!$('stg-hero'))return;const {at,lerp,mix}=S3;
  const A='the big dog barked at the farmer'.split(' '),B='the dog barked again'.split(' '),MI=2;     // the word hidden for the masked LM: "dog"
  const TK=['[CLS]',...A.map((w,i)=>i===MI?'[MASK]':w),'[SEP]',...B,'[SEP]'],n=TK.length,MP=MI+1,SA=A.length+1; // MP: the [MASK] position; SA: the first [SEP]
  let D=null;
  function data(){if(D)return D;try{const M=BM.load('bert'),w=A.slice();w[MI]='[MASK]';const R=BM.run(M,w,B);
      const pr=BM.softmax(Array.from(R.lm[MP]).map((v,j)=>j<4?-1e9:v)),top=pr.map((p,i)=>[p,i]).sort((a,b)=>b[0]-a[0]).slice(0,3).map(([p,i])=>[BM.vocab[i],p]);
      const av=(l,i)=>R.att[l][0][i].map((_,j)=>R.att[l].reduce((s,h)=>s+h[i][j],0)/R.att[l].length);   // heads averaged
      D={top,nsp:R.nsp[1],am:av(1,MP),ac:av(1,0)}}catch(e){__jsErr('hero: '+e.message);D={top:[['?',0]],nsp:0,am:TK.map(()=>1/n),ac:TK.map(()=>1/n)}}return D}
  const XS=.66,X=i=>(i-(n-1)/2)*XS,W=n*XS+.25,ZC=[0,-2.5,-5],Y1=.5,Y2=.88,LH=.26,TOP=Y2+LH,YH=TOP+.2;
  const segOf=i=>i===0?'s':i<=SA?'a':'b';
  function tokens(R,z,a,lab){const P=R.P,nar=R.W<620;TK.forEach((t,i)=>{const s=segOf(i),m=i===MP;
      const fill=m?mix(P.paper,P.c2,.55):s==='a'?mix(P.paper,P.c1,.3):s==='b'?mix(P.paper,P.c3,.3):P.paper;
      R.box([X(i),0,z],[.54,.26,.5],{fill,a});
      if(lab)R.label([X(i),0,z+.3],t,{mono:t[0]==='[',serif:t[0]!=='[',fs:12,dy:nar&&i%2?27:13,b:m,c:m?P.c2:P.ink,a})})}
  function stack(R,z,a,fill){R.box([0,Y1,z],[W,LH,.72],{fill,a});R.box([0,Y2,z],[W,LH,.72],{fill,a})}
  function draw(R,k,e){const P=R.P,T=data();R.grid(-5.5,5.5,-6.2,1.4,.5);
    const pre=k<4?1:k===4?1-e:0;                       // the pretraining heads fade out fully once the copies appear
    // the input pair and the encoder (copy 0 is the pretrained model itself)
    tokens(R,ZC[0],1,true);
    const fin=k>=5?mix(P.paper,P.c5,.3*e):mix(P.paper,P.c1,.14);
    stack(R,ZC[0],Math.max(.25,at(k,e,1)),fin);
    R.label([X(0)-.45,.13,ZC[0]],'input',{al:'right',dx:-6,mono:true,fs:12,c:P.mute,grp:'L0',a:k<4?1:.6});
    R.label([X(0)-.45,Y1+.3,ZC[0]],k>=4?'GLUE copy':'encoder',{al:'right',dx:-6,mono:true,fs:12,c:k>=4?P.c4:P.ink,grp:'L0',a:at(k,e,1)});
    // step 2: every column flows up through the layers, and the masked position gathers from both sides
    if(k===1){const a=Math.min(1,e*1.4);for(let i=0;i<n;i++)R.flow([[X(i),.28,ZC[0]],[X(i),TOP+.02,ZC[0]]],{c:P.c1,a:a*.7,r:.045,n:3,speed:.9});
      T.am.forEach((w,j)=>{if(j===MP||w<.03)return;R.flowArc([X(j),TOP+.02,ZC[0]],[X(MP),TOP+.02,ZC[0]],.25+.06*Math.abs(j-MP),{c:P.c2,a:a*(.35+.65*Math.min(1,w*3)),r:.04+.06*w,n:Math.max(2,Math.round(2+w*14)),speed:1.2})})}
    // step 3: the masked LM reads T at [MASK]: the toy BERT's top three words, bars on a white plinth
    if(k>=2){const a=at(k,e,2)*pre,x0=X(MP);R.box([x0+.35,YH-.04,ZC[0]],[1.15,.04,.34],{a,shadow:false});
      T.top.forEach(([w,p],j)=>{const xb=x0+j*.36,h=Math.max(.015,p*1.05*(k===2?e:1));R.box([xb,YH,ZC[0]],[.24,h,.2],{fill:j===0?P.c2:mix(P.paper,P.c2,.35),a,shadow:false});
        if(j===0)R.label([xb,YH+h,ZC[0]],w+' '+(p*100).toFixed(1)+'%',{mono:true,fs:12.5,dy:-28,b:1,c:P.c2,a})});
      if(k===2)R.flow([[x0,TOP+.02,ZC[0]],[x0,YH,ZC[0]]],{c:P.c2,a:e,r:.06,n:4});
    }
    // step 4: next sentence prediction from C, the final state of [CLS]: every token streams into it, in proportion to [CLS]'s layer-2 attention
    if(k>=3){const a=at(k,e,3)*pre,x0=X(0);
      if(k===3)T.ac.forEach((w,j)=>{if(j===0||w<.02)return;R.flowArc([X(j),TOP+.02,ZC[0]],[x0,TOP+.02,ZC[0]],.3+.05*j,{c:P.c4,a:e*(.3+.7*Math.min(1,w*4)),r:.04+.06*w,n:Math.max(2,Math.round(2+w*16)),speed:1.3})});
      R.box([x0,YH-.04,ZC[0]],[.7,.04,.34],{a,shadow:false});
      [[T.nsp,'IsNext',P.c4],[1-T.nsp,'NotNext',mix(P.paper,P.c4,.3)]].forEach(([p,nm,c],j)=>{const xb=x0-.15+j*.3,h=Math.max(.015,p*1.05*(k===3?e:1));
        R.box([xb,YH,ZC[0]],[.22,h,.2],{fill:c,a,shadow:false});if(j===0)R.label([xb,YH+h,ZC[0]],nm+' '+Math.round(p*100)+'%',{mono:true,fs:12,dy:-10,b:1,c:P.c4,a})});
    }
    // step 5: copies of the pretrained encoder, one per task, slide back from the original
    if(k>=4){const a=k===4?e:1;[1,2].forEach(c=>{const z=lerp(ZC[0],ZC[c],k===4?e:1);tokens(R,z,a*.55,false);stack(R,z,a,fin);
        if(k===4)R.flowArc([0,TOP,ZC[0]],[0,TOP,z],.6,{c:P.c5,a:e,r:.07,n:8,speed:1.6})});
      R.label([X(0)-.45,Y1+.3,ZC[1]],'SQuAD copy',{al:'right',dx:-6,mono:true,fs:12,c:P.c6,grp:'L1',a});
      R.label([X(0)-.45,Y1+.3,ZC[2]],'NER copy',{al:'right',dx:-6,mono:true,fs:12,c:P.c3,grp:'L2',a})}
    // step 6: one small output layer each (drawn, not run), and every weight is fine-tuned
    if(k>=5){const a=e;
      R.glass([X(0)-.32,TOP+.06,ZC[0]],[.64,0,0],[0,.45,0],{c:P.c4,a,nu:4,nv:3});R.label([X(0),TOP+.55,ZC[0]],'label from C',{mono:true,fs:12,dy:-8,c:P.c4,a});
      const s0=9,s1=11;[[s0,'start',P.c6],[s1,'end',P.c2]].forEach(([i,nm,c])=>{R.glow([X(i),TOP+.25,ZC[1]],.32,{c,a});R.ball([X(i),TOP+.25,ZC[1]],.09,{c,a});R.label([X(i),TOP+.25,ZC[1]],nm,{mono:true,fs:12,dy:-16,c,a})});
      for(let i=1;i<n;i++){if(TK[i][0]==='[')continue;R.box([X(i),TOP+.04,ZC[2]],[.4,.12,.36],{fill:i===10?mix(P.paper,P.c3,.6):P.paper,a,shadow:false})}
      R.label([X(10),TOP+.16,ZC[2]],'a tag per token',{mono:true,fs:12,dy:-12,c:P.c3,a})}
  }
  const close={cam:[.22,.5],bounds:[[-4.6,0,-.5],[4.6,2.35,.6]]},far={cam:[.28,.86],bounds:[[-4.7,0,-5.6],[4.7,2,.7]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · pretrain once, copy per task',cam:close.cam,bounds:close.bounds,aspect:.52,dur:1400,hold:5200,draw,
    view:k=>k>=4?far:close,margin:w=>w<520?[14,10,14,10]:[18,14,14,110],
    onStep:()=>{try{const T=data();$('hr-p').textContent=(T.top[0][1]*100).toFixed(1)+'%';$('hr-n').textContent=Math.round(T.nsp*100)+'%'}catch(e){}}});
})();
