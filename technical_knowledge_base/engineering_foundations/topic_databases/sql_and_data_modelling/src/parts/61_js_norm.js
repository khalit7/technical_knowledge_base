// ---- Fig. 5 (section 9): one wide table against the normalised schema, on user 7's 59 real message rows (SM_DATA), flat (2026-11-19: was a 3D stage;
// the slabs and caps read the same flat, and the count of rows a rename writes is the lesson). Top: one slab per message row of user 7, grouped by chat,
// each with a cap, the user's name stored on it. The rename (to the illustrative 'Ines Novak-Reyes') must touch every cap; a buggy path touches one chat's.
// Bottom: the normalised schema (users, chats, messages), faint until step 5. N, K and the buggy chat are exposed as RD_NORM for src/check_page.mjs and recompute.py. ----
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
  const card=document.getElementById('rd-norm-card');if(!card||!window.SM_DATA)return;
  const D=window.SM_DATA,UID=7,user=D.users.find(u=>u[0]===UID),OLD=user[2],NEW='Ines Novak-Reyes',esc=RD.esc;
  const per=D.chats.filter(c=>c[1]===UID).map(c=>c[0]).sort((a,b)=>a-b).map(c=>({c,n:D.msgs.filter(m=>m[1]===c).length})).filter(x=>x.n>0);
  const N=per.reduce((a,x)=>a+x.n,0),BUG=Math.min(...per.map(x=>x.c)),K=per.find(x=>x.c===BUG).n;
  const lonely=D.users.filter(u=>!D.chats.some(c=>c[1]===u[0])).map(u=>u[0]);
  window.RD_NORM={N,K,BUG};window.CHK=Object.assign(window.CHK||{},{norm:{N,K,BUG,chats:per.length,lonely:lonely.length}});
  // top panel: the wide table, one thin slab per message row of user 7, grouped by chat, each with a cap (her name stored on it)
  // bottom panel: the normalised schema, users above chats above messages; it waits as faint outlines until step 5
  function draw(k){const el=document.getElementById('rd-norm'),W=RD.width(el),ph=W<520,fs=ph?11.5:12;
    const L=ph?4:70,R=W-(ph?4:10),SL=ph?34:56,G=ph?5:8,rw=(R-SL-L-(per.length-1)*G)/N;let x=L;per.forEach(g=>{g.x0=x;g.w=g.n*rw;x+=g.w+G});
    const OLDC='var(--c1)',NEWC='var(--c2)',norm=k>=4;let s='',y=6;
    // the wide table
    const wa=norm?.28:1;let w='';
    w+=text(L,y+12,'chat_log: '+N+' rows of user '+UID+', each storing "'+OLD+'"',{fs:12.5,w:700,c:OLDC});y+=22;
    const capY=y,rowY=y+9,rowH=ph?44:54;
    per.forEach(g=>{const bug=g.c===BUG,renamed=k>=2&&bug,hit=k===1||(k===2&&bug);
      for(let i=0;i<g.n;i++){const xi=g.x0+i*rw;w+=rect(xi+.5,rowY,rw-1,rowH,{fill:'var(--card)',s:'var(--line)',sw:.8,r:1});
        w+=rect(xi+.5,capY,rw-1,7,{fill:renamed?NEWC:OLDC,fo:hit?1:.75,s:hit?'var(--ink)':null,sw:.6,r:1,cl:hit&&k<=2?'rd-new':''})}
      const lc=k>=2&&k<4&&bug?'var(--bad)':'var(--mute)';
      w+=text(g.x0+g.w/2,rowY+rowH+14,(k>=2&&k<4&&bug&&!ph?'chat '+g.c+' · ':'')+g.n,{a:'middle',fs:11.5,mono:1,c:lc,w:k>=2&&k<4&&bug?700:400})});
    if(!ph)w+=text(L-6,rowY+rowH/2+4,'messages',{a:'end',fs:11.5,c:'var(--mute)'})+text(L-6,capY+7,'name',{a:'end',fs:11.5,c:OLDC});
    let ny=rowY+rowH+20;
    if(k===1)w+=text(L,ny+12,'UPDATE every row of user 7: '+N+' rows to write',{fs:12.5,w:700,mono:1,c:'var(--acc)',cl:'rd-new'});
    if(k===2)w+=text(L,ny+12,'UPDATE only chat '+BUG+"'s rows: "+K+' written, '+(N-K)+' missed',{fs:12.5,w:700,mono:1,c:'var(--bad)',cl:'rd-new'});
    if(k===3){const t1='"'+NEW+'" ('+K+')',t2='"'+OLD+'" ('+(N-K)+')';
      w+=text(L,ny+12,'two answers: ',{fs:12.5,w:700,c:'var(--bad)'})+text(L+(ph?86:92),ny+12,esc(t1),{fs:12.5,w:700,mono:1,c:NEWC,cl:'rd-new'});
      w+=text(L+(ph?86:92),ny+28,esc(t2),{fs:12.5,w:700,mono:1,c:OLDC,cl:'rd-new'});
      w+=rect(R-SL+6,capY,SL-6,rowH+9,{fill:'none',s:'var(--bad)',da:'4 3',cl:'rd-new'});
      w+=text(R,ny+44,'no row for a user who never wrote',{a:'end',fs:12,c:'var(--bad)',cl:'rd-new'})}
    s+=grp(w,{op:wa});y=ny+(k===3?52:22);
    // the normalised schema
    const na=norm?1:.16,renamed=k>=5;let n='',lz='';const y1=y+6;
    n+=line(4,y1-6,W-4,y1-6,{c:'var(--line)',da:'4 4'});
    n+=text(L,y1+12,norm?(ph?'normalised':'normalised: users, chats, messages'):'normalised (step 5)',{fs:12.5,w:700,c:norm?'var(--ink)':'var(--mute)'});
    const uy=y1+24,uh=30,uw=ph?R-L:Math.min(230,R-L),ux=L;
    n+=rect(ux,uy,uw,uh,{fill:renamed?NEWC:OLDC,fo:.2,s:renamed?NEWC:OLDC,sw:renamed?2:1.2,r:6,cl:k===5?'rd-new':''});
    n+=text(ux+8,uy+19,'users · id 7 · '+esc(renamed?NEW:OLD),{fs:12,mono:1,w:700,c:renamed?NEWC:OLDC});
    if(k===5)n+=text(ux+uw+8,uy+19,'1 row written',{fs:12.5,w:700,c:NEWC,cl:'rd-new'});
    if(k===6){const bw=ph?34:44,gx=ph?ux:ux+uw+8,ly=ph?uy+uh+6:uy;let lx=gx;lonely.forEach(id=>{if(lx+bw>R)return;lz+=rect(lx,ly,bw-4,uh,{fill:'var(--card)',r:6})+rect(lx,ly,bw-4,uh,{fill:'var(--good)',fo:.18,s:'var(--good)',r:6,cl:'rd-new'})+text(lx+(bw-4)/2,ly+19,String(id),{a:'middle',fs:11.5,mono:1,cl:'rd-new'});lx+=bw});
      n+=text(R,y1+12,lonely.length+' users with no chat, stored fine',{a:'end',fs:12.5,w:700,c:'var(--good)',cl:'rd-new'})}
    if(!ph)n+=text(L-6,uy+19,'users',{a:'end',fs:11.5,c:'var(--mute)'});
    const cy=uy+uh+22+(ph?36:0),ch=24;
    per.forEach(g=>{n+=rect(g.x0,cy,g.w,ch,{fill:'var(--c6)',fo:.22,s:'var(--c6)',r:4});
      if(g.w>(ph?20:34))n+=text(g.x0+g.w/2,cy+16,String(g.c),{a:'middle',fs:11.5,mono:1});
      n+=line(g.x0+g.w/2,cy,ux+uw/2,uy+uh,{c:renamed?NEWC:'var(--c6)',sw:1,op:renamed?.8:.5})});
    n+=lz;
    if(!ph)n+=text(L-6,cy+16,'chats',{a:'end',fs:11.5,c:'var(--c6)'});
    const my=cy+ch+10,mh=ph?20:24;
    per.forEach(g=>{for(let i=0;i<g.n;i++)n+=rect(g.x0+i*rw+.5,my,rw-1,mh,{fill:'var(--card)',s:'var(--line)',sw:.8,r:1});
      n+=line(g.x0+g.w/2,my,g.x0+g.w/2,cy+ch,{c:'var(--c6)',sw:1,op:.6})});
    if(!ph)n+=text(L-6,my+mh/2+4,'messages',{a:'end',fs:11.5,c:'var(--mute)'});
    n+=text(L,my+mh+15,'each message row stores chat_id; the name is one join away',{fs:11.5,c:'var(--mute)'});
    s+=grp(n,{op:na});
    el.innerHTML=RD.svg(W,my+mh+24,s,'User 7: one wide table against the normalised schema')}
  const an=RD.anim({card:'rd-norm-card',ctl:'rd-norm-ctl',n:7,ms:4800,draw,label:'Normalisation step',list:'sx-norm'});
  RD.onResize(()=>an.redraw());
})();
