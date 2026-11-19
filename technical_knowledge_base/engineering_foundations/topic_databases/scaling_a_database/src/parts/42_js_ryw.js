// ---- Fig. 2 (section 3): read-your-writes under three routes, flat (2026-11-19: was a 3D stage of four boxes; the parties and the messages between them
// read the same flat). The user's app, a router, a primary above one replica; each server's write-ahead log is a row of records (0/3000010 to 0/3000080,
// log positions illustrative). The user's write is record 0/3000060 (purple); the replica replays the primary's log a little behind (gold). ----
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
  const card=document.getElementById('rd-ryw-card');if(!card)return;
  let mode='naive';const NL=8,UW=5,POS=i=>'0/30000'+String((i+1)*10).padStart(2,'0'); // the user's write is record 6, 0/3000060
  function draw(k){const el=document.getElementById('rd-ryw'),W=RD.width(el),ph=W<520,fs=ph?11.5:12;let s='';
    const lsnCatch=mode==='lsn'&&k>=3,pn=k===0?6:6,rn=lsnCatch?8:2;
    // the four parties: app and router on the left, the primary above the replica on the right, each server with its log as a row of records
    const ax=ph?30:52,rx=ph?104:170,aw=ph?56:92,rw2=ph?58:92,sx=ph?150:W*.44,sw=W-sx-4,top=6,py=top,sh=ph?70:76,ry=py+sh+(ph?58:66),my=(py+sh+ry)/2;
    const box=(x,y,w,h,name,hot,hc)=>rect(x,y,w,h,{fill:hot?hc:'var(--soft)',fo:hot?.16:1,s:hot?hc:'var(--line)',sw:hot?2:1.2,r:8})+text(x+8,y+18,name,{fs:13,w:700});
    s+=box(ax-aw/2,my-22,aw,44,ph?'app':'user + app',false)+box(rx-rw2/2,my-22,rw2,44,'router',k===2&&mode==='lsn','var(--c5)');
    const priHot=k===0||(mode==='sticky'&&(k===2||k===3)),reHot=(mode!=='sticky'&&k===3)||(mode==='naive'&&k===4);
    s+=box(sx,py,sw,sh,'primary',priHot,mode==='sticky'&&k===4?'var(--bad)':'var(--acc)');
    s+=box(sx,ry,sw,sh,'replica',reHot,mode==='naive'?'var(--bad)':'var(--good)');
    const cw=(sw-16)/NL;
    function log(y,n,lab,lc){for(let i=0;i<NL;i++){const x=sx+8+i*cw;
        if(i<n)s+=rect(x+1,y,cw-2,18,{fill:i===UW?'var(--c4)':'var(--c5)',fo:i===UW?.9:.45,r:2,cl:(k===0&&y===py+28&&i===UW)||(lsnCatch&&k===3&&y===ry+28&&i>=2)?'rd-new':''});
        else s+=rect(x+1,y,cw-2,18,{fill:'none',s:'var(--line)',da:'3 3',r:2})}
      s+=text(sx+8,y+36,lab,{fs:11.5,mono:1,c:lc,w:600})}
    log(py+28,pn,'log at '+POS(pn-1),'var(--c4)');log(ry+28,rn,'replayed to '+POS(rn-1),rn>=NL?'var(--good)':'var(--c5)');
    const A=(x1,y1,x2,y2,c,o)=>arrow(x1,y1,x2,y2,Object.assign({c,sw:2},o||{}));
    // 1. the write: app to router to primary
    if(k===0)s+=grp(A(ax+aw/2,my-6,rx-rw2/2,my-6,'var(--c4)')+A(rx+rw2/2,my-10,sx,py+sh/2,'var(--c4)')+text((rx+sx)/2-4,(my+py+sh/2)/2-10,'write',{fs,c:'var(--c4)',w:600}),{cl:'rd-new'});
    // 2. the log streams to the replica, behind; it keeps streaming from here on
    if(k>=1){const lx=sx+sw-(ph?24:40);s+=grp(A(lx,py+sh,lx,ry,'var(--c5)',{da:'5 3'})+text(lx-6,(py+sh+ry)/2+4,'log stream',{a:'end',fs,c:'var(--c5)',w:600}),{cl:k===1?'rd-new':'',op:k===1?1:.6})}
    // 3. the reload
    if(k>=2){const op=k===2?1:.5,cl=k===2?'rd-new':'';s+=grp(A(ax+aw/2,my+4,rx-rw2/2,my+4,'var(--c6)'),{op,cl});
      if(mode==='sticky')s+=grp(A(rx+rw2/2,my-2,sx,py+sh-14,'var(--c6)'),{op,cl});
      else if(mode==='naive')s+=grp(A(rx+rw2/2,my+6,sx,ry+14,'var(--c6)'),{op,cl});
      else if(k===2)s+=grp(line(rx+rw2/2,my+6,(rx+rw2/2+sx)/2,(my+6+ry+14)/2,{c:'var(--c6)',sw:2,da:'3 5'}),{cl});
      else s+=grp(A(rx+rw2/2,my+6,sx,ry+14,'var(--c6)'),{op,cl})}
    // 4. the answer comes back: without the message (naive) or with it
    if(k>=3){const ok=mode!=='naive',c=ok?'var(--good)':'var(--bad)',fromP=mode==='sticky',op=k===3?1:.6,cl=k===3?'rd-new':'';
      s+=grp(A(sx,fromP?py+sh-4:ry+28,rx+rw2/2,my+16,c)+A(rx-rw2/2,my+16,ax+aw/2,my+16,c),{op,cl});
      s+=grp(text(ax-aw/2,my+44,ok?'message shown':'message missing',{fs:12.5,w:700,c}),{cl})}
    // 5. the cost of each route
    let yb=ry+sh+20;
    if(k===2&&mode==='lsn')s+=text(W/2,yb,'wait: replica at 0/3000020 < the write\'s 0/3000060',{a:'middle',fs:12.5,mono:!ph,w:700,c:'var(--c5)',cl:'rd-new'});
    if(k===4){const t=mode==='naive'?'1,993 of 2,000 immediate reads missed it':mode==='sticky'?'recent writers read the primary':'median wait 0.105 ms';
      s+=text(W/2,yb,t,{a:'middle',fs:13,w:700,c:mode==='lsn'?'var(--good)':'var(--bad)',cl:'rd-new'})}
    el.innerHTML=RD.svg(W,yb+10,s,'Read-your-writes under the '+mode+' route')}
  const an=RD.anim({card:'rd-ryw-card',ctl:'rd-ryw-ctl',n:5,ms:5000,draw,label:'Read-your-writes step',list:'sx-ryw-naive'});
  RD.onResize(()=>an.redraw());
  const M=document.getElementById('rwM');
  if(M)M.addEventListener('click',ev=>{const b=ev.target.closest('button[data-m]');if(!b)return;mode=b.dataset.m;
    M.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
    ['naive','sticky','lsn'].forEach(m=>{const l=document.getElementById('sx-ryw-'+m);if(l)l.hidden=m!==mode});an.reset(5,'sx-ryw-'+mode)});
})();
