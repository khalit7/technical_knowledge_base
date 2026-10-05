// ---- Reading s2: one SM per generation, drawn from its published counts (schematic, not silicon area) ----
(function(){
  const G=window.GA,$=id=>document.getElementById(id);
  const SM={
    a100:{name:'A100 SM (Ampere, 8.0)',lanes:16,l1:192,smem:164,tma:false,tmem:0,warps:64,note:'64 FP32 lanes per SM, 16 per quadrant; 192 KB L1/shared, up to 164 KB as shared memory; asynchronous copy but no TMA.'},
    h100:{name:'H100 SM (Hopper, 9.0)',lanes:32,l1:256,smem:228,tma:true,tmem:0,warps:64,note:'128 FP32 lanes per SM, 32 per quadrant; 256 KB L1/shared, up to 228 KB as shared memory; TMA copy engine.'},
    b300:{name:'B200 / B300 SM (Blackwell, 10.0 / 10.3)',lanes:32,l1:256,smem:228,tma:true,tmem:256,warps:64,note:'128 CUDA cores per SM; 256 KB L1/shared (228 KB shared); plus 256 KB tensor memory for tensor-core accumulators. SM details from Inside Blackwell Ultra; B200 shares the 10.0 limits.'},
    rtx5090:{name:'RTX 5090 SM (Blackwell consumer, 12.0)',lanes:32,l1:128,smem:100,tma:true,tmem:0,warps:48,note:'128 FP32 lanes per SM; 128 KB L1/shared (100 KB shared); TMA compiles for sm_120, but no tensor memory and at most 48 resident warps.'}
  };
  let cur='h100';
  function draw(){
    const s=SM[cur],box=$('ga-smSvg'),W=Math.min(760,RD.width(box));
    const pad=8,qw=(W-pad*3)/2,qh=Math.max(118,Math.min(150,qw*0.5));
    let g='';
    const q=(x,y,i)=>{
      let o='<rect x="'+x+'" y="'+y+'" width="'+qw+'" height="'+qh+'" rx="6" fill="var(--soft)" stroke="var(--line)"/>';
      o+=RD.t(x+8,y+15,'Quadrant '+(i+1),{fs:11,w:600});
      o+='<rect x="'+(x+8)+'" y="'+(y+21)+'" width="'+(qw-16)+'" height="16" rx="3" fill="var(--acc2)"/>'+RD.t(x+qw/2,y+33,qw<260?'warp scheduler':'warp scheduler + dispatch (1 instruction / cycle)',{a:'middle',fs:10});
      // registers
      const rw=Math.max(54,(qw-16)*0.3);
      o+='<rect x="'+(x+8)+'" y="'+(y+43)+'" width="'+rw+'" height="'+(qh-51)+'" rx="3" fill="var(--c5)" opacity=".35"/>'+RD.t(x+8+rw/2,y+43+(qh-51)/2-2,'registers',{a:'middle',fs:10})+RD.t(x+8+rw/2,y+43+(qh-51)/2+11,'64 KB',{a:'middle',fs:10,w:600});
      // lanes
      const lx=x+14+rw,lw=qw-16-rw-6-Math.max(40,(qw-16)*0.24),cols=8,rows=s.lanes/cols,cw=Math.min(14,(lw-4)/cols),ch=Math.min(11,(qh-51-16)/4);
      for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)o+='<rect x="'+(lx+c*cw)+'" y="'+(y+46+r*ch)+'" width="'+(cw-2)+'" height="'+(ch-2)+'" fill="var(--c1)" opacity=".7"/>';
      o+=RD.t(lx,y+qh-8,s.lanes+' FP32 lanes',{fs:9.5});
      const tx=x+qw-8-Math.max(40,(qw-16)*0.24),tw=Math.max(40,(qw-16)*0.24);
      o+='<rect x="'+tx+'" y="'+(y+43)+'" width="'+tw+'" height="'+(qh-51)+'" rx="3" fill="var(--c3)" opacity=".55"/>'+RD.t(tx+tw/2,y+43+(qh-51)/2-2,'tensor',{a:'middle',fs:10})+RD.t(tx+tw/2,y+43+(qh-51)/2+11,'core',{a:'middle',fs:10});
      return o;
    };
    g+=RD.t(pad,14,s.name,{fs:12.5,w:600});
    const y0=22;
    for(let i=0;i<4;i++)g+=q(pad+(i%2)*(qw+pad),y0+Math.floor(i/2)*(qh+pad),i);
    let y=y0+2*(qh+pad);
    const full=W-2*pad,scale=full/256;
    // L1/shared to scale of 256 KB
    const l1w=s.l1*scale,shw=s.smem*scale;
    g+='<rect x="'+pad+'" y="'+y+'" width="'+l1w+'" height="26" rx="4" fill="var(--c4)" opacity=".25" stroke="var(--c4)"/>';
    g+='<rect x="'+pad+'" y="'+y+'" width="'+shw+'" height="26" rx="4" fill="var(--c4)" opacity=".35"/>';
    g+=RD.t(pad+6,y+17,'L1 + shared memory '+s.l1+' KB (up to '+s.smem+' KB shared)',{fs:W<420?9.5:11});
    y+=32;
    if(s.tma){g+='<rect x="'+pad+'" y="'+y+'" width="'+Math.min(140,full*0.36)+'" height="22" rx="4" fill="var(--c6)" opacity=".4"/>'+RD.t(pad+6,y+15,'TMA copy engine',{fs:10.5});}
    else{g+=RD.t(pad,y+15,'no TMA (asynchronous copy is issued by threads)',{fs:10.5,fill:'var(--mute)'});}
    y+=28;
    if(s.tmem){g+='<rect x="'+pad+'" y="'+y+'" width="'+(s.tmem*scale)+'" height="26" rx="4" fill="var(--c2)" opacity=".35" stroke="var(--c2)"/>'+RD.t(pad+6,y+17,'tensor memory (TMEM) 256 KB: 128 lanes x 512 columns, accumulators only',{fs:W<420?9:11});y+=32;}
    g+=RD.t(pad,y+12,W<480?'Up to '+s.warps+' resident warps per SM. Bars: 256 KB scale.':'Resident warps: up to '+s.warps+' per SM ('+(s.warps/4)+' per scheduler). Bars to scale of 256 KB.',{fs:10,fill:'var(--mute)'});
    y+=18;
    box.innerHTML=RD.svg(W,y,g,s.name);
    $('ga-smNote').textContent=s.note;
  }
  RD.seg($('ga-smSeg'),m=>{cur=m;draw()});
  RD.onRender(draw);RD.onResize(draw);draw();
  // table
  const rows=[['FP32 lanes per SM (per quadrant)','64 (16)','128 (32)','128 (32)','128 (32)'],['Tensor cores per SM','4','4','4','4'],['Register file','256 KB','256 KB','256 KB','256 KB'],
    ['L1 + shared (max shared)','192 KB (164)','256 KB (228)','256 KB (228)','128 KB (100)'],['Tensor memory','none','none','256 KB','none'],['Resident warps','64','64','64','48'],['Copy engine','async copy','TMA','TMA','TMA']];
  $('ga-smTable').innerHTML='<thead><tr><th>Per SM</th><th class="num">A100</th><th class="num">H100</th><th class="num">B200 / B300</th><th class="num">RTX 5090</th></tr></thead><tbody>'+rows.map(r=>'<tr><td>'+r[0]+'</td>'+r.slice(1).map(v=>'<td class="num">'+v+'</td>').join('')+'</tr>').join('')+'</tbody>';
})();
