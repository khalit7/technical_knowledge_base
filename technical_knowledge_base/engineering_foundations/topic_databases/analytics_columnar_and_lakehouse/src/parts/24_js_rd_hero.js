// ---- Reading, top: the hero figure. The real 82-row-group Parquet file drawn as area (bytes), one-day query highlighted ----
(function(){
  const el=document.getElementById('heroSvg');if(!el)return;
  const F=D.full,R=F.rgs,N=R.length;
  const cols=F.rg0_columns.map(c=>({col:c.col,b:c.compressed}));const tot=cols.reduce((a,c)=>a+c.b,0);
  const day=r=>!(r.ca1<'2026-03-01 00:00:00'||r.ca0>='2026-03-02 00:00:00');
  const hit=R.findIndex(day);
  const need={created_at:1,tokens:1};
  function draw(){
    const W=RD.width(el),narrow=W<560,ml=narrow?0:118,fw=3,H=narrow?190:220,top=narrow?30:26,bot=26;
    const pw=W-ml-fw-6,bw=pw/N,ph=H-top-bot;
    let b='',y=top;
    const ys={};
    cols.forEach(c=>{const h=c.b/tot*ph;ys[c.col]=[y,h];y+=h});
    for(let g=0;g<N;g++){const x=ml+g*bw;
      cols.forEach(c=>{const [yy,h]=ys[c.col];let fill='var(--dim)',op=0.55;
        if(need[c.col]){fill=g===hit?'var(--c2)':'var(--acc2)';op=1}
        b+='<rect x="'+x.toFixed(2)+'" y="'+yy.toFixed(2)+'" width="'+Math.max(0.6,bw-0.6).toFixed(2)+'" height="'+Math.max(0.3,h).toFixed(2)+'" fill="'+fill+'" fill-opacity="'+op+'"/>'})}
    // footer at the end of the file
    // the footer is 76,648 bytes, 0.014% of the file: drawn as a 3 px line, not to scale, so it can be seen
    const fx=ml+pw+5;b+='<rect x="'+fx+'" y="'+top+'" width="'+fw+'" height="'+ph+'" fill="var(--c2)"/>';
    // labels
    if(!narrow){['content','created_at'].forEach(k=>{const [yy,h]=ys[k];b+=RD.t(ml-6,yy+h/2+4,k,{a:'end',fs:11})});
      const y0=ys.id[0],y1=ys.content[0];b+=RD.t(ml-6,(y0+y1)/2-2,'id, chat_id,',{a:'end',fs:11})+RD.t(ml-6,(y0+y1)/2+11,'role, model, tokens',{a:'end',fs:11})}
    else{const [yy,h]=ys.content;b+=RD.t(6,yy+h/2+4,'content (73% of the bytes)',{fs:11.5,w:600})}
    const [cy,ch]=ys.created_at;const hx=ml+(hit+0.5)*bw;
    b+='<line x1="'+hx+'" x2="'+hx+'" y1="'+(cy+ch)+'" y2="'+(H-bot+6)+'" stroke="var(--c2)" stroke-width="1.5"/>';
    b+=RD.t(Math.min(Math.max(hx,ml+90),W-110),H-6,'row group '+hit+': holds 1 March',{a:'middle',fs:11,fill:'var(--c2)',w:600});
    b+=RD.t(ml,top-10,'row group 0',{fs:11,fill:'var(--mute)'})+RD.t(ml+pw,top-10,'row group 81',{a:'end',fs:11,fill:'var(--mute)'});
    b+=RD.t(W,H-6,narrow?'footer':'footer, read first',{a:'end',fs:11,fill:'var(--c2)',w:600});
    if(!narrow){b+=RD.t(ml+pw/2,top-10,'534 MB, 82 row groups, area = bytes',{a:'middle',fs:11,fill:'var(--mute)'})}
    el.innerHTML=RD.svg(W,H,b,'The 534 MB Parquet file as 82 row groups of 7 column chunks; the one-day query reads the footer and two chunks of one row group');
  }
  draw();RD.onRender(draw);RD.onResize(draw);
  window.CHK=window.CHK||{};CHK.heroHit=hit;
})();
