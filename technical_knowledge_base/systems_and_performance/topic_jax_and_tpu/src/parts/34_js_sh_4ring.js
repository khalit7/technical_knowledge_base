// ---- Sharding lab, section 3: collectives animator (chunks moving round a ring; naive all-reduce for contrast) ----
(function(){
  const S=window.SH,D=S.D,$=S.$;if(!D||!$('sh-ring-svg'))return;
  // the array each device holds: the running example's gradients, the one all-reduce of the data-parallel layout
  const NB=D.strategies.find(s=>s.id==='dp').param_b;
  let kind='all-reduce',n=8,naive=false,steps=[],A=null;
  const pc=m=>{let c=0;while(m){c+=m&1;m>>=1}return c};
  // state: st[i][j] = bitmask of source devices whose contribution device i holds in chunk j (0 = chunk absent)
  function plan(){
    const st0=[];for(let i=0;i<n;i++){st0.push([]);for(let j=0;j<n;j++){
      st0[i].push(kind==='all-gather'?(j===i?1<<i:0):(1<<i))}}
    const out=[{st:st0,sends:[],msg:'start'}];let st=st0.map(r=>r.slice());
    const push=(sends,msg,fn)=>{const nx=st.map(r=>r.slice());sends.forEach(s=>fn(nx,s));st=nx;out.push({st:nx,sends,msg})};
    const R=i=>(i+1)%n,mod=x=>((x%n)+n)%n;
    if(kind==='all-reduce'&&naive){
      push([...Array(n-1)].map((_,k)=>[k+1,0,-1]),'gather: devices 1 to '+(n-1)+' each send their whole array to device 0, which adds them',(nx,s)=>{for(let j=0;j<n;j++)nx[0][j]|=st[s[0]][j]});
      push([...Array(n-1)].map((_,k)=>[0,k+1,-1]),'broadcast: device 0 sends the sum to each of the others',(nx,s)=>{for(let j=0;j<n;j++)nx[s[1]][j]=nx[0][j]});
      return out}
    if(kind==='all-reduce'||kind==='reduce-scatter')for(let s=0;s<n-1;s++)
      push([...Array(n)].map((_,i)=>[i,R(i),mod(i-s)]),'reduce-scatter step '+(s+1)+' of '+(n-1)+': each device sends one chunk right; the receiver adds it to its own copy',(nx,x)=>{nx[x[1]][x[2]]|=st[x[0]][x[2]]});
    if(kind==='all-reduce')for(let s=0;s<n-1;s++)
      push([...Array(n)].map((_,i)=>[i,R(i),mod(i+1-s)]),'all-gather step '+(s+1)+' of '+(n-1)+': finished chunks travel round the ring and overwrite',(nx,x)=>{nx[x[1]][x[2]]=st[x[0]][x[2]]});
    if(kind==='all-gather')for(let s=0;s<n-1;s++)
      push([...Array(n)].map((_,i)=>[i,R(i),mod(i-s)]),'step '+(s+1)+' of '+(n-1)+': each device forwards the chunk it received last',(nx,x)=>{nx[x[1]][x[2]]=st[x[0]][x[2]]});
    if(kind==='all-to-all'){
      // chunk j on device i = the piece device i holds for device j; afterwards device j holds piece j of every device
      const a=[];for(let i=0;i<n;i++){a.push([]);for(let j=0;j<n;j++)a[i].push(j===i?1<<i:(1<<i)|(1<<30))}
      out[0].st=a;st=a.map(r=>r.slice());
      for(let s=1;s<n;s++)push([...Array(n)].map((_,i)=>[i,mod(i+s),mod(i+s)]),'step '+s+' of '+(n-1)+': each device sends the piece meant for the device '+s+' place(s) along (drawn as direct sends, as through a switch)',(nx,x)=>{nx[x[1]][x[0]]=1<<x[0];nx[x[0]][x[2]]=0});
    }
    if(kind==='collective-permute')push([...Array(n)].map((_,i)=>[i,R(i),-1]),'one step: each device sends its whole buffer to its right-hand neighbour',(nx,x)=>{for(let j=0;j<n;j++)nx[x[1]][j]=st[x[0]][j]});
    return out}
  const chunkB=()=>NB/n;
  function sentUpTo(k){const per=new Array(n).fill(0);for(let t=1;t<=k;t++)steps[t].sends.forEach(s=>{per[s[0]]+=s[2]<0?NB:chunkB()});return per}
  function draw(k){
    const host=$('sh-ring-svg'),W=S.width(host),H=Math.min(420,Math.max(300,W*0.62));
    const cx=W/2,cy=H/2+4,R=Math.min(W*0.5-44,H/2-36);const cs=Math.max(5,Math.min(13,(2*Math.PI*R/n-14)/n,(W/2-30)/n));
    const pos=i=>{const a=-Math.PI/2+2*Math.PI*i/n;return [cx+R*Math.cos(a),cy+R*Math.sin(a)]};
    const cur=steps[k];let body='<defs><marker id="sh-ar" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L8,4L0,8z" fill="'+S.KV[kind]+'"/></marker></defs>';
    cur.sends.forEach(s=>{const [x1,y1]=pos(s[0]),[x2,y2]=pos(s[1]);const dx=x2-x1,dy=y2-y1,L=Math.hypot(dx,dy)||1,o=n*cs/2+6;
      body+='<line x1="'+(x1+dx/L*o)+'" y1="'+(y1+dy/L*o)+'" x2="'+(x2-dx/L*o)+'" y2="'+(y2-dy/L*o)+'" stroke="'+S.KV[kind]+'" stroke-width="2" marker-end="url(#sh-ar)" opacity=".85"/>'});
    for(let i=0;i<n;i++){const [x,y]=pos(i),w=n*cs;
      body+=S.tx(x,y-cs/2-5,'dev '+i,{fs:10.5,a:'middle',fill:'var(--mute)'});
      for(let j=0;j<n;j++){const m=cur.st[i][j];let fill='none',op=1;
        if(kind==='all-to-all'){if(m){const src=Math.log2(m&~(1<<30));fill='hsl('+Math.round(360*src/n)+',55%,52%)';op=(m&(1<<30))?.35:.95}}
        else if(m){fill=S.KV[kind];op=0.15+0.85*pc(m)/n}
        const hl=cur.sends.some(s=>s[1]===i&&(s[2]===j||s[2]<0));
        body+='<rect x="'+(x-w/2+j*cs)+'" y="'+(y-cs/2)+'" width="'+(cs-1)+'" height="'+cs+'" fill="'+fill+'" fill-opacity="'+op+'" stroke="'+(hl?'var(--ink)':'var(--line)')+'" stroke-width="'+(hl?1.4:.8)+'"/>'}}
    host.innerHTML=S.svg(W,H,body,'Devices on a ring exchanging chunks');
    const per=sentUpTo(k),mx=Math.max(...per),tot=per.reduce((a,b)=>a+b,0),last=steps.length-1;
    const legend=kind==='all-to-all'?'Colour = the device a piece came from; faded = a piece still waiting to be sent.':'Shade = how many devices\' contributions a chunk holds (darkest = all '+n+').';
    $('sh-ring-cap').innerHTML='<b>'+(k===0?'Start':'Step '+k+' of '+last)+'.</b> '+(k===0?(kind==='all-gather'?'Each device holds only its own chunk.':kind==='all-to-all'?'Device i holds one piece for every device j.':'Each device holds its own full array (its gradients), cut into '+n+' chunks.'):cur.msg+'.')+' '+legend;
    const formula={'all-reduce':naive?'device 0 sends (n&minus;1)N and receives (n&minus;1)N':'2(n&minus;1)/n &times; N','all-gather':'(n&minus;1)/n &times; N','reduce-scatter':'(n&minus;1)/n &times; N','all-to-all':'(n&minus;1)/n &times; N','collective-permute':'N'}[kind];
    $('sh-ring-cnt').innerHTML=S.stat('array per device (N)',S.fmtB(NB),'the running example\'s gradients')+S.stat('sent so far, busiest device',S.fmtB(mx),'')+S.stat('sent so far, all devices',S.fmtB(tot),'')+S.stat('steps',last,'')+S.stat('per device at the end',S.fmtB(Math.max(...sentUpTo(last))),formula);
  }
  function rebuild(){steps=plan();if(A)A.reset(steps.length);else A=S.anim({card:'sh-ring-card',ctl:'sh-ring-ctl',n:steps.length,draw,ms:1000,label:'Collective step'})}
  S.seg($('sh-ring-k'),['all-reduce','all-gather','reduce-scatter','all-to-all','collective-permute'].map(k=>[k,k]),kind,v=>{kind=v;$('sh-ring-naive').disabled=v!=='all-reduce';rebuild();A.play()});
  $('sh-ring-n').addEventListener('input',e=>{n=+e.target.value;$('sh-ring-nv').textContent=n;rebuild()});
  $('sh-ring-naive').addEventListener('change',e=>{naive=e.target.checked;rebuild();A.play()});
  rebuild();S.onResize(()=>A.redraw());
})();
