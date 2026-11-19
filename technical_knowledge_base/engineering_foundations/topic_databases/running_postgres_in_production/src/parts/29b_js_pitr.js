// ---- Fig. 2 (section 2): a nightly dump against a base backup plus archived WAL, on the same bad DELETE, flat (2026-11-19: was a 3D stage; a timeline
// and two row counts read the same flat, without the faded steps). Data: window.RPG.pitr, the real run: rows before the DELETE, rows each recovery got back,
// the recovery times, and the archived WAL segments recovery replayed (parsed from its log: ...14 to ...22), stopping before the DELETE's commit (transaction 738).
// Clock times are illustrative. Today's 12,000 rows (1.2%) are drawn wider than their share, and labelled so. ----
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
  const card=document.getElementById('rd-pitr-card');if(!card||!window.RPG)return;
  const D=RPG.pitr||{},ST=D.steps||{},base=D.count_dump||1e6,good=D.before_delete||1012000,today=good-base,fmt=n=>Math.round(n).toLocaleString('en-US');
  const log=(ST.restore_pitr&&ST.restore_pitr.log)||[],segs=log.map(l=>(l.match(/restored log file "([0-9A-F]{24})"/)||[])[1]).filter(Boolean).map(f=>f.slice(-2));
  const stopTx=((log.find(l=>/recovery stopping/.test(l))||'').match(/transaction (\d+)/)||[])[1]||'738';
  const tDump=(ST.restore_dump&&ST.restore_dump.secs)||0,tPitr=(ST.restore_pitr&&ST.restore_pitr.secs)||0;
  let mode='dump';
  // per step: clock (hours), production rows, archived fraction
  const SP=[{h:0,prod:base,arc:0},{h:9,prod:base+today/3,arc:.35},{h:14.05,prod:good,arc:1},{h:14.05,prod:0,arc:1},{h:14.3,prod:2,arc:1},{h:14.3,prod:2,arc:1},{h:14.3,prod:2,arc:1},{h:14.3,prod:2,arc:1}];
  function draw(k){const el=document.getElementById('rd-pitr'),W=RD.width(el),ph=W<520,pitr=mode==='pitr',fs=ph?11.5:12,s0=SP[k];let s='';
    const L=ph?6:96,R=W-(ph?8:14),X=h=>L+(R-L)*h/15,lab=(y,t,c)=>ph?'':text(L-8,y,t,{a:'end',fs:12,c:c||'var(--mute)'});
    // 1. the clock along the top
    let y=ph?22:16;s+=line(X(0),y,X(15),y,{c:'var(--mute)'});
    [0,3,6,9,12,15].forEach(h=>{s+=line(X(h),y-3,X(h),y+3,{c:'var(--mute)'})+text(X(h),y-7,String(h).padStart(2,'0')+':00',{a:h===0?'start':h===15?'end':'middle',fs:11,mono:1,c:'var(--mute)'})});
    s+='<circle cx="'+fx(X(s0.h))+'" cy="'+y+'" r="5" fill="var(--acc)"/>';
    // 2. the copy taken at midnight, and the WAL archive behind it (lit as segments are archived; the last holds the DELETE's commit)
    y+=18;const ca=k===0||k===5?1:.55,cw=ph?44:58;
    s+=lab(y+16,pitr?'backup':'dump');
    s+=grp(rect(X(0),y,cw,24,{fill:'var(--c3)',fo:.35,s:'var(--c3)',r:4})+text(X(0)+4,y+40,pitr?'base backup · 258 MB':'dump file · 33.9 MB',{fs,w:700,c:'var(--c3)'}),{op:ca,cl:k===0?'rd-new':''});
    const ax0=X(0)+cw+4,ax1=X(14.05),nS=segs.length,sw=(ax1-ax0)/Math.max(1,nS);
    if(pitr){segs.forEach((g,i)=>{const lit=(i+.5)/nS<=s0.arc,last=i===nS-1,red=last&&k>=3,used=(k===6&&!last)||(k===7&&!last);
        s+=rect(ax0+i*sw+1,y,sw-2,24,lit?{fill:red?'var(--bad)':'var(--c5)',fo:used?.25:.6,s:red?'var(--bad)':'var(--c5)',sw:1,r:3,cl:k===1||k===2?'rd-new':''}:{fill:'none',s:'var(--line)',da:'3 3',r:3})});
      s+=text(ax0+2,y-5,(ph?'WAL segments':'archived WAL, 16 MB segments')+' …'+segs[0]+' to …'+segs[nS-1],{fs:11,mono:1,c:'var(--c5)',op:k>=1?1:.5})}
    else s+=text((ax0+ax1)/2,y+16,'no WAL kept: only the midnight file',{a:'middle',fs,c:'var(--mute)'});
    if(k===3)s+=grp(line(X(14.05),y-14,X(14.05),y+30,{c:'var(--bad)',sw:2})+text(X(14.05)-4,y+40,'DELETE 14:03 · tx '+stopTx,{a:'end',fs,w:700,c:'var(--bad)'}),{cl:'rd-new'});
    if(k===6&&pitr)s+=grp(text(X(14.05),y+40,'stops before commit of '+stopTx,{a:'end',fs,w:700,c:'var(--bad)'}),{cl:'rd-new'});
    // 3. the two servers as rows of messages: the midnight rows, then today's drawn wider than their 1.2% (labelled)
    const bx0=ph?6:L,bx1=R,todayW=(bx1-bx0)*.16,baseW=(bx1-bx0)-todayW,bar=(yy,rows,c,op,cl)=>{const b=Math.min(1,rows/base),t=Math.max(0,Math.min(1,(rows-base)/today));
      return rect(bx0,yy,bx1-bx0,22,{fill:'none',s:'var(--line)',da:'3 3',r:4})+(b>.0005?rect(bx0,yy,baseW*b,22,{fill:c,fo:.35*op,s:c,sw:1,r:4,cl}):'')+(t>.005?rect(bx0+baseW,yy,todayW*t,22,{fill:'var(--acc)',fo:.55*op,s:'var(--acc)',sw:1,r:4,cl}):'')};
    y+=ph?62:66;const prod=s0.prod,pop=k>=5?.5:1;
    s+=lab(y+15,'production');s+=text(bx0,y-6,'production · '+fmt(prod)+' rows',{fs:12.5,w:700,op:pop});
    s+=grp(bar(y,prod,'var(--c1)',1,k<=3?'rd-new':''),{op:pop});
    if(k===4)s+=text(bx1,y-6,'2 new messages',{a:'end',fs,c:'var(--mute)',cl:'rd-new'});
    if(!ph||k===1)s+=text(bx0+baseW+todayW,y+36,'today, drawn wider',{a:'end',fs:11,c:'var(--mute)'});
    // 4. the recovered server
    y+=ph?66:62;const rec=k<5?0:k===5?base:pitr?(k>=6?good:base):base;
    s+=lab(y+15,'recovered');
    if(k>=5){s+=text(bx0,y-6,'recovered · '+fmt(rec)+' rows',{fs:12.5,w:700,c:'var(--c3)'});s+=bar(y,rec,'var(--c3)',1,k===5||(k===6&&pitr)?'rd-new':'')}
    else s+=rect(bx0,y,bx1-bx0,22,{fill:'none',s:'var(--line)',da:'3 3',r:4})+text(bx0+8,y+15,'a new server, restored at step 6',{fs:11.5,c:'var(--mute)'});
    if(k===5)s+=text(bx1,y+36,pitr?'from the base backup: the state at 00:00':'pg_restore of the midnight file · '+tDump+' s',{a:'end',fs:12.5,c:'var(--c3)',w:700,cl:'rd-new'});
    if(k===6&&!pitr)s+=text(bx1,y+36,'nothing to replay',{a:'end',fs:12.5,c:'var(--mute)',cl:'rd-new'});
    if(k===6&&pitr)s+=text(bx1,y+36,'replayed …'+segs[0]+' to …'+segs[nS-1],{a:'end',fs:12.5,mono:1,c:'var(--c5)',w:700,cl:'rd-new'});
    if(k===7){const ok=pitr,t=ok?'lost 0 · recovery '+tPitr+' s':'lost '+fmt(today)+' · restore '+tDump+' s';s+=text(bx1,y+38,t,{a:'end',fs:14,w:700,c:ok?'var(--good)':'var(--bad)',cl:'rd-new'})}
    el.innerHTML=RD.svg(W,y+48,s,'The same DELETE, recovered two ways: '+mode)}
  const an=RD.anim({card:'rd-pitr-card',ctl:'rd-pitr-ctl',n:8,ms:4800,draw,label:'Recovery step',list:'sx-pitr-dump'});
  RD.onResize(()=>an.redraw());
  const sw=document.getElementById('rd-pitr-mode');
  if(sw)RD.seg(sw,m=>{mode=m;['dump','pitr'].forEach(x=>document.getElementById('sx-pitr-'+x).hidden=x!==m);an.reset(8,'sx-pitr-'+m)});
})();
