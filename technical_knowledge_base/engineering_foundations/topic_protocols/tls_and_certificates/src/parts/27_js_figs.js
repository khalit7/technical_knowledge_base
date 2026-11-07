// ---- Reading: static annotated figures (record, key schedule, revocation, termination, inspection; the hero, the resumption comparison and the chain became 3D stages on 2026-11-07) ----
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
