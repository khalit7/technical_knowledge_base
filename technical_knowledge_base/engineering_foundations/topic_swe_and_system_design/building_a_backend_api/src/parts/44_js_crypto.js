// ---- Reading, sections 11 and 13: SHA-256 and HMAC in plain JavaScript (FIPS 180-4, RFC 2104), a real JWT, a real webhook signature ----
window.CRY=(function(){
  const K=[0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  const utf8=s=>new TextEncoder().encode(s);
  function sha256(bytes){const l=bytes.length,n=((l+9+63)>>6)<<6,m=new Uint8Array(n);m.set(bytes);m[l]=0x80;const bl=l*8;
    for(let i=0;i<8;i++)m[n-1-i]=Math.floor(bl/Math.pow(2,8*i))&255;
    let h=[0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];const w=new Array(64);
    const r=(x,k)=>(x>>>k)|(x<<(32-k));
    for(let o=0;o<n;o+=64){for(let i=0;i<16;i++)w[i]=(m[o+4*i]<<24)|(m[o+4*i+1]<<16)|(m[o+4*i+2]<<8)|m[o+4*i+3];
      for(let i=16;i<64;i++){const s0=r(w[i-15],7)^r(w[i-15],18)^(w[i-15]>>>3),s1=r(w[i-2],17)^r(w[i-2],19)^(w[i-2]>>>10);w[i]=(w[i-16]+s0+w[i-7]+s1)|0}
      let [a,b,c,d,e,f,g,hh]=h;
      for(let i=0;i<64;i++){const S1=r(e,6)^r(e,11)^r(e,25),ch=(e&f)^(~e&g),t1=(hh+S1+ch+K[i]+w[i])|0,S0=r(a,2)^r(a,13)^r(a,22),mj=(a&b)^(a&c)^(b&c),t2=(S0+mj)|0;
        hh=g;g=f;f=e;e=(d+t1)|0;d=c;c=b;b=a;a=(t1+t2)|0}
      h=[a,b,c,d,e,f,g,hh].map((x,i)=>(x+h[i])|0)}
    const out=new Uint8Array(32);h.forEach((x,i)=>{out[4*i]=x>>>24;out[4*i+1]=(x>>>16)&255;out[4*i+2]=(x>>>8)&255;out[4*i+3]=x&255});return out}
  function hmac(key,msg){if(key.length>64)key=sha256(key);const k=new Uint8Array(64);k.set(key);
    const ip=k.map(x=>x^0x36),op=k.map(x=>x^0x5c);const a=new Uint8Array(64+msg.length);a.set(ip);a.set(msg,64);
    const ih=sha256(a),b=new Uint8Array(96);b.set(op);b.set(ih,64);return sha256(b)}
  const b64=u=>btoa(String.fromCharCode(...u));
  const b64url=u=>b64(u).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  const unb64url=s=>{s=s.replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';try{return decodeURIComponent(escape(atob(s)))}catch(e){return '(not valid base64url)'}};
  return {sha256,hmac,b64,b64url,unb64url,utf8};
})();
// JWT card
(function(){
  const D=window.API_DATA,J=D.jwt,esc=RD.esc,C=CRY;
  const pretty=s=>{try{return JSON.stringify(JSON.parse(s),null,1)}catch(e){return s}};
  // a tampered token: payload changed, signature kept
  const p=J.token.split('.');const tam=p[0]+'.'+C.b64url(C.utf8(JSON.stringify(Object.assign({},J.payload,{sub:'user_mallory'}))))+'.'+p[2];
  const toks={ok:J.token,tamper:tam,none:J.forged};
  function naive(t){const [h,pl,s]=t.split('.');let hd={};try{hd=JSON.parse(C.unb64url(h))}catch(e){}
    if(hd.alg==='none')return [true,'Header says alg "none", so a library that trusts the header skips the signature check: accepted. This is the attack.'];
    const ok=C.b64url(C.hmac(C.utf8(J.secret),C.utf8(h+'.'+pl)))===s;return [ok,ok?'HMAC matches.':'HMAC does not match.']}
  function strict(t){const [h,pl,s]=t.split('.');let hd={},py={};try{hd=JSON.parse(C.unb64url(h));py=JSON.parse(C.unb64url(pl))}catch(e){}
    if(hd.alg!=='HS256')return [false,'Rejected: algorithm "'+esc(hd.alg)+'" is not in the allowed list ["HS256"].'];
    const exp=C.b64url(C.hmac(C.utf8(J.secret),C.utf8(h+'.'+pl)));if(exp!==s)return [false,'Rejected: signature mismatch. Expected '+exp.slice(0,16)+'..., got '+esc((s||'').slice(0,16))+'...'];
    if(py.aud!=='chat-api'||py.iss!=='https://auth.chat.example.com')return [false,'Rejected: wrong issuer or audience.'];
    return [true,'Signature valid (HMAC-SHA256 recomputed in your browser), algorithm allowed, issuer and audience match. (Expiry is in the past: a real verifier would also reject it as expired at '+new Date(py.exp*1000).toISOString().slice(0,16).replace('T',' ')+' UTC; skipped here so the demo token stays valid.)']}
  function show(k){const t=toks[k],[h,pl,s]=t.split('.');
    document.getElementById('rd-jwt-tok').innerHTML='<span style="color:var(--c2)">'+esc(h)+'</span>.<span style="color:var(--c4)">'+esc(pl)+'</span>.<span style="color:var(--c3)">'+esc(s||'')+'</span>'+(s?'':'<span class="mute"> (empty signature)</span>');
    document.getElementById('rd-jwt-h').textContent=pretty(C.unb64url(h));document.getElementById('rd-jwt-p').textContent=pretty(C.unb64url(pl));
    const n=naive(t),st=strict(t);
    document.getElementById('rd-jwt-ver').innerHTML=[['A careless verifier (trusts the header)',n],['A correct verifier (algorithms=["HS256"], audience, issuer)',st]].map(x=>'<div><h4>'+x[0]+'</h4><p class="small" style="color:'+(x[1][0]?'var(--good)':'var(--bad)')+'"><b>'+(x[1][0]?'Accepted':'Rejected')+'</b></p><p class="small">'+x[1][1]+'</p></div>').join('')}
  RD.seg(document.getElementById('rd-jwt-seg'),show);show('ok');
  window.__JWT={toks,strict,naive};
})();
// webhook verifier
(function(){
  const W=window.API_DATA.webhook,C=CRY,esc=RD.esc;
  const id=document.getElementById('rd-wh-id'),ts=document.getElementById('rd-wh-ts'),bd=document.getElementById('rd-wh-body'),out=document.getElementById('rd-wh-out');
  function run(){const sig='v1,'+C.b64(C.hmac(C.utf8(W.secret),C.utf8(id.value+'.'+ts.value+'.'+bd.value)));const ok=sig===W.signature;
    out.innerHTML='Signed content: <b>'+esc(id.value)+'.'+esc(ts.value)+'.</b>&lt;body&gt;\nwebhook-signature sent:  '+esc(W.signature)+'\nrecomputed in browser:   '+esc(sig)+'\n<b style="color:'+(ok?'var(--good)':'var(--bad)')+'">'+(ok?'Match: accept (then check the timestamp is within 5 minutes and the id is not already processed)':'Mismatch: reject with 400 and do nothing')+'</b>';
    window.__WH_OK=ok}
  function reset(){id.value=W.id;ts.value=String(W.timestamp);bd.value=W.payload;run()}
  [id,ts,bd].forEach(e=>e.addEventListener('input',run));document.getElementById('rd-wh-reset').addEventListener('click',reset);reset();
})();
