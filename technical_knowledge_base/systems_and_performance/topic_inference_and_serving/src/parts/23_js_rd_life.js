// ---- Reading tab: small SVG helpers and section 0's request lifecycle animation ----
window.RDX=(function(){
  const nf=(x,d)=>Number(x).toLocaleString('en-US',{maximumFractionDigits:d==null?0:d,minimumFractionDigits:d==null?0:Math.min(d,0)});
  const T=(x,y,s,o)=>{o=o||{};return '<text x="'+x+'" y="'+y+'"'+(o.a?' text-anchor="'+o.a+'"':'')+' font-size="'+(o.fs||11)+'"'+(o.w?' font-weight="'+o.w+'"':'')+(o.c?' style="fill:'+o.c+'"':'')+'>'+s+'</text>'};
  const R=(x,y,w,h,c,o)=>{o=o||{};return '<rect x="'+x+'" y="'+y+'" width="'+Math.max(0,w)+'" height="'+Math.max(0,h)+'" rx="'+(o.rx==null?2:o.rx)+'" style="fill:'+c+(o.op!=null?';opacity:'+o.op:'')+(o.st?';stroke:'+o.st+';stroke-width:'+(o.sw||1):'')+'"/>'};
  const L=(x1,y1,x2,y2,c,o)=>{o=o||{};return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" style="stroke:'+c+';stroke-width:'+(o.sw||1)+(o.da?';stroke-dasharray:'+o.da:'')+'"/>'};
  const cap=(el,t,p)=>{el.innerHTML='<div class="t">'+t+'</div><p>'+p+'</p>'};
  const cnt=(el,a)=>{el.innerHTML=a.map(x=>RD.stat(x[0],x[1],x[2]||'')).join('')};
  return {nf,T,R,L,cap,cnt};
})();
(function(){
  const D=window.RDD.life,svgEl=document.getElementById('rd-life-svg');if(!svgEl)return;
  const MiB=D.kv_tok/1048576, tp=D.t_pre_ms, td=D.t_dec_ms, GB=1e9;
  // state after each step: [clock ms, tokens out, KV tokens held, bytes read, FLOPs]
  const decAt=k=>[tp+(k-1)*td,k,2000+k,D.pre_bytes+(k-1)*D.dec_bytes,D.pre_fl+(k-1)*D.dec_fl];
  const S=[
    ['1. The request arrives','An HTTP request with the chat messages and settings (max_tokens 300, temperature). Nothing has run on the GPU yet.',[0,0,0,0,0]],
    ['2. Tokenize','The chat template wraps the messages in special tokens and the tokenizer turns the text into 2,000 token ids, on the CPU, in well under a millisecond of GPU time.',[0,0,0,0,0]],
    ['3. Queue','The request waits for a seat in the next batch and for cache blocks. Alone on the GPU it waits for nothing; under load this is where TTFT goes (section 4).',[0,0,0,0,0]],
    ['4. Prefill: all 2,000 prompt tokens in one pass','Every layer computes keys and values for all 2,000 tokens at once and stores them: '+RDX.nf(2000*MiB)+' MiB of KV cache. The weights are read once for 2,000 tokens, so the arithmetic units are the limit (compute-bound): '+RDX.nf(tp,1)+' ms.',[tp,0,2000,D.pre_bytes,D.pre_fl]],
    ['5. The first token','Prefill ends with probabilities for the first answer token; one is sampled, turned back into text and streamed. This moment is the time to first token, TTFT = '+RDX.nf(tp,1)+' ms.',decAt(1)],
    ['6. Decode, one token per step','Each step feeds only the newest token, reads all '+D.weights_gb+' GB of weights plus the cache, and appends one key and value per layer. The read sets the pace: '+td+' ms per token (memory-bound), the time per output token.',decAt(10)],
    ['7. ... 299 steps later','The answer reaches 300 tokens. Each step re-read the weights: the request has caused over 20 TB of memory reads to produce 300 tokens, against one read for its whole prompt.',decAt(300)],
    ['8. Done: the cache is freed','End-to-end latency '+RDX.nf(D.e2e_s,2)+' s: '+RDX.nf(tp/1000,2)+' s of prefill, then 299 decode steps. Its '+RDX.nf(2300*MiB)+' MiB of cache are released for the next user (or kept as a prefix cache, section 2).',[tp+299*td,300,0,D.pre_bytes+299*D.dec_bytes,D.pre_fl+299*D.dec_fl]]
  ];
  const cap=document.getElementById('rd-life-cap'),cnt=document.getElementById('rd-life-cnt');
  function draw(i){
    const w=RD.width(svgEl),h=168,x0=Math.min(112,w*0.3),W=w-x0-8,xp=x0+W*0.3,xe=x0+W;
    const tx=t=>t<=tp?x0+(xp-x0)*t/tp:xp+(xe-xp)*(t-tp)/(299*td);
    const C=['var(--c4)','var(--c6)','var(--c5)','var(--c1)','var(--c2)','var(--c2)','var(--c2)','var(--c3)'];
    const rows=[['Tokenize',1],['Queue',2],['Prefill',3],['Decode',5],['KV held',3],['Streamed',4]];
    let s='';const now=S[i][2][0];
    rows.forEach((r,k)=>{const y=8+k*22;s+=RDX.T(4,y+12,r[0],{c:i>=r[1]?'var(--ink)':'var(--mute)'});s+=RDX.R(x0,y+2,W,14,'var(--soft)')});
    if(i>=1)s+=RDX.R(x0,8+2,3,14,C[1]);
    if(i>=3)s+=RDX.R(x0,52+2,xp-x0,14,C[3]);
    if(i>=5){const te=Math.min(now,tp+299*td);s+=RDX.R(xp,74+2,tx(te)-xp,14,C[5],{op:.85});
      const n=Math.min(300,S[i][2][1]);for(let k=1;k<=n;k+=(n>40?10:1))s+=RDX.L(tx(tp+(k-1)*td),74+2,tx(tp+(k-1)*td),74+16,'var(--bg)')}
    if(i>=3){const kvMax=2300,hh=14;const pts=[[x0,0]];pts.push([xp,2000]);if(i>=5)pts.push([tx(Math.min(now,tp+299*td)),Math.min(2300,2000+S[i][2][1])]);if(i>=7)pts.push([tx(now),0]);
      let d='M'+x0+','+(96+2+hh);pts.forEach(p=>d+=' L'+p[0].toFixed(1)+','+(96+2+hh-hh*p[1]/kvMax).toFixed(1));d+=' L'+pts[pts.length-1][0].toFixed(1)+','+(96+2+hh)+' Z';s+='<path d="'+d+'" style="fill:var(--c4);opacity:'+(i>=7?'.25':'.8')+'"/>';if(i>=7)s+=RDX.T(xe-4,96+13,'freed',{a:'end',fs:10,w:600})}
    if(i>=4){const n=S[i][2][1];for(let k=1;k<=Math.min(n,300);k+=(n>40?10:1)){const x=tx(tp+(k-1)*td);s+=RDX.R(x-1,118+3,2,12,'var(--c3)',{rx:0})}}
    if(i>=4){s+=RDX.L(xp,4,xp,140,'var(--ink)',{da:'3 3'});s+=RDX.T(Math.min(xp+3,w-40),150,'TTFT',{fs:10,w:600})}
    if(i>=7){s+=RDX.T(xe,150,'E2E '+RDX.nf(D.e2e_s,2)+' s',{a:'end',fs:10,w:600})}
    s+=RDX.T(x0,162,'0',{fs:9.5,c:'var(--mute)'})+RDX.T(xp,162,RDX.nf(tp)+' ms',{fs:9.5,a:'middle',c:'var(--mute)'})+RDX.T(xe,162,RDX.nf(tp+299*td)+' ms',{fs:9.5,a:'end',c:'var(--mute)'});
    svgEl.innerHTML=RD.svg(w,h,s,'Timeline of one request: tokenize, queue, prefill, decode, KV cache held and tokens streamed');
    RDX.cap(cap,S[i][0],S[i][1]);const v=S[i][2];
    RDX.cnt(cnt,[['Clock',RDX.nf(v[0],1)+' ms'],['Tokens out',RDX.nf(v[1])+' / 300'],['KV cache held',RDX.nf(v[2]*MiB)+' MiB'],['Memory read',(v[3]/GB>=1000?RDX.nf(v[3]/1e12,1)+' TB':RDX.nf(v[3]/GB,1)+' GB')],['Arithmetic',RDX.nf(v[4]/1e12,1)+' TFLOP']]);
  }
  RD.anim({card:'rd-life-card',ctl:'rd-life-ctl',n:S.length,draw,ms:1800,label:'Request lifecycle step'});
  RD.onResize(()=>draw(+document.getElementById('rd-life-ctl-s').value));
})();
