// ---- Systolic array lab tab ----
(function(){
  const tab=document.getElementById('t-sys');if(!tab)return;
  const $=id=>document.getElementById(id);
  const MV=[1,2,4,8,16,32,64,128,256,512,1024,2048,4096,8192,16384];
  const st={m:13,k:4096,n:14336,r:128,sweep:'kn'};
  const fmt=x=>x.toLocaleString('en-US');
  const pct=x=>(100*x).toFixed(x<0.1?1:0)+'%';
  function reads(M,K,N,R){const tn=Math.ceil(N/R);return (M*K*tn+K*N)/(M*K*N)}
  function out(){
    const M=MV[st.m],K=st.k,N=st.n,R=st.r;const t=SYS.tiled(M,K,N,R,R);
    $('sy-mv').textContent=fmt(M);$('sy-rv').textContent=R+' x '+R;
    const rp=reads(M,K,N,R);
    $('sy-out').innerHTML=RD.stat('Utilisation',pct(t.util),'of the array\'s peak')+RD.stat('Tiles',fmt(t.tiles),t.tk+' x '+t.tn+' weight tiles')+
      RD.stat('Cycles',fmt(t.cycles),'each tile costs max(M, R) = '+fmt(Math.max(M,R)))+RD.stat('Cells holding real weights',pct(t.pad),'the rest is padding')+
      RD.stat('Storage reads per multiply-add',rp<0.01?rp.toFixed(4):rp.toFixed(3),'scalar lanes: 2 ('+Math.round(2/rp)+'x more)');
    const lim=M<R?'Limited by weight loading: only '+fmt(M)+' rows stream per tile, but the next tile needs '+R+' cycles to shift in.':t.pad<0.97?'Limited by padding: '+pct(1-t.pad)+' of the array holds zeros because K or N is not a multiple of '+R+'.':'Close to the peak: big, aligned matrices.';
    $('sy-note').textContent=lim+' Multiply-adds: '+fmt(M*K*N)+'.';
    chart();
  }
  function chart(){
    const el=$('sy-chart');const w=RD.width(el),h=200,pl=40,pr=12,pt=12,pb=34;
    const Rs=[128,256],cols=['var(--c1)','var(--c2)'];let body='';
    const xs=[],X0=st.sweep==='kn'?16:1,X1=st.sweep==='kn'?1024:16384;
    const npts=Math.max(120,Math.min(500,w));
    for(let i=0;i<=npts;i++){const v=st.sweep==='kn'?Math.round(X0+(X1-X0)*i/npts):Math.round(Math.pow(2,Math.log2(X0)+(Math.log2(X1)-Math.log2(X0))*i/npts));xs.push(v)}
    const sx=v=>st.sweep==='kn'?pl+(w-pl-pr)*(v-X0)/(X1-X0):pl+(w-pl-pr)*(Math.log2(v)-Math.log2(X0))/(Math.log2(X1)-Math.log2(X0));
    const sy=u=>pt+(h-pt-pb)*(1-u);
    for(let g=0;g<=4;g++){const y=sy(g/4);body+='<line x1="'+pl+'" x2="'+(w-pr)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/>'+RD.t(pl-4,y+4,(g*25)+'%',{a:'end',fs:10,fill:'var(--mute)'})}
    const ticks=st.sweep==='kn'?[128,256,384,512,640,768,896,1024]:[1,8,64,512,4096,16384];
    ticks.forEach(v=>{const x=sx(v);body+='<line x1="'+x+'" x2="'+x+'" y1="'+(h-pb)+'" y2="'+(h-pb+4)+'" stroke="var(--mute)"/>'+RD.t(x,h-pb+15,fmt(v),{a:v===ticks[ticks.length-1]?'end':'middle',fs:10,fill:'var(--mute)'})});
    body+=RD.t((pl+w-pr)/2,h-4,st.sweep==='kn'?'K = N (with M = 8,192)':'M, tokens per array (log scale; K = 4,096, N = 14,336)',{a:'middle',fs:10.5,fill:'var(--mute)'});
    Rs.forEach((R,j)=>{let d='';xs.forEach((v,i)=>{const t=st.sweep==='kn'?SYS.tiled(8192,v,v,R,R):SYS.tiled(v,4096,14336,R,R);d+=(i?'L':'M')+sx(v).toFixed(1)+' '+sy(t.util).toFixed(1)});
      body+='<path d="'+d+'" fill="none" stroke="'+cols[j]+'" stroke-width="1.8"/>'+RD.t(pl+8+j*96,pt+12,R+' x '+R,{fs:11,w:600,fill:cols[j]})});
    // current point
    const M=MV[st.m];const cv=st.sweep==='kn'?(st.k===st.n&&st.k>=X0&&st.k<=X1&&M===8192?st.k:null):(st.k===4096&&st.n===14336?M:null);
    if(cv!=null&&(st.r===128||st.r===256)){const t=st.sweep==='kn'?SYS.tiled(8192,cv,cv,st.r,st.r):SYS.tiled(cv,4096,14336,st.r,st.r);body+='<circle cx="'+sx(cv)+'" cy="'+sy(t.util)+'" r="4.5" fill="var(--ink)"/>'}
    el.innerHTML=RD.svg(w,h,body,'Utilisation sweep');
  }
  // controls
  $('sy-m').value=st.m;$('sy-k').value=st.k;$('sy-n').value=st.n;
  $('sy-m').addEventListener('input',e=>{st.m=+e.target.value;out()});
  const num=(id,key,max)=>$(id).addEventListener('change',e=>{let v=Math.round(+e.target.value);if(!(v>=1))v=1;if(v>max)v=max;e.target.value=v;st[key]=v;out()});
  num('sy-k','k',65536);num('sy-n','n',262144);
  $('sy-r').addEventListener('change',e=>{st.r=+e.target.value;out()});
  $('sy-pre').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const p=b.dataset.p.split(',').map(Number);
    st.m=MV.indexOf(p[0]);st.k=p[1];st.n=p[2];st.r=p[3];$('sy-m').value=st.m;$('sy-k').value=st.k;$('sy-n').value=st.n;$('sy-r').value=String(st.r);out()});
  RD.seg($('sy-sweep'),m=>{st.sweep=m;chart()});
  // small-tile animation
  let sim=null,X=null,W=null;
  function seeded(n){let s=n*2654435761>>>0;return ()=>{s=(s*1103515245+12345)>>>0;return 1+((s>>>16)%3)}}
  function build(){const M=+$('sy-am').value,K=+$('sy-ak').value,N=+$('sy-an').value;$('sy-am-v').textContent=M;$('sy-ak-v').textContent=K;$('sy-an-v').textContent=N;
    const r=seeded(M*100+K*10+N);X=[...Array(M)].map(()=>[...Array(K)].map(r));W=[...Array(K)].map(()=>[...Array(N)].map(r));sim=SYS.simulate(X,W);
    let ok=true;for(let m=0;m<M;m++)for(let n=0;n<N;n++){let s=0;for(let k=0;k<K;k++)s+=X[m][k]*W[k][n];if(s!==sim.Y[m][n])ok=false}
    sim.ok=ok;return sim.cycles}
  function drawA(i){const el=$('sy-anim');const K=X[0].length,N=W[0].length,M=X.length;const w=RD.width(el);const s=Math.max(16,Math.min(40,Math.floor((w-20)/N)));
    const f=sim.frames[i];let h='';
    for(let k=0;k<K;k++)for(let n=0;n<N;n++){const pe=f.pe[k][n];const c=pe?'hsl('+(200+pe.m*137%160)+',55%,'+(document.documentElement&&matchMedia('(prefers-color-scheme: dark)').matches?'45%':'70%')+')':'var(--soft)';
      h+='<rect x="'+(10+n*s)+'" y="'+(10+k*s)+'" width="'+(s-2)+'" height="'+(s-2)+'" rx="2" fill="'+c+'" stroke="var(--line)"/>'+(pe&&s>=22?RD.t(10+n*s+s/2-1,10+k*s+s/2+3,'x'+pe.m,{a:'middle',fs:Math.max(8,Math.round(s*0.3))}):'')}
    el.innerHTML=RD.svg(Math.max(w,10+N*s+10),10+K*s+8,h,'Cells busy this cycle');
    let macs=0;for(let j=0;j<=i;j++)macs+=sim.frames[j].act;
    $('sy-acap').innerHTML='<b>Cycle '+(i+1)+' of '+sim.cycles+'</b> (M + K + N &minus; 2 = '+(M+K+N-2)+'): '+f.act+' of '+(K*N)+' cells busy; each colour is one row of X (label x<i>m</i>) moving right and down as a diagonal band. Multiply-adds so far '+macs+' of '+(M*K*N)+'; whole tile utilisation '+Math.round(100*M*K*N/(K*N*sim.cycles))+'%. Result '+(sim.ok?'<span class="ok">matches the plain matrix multiply</span>':'<span class="bad">does not match</span>')+'.'}
  build();
  const A=RD.anim({card:'sy-anim-card',ctl:'sy-actl',n:sim.cycles,ms:700,label:'Cycle',draw:drawA});
  ['sy-am','sy-ak','sy-an'].forEach(id=>$(id).addEventListener('input',()=>{A.reset(build())}));
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-sys']=[()=>{out();A.redraw()}];
  addEventListener('resize',()=>{if(!tab.hidden){chart();A.redraw()}});
  out();
  window.__tpuSys={tiled:SYS.tiled,reads:reads,simulate:SYS.simulate};
})();
