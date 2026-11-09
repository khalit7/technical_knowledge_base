// ---- Scene (Reading 2, Fig. 1): where the variety of a generated set comes from, drawn from the page's measured samples (window.SY.sets, SY.cosmo.avoid):
// 1,000 documents of a set as cubes (one cube is five documents; a category that is not a multiple of five ends in a partial cube), sorted by their first
// three words into towers (the three most common openings and the rest of the top ten) and a flat field (every other opening). TinyStories, Cosmopedia's
// stories split by whether the prompt banned "Once upon a time", FineWeb for the web, and MinHash's near-duplicate count on the same TinyStories. ----
(function(){
  if(!document.getElementById('stg-op')||!window.SY||!SY.sets||!SY.cosmo)return;const {at,lerp,mix,cl}=S3;
  const S={};SY.sets.forEach(s=>S[s.key]=s);const AV=SY.cosmo.avoid,DPC=5,PT=.2,CS=.16;
  const pc=x=>(100*x<10?(100*x).toFixed(1):(100*x).toFixed(0))+'%',pc1=x=>(100*x).toFixed(1)+'%';
  // a set's documents by opening: top 1, 2, 3, the rest of the top ten, every other opening
  function cats(s){const o=s.openings_top3.map(x=>x[1]),t10=Math.round(s.openings_top10_share*s.docs);return {n:[o[0],o[1],o[2],t10-o[0]-o[1]-o[2],s.docs-t10],names:s.openings_top3.map(x=>x[0]),docs:s.docs,t10}}
  const TS=cats(S.tinystories),FW=cats(S.fineweb),
    CT={n:[AV.told[1],AV.told[0]-AV.told[1]],docs:AV.told[0]},CN={n:[AV.not_told[1],AV.not_told[0]-AV.not_told[1]],docs:AV.not_told[0]};
  // cubes of one category: whole cubes plus a partial one, as fractions of a cube's height
  const cubes=n=>{const c=n/DPC,a=[];for(let i=0;i<Math.floor(c);i++)a.push(1);if(c-Math.floor(c)>.01)a.push(c-Math.floor(c));return a};
  // a tower: 4 x 4 cubes a layer; a field: cols wide
  const tower=(j,x,z)=>{const l=Math.floor(j/16),m=j%16;return [x+(m%4-1.5)*PT,l*PT,z+(Math.floor(m/4)-1.5)*PT]};
  const field=(j,x,z,cols,rows)=>[x+(j%cols-(cols-1)/2)*PT,0,z+(Math.floor(j/cols)-(rows-1)/2)*PT];
  // a group: towers for the categories but the last, a field for the last; returns every cube with its place, category and height
  function group(c,tx,fx,fz,cols){const out=[];c.n.forEach((v,ci)=>{const cs=cubes(v),last=ci===c.n.length-1,rows=Math.ceil(cs.length/cols);
      cs.forEach((h,j)=>out.push({p:last?field(j,fx,fz,cols,rows):tower(j,tx[ci],0),c:ci,h,last}))});return out}
  // step 1's unsorted field of the same TinyStories cubes, mixed by a fixed shuffle (openings are mixed in the data too)
  const TX=[-3.3,-1.75,-.45,.75],TFX=2.75,TSG=group(TS,TX,TFX,0,10);
  const ord=TSG.map((_,i)=>i);{let sd=11;const rnd=()=>(sd=(sd*16807)%2147483647)/2147483647;for(let i=ord.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[ord[i],ord[j]]=[ord[j],ord[i]]}}
  const FR=Math.ceil(TSG.length/20),start=[];ord.forEach((ci,slot)=>{start[ci]=field(slot,0,0,20,FR)});
  const CTG=group(CT,[-3.5],-1.45,0,9),CNG=group(CN,[.75],2.75,0,9),FWG=group(FW,[-3.1,-2.3,-1.5,-.7],2.1,0,14);
  const way=(a,b,t)=>[lerp(a[0],b[0],t),lerp(a[1],b[1],t)+Math.sin(t*Math.PI)*.7,lerp(a[2],b[2],t)];
  const stag=(e,i,n,w)=>cl(e*(1+w)-(i/n)*w,0,1);
  function cubeFill(P,base,c,last){return last?mix(P.paper,base,.18):c===0?mix(P.paper,base,.85):c<3?mix(P.paper,base,.55):mix(P.paper,base,.35)}
  function drawGroup(R,G,base,a,grow,lab){const P=R.P;G.forEach((q,i)=>{const t=grow==null?1:stag(grow,i,G.length,.8);if(t<=0)return;
      R.box(q.p,[CS,CS*q.h*t,CS],{fill:cubeFill(P,base,q.c,q.last),a:a*Math.min(1,t*1.5),shadow:false,lw:.5})})}
  const tTop=(n)=>Math.ceil(n/DPC/16)*PT;
  function draw(R,k,e){const P=R.P;R.grid(-5.4,5.2,-2.4,2.6,.5);
    const gen=P.c2,real=P.c3;
    // phases inside a step that changes the whole picture: the old set fades out, then the new one grows in
    const outA=k>0?cl(1-e*2.4,0,1):1,inE=cl((e-.42)/.58,0,1);
    if(k===0){ // seeds, through the generator, into the 1,000 stories
      R.glass([-5.1,.05,-.9],[0,0,1.8],[0,1.0,0],{c:gen,a:1,nu:3,nv:3});R.label([-5.1,0,.9],'seed: 3 random words',{mono:true,fs:12.5,b:1,dy:16,c:gen});
      R.label([-5.1,0,.9],'+ story features',{wide:1,mono:true,fs:12,dy:32,c:gen});
      R.glass([-3.2,.05,-1.0],[0,0,2.0],[0,1.25,0],{c:P.c1,a:1,nu:6,nv:4});R.label([-3.2,1.32,-1.0],'GPT-3.5 / GPT-4 writes',{mono:true,fs:12.5,b:1,dy:-10,c:P.c1});
      [-.6,0,.6].forEach(z=>R.flowArc([-5.05,.55,z],[-3.25,.6,z],.3,{c:gen,a:.85,r:.06,speed:1.3,n:5}));
      [-.8,-.25,.3,.85].forEach(z=>R.flowArc([-3.15,.6,z*.9],[-2.1,.15,z*1.2],.4,{c:gen,a:.85,r:.06,speed:1.3,n:6}));
      TSG.forEach((q,i)=>{const t=stag(e,ord.indexOf(i),TSG.length,.9);if(t<=0)return;R.box(start[i],[CS,CS*q.h*t,CS],{fill:mix(P.paper,gen,.35),a:Math.min(1,t*1.5),shadow:false,lw:.5})});
      R.label([0,0,FR*PT/2+.15],'1,000 TinyStories · 1 cube = 5 stories',{mono:true,fs:12.5,dy:16,a:cl(e*2-1,0,1)})}
    if(k===1||(k===2&&outA>0)||k===4){ // TinyStories sorted by opening
      const a=k===2?outA:1,t=k===1?e:1;
      TSG.forEach((q,i)=>{const ti=stag(t,ord.indexOf(i),TSG.length,.7),p=k===1&&ti<1?way(start[i],q.p,ti):q.p;
        R.box(p,[CS,CS*q.h,CS],{fill:ti<.5?mix(P.paper,gen,.35):cubeFill(P,gen,q.c,q.last),a:a*(k===4?.9:1),shadow:false,lw:.5})});
      const la=(k===1?cl((e-.85)/.15,0,1):1)*a;
      TS.names.forEach((nm,i)=>R.label([TX[i],tTop(TS.n[i]),-.3],TS.n[i]+' · '+pc(TS.n[i]/TS.docs),{mono:true,fs:12.5,b:i===0,dy:-16,c:i===0?gen:P.ink,a:la,wide:i>0}));
      R.label([TX[3],tTop(TS.n[3]),-.3],TS.n[3]+'',{wide:1,mono:true,fs:12.5,dy:-16,a:la});
      ['"'+TS.names[0]+'"','"'+TS.names[1]+'"','"'+TS.names[2]+'"','7 more'].forEach((nm,i)=>R.label([TX[i],0,.45],nm,{mono:true,fs:12,dy:14+(i%2)*16,c:P.mute,a:la,wide:i>0}));
      R.label([TFX,0,.55],TS.n[4]+' with any other opening',{wide:1,mono:true,fs:12,dy:16,c:P.mute,a:la});
      if(k===1)R.label([TX[0]+.5,tTop(TS.n[0]),-.3],'top ten openings: '+pc(TS.t10/TS.docs),{wide:1,mono:true,fs:12.5,b:1,al:'left',dx:10,dy:-16,c:gen,a:la})}
    if(k===2||(k===3&&outA>0)){ // Cosmopedia's stories: the same prompt with and without the ban
      const a=k===3?outA:1,g=k===2?inE:1;
      R.glass([-3.9,.05,-1.55],[3.4,0,0],[0,.9,0],{c:gen,a:a*g*.9,nu:6,nv:2});R.glass([.35,.05,-1.55],[3.4,0,0],[0,.9,0],{c:gen,a:a*g*.9,nu:6,nv:2});
      R.label([-2.2,.95,-1.55],'prompt bans "Once upon a time"',{wide:1,mono:true,fs:12,b:1,dy:-10,c:gen,a:a*g});R.label([2.05,.95,-1.55],'prompt without the ban',{wide:1,mono:true,fs:12,b:1,dy:-10,c:gen,a:a*g});
      if(k===2&&g>0){R.flowArc([-2.2,.45,-1.5],[-2.0,.25,-.3],.3,{c:gen,a:.7*g,r:.06,n:5});R.flowArc([2.08,.45,-1.5],[2.0,.25,-.3],.3,{c:gen,a:.7*g,r:.06,n:5})}
      drawGroup(R,CTG,gen,a,k===2?inE:null);drawGroup(R,CNG,gen,a,k===2?inE:null);
      const la=(k===2?cl((e-.9)/.1,0,1):1)*a;
      R.label([-3.5,tTop(CT.n[0]),-.3],(R.W<520?'':CT.n[0]+' of '+CT.docs+' · ')+pc1(CT.n[0]/CT.docs),{mono:true,fs:12.5,b:1,dy:-18,c:gen,a:la});
      R.label([.75,tTop(CN.n[0]),-.3],(R.W<520?'':CN.n[0]+' of '+CN.docs+' · ')+pc1(CN.n[0]/CN.docs),{mono:true,fs:12.5,b:1,dy:-18,c:gen,a:la});
      R.label([-3.5,0,.45],'"once upon a time"',{wide:1,mono:true,fs:12,dy:16,c:P.mute,a:la});R.label([.75,0,.45],'"once upon a time"',{wide:1,mono:true,fs:12,dy:16,c:P.mute,a:la});
      R.label([-1.45,0,1.0],'any other opening',{wide:1,mono:true,fs:12,dy:14,c:P.mute,a:la});R.label([2.75,0,1.0],'any other opening',{wide:1,mono:true,fs:12,dy:14,c:P.mute,a:la})}
    if(k===3){ // FineWeb, the same sort
      drawGroup(R,FWG,real,1,inE);const la=cl((e-.9)/.1,0,1);
      R.label([-1.9,.7,-.3],'top three openings: '+FW.n[0]+', '+FW.n[1]+', '+FW.n[2]+' pages',{mono:true,fs:12.5,b:1,dy:-10,c:real,a:la});
      R.label([-1.9,.7,-.3],'top ten: '+pc(FW.t10/FW.docs),{mono:true,fs:12.5,dy:8,c:real,a:la});
      R.label([2.1,0,1.5],FW.n[4]+' pages with an opening outside the top ten',{wide:1,mono:true,fs:12,dy:14,c:P.mute,a:la})}
    if(k===4){ // MinHash on the same stories finds no copies
      const t=cl((e-.45)/.55,0,1),y=2.7;R.glass([-3.9,y,-1.0],[7.6,0,0],[0,0,2.0],{c:P.c4,a:Math.min(1,t*1.6),nu:14,nv:4});
      R.label([-3.9,y,-1.0],'MinHash, 5-word shingles',{mono:true,fs:12.5,b:1,al:'left',dy:-40,c:P.c4,a:t});
      R.label([-3.9,y,-1.0],'near-duplicate pairs: '+pc(S.tinystories.neardup_share),{mono:true,fs:12.5,b:1,al:'left',dy:-22,c:P.c4,a:cl((e-.6)/.4,0,1)});
      TX.concat([TFX]).forEach(x=>R.flow([[x,y-.05,0],[x,.55,0]],{c:P.c4,a:.6*Math.min(1,t*2),r:.05,speed:1.1,n:4}))}
  }
  const full={cam:[.12,.66],bounds:[[-4.0,0,-1.3],[3.9,1.9,1.4]]};
  S3.stage({id:'stg-op',list:'sx-op',fig:'Fig. 1 · 1,000 documents sorted by their first three words',cam:full.cam,bounds:full.bounds,aspect:.52,dur:1700,hold:4800,draw,
    margin:w=>w<520?[16,10,14,10]:[22,20,18,20],
    view:k=>k===0?{cam:[.16,.62],bounds:[[-5.6,0,-1.3],[2.3,1.4,1.3]]}:k===2?{cam:[.14,.62],bounds:[[-4.1,0,-1.7],[3.9,1.1,1.3]]}:k===3?{cam:[.14,.7],bounds:[[-3.5,0,-1.6],[3.6,.6,1.6]]}:k===4?{cam:[.12,.6],bounds:[[-4.1,0,-1.2],[3.9,2.8,1.3]]}:full});
})();
