// ---- Scene, Fig. 1 (top): every copy one chat request can hit, as two towers, outermost on top (renderer v2) ----
// Web lane: browser, CDN edge, in-process dict, Redis, Postgres buffers, OS page cache, then the SSD that holds the source of truth.
// LLM lane: semantic cache, provider prompt cache, GPU KV cache, then the model. Hit times from window.CA (measured here) or the ladder's sources (section 2).
// A request falls down a tower until a copy holds the answer; flows show it going down and the answer coming back up.
(function(){
  if(!document.getElementById('stg-hero')||!window.CA)return;const {at,off,lerp,mix}=S3;
  const L=CA.layers,PG=CA.pg,SM=CA.sem;
  const ms=v=>v<0.001?(v*1e6).toFixed(0)+' ns':v<1?v.toFixed(3)+' ms':v.toFixed(1)+' ms';
  // [name, short name for phones, hit time, kind: you | sys | src | wrong | exact]
  const WEB=[['Browser cache','browser','0 network','you'],['CDN edge','CDN','about 20 ms','you'],['In-process dict','dict',ms(L.dict_ns*1e-6),'you'],
    ['Redis or Valkey','Redis',ms(PG.costs.redis_get.median_ms),'you'],['Postgres buffers','PG buffers',ms(PG.warm.second_pass.ms_per_lookup),'sys'],
    ['OS page cache','page cache',L.pagecache_us.toFixed(2)+' µs','sys'],['SSD: the source','SSD','102 µs','src']];
  const LLM=[['Semantic cache','semantic','embed '+SM.mini.ms_per_query_single.toFixed(1)+' ms','wrong'],['Provider prompt cache','prompt','reads billed 0.1×','exact'],
    ['GPU KV cache','KV','skips prefill','exact'],['The model: the source','model','full prefill','src']];
  const XW=-1.9,XL=1.9,SW=2.1,SD=1.1,TH=.24,GAP=.2,lv=(i,n)=>(n-1-i)*(TH+GAP),ZF=SD/2+.18,HIT=3; // HIT: Redis
  const topW=lv(0,7)+TH+.7,topL=lv(0,4)+TH+.7;
  function tower(R,arr,x,k,e,lane){const P=R.P,n=arr.length,phone=R.W<520;
    arr.forEach((r,i)=>{const y=lv(i,n);let fill=mix(P.paper,P.line,.25),a=1,ea;
      if(lane==='web'){
        if(k===2&&i>HIT)a=1-.75*e;else if(k===3&&i>HIT)a=r[3]==='src'?.35:.25+.75*e;
        if(k===3){fill=r[3]==='you'?mix(P.paper,P.acc,.35*e):r[3]==='sys'?mix(P.paper,P.line,.6):fill}
        if(k>=4){a=.28;if(r[3]==='you')fill=mix(P.paper,P.acc,.35)}
        if(k===2&&i===HIT)fill=mix(P.paper,P.good,.45*e)}
      else{if(k===5)fill=r[3]==='wrong'?mix(P.paper,P.bad,.5*e):r[3]==='exact'?mix(P.paper,P.good,.35*e):fill}
      if(r[3]==='src')fill=mix(P.paper,P.mute,.3);
      R.box([x,y,0],[SW,TH,SD],{fill,a,shadow:i===n-1,lw:.8,ea});
      const nc=lane==='web'&&k===3&&r[3]==='you'?P.acc:lane==='llm'&&k===5&&r[3]==='wrong'?P.bad:P.ink;
      R.label([x,y+TH/2,SD/2],phone?r[1]:r[0],{fs:12.5,b:1,c:nc,a:Math.max(.35,a)});
      // the hit time on the outer side of each tower (side labels: wide screens only; the step list names them on a phone)
      const t5=lane==='llm'&&k===5&&r[3]!=='src'?(r[3]==='wrong'?' · can be wrong':' · exact'):'';
      R.label([x+(lane==='web'?-SW/2:SW/2),y+TH/2,0],r[2]+t5,{al:lane==='web'?'right':'left',dx:lane==='web'?-16:16,mono:true,fs:12,grp:lane,b:!!t5,
        c:t5?(r[3]==='wrong'?P.bad:P.good):r[3]==='wrong'?P.bad:P.mute,a:Math.max(.35,a)})})}
  function down(x,to,n){const pts=[];for(let i=0;i<=to;i++)pts.push([x-.35,lv(i,n)+TH/2,ZF]);return [[x-.35,lv(0,n)+TH+.6,ZF],...pts]}
  function up(x,from,n){const pts=[];for(let i=from;i>=0;i--)pts.push([x+.35,lv(i,n)+TH/2,ZF]);pts.push([x+.35,lv(0,n)+TH+.6,ZF]);return pts}
  function draw(R,k,e){const P=R.P;R.grid(-4,4,-1.8,1.8,.5);
    const wa=k<4?1:.6,la=k<4?0:at(k,e,4);
    tower(R,WEB,XW,k,e,'web');if(la>0)tower(R,LLM,XL,k,e,'llm');
    // the request, above each tower
    R.ball([XW,topW,0],.13,{c:P.acc,a:wa});R.label([XW,topW+.2,0],'request',{fs:12,c:P.mute,dy:-10,a:wa});
    if(la>.2){R.ball([XL,topL,0],.13,{c:P.c4,a:la});R.label([XL,topL+.2,0],'prompt',{fs:12,c:P.mute,dy:-10,a:la})}
    // 2. a miss falls through to the SSD, and the answer comes back up, leaving copies on the way
    if(k===1){R.flow(down(XW,6,7),{c:P.acc,a:Math.min(1,e*1.5),r:.07,speed:1.4});R.flow(up(XW,6,7),{c:P.good,a:Math.min(1,e*1.5),r:.07,speed:1.4});
      R.label([XW+SW/2,lv(6,7),0],'answered by the source',{al:'left',dx:10,fs:12,b:1,c:P.good,a:e,wide:1})}
    // 3. a hit in Redis: nothing below is touched
    if(k===2){R.flow(down(XW,HIT,7),{c:P.acc,a:Math.min(1,e*1.5),r:.07,speed:1.4});R.flow(up(XW,HIT,7),{c:P.good,a:Math.min(1,e*1.5),r:.07,speed:1.4});
      R.glow([XW,lv(HIT,7)+TH/2,ZF],.5,{c:P.good,a:e*.7});R.label([XW+SW/2,lv(HIT,7)+TH/2,0],'hit: stops here',{al:'left',dx:10,fs:12,b:1,c:P.good,a:e,wide:1})}
    // 4. who invalidates: the top four are yours
    if(k===3){const y0=lv(3,7),y1=lv(0,7)+TH,xb=XW+SW/2+.25;R.line([[xb,y0,0],[xb,y1,0]],{c:P.acc,w:3,a:e});
      R.label([xb,(y0+y1)/2,0],'you invalidate these',{al:'left',dx:8,fs:12.5,b:1,c:P.acc,a:e});
      R.line([[xb,lv(5,7),0],[xb,lv(4,7)+TH,0]],{c:P.mute,w:3,a:e});R.label([xb,(lv(5,7)+lv(4,7)+TH)/2,0],'kept correct for you',{al:'left',dx:8,fs:12,c:P.mute,a:e})}
    // 5. the LLM lane: a miss runs the full prefill
    if(k===4){R.flow(down(XL,3,4),{c:P.c4,a:e,r:.07,speed:1.4});R.flow(up(XL,3,4),{c:P.good,a:e,r:.07,speed:1.4})}
    if(k===5)R.glow([XL,lv(0,4)+TH/2,ZF],.6,{c:P.bad,a:e*.6});
  }
  const full={cam:[.3,.34],bounds:[[-3,0,-.6],[3,3.9,.8]]};
  const web={cam:[.4,.32],bounds:[[XW-1.3,0,-.7],[XW+1.6,3.9,.9]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · every copy one chat request can hit',cam:full.cam,bounds:full.bounds,aspect:.68,dur:1400,hold:4800,draw,
    margin:w=>w<520?[16,8,14,8]:[18,205,16,150],
    // steps 1 to 4 move in close on the web lane; 5 and 6 show both lanes
    view:k=>k<=3?web:full});
})();
