// ---- Fig. 2 (section 3): the stale-set race replayed from real measured trials (CA.race: two Python clients, Postgres 16.2, Redis 8.8), flat (2026-11-19).
// Was a 3D stage of four boxes; a sequence diagram reads the same parties and messages faster: Reader, Redis, Postgres and Writer as columns,
// one row per recorded event (its timestamp on the left), the message as an arrow coloured by what moves (the old title orange, the new one green),
// the reader's pause as a bar on its lifeline, what each store holds under its name. The same trial under delete on write, a lease and versioned keys;
// delayed double delete uses the first trial it lost. A toggle swaps the step list (RD.anim reset). ----
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
  const card=document.getElementById('rd-race-card');if(!card||!window.CA)return;
  const RC=CA.race,E=RC.examples,iDel=E.delete.findIndex(x=>x.stale),iDbl=E.double_delete.findIndex(x=>x.stale);
  const pick={delete:iDel,lease:iDel,version:iDel,double_delete:iDbl>=0?iDbl:iDel};
  let mode='delete';const T=()=>E[mode][pick[mode]],esc=RD.esc;
  // replay the log up to event k: what Postgres and Redis hold, the lease, whether the reader is paused
  function stateAt(t,k){let db='Trip plan',cache={},ver=0,lease=null,rej=false;
    for(let j=0;j<=k&&j<t.log.length;j++){const ev=t.log[j][2];let m;
      if((m=ev.match(/^committed "(.*)"$/)))db=m[1];
      else if(ev==='deleted key'||ev.indexOf('deleted key again')===0)delete cache.k;
      else if(ev==='deleted key and lease'){delete cache.k;lease=null}
      else if((m=ev.match(/^got lease (\d+)/)))lease=m[1];
      else if((m=ev.match(/^filled version (\d+) with "(.*)"$/)))cache['v'+m[1]]=m[2];
      else if((m=ev.match(/^filled "(.*)"$/)))cache.k=m[1];
      else if(/rejected/.test(ev))rej=true;
      else if(ev==='bumped version')ver++}
    const seen=mode==='version'?cache['v'+ver]:cache.k;
    return {db,seen,ver,lease,rej,cache,stale:seen!==undefined&&seen!==db}}
  const valC=v=>v==='Trip plan'?'var(--c2)':'var(--good)';
  // each recorded event as one message between two parties: [from, to, label, colour]
  function msg(txt){let m;
    if(/^miss on version (\d+)/.test(txt))return ['reader','redis','GET v'+txt.match(/(\d+)/)[1]+': miss','var(--mute)'];
    if(/^miss/.test(txt))return ['reader','redis','GET: miss','var(--mute)'];
    if((m=txt.match(/^got lease (\d+)/)))return ['redis','reader','lease #'+m[1],'var(--c5)'];
    if((m=txt.match(/^read "(.*)"/)))return ['pg','reader','"'+m[1]+'"',valC(m[1])];
    if((m=txt.match(/^committed "(.*)"/)))return ['writer','pg','COMMIT "'+m[1]+'"','var(--good)'];
    if(txt==='deleted key and lease')return ['writer','redis','DEL key + lease','var(--acc)'];
    if(/^deleted key again/.test(txt))return ['writer','redis','DEL again, +50 ms','var(--acc)'];
    if(/^deleted key/.test(txt))return ['writer','redis','DEL key','var(--acc)'];
    if(txt==='bumped version')return ['writer','redis','INCR version','var(--acc)'];
    if((m=txt.match(/^filled version (\d+) with "(.*)"/)))return ['reader','redis','SET v'+m[1]+' "'+m[2]+'"',valC(m[2])];
    if((m=txt.match(/^filled "(.*)"/)))return ['reader','redis','SET "'+m[1]+'"',valC(m[1])];
    if(/rejected/.test(txt))return ['reader','redis','SET refused','var(--bad)'];
    return ['reader','reader',txt,'var(--ink)']}
  function draw(k){const el=document.getElementById('rd-race-svg'),W=RD.width(el),ph=W<520,t=T(),n=t.log.length;k=Math.min(k,n-1);
    const fs=ph?11.5:12,TX=ph?46:58,cw=(W-TX)/4,COL={reader:TX+cw*.5,redis:TX+cw*1.5,pg:TX+cw*2.5,writer:TX+cw*3.5};
    const S=stateAt(t,k),HB=40,top=4,y0=top+HB+(ph?50:36)+(mode==='version'?14:0),RH=ph?40:44;let s='';
    // the four parties, and what each store holds now
    const NM={reader:'Reader',redis:'Redis',pg:'Postgres',writer:'Writer'};
    const ev=t.log[k],act=msg(ev[2]);
    Object.keys(COL).forEach(p=>{const on=act[0]===p||act[1]===p,x=COL[p],bw=Math.min(cw-8,ph?82:120);
      let fill='var(--soft)',stroke='var(--line)';
      if(p==='redis'){if(S.stale){fill='var(--bad)';stroke='var(--bad)'}else if(S.seen!==undefined){fill='var(--good)';stroke='var(--good)'}}
      s+=rect(x-bw/2,top,bw,HB,{fill,fo:fill==='var(--soft)'?1:.18,s:on?'var(--ink)':stroke,sw:on?1.8:1.2,r:8});
      s+=text(x,top+HB/2+5,NM[p],{a:'middle',fs:ph?12:13,w:600});
      s+=line(x,top+HB,x,y0+n*RH-RH/2+8,{c:'var(--line)',sw:1.4,da:'4 4'})});
    const rv=mode==='version'?'v'+S.ver+': '+(S.seen===undefined?'empty':'"'+S.seen+'"'):S.seen===undefined?'empty':'"'+S.seen+'"';
    s+=text(COL.redis,top+HB+15,esc(rv),{a:'middle',fs,mono:1,w:600,c:S.stale?'var(--bad)':S.seen!==undefined?'var(--good)':'var(--mute)'});
    s+=text(COL.pg,top+HB+15,esc('"'+S.db+'"'),{a:'middle',fs,mono:1,w:600,c:valC(S.db)});
    if(S.lease)s+=text(COL.reader,top+HB+15,'lease #'+S.lease,{a:'middle',fs,mono:1,w:600,c:'var(--c5)'});
    if(mode==='version'&&S.cache.v0!==undefined&&S.ver>0)s+=text(COL.redis,top+HB+30,'v0: "'+esc(S.cache.v0)+'", unread',{a:'middle',fs:11,mono:1,c:'var(--mute)'});
    // the reader's pause: from its read of the old title to its fill
    const iR=t.log.findIndex(x=>/^read "/.test(x[2])),iF=t.log.findIndex(x=>/fill/.test(x[2]));
    if(iR>=0&&iF>iR&&k>iR){const ya=y0+iR*RH+6,yb=y0+Math.min(k,iF)*RH-(k>=iF?6:-10);
      s+=rect(COL.reader-5,ya,10,Math.max(4,yb-ya),{fill:'var(--c5)',fo:.35,s:'var(--c5)',sw:1,r:3});
      const lb='paused '+t.pause_ms.toFixed(2)+' ms';
      // on a phone the left margin is too narrow: the pause is named under the reader instead
      if(ph){if(k<iF)s+=text(COL.reader,top+HB+(S.lease?30:15),lb,{a:'middle',fs:11,mono:1,c:'var(--c5)',w:600})}
      else s+=text(COL.reader-10,(ya+yb)/2+4,lb,{a:'end',fs:11,mono:1,c:'var(--c5)',w:600})}
    // one row per recorded event, drawn up to this step; the rest wait as faint slots
    t.log.forEach((e,i)=>{const y=y0+i*RH,[a,b,lab,c]=msg(e[2]),x1=COL[a],x2=COL[b],cur=i===k,dir=x2>x1?1:-1;
      const tm=e[0].toFixed(2)+(ph?'':' ms');
      if(i>k){s+=text(4,y+4,tm,{fs:11,mono:1,c:'var(--mute)',op:.35});s+=line(Math.min(x1,x2)+6,y,Math.max(x1,x2)-6,y,{c:'var(--line)',da:'2 4'});return}
      const op=cur?1:.55,cl=cur?'rd-new':'';
      s+=text(4,y+4,tm,{fs:11.5,mono:1,w:cur?700:400,c:cur?'var(--ink)':'var(--mute)'});
      s+=arrow(x1+dir*6,y,x2-dir*6,y,{c,sw:cur?2:1.4,op,cl});
      const lx=(x1+x2)/2,lw=lab.length*fs*.6,lxx=Math.max(TX+lw/2,Math.min(W-lw/2-2,lx));
      s+=grp(text(lxx,y-6,esc(lab),{a:'middle',fs,mono:1,w:cur?700:400,c}),{op,cl});
      if(/refused/.test(lab))s+=grp(line(x2-7,y-6,x2+5,y+6,{c:'var(--bad)',sw:2.2})+line(x2-7,y+6,x2+5,y-6,{c:'var(--bad)',sw:2.2}),{cl})});
    let yE=y0+n*RH-RH/2+16;
    // the outcome, once the last event has happened
    if(k===n-1){const tx=S.stale?'Stale set: Redis says "'+S.seen+'", Postgres "'+S.db+'", for the 300 s TTL':S.rej?'Fill refused: the key stays empty; the next reader gets "'+S.db+'"':mode==='version'?'Old version filled; readers ask for v'+S.ver+' and get "'+S.db+'"':'';
      if(tx){const mx=Math.floor(W/7.4),lines=[];tx.split(' ').forEach(w=>{const L=lines.length-1;if(L>=0&&(lines[L]+' '+w).length<=mx)lines[L]+=' '+w;else lines.push(w)});
        lines.forEach((l,j)=>{s+=text(W/2,yE+14+j*16,esc(l),{a:'middle',fs:12.5,w:700,c:S.stale?'var(--bad)':'var(--good)',cl:'rd-new'})});yE+=lines.length*16+4}}
    el.innerHTML=RD.svg(W,yE+10,s,'The stale-set race, one recorded trial, '+mode);
    const tr=document.getElementById('rd-race-trial');if(tr)tr.textContent='Trial '+(t.trial+1)+' of '+RC.trials+': reader pause '+t.pause_ms.toFixed(2)+' ms, writer start '+t.wait_ms.toFixed(2)+' ms, timestamps as recorded by the two clients.'}
  const an=RD.anim({card:'rd-race-card',ctl:'rd-race-ctl',n:T().log.length,ms:4400,draw,label:'Race event',list:'sx-race-delete'});
  RD.onResize(()=>an.redraw());
  const seg=document.getElementById('rd-race-mode');
  RD.seg(seg,m=>{mode=m;document.querySelectorAll('#rd-race ol.sx').forEach(l=>l.hidden=l.id!=='sx-race-'+m);an.reset(T().log.length,'sx-race-'+m)});
  window.CHK=window.CHK||{};CHK.race={pick,logs:Object.fromEntries(Object.keys(pick).map(m=>[m,E[m][pick[m]].log.map(x=>x[0])]))};
})();
