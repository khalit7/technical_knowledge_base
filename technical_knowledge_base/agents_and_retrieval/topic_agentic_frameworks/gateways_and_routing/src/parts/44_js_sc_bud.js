// ---- Scene: Fig. 5, twenty simultaneous calls against a $0.0004 key budget under three admission policies (renderer v2).
// Accepted and refused calls per wave and the final spends are FGW.e5 (LiteLLM 1.104.0 proxy, recorded); the reservation sizes
// ($0.082 without max_tokens, $0.000095 with max_tokens 16) are the proxy's estimates quoted in section 6. ----
(function(){
  if(!document.getElementById('stg-bud'))return;const {lerp,mix}=S3;const F=window.FGW;if(!F)return;
  const B=F.e5.budget,PC=F.e5.per_call,MODES={old:'noreserve_no_max_tokens',nomax:'no_max_tokens',max16:'max_tokens_16'};
  const RSV={old:0,nomax:0.082,max16:0.000095};
  let mode='nomax';
  const HB=.8,hv=v=>HB*v/B,TX=0,PX=2.9,GX=-4.4;
  const tile=i=>[GX+(i%5)*.42,-.85+Math.floor(i/5)*.56];
  function draw(R,k,e){const P=R.P,w=F.e5.waves[MODES[mode]].r,wave=k>=3?2:1,rs=w.filter(x=>x[0]===wave),acc=rs.map(x=>x[3]===200),na=acc.filter(Boolean).length;
    const a1=w.filter(x=>x[0]===1&&x[3]===200).length,a2=w.filter(x=>x[0]===2&&x[3]===200).length;R.grid(-5.4,4.2,-2.4,2.4,.5);
    // the wave: 20 tiles, grey on arrival, then green (accepted) or red (422)
    const dec=k===1||k===3?e:k>=1?1:0;
    rs.forEach((x,i)=>{const [tx,tz]=tile(i),c=dec<=0?P.paper:mix(P.paper,acc[i]?P.good:P.bad,.6*dec);R.box([tx,0,tz],[.32,.18,.4],{fill:c,a:acc[i]||dec<1?1:.55,lw:.6})});
    R.label([GX+.84,.2,-1.35],'wave '+wave+': 20 calls at once',{fs:12.5,b:1,dy:-12});
    if(k===0||k===3)R.flowArc([GX+1.9,.25,-.3],[TX-.5,.35,0],.3,{c:P.acc,a:.8,r:.05,n:6});
    if(dec>0)R.label([GX+.84,0,1.0],na+' accepted · '+(20-na)+' refused (422)',{fs:12.5,b:1,c:na?P.good:P.bad,dy:18,a:dec});
    // the budget: a glass tank as tall as $0.0004; spent is blue, reserved is orange
    const spent=k<=1?0:k===2?a1*PC*e:k===3?a1*PC:(a1+a2)*PC;
    let rsv=0;if(mode!=='old'){if(k===1)rsv=Math.min(B,a1*RSV[mode]);else if(k===2)rsv=Math.min(B,a1*RSV[mode])*(1-e);else if(k===3)rsv=a2?B-a1*PC:0;}
    R.box([TX,0,0],[1.1,.06,1.1],{});
    if(spent>0)R.box([TX,.06,0],[.8,hv(spent),.8],{fill:mix(P.paper,P.c1,.55),shadow:false,lw:.6});
    if(rsv>0)R.box([TX,.06+hv(spent),0],[.8,hv(rsv),.8],{fill:mix(P.paper,P.c2,.5),shadow:false,lw:.6,fa:.9});
    // without max_tokens the first call asks for 205 budgets' worth: a tall ghost that shrinks to fit
    if(mode==='nomax'&&k===1){const H=lerp(3.2,hv(B),Math.min(1,e*1.3));R.box([TX,.06,0],[.8,H,.8],{fill:mix(P.paper,P.c2,.3),fa:.25,ea:.4,shadow:false});
      R.label([TX+.45,2.6,0],'$0.082 wanted: 205 budgets',{al:'left',dx:8,fs:12.5,b:1,c:P.c2,a:1-Math.min(1,e*1.2)*.6})}
    if(mode==='max16'&&k===1)for(let i=1;i<5;i++)R.line([[TX-.4,.06+hv(i*RSV.max16),.4],[TX+.4,.06+hv(i*RSV.max16),.4]],{c:P.c2,w:1.2,a:e});
    R.glass([TX-.5,.06,.5],[1,0,0],[0,HB,0],{c:P.c5,a:.8,nu:1,nv:5});R.line([[TX-.55,.06+HB,.52],[TX+.55,.06+HB,.52]],{c:P.bad,w:2});
    R.label([TX-.55,.06+HB,.5],'budget $'+B,{al:'right',dx:-8,fs:12.5,b:1,c:P.bad});
    const fmt=v=>'$'+(Math.round(v*1e6)/1e6).toString();
    R.label([TX,0,.6],(spent>0?'spent '+fmt(spent):'')+(rsv>0?(spent>0?' · ':'')+'reserved '+fmt(rsv):''),{dy:18,fs:12.5,mono:true,c:P.ink,a:spent+rsv>0?1:0});
    // the provider: accepted calls flow through to it
    R.box([PX,0,0],[.8,.6,.8],{fill:mix(P.paper,P.acc,.15)});R.label([PX,.6,0],'provider · 2 s a call',{fs:12.5,b:1,dy:-10,c:P.acc});
    if((k===1||k===3)&&na>0)R.flowArc([TX+.45,.5,0],[PX-.4,.45,0],.3,{c:P.good,a:.9,r:.035+.012*Math.min(na,10),n:Math.max(2,Math.min(12,na)),speed:1.3});
    if(k===4)R.label([TX,.06+Math.max(HB,hv(spent)),0],mode==='old'?'final $0.0016: four times over':'final '+fmt(F.e5.spend_later['fgw-'+MODES[mode]])+': never over',{fs:13.5,b:1,c:mode==='old'?P.bad:P.good,dy:-40})
  }
  const full={cam:[.15,.68],bounds:[[-5.0,0,-1.6],[3.6,1.6,1.6]]};
  const st=S3.stage({id:'stg-bud',list:'sx-bud-nomax',fig:'Fig. 5 · a $0.0004 key budget, twenty calls at once',cam:full.cam,bounds:full.bounds,aspect:.48,dur:1600,hold:4400,draw,
    // admission moves in on the tank; with reservation off the final spend needs the tall view
    view:k=>{const tall=(mode==='nomax'&&k===1)||(mode==='old'&&k>=2);return k===1||k===2?{cam:[.25,.55],bounds:[[-2.2,0,-1.2],[3.0,tall?3.4:1.5,1.2]]}:tall?{cam:[.3,.6],bounds:[[-5.0,0,-1.6],[3.6,3.4,1.6]]}:full}});
  RD.seg(document.getElementById('fgw-e5mode'),m=>{mode=m;['old','nomax','max16'].forEach(x=>document.getElementById('sx-bud-'+x).hidden=x!==m);st.list('sx-bud-'+m)});
})();
