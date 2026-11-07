// ---- Scene: the cache ladder as stacked plates (section 1; renderer v2). Sizes from this machine's sysctl output, latencies from ladder.cpp's
// run 1 (window.CB.ladder): 16 KB buffer (L1), 1 MB (L2), 512 MB random and address order (DRAM). Plate widths are log2(bytes), illustrative.
(function(){
  if(!document.getElementById('stg-mem')||!window.CB||!CB.ladder)return;const {at,off,cl,mix,lerp}=S3;
  const R0=CB.ladder.random[0].pts,S0=CB.ladder.seq[0].pts,lat=(pts,kb)=>(pts.find(p=>p[0]===kb)||[0,NaN])[1],f=v=>v.toFixed(2);
  const sy=k=>{const m=String(CB.sysctl||'').match(new RegExp(k.replace(/\./g,'\\.')+':\\s*(\\d+)'));return m?+m[1]:NaN};
  const by=b=>b>=1<<30?(b/(1<<30))+' GB':b>=1<<20?(b/(1<<20))+' MB':(b/1024)+' KB';
  const L1=sy('hw.perflevel0.l1dcachesize'),L2=sy('hw.perflevel0.l2cachesize'),MEM=sy('hw.memsize'),REG=31*8+32*16;
  const W=b=>Math.max(.9,(Math.log2(b)-7)*.3);
  // levels bottom to top: y of the plate, width, label, colour key
  const LV=[{n:'DRAM · '+by(MEM),y:0,w:W(MEM),c:'c4'},{n:'SLC · size unpublished',y:1.3,w:6.0,c:'c5'},
    {n:'L2 · '+by(L2),y:2.5,w:W(L2),c:'c1'},{n:'L1 · '+by(L1),y:3.6,w:W(L1),c:'c3'},{n:'registers',y:4.6,w:W(REG),c:'c2'}];
  const D=1.5,LN=[.46,.12,.3];             // plate depth; a 128-byte line drawn as a small box
  const tL1=lat(R0,16),tL2=lat(R0,1024),tDR=lat(R0,524288),tSQ=lat(S0,524288);
  function plate(R,l,a,i){const P=R.P,c=P[l.c];
    if(i===0){R.box([0,0,0],[l.w,.28,D],{fill:mix(P.paper,c,.18),a,lw:.9});return}
    if(i===4){R.box([0,l.y,0],[l.w,.32,D*.6],{fill:mix(P.paper,c,.35),a,shadow:false});return}
    R.glass([-l.w/2,l.y,-D/2],[l.w,0,0],[0,0,D],{c,a,nu:Math.max(2,Math.round(l.w*1.6)),nv:3,th:.06});
    [-1,1].forEach(sx=>[-1,1].forEach(sz=>R.line([[sx*l.w/2*.96,0,sz*D/2*.9],[sx*l.w/2*.96,l.y,sz*D/2*.9]],{c:P.line,w:1,a:a*.5})))}
  const top=i=>LV[i].y+(i===0?.28:.06);
  // a line travelling up from level `from` to L1 during e, then the value from L1 to the registers
  function trip(R,from,e,x0,o){const P=R.P,y0=top(from),y1=top(3),u=cl(e/.75,0,1),v=cl((e-.75)/.25,0,1),x=x0*(1-u);
    const path=[[x0,y0+.06,0],[x0*.5,(y0+y1)/2,0],[0,y1+.06,0]];R.flow(path,{c:P.c2,a:o.a*(1-v*.6),r:.06,n:o.n||9,speed:1.6});
    if(u<1)R.box([x,lerp(y0,y1,u),0],LN,{fill:mix(P.paper,P.c2,.55),a:o.a,shadow:false});
    else{R.box([0,y1,0],LN,{fill:mix(P.paper,P.c2,.55),a:o.a,shadow:false});R.flow([[0,y1+.12,0],[0,top(4)+.02,0]],{c:P.c2,a:o.a,r:.06,n:4,speed:1});R.ball([0,lerp(y1+.12,top(4)+.34,v),0],.07,{c:P.c2,a:o.a})}}
  function lab(R,i,t,o){const l=LV[i];R.label([l.w/2,top(i),0],t,Object.assign({al:'left',dx:10,mono:true,fs:12.5,b:1},o))}
  function draw(R,k,e){const P=R.P;R.grid(-5,5,-2.2,2.2,.5);
    // which levels are about this step; the rest recede
    const on=[[0,1,2,3,4],[3,4],[2,3,4],[0,1,2,3,4],[0,1,2,3,4],[0,1,2,3,4]][k];
    LV.forEach((l,i)=>{const a=on.includes(i)?1:.22;plate(R,l,a,i);
      R.label([-l.w/2,top(i),0],l.n,{al:'right',dx:-10,fs:12.5,b:on.includes(i)&&k>0,c:P[l.c],a:Math.max(.45,a),grp:'lv'})});
    if(k===0){LV.forEach((l,i)=>{if(i<4)R.flow([[l.w*.18,top(i)+.05,.3],[l.w*.18*.4,top(i+1)-.02,.3]],{c:P.c2,a:.35*e,r:.045,n:3,speed:.6})})}
    if(k===1){trip(R,3,.75+.25*e,0,{a:1});lab(R,3,f(tL1)+' ns · 3 cycles',{c:P.c3,a:e})}
    if(k===2){trip(R,2,e,1.4,{a:1});lab(R,2,f(tL2)+' ns',{c:P.c1,a:cl(e*2,0,1)})}
    if(k===3){trip(R,0,e,2.2,{a:1,n:14});lab(R,0,f(tDR)+' ns · random order',{c:P.bad,a:cl(e*2,0,1)})}
    // the chase: nodes scattered over DRAM, visited in the list's order, one trip at a time
    const NODES=[[-3.2,.45],[2.6,-.5],[-.9,.55],[3.5,.35],[-2.2,-.45],[1.1,.15]];
    if(k===4){const a=1,j=Math.min(NODES.length-1,Math.floor(e*NODES.length*.999)),ej=e*NODES.length-j;
      NODES.forEach(([x,z],i)=>{R.box([x,.28,z],[.34,.1,.3],{fill:i<=j?mix(P.paper,P.c2,.6):P.paper,a,shadow:false});
        if(i>0&&i<=j+1)R.arc([NODES[i-1][0],.4,NODES[i-1][1]],[x,.4,z],.35,{c:P.c2,w:1.6,head:6,a:i<=j?.9:.35*ej,top:1})});
      const [x,z]=NODES[j],y1=top(3);R.flow([[x,.42,z],[x*.5,(top(0)+y1)/2,z*.5],[0,y1+.06,0]],{c:P.c2,r:.06,n:10,speed:1.6});
      R.box([lerp(x,0,cl(ej,0,1)),lerp(.4,y1,cl(ej,0,1)),lerp(z,0,cl(ej,0,1))],LN,{fill:mix(P.paper,P.c2,.55),shadow:false});
      lab(R,0,f(tDR)+' ns per hop',{c:P.bad})}
    // address order: neighbouring lines, several in flight because the prefetcher asks ahead
    if(k===5){for(let i=0;i<8;i++){const x=-2.8+i*.8,lit=i<2+Math.floor(e*6);R.box([x,.28,.45],[.7,.1,.3],{fill:lit?mix(P.paper,P.c3,.55):P.paper,shadow:false})}
      for(let i=0;i<4;i++){const x=-2.8+(1+i+Math.floor(e*5))*.8;if(x>2.9)continue;R.flow([[x,.42,.45],[x*.5,(top(0)+top(3))/2,.2],[0,top(3)+.06,0]],{c:P.c3,r:.055,n:8,speed:1.3+.2*i,a:.85})}
      R.label([0,.28,.9],'prefetcher: next lines requested before they are needed',{fs:12.5,dy:16,c:P.c3,b:1,wide:1});
      lab(R,0,f(tSQ)+' ns per load',{c:P.c3})}
  }
  const full={cam:[.2,.3],bounds:[[-4.2,0,-.8],[4.2,5,.8]]};
  S3.stage({id:'stg-mem',list:'sx-mem',fig:'the memory ladder of one M1 Pro core',cam:full.cam,bounds:full.bounds,aspect:.6,dur:1400,hold:4800,draw,
    view:k=>k===1?{cam:[.2,.26],bounds:[[-2.6,3.3,-.8],[2.6,5.1,.8]]}:k===2?{cam:[.2,.28],bounds:[[-3.2,2.2,-.8],[3.2,5.1,.8]]}:full,
    margin:w=>w<520?[14,10,14,10]:[14,118,10,128]});
})();
