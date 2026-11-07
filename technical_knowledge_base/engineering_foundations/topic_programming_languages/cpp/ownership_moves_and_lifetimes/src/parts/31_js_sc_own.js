// ---- Scene: one owner on the stack, its buffer on the heap (section 2; renderer v2): the stack frame as a raised glass plate above the heap floor ----
// Steps 1 and 2 are stack_heap.cpp's real run (CA_DATA.addr: the printed addresses; sizes derived from them and from sizeof(v));
// steps 3 to 6 continue the same frame with a copy, a move, the closing brace and a dangling pointer: positions illustrative, facts from copy.cpp and moved_from.cpp.
(function(){
  if(!document.getElementById('stg-own')||!window.CA_DATA)return;const {at,off,cl,mix}=S3;
  const D=CA_DATA,A={};D.addr.forEach(r=>A[r[0]]=r[1]);
  const num=s=>parseInt(s,16),VB=+((D.sizes.find(r=>r[0]==='std::vector<int>')||[0,24])[1]),UB=+((D.sizes.find(r=>r[0]==='std::unique_ptr<int>')||[0,8])[1]);
  const aS1=A['&on_stack'],aS2=A['&also_on_stack'],aV=A['&v (the vector object)'],aH=A['on_heap.get() (heap int)'],aD=A['v.data() (its elements)'],aG=A['&global_counter (static)'];
  const INT=num(aS1)-num(aS2);                        // 4: two adjacent ints, read from the addresses
  const VALS=D.stage.v,U=1/6;                          // widths: one world unit per 6 bytes
  const YS=1.5,SX0=-4.45,PL=[-4.75,-.25,-2.05,2.15];      // stack plate height, left edge of the objects, plate extent x0,x1,z0,z1
  const HX0=.75,HZ=-.45,BZ=1.15,GZ=-2.65;               // heap: x of the lowest printed heap address, the printed row, the copy's row (illustrative), static row
  const hx=addr=>num(addr)<=num(aH)?HX0:HX0+INT*U+.6;   // heap blocks in address order (on_heap's int first, v's elements 16 bytes later); gaps not to scale
  const Z={s1:-1.65,s2:-1.15,up:-.6,v:.1,b:.85,w:1.6};
  const EW=INT*U,BC=hx(aD)+VALS.length*EW/2;          // an int's width; the centre of v's buffer
  function obj(R,x0,z,bytes,o){const w=bytes*U,P=R.P;R.box([x0+w/2,YS,z],[w-.04,.3,.4],{fill:o.fill||P.paper,a:o.a,shadow:false,lw:.9});return [x0+w,YS+.28,z]}
  function cells(R,x0,z,n,o){const P=R.P;for(let i=0;i<n;i++)R.box([x0+(i+.5)*U*8,YS,z],[U*8-.06,.3,.4],{fill:i===0?mix(P.paper,P.acc,.45):P.paper,a:o.a,shadow:false,lw:.9});return [x0+U*8*.5,YS+.3,z]}
  function buf(R,x0,z,vals,o){const P=R.P;vals.forEach((v,i)=>{const c=[x0+(i+.5)*EW,0,z];R.box(c,[EW-.05,.26,.42],{fill:mix(P.paper,o.c||P.acc,.5),a:o.a,lw:.8});
    if(o.lab)R.label([c[0],.3,z],String(v),{mono:true,fs:12,dy:-8,a:o.a,wide:1})})}
  function ghost(R,x0,z,n,o){const P=R.P,x1=x0+n*EW;R.quad([[x0,.01,z-.22],[x1,.01,z-.22],[x1,.01,z+.22],[x0,.01,z+.22]],{fill:false,ec:o.c||P.mute,dash:[5,4],lw:1.4,a:o.a})}
  function lab(R,p,t,o){R.label(p,t,Object.assign({mono:true,fs:12,al:'right',dx:-10},o))}
  function draw(R,k,e){const P=R.P;R.grid(-5.6,5.6,-4.2,3.2,.5);
    // the frame dissolves at the closing brace (step 5): w, b, v, on_heap's pointer, then the frame
    const D5=(i)=>k<4?1:k>4?0:1-cl((e-i*.17)/.17,0,1);  // i-th destructor in reverse order fades in its slice of step 5
    const frameA=k<4?1:k>4?0:1-cl((e-.75)/.25,0,1);
    const rec=k>=2&&k<=3?.28:1;                            // the original run recedes while the copy and the move are drawn
    // regions
    R.glass([PL[0],YS,PL[2]],[PL[1]-PL[0],0,0],[0,0,PL[3]-PL[2]],{c:P.c1,nu:6,nv:6,a:frameA*.75,dz:50});
    R.label([PL[0]+.1,YS,PL[2]],'stack frame of main',{al:'left',fs:12.5,b:1,c:P.c1,dy:-12,a:frameA});
    R.quad([[.3,0,-1.75],[4.3,0,-1.75],[4.3,0,1.85],[.3,0,1.85]],{fill:mix(P.card,P.c2,P.dark?.12:.07),ec:mix(P.card,P.c2,.5),lw:1,a:.9,dz:100});
    R.label([4.3,0,1.85],'heap',{al:'right',fs:12.5,b:1,c:P.c2,dx:-4,dy:14});
    const sa=at(k,e,1);
    R.quad([[.3,0,-3.05],[4.3,0,-3.05],[4.3,0,-2.2],[.3,0,-2.2]],{fill:mix(P.card,P.c5,P.dark?.14:.09),ec:mix(P.card,P.c5,.55),lw:1,a:Math.max(sa,k>=5?1:0),dz:100});
    R.label([4.3,0,-2.62],'static',{al:'left',fs:12.5,b:1,c:P.c5,dx:8,a:Math.max(sa,k>=5?1:0)});
    // step 1: v (24 bytes, three 8-byte fields) and its three ints
    const vA=(k===0?Math.min(1,e*1.6):1)*rec*D5(2),vEmpty=k>=3;
    const vp=cells(R,SX0,Z.v,VB/8,{a:vA});
    lab(R,[SX0,YS+.14,Z.v],vEmpty&&k>=3?'v · empty':'v · '+VB+' B',{a:Math.max(vA,k===3?.6:0),c:vEmpty?P.mute:P.ink,b:!vEmpty,grp:'stk'});
    if(k===0)R.label([SX0+VB*U,YS+.28,Z.v],aV,{al:'left',dx:8,mono:true,fs:12,c:P.mute,a:vA,wide:1});
    const bufA=(k===0?cl(e*1.6-.3,0,1):1)*(k===4?D5(0):k>4?0:1)*(k===2?.45:1);
    buf(R,hx(aD),HZ,VALS,{a:bufA,c:P.acc,lab:k<=1});
    if(k<=1)R.label([BC,0,HZ+.21],aD,{mono:true,fs:12,c:P.mute,a:bufA,dy:14,wide:1});
    if(k<=2&&vA>.05)R.flowArc(vp,[hx(aD),.3,HZ],.55,{c:P.acc,r:.065,n:9,speed:1.2,a:k===2?.35:vA});
    if(k===3)R.arc(vp,[hx(aD),.3,HZ],.55,{c:P.mute,w:1.2,dash:[4,4],a:off(k,e,3)*.8,top:1});
    // step 2: the rest of the run
    const rA=at(k,e,1)*rec;
    if(rA>.01){
      obj(R,SX0,Z.s1,INT,{a:rA*D5(4)});lab(R,[SX0,YS+.14,Z.s1],'on_stack · '+aS1,{a:rA*frameA,grp:'stk',wide:1});
      obj(R,SX0,Z.s2,INT,{a:rA*D5(4)});lab(R,[SX0,YS+.14,Z.s2],'also_on_stack · '+aS2,{a:rA*frameA,grp:'stk',wide:1});
      const up=obj(R,SX0,Z.up,UB,{a:rA*D5(3),fill:mix(P.paper,P.acc,.3)});lab(R,[SX0,YS+.14,Z.up],'on_heap · unique_ptr '+UB+' B',{a:rA*frameA,grp:'stk'});
      const iA=rA*(k===4?D5(3):k>4?0:1);buf(R,hx(aH),HZ,[3],{a:iA,c:P.c2,lab:k<=1});
      R.label([hx(aH)+EW/2,0,HZ+.21],aH,{mono:true,fs:12,c:P.mute,a:k<=1?iA:0,dy:30,wide:1});
      if(k<=3)R.flowArc([up[0]-.5,up[1],up[2]],[hx(aH)+EW/2,.3,HZ],.5,{c:P.c2,r:.06,n:7,speed:1.2,a:iA*(k>=2?.5:1)});
      const ga=Math.max(rA,k>=4?1:0);R.box([1.2,0,GZ],[EW-.05,.26,.42],{fill:mix(P.paper,P.c5,.5),a:ga});
      R.label([1.2,.26,GZ],'global_counter'+(k<=1?' · '+aG:''),{mono:true,fs:12,dy:-12,a:ga*(k===5?.5:1),wide:k<=1?1:0})}
    // step 3: the copy, b, with its own buffer (illustrative position)
    const bA=at(k,e,2)*(k===3?.35:1)*D5(1);
    if(bA>.01){const bp=cells(R,SX0,Z.b,VB/8,{a:bA});lab(R,[SX0,YS+.14,Z.b],'b · copy of v',{a:bA,grp:'stk',b:1});
      const fill=k===2?cl(e*1.6-.4,0,1):1;buf(R,hx(aD),BZ,VALS,{a:bA*fill,c:P.c3,lab:k===2});
      if(k===2&&e<.98)VALS.forEach((_,i)=>R.flowArc([hx(aD)+(i+.5)*EW,.3,HZ],[hx(aD)+(i+.5)*EW,.3,BZ],.45,{c:P.c3,r:.05,n:4,speed:1.3,a:Math.sin(Math.PI*cl(e*1.2,0,1))}));
      R.label([BC,0,BZ+.21],k===2?'b’s new buffer: the ints copied':'b’s own buffer',{fs:12.5,dy:14,c:P.c3,a:bA*fill,b:k===2});
      if(k<=3)R.flowArc(bp,[hx(aD),.3,BZ],.5,{c:P.c3,r:.06,n:8,speed:1.2,a:bA})}
    // step 4: the move, w takes v's buffer
    const wA=at(k,e,3)*D5(0);
    if(wA>.01){const wp=cells(R,SX0,Z.w,VB/8,{a:wA});lab(R,[SX0,YS+.14,Z.w],'w · moved from v',{a:wA,grp:'stk',b:1,c:P.acc});
      if(k===3)R.flowArc(wp,[hx(aD),.3,HZ],.75,{c:P.acc,r:.07,n:10,speed:1.2,a:wA});
      if(k===3)R.label([BC,0,HZ+.21],'the same buffer, now w’s',{fs:12.5,b:1,c:P.acc,a:wA,dy:14})}
    // step 5: the closing brace; freed blocks stay as dashed outlines
    if(k===4){const t=['~w() frees v’s old buffer','~b() frees its copy','~v(): nothing to free','~unique_ptr() frees the int','the frame is popped'],i=Math.min(4,Math.floor(e/.17));
      R.label([-2.5,YS+.3,2.15],'} '+t[i],{mono:true,fs:13,b:1,c:P.bad,dy:24,a:cl(e*4,0,1)})}
    if(k>=4){const ga=k===4?cl((e-.05)*5,0,1):1;ghost(R,hx(aD),HZ,VALS.length,{a:ga*(k>4?.45:.7)});ghost(R,hx(aH),HZ,1,{a:ga*(k>4?.45:.7)});
      ghost(R,hx(aD),BZ,VALS.length,{a:ga*(k===4?.7:1),c:k>4?P.bad:P.mute});if(k===4)R.label([BC,0,BZ+.21],'freed',{fs:12.5,dy:14,c:P.mute,a:ga})}
    // step 6: p in static storage still holds the freed buffer's address
    if(k===5){const a=Math.min(1,e*1.5),src=[3.1,.26,GZ],tgt=[hx(aD)+EW*.5,.05,BZ];R.box([3.1,0,GZ],[8*U-.05,.26,.42],{fill:mix(P.paper,P.bad,.35),a});
      R.label([3.1+4*U,.26,GZ],'int* p',{al:'left',dx:8,mono:true,fs:12.5,b:1,c:P.bad,a});
      R.arc([src[0],src[1],src[2]+.2],tgt,.9,{c:P.bad,w:2.2,head:8,a,top:1});R.label([BC,0,BZ+.21],'p dangles: freed memory',{fs:12.5,dy:14,b:1,c:P.bad,a})}
  }
  const full={cam:[.22,.72],bounds:[[-4.8,0,-3.1],[4.3,1.8,2.2]]};
  S3.stage({id:'stg-own',list:'sx-own',fig:'stack_heap.cpp, one real run, then a copy and a move',cam:full.cam,bounds:full.bounds,aspect:.56,dur:1500,hold:4800,draw,
    view:k=>k===0?{cam:[.22,.64],bounds:[[-4.6,0,-.6],[4.2,1.8,.6]]}:k===2||k===3?{cam:[.22,.68],bounds:[[-4.7,0,-.8],[4.3,1.8,2.1]]}:full,
    margin:w=>w<520?[22,10,24,10]:[22,30,26,130]});
})();
