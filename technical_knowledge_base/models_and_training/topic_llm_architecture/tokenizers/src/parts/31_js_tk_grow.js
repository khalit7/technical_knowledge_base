// ---- Tab: Grow a vocabulary (replay the running example's merges, cost per size, inspect a string) ----
window.TKG=(function(){
  if(!window.TKN)return null;
  const B=window.TKN.bpe,M=B.merges,rank=new Map();M.forEach((p,r)=>rank.set(p[0]*8192+p[1],r));
  const idOfByte=new Array(256);B.byteOf.forEach((b,i)=>{if(b!=null)idOfByte[b]=i});
  const RX=/'s|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+/gu,te=new TextEncoder();
  // BPE with the first k merges: inside each pre-token, merge the lowest-ranked adjacent pair (leftmost on ties) until none applies
  function encodeWord(w,k){let s=Array.from(te.encode(w),b=>idOfByte[b]);
    for(;;){let best=-1,bi=-1;for(let i=0;i<s.length-1;i++){const r=rank.get(s[i]*8192+s[i+1]);if(r!==undefined&&r<k&&(best<0||r<best)){best=r;bi=i}}
      if(best<0)return s;s.splice(bi,2,257+best)}}
  function encode(text,k){const out=[];for(const m of text.matchAll(RX))out.push(...encodeWord(m[0],k));return out}
  return {encode,encodeWord};
})();
(function(){
  if(!window.TKG||!window.TKR||!document.getElementById('tk-grow'))return;
  const {N,piece,pct,$}=TKR,{esc,fmt,chips}=TKV,text=N.bpe.run.text,NE=N.sweepMeta.nonemb;
  const KS=[0,1,2,3,5,7,10,20,30,50,75,100,150,200,255,350,500,767,1000,1300,1791,2300,3000,3839];
  let k=3839,prev=null;
  const show=s=>s.replace(/ /g,'␣');
  function draw(){const ids=TKG.encode(text,k),V=257+k,last=k>0?M(k-1):null;
    $('tk-growKv').textContent=fmt(k);$('tk-growK').value=k;
    const nw=new Set();if(k>0)ids.forEach((d,i)=>{if(d===256+k)nw.add(i)});
    $('tk-growText').innerHTML=chips(ids.map(piece),{mark:(p,i)=>nw.has(i)});
    $('tk-growCnt').innerHTML=RD.stat('Vocabulary',fmt(V))+RD.stat('Tokens',fmt(ids.length),(text.length/ids.length).toFixed(2)+' characters per token')+RD.stat('Embedding',(V*256/1e6).toFixed(2)+'M',pct(V*256/(V*256+NE))+' of the tiny GPT')+RD.stat('Output layer','2 &times; '+fmt(V)+' &times; 256',(2*V*256/1e6).toFixed(2)+'M FLOPs per token');
    $('tk-growLast').innerHTML=last?'Merge '+fmt(k)+': <code>'+esc(show(last.a))+'</code> + <code>'+esc(show(last.b))+'</code> &rarr; <code>'+esc(show(last.n))+'</code>, used '+nw.size+' times in this text.':'No merges: every byte is a token (874 characters are 874 bytes here, all ASCII).';
    drawCost()}
  function M(r){const p=N.bpe.merges[r],a=piece(p[0]),b=piece(p[1]),n=piece(257+r);const t=q=>q.s!=null?q.s:'‹'+q.hex+'›';return {a:t(a),b:t(b),n:t(n)}}
  // cost charts
  function drawCost(){const el=$('tk-costPlot');if(!el||el.offsetParent===null)return;const w=RD.width(el),ml=46,mr=12,h1=150,h2=170,gap=30,H=h1+gap+h2+28;
    const S=N.sweep,lx=v=>Math.log2(v),x=v=>ml+(w-ml-mr)*(lx(v)-lx(256))/(lx(65536)-lx(256));
    const cy=c=>8+(h1-16)*(1-c/4.5),F=r=>r.val_tokens*2*NE/1e12,Hh=r=>r.val_tokens*2*256*r.V/1e12,fmax=200,fy=f=>h1+gap+(h2-8)*(1-f/fmax);
    let s='<svg viewBox="0 0 '+w+' '+H+'" width="'+w+'" height="'+H+'" role="img" aria-label="Characters per token and FLOPs against vocabulary size">';
    [256,1024,4096,16384,65536].forEach(v=>{s+='<line x1="'+x(v)+'" x2="'+x(v)+'" y1="4" y2="'+(h1+gap+h2)+'" stroke="var(--line)"/><text x="'+x(v)+'" y="'+(h1+gap+h2+14)+'" text-anchor="middle" font-size="10.5" fill="var(--mute)">'+(v>=1024?v/1024+'K':v)+'</text>'});
    [0,1,2,3,4].forEach(c=>{s+='<line x1="'+ml+'" x2="'+(w-mr)+'" y1="'+cy(c)+'" y2="'+cy(c)+'" stroke="var(--line)"/><text x="'+(ml-4)+'" y="'+(cy(c)+4)+'" text-anchor="end" font-size="10.5" fill="var(--mute)">'+c+'</text>'});
    s+='<text x="'+(ml+4)+'" y="16" font-size="11" fill="var(--mute)">characters per token</text>';
    s+='<polyline fill="none" stroke="var(--c1)" stroke-width="2" points="'+S.map(r=>x(r.V)+','+cy(r.val_chars_per_token)).join(' ')+'"/>';
    S.forEach(r=>{s+='<circle cx="'+x(r.V)+'" cy="'+cy(r.val_chars_per_token)+'" r="3.5" fill="var(--c1)"><title>'+fmt(r.V)+' entries: '+r.val_chars_per_token+'</title></circle>'});
    [0,50,100,150,200].forEach(f=>{s+='<line x1="'+ml+'" x2="'+(w-mr)+'" y1="'+fy(f)+'" y2="'+fy(f)+'" stroke="var(--line)"/><text x="'+(ml-4)+'" y="'+(fy(f)+4)+'" text-anchor="end" font-size="10.5" fill="var(--mute)">'+f+'</text>'});
    s+='<text x="'+(ml+4)+'" y="'+(h1+gap+10)+'" font-size="11" fill="var(--mute)">TFLOPs per validation pass: blocks, output layer, total</text>';
    const line=(f,c,d)=>'<polyline fill="none" stroke="'+c+'" stroke-width="2"'+(d?' stroke-dasharray="4 3"':'')+' points="'+S.map(r=>x(r.V)+','+fy(Math.min(fmax,f(r)))).join(' ')+'"/>';
    s+=line(F,'var(--c3)',1)+line(Hh,'var(--c2)',1)+line(r=>F(r)+Hh(r),'var(--ink)',0);
    const best=S.reduce((a,r)=>F(r)+Hh(r)<F(a)+Hh(a)?r:a);s+='<circle cx="'+x(best.V)+'" cy="'+fy(F(best)+Hh(best))+'" r="4.5" fill="var(--ink)"/><text x="'+(x(best.V)+6)+'" y="'+(fy(F(best)+Hh(best))-7)+'" font-size="11">lowest: '+fmt(best.V)+'</text>';
    const xv=x(257+k);s+='<line x1="'+xv+'" x2="'+xv+'" y1="4" y2="'+(h1+gap+h2)+'" stroke="var(--bad)" stroke-width="1.5"/>';
    s+='<text x="'+(w-mr)+'" y="'+(h1+gap+h2-6)+'" text-anchor="end" font-size="10.5" fill="var(--mute)">dashed: blocks (green), output layer (orange)</text></svg>';
    el.innerHTML=s}
  // inspector
  function insp(){const t=$('tk-inspIn').value.slice(0,300),ids=TKG.encode(t,k),F=N.freq;
    let h=chips(ids.map(piece))+'<div class="tw"><table class="wide tk-insp"><thead><tr><th>Piece</th><th class="num">Id</th><th class="num">Training count</th><th class="num">Row norm</th></tr></thead><tbody>';
    ids.forEach(d=>{const p=piece(d),z=F.count[d]===0;h+='<tr'+(z?' style="color:var(--bad)"':'')+'><td><code>'+(p.hex?'‹'+p.hex+'›':esc(show(p.s)))+'</code></td><td class="num">'+d+'</td><td class="num">'+fmt(F.count[d])+'</td><td class="num">'+F.norm[d].toFixed(2)+'</td></tr>'});
    $('tk-inspOut').innerHTML=h+'</tbody></table></div>'}
  const an=RD.anim({card:'tk-grow',ctl:'tk-growCtl',n:KS.length,draw:i=>{k=KS[i];draw();insp()},ms:1100,label:'Merge step',start:KS.length-1});
  $('tk-growK').addEventListener('input',e=>{k=+e.target.value;draw();insp()});
  RD.seg($('tk-growJump'),v=>{k=+v;draw();insp()});
  $('tk-inspIn').addEventListener('input',insp);
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-grow']=window.TAB_RENDER['t-grow']||[]).push(()=>{draw();insp()});
  addEventListener('resize',()=>{if($('t-grow').offsetParent!==null)drawCost()});
  draw();insp();
})();
