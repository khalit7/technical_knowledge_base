// ---- Scene (hero): the same evidence on three 0/1 arms, what greedy, UCB and Thompson sampling do with it, then what each strategy costs ----
// Renderer v2: flows for pulls landing on arms and their rewards coming back into the estimates, Thompson's posteriors on glass, a few large objects per step.
// Data: BXD.hero (src/make_data.mjs, the page's engine): arms.n / arms.w (illustrative counts after 65 pulls), arms.ucb (Q + sqrt(2 ln t / n)),
// arms.ts (share of 100,000 seeded Thompson draws won by each arm), m (expected regret at marks, 200 runs, arms 0.9, 0.8, 0.6, 0.5).
(function(){
  const D=window.BXD;if(!D||!document.getElementById('stg-hr'))return;const {at,off,mix}=S3;
  const H=D.hero,A=H.arms,K=3,NM='ABC',X=k=>(k-1)*2.4,ZB=-1.1,V=2.0,C=.3,G=.07,PER=5,AG=[0,.25,3.55];
  const Q=A.w.map((w,k)=>w/A.n[k]),gi=Q.indexOf(Math.max(...Q)),ui=A.ucb.indexOf(Math.max(...A.ucb));
  // log Gamma (Lanczos) for the Beta posterior's density
  function lg(x){const c=[676.5203681218851,-1259.1392167224028,771.3234287776531,-176.6150291621406,12.507343278686905,-.13857109526572012,9.984369578019572e-6,1.5056327351493116e-7];
    if(x<.5)return Math.log(Math.PI/Math.sin(Math.PI*x))-lg(1-x);x-=1;let a=.9999999999998099;const t=x+7.5;for(let i=0;i<8;i++)a+=c[i]/(x+i+1);return .5*Math.log(2*Math.PI)+(x+.5)*Math.log(t)-t+Math.log(a)}
  const bpdf=(v,a,b)=>v<=0||v>=1?0:Math.exp(lg(a+b)-lg(a)-lg(b)+(a-1)*Math.log(v)+(b-1)*Math.log(1-v));
  const SER=[['greedy','c2','greedy'],['eps','c1','ε-greedy'],['ucb1','c3','UCB1'],['ts','c4','Thompson']];
  const fmt=v=>v.toFixed(2);
  const rows=a=>Math.ceil(A.n[a]/PER),front=a=>-.1+rows(a)*(C+G)-G;   // the pile's depth and its front edge
  const pileTop=a=>[X(a),C+.05,(-.1+front(a))/2];
  // a stream of pulls from the agent landing on arm a (dots in proportion to how often it is pulled)
  function pull(R,a,share,c,al){if(share<=0)return;const P=R.P;R.flowArc([AG[0],AG[1]+.15,AG[2]-.2],pileTop(a),1.1+.15*Math.abs(a-1),{c:c||P.acc,a:al*(.35+.65*Math.min(1,share*1.3)),r:.05+.05*Math.min(1,share),n:Math.max(2,Math.round(3+share*10)),speed:1.5})}
  function draw(R,k,e){const P=R.P,nar=R.W<520;R.grid(-3.8,3.8,-2.2,4.2,.4);
    // steps 1 to 4: the arms; step 5 fades them out completely before the bill appears
    const old=k<4?1:Math.max(0,1-2*e),neu=k<4?0:Math.max(0,2*e-1);
    if(old>0){
      // the agent: one ball in front, the source of every pull
      R.ball(AG,.17,{c:P.acc,a:old});R.glow(AG,.4,{c:P.acc,a:old*.5});R.label(AG,'agent',{fs:12.5,b:1,c:P.acc,dy:18,a:old});
      // value scale on the back wall
      [0.5,1,1.5].forEach(v=>{R.line([[-3.4,v*V,ZB-.3],[3.4,v*V,ZB-.3]],{c:P.line,w:1,a:old*.9,dash:[4,4]});R.label([-3.5,v*V,ZB-.3],v.toFixed(1),{al:'right',dx:-4,mono:true,fs:12,c:P.mute,a:old})});
      for(let a=0;a<K;a++){const n=A.n[a],w=A.w[a],grow=k===0?e:1,shown=Math.round(n*grow);
        // who is the subject: in steps 2 and 3 the arm that is pulled stays at full strength, the others recede
        const subj=k===1?a===gi:k===2?a===ui:true,pa=old*(subj?1:.35);
        // the evidence: one cube per pull, wins first (green), five to a row, rows running towards the viewer (65 boxes: no shadows)
        for(let i=0;i<shown;i++){const r=Math.floor(i/PER),c=i%PER;R.box([X(a)+(c-(PER-1)/2)*(C+G),0,-.1+r*(C+G)],[C,C,C],{fill:i<w?mix(P.paper,P.good,.75):P.paper,a:pa,lw:.8,shadow:false})}
        R.label([X(a),0,front(a)+.15],'arm '+NM[a]+' · '+w+'/'+n,{fs:12.5,b:1,dy:14,a:Math.max(.5,pa)});
        // the estimate as a bar on the value scale; greedy's pick in the highlight colour
        const hi=k===1&&a===gi,fade=k===3?.2:subj?1:.35;
        R.box([X(a),0,ZB],[.8,Math.max(.02,Q[a]*V*grow),.5],{fill:hi?mix(P.paper,P.acc,.8):mix(P.paper,P.c1,.55),a:old*fade});
        if(k<2)R.label([X(a)+.45,Q[a]*V*grow,ZB],'Q '+fmt(Q[a]),{al:'left',dx:4,mono:true,fs:12,a:old*Math.max(.5,fade),c:hi?P.acc:P.ink});
        // step 1: pulls land on every pile and their rewards come back into the estimate (green dots: the wins)
        if(k===0){pull(R,a,n/65,P.acc,1);R.flowArc(pileTop(a),[X(a),Q[a]*V*grow+.05,ZB],1.0,{c:P.good,a:1,r:.075,n:Math.max(3,Math.round(w/2.5)),speed:1.2})}
        if(hi){pull(R,a,1,P.acc,at(k,e,1));R.glow([X(a),Q[a]*V+.35,ZB],.7,{c:P.acc,a:at(k,e,1),top:1});R.label([X(a),Q[a]*V+.3,ZB],'greedy pulls '+NM[a],{fs:13,b:1,dy:-16,c:P.acc,a:at(k,e,1)})}
        // UCB's bonus: a translucent block from Q up to Q + sqrt(2 ln t / n)
        if(k===2){const u=at(k,e,2),top=Q[a]*V+(A.ucb[a]-Q[a])*V*u;R.box([X(a),Q[a]*V,ZB],[.8,Math.max(.02,(A.ucb[a]-Q[a])*V*u),.5],{fill:mix(P.paper,P.c3,.6),a:old*(subj?.8:.4),fa:.75});
          R.label([X(a)+.45,top,ZB],fmt(A.ucb[a]),{al:'left',dx:4,mono:true,fs:12.5,b:a===ui,c:P.c3,a:u});
          if(a===ui){pull(R,a,1,P.c3,u);R.glow([X(a),top+.3,ZB],.75,{c:P.c3,a:u,top:1});R.label([X(a),top+.3,ZB],'UCB pulls '+NM[a],{fs:13,b:1,dy:-16,c:P.c3,a:u})}}
        // Thompson: each arm's belief is a glass plate on the value scale with its Beta(1 + wins, 1 + losses) posterior drawn on it;
        // pulls go to each arm as often as its draw wins (dots in proportion to the share)
        if(k===3){const u=at(k,e,3),pa2=1+w,pb2=1+n-w,pts=[],pts2=[];let mx=0;for(let j=1;j<100;j++)mx=Math.max(mx,bpdf(j/100,pa2,pb2));
          R.glass([X(a)-1,0,ZB+.32],[2,0,0],[0,V,0],{c:P.c4,a:u*.8,nu:4,nv:4});
          for(let j=0;j<=60;j++){const v=j/60,hw=.95*bpdf(v,pa2,pb2)/Math.max(mx,4.5);pts.push([X(a)+hw*u,v*V,ZB+.34]);pts2.push([X(a)-hw*u,v*V,ZB+.34])}
          R.quad(pts.concat(pts2.reverse()),{fill:mix(P.paper,P.c4,.7),a:old*.9,ea:.6,dz:-.3});
          const sh=A.ts[a];pull(R,a,sh,P.c4,u);R.label([X(a),V*1.02,ZB+.34],(sh<.01?(100*sh).toFixed(1):Math.round(100*sh))+'%',{fs:14,b:1,c:P.c4,a:u,dy:-10})}}
      if(k===3)R.label([0,V*1.02,ZB],'share of Thompson draws won',{mono:true,fs:12,c:P.mute,dy:-34,a:at(k,e,3),wide:1});
    }
    if(neu>0){// the bill: expected regret over 10,000 pulls as four walls, one per strategy
      const xs=[0].concat(H.marks),T=10000,XT=t=>-3.3+6.6*t/T,HY=v=>v/650*3.1,ZS=[-1.5,-.5,.5,1.5],tt=k===4?neu:1;
      SER.forEach(([key,c,lab],j)=>{const ys=[0].concat(H.m[key]),z=ZS[j],n=Math.max(1,Math.round((xs.length-1)*tt)),top=[];
        for(let i=0;i<n;i++){R.quad([[XT(xs[i]),0,z],[XT(xs[i+1]),0,z],[XT(xs[i+1]),HY(ys[i+1]),z],[XT(xs[i]),HY(ys[i]),z]],{fill:mix(P.paper,P[c],.5),a:neu*.75,edge:false})}
        for(let i=0;i<=n;i++)top.push([XT(xs[i]),HY(ys[i]),z]);R.line(top,{c:P[c],w:2.4,a:neu});
        const last=ys[n];R.label([XT(xs[n]),HY(last),z],lab+' '+Math.round(last),{al:'left',dx:6,fs:12.5,b:1,c:P[c],a:neu})});
      R.label([XT(0),0,2.1],'pull 0',{mono:true,fs:12,c:P.mute,a:neu,dy:10});R.label([XT(T),0,2.1],'10,000',{mono:true,fs:12,c:P.mute,a:neu,dy:10});
      R.label([0,0,2.1],'expected regret, arms 0.9, 0.8, 0.6, 0.5',{mono:true,fs:12,c:P.mute,a:neu,dy:26,wide:1})}
  }
  const full={cam:[-.32,.6],bounds:[[-3.7,0,-1.9],[3.7,3.4,3.9]]};
  S3.stage({id:'stg-hr',list:'sx-hr',fig:'Fig. 1 · same evidence, three choices; four bills',cam:full.cam,bounds:full.bounds,aspect:.7,draw,dur:1300,hold:4800,
    // the bill moves in on the four walls; every other step shows the three arms and the agent
    view:k=>k===4?{cam:[-.34,.55],bounds:[[-3.6,0,-1.9],[4.3,3.2,2.5]]}:full});
})();
