// ---- Scene (Reading 3, Fig. 1): four generations built on one crawl (renderer v2) ----
// Common Crawl is the base plate; each generation is a glass plate above it holding the corpora section 3 names, read from
// window.PC.corpora (src/make_corpora.py): a cube's volume is the corpus's published token count (side = cube root), hollow when the
// corpus has no comparable count. Dots rise wherever text moves (from the crawl, or a whole corpus taken as a component or filtered);
// a dashed line is a recipe re-used on new data. src/check_stages.mjs checks the step list's sizes against window.PCS.lin.
(function(){
  if(!document.getElementById('stg-lin')||!window.S3||!window.PC||!PC.corpora)return;const {at,mix}=S3;
  const C={};PC.corpora.forEach(c=>C[c.id]=c);
  const GEN=[['Generation 1','2019 to 2021',[['pile',-2.9],['c4',-.9]]],
    ['Generation 2','2022 to 2023',[['rpv1',-2.3],['dolma',-.5],['refinedweb',1.4]]],
    ['Generation 3','2024',[['fineweb_edu',-1.9],['fineweb',.1],['dclm',1.7],['nemotron_cc',3.65]]],
    ['Generation 4','2025 to 2026',[['commonpile',-3.4],['finepdfs',-1.7],['fineweb2',-.6],['dolma3',1.2],['nemotron_cc2',3.3]]]];
  const DY=1.35,PX0=-4.1,PX1=4.4,PZ=.85,SK=.34;
  const side=c=>c.tokens_b?SK*Math.cbrt(c.tokens_b/1000):.3;
  const fmt=b=>b==null?'no token count':b>=1000?(b/1000).toFixed(1)+'T':Math.round(b)+'B';
  const short=c=>c.name.replace(/ \(.*\)$/,'').replace(/ and v2\.1$/,'').replace(/^Common Pile v0\.1$/,'Common Pile');
  const pos={};GEN.forEach((g,gi)=>g[2].forEach(([id,x])=>pos[id]={x,y:(gi+1)*DY,g:gi+1}));
  pos.cc={x:0,y:0,g:0};
  window.PCS=window.PCS||{};PCS.lin={gens:GEN.map(g=>g[2].map(([id])=>({id,name:short(C[id]),size:C[id].tokens_b?fmt(C[id].tokens_b):null}))),ratio:Math.round(C.fineweb.tokens_b/C.c4.tokens_b),crawls:(PC.crawls||[]).length};
  const top=id=>{const p=pos[id];return [p.x,p.y+.04+side(C[id]),0]},bot=id=>{const p=pos[id];return [p.x,p.y+.04,0]};
  function draw(R,k,e){const P=R.P,cur=k<4?k+1:0,all=k===4;R.grid(-5,5.4,-1.8,1.8,.5);
    const ga=g=>all?1:g===cur?1:g===cur-1?.32:g<cur?.14:0; // the generation a step is about at full strength; earlier ones recede, later ones are not built yet
    // the crawl
    const ca=all||cur<=2?.9:.45;R.glass([PX0,0.02,-PZ],[PX1-PX0,0,0],[0,0,2*PZ],{c:P.c1,a:ca,nu:12,nv:3,th:.06});
    R.label([PX0,0,PZ],'Common Crawl · '+PCS.lin.crawls+' crawls since 2008',{fs:12.5,b:1,al:'left',dx:4,dy:16,c:P.c1});
    GEN.forEach(([nm,yr,cs],gi)=>{const g=gi+1,a=ga(g)*(g===cur?Math.max(.15,e):1);if(a<=.01)return;const y=g*DY;
      R.glass([PX0,y,-PZ],[PX1-PX0,0,0],[0,0,2*PZ],{c:P.c6,a:a*.8,nu:12,nv:3,th:.04});
      R.label([PX0,y,PZ],nm+' · '+yr,{fs:12.5,b:g===cur,al:'right',dx:-8,c:g===cur||all?P.ink:P.mute,a:Math.max(a,.5),grp:'gen'});
      cs.forEach(([id,x],j)=>{const st=(j%2)*20,c=C[id],s=side(c)*(g===cur?e:1),hol=!c.tokens_b,two=id==='c4'||id==='fineweb',ca=g===cur?1:all?(two?1:.35):ga(g);
        R.box([x,y+.04,0],[s,Math.max(.01,s),s],{fill:hol?P.paper:mix(P.paper,P.acc,all&&two?.8:.55),fa:hol?.18:1,a:ca,shadow:false,lw:hol?1:.8});
        if(g===cur){const lt=y+.04+Math.max(.01,s);
          R.label([x,lt,0],short(c),{fs:12.5,b:1,dy:-26-st,c:P.ink,a:e,wide:1});
          R.label([x,lt,0],hol?'no count':fmt(c.tokens_b),{mono:true,fs:12,dy:-11-st,c:hol?P.mute:P.acc,a:e,wide:hol?1:0})}
        // the last step compares the smallest and the largest: those two at full strength and named beside them, the rest receding
        else if(all&&two)R.label([x+side(c)/2,y+.04+side(c)/2,side(c)/2],short(c)+' · '+fmt(c.tokens_b),{fs:12.5,b:1,al:'left',dx:8,c:P.ink})})});
    // what each corpus of the current generation was built from
    GEN.forEach(([,,cs],gi)=>{const g=gi+1;if(!(all||g===cur))return;const fa=all?.3:e;
      cs.forEach(([id])=>Object.entries(C[id].parents||{}).forEach(([p,rel])=>{
        if(p==='cc'){if(all&&!['c4','fineweb','dclm','nemotron_cc','dolma3','finepdfs'].includes(id))return;const b=bot(id);R.flow([[b[0],.06,0],[b[0],b[1]-.02,0]],{c:P.c1,a:fa*.9,r:all?.045:.06,n:Math.max(3,Math.round(3*b[1])),speed:1})}
        else if(pos[p]){const a0=top(p),b=bot(id);
          if(rel==='recipe of')R.line([a0,[(a0[0]+b[0])/2,(a0[1]+b[1])/2+.25,0],b],{c:P.c4,w:1.6,dash:[5,4],a:fa*(all?.6:1),head:6})
          else R.flowArc(a0,b,.22,{c:P.c2,a:fa,r:.055,n:6,speed:1.1})}}))});
  }
  const B=g=>[[PX0-.2,Math.max(0,(g-1)*DY-.1),-1],[PX1+.1,g*DY+1.1,1]];
  const full={cam:[.45,.45],bounds:[[PX0-.2,0,-1],[PX1+.1,4*DY+1.2,1]]};
  S3.stage({id:'stg-lin',list:'sx-lin',fig:'Fig. 1 · four generations built on one crawl',cam:full.cam,bounds:full.bounds,aspect:.78,dur:1600,hold:5200,draw,
    margin:w=>w<520?[16,10,14,10]:[24,18,18,170],
    // each generation's step moves in on its plate and the one below it; the last step pulls back to the whole stack
    view:k=>k<4?{cam:[.45,.62],bounds:B(k+1)}:full});
})();
