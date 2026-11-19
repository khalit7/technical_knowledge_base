// ---- Fig. 5 (hvCard): Heavy, parallel attempts instead of one longer chain, flat (2026-11-19: was a 3D stage, agents as lanes in depth; a Gantt chart reads
// the same lanes and times without perspective). One row per agent, the leader's row, the same tokens as one chain below; time runs left to right.
// One block = 1,000 tokens = one unit of time (decoding at one token per unit). The agent counts (4 for low and medium effort, 16 for high and xhigh)
// and the billing rule are xAI's multi-agent docs; the 8,000 tokens per attempt and 2,000 for the leader are illustrative (window.XHV). ----
window.XHVS=(function(){if(!window.XHV)return null;const {A,S,N}=XHV;
  return N.map(n=>({n,billed:(n*A+S)*1000,par:A+S,ser:n*A+S,ratio:(n*A+S)/(A+S)}))})();
(function(){
  // flat SVG helpers (2026-11-19): rect, text, line, arrow, eased marks (class rd-new eases in on a forward step)
  const fx=v=>(+v).toFixed(1),MONO='ui-monospace,SFMono-Regular,Menlo,monospace';
  const rect=(x,y,w,h,o)=>{o=o||{};return '<rect'+(o.cl?' class="'+o.cl+'"':'')+' x="'+fx(x)+'" y="'+fx(y)+'" width="'+fx(Math.max(0,w))+'" height="'+fx(Math.max(0,h))+'" rx="'+(o.r==null?5:o.r)+'" fill="'+(o.fill||'none')+'"'+(o.fo!=null?' fill-opacity="'+o.fo+'"':'')+(o.s?' stroke="'+o.s+'" stroke-width="'+(o.sw||1.2)+'"':'')+(o.da?' stroke-dasharray="'+o.da+'"':'')+(o.op!=null?' opacity="'+o.op+'"':'')+'/>'};
  const text=(x,y,s,o)=>{o=o||{};return '<text'+(o.cl?' class="'+o.cl+'"':'')+' x="'+fx(x)+'" y="'+fx(y)+'" font-size="'+(o.fs||12)+'"'+(o.a?' text-anchor="'+o.a+'"':'')+' fill="'+(o.c||'var(--ink)')+'"'+(o.w?' font-weight="'+o.w+'"':'')+(o.mono?' font-family="'+MONO+'"':'')+(o.op!=null?' opacity="'+o.op+'"':'')+'>'+s+'</text>'};
  const line=(x1,y1,x2,y2,o)=>{o=o||{};return '<line'+(o.cl?' class="'+o.cl+'"':'')+' x1="'+fx(x1)+'" y1="'+fx(y1)+'" x2="'+fx(x2)+'" y2="'+fx(y2)+'" stroke="'+(o.c||'var(--line)')+'" stroke-width="'+(o.sw||1.2)+'"'+(o.da?' stroke-dasharray="'+o.da+'"':'')+(o.op!=null?' opacity="'+o.op+'"':'')+'/>'};
  const arrow=(x1,y1,x2,y2,o)=>{o=o||{};const a=Math.atan2(y2-y1,x2-x1),h=o.h||7,c=o.c||'var(--ink)';
    const p=[[x2,y2],[x2-h*Math.cos(a-.42),y2-h*Math.sin(a-.42)],[x2-h*Math.cos(a+.42),y2-h*Math.sin(a+.42)]].map(q=>fx(q[0])+','+fx(q[1])).join(' ');
    return '<g'+(o.cl?' class="'+o.cl+'"':'')+(o.op!=null?' opacity="'+o.op+'"':'')+'>'+line(x1,y1,x2-(h*.6)*Math.cos(a),y2-(h*.6)*Math.sin(a),{c,sw:o.sw||1.6,da:o.da})+'<polygon points="'+p+'" fill="'+c+'"/></g>'};
  const grp=(s,o)=>{o=o||{};return '<g'+(o.cl?' class="'+o.cl+'"':'')+(o.op!=null&&o.op<1?' opacity="'+o.op+'"':'')+'>'+s+'</g>'};
  const card=document.getElementById('hvCard');if(!card||!window.XHV)return;const {A,S}=XHV,H=XHVS;
  const fmt=n=>n.toLocaleString('en-US');
  // one row per agent, the leader's row, then the same tokens as one chain; one block = 1,000 tokens = one unit of time
  function draw(k){const el=document.getElementById('hvSvg'),W=RD.width(el),ph=W<520,n=k===4?16:4,h=H[k===4?1:0],T=k===4?130:34;
    const LW=ph?62:78,X0=LW,X1=W-(ph?8:12),U=(X1-X0)/T,x=u=>X0+u*U,rh=k===4?(ph?9:11):(ph?18:22),gap=k===4?3:6,top=8;let s='',y=top;
    const blk=(u,yy,c,on,nw)=>rect(x(u)+.6,yy,Math.max(1,U-1.2),rh,on?{fill:c,fo:.8,r:1.5,cl:nw?'rd-new':''}:{fill:'none',s:'var(--line)',sw:1,da:'2 2',r:1.5,op:.7});
    const lab=(t,yy,c,b)=>text(LW-6,yy+rh/2+4,t,{a:'end',fs:12,c,w:b?600:null});
    // the agents
    const rowsY=[];for(let j=0;j<n;j++){rowsY.push(y);
      if(k<4||j%4===0||j===n-1)s+=lab(k===4?(j+1)+'':(ph?'agent ':'agent ')+(j+1),y,'var(--c1)');
      for(let u=0;u<A;u++)s+=blk(u,y,'var(--c1)',k>=1,k===1||k===4);y+=rh+gap}
    if(k===4)s+=text(4,rowsY[7]+rh,'16 agents',{fs:12,c:'var(--c1)',w:600});
    // the query fans out to every agent
    if(k===0||k===4){const qx=X0-3,qy=(rowsY[0]+rowsY[n-1]+rh)/2;s+='<circle cx="'+fx(qx)+'" cy="'+fx(qy)+'" r="4" fill="var(--ink)"/>';}
    // the leader
    const ly=y+2;s+=lab('leader',ly,'var(--c2)',1);for(let u=0;u<S;u++)s+=blk(A+u,ly,'var(--c2)',k>=2,k===2||k===4);
    for(let j=0;j<n&&k>=2;j++)s+=line(x(A),rowsY[j]+rh/2,x(A)+U*.5,ly,{c:'var(--c2)',sw:1,op:.45});
    y=ly+rh+gap;
    if(k>=2){const ax=x(A+S)+6;s+='<circle class="rd-new" cx="'+fx(ax)+'" cy="'+fx(ly+rh/2)+'" r="5" fill="var(--c2)"/>';
      const t=ph?'answer at '+h.par:'answer · '+fmt(h.billed)+' tokens billed · done at '+h.par+' units';const tw=t.length*6.6;
      const tx0=ax+10+tw<W?ax+10:Math.max(4,ax-10-tw);s+=text(tx0,ly-4,t,{fs:12,mono:1,w:600,c:'var(--c2)',cl:k===2?'rd-new':''})}
    if(k===1){const t=fmt(4*A*1000)+' tokens in '+A+' units';s+=text(x(A)+8,rowsY[1]+rh,t,{fs:12,mono:1,w:600,c:'var(--c1)',cl:'rd-new'})}
    // the same tokens as one chain: each block waits for the one before it
    y+=k===4?10:14;const cy=y;s+=line(X0,cy-7,X1,cy-7,{c:'var(--line)',da:'3 3'});
    s+=lab('one chain',cy,'var(--ink)',1);
    for(let u=0;u<h.ser;u++)s+=blk(u,cy,u<h.ser-S?'var(--c1)':'var(--c2)',k>=3,k===3||k===4);
    if(k>=3){const t=ph?h.ser+' units · '+(k===4?h.ratio:h.ratio.toFixed(1))+'×':(k===4?'the same '+fmt(h.billed)+' tokens':fmt(h.billed)+' tokens')+' · '+h.ser+' units · '+(k===4?h.ratio:h.ratio.toFixed(1))+'× the wait';
      s+=text(Math.min(x(h.ser),X1),cy+rh+16,t,{a:'end',fs:12,mono:1,w:600,c:'var(--ink)',cl:'rd-new'});y=cy+rh+22}else y=cy+rh+22;
    // the time axis: units of time (one unit decodes 1,000 tokens)
    y+=4;s+=line(X0,y,X1,y,{c:'var(--mute)'});
    const ticks=k===4?(ph?[0,10,130]:[0,10,50,100,130]):(ph?[0,10,34]:[0,8,10,20,34]);
    ticks.forEach((v,i)=>{s+=line(x(v),y,x(v),y+4,{c:'var(--mute)'})+text(x(v),y+17,i===ticks.length-1?v+' units':String(v),{a:i===ticks.length-1?'end':'middle',fs:11.5,mono:1,c:'var(--mute)'})});
    if(k>=2)s+=line(x(h.par),top,x(h.par),y,{c:'var(--c2)',da:'4 3',op:.6});
    el.innerHTML=RD.svg(W,y+24,s,'Heavy: '+n+' parallel agents and a leader against one chain of the same tokens');
    document.getElementById('hvCnt').innerHTML=RD.stat(n+' agents: tokens billed',fmt(h.billed))+RD.stat('Done at',(k>=2?h.par:'...')+' units','parallel')+RD.stat('One chain',k>=3?h.ser+' units':'...',k>=3?(k===4?h.ratio:h.ratio.toFixed(1))+'× the wait':'')}
  const an=RD.anim({card:'hvCard',ctl:'hvCtl',n:5,ms:4800,draw,label:'Heavy step',list:'sx-hv'});
  RD.onResize(()=>an.redraw());
})();
