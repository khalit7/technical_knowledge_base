// ---- KDA against full attention: one token through one K3 attention layer, animated ----
(function(){
  const card=$('kx');if(!card)return;
  const P=7,C=6,DUR=3600,MOVE=0.62;
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  // K3 sizes (config.json)
  const H_=96,DK=128,ENTRY=576,STATE=H_*DK*DK,CONV=3*H_*DK*3,NK=69,NM=24,LY=93,T0=4096,TMAX=1048576;
  const CROSS=STATE/ENTRY; // 2,730.7 tokens: one layer's state equals one layer's cache
  const S_=(t,c)=>({t,c});
  const SK=[
    S_('1. A token arrives','Token <i>t</i> enters one of K3\'s 69 KDA layers as its hidden state <b>h</b><sub><i>t</i></sub>: 7,168 numbers, 112 squares. Each of the 96 heads projects it to a query, a key and a value of 128 numbers (after a short convolution, Swish and, for <b>q</b> and <b>k</b>, L2 normalisation), a write strength <i>β</i>, and a forget rate for each of the 128 key channels. The head\'s state on the right already holds everything earlier tokens wrote: 128 × 128 = 16,384 numbers, 256 squares, whatever the context length.'),
    S_('2. Decay, channel by channel','Diag(<b>α</b><sub><i>t</i></sub>) multiplies each key-channel row of the state by its own rate (the bar on the right; the rates here are illustrative, K3 bounds every one above <i>e</i><sup>−5</sup> ≈ 0.0067). Rows with rates near 1 keep their content for thousands of tokens; rows near 0.5 are flushed within a few. Gated DeltaNet would fade every row by the same scalar.'),
    S_('3. Erase what the key retrieves','The delta rule subtracts <i>β</i><b>k</b>(<b>k</b><sup>⊤</sup><i>S</i>): whatever the state currently returns for this key is removed, along the rows where <b>k</b> is large (the bar on the left). This is what lets a new association overwrite an old one instead of piling on top of it.'),
    S_('4. Write the new value','The outer product <i>β</i><b>k</b><b>v</b><sup>⊤</sup> writes the token\'s value (the bar on top) into the same rows. The state has changed in place; its size has not: still 16,384 numbers per head, 1,572,864 for the layer\'s 96 heads.'),
    S_('5. Read with the query','The output is <b>o</b> = <i>S</i><sup>⊤</sup><b>q</b> (bar below), then a full-rank sigmoid gate and the output projection. A decoded token reads the whole state once per head: 1,572,864 numbers for the layer, the same at token 10 as at token 1,000,000.'),
    S_('6. Let the context grow','The sweep runs the context from 1 token to K3\'s 1,048,576. The KDA layer\'s storage is flat at 1,572,864 numbers (plus 110,592 of convolution state); an MLA layer of the same model grows by 576 per token and passes it at about 2,731 tokens. At 1M tokens one MLA layer holds 384 times as much.'),
    S_('7. The K3 stack','K3 interleaves 3 KDA layers with 1 Gated MLA layer, 23 times, then closes with one more MLA layer: 69 + 24 = 93. Only the 24 MLA layers grow with context, so at 1M tokens the stack stores 24 × 576 per token plus 69 fixed states, about a quarter of an all-MLA 93-layer stack: a 74.0% cut counted in numbers (73.8% in bytes if the state is kept in FP32), approaching 1 − 24/93 = 74.2% as the context grows.')];
  const SM=[
    S_('1. A token arrives','Token <i>t</i> enters one of K3\'s 24 Gated MLA layers as its hidden state <b>h</b><sub><i>t</i></sub>: 7,168 numbers, 112 squares. The cache on the right already holds one entry for every earlier token; here the context is 4,096 tokens, of which the last few are drawn.'),
    S_('2. Compress to one entry','<i>W</i><sup>DKV</sup> maps <b>h</b><sub><i>t</i></sub> to the 512-number latent plus a 64-number key part shared by all 96 heads (in K3 it carries no rotation: NoPE). 576 numbers, 9 squares, stand in for every head\'s key and value.'),
    S_('3. Append it to the cache','The entry joins the cache and stays there for the rest of the sequence: +576 numbers per token. Unlike the KDA state, this grows: at 4,096 tokens the layer holds 2,359,296 numbers.'),
    S_('4. Decode reads every entry','In decode the up-projections are absorbed into the query side, so all 96 query heads score against every cached entry: a decoded token reads 576 × <i>t</i> numbers for this layer. That read, repeated every token, is what long-context decoding pays for.'),
    S_('5. Let the context grow','The sweep runs the context from 1 token to 1,048,576. The MLA layer grows by 576 per token and passes the KDA layer\'s fixed 1,572,864 at about 2,731 tokens; at 1M tokens it holds 603,979,776 numbers, 384 times as much.'),
    S_('6. The K3 stack','K3 keeps 24 such layers and makes the other 69 KDA. An all-MLA 93-layer stack of the same shape would store 93 × 576 = 53,568 numbers per token; K3 stores 13,824 per token plus 69 fixed states, a 74.0% cut at 1M tokens counted in numbers (73.8% in bytes with an FP32 state).')];
  const WIDE={W:720,H:372,ht:[14,52],proj:[84,64,100,52],grid:[262,62],right:[478,44,232,236],lat:[214,62],cache:[258,40,452,206],qd:[84,214],bars:[14,322]};
  const NAR={W:360,H:600,ht:[10,40],proj:[78,46,104,48],grid:[118,152],right:[10,320,340,190],lat:[198,40],cache:[10,140,340,176],qd:[10,334],bars:[10,550]};
  const st={m:'kda',k:0,t:RM?1:0,play:!RM,spd:1,vis:false,raf:0,last:0,lk:-1,lm:''};
  const steps=()=>st.m==='kda'?SK:SM;
  const cl=v=>v<0?0:v>1?1:v,ease=v=>v<.5?2*v*v:1-2*(1-v)*(1-v),lerp=(a,b,u)=>a+(b-a)*u;
  // toy head state (illustrative values, real layout): 16 x 16 squares, each one 8 x 8 numbers
  const rnd=mulberry32(7);const N=16;
  const S0=[...Array(N)].map((_,i)=>[...Array(N)].map((_,j)=>(rnd()*2-1)*(0.35+0.65*rnd())));
  const AL=[...Array(N)].map((_,i)=>[0.99,0.97,0.6,0.95,0.5,0.9,0.98,0.55,0.93,0.7,0.99,0.62,0.85,0.96,0.52,0.92][i]);
  let kv=[...Array(N)].map((_,i)=>Math.exp(-((i-5.5)**2)/3));const kn=Math.hypot(...kv);kv=kv.map(x=>x/kn);
  let qv=[...Array(N)].map((_,i)=>Math.exp(-((i-6.5)**2)/4));const qn=Math.hypot(...qv);qv=qv.map(x=>x/qn);
  const vv=[...Array(N)].map(()=>rnd()*2-1),BETA=0.85;
  const S1=S0.map((r,i)=>r.map(x=>x*AL[i]));
  const kS=[...Array(N)].map((_,j)=>S1.reduce((s,r,i)=>s+kv[i]*r[j],0));
  const S2=S1.map((r,i)=>r.map((x,j)=>x-BETA*kv[i]*kS[j]));
  const S3=S2.map((r,i)=>r.map((x,j)=>x+BETA*kv[i]*vv[j]));
  const OUT=[...Array(N)].map((_,j)=>S3.reduce((s,r,i)=>s+qv[i]*r[j],0));
  const mx=Math.max(...S0.flat().map(Math.abs),...S3.flat().map(Math.abs));
  const T=(x,y,s,o)=>'<text x="'+x+'" y="'+y+'" font-size="'+((o&&o.fs)||11.5)+'"'+(o&&o.a?' text-anchor="'+o.a+'"':'')+(o&&o.c?' fill="'+o.c+'"':'')+(o&&o.op!=null?' opacity="'+o.op+'"':'')+'>'+s+'</text>';
  const G=(op,s)=>'<g opacity="'+(+op).toFixed(3)+'">'+s+'</g>';
  function cells(x,y,cols,n,fill,op){let d='';for(let i=0;i<n;i++)d+='M'+(x+(i%cols)*P)+' '+(y+Math.floor(i/cols)*P)+'h'+C+'v'+C+'h-'+C+'z';return n>0?'<path d="'+d+'" fill="'+fill+'"'+(op!=null?' fill-opacity="'+op+'"':'')+'/>':''}
  function stateGrid(x,y,S,hl){let s='';for(let i=0;i<N;i++)for(let j=0;j<N;j++){const v=S[i][j],a=Math.min(1,Math.abs(v)/mx);
    s+='<rect x="'+(x+j*P)+'" y="'+(y+i*P)+'" width="'+C+'" height="'+C+'" fill="'+(v>=0?'var(--acc)':'var(--c2)')+'" fill-opacity="'+(0.08+0.92*a).toFixed(3)+'"/>'}
    if(hl)s+='<rect x="'+(x-2.5)+'" y="'+(y-2.5)+'" width="'+(N*P+4)+'" height="'+(N*P+4)+'" rx="3" fill="none" stroke="'+hl+'"/>';return s}
  function vbar(x,y,vals,vert,col,op){let s='';const m=Math.max(...vals.map(Math.abs))||1;vals.forEach((v,i)=>{const a=Math.min(1,Math.abs(v)/m);
    s+='<rect x="'+(vert?x:x+i*P)+'" y="'+(vert?y+i*P:y)+'" width="'+(vert?8:C)+'" height="'+(vert?C:8)+'" fill="'+col+'" fill-opacity="'+(0.1+0.9*a).toFixed(3)+'"/>'});return G(op==null?1:op,s)}
  const box=(b,lines,cls,op)=>G(op==null?1:op,bx(b[0],b[1],b[2],b[3],cls||'box',lines,11.5));
  // ---- the context chart (steps "let the context grow" and "the stack") ----
  function chart(L,u,stack){
    const pl=58,pr=16,pt=34,pb=56,W=L.W,H=L.H-40;
    const lx=t=>pl+(W-pl-pr)*Math.log2(t)/20,ly0=2,ly1=11;
    const ly=v=>pt+(H-pt-pb)*(1-(Math.log10(v)-ly0)/(ly1-ly0));
    let s='';[2,4,6,8,10,11].forEach(e=>{if(e>ly1)return;s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+ly(10**e)+'" y2="'+ly(10**e)+'" stroke="var(--line)"/>'+T(pl-6,ly(10**e)+4,'10'+sup(e),{a:'end',fs:10.5,c:'var(--mute)'})});
    [[1,'1'],[1024,'1K'],[32768,'32K'],[1048576,'1M']].forEach(([t,l])=>{s+=T(lx(t),H-pb+16,l,{a:'middle',fs:10.5,c:'var(--mute)'})});
    s+=T((pl+W-pr)/2,H-pb+32,'context length, tokens (log)',{a:'middle',fs:11,c:'var(--mute)'});
    s+=T(pl,pt-14,stack?'Numbers stored per sequence, whole stack (log)':'Numbers stored per sequence, one layer (log)',{fs:11,c:'var(--mute)'});
    const tc=Math.max(1,2**(20*u));
    const line=(fn,col,w,dash)=>{let d='';for(let i=0;i<=100;i++){const t=2**(20*i/100);d+=(i?'L':'M')+lx(t).toFixed(1)+' '+ly(fn(t)).toFixed(1)}return '<path d="'+d+'" fill="none" stroke="'+col+'" stroke-width="'+w+'"'+(dash?' stroke-dasharray="5 4"':'')+'/>'};
    if(!stack){
      s+=line(t=>Math.max(100,ENTRY*t),'var(--c2)',2.2)+line(()=>STATE,'var(--acc)',2.2);
      s+='<circle cx="'+lx(CROSS)+'" cy="'+ly(STATE)+'" r="4" fill="var(--ink)"/>'+T(lx(CROSS)+6,ly(STATE)+16,'equal at about 2,731 tokens',{fs:10.5});
      s+=T(pl+8,pt+14,'MLA layer: 576 per token',{fs:11,c:'var(--c2)'})+T(pl+8,pt+30,'KDA layer: 1,572,864, fixed',{fs:11,c:'var(--acc)'});
    }else{
      const hyb=t=>NM*ENTRY*t+NK*STATE,full=t=>LY*ENTRY*t;
      s+=line(full,'var(--c2)',2.2,true)+line(hyb,'var(--acc)',2.4);
      s+=T(pl+8,pt+14,'dashed: all-MLA 93 layers',{fs:11,c:'var(--c2)'})+T(pl+8,pt+30,'solid: K3, 24 MLA + 69 KDA',{fs:11,c:'var(--acc)'});
      // layer strip
      const sx=pl,sw=(W-pl-pr)/LY,sy=H-6;let g='';for(let i=1;i<=LY;i++){const isM=(i%4===0)||i===93;g+='<rect x="'+(sx+(i-1)*sw).toFixed(1)+'" y="'+sy+'" width="'+Math.max(1,sw-1).toFixed(1)+'" height="12" fill="'+(isM?'var(--c2)':'var(--acc)')+'" fill-opacity="'+(isM?1:.55)+'"/>'}
      s+=g+T(sx,sy+26,'K3\'s 93 layers: KDA (blue) and Gated MLA (orange)',{fs:10.5,c:'var(--mute)'});
    }
    const xC=lx(tc);s+='<line x1="'+xC+'" x2="'+xC+'" y1="'+pt+'" y2="'+(H-pb)+'" stroke="var(--ink)" stroke-dasharray="2 3" opacity=".6"/>'+T(xC+4,pt+10,fmt(Math.round(tc))+' tokens',{fs:10.5});
    return s}
  function ctxNow(){const n=steps().length,k=st.k,u=RM?1:cl(st.t/0.92);if(k===n-2||k===n-1)return k===n-2?Math.max(1,Math.round(2**(20*u))):TMAX;return T0}
  function draw(){
    const L=card.clientWidth<600?NAR:WIDE,k=st.k,e=RM?1:ease(cl(st.t/MOVE)),kda=st.m==='kda',n=steps().length;
    let s='';
    if(k>=n-2){s=chart(L,k===n-2?(RM?1:cl(st.t/0.92)):1,k===n-1)}
    else if(kda){
      const g=L.grid,gx=g[0],gy=g[1];
      s+=G(k===0?1:.45,cells(L.ht[0],L.ht[1],8,k===0?Math.round(112*e):112,'var(--acc)',.7)+T(L.ht[0],L.ht[1]-8,'hₜ · 7,168',{fs:12}));
      s+=box(L.proj,['q, k, v, β, α','per head'],'box',k===0?e:.55);
      // state
      const Sd=k===0?S0:k===1?S0.map((r,i)=>r.map((x,j)=>lerp(x,S1[i][j],e))):k===2?S1.map((r,i)=>r.map((x,j)=>lerp(x,S2[i][j],e))):k===3?S2.map((r,i)=>r.map((x,j)=>lerp(x,S3[i][j],e))):S3;
      s+=stateGrid(gx,gy,Sd,k===4?'var(--good)':'var(--mute)');
      s+=T(gx,gy-22,'One head\'s state S, 128 × 128 = 256 squares',{fs:11});
      s+=T(gx+N*P/2,gy+N*P+30,'rows: key channels · columns: value dims',{a:'middle',fs:10,c:'var(--mute)'});
      if(k===1)s+=vbar(gx+N*P+6,gy,AL.map(a=>a-0.4),true,'var(--c3)',1)+T(gx+N*P+18,gy+6,'α per row',{fs:10.5,c:'var(--c3)'})+AL.map((a,i)=>i%3===0&&i<15?T(gx+N*P+18,gy+i*P+20,a.toFixed(2),{fs:9.5,c:'var(--mute)'}):'').join('');
      if(k===2||k===3)s+=vbar(gx-14,gy,kv,true,'var(--c4)',1)+T(gx-18,gy+N*P/2,'k',{a:'end',fs:12,c:'var(--c4)'});
      if(k===3)s+=vbar(gx,gy-12,vv,false,'var(--c5)',1)+T(gx+N*P+6,gy-5,'v',{fs:12,c:'var(--c5)'});
      if(k===4){s+=vbar(gx-14,gy,qv,true,'var(--good)',1)+T(gx-18,gy+N*P/2,'q',{a:'end',fs:12,c:'var(--good)'});s+=G(cl(e*2),vbar(gx,gy+N*P+6,OUT,false,'var(--good)',1)+T(gx+N*P+6,gy+N*P+13,'o = Sᵀq',{fs:11,c:'var(--good)'}))}
      if(k===0&&!RM){/* packets from h to the projection */const x0=L.ht[0]+56,y0=L.ht[1]+48,x1=L.proj[0],y1=L.proj[1]+26;for(let j=0;j<5;j++){const f=cl(e*1.6-j*.15);if(f<=0||f>=1)continue;s+='<circle cx="'+lerp(x0,x1,f).toFixed(1)+'" cy="'+lerp(y0,y1,f).toFixed(1)+'" r="3" fill="var(--acc)"/>'}}
      // right: the layer's 96 heads, each tile one head's 256 squares
      const r=L.right;s+='<rect x="'+r[0]+'" y="'+r[1]+'" width="'+r[2]+'" height="'+r[3]+'" rx="8" fill="var(--soft)" stroke="var(--line)"/>';
      s+=T(r[0]+8,r[1]+15,'This layer: 96 heads, one tile each',{fs:11,c:'var(--mute)'});
      const cols=r[2]>300?12:10,tw=Math.min(cols===12?16:15,(r[2]-24)/cols-3,(r[3]-70)/Math.ceil(96/cols)-3);for(let h=0;h<H_;h++){const x=r[0]+12+(h%cols)*(tw+3),y=r[1]+26+Math.floor(h/cols)*(tw+3);s+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+tw.toFixed(1)+'" height="'+tw.toFixed(1)+'" rx="2" fill="var(--acc)" fill-opacity="'+(h===0?.9:.35)+'"/>'}
      s+=T(r[0]+8,r[1]+r[3]-26,'tile = 16,384 numbers (not to the left\'s scale)',{fs:10.5,c:'var(--mute)'})+T(r[0]+8,r[1]+r[3]-11,'fixed size: no entry per token',{fs:10.5,c:'var(--mute)'});
    }else{
      s+=G(k===0?1:.45,cells(L.ht[0],L.ht[1],8,k===0?Math.round(112*e):112,'var(--acc)',.7)+T(L.ht[0],L.ht[1]-8,'hₜ · 7,168',{fs:12}));
      s+=box(L.proj,['Wᴰᴷⱽ','down-projection'],'box',k<1?0:k===1?e:.55);
      const cb=L.cache;s+='<rect x="'+cb[0]+'" y="'+cb[1]+'" width="'+cb[2]+'" height="'+cb[3]+'" rx="8" fill="var(--soft)" stroke="var(--line)"/>';
      s+=T(cb[0]+8,cb[1]+14,'This layer\'s cache: one 9-square entry per earlier token',{fs:11,c:'var(--mute)'});
      const ncol=Math.floor((cb[2]-40)/12),y0=cb[1]+30,x0=cb[0]+30;
      s+=T(cb[0]+8,y0+34,'…',{fs:14,c:'var(--mute)'});
      for(let j=0;j<ncol-1;j++){const x=x0+j*12;s+=cells(x,y0,1,8,'var(--good)',.45)+cells(x,y0+8*P,1,1,'var(--c6)',.45)}
      const nx=x0+(ncol-1)*12;
      s+=T(cb[0]+8,y0+9*P+20,'earlier tokens 1 … '+fmt(T0-1)+' (last '+(ncol-1)+' drawn)',{fs:10.5,c:'var(--mute)'});
      s+='<rect x="'+(nx-2)+'" y="'+(y0-2)+'" width="10" height="'+(9*P+3)+'" rx="2" fill="none" stroke="var(--mute)" stroke-dasharray="2 2" opacity="'+(k>=2?0:.6)+'"/>';
      if(k>=1){const u=k===2?e:(k>2?1:0),x=lerp(L.lat[0],nx,u),y=lerp(L.lat[1],y0,u),nn=k===1?Math.round(8*cl((e-.3)/.7)):8;
        s+=cells(x,y,1,nn,'var(--good)')+G(k===1?cl((e-.5)/.5):1,cells(x,y+8*P,1,1,'var(--c6)'));
        if(k===1)s+=T(L.lat[0]+12,L.lat[1]+26,'576',{fs:11})+T(L.lat[0]+12,L.lat[1]+40,'512 + 64',{fs:10.5,c:'var(--mute)'})}
      if(k===2)s+=G(cl(e*3),T(nx+3,y0-6,'+576',{a:'middle',fs:11,c:'var(--good)'}));
      if(k===3){const q=L.qd,op=cl(e*2);let ln='';s+=G(op,cells(q[0],q[1],16,96,'var(--acc)',.8)+T(q[0],q[1]-6,'96 query heads, one square each',{fs:10.5}));
        const bx0=x0-2,bx1=nx+8,by=y0-6,ph=RM?-1:(st.t*2.2)%1,busX=Math.min(bx1,x0+60);
        for(let r=0;r<6;r++){const px=q[0]+16*P,py=q[1]+3+r*P;ln+='<line x1="'+px+'" y1="'+py+'" x2="'+busX+'" y2="'+by+'" stroke="var(--acc)" opacity=".5"/>';if(ph>=0)ln+='<circle cx="'+lerp(px,busX,ph).toFixed(1)+'" cy="'+lerp(py,by,ph).toFixed(1)+'" r="2.4" fill="var(--acc)"/>'}
        ln+='<path d="M'+bx0+' '+(by+4)+'V'+by+'H'+bx1+'V'+(by+4)+'" fill="none" stroke="var(--acc)" stroke-width="1.6"/>';s+=G(op,ln);
        s+=G(cl(e*2-.4),T(q[0],q[1]+6*P+16,'every head reads every entry: 576 × t',{fs:10.5}))}
    }
    // to-scale bars, steps before the sweep: stored for one layer at t = 4,096
    if(k<n-2){const b=L.bars,x0=b[0]+150,x1=L.W-12,wB=x1-x0,mxv=ENTRY*T0;
      s+=T(b[0],b[1]-6,'Stored for one layer at t = 4,096 tokens, to scale',{fs:11,c:'var(--mute)'});
      const row=(y,name,val,col,op)=>G(op,T(b[0],y+9,name,{fs:11})+'<rect x="'+x0+'" y="'+y+'" width="'+wB+'" height="10" rx="2" fill="var(--soft)"/><rect x="'+x0+'" y="'+y+'" width="'+(wB*val/mxv).toFixed(1)+'" height="10" rx="2" fill="'+col+'"/>');
      s+=row(b[1]+2,'KDA 1,572,864',STATE,'var(--acc)',kda?1:.35)+row(b[1]+18,'MLA 2,359,296',ENTRY*T0,'var(--c2)',kda?.35:1)}
    $('kxSvg').innerHTML=svgEl(L.W,L.H,s,'One token through '+(kda?'Kimi Delta Attention':'a full-attention MLA layer')+', step '+(k+1));
    if(st.lk!==k||st.lm!==st.m){const S=steps()[k];$('kxStep').innerHTML='Step '+(k+1)+' of '+n+': '+S.t.replace(/^\d+\. /,'');$('kxCap').innerHTML=S.c;st.lk=k;st.lm=st.m}
    const t=ctxNow(),stack=k===n-1;
    if(stack){const hyb=NM*ENTRY*t+NK*STATE,full=LY*ENTRY*t;
      $('kxCnt').innerHTML=stat('Context',fmt(t)+' tokens','K3\'s maximum')+stat('K3 stack stores',fmt(hyb),'24 × 576 per token + 69 × 1,572,864')+stat('All-MLA 93 layers',fmt(full),'93 × 576 per token')+stat('Cut',(100*(1-hyb/full)).toFixed(1)+'%','limit 1 − 24/93 = 74.2%')}
    else{const stored=kda?STATE:ENTRY*t;
      $('kxCnt').innerHTML=stat('Context',fmt(t)+' tokens',k===n-2?'sweeping to 1,048,576':'illustrative point; the sweep comes later')+stat('Stored for this layer',fmt(stored),kda?'96 × 128 × 128, fixed':'576 × '+fmt(t))+stat('Read per decoded token',fmt(stored),kda?'the whole state, once':'every entry, every token')+stat(kda?'Against one MLA layer':'Against one KDA layer',(kda?(ENTRY*t/STATE):(ENTRY*t/STATE)).toFixed(t<10000?2:0)+'×','MLA ÷ KDA at this context')}
    const sc=$('kxScrub');sc.max=n*100;sc.value=Math.round((k+st.t)*100);
    const pb=$('kxPlay'),end=k===n-1&&st.t>=1;pb.innerHTML=st.play?'❚❚ Pause':end?'↻ Replay':'▶ Play';pb.setAttribute('aria-label',st.play?'Pause':end?'Replay':'Play');
  }
  const live=()=>st.vis&&!document.hidden&&card.offsetParent!==null;
  function tick(now){st.raf=0;if(!st.play||!live())return;const dt=st.last?Math.min(100,now-st.last):16;st.last=now;
    st.t+=dt*st.spd/DUR;const n=steps().length;if(st.t>=1){if(st.k<n-1){st.k++;st.t=0}else{st.t=1;st.play=false}}
    card.dataset.frames=(+card.dataset.frames||0)+1;draw();if(st.play)st.raf=requestAnimationFrame(tick)}
  function kick(){if(st.play&&live()&&!st.raf){st.last=0;st.raf=requestAnimationFrame(tick)}else if(!live()&&st.raf){cancelAnimationFrame(st.raf);st.raf=0}}
  const pause=()=>{st.play=false;if(st.raf){cancelAnimationFrame(st.raf);st.raf=0}};
  $('kxPlay').addEventListener('click',()=>{if(st.play){pause()}else{const n=steps().length;if(st.k===n-1&&st.t>=1){st.k=0;st.t=0}else if(st.t>=1&&st.k<n-1){st.k++;st.t=0}st.play=true;kick()}draw()});
  $('kxFwd').addEventListener('click',()=>{pause();st.k=Math.min(steps().length-1,st.k+1);st.t=1;draw()});
  $('kxBack').addEventListener('click',()=>{pause();st.k=Math.max(0,st.k-1);st.t=1;draw()});
  $('kxScrub').addEventListener('input',e=>{pause();const n=steps().length,v=+e.target.value;st.k=Math.min(n-1,Math.floor(v/100));st.t=cl(v/100-st.k);if(v>=n*100){st.k=n-1;st.t=1}draw()});
  $('kxSpd').addEventListener('change',e=>{st.spd=+e.target.value});
  const seg=$('kxM');seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    st.m=b.dataset.m;st.k=0;st.t=RM?1:0;if(!RM&&!st.play){st.play=true}draw();kick()}));
  if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;kick()},{threshold:.15}).observe(card)}else st.vis=true;
  document.addEventListener('visibilitychange',kick);
  let rw=0;addEventListener('resize',()=>{const w=card.clientWidth<600;if(w!==rw){rw=w;draw()}});rw=card.clientWidth<600;
  onTab('t-read',()=>{draw();kick()});
  draw();
})();
