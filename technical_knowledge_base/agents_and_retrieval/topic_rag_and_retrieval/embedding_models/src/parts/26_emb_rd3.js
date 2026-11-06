// ---- Reading tab, part 3 (2026-10-24 rebuild): similarity example, smaller-vectors slider (the hero and the batch matrix became the 3D stages Fig. 1 and Fig. 3, 2026-11-06) ----
(function(){
  const E=window.EMB,esc=RD.esc;
  const draws=[];const reg=f=>{draws.push(f);RD.onRender(f)};RD.onResize(()=>draws.forEach(f=>{try{f()}catch(e){}}));
  // ---------- similarity worked example
  reg(function(){const el=document.getElementById('emb-sim-svg');if(!el)return;
    const W=Math.max(280,Math.min(RD.width(el),520)),pad=30,sx=(W-2*pad)/2.3,H=Math.round(1.12*sx+pad+24);
    const X=v=>pad+(v+0.1)*sx,Y=v=>H-pad-(v+0.05)*sx;let s='';
    s+='<line x1="'+X(-0.1)+'" y1="'+Y(0)+'" x2="'+X(2.2)+'" y2="'+Y(0)+'" stroke="var(--line)"/><line x1="'+X(0)+'" y1="'+Y(-0.05)+'" x2="'+X(0)+'" y2="'+Y(1.15)+'" stroke="var(--line)"/>';
    let arc='';for(let a=0;a<=90;a+=3){const r=a*Math.PI/180;arc+=(a?' L':'M')+X(Math.cos(r)).toFixed(1)+','+Y(Math.sin(r)).toFixed(1)}
    s+='<path d="'+arc+'" fill="none" stroke="var(--mute)" stroke-dasharray="3 3"/>'+RD.t(X(0.87)+6,Y(0.5),'length 1',{fs:11,fill:'var(--mute)'});
    const vec=(x,y,c,w)=>{const a=Math.atan2(-(Y(y)-Y(0)),X(x)-X(0)),ex=X(x),ey=Y(y),hx=ex-9*Math.cos(a),hy=ey+9*Math.sin(a);
      return '<line x1="'+X(0)+'" y1="'+Y(0)+'" x2="'+hx.toFixed(1)+'" y2="'+hy.toFixed(1)+'" stroke="'+c+'" stroke-width="'+(w||2)+'"/><path d="M'+ex.toFixed(1)+','+ey.toFixed(1)+' L'+(hx-4.5*Math.sin(a)).toFixed(1)+','+(hy-4.5*Math.cos(a)).toFixed(1)+' L'+(hx+4.5*Math.sin(a)).toFixed(1)+','+(hy+4.5*Math.cos(a)).toFixed(1)+' Z" fill="'+c+'"/>'};
    s+=vec(2,0,'var(--c2)',3)+vec(1,0,'var(--c3)',2)+vec(0,1,'var(--c4)',2)+vec(0.6,0.8,'var(--acc)',2.5);
    s+=RD.t(X(0.6)+6,Y(0.8)-4,'q (0.6, 0.8)',{fs:12,w:600,fill:'var(--acc)'});
    s+=RD.t(X(0)+6,Y(1)-6,'d₂: dot 0.8, cos 0.8',{fs:11.5,fill:'var(--c4)'});
    s+=RD.t(X(1),Y(0)+16,'d₁: dot 0.6, cos 0.6',{fs:11.5,a:'middle',fill:'var(--c3)'});
    s+=RD.t(X(2),Y(0)-8,'d₃: dot 1.2, cos 0.6',{fs:11.5,a:'end',fill:'var(--c2)'});
    el.innerHTML=RD.svg(W,H,s,'dot product against cosine on three documents')});
  // ---------- smaller vectors: dimensions slider, precision switch
  (function(){const el=document.getElementById('emb-mq-svg');if(!el||!E.mq)return;const M=E.mq;
    const SH=[1/32,1/16,1/8,1/4,1/2,1],SN=['1/32','1/16','1/8','1/4','1/2','all'];let prec='float32';const dEl=document.getElementById('emb-mq-d');
    const pick=p=>p==='binary100'?['binary',100]:[p,null];
    const series=(m,p)=>{const [pr,rs]=pick(p);const full=M.full[m],D=M.dim[m];
      const pts=M[m].filter(r=>r[1]===pr&&r[2]===rs).map(r=>[Math.log2(r[0]/D),r[4]/full,r[0],r[3],r[4],r[5]]);
      if(m!=='qwen3')pts.push([0,1,D,D*4,full,1]);return pts.sort((a,b)=>a[0]-b[0])};
    function draw(){const si=+dEl.value,sh=SH[si],xv=Math.log2(sh);document.getElementById('emb-mq-dv').textContent=SN[si]+' ('+Math.round(sh*M.dim.qwen3)+' of Qwen3\'s '+M.dim.qwen3+')';
      const PN={float32:'float32',int8:'int8',binary:'binary',binary100:'binary + rescore 100'};
      const ser=[];
      if(prec!=='float32')ser.push({name:'Qwen3 float32',color:'var(--c4)',pts:series('qwen3','float32').map(p=>[p[0],p[1],'Qwen3 float32, '+p[2]+' dims: '+p[4].toFixed(3)]),dash:1,op:0.5,r:2.5});
      ser.push({name:'Qwen3',color:'var(--c4)',w:2.6,pts:series('qwen3',prec).map(p=>[p[0],p[1],'Qwen3 '+PN[prec]+', '+p[2]+' dims, '+p[3]+' B: '+p[4].toFixed(3)])});
      ser.push({name:'bge',color:'var(--c1)',pts:series('bge','float32').map(p=>[p[0],p[1],'bge-small float32, '+p[2]+' dims: '+p[4].toFixed(3)])});
      ser.push({name:'gte',color:'var(--c3)',pts:series('gte','float32').map(p=>[p[0],p[1],'gte-modernbert float32, '+p[2]+' dims: '+p[4].toFixed(3)])});
      const narrow=RD.width(el)<480;
      EL.chart(el,ser,{x0:-5.2,x1:0.2,y0:0,y1:1.05,xticks:[-5,-4,-3,-2,-1,0],xfmt:v=>v===0?'all':'1/'+Math.pow(2,-v),yticks:[0,0.25,0.5,0.75,1],yfmt:v=>Math.round(100*v)+'%',
        xlabel:'share of the dimensions kept',ylabel:'share of the full nDCG@10 (SciFact)',h:270,
        pre:(X,Y)=>'<line x1="'+X(xv)+'" y1="16" x2="'+X(xv)+'" y2="'+Y(0)+'" stroke="var(--acc)" stroke-width="1.5" stroke-dasharray="4 3"/>',
        post:(X,Y)=>{const lab=(t,p,c,dy)=>p?RD.t(X(p[0])-(narrow?2:6),Y(p[1])+dy,t,{a:'end',fs:11,fill:c,w:600}).replace('<text ','<text style="paint-order:stroke;stroke:var(--bg);stroke-width:3px" '):'';
          const q=series('qwen3',prec),b=series('bge','float32'),g=series('gte','float32');
          return lab('Qwen3 '+(narrow&&prec==='binary100'?'bin+100':PN[prec]),q[1],'var(--c4)',-8)+lab('bge-small',b[0],'var(--c1)',16)+lab('gte',g[0],'var(--c3)',-6)}});
      const at=(m,p)=>series(m,p).find(r=>Math.abs(r[0]-xv)<1e-9);const q=at('qwen3',prec),b=at('bge','float32'),g=at('gte','float32');
      const fmtB=x=>x>=1e9?(x/1e9).toFixed(2)+' GB':(x/1e6).toFixed(0)+' MB';
      document.getElementById('emb-mq-ctr').innerHTML='<span>Qwen3 '+PN[prec]+': <b>'+(q?q[3]+' B':'n/a')+'</b> per vector, nDCG@10 <b>'+(q?q[4].toFixed(3):'n/a')+'</b> (<b>'+(q?Math.round(100*q[1])+'%':'n/a')+'</b> of full), exact top 10 kept <b>'+(q?q[5].toFixed(3):'n/a')+'</b>, 1M vectors <b>'+(q?fmtB(q[3]*1e6):'n/a')+'</b></span>'+
        '<span>bge-small float32 at this share: <b>'+(b?b[4].toFixed(3)+' ('+Math.round(100*b[1])+'%)':'not run')+'</b></span><span>gte-modernbert: <b>'+(g?g[4].toFixed(3)+' ('+Math.round(100*g[1])+'%)':'not run at this share')+'</b></span>'}
    RD.seg(document.getElementById('emb-mq-prec'),v=>{prec=v;draw()});dEl.addEventListener('input',draw);reg(draw)})();
})();
