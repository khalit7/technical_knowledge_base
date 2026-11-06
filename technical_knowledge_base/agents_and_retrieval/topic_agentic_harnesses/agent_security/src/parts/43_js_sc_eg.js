// ---- Scene: Fig. 4, a destination allow-list deciding seven requests (section 7, renderer v2). Driven by HSEC.egress, the verdicts of
// src/sec/egress_policy.decide() (a pure function, no network, no model): one lane per request, HTTPS through the proxy, name lookups through
// the resolver, both checking the same allow-list; a denied request stops at the glass. Steps (ol#sx-eg): the layout, the three listed
// HTTPS hosts, the two unlisted ones, the two lookups, the tally. ----
(function(){
  if(!document.getElementById('stg-eg'))return;const {at,mix}=S3;
  const eg=(window.HSEC&&HSEC.egress)||[];if(eg.length<7)return;
  const AX=-3.4,PX=-1.0,DX=2.0;
  const https=eg.map((r,i)=>i).filter(i=>eg[i].kind==='https'),dns=eg.map((r,i)=>i).filter(i=>eg[i].kind==='dns');
  const lane=i=>{const h=https.indexOf(i);return h>=0?-2.5+h*.68:1.25+dns.indexOf(i)*.68};
  const zH=[lane(https[0])-.35,lane(https[https.length-1])+.35],zD=[lane(dns[0])-.35,lane(dns[dns.length-1])+.35];
  // which step each request is decided in: listed HTTPS hosts, unlisted HTTPS hosts, then the lookups; everything again in the tally
  const stepOf=i=>eg[i].kind==='dns'?3:eg[i].verdict==='allow'?1:2,LAST=4;
  function draw(R,k,e){const P=R.P,nar=R.W<520;R.grid(-4.6,4.6,-3.2,2.6,.5);
    R.box([AX,0,-.4],[1.0,.75,2.6],{fill:mix(P.paper,P.c2,.25)});R.label([AX,.75,-.4],'any tool, any command',{fs:12.5,b:1,c:P.c2,dy:-12});
    // the proxy and the resolver: glass, default deny, one allow-list
    R.glass([PX,.02,zH[0]],[0,0,zH[1]-zH[0]],[0,1.0,0],{c:P.acc,a:k===3?.4:1,nu:5,nv:3});R.label([PX,1.0,zH[0]],'proxy · HTTPS',{fs:12.5,b:1,c:P.acc,dy:-10});
    R.glass([PX,.02,zD[0]],[0,0,zD[1]-zD[0]],[0,1.0,0],{c:P.acc,a:k===1||k===2?.4:1,nu:3,nv:3});R.label([PX,0,zD[1]],'resolver · DNS',{fs:12.5,b:1,c:P.acc,dy:16});
    if(k===0)R.label([PX,.5,(zH[1]+zD[0])/2],'one allow-list, default deny',{fs:12.5,b:1,c:P.acc,a:1});
    let na=0,nd=0;
    eg.forEach((r,i)=>{const z=lane(i),s=stepOf(i),ok=r.verdict==='allow',now=k===s,shown=k>=s,cur=now||k===LAST,a=now?e:k===LAST?.45:shown?.3:0;
      if(shown){if(ok)na++;else nd++}
      // the destination (a name for a lookup): green once allowed, faint when never reached
      R.box([DX,0,z],[.55,.32,.42],{fill:shown&&ok?mix(P.paper,P.good,.35):P.paper,a:shown?(ok?1:.45):k===0?.8:.5,shadow:false});
      R.label([DX+.35,.16,z],r.dest,{al:'left',dx:6,mono:true,fs:12,b:cur&&shown,c:shown?(ok?P.good:P.bad):P.mute,a:shown?(cur?1:.65):.8,grp:nar?undefined:'dst',wide:nar&&!now?1:0});
      if(a<=.01)return;
      const p0=[AX+.55,.4,-.4+(z+.4)*.4],p1=[PX-.06,.4,z];
      R.flow([p0,p1],{c:P.c2,r:.055,n:5,speed:1.2,a});
      if(ok)R.flow([[PX+.06,.4,z],[DX-.32,.3,z]],{c:P.good,r:.055,n:5,speed:1.2,a});
      else R.glow(p1,.28,{c:P.bad,a})});
    if(k===LAST)R.label([AX,.75,-.4],na+' allowed · '+nd+' denied',{fs:13.5,b:1,dy:-34,c:P.ink})
  }
  const full={cam:[.42,.78],bounds:[[-4.1,0,-3.0],[4.4,1.0,2.4]]};
  S3.stage({id:'stg-eg',list:'sx-eg',fig:'Fig. 4 · seven requests, one allow-list',cam:full.cam,bounds:full.bounds,aspect:.66,dur:1500,hold:5200,draw,
    margin:w=>w<520?[22,10,14,10]:[30,16,16,16]});
})();
