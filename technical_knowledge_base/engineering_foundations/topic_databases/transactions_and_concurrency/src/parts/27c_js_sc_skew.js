// ---- Scene, Fig. 3 (section 3): write skew on the on-call rota, three recorded runs on PostgreSQL 16.2 (renderer v2) ----
// TXD.engines.pg 'writeskew|repeatable read' (steps 2 and 3), '|serializable' (step 4), 'writeskew|read committed|for_update' (step 5).
(function(){
  if(!document.getElementById('stg-skew')||!window.TXTL)return;const {mix,cl,at}=S3,E=TXD.engines.pg.runs;
  const names=res=>(res.replace(/^returns /,'').match(/\b(ana|raj)\b/g)||[]);
  const opt={rows:{ana:true,raj:true},reads:(q,res)=>/count\(\*\)/.test(q)?['ana','raj']:names(res),locks:(q,res)=>/FOR UPDATE/.test(q)?names(res):[],
    write:q=>{const m=q.match(/engineer = '(\w+)'/);return m?[{row:m[1],val:false}]:null}};
  const RR=TXTL.parse(E['writeskew|repeatable read'].tr,opt),SER=TXTL.parse(E['writeskew|serializable'].tr,opt),FU=TXTL.parse(E['writeskew|read committed|for_update'].tr,opt);
  const IDLE={ev:[],n:RR.n,slot:k=>k,changes:[],locks:[],init:{ana:true,raj:true},fin:{ana:true,raj:true}};
  const label=e=>{const r=e.res.replace(/^returns /,'');if(e.err)return (e.res.match(/\b(40001|40P01)\b/)||[''])[0];
    if(e.kind==='read')return /count/.test(e.q)?'count '+r:/FOR UPDATE/.test(e.q)?'lock '+r:r;
    if(e.kind==='write')return e.rows[0]+' off';if(e.kind==='commit')return e.tf?'rollback':'';return ''};
  const h=v=>v?.3:.05;
  function geo(P){const c=v=>v?mix(P.paper,P.good,.45):mix(P.paper,P.bad,.35);
    return {x0:-4.4,x1:4.4,zMin:-1.9,zMax:1.9,lanes:{A:1.45,B:-1.45},laneLab:{A:'A (Ana)',B:'B (Raj)'},label,
      rows:[{id:'ana',z:.38,d:.42,name:'Ana',h,lab:v=>v?'on call':'off',c},{id:'raj',z:-.38,d:.42,name:'Raj',h,lab:v=>v?'on call':'off',c}]}}
  function outcome(R,r,a,g){const P=R.P,n=(r.fin.ana?1:0)+(r.fin.raj?1:0),xe=TXTL.xEnd(r,g)+.1;
    R.label([xe,.3,0],n+' on call',{al:'left',dx:4,fs:15,b:1,c:n?P.good:P.bad,a});
    R.label([xe,.3,0],n?'the rule holds':'the rule is broken',{al:'left',dx:4,dy:18,fs:12,c:n?P.good:P.bad,a,wide:1})}
  function draw(R,k,e){const P=R.P,g=geo(P);R.grid(-5.8,5.8,-2.6,2.6,.5);
    if(k===0){TXTL.draw(R,IDLE,IDLE.n,Object.assign({},g,{flows:false}));R.label([0,.5,0],'rule: at least one engineer on call',{fs:12.5,b:1,dy:-34,c:P.acc,a:e});return}
    const mid=RR.slot(3)+.5; // the end of step 2: both have counted
    if(k===1){TXTL.draw(R,RR,-.5+(mid+.5)*e,g);return}
    if(k===2){const now=mid+(RR.n-.5-mid)*e;TXTL.draw(R,RR,now,g);if(now>=RR.n-1)outcome(R,RR,cl((now-RR.n+1)*2,0,1),g);return}
    const prev=k===3?RR:SER,r=k===3?SER:FU;
    if(e<.15)TXTL.draw(R,prev,prev.n,Object.assign({},g,{a:1-e/.15,flows:false}));if(e<.12)return;
    const now=-.5+r.n*cl((e-.12)/.88,0,1);TXTL.draw(R,r,now,g);
    // serializable: the two read-write dependencies SSI found, one each way (each read the row the other then wrote)
    if(k===3&&now>r.slot(5)){const a=cl((now-r.slot(5))*1.5,0,1),W=8.8/Math.max(r.n,1),X=i=>-4.4+(i+.5)*W;
      // A read Raj's row (step 1), B then wrote it (step 5): A must come before B; B read Ana's row (step 3), A then wrote it (step 4): B before A
      R.arc([X(r.slot(1)),.3,1.45],[X(r.slot(5)),.3,-1.45],1.0,{c:P.bad,w:2,head:7,a});R.arc([X(r.slot(3)),.3,-1.45],[X(r.slot(4)),.3,1.45],.7,{c:P.bad,w:2,head:7,a,dash:[5,4]});
      R.label([0,1.5,-1.9],'rw: A read Raj’s row, B wrote it',{fs:12,c:P.bad,b:1,a,wide:1,grp:'rw'});R.label([0,1.5,-1.9],'rw: B read Ana’s row, A wrote it',{fs:12,c:P.bad,b:1,a,wide:1,grp:'rw'})}
    if(now>=r.n-1)outcome(R,r,cl((now-(r.n-1))*2,0,1),g)}
  S3.stage({id:'stg-skew',list:'sx-skew',fig:'Fig. 2 · write skew on the on-call rota, recorded',cam:[-.22,.82],bounds:[[-5.4,0,-1.9],[6.2,.8,1.9]],aspect:.48,dur:3600,hold:4600,draw,
    view:()=>innerWidth<520?{cam:[-.12,1.02]}:null, // on a phone the camera looks down more, so the long scene uses the card's height
   
    margin:w=>w<520?[14,8,12,46]:[18,16,14,70]});
})();
