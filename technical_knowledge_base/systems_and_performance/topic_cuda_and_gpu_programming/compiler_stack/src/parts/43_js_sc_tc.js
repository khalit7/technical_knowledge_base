// ---- Scene, Fig. 6: torch.compile as one road, from the page's own logs (torch 2.14.1 on the CPU, window.CSD.tc): the running example's
// bytecode (tc.bc_orig), its FX graph (tc.graph), its guards (tc.guards), Inductor's seven scheduler nodes (window.CSFUSE, checked against
// out/tc/inductor_cpu.log by check/check_embed.py), the C++ kernel (tc.cpp_kernel), Triton's PTX header (CSD.triton_ptx_head); and, in the
// second mode, with_print's graph break (tc.bc_mod, tc.bc_resume_orig, tc.break_graphs, tc.explain). Stages are glass plates standing across
// the road (Dynamo blue, AOTAutograd teal, Inductor gold, PTX purple, SASS orange); what each hands on stands after it. Steps: #sx-tc, #sx-tcb. ----
(function(){
  if(!document.getElementById('stg-tc'))return;const {at,off,lerp,mix}=S3,D=window.CSD,T=D.tc;
  const G=T.graph.filter(x=>/^\s+\w+: "/.test(x)).map(x=>x.trim().split(':')[0]);            // mul, softmax, matmul
  const G1=[],G2=[];{let c=null;T.break_graphs.forEach(l=>{if(/=====/.test(l)){c=c===G1?G2:G1;return}if(c&&/^\s+\w+: "/.test(l))c.push(l.trim().split(':')[0])})}
  const NODES=window.CSFUSE||[],ptxv=(D.triton_ptx_head.find(l=>/^\.version/.test(l))||'').trim();
  const bh=n=>.012*n;   // bytecode as a column, 0.012 units per instruction
  let mode='r';
  function draw(R,k,e){const P=R.P,W=R.W,H=R.H;R.grid(-6.2,6.2,-1.8,1.8,.5);
    const lab=(p,t,o)=>{const q=R.p(p);if(q[0]<6||q[0]>W-6||q[1]<6||q[1]>H-6)return;R.label(p,t,o)};
    const edge=(c,sz)=>{let m=1e9;for(let i=0;i<8;i++){const q=R.p([c[0]+(i&1?.5:-.5)*sz[0],c[1]+(i&2?sz[1]:0),c[2]+(i&4?.5:-.5)*sz[2]]);m=Math.min(m,q[0],W-q[0],q[1],H-q[1])}return Math.max(0,Math.min(1,(m-4)/26))};
    const A=(s,x)=>{const b=s<k?.3:s===k?(s===0?1:Math.max(.1,e)):.1;return b};   // done recede, the step's objects arrive, later ones faint
    const plate=(x,c,a,name,on)=>{const f=edge([x,0,0],[.1,1.3,1.6]);if(f<.05)return;R.glass([x,0,-.8],[0,0,1.6],[0,1.3,0],{c,a:a*f,nu:4,nv:4});if(on&&f>.6)lab([x,1.3,0],name,{mono:true,fs:12.5,b:1,dy:-12,c})};
    const node=(p,sz,fill,a,txt,on,c,up)=>{const f=edge(p,sz);if(f<.05)return;R.box(p,sz,{fill,a:a*f});if(on&&txt&&f>.6){if(up)lab([p[0],p[1]+sz[1],p[2]-sz[2]/2],txt,{mono:true,fs:12,dy:-10,c:c||P.ink});else lab([p[0],0,p[2]+sz[2]/2],txt,{mono:true,fs:12,dy:12,c:c||P.ink})}};
    const flow=(a,b,c,h)=>R.flowArc(a,b,h||.3,{c,a:Math.min(1,e*1.6),r:.06,speed:1.4});
    if(mode==='r'){
      // the frame's bytecode, the guards (a gate of one post per guard line), Dynamo and its FX graph
      node([-5.3,0,0],[.5,bh(T.bc_orig.length),.5],mix(P.paper,P.c1,.15),A(0),'frame · '+T.bc_orig.length+' instructions',k===0);
      const ng=T.guards.length,aG=A(1);for(let i=0;i<ng;i++){const z=-.8+1.6*i/(ng-1);const f=edge([-4.65,0,z],[.04,.5,.04]);R.box([-4.65,0,z],[.045,.5,.045],{fill:mix(P.paper,P.c1,.55),a:aG*f,shadow:false,lw:.6})}
      if(k===1)lab([-4.65,0,.8],ng+' guards, checked every call',{mono:true,fs:12,dy:14,c:P.c1,a:e});
      plate(-4.0,P.c1,A(0),'Dynamo',k<=1);
      G.forEach((nm,i)=>node([-3.3+i*.62,0,0],[.44,.3,.44],mix(P.paper,P.c1,.35),A(0),nm,k===0&&W>=520,P.c1));
      if(k===0){flow([-5.3,bh(T.bc_orig.length),0],[-4.0,.9,0],P.c1,.25);flow([-4.0,.7,0],[-2.06,.32,0],P.c1,.35)}
      if(k===1){flow([-5.6,.3,.4],[-4.65,.5,.4],P.c1,.2);flow([-4.65,.5,.4],[-3.3,.32,0],P.c1,.3)}
      // AOTAutograd: the forward graph goes on; a backward graph only with gradients (faint, dashed outline)
      plate(-1.4,P.c6,A(2),'AOTAutograd',k===2);
      node([-.7,0,.35],[.6,.3,.5],mix(P.paper,P.c6,.35),A(2),'forward graph',k===2,P.c6);
      {const f=edge([-.7,0,-.45],[.6,.3,.5]);if(k>=2&&f>.05)R.box([-.7,0,-.45],[.6,.3,.5],{fill:P.paper,a:(k===2?.45*e:.15)*f,fa:.2,ea:.6,shadow:false});if(k===2&&f>.6)lab([-.4,.3,-.45],'backward graph: with gradients only',{fs:12,al:'left',dx:8,dy:-6,c:P.mute,a:e,wide:1})}
      if(k===2){flow([-2.06,.32,0],[-1.4,.7,0],P.c1,.25);flow([-1.4,.7,0],[-.7,.32,.35],P.c6,.25)}
      // Inductor: seven scheduler nodes, then one fused kernel plus the library matmul
      plate(.3,P.c5,A(3),'Inductor',k===3);
      const t4=k<3?0:k===3?e:1,n=NODES.length||7;
      NODES.forEach((nd,i)=>{const z0=-.9+1.8*i/(n-1),ext=nd[2]==='extern';
        if(ext||t4<.55){const x=1.0,a=A(3)*(ext?1:Math.max(0,1-t4*1.8));node([x,0,z0],[.24,.24,.22],mix(P.paper,ext?P.mute:P.c5,.4),a,null,false);
          if(k===3&&e<.5&&!ext)lab([x+.12,.24,z0],nd[0]+' '+nd[1],{mono:true,fs:12,al:'left',dx:6,c:P.c5,grp:'nd',a:1-e*2})}});
      if(t4>0){const zs=-.9,ze=-.9+1.8*(n-2)/(n-1);node([1.0,0,(zs+ze)/2],[.3,.3,(ze-zs)+.22],mix(P.paper,P.c5,.55),A(3)*Math.min(1,t4*1.6),null,false);
        if(k===3)lab([1.15,.3,(zs+ze)/2],'1 fused kernel',{mono:true,fs:12,al:'left',dx:8,c:P.c5,a:e});
        if(k===3)lab([1.15,.24,.9],'extern_kernels.mm',{mono:true,fs:12,al:'left',dx:8,c:P.mute,a:e})}
      if(k===3){flow([-.7,.32,.35],[.3,.7,0],P.c6,.25);flow([.3,.6,0],[1.0,.32,-.2],P.c5,.25)}
      // codegen: C++ on the CPU (run here), Triton on a GPU (generated here)
      node([2.1,0,.45],[.6,bh(T.cpp_kernel.length)*.6,.5],mix(P.paper,P.c5,.25),A(4),'C++ · '+T.cpp_kernel.length+' lines',k===4,P.ink);
      node([2.1,0,-.45],[.6,.3,.5],mix(P.paper,P.c3,.4),A(4),'Triton (GPU)',k===4,P.c3,true);
      if(k===4){flow([1.0,.32,-.1],[2.1,.5,.45],P.c5,.3);flow([1.0,.32,-.3],[2.1,.32,-.45],P.c3,.3)}
      // down the shared road: Triton's PTX, its ptxas, SASS
      plate(3.2,P.c4,A(5),'PTX '+ptxv.replace('.version ','v'),k===5);
      node([4.1,0,0],[.6,.36,.5],mix(P.paper,P.c2,.2),A(5),'ptxas',k===5);
      plate(5.0,P.c2,A(5),'SASS',k===5);
      if(k===5){flow([2.1,.32,-.45],[3.2,.7,0],P.c3,.3);flow([3.2,.7,0],[4.1,.38,0],P.c4,.25);flow([4.1,.38,0],[5.0,.7,0],P.c2,.25);
        lab([5.0,0,.8],'not run here: no GPU',{fs:12,dy:14,c:P.mute,a:e})}
    } else {
      // a graph break: graph 1, Python for the print, the resume function's graph 2
      const n0=T.bc_orig.length,n1=T.bc_mod.length,nb=k===0?n0:k===1?lerp(n0,n1,e):n1;
      node([-5.3,0,0],[.5,bh(nb),.5],mix(P.paper,P.c1,.15),k<=1?1:.35,'frame · '+Math.round(nb)+' instructions',k<=1,P.ink);
      plate(-4.0,P.c1,A(0),'Dynamo',k<=1);
      G1.forEach((nm,i)=>node([-3.3+i*.62,0,0],[.44,.3,.44],mix(P.paper,P.c1,.35),k===3?1:A(0),nm,k===0&&W>=520,P.c1));
      if(k===0){flow([-5.3,bh(n0),0],[-4.0,.9,0],P.c1,.25);flow([-4.0,.7,0],[-2.68,.32,0],P.c1,.3)}
      // the break
      if(k>=1){R.glow([-1.9,.35,0],.45,{c:P.bad,a:(k===1?e:.6)});if(k<=1)lab([-1.9,.35,0],'graph break: print',{mono:true,fs:12,b:1,dy:-26,c:P.bad,a:e})}
      // Python runs the print; the resume function is traced into graph 2
      node([-1.0,.75,0],[.6,.3,.5],mix(P.paper,P.mute,.3),k>=2?(k===2?Math.max(.1,e):1):.1,'Python: print',k===2,P.mute);
      node([-.1,0,0],[.45,bh(T.bc_resume_orig.length),.45],mix(P.paper,P.c1,.15),A(2),'resume fn · '+T.bc_resume_orig.length,k===2,P.ink);
      plate(.6,P.c1,A(2),'Dynamo again',k===2);
      G2.forEach((nm,i)=>node([1.3+i*.62,0,0],[.44,.3,.44],mix(P.paper,P.c1,.35),k===3?1:A(2),nm,k===2,P.c1));
      if(k===2){flow([-2.68,.32,0],[-1.0,1.05,0],P.mute,.25);flow([-1.0,1.05,0],[-.1,bh(T.bc_resume_orig.length),0],P.mute,.25);flow([.6,.7,0],[1.3,.32,0],P.c1,.25)}
      if(k===3){flow([-2.68,.32,0],[-1.0,1.05,0],P.c1,.25);flow([-1.0,1.05,0],[1.3,.32,0],P.mute,.4);
        const X=T.explain.with_print;lab([-1.0,1.05,0],X.graphs+' graphs, '+X.breaks+' break, Python between',{mono:true,fs:12,b:1,dy:-14,c:P.ink,a:e});
        lab([-3.0,0,.22],'graph 1',{mono:true,fs:12,dy:12,c:P.c1,a:e});lab([1.3,0,.22],'graph 2',{mono:true,fs:12,dy:12,c:P.c1,a:e})}
    }
  }
  const FR=[[-5.9,0,-1.2],[5.6,1.6,1.2]],FB=[[-5.9,0,-1.2],[2.2,1.6,1.2]];
  const VR=[[[-5.9,0,-1.2],[-1.6,1.5,1.2]],[[-5.9,0,-1.2],[-1.6,1.5,1.2]],[[-3.4,0,-1.2],[.9,1.5,1.2]],[[-1.6,0,-1.2],[2.7,1.5,1.2]],[[-.4,0,-1.2],[3.9,1.5,1.2]],[[1.4,0,-1.2],[5.7,1.5,1.2]]];
  const VB=[[[-5.9,0,-1.2],[-1.6,1.6,1.2]],[[-5.9,0,-1.2],[-.8,1.6,1.2]],[[-2.8,0,-1.2],[2.2,1.6,1.2]],FB];
  const st=S3.stage({id:'stg-tc',list:'sx-tc',fig:'Fig. 6 · torch.compile, stage by stage',cam:[.35,.55],bounds:()=>mode==='r'?FR:FB,aspect:.56,dur:1400,hold:5000,draw,
    margin:w=>w<520?[14,10,14,10]:[22,16,30,16],view:k=>({cam:[.35,.55],bounds:(mode==='r'?VR:VB)[k]||FR})});
  (window.CSSTG=window.CSSTG||{})['stg-tc']=st;
  RD.seg(document.getElementById('cs-tcMode'),m=>{mode=m;document.getElementById('sx-tc').hidden=m!=='r';document.getElementById('sx-tcb').hidden=m!=='b';st.list(m==='r'?'sx-tc':'sx-tcb')});
})();
