// ---- Scene: Box, Rc and Rc<RefCell<T>> as handles on the stack pointing at heap blocks (section 2; renderer v2) ----
// Driven by LSP_DATA.smart (ra/gen.py from smart.rs and its recorded output): the printed result of the Box tree, the printed sizes,
// the printed strong counts and hits, the printed log, the panic line and message, and the line numbers of each step in smart.rs.
// Counts not printed by the program (1 after Rc::new, 2 after one clone, 2 for log and writer) follow from the code and say so in the step list.
// Positions and block sizes are illustrative.
(function(){
  if(!document.getElementById('stg-rc')||!window.LSP_DATA)return;const {at,off,cl,mix}=S3;
  const D=LSP_DATA.smart,CW=.8;                                    // CW: the width of one 8-byte field on the stack plate
  const YS=1.45,PL=[-4.6,-1.0,-1.6,1.3];                         // stack plate height and extent x0,x1,z0,z1
  const ZS={e:-.6,shared:-1.0,a:-.25,b:.5,log:-.6,writer:.3},X0=-2.75;
  const RC=[1.5,0,-.3],RF=[1.5,0,-.3];                            // the Rc's heap block and the RefCell's
  function field(R,z,bytes,o){const P=R.P,n=bytes/8;for(let i=0;i<n;i++)R.box([X0+(i+.5)*CW,YS,z],[CW-.06,.34,.55],{fill:mix(P.paper,o.c||P.acc,.38),a:o.a,shadow:false,lw:.8});
    R.label([X0,YS+.13,z],o.t,{mono:true,fs:12.5,al:'right',dx:-10,a:o.a,b:o.b,c:o.lc||P.ink,grp:'stk'});return i=>[X0+(i+.5)*CW,YS+.34,z]}
  function counter(R,c,n,o){const P=R.P;R.box(c,[.75,.08,.75],{fill:mix(P.paper,P.c5,.3),a:o.a,lw:.8});
    for(let i=0;i<n;i++)R.box([c[0],.08+i*.26,c[2]],[.55,.24,.55],{fill:mix(P.paper,P.c5,.75),a:o.a*(o.top!=null&&i===n-1?o.top:1),shadow:false,lw:.8});
    R.label([c[0]+.3,.08+n*.13,c[2]],o.text,{mono:true,fs:12.5,b:1,c:P.c5,al:'left',dx:10,a:o.a})}
  function block(R,c,s,o){const P=R.P;R.box(c,s,{fill:mix(P.paper,o.c||P.c2,.4),a:o.a,lw:.9});if(o.t)R.label([c[0],s[1],c[2]],o.t,{mono:true,fs:12.5,b:1,dy:-11,a:o.a,c:o.lc||P.ink})}
  function draw(R,k,e){const P=R.P;R.grid(-5.2,5.0,-2.2,2.2,.5);
    R.glass([PL[0],YS,PL[2]],[PL[1]-PL[0],0,0],[0,0,PL[3]-PL[2]],{c:P.c1,nu:5,nv:6,a:.75,dz:50});
    R.label([PL[0]+.1,YS,PL[2]],'stack',{al:'left',fs:12.5,b:1,c:P.c1,dy:-12});
    R.quad([[-.6,0,-1.8],[4.6,0,-1.8],[4.6,0,1.6],[-.6,0,1.6]],{fill:mix(P.card,P.c2,P.dark?.12:.07),ec:mix(P.card,P.c2,.5),lw:1,a:.9,dz:100});
    R.label([4.6,0,1.6],'heap',{al:'right',fs:12.5,b:1,c:P.c2,dx:-4,dy:14});
    // ---- step 1: Box. e (an Expr::Add) holds two Boxes; each points at one heap allocation, and Mul's Boxes point further down
    const bA=k===0?1:k===1?cl(1-e*2.2,0,1):0;
    if(bA>.01){const f=field(R,ZS.e,D.expr,{a:bA,t:'e: Expr, '+D.expr+' bytes',b:1});
      const n2=[.4,0,-1.0],mu=[2.6,0,-1.0],n3=[1.8,0,.6],n4=[3.5,0,.6],sz=[1.35,.45,.75];
      block(R,n2,sz,{a:bA,t:'Num(2.0)'});block(R,mu,sz,{a:bA,t:'Mul'});block(R,n3,sz,{a:bA,t:'Num(3.0)'});block(R,n4,sz,{a:bA,t:'Num(4.0)'});
      R.flowArc(f(1),[n2[0]-.3,.45,n2[2]],.5,{c:P.acc,r:.065,n:8,a:bA});R.flowArc(f(2),[mu[0]-.3,.45,mu[2]],.7,{c:P.acc,r:.065,n:9,a:bA});
      R.flowArc([mu[0]-.2,.45,mu[2]+.3],[n3[0],.45,n3[2]-.3],.35,{c:P.acc,r:.06,n:6,a:bA});R.flowArc([mu[0]+.2,.45,mu[2]+.3],[n4[0],.45,n4[2]-.3],.35,{c:P.acc,r:.06,n:6,a:bA});
      R.label([mu[0]+.75,.45,mu[2]],'each Box: '+D.box+' bytes',{al:'left',dx:8,fs:12.5,c:P.acc,b:1,a:bA,wide:1});
      R.label([(n3[0]+n4[0])/2,0,n3[2]+.5],D.eval,{mono:true,fs:12.5,b:1,dy:16,a:bA})}
    // ---- steps 2 to 5: one Rc block, its strong count, and the handles that point at it
    const rA=k<1?0:k===1?cl(e*2.2-1.1,0,1):k<=4?1:k===5?cl(1-e*2.2,0,1):0;
    if(rA>.01){const cnt=k===1?1:k===2?2:k===3?D.inside:D.after,hits=k>=3?D.hits:0;
      const H=[['shared',1],['a',k>=2?1:0],['b',k===3?1:0]];
      H.forEach(([nm,on],i)=>{const appear=nm==='a'&&k===2?e:nm==='b'&&k===3?e:1;
        if(on){const f=field(R,ZS[nm],D.rc,{a:rA*appear,t:nm+': Rc<Doc>',b:nm==='b'||nm==='a'&&k===2});R.flowArc(f(0),[RC[0]-1.0,.5,RC[2]+(i-1)*.25],.55+.12*i,{c:P.acc,r:.065,n:8,a:rA*appear})}
        else if(nm==='b'&&k===4){R.quad([[X0,YS+.01,ZS.b-.27],[X0+CW,YS+.01,ZS.b-.27],[X0+CW,YS+.01,ZS.b+.27],[X0,YS+.01,ZS.b+.27]],{fill:false,ec:P.mute,dash:[5,4],lw:1.3,a:rA*e});
          R.label([X0,YS+.13,ZS.b],'b: dropped at line '+D.lines.b_end,{mono:true,fs:12.5,al:'right',dx:-10,c:P.mute,a:rA*e,grp:'stk'})}});
      block(R,RC,[2.1,.6,1.1],{a:rA,c:P.c2,t:'Doc'});R.label([RC[0]-1.05,0,RC[2]+.55],'name: "'+D.name+'"',{mono:true,fs:12.5,dy:14,al:'left',a:rA});R.label([RC[0]-1.05,0,RC[2]+.55],'cache_hits: Cell('+hits+')',{mono:true,fs:12.5,dy:31,al:'left',a:rA,b:k===3,c:k===3?P.c6:P.ink});
      if(k===3)R.flowArc([X0+CW/2,YS+.34,ZS.b],[RC[0]+.3,.6,RC[2]+.4],.9,{c:P.c6,r:.07,n:9,a:rA*e});
      counter(R,[RC[0]+2.0,0,RC[2]-.3],cnt,{a:rA,text:'strong_count '+cnt,top:k===1?Math.min(1,e*1.5):1})}
    // ---- steps 6 and 7: Rc<RefCell<Vec<String>>>: two handles, a borrow flag, the Vec's contents; then two borrow_mut at once
    const fA=at(k,e,5);
    if(fA>.01){['log','writer'].forEach((nm,i)=>{const f=field(R,ZS[nm],D.rc,{a:fA,t:nm+': Rc<RefCell<Vec>>',c:P.c4,b:1});R.flowArc(f(0),[RF[0]-1.0,.45,RF[2]+(i-.5)*.3],.55,{c:P.c4,r:.065,n:8,a:fA})});
      block(R,RF,[2.1,.45,1.1],{a:fA,c:P.c4});
      counter(R,[RF[0]+2.0,0,RF[2]-.3],2,{a:fA,text:'strong_count 2'});
      const items=JSON.parse(D.log);
      items.forEach((s,i)=>{const show=k===5?cl(e*2.4-i*.9,0,1):1;R.box([RF[0]-.5+i*1.0,.45,RF[2]],[.9,.26,.6],{fill:mix(P.paper,P.c4,.25),a:fA*show,shadow:false,lw:.8});R.label([RF[0]-.5+i*1.0,.71,RF[2]],JSON.stringify(s),{mono:true,fs:12,dy:-9,a:fA*show})});
      // the borrow flag: who holds the RefCell right now
      const writing=k===5?(e>.1&&e<.45)||(e>.55&&e<.9):k===6,boom=k===6&&e>.5,fc=boom?P.bad:writing?P.c2:P.good;
      R.box([RF[0]-.75,.45,RF[2]+.3],[.42,.2,.38],{fill:mix(P.paper,fc,.6),a:fA,lw:.9});
      R.label([RF[0]-1.05,0,RF[2]+.55],'borrow flag: '+(boom?'second borrow_mut':writing?'1 writer':'free'),{fs:12.5,b:1,c:fc,al:'left',dy:14,a:fA});
      if(k===6){R.flowArc([X0+CW/2,YS+.34,ZS.log],[RF[0]-.75,.65,RF[2]+.3],.5,{c:P.c2,r:.07,n:8,a:Math.min(1,e*2)});
        if(boom){R.flowArc([X0+CW/2,YS+.34,ZS.writer],[RF[0]-.75,.65,RF[2]+.3],.35,{c:P.bad,r:.07,n:8,a:cl((e-.5)*3,0,1)});R.glow([RF[0]-.75,.65,RF[2]+.3],.6,{c:P.bad,a:cl((e-.5)*3,0,1)});
          R.label([RF[0]-1.05,0,RF[2]+.55],'panicked at '+D.panic_at+': '+D.panic,{mono:true,fs:12.5,b:1,c:P.bad,dy:33,al:'left',a:cl((e-.6)*3,0,1)})}}}
  }
  const full={cam:[.18,.62],bounds:[[-4.6,0,-1.7],[4.6,1.9,1.25]]};
  S3.stage({id:'stg-rc',list:'sx-rc',fig:'smart.rs: handles on the stack, counted blocks on the heap',cam:full.cam,bounds:full.bounds,aspect:.56,dur:1500,hold:4800,draw,
    view:k=>k===0?{cam:[.18,.6],bounds:[[-4.6,0,-1.7],[4.6,1.9,1.4]]}:full,
    margin:w=>w<520?[22,10,40,10]:[22,24,44,24]});
})();
