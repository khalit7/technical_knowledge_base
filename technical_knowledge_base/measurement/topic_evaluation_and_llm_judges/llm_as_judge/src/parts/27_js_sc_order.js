// ---- Scene: Fig. 2, position bias (stg-order, renderer v2) ----
// GPT-4's MT-Bench leaderboard run (gpt-4_pair.jsonl) kept each order's verdict for the 4 pairs against GPT-3.5-turbo (fields 8 and 9 of window.MTB keys).
// Steps: one comparison (question 97, turn 1, GPT-4 against GPT-3.5-turbo) judged with GPT-4 in slot A; the same pair swapped, the verdict
// following the slot; all 532 comparisons as tiles, the ones whose verdict changed with the order raised and coloured by how; kappa with the
// 1,117 human votes for one order and both, and the judge's tie rate (LJ.agree, protocols F, B and FB). Numbers for check_stages.mjs: window.LJS.order.
(function(){
  if(!document.getElementById('stg-order')||!window.S3||!window.LJ)return;const {at,off,mix,lerp}=S3,L=window.LJ;
  const KI=L.K.findIndex(k=>k[0]===97&&k[1]===1&&k[2]===0&&k[3]===2),K=L.K[KI];
  const G=L.K.filter(k=>k[8]>=0&&k[9]>=0);
  // kind of each comparison: 0 same verdict both orders, 1 first-shown answer won both times, 2 second-shown won both times, 3 a tie in one order
  const kind=G.map(k=>k[8]===k[9]?0:(k[8]===2||k[9]===2)?3:(k[8]===0&&k[9]===1)?1:2);
  const cnt=[0,1,2,3].map(c=>kind.filter(x=>x===c).length);
  const F=L.agree('F',{scope:'g35'}),B=L.agree('B',{scope:'g35'}),FB=L.agree('FB',{scope:'g35'});
  const pc=x=>(100*x).toFixed(1)+'%';
  window.LJS=window.LJS||{};LJS.order={n:String(G.length),same:String(cnt[0]),pct:pc(cnt[0]/G.length),ch:String(G.length-cnt[0]),first:String(cnt[1]),second:String(cnt[2]),tie:String(cnt[3]),
    votes:F.n.toLocaleString('en-US'),kF:F.kappa.toFixed(3),kB:B.kappa.toFixed(3),kFB:FB.kappa.toFixed(3),tF:pc(F.ties),tFB:pc(FB.ties),ex:[K[8],K[9]]};
  const NM=[L.nm(K[2]),L.nm(K[3])];
  const COLS=28,SP=.19,FX=-1.1,FZ=-1.25,XA=-2.6,XB=-1.45,ZS=1.9,XP=-.2,XO=1.3;
  const tile=i=>[FX+((i%COLS)-(COLS-1)/2)*SP,0,FZ+(Math.floor(i/COLS)-(Math.ceil(G.length/COLS)-1)/2)*SP];
  function kcol(P,c){return c===1?P.c2:c===2?P.c4:P.c5}
  function draw(R,k,e){const P=R.P;R.grid(-4.6,6.6,-3.4,3,.5);
    // the front: two slots, two answers, the judge, the verdict
    const fa=k<=1?1:k===2?lerp(1,0,Math.min(1,e*1.6)):0,mi=[mix(P.paper,P.c1,.55),mix(P.paper,P.c6,.55)];
    const sw=k===0?0:k===1?e:1;           // 0: GPT-4 in slot A; 1: swapped
    [XA,XB].forEach((x,s)=>{R.box([x,0,ZS],[1,.04,.8],{fill:P.soft,a:fa,shadow:false});if(k<=1)R.label([x,0,ZS+.42],'slot '+'AB'[s],{fs:12,dy:13,c:P.mute,b:1,a:fa})});
    [0,1].forEach(m=>{const x0=m?XB:XA,x1=m?XA:XB,x=lerp(x0,x1,sw),y=.04+Math.sin(Math.PI*sw)*.55*(m?1:.6);
      R.box([x,y,ZS],[.82,.5,.62],{fill:mi[m],a:fa,shadow:y<.06});if(k<=1)R.label([x,y+.5,ZS],NM[m],{fs:12.5,b:1,dy:-11,a:fa,grp:'slab'})});
    R.glass([XP,.06,ZS-.45],[0,0,.9],[0,.95,0],{c:P.acc,a:fa,nu:4,nv:4});if(k<=1)R.label([XP,1.01,ZS],'GPT-4 judge',{fs:12,dy:-10,c:P.acc,b:1});
    if(k<=1&&(k===0||e>.6)){R.flowArc([XA,.6,ZS],[XP,.55,ZS],.35,{c:P.acc,r:.06});R.flowArc([XB,.6,ZS],[XP,.45,ZS],.2,{c:P.acc,r:.06});R.flow([[XP,.5,ZS],[XO+.2,.3,ZS]],{c:P.acc,r:.06})}
    // the verdict chips: the judge picks slot A both times (K[8] = 0 with GPT-4 first; K[9] = 1, GPT-3.5-turbo, with it first)
    const win=k===0?(K[8]===0?0:1):(K[9]===1?0:1),wm=k===0?0:1;   // which chip, and which model sits in it
    ['A','tie','B'].forEach((t,c)=>{const lit=k<=1&&c===win*2&&(k===0||e>.6),h=.16+(lit?.36*(k===0?e:1):0);
      R.box([XO+.4+c*.75,0,ZS],[.5,h,.4],{fill:lit?mi[wm]:P.paper,a:fa});if(k<=1)R.label([XO+.4+c*.75,h,ZS],t,{fs:12.5,b:lit,dy:-10,c:lit?P.ink:P.mute})});
    if(k===0)R.label([XO+1.15,1.2,ZS],'A wins: '+NM[0],{fs:12.5,b:1,c:P.c1,a:e,dy:-6});
    if(k===1&&e>.6){const t=(e-.6)/.4;R.label([XO+1.15,1.2,ZS],'A wins: now '+NM[1],{fs:12.5,b:1,c:P.c6,a:t,dy:-6});R.label([XO+1.15,1.2,ZS],'both orders together: a tie',{fs:12,c:P.bad,b:1,a:t,dy:12})}
    // every comparison: one tile each; the ones whose verdict changed with the order rise and take a colour
    const ta=k<=1?0:k===2?Math.min(1,e*1.6):.32;
    if(ta>.01){G.forEach((g,i)=>{const p=tile(i),c=kind[i],rise=c&&k>=2?(k===2?e:1):0;
        R.box(p,[SP*.8,.05+.32*rise,SP*.8],{fill:c&&k>=2?mix(P.paper,kcol(P,c),.25+.6*rise):P.paper,a:ta,shadow:false,lw:.5})});
      if(k===2){R.flowArc([XP,.4,ZS-.4],[FX,.3,FZ+.6],.6,{c:P.acc,r:.06,a:.8});
        const lx=FX+COLS*SP/2+.15;[[1,'first-shown won both times'],[2,'second-shown won both times'],[3,'a tie in one order']].forEach(([c,t])=>R.label([lx,.2,FZ-.5+c*.45],cnt[c]+' · '+t,{al:'left',dx:6,fs:12,b:1,c:kcol(P,c),a:e,grp:'kinds'}));
        R.label([FX,0,FZ+2.0],cnt[0]+' of '+G.length+' (' +pc(cnt[0]/G.length)+') unchanged',{fs:12.5,b:1,dy:14,a:e})}}
    // what both orders buy (kappa with the human votes) and what they cost (judge ties)
    if(k===3){const X0=2.4,Hk=1.6/.35,Ht=1.6/.25,bars=[[F.kappa,'first',P.c1,Hk],[B.kappa,'second',P.c1,Hk],[FB.kappa,'both',P.good,Hk],[F.ties,'one order',P.mute,Ht],[FB.ties,'both',P.bad,Ht]];
      bars.forEach(([v,t,c,s],j)=>{const x=X0+j*.72+(j>=3?.5:0),h=Math.max(.02,v*s*e),big=j===2||j===4;R.box([x,0,FZ],[.36,h,.36],{fill:mix(P.paper,c,big?.75:.4)});
        R.label([x,h,FZ],j>=3?pc(v):v.toFixed(3),{fs:12,b:big,dy:-10,c:big?c:P.ink,a:e});R.label([x,0,FZ+.3],t,{fs:12,dy:12,c:P.mute,a:e})});
      R.label([X0+.72,2.1,FZ],'κ with humans',{fs:12.5,b:1,c:P.good,a:e});R.label([X0+3*.72+.5+.36,2.1,FZ],'judge ties',{fs:12.5,b:1,c:P.bad,a:e});
      R.flowArc([FX+1.5,.3,FZ],[X0+1,.6,FZ],.5,{c:P.acc,r:.05,a:.7})}
  }
  const full={cam:[.12,.62],bounds:[[-4,0,-3.2],[6.3,1.9,2.6]]};
  S3.stage({id:'stg-order',list:'sx-order',fig:'Fig. 2 · GPT-4 judging MT-Bench pairs in both orders',cam:full.cam,bounds:full.bounds,aspect:.68,dur:1500,hold:5200,draw,
    margin:w=>w<520?[14,10,14,10]:[16,14,16,14],
    view:k=>k<=1?{cam:[.1,.42],bounds:[[-3.3,0,1.2],[3.4,1.3,2.6]]}:k===2?{cam:[.1,.72],bounds:[[-3.9,0,-3.1],[4.6,.8,.9]]}:{cam:[.1,.55],bounds:[[-3.9,0,-3.1],[6.3,1.9,.9]]}});
})();
