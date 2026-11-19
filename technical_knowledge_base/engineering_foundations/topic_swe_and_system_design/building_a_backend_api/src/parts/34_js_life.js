// ---- Fig. 2 (rd-life-card): one recorded request, GET /trace on exp_app.py, through every stage in the order it ran, flat (2026-11-19: was a 3D stage
// of plates in a row; a pipeline reads the same flat). The order numbers come from API_DATA.runs.trace.order (logged by the app itself, run_experiments.py,
// 2026-10-24); router and validation are not logged and carry no number. Under the figure, the artefact of each step: the ASGI scope, the log lines, the code that ran. ----
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
  const card=document.getElementById('rd-life-card');if(!card||!window.API_DATA)return;
  const D=window.API_DATA,T=D.runs.trace,O=T.order,esc=RD.esc;
  const pos=s=>O.findIndex(o=>o.startsWith(s))+1;   // 1-based position of a logged event
  const N={mw2in:pos('middleware added second: enter'),mw1in:pos('middleware added first: enter'),dep:pos('dependency'),h:pos('handler'),
    mw1out:pos('middleware added first: exit'),mw2out:pos('middleware added second: exit')};
  window.BA_LIFE=N;   // read by src/check_stages.mjs
  const ord=n=>['1st','2nd','3rd','4th','5th','6th'][n-1];
  // the stages top to bottom in the order a request meets them; the request goes down the left, the response comes back up the right
  const ST=[['cl','client','var(--c2)'],['srv','uvicorn','var(--c2)'],['mw2','middleware added second','var(--c1)'],['mw1','middleware added first','var(--c1)'],
    ['route','router','var(--c6)'],['dep','dependency','var(--c5)'],['val','validation','var(--c3)'],['h','handler','var(--acc)']];
  const ON=[['cl','srv'],['mw2','mw1'],['route'],['dep'],['val'],['h'],['h','mw1','mw2','srv','cl']],STOP=[1,3,4,5,6,7,7];
  const NOTE=['ASGI scope built: method, path, headers; no body yet','both middlewares log their entry, outermost first','GET /trace → trace()','current_user → "'+T.user+'"','header read; no body','returns a dict → JSON','out innermost first, then uvicorn writes the bytes'];
  function draw(k){const el=document.getElementById('rd-life'),W=RD.width(el),ph=W<520;let s='';
    const bx=ph?26:40,bw=W-bx-(ph?26:40),bh=30,gap=10,y0=4,Y=i=>y0+i*(bh+gap),on=new Set(ON[k]);
    ST.forEach(([id,nm,c],i)=>{const isOn=on.has(id),done=i<=STOP[k],op=isOn?1:done?.55:.3;
      s+=grp(rect(bx,Y(i),bw,bh,{fill:c,fo:isOn?.22:.08,s:isOn?c:'var(--line)',sw:isOn?2:1.2,r:7})+text(bx+10,Y(i)+bh/2+4,nm,{fs:ph?12:12.5,w:isOn?700:500}),{op,cl:isOn&&k<6?'rd-new':''})});
    // the order each stage logged (router and validation do not log, so they carry no number)
    const tag=(i,t,c)=>{s+=text(bx+bw-10,Y(i)+bh/2+4,t,{a:'end',fs:12,mono:1,w:700,c,cl:'rd-new'})};
    if(k>=1&&k<6){tag(2,'in '+ord(N.mw2in),'var(--c1)');tag(3,'in '+ord(N.mw1in),'var(--c1)')}
    if(k>=3&&k<6)tag(5,ord(N.dep),'var(--c5)');
    if(k>=5)tag(7,ord(N.h),'var(--acc)');
    if(k===6){tag(3,'in '+ord(N.mw1in)+' · out '+ord(N.mw1out),'var(--c3)');tag(2,'in '+ord(N.mw2in)+' · out '+ord(N.mw2out),'var(--c3)');tag(5,ord(N.dep),'var(--c5)')}
    // the request travels down as far as this step's stage; the response comes back up on the last step
    const lx=bx-(ph?13:20),rx=bx+bw+(ph?13:20);
    s+=line(lx,Y(0)+bh/2,lx,Y(7)+bh/2,{c:'var(--line)',da:'3 4'});
    s+=grp(line(lx,Y(0)+bh/2,lx,Y(STOP[k])+bh/2,{c:'var(--c2)',sw:2.2})+arrow(lx,Y(STOP[k])+bh/2,bx-1,Y(STOP[k])+bh/2,{c:'var(--c2)',sw:2.2}),{op:k===6?.4:1});
    if(k===6)s+=grp(arrow(bx+bw+1,Y(7)+bh/2,rx,Y(7)+bh/2,{c:'var(--c3)',sw:2.2,h:1})+arrow(rx,Y(7)+bh/2,rx,Y(0)+bh/2+2,{c:'var(--c3)',sw:2.2})+arrow(rx,Y(0)+bh/2,bx+bw+2,Y(0)+bh/2,{c:'var(--c3)',sw:2.2}),{cl:'rd-new'});
    const yb=Y(8)+8;s+=text(bx,yb,esc(NOTE[k]),{fs:12.5,w:700,mono:k>=2&&k<=5?1:0,c:ST[STOP[k]][2],cl:'rd-new'});
    el.innerHTML=RD.svg(W,yb+8,s,'One recorded request through the service, stage by stage');
    const art=document.getElementById('rd-life-art');if(art)art.innerHTML=ART[k]()}
  // the artefact of each step, under the figure
  const logl=hl=>'<div class="raw" style="white-space:pre-wrap">'+O.map((o,i)=>'<span class="ln'+(hl.includes(i)?' on':'')+'">'+(i+1)+'. '+esc(o)+'</span>').join('')+'</div>';
  const code=(a,b)=>'<div class="code">'+RAW.excerpt(D.src2,a,b,0)+'</div>';
  const scope=JSON.stringify(T.scope,null,1).replace(/\[\s*([^\[\]{}]*?)\s*\]/g,(m,a)=>'['+a.replace(/\s*\n\s*/g,' ')+']');
  const ART=[()=>'<div class="small mute">The ASGI scope, as the app received it (client port elided)</div><div class="raw codebox">'+esc(scope)+'</div>',
    ()=>'<div class="small mute">The app\'s own log</div>'+logl([0,1]),
    ()=>'<div class="small mute">The route that matched</div>'+code('@app.get("/trace")','async def trace'),
    ()=>'<div class="small mute">The log, and the dependency</div>'+logl([2])+code('def current_user','return "alice"'),
    ()=>'<p class="small mute">No body on this route; the 422 answers of the chat API are in section 3.</p>',
    ()=>'<div class="small mute">The app\'s own log</div>'+logl([3]),
    ()=>'<div class="small mute">The app\'s own log</div>'+logl([4,5])];
  const an=RD.anim({card:'rd-life-card',ctl:'rd-life-ctl',n:7,ms:5200,draw,label:'Request stage',list:'sx-life'});
  RD.onResize(()=>an.redraw());
})();
