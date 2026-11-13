// ---- Scene (Fig. 3): the five structures of Table 2 at matched cost, renderer v2. Each structure stands on its slot: its stacks as slabs (one slab per block;
// blue encoder and orange decoder weights, purple one set of weights used for everything), its attention mask as a glass plate on the floor in front
// (the paper's Figures 3 and 4: row = the position attending, column = the position it reads; fully visible, causal, causal with a prefix), and dots
// flowing where the words go. Data: the page's example (7 input words, 3 target words; 11 tokens with the "target:" marker in one stack) and the
// parameter and cost labels of Table 2 (P one BERT-Base-sized stack, M the encoder-decoder's FLOPs per example). The scores stay in the prediction below.
(function(){
  if(!document.getElementById('stg-arch'))return;const {at,off,lerp,mix}=S3;
  const X=['translate','English','to','German:','That','is','good.'],Y=['Das','ist','gut.'];
  const SL=[{k:'ed',nm:'enc-dec',cost:'2P · M',st:[[-.55,12,'c1'],[.55,12,'c2']],m:'ed'},{k:'sh',nm:'shared',cost:'P · M',st:[[-.55,12,'c4'],[.55,12,'c4']],m:'ed',shared:1},
    {k:'half',nm:'6 + 6',cost:'P · M/2',st:[[-.55,6,'c1'],[.55,6,'c2']],m:'ed'},{k:'lm',nm:'language model',cost:'P · M',st:[[0,12,'c4']],m:'lm'},
    {k:'plm',nm:'prefix LM',cost:'P · M',st:[[0,12,'c4']],m:'plm'}];
  const SX=i=>-6+3*i,ZS=-.75,SH=.1,SG=.025,PS=2.2,PZ=.3;
  // which keys a query may read (the 2D figure's rule, kept): 0 none, 1 encoder self, 2 decoder self, 3 cross, 4 one stack
  const N=m=>m==='ed'?10:11,NI=m=>m==='ed'?7:8;
  function cell(m,i,j){const n=NI(m);if(m==='ed'){if(i<n)return j<n?1:0;return j<n?3:(j<=i?2:0)}if(m==='lm')return j<=i?4:0;if(i<n)return j<n?4:0;return j<=i?4:0}
  function draw(R,k,e){const P=R.P,COL=[null,P.c1,P.c2,P.c3,P.c4];R.grid(-8,8,-2,3.2,.5);
    SL.forEach((S,s)=>{const sx=SX(s),focus=k===5||k===s,a=k===5?1:focus?1:.12,la=k===5||focus?1:0,fa=k<5&&k===s?e:1;
      // stacks: one slab per block
      S.st.forEach(([dx,L,c])=>{for(let l=0;l<L;l++)R.box([sx+dx,l*(SH+SG),ZS],[.8,SH,.6],{fill:mix(P.paper,P[c],.5),a,lw:.6,shadow:l===0})});
      const top=S.st[0][1]*(SH+SG);
      if(S.shared)R.line([[sx-.55,top+.12,ZS],[sx-.55,top+.32,ZS],[sx+.55,top+.32,ZS],[sx+.55,top+.12,ZS]],{c:P.c4,w:2,dash:[4,3],a});
      R.label([sx,top+(S.shared?.32:0),ZS],S.nm,{fs:12.5,b:focus,dy:-14,c:P.ink,a:la});
      R.label([sx,0,PZ+PS],S.cost,{fs:12.5,mono:true,b:1,dy:16,c:P.ink,a:la});
      // the mask on the floor in front
      const m=S.m,n=N(m),c=PS/n,x0=sx-PS/2;
      R.glass([x0,.01,PZ],[PS,0,0],[0,0,PS],{c:P.mute,a:a*.7,nu:n,nv:n,th:.02});
      for(let i=0;i<n;i++)for(let j=0;j<n;j++){const kd=cell(m,i,j);if(!kd)continue;
        // in the step about this structure the mask fills in row by row as the step plays
        const ra=focus&&k<5?Math.min(1,Math.max(0,fa*n*1.3-i)):1;if(ra<=.01)continue;
        const cx0=x0+j*c+c*.1,cz0=PZ+i*c+c*.1,w=c*.8;R.quad([[cx0,.05,cz0],[cx0+w,.05,cz0],[cx0+w,.05,cz0+w],[cx0,.05,cz0+w]],{fill:mix(P.paper,COL[kd],.78),a:a*ra,edge:false})}
      // the input / target boundary
      const b=NI(m)*c;R.line([[x0+b,.07,PZ],[x0+b,.07,PZ+PS]],{c:P.mute,w:1,dash:[3,2],a:a*.8});R.line([[x0,.07,PZ+b],[x0+PS,.07,PZ+b]],{c:P.mute,w:1,dash:[3,2],a:a*.8});
      // where the words go in the step about this structure
      if(k===s){const fl=Math.min(1,e*1.6);
        if(S.st.length===2){const [ex,eL]=S.st[0],[dx2,dL]=S.st[1],eh=eL*(SH+SG),dh=dL*(SH+SG);
          R.flow([[sx+ex,.05,ZS+.42],[sx+ex,eh,ZS+.42]],{c:S.shared?P.c4:P.c1,a:fl,r:.055,speed:.9});
          [.3,.6,.9].forEach(f=>R.flowArc([sx+ex+.3,eh,ZS],[sx+dx2-.3,dh*f,ZS],.25,{c:P.c3,a:fl*.8,r:.045,n:4,speed:1}));
          R.flow([[sx+dx2,.05,ZS+.42],[sx+dx2,dh+.25,ZS+.42]],{c:S.shared?P.c4:P.c2,a:fl,r:.055,speed:.9});
          R.label([sx+ex-.45,eh*.5,ZS],'7 input words',{al:'right',dx:-6,fs:12,c:P.c1,a:fl,wide:1});R.label([sx+dx2+.45,dh*.5,ZS],'3 target words',{al:'left',dx:6,fs:12,c:P.c2,a:fl,wide:1})}
        else{const h=12*(SH+SG);R.flow([[sx,.05,ZS+.42],[sx,h+.25,ZS+.42]],{c:P.c4,a:fl,r:.055,speed:.9});R.label([sx+.45,h*.5,ZS],'11 tokens, one sequence',{al:'left',dx:6,fs:12,c:P.c4,a:fl,wide:1})}
        // one query row picked out on the plate, and what it may read
        const qi=m==='ed'?7:0,txt=m==='ed'?'"Das" reads all 7 inputs and itself':m==='lm'?'"translate" reads only itself':'"translate" reads the whole prefix';
        const z0=PZ+qi*c,z1=z0+c;R.quad([[x0,.08,z0],[x0+PS,.08,z0],[x0+PS,.08,z1],[x0,.08,z1]],{fill:P.q,fa:.18,a:fl,ec:P.q,ea:.9,lw:1.4});
        R.label([x0+PS,.08,z0+c/2],txt,{al:'left',dx:8,fs:12,b:1,c:P.q,a:fl,wide:1})}});
  }
  const full={cam:[.2,.66],bounds:[[-7.3,0,-1.2],[7.3,1.9,2.6]]};
  const near=s=>({cam:[.22,.74],bounds:[ [SX(s)-1.6,0,-1.2],[SX(s)+(innerWidth<520?1.6:2.9),1.9,2.6]]});
  S3.stage({id:'stg-arch',list:'sx-arch',fig:'Fig. 3 · five structures, matched on cost',cam:full.cam,bounds:full.bounds,aspect:.54,dur:1500,hold:5200,draw,
    margin:w=>w<520?[18,10,22,10]:[20,14,24,14],
    // each structure's step moves in close on it (with room on the right for the row note); the last step shows all five
    view:k=>k<5?near(k):full});
})();
