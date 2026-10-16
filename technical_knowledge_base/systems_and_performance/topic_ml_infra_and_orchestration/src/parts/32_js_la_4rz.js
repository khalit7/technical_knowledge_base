// ---- Launch lab: section 4 rendezvous animation, driven by the real event times of two Slurm runs ----
// D.rz[mode] = {events:[{t, a (actor), s (state), cap}], note}. Actors: s0 (rendezvous store, port 29500),
// w0 (workers' store, random port), n0, n1 (torchrun agents), r0..r3 (workers). States: off, up, wait, join, ok, err.
(function(){
  const H=window.LA_H,D=window.LA;if(!H||!D||!D.rz)return;const {$,esc,svg,t,rect,line}=H;
  let mode='ok',A;
  const COL={off:'var(--dim)',up:'var(--c5)',wait:'var(--c2)',join:'var(--c2)',ok:'var(--good)',err:'var(--bad)'};
  const LBL={off:'not started',up:'starting',wait:'waiting',join:'joined',ok:'ready',err:'error'};
  function state(i){const ev=D.rz[mode].events,s={};for(let k=0;k<=i&&k<ev.length;k++)[].concat(ev[k].a).forEach(a=>{s[a]=ev[k]});return s}
  function draw(i){
    const el=$('la-rz-svg');if(!el)return;const R=D.rz[mode],ev=R.events,e=ev[Math.min(i,ev.length-1)],S=state(i);
    const W=Math.min(H.width(el),760),narrow=W<520,nw=narrow?W-20:(W-50)/2,h=narrow?360:236;
    const box=[{x:10,y:narrow?78:84},{x:narrow?10:W-10-nw,y:narrow?226:84}];
    let b='';
    // stores (on node 0)
    const sx=narrow?W/2:W/2,sy=34;
    const st0=S.s0,st1=S.w0;
    b+=rect(sx-118,sy-22,112,36,'var(--bg)',{stroke:st0?COL[st0.s]:'var(--dim)',sw:2,rx:6});
    b+=t(sx-62,sy-6,'rendezvous store',{fs:10.5,a:'middle',w:600});b+=t(sx-62,sy+8,R.port0||':29500',{fs:10,a:'middle',fill:'var(--mute)'});
    b+=rect(sx+6,sy-22,112,36,'var(--bg)',{stroke:st1?COL[st1.s]:'var(--dim)',sw:2,rx:6,dash:st1?'':'4 3'});
    b+=t(sx+62,sy-6,'workers\' store',{fs:10.5,a:'middle',w:600});b+=t(sx+62,sy+8,st1?(R.port1||'random port'):'not yet',{fs:10,a:'middle',fill:'var(--mute)'});
    ['n0','n1'].forEach((n,k)=>{const p=box[k],s=S[n],c=s?COL[s.s]:COL.off;
      b+=rect(p.x,p.y,nw,narrow?132:140,'var(--soft)',{stroke:'var(--line)',rx:8});
      b+=t(p.x+10,p.y+17,'node '+k+(R.hosts?' ('+esc(R.hosts[k])+')':''),{fs:12,w:600});
      b+=rect(p.x+10,p.y+26,nw-20,26,'var(--bg)',{stroke:c,sw:2,rx:5});
      b+=t(p.x+18,p.y+43,'torchrun agent: '+(s?LBL[s.s]:LBL.off),{fs:11});
      if(s&&(s.s==='join'||s.s==='ok'||s.s==='wait'))b+=line(p.x+nw/2,p.y,sx-62,sy+14,c,{sw:1.5,dash:s.s==='wait'?'4 3':''});
      [0,1].forEach(j=>{const r='r'+(k*2+j),rs=S[r],rc=rs?COL[rs.s]:COL.off,rw=(nw-30)/2,rx=p.x+10+j*(rw+10),ry=p.y+62;
        b+=rect(rx,ry,rw,narrow?60:66,'var(--bg)',{stroke:rc,sw:2,rx:5,dash:rs?'':'4 3'});
        b+=t(rx+8,ry+18,'rank '+(k*2+j),{fs:12,w:600});b+=t(rx+8,ry+35,rs?LBL[rs.s]:LBL.off,{fs:10.5,fill:'var(--mute)'});
        if(rs&&(rs.s==='join'||rs.s==='ok'))b+=line(rx+rw/2,ry,sx+62,sy+14,rc,{sw:1,op:0.7})})});
    el.innerHTML=svg(W,h,b,'Rendezvous of two torchrun agents and four workers');
    const tt=e.t;
    $('la-rz-cap').innerHTML='<b>'+(tt>=0?'t = '+H.fmt(tt,tt<10?2:1)+' s':'')+'</b> '+e.cap;
  }
  function init(){if(!$('la-rz-card'))return;
    H.seg($('la-rz-mode'),m=>{mode=m;A.reset(D.rz[m].events.length);A.go(0);$('la-rz-note').innerHTML=D.rz[m].note||''});
    A=H.anim({card:'la-rz-card',ctl:'la-rz-ctl',n:D.rz.ok.events.length,draw,ms:1500,label:'Rendezvous step'});
    $('la-rz-note').innerHTML=D.rz.ok.note||'';
    if($('la-rz-src')&&D.rzsrc)$('la-rz-src').innerHTML=D.rzsrc;}
  init();
})();
