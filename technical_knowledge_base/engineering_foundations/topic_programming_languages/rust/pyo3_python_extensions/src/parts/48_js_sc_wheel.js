// ---- Scene, Fig. 4 (section 12): which interpreters each wheel loads into (renderer v2, 2026-11-07) ----
// The interpreters and results are read from the recordings through window.RB.wheels (src/rb/gen.py parses outputs/b5 to b8):
// the abi3 wheel loaded on the versions that printed "loads tokrs.abi3.so -> 3", uv refused it on 3.14t, the abi3t wheel loaded on 3.15.0rc3 with and without the GIL.
// The cp314 wheel was installed on 3.14 (b1, b3); the cp314t wheel of the last step was not built here and is drawn dashed.
(function(){
  if(!document.getElementById('stg-wheel')||!window.S3||!window.RB||!RB.wheels)return;const {at,off,lerp,mix,cl}=S3;const W=RB.wheels;
  const v=s=>s.split('.').slice(0,2).join('.');
  const IP=[...W.abi3_loaded.map(s=>({id:v(s),lab:s,ft:false})),{id:'3.14t',lab:W.abi3_loaded.find(s=>v(s)==='3.14')+'t',ft:true},
    ...W.abi3t_loaded.map(([s,g])=>({id:v(s)+(g?'':'t'),lab:s+(g?'':'t'),ft:!g}))];
  IP.forEach((p,i)=>{p.x=-5.5+i*2.2;p.z=-.6});
  const X=id=>IP.find(p=>p.id===id).x;
  // the wheels: tag, where it stands, the interpreters it loaded into
  const WH=[{tag:'cp314',x:X('3.14'),to:['3.14']},{tag:'abi3',x:-3.3,to:W.abi3_loaded.map(v)},
    {tag:'abi3.abi3t',x:(X('3.15')+X('3.15t'))/2,to:IP.filter(p=>p.id.startsWith('3.15')).map(p=>p.id)},{tag:'cp314t',x:X('3.14t'),to:['3.14t'],dash:true}];
  const SHOW=[[0],[1],[1],[2],[1,3]],VX=[[-4.2,2.2],[-6.5,2.4],[-6.5,2.4],[1.8,6.5],[-9,9]];   // x range of each step's view: interpreters outside it are not drawn
  function draw(R,k,e){const P=R.P;R.grid(-7,7.2,-2.4,3.2,.5);
    const on=SHOW[k],got=new Set(on.flatMap(i=>WH[i].to)),blocked=k===2;
    IP.forEach(p=>{if(p.x<VX[k][0]||p.x>VX[k][1])return;const hit=got.has(p.id)||(blocked&&p.id==='3.14t'),a=hit?1:.25,c=p.ft?P.c6:P.c1,ok=got.has(p.id);
      R.glass([p.x-.85,.02,p.z-.8],[1.7,0,0],[0,0,1.6],{c,a,nu:4,nv:4,th:.04});
      R.box([p.x,.04,p.z],[.9,.55,.7],{fill:ok?mix(P.paper,P.good,.35*(on.length>1||k===on[0]?e:1)):mix(P.paper,c,.25),a});
      R.label([p.x,.6,p.z],p.lab,{mono:true,fs:12,dy:-11,b:hit,a:Math.max(a,.5)});
      R.label([p.x,0,p.z+.8],p.ft?'free-threaded':'GIL',{mono:true,fs:12,dy:13,c,a:Math.max(a,.5),wide:1})});
    WH.forEach((w,i)=>{if(!on.includes(i))return;const a=(k===4&&i===3)||(k!==2&&k!==4)?e:1,z=2.1,c=P.c5;
      R.box([w.x,0,z],[1.1,.42,.7],{fill:mix(P.paper,c,w.dash?.15:.45),a,ec:w.dash?P.mute:null,ea:w.dash?.9:null});
      if(w.dash)R.quad([[w.x-.62,.44,z-.4],[w.x+.62,.44,z-.4],[w.x+.62,.44,z+.4],[w.x-.62,.44,z+.4]],{a,dash:[4,4],ec:P.mute,fill:null});
      R.label([w.x,.42,z],w.tag+' wheel',{mono:true,fs:12.5,b:1,dy:-11,a,c:w.dash?P.mute:P.ink});
      w.to.forEach(id=>{const p=IP.find(q=>q.id===id);R.flowArc([w.x,.45,z-.25],[p.x,.6,p.z+.3],.6,{c,a:a*(w.dash?.55:.95),r:.065,n:9,speed:1.3})})});
    if(k===4)R.label([X('3.14t'),0,2.5],'not built here',{mono:true,fs:12,dy:14,c:P.mute,a:e});
    if(blocked){const p=IP.find(q=>q.id==='3.14t'),w=WH[1];
      R.glass([p.x-.9,0,1.15],[1.8,0,0],[0,.55,0],{c:P.bad,a:e,nu:3,nv:2});
      R.flowArc([w.x,.45,1.85],[p.x-.2,.3,1.3],.5,{c:P.c5,a:e,r:.065,n:8,speed:1.3});
      R.label([p.x+.9,.3,1.15],'refused',{fs:13,b:1,al:'left',dx:8,c:P.bad,a:e})}
  }
  const full={cam:[.05,.62],bounds:[[-6.5,0,-1.5],[6.5,1.1,2.6]]};
  S3.stage({id:'stg-wheel',list:'sx-wheel',fig:'Fig. 4 · one wheel, which interpreters',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1500,hold:4600,draw,
    margin:w=>w<520?[16,10,16,10]:[18,16,18,16],
    view:k=>k===0?{cam:[.1,.6],bounds:[[-4.2,0,-1.5],[2.2,1.1,2.6]]}:k===1||k===2?{cam:[.08,.62],bounds:[[-6.5,0,-1.5],[2.4,1.1,2.6]]}:k===3?{cam:[0,.62],bounds:[[1.8,0,-1.5],[6.5,1.1,2.6]]}:full});
})();
