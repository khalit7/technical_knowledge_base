// ---- Scene, Fig. 1 (the top): one balance, two tabs; the lost update and its three fixes, each a recorded run on PostgreSQL (renderer v2) ----
// Runs: TXD.engines.pg 'lost|read committed', '...|atomic', '...|for_update' (16.2) and TXD.mvcc serializable (16.15, the one with the application's retry).
(function(){
  if(!document.getElementById('stg-hero')||!window.TXTL)return;const {mix,cl}=S3,E=TXD.engines.pg.runs;
  const opt={rows:{bal:30},reads:()=>['bal'],locks:q=>/FOR UPDATE/.test(q)?['bal']:[],
    write:(q,cur)=>{let m=q.match(/balance = (\d+)/);if(m)return [{row:'bal',val:+m[1]}];m=q.match(/balance - (\d+)/);return m?[{row:'bal',val:cur.bal-(+m[1])}]:null}};
  const RUNS=[null,E['lost|read committed'].tr,E['lost|read committed|atomic'].tr,E['lost|read committed|for_update'].tr,TXD.mvcc.runs.serializable.steps].map(t=>t&&TXTL.parse(t,opt));
  const IDLE={ev:[],n:8,slot:k=>k,changes:[],locks:[],init:{bal:30},fin:{bal:30}};
  const label=e=>{const r=e.res.replace(/^returns /,'');if(e.err)return (e.res.match(/\b(40001|40P01|55P03)\b/)||[''])[0];
    if(e.retry)return 'retry';if(e.kind==='read')return 'read '+r;if(e.kind==='write'){const m=e.q.match(/balance - (\d+)/);return m?'-'+m[1]+' → '+e.val:'set '+e.val}
    if(e.kind==='commit')return e.tf?'rollback':'';if(e.kind==='rollback')return 'rollback';return ''};
  const h=v=>.08+v/30*.5;
  function geo(P){return {x0:-4.6,x1:4.6,zMin:-1.7,zMax:1.7,nMin:9,lanes:{A:1.3,B:-1.3},label,
    rows:[{id:'bal',z:0,d:.55,name:'balance',h,lab:v=>String(v),c:v=>v===15?mix(P.paper,P.good,.45):v===25?mix(P.paper,P.bad,.4):mix(P.paper,P.c1,.22)}]}}
  function outcome(R,r,a,g){const P=R.P,v=r.fin.bal,good=v===15,xe=TXTL.xEnd(r,g)+.1;
    R.label([xe,h(v)*.6,0],good?'15 ✓':'25 ✗',{al:'left',dx:4,fs:15,b:1,c:good?P.good:P.bad,a});
    R.label([xe,h(v)*.6,0],good?'both spends counted':'A’s 10 credits lost',{al:'left',dx:4,dy:18,fs:12,c:good?P.good:P.bad,a,wide:1})}
  function draw(R,k,e){const P=R.P,g=geo(P);R.grid(-6,6,-2.4,2.4,.5);
    if(k===0){TXTL.draw(R,IDLE,IDLE.n,Object.assign({},g,{flows:false}));
      R.label([-2.5,.1,1.3],'A will spend 10',{fs:12.5,b:1,c:P.c2,a:e});R.label([-2.5,.1,-1.3],'B will spend 5',{fs:12.5,b:1,c:P.c2,a:e});return}
    const r=RUNS[k];
    // the previous run fades out fully before this one starts
    if(k>=2&&e<.15)TXTL.draw(R,RUNS[k-1],RUNS[k-1].n,Object.assign({},g,{a:1-e/.15,flows:false}));
    if(e<.12)return;const now=-.5+r.n*cl((e-.12)/.88,0,1);
    TXTL.draw(R,r,now,g);if(now>=r.n-1)outcome(R,r,cl((now-(r.n-1))*2,0,1),g)}
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · one balance, two tabs, four recorded runs',cam:[-.22,.82],bounds:[[-5.4,0,-1.7],[6.4,.6,1.7]],aspect:.44,dur:4200,hold:4600,draw,
    view:()=>innerWidth<520?{cam:[-.12,1.02]}:null, // on a phone the camera looks down more, so the long scene uses the card's height
   
    margin:w=>w<520?[14,8,12,58]:[18,16,14,96]});
})();
