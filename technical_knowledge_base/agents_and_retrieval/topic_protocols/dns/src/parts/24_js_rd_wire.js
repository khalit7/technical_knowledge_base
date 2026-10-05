// ---- Reading section 3: the recorded query and answers, parsed byte by byte in the browser; truncation; record table ----
(function(){
  const card=document.getElementById('wa-card');if(!card)return;const esc=RD.esc;
  const TY={1:'A',2:'NS',5:'CNAME',6:'SOA',28:'AAAA',41:'OPT',65:'HTTPS',16:'TXT'};
  const RC=['NOERROR','FORMERR','SERVFAIL','NXDOMAIN','NOTIMP','REFUSED'];
  function parse(hex){
    const b=[];for(let i=0;i<hex.length;i+=2)b.push(parseInt(hex.substr(i,2),16));
    const F=[];const u16=o=>b[o]*256+b[o+1];const u32=o=>((b[o]*16777216)+(b[o+1]<<16)+(b[o+2]<<8)+b[o+3]);
    const add=(s,l,c,name,desc)=>F.push({s,l,c,name,desc});
    add(0,2,'f0','ID','Transaction ID 0x'+hex.substr(0,4)+' ('+u16(0)+'). The answer must echo it; with the UDP source port it is all that matches an answer to its question.');
    const fl=u16(2);const bit=(n)=>(fl>>n)&1;
    const names=[];if(bit(15))names.push('QR (response)');if(bit(10))names.push('AA');if(bit(9))names.push('TC');if(bit(8))names.push('RD');if(bit(7))names.push('RA');if(bit(5))names.push('AD');if(bit(4))names.push('CD');
    add(2,2,'f0','Flags','0x'+hex.substr(4,4)+': '+(names.join(', ')||'none')+'; opcode '+((fl>>11)&15)+' (QUERY); response code '+(fl&15)+' ('+RC[fl&15]+'). '+(bit(15)?'':'QR clear: this is a question. RD set: "please recurse for me".'));
    const cnt=[u16(4),u16(6),u16(8),u16(10)];
    ['Question count','Answer count','Authority count','Additional count'].forEach((n,i)=>add(4+2*i,2,'f0',n,n+': '+cnt[i]+'.'));
    let o=12;
    function name(c,where){const st=o;let parts=[];let ptr=null;
      while(true){const L=b[o];if(L===0){o++;break}if((L&0xc0)===0xc0){ptr=((L&63)<<8)|b[o+1];o+=2;break}parts.push(String.fromCharCode.apply(null,b.slice(o+1,o+1+L)));o+=1+L}
      const nm=parts.join('.');
      if(ptr!==null&&!parts.length)add(st,2,'f5','Name (pointer)','Compression pointer 0x'+hex.substr(st*2,4)+': top two bits set, offset '+ptr+'. "The name written at byte '+ptr+'" ('+where+').');
      else add(st,o-st,c,'Name',where+': '+(nm||'.')+(ptr!==null?' followed by a pointer to byte '+ptr:'')+'. Written as length-prefixed labels'+(parts.length?' ('+parts.map(p=>p.length+' "'+p+'"').join(', ')+', then 0)':'')+'.');
    }
    for(let i=0;i<cnt[0];i++){name('f1','Question name');add(o,2,'f1','Type','Question type '+u16(o)+' ('+(TY[u16(o)]||'?')+').');o+=2;add(o,2,'f1','Class','Class '+u16(o)+' (IN, Internet).');o+=2}
    const secs=[['f2','Answer',cnt[1]],['f3','Authority',cnt[2]],['f4','Additional',cnt[3]]];
    secs.forEach(([c,sn,k])=>{for(let i=0;i<k;i++){name(c,sn+' record owner');const t=u16(o);
      if(t===41){add(o,2,c,'Type','Type 41: OPT, the EDNS(0) pseudo-record (RFC 6891).');o+=2;add(o,2,c,'UDP size','Advertised UDP payload size: '+u16(o)+' bytes (where the class field would be).');o+=2;
        add(o,4,c,'EDNS flags','Extended response code, version and flags (DO bit '+((b[o+2]>>7)&1)+'), in place of a TTL.');o+=4;const rl=u16(o);add(o,2,c,'Length','Options length: '+rl+'.');o+=2;if(rl){add(o,rl,c,'Options','EDNS options ('+rl+' bytes).');o+=rl}continue}
      add(o,2,c,'Type','Type '+t+' ('+(TY[t]||'?')+').');o+=2;add(o,2,c,'Class','Class IN.');o+=2;add(o,4,c,'TTL','TTL '+u32(o)+' seconds: how long a cache may keep this record (counted down by the resolver).');o+=4;
      const rl=u16(o);add(o,2,c,'Data length','Data length: '+rl+' bytes.');o+=2;
      if(t===1)add(o,rl,c,'Address','IPv4 address '+b.slice(o,o+4).join('.')+'.');else if(t===5){const save=o;name(c,'CNAME target');o=save}else add(o,rl,c,'Data',rl+' bytes of record data.');
      o=Math.max(o,0);o=(t===5)?o:o;if(t!==5)o+=rl;else{o=F[F.length-1].s+F[F.length-1].l}
    }});
    return {b,F};
  }
  let cur='q',sel=null;
  function show(){
    const W=DNSD.wire;const run=cur==='c'?W['www.llm.test']:W['api.llm.test'];const hex=cur==='q'?run.query:run.response;
    const P=parse(hex);const owner=new Array(P.b.length).fill(-1);P.F.forEach((f,i)=>{for(let j=f.s;j<f.s+f.l;j++)owner[j]=i});
    document.getElementById('wa-hex').innerHTML=P.b.map((x,j)=>'<span data-f="'+owner[j]+'" class="'+(owner[j]>=0?P.F[owner[j]].c:'')+(sel!==null&&owner[j]===sel?' sel':'')+'" title="byte '+j+'">'+(x<16?'0':'')+x.toString(16)+'</span>').join('');
    const f=sel!==null&&P.F[sel]?P.F[sel]:null;
    document.getElementById('wa-cap').innerHTML=f?'<div class="t">'+esc(f.name)+', bytes '+f.s+' to '+(f.s+f.l-1)+'</div><p>'+f.desc+'</p>':
      '<div class="t">'+P.b.length+' bytes'+(cur==='q'?', the whole question':'')+'</div><p>Click any byte. Header 12 bytes, then '+(cur==='q'?'the question and the EDNS OPT record':'the question repeated, the answer records and the OPT record')+'.</p>';
  }
  document.getElementById('wa-leg').innerHTML='<span style="--sw:color-mix(in srgb,var(--c1) 40%,transparent)">header</span><span style="--sw:color-mix(in srgb,var(--c2) 40%,transparent)">question</span><span style="--sw:color-mix(in srgb,var(--c3) 40%,transparent)">answer</span><span style="--sw:color-mix(in srgb,var(--c4) 40%,transparent)">authority</span><span style="--sw:color-mix(in srgb,var(--c5) 45%,transparent)">additional (OPT)</span><span style="--sw:color-mix(in srgb,var(--c6) 40%,transparent)">compression pointer</span>';
  document.getElementById('wa-hex').addEventListener('click',e=>{const s=e.target.closest('span[data-f]');if(!s)return;sel=+s.dataset.f;if(sel<0)sel=null;show()});
  RD.seg(document.getElementById('wa-pick'),m=>{cur=m;sel=null;show()});
  show();
  // truncation recording
  const T=DNSD.walk.trunc;const tr=document.getElementById('wa-trunc');
  if(tr)tr.textContent='$ dig pool.llm.test +noedns +ignore      (UDP, 512-byte limit, do not retry)\n'+T.udp_512_ignore_tc.trim()+'\n\n$ dig pool.llm.test +noedns              (same, dig retries over TCP)\n'+T.udp_512_then_tcp.trim()+'\n\n$ dig pool.llm.test +bufsize=1232        (EDNS, one UDP datagram)\n'+T.edns_1232.trim();
  // record table (section 4)
  const R=DNSD.walk.records;const body=document.getElementById('rr-rows');
  if(body){
    const ans=(k,re)=>{const s=R[k]||'';const L=s.split('\n').filter(l=>re.test(l));return L.map(l=>l.replace(/\s+/g,' ').trim()).join('\n')};
    const P=DNSD.pub;const pubLine=(s,t)=>((s||'').split('\n').find(l=>l.indexOf(' '+t+' ')>0)||'').replace(/\s+/g,' ');
    const rows=[
      ['A / AAAA','An IPv4 / IPv6 address',ans('api.llm.test A',/\sA\s/)+'\n'+ans('api.llm.test AAAA',/AAAA/),'getaddrinfo asks for both at once from one socket (sections 6 and 7). Several A records = the client picks; most try the first.'],
      ['CNAME','"This name is an alias of that one"',ans('www.llm.test A',/CNAME|\sA\s/),'The resolver follows it and returns both. No other data may sit beside a CNAME, so never at the apex (below).'],
      ['NS','The servers for a zone (a delegation)',ans('llm.test NS',/\sNS\s/),'In the parent: the delegation, cached for the parent\'s TTL. In the child: its own copy.'],
      ['SOA','Zone metadata: primary server, contact, serial, refresh, retry, expire, MINIMUM',ans('llm.test SOA',/SOA/),'The last field and the SOA\'s TTL set how long a "no" is cached (section 5). Bump the serial on every change.'],
      ['MX','Mail servers, with a preference',ans('llm.test MX',/\sMX\s/),'"0 ." is a null MX: this domain receives no mail (RFC 7505). Targets must not be CNAMEs.'],
      ['TXT','Free text, in strings of up to 255 bytes',(ans('selector1._domainkey.llm.test TXT',/TXT/).slice(0,150)+'..." "...'),'SPF, DKIM, DMARC and every "prove you own this domain" token. Long values must be split into strings (the 2048-bit DKIM key here is two).'],
      ['SRV','Service location: priority, weight, port, target',ans('_llm._tcp.llm.test SRV',/SRV/),'Named _service._proto.name. Kubernetes publishes one per named port of a service; few HTTP clients use it.'],
      ['CAA','Which certificate authorities may issue for the name',ans('llm.test CAA',/CAA/),'RFC 8659. Checked by every public CA before issuing (since September 2017).'],
      ['HTTPS / SVCB','How to connect: HTTP versions, port, address hints, ECH key; aliasing at the apex',ans('api.llm.test HTTPS',/HTTPS/)+'\npublic: '+pubLine(P.api_https,'HTTPS'),'RFC 9460 (2023). Lets a browser start with HTTP/3 and use Encrypted Client Hello.'],
      ['PTR','Address to name, under in-addr.arpa / ip6.arpa','(not in the lab zone)','Reverse lookups: mail servers and some cluster tools check them; nothing else should depend on them.'],
      ['DS, DNSKEY, RRSIG, NSEC','DNSSEC: key hashes, keys, signatures, proofs of non-existence','(section 9)','Added automatically by signing; you manage keys and the DS in the parent.'],
    ];
    body.innerHTML=rows.map(r=>'<tr><td><b>'+r[0]+'</b></td><td>'+r[1]+'</td><td><code style="white-space:pre-wrap;overflow-wrap:anywhere;font-size:11px">'+esc(r[2])+'</code></td><td>'+r[3]+'</td></tr>').join('');
  }
})();
