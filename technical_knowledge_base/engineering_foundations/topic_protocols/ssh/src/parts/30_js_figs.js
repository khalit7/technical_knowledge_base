// ---- Static figures added in the 2026-10-24 rebuild: lists against one CA (section 4), the frozen path with and
// without keepalives (section 9), PerSourcePenalties on a time axis (section 12), the debugging ladder (section 14).
(function(){
  const T=RD.t,esc=RD.esc,L=SSHD.logs,N=SSHD.N;
  const box=(x,y,w,h,f,st,op)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="4" fill="'+f+'"'+(op!=null?' fill-opacity="'+op+'"':'')+' stroke="'+(st||'none')+'"/>';
  const line=(x1,y1,x2,y2,c,w,d)=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+c+'" stroke-width="'+(w||1)+'"'+(d?' stroke-dasharray="4 3"':'')+'/>';

  // section 4: N users x M nodes of authorized_keys lines, against one CA line per node (illustrative 20 x 50)
  const ca=document.getElementById('ca-fig');
  function caFig(){if(!ca)return;const w=Math.min(RD.width(ca),820),narrow=w<560,U=20,M=50;
    const pw=narrow?w:(w-24)/2,ph=narrow?190:210;let s='';
    const panel=(ox,oy,title,sub,cert)=>{let t=T(ox,oy+14,title,{fs:12.5,w:600})+T(ox,oy+30,sub,{fs:11,fill:'var(--mute)'});
      const gx=ox,gy=oy+42,cw=(pw-4)/M,chh=(ph-60)/U;
      for(let j=0;j<M;j++)for(let i=0;i<U;i++){if(cert&&i>0)continue;
        t+=box(gx+j*cw,gy+i*chh,Math.max(1,cw-1),Math.max(1,chh-1),cert?'var(--good)':'var(--bad)',null,cert?.85:.55)}
      if(cert)t+=T(gx,gy+chh+16,'one TrustedUserCAKeys line on each of the 50 nodes',{fs:11,fill:'var(--good)'})+T(gx,gy+chh+32,'users come and go: no node changes',{fs:11,fill:'var(--mute)'});
      else t+=T(gx,gy+U*chh+12,'columns: 50 nodes; rows: 20 users',{fs:11,fill:'var(--mute)'});
      return t};
    s+=panel(0,0,'Plain keys: 1,000 authorized_keys entries','every leaver means editing 50 nodes',false);
    s+=narrow?panel(0,ph+10,'Certificates: 50 CA lines','one per node, set once',true):panel(pw+24,0,'Certificates: 50 CA lines','one per node, set once',true);
    ca.innerHTML=RD.svg(w,narrow?2*ph+14:ph+6,s,'Twenty users on fifty nodes: 1,000 authorized_keys entries against 50 CA lines')}
  caFig();RD.onResize(caFig);RD.onRender(caFig);

  // section 9: time after the bastion froze until ssh noticed
  const ka=document.getElementById('ka-fig');
  function kaFig(){if(!ka)return;const w=Math.min(RD.width(ka),820),narrow=w<520,lab=narrow?0:230,x0=lab,x1=w-(narrow?10:60),tmax=36;
    const xs=t=>x0+(x1-x0)*t/tmax,sa=parseFloat(N.keep_sa),none=parseFloat(N.keep_none);let s='',y=4;
    const lane=(name,end,c,txt,cont)=>{if(narrow){s+=T(0,y+11,name,{fs:11.5,w:600});y+=16}else s+=T(lab-8,y+15,name,{fs:11.5,w:600,a:'end'});
      s+=box(xs(0),y,xs(end)-xs(0),20,c,null,.85);if(cont)s+='<path d="M'+(xs(end)+2)+' '+(y+3)+' L'+(xs(end)+12)+' '+(y+10)+' L'+(xs(end)+2)+' '+(y+17)+'Z" fill="'+c+'"/>';
      s+=T(Math.min(xs(end)+(cont?16:6),w-4),y+34,txt,{fs:11,a:xs(end)>w-150?'end':'start',fill:'var(--ink)'});y+=48};
    lane('ServerAliveInterval 2, CountMax 2',sa,'var(--good)','exit 255 after '+N.keep_sa+' s');
    lane('default (ServerAliveInterval 0)',none,'var(--bad)','still hanging at '+N.keep_none+' s, killed by the script',true);
    for(let t=0;t<=30;t+=10)s+=line(xs(t),y,xs(t),y+5,'var(--mute)')+T(xs(t),y+17,t+' s',{fs:11,a:'middle',fill:'var(--mute)'});
    s+=T(x0,y+32,'seconds after the bastion was frozen (docker pause)',{fs:11,fill:'var(--mute)'});
    ka.innerHTML=RD.svg(w,y+38,s,'Time until ssh noticed the dead path, with and without keepalives')}
  kaFig();RD.onResize(kaFig);RD.onRender(kaFig);

  // section 12: six attempts from the bastion's address, one second apart, and the penalty window
  const pf=document.getElementById('pen-fig');
  function penFig(){if(!pf)return;const w=Math.min(RD.width(pf),820),narrow=w<520;
    const at=[...(L.penalties||'').matchAll(/attempt (\d+) \(t=(\d+) s\): exit (\d+), (\d+) ms: (.*)/g)].map(m=>({n:+m[1],t:+m[2],ms:+m[4],denied:/Permission denied/.test(m[5])}));
    const pen=parseFloat(N.pen_s),start=at.filter(a=>a.denied).slice(-1)[0],t0=start?start.t:3,tmax=Math.ceil(t0+pen+1);
    const x0=10,x1=w-10,xs=t=>x0+(x1-x0)*t/tmax;let s='';const y=30;
    s+=box(xs(t0),y-14,xs(t0+pen)-xs(t0),28,'var(--bad)',null,.14)+T(xs(t0)+4,y+30,'address refused for '+N.pen_s+' s',{fs:11,fill:'var(--bad)',w:600});
    s+=line(x0,y,x1,y,'var(--line)',2);
    at.forEach(a=>{const x=xs(a.t);s+='<circle cx="'+x+'" cy="'+y+'" r="7" fill="'+(a.denied?'var(--c2)':'var(--dim)')+'" stroke="'+(a.denied?'var(--c2)':'var(--mute)')+'"/>'+T(x,y-18,String(a.n),{fs:11,a:'middle',w:600})});
    const ly=y+52;s+='<circle cx="16" cy="'+(ly-4)+'" r="6" fill="var(--c2)"/>'+T(28,ly,'reached authentication: Permission denied',{fs:11});
    s+='<circle cx="16" cy="'+(ly+14)+'" r="6" fill="var(--dim)" stroke="var(--mute)"/>'+T(28,ly+18,'dropped before authentication (no message)',{fs:11});
    for(let t=0;t<=tmax;t+=narrow?10:5)s+=T(xs(t),ly+42,t+' s',{fs:11,a:t===0?'start':'middle',fill:'var(--mute)'});
    pf.innerHTML=RD.svg(w,ly+48,s,'Six login attempts from the bastion address; after four failures the node refuses it')}
  penFig();RD.onResize(penFig);RD.onRender(penFig);

  // section 14: the debugging ladder, bottom to top
  const dg=document.getElementById('dbg-fig');
  function dbgFig(){if(!dg)return;const w=Math.min(RD.width(dg),820),narrow=w<620;
    const R=[['5. Channel or forward','open failed, bind: Address already in use, stdio forwarding failed','ssh -v; lsof; can the bastion reach the node?','var(--c3)'],
      ['4. User authentication','Permission denied (publickey), Too many authentication failures','ssh -v (Offering lines), then the server log','var(--c4)'],
      ['3. Host key check','REMOTE HOST IDENTIFICATION HAS CHANGED, Host key verification failed','compare the fingerprint out of band','var(--c5)'],
      ['2. Key exchange','Unable to negotiate, post-quantum warning','ssh -vv (both KEXINIT lists), ssh -Q kex','var(--c1)'],
      ['1. TCP','Connection timed out, refused, closed before the banner','ssh -v (Connecting to), nc -vz, server log','var(--dim)']];
    const wrap=(str,n)=>{const out=[];let l='';str.split(' ').forEach(q=>{if((l+' '+q).trim().length>n&&l){out.push(l);l=q}else l=(l+' '+q).trim()});if(l)out.push(l);return out};
    let s='',y=0;const tx=narrow?8:170,n=Math.floor((w-tx-8)/6.2);
    R.forEach(r=>{const a=wrap('sees: '+r[1],n),b=wrap('first: '+r[2],n),top=narrow?22:0,rh=Math.max(narrow?0:30,top+(a.length+b.length)*13)+12;
      s+=box(0,y,w,rh,r[3],r[3],.13)+T(8,y+16,r[0],{fs:12.5,w:600});
      a.forEach((l,k)=>{s+=T(tx,y+top+16+k*13,esc(l),{fs:11})});b.forEach((l,k)=>{s+=T(tx,y+top+16+(a.length+k)*13,esc(l),{fs:11,fill:'var(--mute)'})});
      y+=rh+4});
    const H=y;
    dg.innerHTML=RD.svg(w,H,s,'The debugging ladder: TCP, key exchange, host key, user authentication, channel')}
  dbgFig();RD.onResize(dbgFig);RD.onRender(dbgFig);
})();
