// ---- Scene: Fig. 2, one real page read three ways (renderer v2). Data: ING.anat (page 1 of arXiv 1909.00175 v1, a QASPER paper of the running example):
// the 90 text lines PyMuPDF 1.28.2 reads with their PDF boxes, in content-stream order; the 60 lines pdfplumber's extract_text() emits; Docling 2.138.0's order and the line it dropped.
// The page image lies on the floor; every line is a thin slab floating above it at its own coordinates (the text layer); the purple path joins the slabs in the order the text comes out. ----
(function(){
  if(!document.getElementById('stg-anat')||!window.ING3||!window.ING||!ING.anat)return;const {mix,at}=S3;
  const A=ING.anat,PG=A.page,S=ING3.sheet(PG.w,PG.h,-2.1,-2.97,4.2),H=.34,mid=PG.w/2;
  const cross=b=>b[0]<PG.w*.45&&b[2]>PG.w*.55,colOf=b=>cross(b)?'X':((b[0]+b[2])/2<mid?'L':'R');
  const cen=b=>S.at((b[0]+b[2])/2,(b[1]+b[3])/2,H+.05);
  const STREAM=A.lines.map((l,i)=>i),READ=A.read,STAMP=A.dropped[0];
  const path=(set,ord)=>ord.map(i=>cen(set[i].bbox));
  const pS=path(A.lines,STREAM),pP=path(A.plumber,A.plumber.map((l,i)=>i)),pR=path(A.lines,READ);
  const nCross=A.plumber.filter(l=>cross(l.bbox)).length;
  function slabs(R,set,a,fill,lift){set.forEach((l,i)=>{const b=S.box(l.bbox,lift);const f=fill(l,i);if(!f)return;R.box(b.c,b.s,{fill:f[0],a:a*(f[1]==null?1:f[1]),shadow:false,lw:.6})})}
  // the order being built: the first part of the path, as far as this step has got, with dots streaming along it
  function order(R,pts,e,c,a){const m=Math.max(2,Math.ceil(pts.length*e));const p=pts.slice(0,m);R.line(p,{c,w:1.5,a:a*.8});R.flow(p,{c,a,r:.05,speed:2.6,n:Math.min(46,Math.round(m*.6))});
    R.glow(p[p.length-1],.16,{c,a})}
  function draw(R,k,e){const P=R.P,im=ING3.img(ING.anatImg);R.grid(-3.6,3.6,-3.7,3.7,.5);
    ING3.pic(R,im,[S.x0,0,S.z0],[S.w,0,0],[0,0,S.d],{under:true,a:k===0?1:.8});
    const base=mix(P.paper,P.c1,.25),bad=mix(P.paper,P.bad,.6);
    // 1. the text layer lifts off the page: each line a slab at its own coordinates
    const lift=k===0?H*e:H;
    const aLines=k===2?1-e:k===3?e:1,aPl=k===2?e:k===3?1-e:0;
    slabs(R,A.lines,aLines,(l,i)=>{if(k===3&&i===STAMP)return null;if(k>=1&&i===STAMP)return [bad];
      if(k===3){const c=colOf(l.bbox);return [mix(P.paper,c==='R'?P.c3:P.c1,.45)]}return [base]},lift);
    if(aPl>0)slabs(R,A.plumber,aPl,l=>[cross(l.bbox)?bad:base],H);
    // the gutter between the two columns
    if(k>=2)R.line([S.at(mid,60,H*.5),S.at(mid,800,H*.5)],{c:P.mute,w:1,dash:[5,4],a:.7});
    if(k===0)R.label(S.at(PG.w/2,30,H),A.lines.length+' lines · '+PG.n_chars.toLocaleString('en-GB')+' characters · '+PG.fonts.length+' fonts',{fs:12.5,b:1,a:e});
    // 2. content-stream order
    if(k===1){order(R,pS,e,P.c4,1);const sb=S.box(A.lines[STAMP].bbox,H);
      R.label([sb.c[0]+.15,H,sb.c[2]],'arXiv stamp · drawn last',{al:'left',dx:6,fs:12.5,b:1,c:P.bad,a:at(k,e,1)})}
    // 3. pdfplumber: lines clustered across the full width
    if(k===2){order(R,pP,e,P.c4,e);R.label(S.at(PG.w*.75,30,H),nCross+' of '+A.plumber.length+' lines cross the gutter',{fs:12.5,b:1,c:P.bad,a:e})}
    // 4. Docling: the layout model finds the columns; the stamp is page furniture and is dropped
    if(k===3){order(R,pR,e,P.c4,e);const sb=S.box(A.lines[STAMP].bbox,H*(1-e));
      R.quad([[sb.c[0]-sb.s[0]/2,sb.c[1],sb.c[2]-sb.s[2]/2],[sb.c[0]+sb.s[0]/2,sb.c[1],sb.c[2]-sb.s[2]/2],[sb.c[0]+sb.s[0]/2,sb.c[1],sb.c[2]+sb.s[2]/2],[sb.c[0]-sb.s[0]/2,sb.c[1],sb.c[2]+sb.s[2]/2]],{ec:P.bad,dash:[3,2],a:1-.5*e,lw:1.4});
      R.label(S.at(PG.w*.27,30,H),'left column',{fs:12.5,b:1,c:P.c1,a:e});R.label(S.at(PG.w*.73,30,H),'then right',{fs:12.5,b:1,c:P.c3,a:e});
      R.label([sb.c[0]+.15,0,sb.c[2]],'stamp dropped',{al:'left',dx:6,fs:12.5,c:P.bad,a:e})}
  }
  const full={cam:[.32,1.02],bounds:[[-2.25,0,-3.05],[2.25,.45,3.05]]};
  const st=S3.stage({id:'stg-anat',list:'sx-anat',fig:'Fig. 2 · page 1 of arXiv 1909.00175, three reading orders',cam:full.cam,bounds:full.bounds,aspect:.9,dur:1700,hold:4800,draw,
    margin:w=>w<520?[12,8,12,8]:[16,16,14,16],
    // step 2 moves in close on the left margin, where the stamp sits; the others show the whole page
    view:k=>k===1?{cam:[.5,.92],bounds:[[-2.25,0,-2.2],[.4,.45,1.6]]}:full});
  if(st)ING3.stages.push(st);
})();
