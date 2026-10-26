// ---- Reading: static annotated figures (hero, record, key schedule, resumption, chain, revocation, termination, inspection) ----
// Every figure is drawn at its container's measured width and redrawn on resize; text stays short labels (captions are HTML).
window.TLF=(function(){
  const esc=RD.esc;
  const CW=6.2; // approximate width of one character at 11 px
  const wrap=(s,px,fs)=>{const cw=CW*(fs||11)/11,max=Math.max(4,Math.floor(px/cw)),out=[];let line='';
    String(s).split(' ').forEach(w=>{if(!line)line=w;else if((line+' '+w).length<=max)line+=' '+w;else{out.push(line);line=w}});if(line)out.push(line);return out};
  const text=(x,y,s,o)=>{o=o||{};return '<text x="'+x+'" y="'+y+'"'+(o.a?' text-anchor="'+o.a+'"':'')+' font-size="'+(o.fs||11)+'" fill="'+(o.fill||'var(--ink)')+'"'+(o.w?' font-weight="'+o.w+'"':'')+(o.it?' font-style="italic"':'')+'>'+esc(s)+'</text>'};
  // several lines centred or anchored at x, first baseline y; returns [svg, height]
  const lines=(x,y,arr,o)=>{o=o||{};const lh=o.lh||13;return [arr.map((s,i)=>text(x,y+i*lh,s,o)).join(''),arr.length*lh]};
  const rect=(x,y,w,h,o)=>{o=o||{};return '<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+Math.max(1,w).toFixed(1)+'" height="'+h.toFixed(1)+'" rx="'+(o.rx==null?6:o.rx)+'" fill="'+(o.fill||'var(--soft)')+'" stroke="'+(o.stroke||'var(--line)')+'" stroke-width="'+(o.sw||1)+'"'+(o.dash?' stroke-dasharray="'+o.dash+'"':'')+'/>'};
  const defs=id=>'<defs>'+[['k','var(--mute)'],['b','var(--acc)'],['r','var(--bad)'],['g','var(--good)']].map(m=>'<marker id="'+id+'-'+m[0]+'" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="'+m[1]+'"/></marker>').join('')+'</defs>';
  const COL={k:'var(--mute)',b:'var(--acc)',r:'var(--bad)',g:'var(--good)'};
  const line=(x1,y1,x2,y2,id,c,o)=>{o=o||{};c=c||'k';return '<line x1="'+x1.toFixed(1)+'" y1="'+y1.toFixed(1)+'" x2="'+x2.toFixed(1)+'" y2="'+y2.toFixed(1)+'" stroke="'+COL[c]+'" stroke-width="'+(o.sw||1.6)+'"'+(o.dash?' stroke-dasharray="'+o.dash+'"':'')+(o.noarrow?'':' marker-end="url(#'+id+'-'+c+')"')+'/>'};
  // register a figure: draw(W) returns [svgBody, height]
  function fig(elId,label,draw){
    const el=document.getElementById(elId);if(!el)return;
    const go=()=>{const W=Math.max(280,Math.min(880,RD.width(el)));const r=draw(W);el.innerHTML=RD.svg(W,Math.ceil(r[1]),r[0],label)};
    go();RD.onRender(go);RD.onResize(go);
  }
  return {wrap,text,lines,rect,defs,line,fig,CW};
})();

(function(){
  const F=TLF,D=window.D,fmt=n=>Number(n).toLocaleString('en-US');

  // ---- hero: one round trip, three properties ----
  F.fig('tl-hero','The TLS 1.3 handshake: key shares, certificate and signature, Finished, then encrypted records',W=>{
    const id='tlh',m=4,colW=Math.min(170,W*0.3),cx=m+colW/2,sx=W-m-colW/2,gap=sx-cx;
    let s=F.defs(id);
    s+=F.rect(m,4,colW,44,{fill:'var(--soft)'})+F.text(cx,21,'Client',{a:'middle',w:600})+F.text(cx,37,'trust store: roots',{a:'middle',fs:11,fill:'var(--acc)'});
    s+=F.rect(W-m-colW,4,colW,44,{fill:'var(--soft)'})+F.text(sx,21,'Server',{a:'middle',w:600})+F.text(sx,37,W<420?'key + chain':'private key + cert chain',{a:'middle',fs:11});
    const msgs=[
      {d:1,t:'(1) ClientHello + key share',enc:false},
      {d:-1,t:'(1) ServerHello + key share',enc:false},
      {sec:true},
      {d:-1,t:'(2) Certificate chain + CertificateVerify',enc:true,chk:true},
      {d:-1,t:'(3) Finished: MAC of the transcript',enc:true},
      {d:1,t:'(3) Finished + (4) the request',enc:true},
      {d:-1,t:'(4) streamed tokens, one AEAD record each',enc:true}];
    let y=62;const ys=[];
    msgs.forEach(g=>{
      if(g.sec){
        const lab=F.wrap('both compute the same secret; it never crosses the wire',gap-30);
        s+=F.rect(cx-24,y-2,48,20,{fill:'var(--acc2)',stroke:'var(--acc)'})+F.text(cx,y+12,'secret',{a:'middle',fs:11,w:600})+
           F.rect(sx-24,y-2,48,20,{fill:'var(--acc2)',stroke:'var(--acc)'})+F.text(sx,y+12,'secret',{a:'middle',fs:11,w:600});
        const L=F.lines((cx+sx)/2,y+12-(lab.length-1)*6.5,lab,{a:'middle',fs:11,fill:'var(--mute)'});s+=L[0];
        y+=Math.max(30,L[1]+12);return}
      const lab=F.wrap(g.t,gap-20);
      const L=F.lines((cx+sx)/2,y,lab,{a:'middle',fs:11,fill:g.enc?'var(--ink)':'var(--ink)'});s+=L[0];
      const ay=y+L[1]-4;ys.push(ay);
      s+=g.d>0?F.line(cx+2,ay,sx-4,ay,id,g.enc?'b':'k',{dash:g.enc?'':'5 3'}):F.line(sx-2,ay,cx+4,ay,id,g.enc?'b':'k',{dash:g.enc?'':'5 3'});
      y=ay+18;
      if(g.chk){const t=F.wrap('client checks the chain up to a root in its store, the dates and the name',gap-20);
        const L2=F.lines((cx+sx)/2,y-2,t,{a:'middle',fs:11,fill:'var(--acc)',w:600});s+=L2[0];y+=L2[1]+4}
    });
    // lifelines behind everything
    s=s.replace('</defs>','</defs><line x1="'+cx+'" y1="48" x2="'+cx+'" y2="'+(y-4)+'" stroke="var(--line)" stroke-width="2"/><line x1="'+sx+'" y1="48" x2="'+sx+'" y2="'+(y-4)+'" stroke="var(--line)" stroke-width="2"/>');
    // one round trip bracket on the far right of the server column
    const bx=sx+colW/2-10,y0=ys[0],y1=ys[4];
    s+='<path d="M'+(bx-6)+' '+y0+' H'+bx+' V'+y1+' H'+(bx-6)+'" fill="none" stroke="var(--mute)"/>'+'<text transform="translate('+(bx+3)+','+((y0+y1)/2)+') rotate(90)" text-anchor="middle" font-size="11" fill="var(--mute)">1 round trip</text>';
    // legend
    y+=6;s+=F.line(m,y,m+26,y,id,'k',{dash:'5 3',noarrow:true})+F.text(m+32,y+4,'readable by anyone',{fs:11,fill:'var(--mute)'});
    const lx=Math.min(W/2,m+170);s+=F.line(lx,y,lx+26,y,id,'b',{noarrow:true})+F.text(lx+32,y+4,'encrypted',{fs:11,fill:'var(--mute)'});
    return [s,y+12];
  });

  // ---- one record to scale ----
  F.fig('tl-aead','The 277-byte request inside a 299-byte TLS record: 5-byte header, 278 bytes of ciphertext, 16-byte tag',W=>{
    const m=2,tot=299,px=(W-2*m)/tot;let s='';
    const y1=18,h=26;
    s+=F.text(m,12,'plaintext: the HTTP request, 277 bytes',{fs:11,fill:'var(--mute)'});
    s+=F.rect(m+5*px,y1,277*px,h,{fill:'var(--hl)',stroke:'var(--c5)',rx:3})+F.text(m+(5+277/2)*px,y1+17,'POST /v1/messages ...',{a:'middle',fs:11});
    const y2=y1+h+30;
    s+='<path d="M'+(m+5*px)+' '+(y1+h)+' L'+(m+5*px)+' '+y2+' M'+(m+282*px)+' '+(y1+h)+' L'+(m+283*px)+' '+y2+'" stroke="var(--mute)" stroke-dasharray="3 3" fill="none"/>';
    s+=F.text(m+12*px,y1+h+19,'AEAD encrypt',{fs:11,fill:'var(--acc)',w:600});
    s+=F.rect(m,y2,5*px,h,{fill:'var(--hl)',stroke:'var(--c5)',rx:2})+F.rect(m+5*px,y2,277*px,h,{fill:'var(--acc2)',stroke:'var(--acc)',rx:2})+
       F.rect(m+282*px,y2,1*px+1,h,{fill:'var(--c6)',stroke:'var(--c6)',rx:0})+F.rect(m+283*px,y2,16*px,h,{fill:'var(--acc)',stroke:'var(--acc)',rx:2});
    s+=F.text(m+(5+277/2)*px,y2+17,'ciphertext',{a:'middle',fs:11});
    const y3=y2+h;
    // leaders and labels
    s+='<path d="M'+(m+2.5*px)+' '+y3+' V'+(y3+14)+'" stroke="var(--mute)"/>'+F.text(m,y3+26,'header 5 B, in clear',{fs:11,fill:'var(--mute)'});
    s+='<path d="M'+(m+291*px)+' '+y3+' V'+(y3+14)+'" stroke="var(--mute)"/>'+F.text(W-m,y3+26,'+16 B tag',{a:'end',fs:11,fill:'var(--mute)'});
    s+='<path d="M'+(m+282.5*px)+' '+y2+' V'+(y2-10)+'" stroke="var(--mute)" fill="none"/>'+F.text(m+282.5*px-4,y2-4,'+1 B hidden content type',{a:'end',fs:11,fill:'var(--mute)'});
    s+=F.text(m,y3+42,'record on the wire: 5 + 294 = 299 bytes, drawn to scale',{fs:11,fill:'var(--mute)'});
    return [s,y3+44];
  });

  // ---- key schedule, simplified ----
  F.fig('tl-ks','Key derivation: the shared secret, an optional PSK and the transcript hash go into HKDF, which yields every key',W=>{
    const id='tlk',m=2;let s=F.defs(id);
    const ins=[['shared secret','from the key exchange'],['transcript hash','every handshake byte so far'],['PSK','only when resuming']];
    const n=3,g=8,iw=(W-2*m-(n-1)*g)/n,ih=W<520?58:44;
    ins.forEach((t,i)=>{const x=m+i*(iw+g);s+=F.rect(x,4,iw,ih,{fill:i===0?'var(--acc2)':'var(--soft)',stroke:i===0?'var(--acc)':'var(--line)',dash:i===2?'4 3':''});
      s+=F.text(x+iw/2,21,t[0],{a:'middle',w:600,fs:11});s+=F.lines(x+iw/2,36,F.wrap(t[1],iw-8).slice(0,2),{a:'middle',fs:11,fill:'var(--mute)'})[0];
      s+=F.line(x+iw/2,ih+4,W/2+(i-1)*Math.min(30,iw/4),ih+30,id,i===0?'b':'k',{dash:i===2?'4 3':''})});
    const hy=ih+32,hw=Math.min(240,W-2*m);
    s+=F.rect(W/2-hw/2,hy,hw,30,{fill:'var(--acc)',stroke:'var(--acc)'})+F.text(W/2,hy+19,'HKDF (extract, then expand)',{a:'middle',w:600,fs:11,fill:'var(--bg)'});
    const outs=[['client handshake key','encrypts the client Finished'],['server handshake key','encrypts the Certificate to Finished'],['Finished keys','MAC over the transcript'],['client application key','the request'],['server application key','the streamed tokens'],['resumption secret','becomes the next ticket']];
    const cols=W<520?2:3,ow=(W-2*m-(cols-1)*g)/cols,oh=W<520?58:44,by=hy+48;
    s+='<line x1="'+(W/2)+'" y1="'+(hy+30)+'" x2="'+(W/2)+'" y2="'+(by-8)+'" stroke="var(--acc)" stroke-width="1.6"/>';
    const xs=[];for(let c=0;c<cols;c++)xs.push(m+c*(ow+g)+ow/2);
    s+='<line x1="'+xs[0]+'" y1="'+(by-8)+'" x2="'+xs[cols-1]+'" y2="'+(by-8)+'" stroke="var(--acc)" stroke-width="1.6"/>';
    outs.forEach((t,i)=>{const r=Math.floor(i/cols),c=i%cols,x=m+c*(ow+g),y=by+r*(oh+g);
      if(r===0)s+=F.line(xs[c],by-8,xs[c],y-1,id,'b');
      s+=F.rect(x,y,ow,oh,{fill:i===5?'var(--soft)':'var(--acc2)',stroke:i===5?'var(--line)':'var(--acc)'});
      s+=F.text(x+ow/2,y+18,F.wrap(t[0],ow-6)[0],{a:'middle',w:600,fs:11});s+=F.lines(x+ow/2,y+33,F.wrap(t[1],ow-8).slice(0,2),{a:'middle',fs:11,fill:'var(--mute)'})[0]});
    const rows=Math.ceil(outs.length/cols);
    return [s,by+rows*(oh+g)];
  });

  // ---- full, resumed, 0-RTT ----
  F.fig('tl-res','Three handshakes compared: full, resumed with a ticket, and 0-RTT early data with a replay',W=>{
    const id='tlr',wide=W>=660,g=12,pw=wide?(W-2*g)/3:W,m=2;let s=F.defs(id),H=0;
    const P=[
      {t:'Full handshake',msgs:[[1,'ClientHello + key share','k'],[-1,'ServerHello, Certificate, CertificateVerify, Finished','k'],[1,'Finished + request','b']],note:'request leaves after 1 round trip'},
      {t:'Resumed with a ticket',msgs:[[1,'ClientHello + key share + ticket (PSK)','k'],[-1,'ServerHello, Finished: no certificate, no signature','k'],[1,'Finished + request','b']],note:'still 1 round trip; less CPU'},
      {t:'0-RTT early data',msgs:[[1,'ClientHello + ticket + the request (early data)','r'],[-1,'ServerHello, Finished','k'],[0,'attacker resends the same first flight','r']],note:'request leaves at once; it can be replayed'}];
    P.forEach((p,k)=>{
      const x0=wide?k*(pw+g):0,y0=wide?0:H,cx=x0+m+22,sx=x0+pw-m-22,gap=sx-cx;
      let y=y0+16;let b=F.text(x0+m,y,p.t,{w:600,fs:11.5});y+=10;
      b+=F.text(cx,y+12,'C',{a:'middle',w:600,fs:11})+F.text(sx,y+12,'S',{a:'middle',w:600,fs:11});
      const top=y+18;y=top+16;
      p.msgs.forEach(mm=>{
        const lab=F.wrap(mm[1],gap-14);const L=F.lines((cx+sx)/2,y,lab,{a:'middle',fs:11,fill:mm[2]==='r'?'var(--bad)':'var(--ink)'});b+=L[0];
        const ay=y+L[1]-4;
        if(mm[0]>0)b+=F.line(cx+2,ay,sx-4,ay,id,mm[2]);else if(mm[0]<0)b+=F.line(sx-2,ay,cx+4,ay,id,mm[2]);
        else b+=F.line(cx+gap*0.15,ay,sx-4,ay,id,'r',{dash:'4 3'});
        y=ay+16});
      b='<line x1="'+cx+'" y1="'+top+'" x2="'+cx+'" y2="'+(y-6)+'" stroke="var(--line)" stroke-width="2"/><line x1="'+sx+'" y1="'+top+'" x2="'+sx+'" y2="'+(y-6)+'" stroke="var(--line)" stroke-width="2"/>'+b;
      const nl=F.wrap(p.note,pw-8);const L=F.lines(x0+m,y+6,nl,{fs:11,fill:k===2?'var(--bad)':'var(--acc)',w:600});b+=L[0];y+=6+L[1];
      if(wide)b=F.rect(x0,y0,pw,0.1,{fill:'none',stroke:'none'})+b;
      s+=b;H=wide?Math.max(H,y+4):y+16;
    });
    return [s,H];
  });

  // ---- the api.anthropic.com chain and two paths to a root ----
  F.fig('tl-chain','The certificate chain served by api.anthropic.com on 5 October 2026 and the two paths a client can build to a trusted root',W=>{
    const id='tlc',m=2,h=D.pub.hosts.find(x=>x.host==='api.anthropic.com'),C=h.chain,short=s=>{const r=/CN=([^,]+)/.exec(s);return r?r[1]:s};
    const wide=W>=600,bw=wide?Math.min(360,W*0.52):W-2*m,ax=m+bw+14;let s=F.defs(id),y=4;
    const roles=['leaf (the server)','intermediate (issues leaves)','cross-signed root certificate'];
    const checks=[['(3) name dialled is in the SANs','(4) EKU includes serverAuth','(5) '+C[0].scts+' SCTs for Chrome'],['(1) CA:TRUE, signature checks'],['(1) is it a root in my store?']];
    const pos=[];
    C.forEach((c,i)=>{
      const bh=(i===0&&!wide)?64:50;s+=F.rect(m,y,bw,bh,{fill:i===0?'var(--acc2)':'var(--soft)',stroke:i===0?'var(--acc)':'var(--line)'});
      s+=F.text(m+8,y+17,(i+1)+'. '+short(c.subject),{w:600,fs:11.5});
      s+=F.text(m+8,y+32,roles[i],{fs:11,fill:'var(--mute)'});
      s+=F.text(m+8,y+45,F.wrap('(2) valid to '+c.not_after+', '+Math.round(c.validity_days)+' days',bw-14)[0],{fs:11,fill:'var(--mute)'});
      if(i===0&&!wide)s+=F.text(m+8,y+59,F.wrap('(3) name in SANs, (4) serverAuth, (5) '+C[0].scts+' SCTs',bw-14)[0],{fs:11,fill:'var(--acc)'});
      if(wide)checks[i].forEach((t,j)=>{s+=F.text(ax,y+15+j*14,t,{fs:11,fill:'var(--acc)'})});
      pos.push([y,bh]);y+=bh;
      if(i<C.length-1){s+=F.line(m+bw/2,y+22,m+bw/2,y+3,id,'k')+F.text(m+bw/2+8,y+16,'signed by',{fs:11,fill:'var(--mute)'});y+=24}
    });
    // trust store
    y+=34;const sy=y,sw=W-2*m;
    s+=F.rect(m,sy,sw,62,{fill:'none',stroke:'var(--good)',dash:'5 3'})+F.text(m+8,sy+15,'a client trust store',{fs:11,w:600,fill:'var(--good)'});
    const ew=(sw-24)/2,e1=m+8,e2=m+16+ew;
    s+=F.rect(e1,sy+22,ew,32,{fill:'var(--soft)',stroke:'var(--good)'})+F.text(e1+ew/2,sy+42,F.wrap('GTS Root R4',ew-6)[0],{a:'middle',fs:11,w:600});
    s+=F.rect(e2,sy+22,ew,32,{fill:'var(--soft)',stroke:'var(--good)'})+F.text(e2+ew/2,sy+42,F.wrap(short(C[C.length-1].issuer),ew-6)[0],{a:'middle',fs:11,w:600});
    const by=pos[C.length-1][0]+pos[C.length-1][1];
    const xa=e1+ew/2,xb=e2+ew/2;
    s+=F.line(xa,by+2,xa,sy+20,id,'g')+F.text(xa+6,by+14,'A: same name, key',{fs:11,fill:'var(--good)'});
    s+=F.line(Math.min(xb,m+bw-10),by+2,xb,sy+20,id,'g',{dash:'4 3'})+F.text(xb-6,by+28,'B: older clients',{a:'end',fs:11,fill:'var(--good)'});
    return [s,sy+66];
  });

  // ---- revocation paths ----
  F.fig('tl-rev','Three ways to stop trusting a certificate: ask the CA online, push aggregated lists to browsers, or let it expire',W=>{
    const id='tlv',m=2,g=22,bw=(W-2*m-2*g)/3;let s=F.defs(id),y=0;
    const L=[
      {t:'OCSP: ask the CA online, per certificate',b:['client library','asks: revoked?','OCSP responder'],c:'r',n:'slow, fails open, tells the CA which sites you visit; Let\'s Encrypt turned its responders off on 6 August 2025'},
      {t:'Push lists: browsers only',b:['CAs publish CRLs','Chrome, Mozilla aggregate','browser gets CRLSets, CRLite'],c:'k',n:'Python, Go, curl and Node check nothing by default'},
      {t:'Short lifetimes: nothing to check',b:['CA issues 6 to 47 days','renewal stops','certificate expires'],c:'g',n:'the direction of travel; for mTLS, hour-long certificates'}];
    L.forEach((l,k)=>{
      y+=15;s+=F.text(m,y,l.t,{w:600,fs:11.5});y+=8;
      const bh=Math.max(32,Math.max(...l.b.map(t=>F.wrap(t,bw-8).length))*13+10);
      l.b.forEach((t,i)=>{const x=m+i*(bw+g),mid=i===1&&k===0;
        const lab=F.wrap(t,bw-8);
        s+=F.rect(x,y,bw,bh,{fill:mid?'none':'var(--soft)',stroke:mid?'none':(k===2?'var(--good)':'var(--line)')});
        s+=F.lines(x+bw/2,y+bh/2+4-(lab.length-1)*6.5,lab,{a:'middle',fs:11,fill:mid?'var(--bad)':'var(--ink)'})[0];
        if(i<2)s+=F.line(x+bw+2,y+16,x+bw+g-3,y+16,id,l.c)});
      y+=bh+8;const nl=F.wrap(l.n,W-2*m);const N=F.lines(m,y+6,nl,{fs:11,fill:'var(--mute)'});s+=N[0];y+=N[1]+8;
    });
    return [s,y];
  });

  // ---- where TLS terminates ----
  F.fig('tl-term','A serving path with each hop: who terminates TLS and sees plaintext',W=>{
    const id='tlt',m=2,bw=Math.min(220,W*0.44),tx=m+bw+12,tw=W-tx-m;let s=F.defs(id),y=2;
    const hops=[['client','your code or an agent',0],['cloud load balancer','ALB terminates; NLB in TCP mode passes through',1],['ingress','re-encrypts, or not',1],['sidecar or ztunnel','the mesh does mTLS for the pod',1],['model server','vLLM, Triton: the endpoint',0]];
    const links=[['TLS, public certificate','b'],['TLS, often unverified; client certificate only as a header','k'],['mesh mTLS (SPIFFE IDs)','b'],['plaintext on localhost','r']];
    hops.forEach((h,i)=>{
      const sub=F.wrap(h[1],bw-14),bh=26+13*sub.length;s+=F.rect(m,y,bw,bh,{fill:'var(--soft)',stroke:h[2]?'var(--bad)':'var(--line)'});
      s+=F.text(m+8,y+17,h[0],{w:600,fs:11.5});s+=F.lines(m+8,y+31,sub,{fs:11,fill:'var(--mute)'})[0];
      if(h[2]){const t=F.wrap('terminates: sees prompts and keys in plaintext',tw);s+=F.lines(tx,y+16-(t.length>2?6:0),t.slice(0,3),{fs:11,fill:'var(--bad)'})[0]}
      y+=bh;
      if(i<links.length){const lk=links[i],lab=F.wrap(lk[0],tw);const lh=Math.max(30,lab.length*13+8);
        s+=F.line(m+28,y+2,m+28,y+lh-3,id,lk[1]==='r'?'r':lk[1],{dash:lk[1]==='r'?'4 3':''});
        s+=F.lines(m+40,y+lh/2+4-(lab.length-1)*6.5,lab.length>2&&tw>bw?F.wrap(lk[0],W-m-44):lab,{fs:11,fill:lk[1]==='r'?'var(--bad)':(lk[1]==='b'?'var(--acc)':'var(--mute)')})[0];
        y+=lh}
    });
    return [s,y+4];
  });

  // ---- TLS inspection: who trusts the re-signed certificate ----
  F.fig('tl-insp','A TLS-inspecting proxy re-signs certificates with a company root; only clients that read the OS store trust it',W=>{
    const id='tli',m=2,g=26,bw=(W-2*m-2*g)/3;let s=F.defs(id),y=4;
    const B=[['your client','pip, requests, a browser'],['inspecting proxy','re-signs with the company root'],['real server','public CA chain']];
    const nl=Math.max(...B.map(b=>F.wrap(b[0],bw-6).length+F.wrap(b[1],bw-8).length)),bh=12+13*nl;
    B.forEach((b,i)=>{const x=m+i*(bw+g);s+=F.rect(x,y,bw,bh,{fill:i===1?'var(--hl)':'var(--soft)',stroke:i===1?'var(--c5)':'var(--line)'});
      const t=F.wrap(b[0],bw-6),u=F.wrap(b[1],bw-8);s+=F.lines(x+bw/2,y+17,t,{a:'middle',w:600,fs:11})[0]+F.lines(x+bw/2,y+17+13*t.length,u,{a:'middle',fs:11,fill:'var(--mute)'})[0];
      if(i<2)s+=F.line(x+bw+2,y+bh/2,x+bw+g-3,y+bh/2,id,'k')});
    y+=bh+22;
    s+=F.text(m,y,'Does the client trust the proxy\'s certificate?',{w:600,fs:11.5});y+=8;
    const R=[['browser','OS store: has the company root','trusted','g'],['Python with certifi','certifi bundle: lacks it','fails','r'],['Node','built-in Mozilla list: lacks it','fails','r'],['Docker container','the image\'s store: lacks it','fails','r']];
    const c1=Math.min(150,W*0.3),c3=Math.min(80,W*0.2),c2=W-2*m-c1-c3;
    R.forEach(r=>{y+=6;const a=F.wrap(r[0],c1-6),b=F.wrap(r[1],c2-6);const n=Math.max(a.length,b.length),rh=n*13+8;
      s+=F.rect(m,y,W-2*m,rh,{fill:'none',stroke:'var(--line)',rx:4});
      s+=F.lines(m+6,y+15,a,{fs:11,w:600})[0]+F.lines(m+c1,y+15,b,{fs:11,fill:'var(--mute)'})[0]+F.text(W-m-6,y+15,r[2],{a:'end',fs:11,w:600,fill:r[3]==='g'?'var(--good)':'var(--bad)'});
      y+=rh});
    return [s,y+4];
  });
})();
