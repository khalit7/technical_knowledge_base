// ---- Reading: static figures added on 2026-10-24 (hero, zone tree, lost-packet bars, split horizon). Drawn at the measured width. ----
(function(){
  const esc=RD.esc,T=RD.t;
  const box=(x,y,w,h,o)=>{o=o||{};return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="7" fill="'+(o.fill||'var(--soft)')+'" stroke="'+(o.stroke||'var(--line)')+'" stroke-width="'+(o.sw||1)+'"/>'};
  const arrow=(x1,y1,x2,y2,col,dash)=>{const a=Math.atan2(y2-y1,x2-x1),L=7;
    return '<line x1="'+x1+'" y1="'+y1+'" x2="'+(x2-Math.cos(a)*4)+'" y2="'+(y2-Math.sin(a)*4)+'" stroke="'+(col||'var(--mute)')+'" stroke-width="1.4"'+(dash?' stroke-dasharray="4 3"':'')+'/>'+
      '<path d="M'+x2+' '+y2+' L'+(x2-L*Math.cos(a-0.45))+' '+(y2-L*Math.sin(a-0.45))+' L'+(x2-L*Math.cos(a+0.45))+' '+(y2-L*Math.sin(a+0.45))+' z" fill="'+(col||'var(--mute)')+'"/>'};
  const tag=(x,y,s,anchor)=>T(x,y,esc(s),{a:anchor,fs:11,fill:'var(--bad)',w:600});
  const set=(id,f)=>{const el=document.getElementById(id);if(!el)return;const draw=()=>{el.innerHTML=f(RD.width(el))};draw();RD.onRender(draw);RD.onResize(draw)};

  // Hero: process, resolver with its cache, three authoritative servers; the four failure causes where they happen.
  set('hr-svg',w=>{
    const n=w<560,P=8,bw=w-2*P;let b='';
    const yP=6,hP=n?70:58,yR=yP+hP+56,hR=n?84:70,yA=yR+hR+58,hA=n?92:62;
    b+=box(P,yP,bw,hP);
    b+=T(P+10,yP+18,n?'Your process (Python, curl, Node)':'Your process: Python, curl, Node, a gRPC channel',{fs:12,w:600});
    b+=T(P+10,yP+35,n?'getaddrinfo(): the stub; reads resolv.conf':'getaddrinfo() = the stub resolver; reads /etc/resolv.conf',{fs:11});
    b+=T(P+10,yP+50,'no cache in glibc or musl',{fs:11,fill:'var(--mute)'});
    if(n){b+=tag(P+10,yP+65,'search list: 1 name = 8 queries; lost packet = 5 s')}
    else{b+=tag(w-P-10,yP+35,'search list: 1 name = 8 queries',"end");b+=tag(w-P-10,yP+50,'one lost packet = a 5 s timer',"end")}
    // arrow 1
    const xa=P+bw*0.3;b+=arrow(xa,yP+hP+2,xa,yR-2,'var(--ink)')+arrow(xa+18,yR-2,xa+18,yP+hP+2,'var(--mute)',1);
    b+=T(xa+28,yP+hP+22,'1  recursive question (RD set)',{fs:11,w:600})+T(xa+28,yP+hP+38,'answer, from cache if it can',{fs:11,fill:'var(--mute)'});
    if(!n)b+=tag(w-P-10,yP+hP+30,'wrong resolver asked: split horizon',"end");
    // resolver with cache
    b+=box(P,yR,bw,hR,{stroke:'var(--acc)',sw:1.6});
    b+=T(P+10,yR+18,n?'Recursive resolver (CoreDNS, 1.1.1.1)':'Recursive resolver: CoreDNS, the VPC resolver, 1.1.1.1',{fs:12,w:600});
    b+=T(P+10,yR+36,n?'cache: api.llm.test A 10.53.0.80, TTL 60':'cache: api.llm.test A 10.53.0.80, TTL 60 counting down; test. and llm.test. NS for days',{fs:11,fill:'var(--acc)',w:600});
    b+=T(P+10,yR+52,n?'cache: "no" for min(SOA TTL, MINIMUM)':'cache: "no such name" for min(SOA TTL, MINIMUM)',{fs:11,fill:'var(--acc)',w:600});
    if(n){b+=tag(P+10,yR+70,'cached old answer; wrong resolver asked')}else b+=tag(w-P-10,yR+18,'stale cached answer',"end");
    // three authoritative servers
    const g=8,aw=(bw-2*g)/3,L=[['Root  .',n?['refers to','test.']:['referral: test. is at','ns1.nic.test + glue']],['test.',n?['refers to','llm.test.']:['referral: llm.test. is at','ns1.llm.test + glue']],['llm.test.',n?['answers','A 10.53.0.80']:['answers (aa flag):','A 10.53.0.80, TTL 60']]];
    L.forEach((z,i)=>{const x=P+i*(aw+g);b+=box(x,yA,aw,hA);b+=T(x+8,yA+18,esc(z[0]),{fs:12,w:600});b+=T(x+8,yA+35,esc(z[1][0]),{fs:11});b+=T(x+8,yA+51,esc(z[1][1]),{fs:11});
      if(n&&i===0)b+=T(x+8,yA+68,'all three:',{fs:11,fill:'var(--mute)'});
      if(n&&i===0)b+=T(x+8,yA+84,'authoritative',{fs:11,fill:'var(--mute)'});
      const xs=P+bw*(0.55+i*0.12),xe=x+aw/2;b+=arrow(xs,yR+hR+2,xe,yA-2,'var(--ink)');
      b+=T((xs+xe)/2+(i===0?-6:6),yR+hR+30,String(i+2),{a:i===0?'end':'start',fs:11,w:600})});
    if(!n)b+=T(P+10,yR+hR+22,'2 to 4: only on a cache miss',{fs:11,fill:'var(--mute)'});
    if(!n)b+=T(P+10,yA+hA+16,'authoritative servers: each answers for one zone and never asks anyone else',{fs:11,fill:'var(--mute)'});
    else b+=T(P+10,yA+hA+16,'2 to 4: only on a cache miss',{fs:11,fill:'var(--mute)'});
    return RD.svg(w,yA+hA+24,b,'One DNS lookup: process, recursive resolver with its cache, three authoritative servers');
  });

  // Zone tree: the lab and the real DNS, same shape.
  set('tr-svg',w=>{
    const two=w>=600,pw=two?(w-12)/2:w,lh=58,gap=34;let b='';
    const trees=[['Lab tree (measured)',[['.','root: a.root-servers.test','10.53.0.10'],['test.','ns1.nic.test','10.53.0.11'],['llm.test.','ns1.llm.test','10.53.0.12'],['api.llm.test','A 10.53.0.80','TTL 60']],['NS + glue in .','NS + glue in test.','A record in llm.test.']],
      ['Real tree (5 Oct 2026)',[['.','13 names a to m.root-servers.net','2,045 machines, anycast'],['com.','a to m.gtld-servers.net','delegated with TTL 172,800 s'],['anthropic.com.','isla, randy.ns.cloudflare.com','Cloudflare runs the zone'],['api.anthropic.com','A 160.79.104.10','']],['NS in the root zone, 48 h','NS in com., 48 h','A record in anthropic.com.']]];
    const H=26+4*lh+3*gap;
    trees.forEach((t,k)=>{const ox=two?k*(pw+12):0,oy=two?0:k*(H+10);b+=T(ox+4,oy+14,esc(t[0]),{fs:12,w:600});
      t[1].forEach((z,i)=>{const y=oy+24+i*(lh+gap),last=i===3;b+=box(ox+4,y,pw-8,lh,{fill:last?'var(--bg)':'var(--acc2)',stroke:last?'var(--line)':'var(--acc)'});
        b+=T(ox+14,y+18,esc(z[0]),{fs:12,w:600});b+=T(ox+14,y+34,esc(z[1]),{fs:11});if(z[2])b+=T(ox+14,y+49,esc(z[2]),{fs:11,fill:'var(--mute)'});
        if(i<3){b+=arrow(ox+30,y+lh+2,ox+30,y+lh+gap-2,'var(--ink)');b+=T(ox+40,y+lh+gap/2+4,esc(t[2][i]),{fs:11,fill:i===2?'var(--mute)':'var(--ink)'})}});
    });
    return RD.svg(w,two?H:2*H+10,b,'The zone tree in the lab and in the real DNS');
  });

  // Section 6: one lost packet under four configurations, one scale.
  set('dp-svg',w=>{
    if(!window.PODX)return '';const by=PODX.by,fmt=PODX.fmt;
    const R=[['glibc_drop_aaaa','glibc, defaults (timeout:5 attempts:2)','#2f6fb5'],['glibc_drop_aaaa_sr','glibc, options single-request-reopen','#2f6fb5'],['musl_drop_aaaa','musl, defaults: resends every 5 / 2 s','#3f7f56'],['glibc_drop_aaaa_t1','glibc, options timeout:1','#2f6fb5']];
    const mx=Math.max(...R.map(r=>by[r[0]].calls[0].ms)),L=6,bw=w-L-70,x=v=>L+bw*v/mx;let b='';
    R.forEach((r,i)=>{const ms=by[r[0]].calls[0].ms,y=6+i*40;b+=T(L,y+12,esc(r[1]),{fs:11});
      b+='<rect x="'+L+'" y="'+(y+17)+'" width="'+Math.max(2,x(ms)-L)+'" height="14" fill="'+r[2]+'" opacity=".85"/>'+T(x(ms)+5,y+29,fmt(ms),{fs:11,w:600})});
    for(let s=0;s<=5;s++){const xx=x(s*1000);if(xx>w-40)break;b+='<line x1="'+xx+'" x2="'+xx+'" y1="'+(6+4*40)+'" y2="'+(6+4*40+4)+'" stroke="var(--mute)"/>'+T(xx,6+4*40+16,s+' s',{a:s?'middle':'start',fs:11,fill:'var(--mute)'})}
    return RD.svg(w,6+4*40+22,b,'Duration of getaddrinfo with one lost packet');
  });

  // Section 8: split horizon.
  set('sh-svg',w=>{
    const two=w>=560,cw=two?(w-12)/2:w,bh=46,gp=26;let b='';
    const C=[['Inside the VPC (pod, laptop on the VPN)','VPC resolver','private hosted zone','models.example.com A 192.0.2.10','var(--good)'],
      ['Outside: a CI runner on the internet','public resolver','public zone example.com','models.example.com: NXDOMAIN','var(--bad)']];
    const H=3*bh+2*gp+22;
    C.forEach((c,k)=>{const ox=two?k*(cw+12):0,oy=two?0:k*(H+8);b+=T(ox+4,oy+13,esc(c[0]),{fs:11,w:600});
      [c[1],c[2]].forEach((s,i)=>{const y=oy+20+i*(bh+gp);b+=box(ox+4,y,cw-8,bh);b+=T(ox+14,y+20,esc(s),{fs:12,w:600});
        b+=T(ox+14,y+36,i?'answers for the name':'asked: A? models.example.com',{fs:11,fill:'var(--mute)'});b+=arrow(ox+30,y+bh+2,ox+30,y+bh+gp-2,'var(--ink)')});
      const y=oy+20+2*(bh+gp);b+=box(ox+4,y,cw-8,bh,{stroke:c[4],sw:1.6,fill:'var(--bg)'});b+=T(ox+14,y+20,'the answer',{fs:11,fill:'var(--mute)'});b+=T(ox+14,y+37,esc(c[3]),{fs:12,w:600,fill:c[4]})});
    return RD.svg(w,two?H:2*H+8,b,'Split horizon: the same name answered differently inside and outside');
  });
})();
