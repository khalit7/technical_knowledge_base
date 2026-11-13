// ---- Scene (Reading 5, Fig. 3): the 200 hand-labelled run0 pages as columns, a glass threshold plane sliding up (renderer v2) ----
// Each column is one page of the uniform random labelled sample, as tall as its rank among all 2,617 run0 documents (top = tallest),
// coloured by its hand label; a column rising through the plane is kept at that keep rate. Steps 1 to 5 rank by DCLM's fastText, step 6
// re-sorts the same pages by FineWeb-Edu's score. Every number is window.QC.th (ranks from the recorded scores, labels from labels/).
(function(){
  if(!document.getElementById('stg-th')||!window.S3||!window.QC||!QC.th)return;const {lerp,mix,cl}=S3;
  const T=QC.th,N=T.n,labs=T.lab.filter(l=>l.src==='random'),NC=20,PX=.38,H=2.0;
  const SH=[null,.6,.3,.1,.05,.1],KEY=k=>k>=5?'edu':'dclm';
  // grid slot of each page in each ordering: tallest at the back left, in rank order
  const slot={};['dclm','edu'].forEach(key=>{const o=labs.map((l,j)=>j).sort((a,b)=>T.rank[key][labs[a].i]-T.rank[key][labs[b].i]);slot[key]=[];o.forEach((j,s)=>slot[key][j]=s)});
  const rows=Math.ceil(labs.length/NC),gx=s=>(s%NC-(NC-1)/2)*PX,gz=s=>(Math.floor(s/NC)-(rows-1)/2)*PX;
  const yr=f=>H*(1-Math.sqrt(f)),ht=(key,l)=>yr(T.rank[key][l.i]/N); // height from the rank share, on a square-root scale that stretches the top of the ranking
  function count(key,sh){const c=Math.round(sh*N);let kl=0,ky=0;labs.forEach(l=>{if(T.rank[key][l.i]<c){kl++;if(l.keep==='y')ky++}});return {kl,ky}}
  window.QCTH={count,labs}; // for src/check_stages.mjs
  function draw(R,k,e){const P=R.P,nw=R.W<520;R.grid(-4.6,4.6,-2.6,2.6,.5);
    const key=KEY(k),sh=SH[k],psh=k===5?.05:SH[k-1]||null,cur=sh==null?null:(psh==null?sh:lerp(psh,sh,e)),yc=cur==null?null:yr(cur);
    labs.forEach((l,j)=>{const t=k===5?e:1,s0=slot.dclm[j],s1=slot[key][j],x=lerp(gx(s0),gx(s1),t),z=lerp(gz(s0),gz(s1),t);
      const h=Math.max(.02,k===5?lerp(ht('dclm',l),ht('edu',l),e):ht('dclm',l)*(k===0?e:1));
      const kept=yc!=null&&h>yc&&T.rank[key][l.i]<Math.round(cur*N),c=l.keep==='y'?P.good:l.keep==='n'?P.bad:P.mute;
      const fill=mix(P.paper,c,l.keep==='u'?.3:.7),w=PX*.72;
      if(yc==null)R.box([x,0,z],[w,h,w],{fill,shadow:false,lw:.4});
      else if(!kept)R.box([x,0,z],[w,h,w],{fill,a:.25,shadow:false,lw:.4});
      else{R.box([x,0,z],[w,yc,w],{fill,a:.25,shadow:false,lw:.4});R.box([x,yc,z],[w,h-yc,w],{fill,shadow:false,lw:.5,dz:-50})}}); // the part above the plane is drawn over the glass
    if(yc!=null){R.glass([-NC*PX/2-.15,yc,-rows*PX/2-.15],[NC*PX+.3,0,0],[0,0,rows*PX+.3],{c:P.c1,a:.35,nu:10,nv:5});
      R.label([NC*PX/2+.2,yc,-rows*PX/2],'keep the top '+Math.round(cur*100)+'%',{al:'left',dx:6,fs:12.5,b:1,c:P.c1});
      const q=count(key,k===5?cur:sh);R.label([0,H,-rows*PX/2-.2],(key==='edu'?'FineWeb-Edu: ':'DCLM: ')+q.ky+' of '+q.kl+' kept are worth training on',{fs:13,b:1,dy:-14,c:P.ink,a:k===5||sh===cur?1:.6})}
    else R.label([0,H,-rows*PX/2-.2],labs.length+' labelled pages, ranked by DCLM',{fs:13,b:1,dy:-14,c:P.ink,a:e});
    // the side scale: rank among all 2,617 (square-root scale)
    R.box([-NC*PX/2-.45,0,rows*PX/2],[.04,H,.04],{shadow:false});
    [[1,'bottom'],[.5,'median'],[.1,'top 10%'],[0,'top']].forEach(([f,t])=>R.label([-NC*PX/2-.5,yr(f),rows*PX/2],t,{al:'right',dx:-4,fs:12,c:P.mute,grp:'ax'}));
  }
  S3.stage({id:'stg-th',list:'sx-th',fig:'Fig. 3 · the cut slides up through 200 labelled pages',cam:[.35,.42],bounds:[[-4.6,0,-2.1],[5.4,2.4,2.1]],aspect:.56,dur:1600,hold:4800,draw,
    margin:w=>w<520?[18,10,14,10]:[30,16,18,16]});
})();
