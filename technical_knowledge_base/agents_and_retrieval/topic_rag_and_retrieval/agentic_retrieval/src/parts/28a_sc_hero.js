// ---- Scene: Fig. 1, who decides what the model reads (renderer v2). Data: window.AR.comp (the root's recorded runs, Qwen3-1.7B), the question
// "Where was the music festival Billy McFarland was charged with wire fraud for supposed to take place?" under three strategies: the top-5 pipeline
// (one call), the ReAct agent (three calls) and long context (the question's own 10 paragraphs, one call); then the 200-question means (AR.out.res).
// Each call is a slab whose length is its prompt tokens, to scale; an agent call's grey part is the previous call's prompt plus its output (re-read).
// The corpus tiles stand for the 9,760 paragraphs; where a paragraph's tile sits is layout only. ----
(function(){
  if(!document.getElementById('stg-hero')||!window.ARL)return;const {mix}=S3;
  const A=ARL.A,C=A.comp,HQ=C.q.findIndex(q=>/Billy McFarland/.test(q));if(HQ<0)return;
  const row=C.rows[HQ],g=row.g,T=C.titles,fi=n=>Math.round(n).toLocaleString('en-GB');
  const k5=row.single_k5,re=row.react,lc=row.longctx,srch=re.st.filter(s=>s[0]==='s');
  const mean=a=>a.reduce((s,v)=>s+v,0)/a.length,M=s=>({tok:mean(A.out.res[s].tok),f1:mean(A.out.res[s].f1)});
  const MS={single_k5:M('single_k5'),react:M('react'),longctx:M('longctx')},R_LC=A.out.res.longctx.f1[HQ].toFixed(2);
  // corpus tiles: 7 x 9; the two gold paragraphs get fixed places, the others fill free places in a fixed scattered order
  const NC=7,NR=9,TX=c=>-6+c*.4,TZ=r=>-1.85+r*.4625,slots=[];for(let i=0;i<NC*NR;i++)slots.push(i);
  const order=slots.map(i=>[(i*37+11)%(NC*NR),i]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);
  const where={},fixed={[g[0]]:2*NR+3,[g[1]]:5*NR+6},taken=new Set(Object.values(fixed));let nx=0;
  const tile=id=>{if(where[id]!=null)return where[id];if(fixed[id]!=null)return where[id]=fixed[id];while(taken.has(order[nx]))nx++;taken.add(order[nx]);return where[id]=order[nx++]};
  const tpos=s=>[TX(Math.floor(s/NR)),.07,TZ(s%NR)];
  const k5t=k5.st[0][2].map(tile),s1t=srch[0][2].map(tile),s2t=srch[1][2].map(tile);
  const lct=[tile(g[0]),tile(g[1])];for(let j=0;j<8;j++)lct.push(tile('lc'+j)); // the question's 8 distractor paragraphs are not in the data: placed for layout
  // lanes: one per decider (back to front: engineer, model, nobody); one row per model call; 2,500 tokens = 5.6 units
  const X0=-2.7,HS=5.6/2500,TH=.16,TD=.36,RS=.46,Z={single_k5:-1.75,react:0,longctx:1.75},LW=5.8;
  const COL=P=>({single_k5:P.acc,react:P.c2,longctx:P.c4});
  const NAME={single_k5:'the engineer · one search, top 5',react:'the model · ReAct loop, a row per call',longctx:'nobody · everything in the window'};
  const NROW={single_k5:1,react:3,longctx:1},rz=(s,j)=>Z[s]+(j-(NROW[s]-1)/2)*RS;
  function slab(R,z,re0,nw,fill,a){const P=R.P;
    if(re0>0)R.box([X0+re0*HS/2,0,z],[re0*HS,TH,TD],{fill:mix(P.paper,P.mute,.3),a});
    if(nw>0)R.box([X0+(re0+nw/2)*HS,0,z],[nw*HS,TH,TD],{fill,a});return X0+(re0+nw)*HS}
  function draw(R,k,e){const P=R.P,K=COL(P),nar=R.W<520;R.grid(-6.6,3.6,-2.6,2.6,.5);
    // the corpus: recedes once the strategies run
    const ca=k===0?1:k===5?.25:.55;
    for(let s=0;s<NC*NR;s++){const gi=s===tile(g[0])?1:s===tile(g[1])?2:0,p=tpos(s);
      R.box([p[0],0,p[2]],[.3,.07,.36],{fill:gi===1?P.c3:gi===2?P.c2:P.paper,a:gi?Math.max(ca,.75):ca*.8,lw:.7,shadow:false})}
    if(k===0){[tile(g[0]),tile(g[1])].forEach((s,i)=>{const p=tpos(s);R.glow([p[0],.12,p[2]],.35,{c:i?P.c2:P.c3,a:e})});
      R.label(tpos(tile(g[0])),'Billy McFarland (entrepreneur) · hop 1',{fs:12.5,b:1,c:P.c3,dy:-14,a:e});
      R.label(tpos(tile(g[1])),'Fyre Festival · hop 2',{fs:12.5,b:1,c:P.c2,dy:22,a:e})}
    R.label([TX(3),.1,TZ(NR-1)+.2],'corpus · 9,760 paragraphs',{fs:12.5,mono:true,c:P.mute,dy:18});
    // lane floors and names
    Object.keys(Z).forEach(s=>{const z0=rz(s,0)-TD/2-.08,z1=rz(s,NROW[s]-1)+TD/2+.08;R.quad([[X0-.1,0,z0],[X0+LW,0,z0],[X0+LW,0,z1],[X0-.1,0,z1]],{fill:K[s],fa:.06,ec:K[s],ea:.25,a:1});
      R.label([X0-.1,0,z0],NAME[s],{fs:12.5,b:1,c:K[s],al:'left',dy:-7,grp:'lane',a:k===0?.5:1})});
    const fresh=k===5?1-Math.min(1,e*2):1; // single-question slabs fade out fully before the means appear
    const dim=act=>k===5?fresh:act?1:.45;
    const fl=(tiles,to,c,a)=>tiles.forEach(s=>{const p=tpos(s);R.flowArc([p[0],.1,p[2]],to,.9,{c,a,r:.06,n:6,speed:1.4})});
    const lab=(x,z,t,a,o)=>R.label([x,TH/2,z],t,Object.assign({fs:12.5,mono:true,al:'left',dx:8,c:P.ink,a},o||{}));
    // 1. the engineer: one search with the question, top 5, one call
    if(k>=1){const a=dim(k===1),w=k===1?e:1,z=rz('single_k5',0),x=slab(R,z,0,k5.c[0][0]*w,K.single_k5,a);
      if(k===1)fl(k5t,[X0+.6,TH,z],P.acc,Math.min(1,e*2));
      lab(x,z,fi(k5.c[0][0]*w)+(nar?'':' · "'+k5.a+'"')+' · wrong',k===1?e*a:a)}
    // 2-3. the model: three calls; each re-reads the call before and its output (grey) and adds the thought and what the last search returned
    if(k>=2){const a=dim(k===2||k===3),c=re.c,show=k===2?2:3;
      for(let j=0;j<show;j++){const prev=j?c[j-1][0]+c[j-1][2]:0,grow=(k===2&&j===1)||(k===3&&j===2)?e:1,z=rz('react',j);
        const x=slab(R,z,prev*Math.min(1,grow*2),(c[j][0]-prev)*grow,K.react,a);
        if(j)R.flowArc([X0+prev*HS*.5,TH,rz('react',j-1)],[X0+prev*HS*.5,TH,z],.25,{c:P.mute,a:a*(grow<1?.9:.35),r:.045,n:4,speed:.9});
        lab(x,z,fi(c[j][0]*grow)+(j&&!nar?' · after "'+srch[j-1][1]+'"':'')+(j===2?(nar?'':' · "'+re.a+'"')+' · right':''),a*Math.min(1,grow*1.5))}
      if(k===2)fl(s1t,[X0+1,TH,rz('react',1)],P.c2,Math.min(1,e*2));
      if(k===3)fl(s2t,[X0+1.8,TH,rz('react',2)],P.c2,Math.min(1,e*2))}
    // 4. nobody: the question's own 10 paragraphs in one call
    if(k>=4){const a=k===5?fresh:1,w=k===4?e:1,z=rz('longctx',0),x=slab(R,z,0,lc.c[0][0]*w,K.longctx,a);
      if(k===4)fl(lct,[X0+1.2,TH,z],P.c4,Math.min(1,e*2));
      lab(x,z,fi(lc.c[0][0]*w)+(nar?' · F1 '+R_LC:' · "'+lc.a+'"'),(k===4?e:1)*a)}
    // 5. over all 200 questions: mean tokens billed and F1 (the old slabs have faded out)
    if(k===5){const b=Math.max(0,e*2-1);['single_k5','react','longctx'].forEach(s=>{const m=MS[s],z=Z[s];
      R.box([X0+m.tok*HS*b/2,0,z],[Math.max(.02,m.tok*HS*b),TH*1.6,TD*1.4],{fill:K[s],a:b});
      lab(X0+m.tok*HS*b,z,fi(m.tok)+' tokens · F1 '+m.f1.toFixed(3),b,{fs:13,b:1})});
      R.label([X0+LW/2,0,rz('longctx',0)+TD/2+.08],'mean over all 200 questions',{fs:12.5,c:P.mute,dy:16,a:b,wide:1})}
  }
  const full={cam:[0,1.12],bounds:[[-6.3,0,-2.4],[3.2,.4,2.5]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · one question, three deciders (recorded, Qwen3-1.7B)',cam:full.cam,bounds:full.bounds,aspect:.44,dur:1500,hold:5200,draw,
    margin:w=>w<520?[14,10,18,10]:[26,200,22,10],
    view:k=>k===0?{cam:[0,1.05],bounds:[[-6.4,0,-2.4],[-2,.4,2.5]]}:k===5?{cam:[0,1.12],bounds:[[-3,0,-2.4],[3.2,.4,2.5]]}:full});
})();
