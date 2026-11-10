// ---- Scene (section 6, Fig. 2): one ranked list, cut at k = 5, then discounted and set against the ideal order (renderer v2) ----
// The list is EM.rank (src/rank_example.py, illustrative grades, every metric checked against scikit-learn there); every number drawn
// or written into the step list (data-rk spans) is computed here from those grades, and check_stages.mjs compares the spans with the static page.
(function(){
  const $=id=>document.getElementById(id);if(!$('stg-rk')||!window.S3||!window.EM)return;const {at,off,lerp,mix}=S3;
  const G=EM.rank.grades,M=EM.rank.missing,K=5,REL=G.filter(g=>g>0).length+M.length,IDEAL=G.filter(g=>g>0).concat(M).sort((a,b)=>b-a);
  const disc=i=>1/Math.log2(i+2),dcg=(gr,k)=>gr.slice(0,k).reduce((s,g,i)=>s+g*disc(i),0);
  const hits=[];G.forEach((g,i)=>{if(g>0)hits.push(i)});
  const h5=hits.filter(i=>i<K).length,first=hits[0];let ap=0;hits.filter(i=>i<K).forEach((i,j)=>ap+=(j+1)/(i+1));ap/=REL;
  const D5=dcg(G,K),I5=dcg(IDEAL,K);
  {const V={h5,p5:String(+(h5/K).toFixed(3)),rel:REL,r5:String(+(h5/REL).toFixed(3)),rr:String(+(1/(first+1)).toFixed(3)),ap5:String(+ap.toFixed(3)),
      g2:(G[1]*disc(1)).toFixed(2),g5:(G[4]*disc(4)).toFixed(2),dcg5:D5.toFixed(3),idcg5:I5.toFixed(3),ndcg5:(D5/I5).toFixed(3)};
    document.querySelectorAll('[data-rk]').forEach(e=>{if(V[e.dataset.rk]!=null)e.textContent=String(V[e.dataset.rk])})}
  const xr=i=>-4.6+i*.9,XM=4.65,XT=5.95,XI=7.05,ZL=.9,ZI=-.9,HU=.42,CW=.62;
  function draw(R,k,e){const P=R.P,narrow=R.W<520;R.grid(-5.5,7.8,-2.2,2.2,.5);
    const cutA=k>=1?(k===1?e:1):0,dk=k>=4?(k===4?e:1):0,ideal=k>=5?(k===5?e:1):0;
    // the list: a column per result, as tall as its grade; past step 4 as tall as its discounted gain
    G.forEach((g,i)=>{const inK=i<K,fade=cutA&&!inK?lerp(1,.28,cutA):1,first3=k===2&&i===first,hitP=k===3&&g>0;
      if(g>0){const h0=g*HU,h1=g*disc(i)*HU,h=lerp(h0,h1,dk),c=first3||hitP?P.acc:P.good;
        if(dk>0)R.box([xr(i),0,ZL],[CW,h0,.6],{fill:P.paper,fa:.12,ea:.35*dk*fade,a:fade,shadow:false});
        R.box([xr(i),0,ZL],[CW,Math.max(.03,h),.6],{fill:mix(P.paper,c,.75),a:fade});
        const lab=k>=4?(g*disc(i)).toFixed(2):k===3&&inK?'P@'+(i+1)+' = '+(hits.indexOf(i)+1)+'/'+(i+1):'grade '+g;
        if(!(k===3&&!inK)||true)R.label([xr(i),h,ZL],narrow?(k===3&&inK?(hits.indexOf(i)+1)+'/'+(i+1):String(k>=4?(g*disc(i)).toFixed(2):g)):lab,{mono:true,fs:12.5,b:k===3&&inK,c:k===3&&inK?P.acc:P.ink,dy:-11,a:fade*(k===3&&!inK?.6:1)*(k===5?.8:1),grp:k===3&&!narrow?'ap':undefined})}
      else R.box([xr(i),0,ZL],[CW,.03,.6],{fill:mix(P.paper,P.mute,.35),a:fade,shadow:false});
      R.label([xr(i),0,ZL+.4],String(i+1),{mono:true,fs:12,dy:9,c:P.mute,a:fade})});
    R.label([xr(0)-.55,.1,ZL],'rank',{al:'right',fs:12,c:P.mute,dx:-4,dy:18,grp:'side'});
    // the relevant item the system never returned
    {const h=M[0]*HU*lerp(1,disc(4),0),a=k===5?1-.6*ideal:1;R.box([XM,0,ZL],[CW,h,.6],{fill:mix(P.paper,P.good,.35),fa:.35,ea:.6,a:a*(k>=4&&k<5?.5:1),shadow:false});
      R.label([XM,h,ZL],'never returned',{fs:12,c:P.mute,dy:-11,a:k>=4?.5:1})}
    // the cut at k = 5: a glass plane between rank 5 and 6
    if(cutA>0){const xp=(xr(K-1)+xr(K))/2;R.glass([xp,0,ZL-.6],[0,0,1.2],[0,1.45,0],{c:P.acc,nu:1,nv:4,a:cutA*(k>=4?.5:1)});
      R.label([xp,0,ZL+.6],'k = 5',{mono:true,fs:13,b:1,c:P.acc,dy:12,a:cutA})}
    // step-specific readouts
    if(k===1)R.label([xr(2),narrow?2.1:1.6,ZL],'precision@5 = 3/5 · recall@5 = 3/'+REL,{mono:true,fs:13,b:1,c:P.ink,a:e,dy:-14,grp:narrow?null:'ap'});
    if(k===2){R.flowArc([xr(0),.35,ZL],[xr(first),G[first]*HU+.1,ZL],.5,{c:P.acc,a:e,r:.07,n:6,speed:1.2});R.glow([xr(first),G[first]*HU+.1,ZL],.35,{c:P.acc,a:e*.8});
      R.label([xr(first)+.5,G[first]*HU+.55,ZL],'first hit at rank '+(first+1)+': RR = 1/'+(first+1),{al:'left',mono:true,fs:13,b:1,c:P.acc,a:e,dx:8})}
    if(k===3)R.label([xr(2),narrow?2.1:1.6,ZL],'AP@5 = (1/2 + 2/4 + 3/5) / '+REL+' = '+ap.toFixed(2),{mono:true,fs:13,b:1,c:P.ink,a:e,dy:-14,grp:narrow?null:'ap'});
    // DCG: the discounted gains inside the cut, stacked into a tower; the ideal order behind, and its tower
    function tower(xt,z,parts,a,c,lab){let y=0;parts.forEach(v=>{const h=v*HU;R.box([xt,y,z],[.75,h,.6],{fill:mix(P.paper,c,.7),a,shadow:y===0});y+=h});
      R.label([xt,y,z],lab,{mono:true,fs:12.5,b:1,c,dy:-12,a})}
    if(k>=4){const parts=hits.filter(i=>i<K).map(i=>G[i]*disc(i));
      hits.filter(i=>i<K).forEach(i=>R.flowArc([xr(i),G[i]*disc(i)*HU+.05,ZL],[XT,.5,ZL],.7,{c:P.good,a:(k===4?e:.45),r:.05,n:6,speed:1.2}));
      tower(XT,ZL,parts,k===4?e:1,P.good,'DCG@5 '+D5.toFixed(3))}
    if(k>=5){IDEAL.slice(0,K).forEach((g,i)=>{const h=g*disc(i)*HU;R.box([xr(i),0,ZI],[CW,h,.6],{fill:mix(P.paper,P.c4,.7),a:ideal});
        R.flowArc([xr(i),h+.05,ZI],[XI,.6,ZI],.8,{c:P.c4,a:ideal*.5,r:.05,n:5,speed:1.2})});
      R.label([xr(0)-.55,.1,ZI],'ideal order',{al:'right',fs:12.5,b:1,c:P.c4,dx:-4,a:ideal,grp:'side'});
      tower(XI,ZI,IDEAL.slice(0,K).map((g,i)=>g*disc(i)),ideal,P.c4,'ideal '+I5.toFixed(3));
      R.label([xr(2),1.9,ZI],'nDCG@5 = '+D5.toFixed(3)+' / '+I5.toFixed(3)+' = '+(D5/I5).toFixed(3),{mono:true,fs:13.5,b:1,c:P.ink,a:ideal,dy:-8})}
  }
  const full={cam:[.14,.62],bounds:[[-5.3,0,.2],[7.5,1.7,1.45]]};
  S3.stage({id:'stg-rk',list:'sx-rk',fig:'Fig. 2 · one query, ten results (illustrative grades)',cam:full.cam,bounds:full.bounds,aspect:.42,dur:1500,hold:4600,draw,
    margin:w=>w<520?[16,10,14,10]:[20,14,14,80],
    view:k=>{const ph=(c=>c&&c.clientWidth<520)(document.querySelector('#stg-rk canvas')),v=k>=5?{cam:[.16,.66],bounds:[[-5.3,0,-1.5],[7.5,2.6,1.6]]}:full;return ph?{cam:[.7,v.cam[1]],bounds:v.bounds}:v}});
})();
