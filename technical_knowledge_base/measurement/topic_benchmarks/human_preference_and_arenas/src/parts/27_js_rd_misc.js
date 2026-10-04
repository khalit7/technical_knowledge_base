// ---- Reading: best-of-N inflation, null-model bars, preference against capability (ids rd-bon-, rd-null-, rd-cap-) ----
(function(){
  // best of N private variants
  const SREF=10.4/1.96,VREF=3145;
  const nIn=document.getElementById('rd-bon-n'),vIn=document.getElementById('rd-bon-v');
  const EM={};const em=N=>EM[N]!=null?EM[N]:(EM[N]=HP.emax(N));
  function bon(){
    const N=+nIn.value,V=+vIn.value,s=SREF*Math.sqrt(VREF/V),e=em(N),inf=s*e;
    document.getElementById('rd-bon-nv').textContent=N;document.getElementById('rd-bon-vv').textContent=V.toLocaleString('en-US');
    document.getElementById('rd-bon-out').innerHTML=RD.stat('Noise per variant, σ',s.toFixed(1)+' pts','5.3 × √(3,145 / '+V.toLocaleString('en-US')+')')+RD.stat('E[max of N] in σ',e.toFixed(2),'best of '+N+' equal variants')+RD.stat('Expected inflation',inf.toFixed(1)+' pts','σ × E[max]');
    const el=document.getElementById('rd-bon-svg');const W=Math.max(300,Math.min(860,RD.width(el)));const H=150,L=40,R=W-12,T=12,Bm=H-26;
    const xs=k=>L+(k-1)/59*(R-L),ys=v=>Bm-(v/40)*(Bm-T);let b='';
    [0,10,20,30,40].forEach(v=>{b+='<line x1="'+L+'" x2="'+R+'" y1="'+ys(v)+'" y2="'+ys(v)+'" stroke="var(--line)"/>'+RD.t(L-5,ys(v)+4,v,{a:'end',fs:10,fill:'var(--mute)'})});
    [1,10,20,30,40,50,60].forEach(k=>{b+=RD.t(xs(k),H-8,k,{a:'middle',fs:10,fill:'var(--mute)'})});
    let d='';for(let k=1;k<=60;k++)d+=(k===1?'M':'L')+xs(k).toFixed(1)+','+ys(s*em(k)).toFixed(1);
    b+='<path d="'+d+'" fill="none" stroke="var(--c2)" stroke-width="2"/><circle cx="'+xs(N)+'" cy="'+ys(inf)+'" r="4.5" fill="var(--c2)"/>';
    b+='<line x1="'+L+'" x2="'+R+'" y1="'+ys(11)+'" y2="'+ys(11)+'" stroke="var(--c1)" stroke-dasharray="4 3"/>'+RD.t(L+4,ys(11)-4,'Arena: about +11 after 50 tests, 3,000 votes',{fs:10,fill:'var(--c1)'});
    b+=RD.t(L,T-2,'inflation, points',{fs:10,fill:'var(--mute)'})+RD.t(R,H-8,'',{a:'end'});
    el.innerHTML=RD.svg(W,H,b,'Expected inflation against the number of variants');
  }
  nIn.addEventListener('input',bon);vIn.addEventListener('input',bon);RD.onRender(bon);RD.onResize(bon);bon();

  // null model against the best real entry
  function nul(){
    const el=document.getElementById('rd-null-svg');const W=Math.max(300,Math.min(860,RD.width(el)));
    const B=[{n:'AlpacaEval 2.0, LC win rate',nul:86.5,real:57.45,rn:'GPT-4o',max:100,u:'%'},{n:'Arena-Hard-Auto v0.1',nul:'83.0',real:null,max:100,u:''},{n:'MT-Bench (1 to 10)',nul:9.55,real:9.32,rn:'GPT-4-1106-preview',max:10,u:''}];
    const nar=W<520,L=nar?6:190,R=W-12,rowH=nar?62:46,H=rowH*B.length+10;let b='';
    B.forEach((r,k)=>{const y=k*rowH+(nar?22:8),x=v=>L+v/r.max*(R-L);
      b+=nar?RD.t(L,y-6,r.n,{fs:11,w:600}):RD.t(L-8,y+15,r.n,{a:'end',fs:11.5});
      const lbl=(v,yy,txt)=>{const inside=(x(v)-L)>(R-L)*0.55;return RD.t(inside?x(v)-4:x(v)+4,yy,txt,{fs:10.5,a:inside?'end':'start',fill:inside?'var(--bg)':undefined})};
      b+='<rect x="'+L+'" y="'+y+'" width="'+(x(+r.nul)-L)+'" height="14" fill="var(--bad)"/>'+lbl(+r.nul,y+11,r.nul+(r.u)+' null model');
      if(r.real!=null)b+='<rect x="'+L+'" y="'+(y+18)+'" width="'+(x(r.real)-L)+'" height="14" fill="var(--c1)"/>'+lbl(r.real,y+29,r.real+(r.u)+' '+r.rn);
      else b+=RD.t(L+4,y+29,'no maintained board for v0.1',{fs:10.5,fill:'var(--mute)'});
    });
    el.innerHTML=RD.svg(W,H,b,'Null model scores against the best real entries');
  }
  RD.onRender(nul);RD.onResize(nul);nul();

  // preference against capability
  const P=window.HPD.pvc.rows;let key='r';const same=document.getElementById('rd-cap-same');
  function cap(){
    const rs=P.filter(r=>r[key]!=null&&(!same.checked||r.same));
    const el=document.getElementById('rd-cap-svg');const W=Math.max(300,Math.min(860,RD.width(el)));const H=W<480?300:360,L=46,R=W-12,T=14,Bm=H-30;
    const xs=v=>L+(v-5)/(60-5)*(R-L);const ylo=key==='hp'?1380:1340,yhi=key==='hp'?1560:1540;const ys=v=>Bm-(v-ylo)/(yhi-ylo)*(Bm-T);
    let b='';for(let v=ylo;v<=yhi;v+=40)b+='<line x1="'+L+'" x2="'+R+'" y1="'+ys(v)+'" y2="'+ys(v)+'" stroke="var(--line)"/>'+RD.t(L-5,ys(v)+4,v,{a:'end',fs:10,fill:'var(--mute)'});
    for(let v=10;v<=60;v+=10)b+='<line x1="'+xs(v)+'" x2="'+xs(v)+'" y1="'+T+'" y2="'+Bm+'" stroke="var(--line)"/>'+RD.t(xs(v),H-14,v,{a:'middle',fs:10,fill:'var(--mute)'});
    b+=RD.t((L+R)/2,H-2,'Artificial Analysis Intelligence Index v4.3',{a:'middle',fs:10.5,fill:'var(--mute)'})+RD.t(L+4,T+10,'Arena text score'+(key==='hp'?', hard prompts':''),{fs:10.5,fill:'var(--mute)'});
    const lab=['gemini-4-argon-high','claude-opus-5.5-high','gpt-6-astra-max','grok-4.7-xhigh','kimi-k3-max','claude-sonnet-5.5-xhigh','gemini-3.1-pro-preview','gpt-oss-120b'];
    rs.forEach(r=>{const cx=xs(r.idx),cy=ys(r[key]);
      b+='<circle cx="'+cx.toFixed(1)+'" cy="'+cy.toFixed(1)+'" r="4.5" fill="'+(r.same?'var(--c1)':'var(--bg)')+'" stroke="var(--c1)" stroke-width="1.6"><title>'+RD.esc(r.m)+': index '+r.idx+', Arena '+r[key]+'</title></circle>';
      if(W>=480&&lab.includes(r.m)){const rt=cx>R-150;b+=RD.t(rt?cx-7:cx+7,cy+4,RD.esc(r.m),{fs:10,fill:'var(--mute)',a:rt?'end':'start'})}
    });
    el.innerHTML=RD.svg(W,H,b,'Arena score against capability index');
    const sp=a=>a.length>2?HP.spearman(a.map(r=>r.idx),a.map(r=>r[key])):NaN;
    const fr=rs.filter(r=>r.idx>=40);
    document.getElementById('rd-cap-out').innerHTML=RD.stat('Models shown',rs.length,same.checked?'same effort on both boards':'all matched')+RD.stat('Spearman, all shown',sp(rs).toFixed(2),'rank agreement')+RD.stat('Spearman, index 40 or more',sp(fr).toFixed(2),fr.length+' frontier models');
  }
  RD.seg(document.getElementById('rd-cap-seg'),m=>{key=m;cap()});same.addEventListener('change',cap);RD.onRender(cap);RD.onResize(cap);cap();
  window.HP_CHECK=window.HP_CHECK||{};window.HP_CHECK.bon=()=>({emax50:HP.emax(50),inf:SREF*Math.sqrt(VREF/3000)*HP.emax(50)});
})();
