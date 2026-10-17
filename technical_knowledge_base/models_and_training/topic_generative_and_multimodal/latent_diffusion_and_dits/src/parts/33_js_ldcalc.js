// ---- Tokens and FLOPs calculator (t-ldcalc) ----
(function(){
  const U=window.LDU,L=U.L,$=id=>document.getElementById(id),A=U.byKey;
  const keys=L.arch.map(m=>m.key);
  $('lc-m').innerHTML=keys.map(k=>'<option value="'+k+'">'+A[k].label+'</option>').join('');$('lc-m').value='flux1';
  const P=L.pipe,C=L.pub.cards;
  const DEF={sd15:[512,512,77,P.sd15.num_inference_steps,2],sdxl:[1024,1024,77,P.sdxl.num_inference_steps,2],dit:[256,256,0,P.dit.num_inference_steps,2],pixart:[1024,1024,300,P.pixart.num_inference_steps,2],
    sana:[1024,1024,300,P.sana.num_inference_steps,2],sd3m:[1024,1024,333,P.sd3.num_inference_steps,2],sd35l:[1024,1024,333,P.sd3.num_inference_steps,2],flux1:[1024,1024,512,P.flux1.num_inference_steps,1],
    flux2k:[1024,1024,512,C.flux2_klein_4b.steps,1],qwen:[1024,1024,128,P.qwen.num_inference_steps,2],zimg:[1024,1024,128,C.zimage_turbo.forwards,1]};
  // measured effective throughput: SD 1.5 U-Net at 512, batch 1
  const r5=((L.sd&&L.sd.res_sweep)||[]).find(r=>r.px===512),g5=U.grid('sd15',512);
  const m1=r5?g5[2]/r5.unet_s/1e12:null;
  function preset(k){const d=DEF[k];$('lc-w').value=d[0];$('lc-h').value=d[1];$('lc-t').value=d[2];$('lc-s').value=d[3];$('lc-p').value=d[4];$('lc-t').disabled=A[k].kind==='dit'}
  if(m1)$('lc-tp').value=U.fx(m1,2);
  function calc(){const k=$('lc-m').value,f=L.flops[k];const W=Math.max(64,+$('lc-w').value||0),H=Math.max(64,+$('lc-h').value||0);
    const T=A[k].kind==='dit'?0:Math.max(0,+$('lc-t').value||0),S=Math.max(1,+$('lc-s').value||1),Pp=+$('lc-p').value,N=Math.max(1,+$('lc-n').value||1),tp=Math.max(0.01,+$('lc-tp').value||1);
    const step=f.f*(f.p||1),lw=Math.floor(W/f.f),lh=Math.floor(H/f.f),tok=Math.floor(W/step)*Math.floor(H/step);
    const F=U.flops(k,tok,T),attn=f.fit[3]*tok*tok+f.fit[4]*tok*T+f.fit[5]*T*T,img=F*S*Pp,sec=img/(tp*1e12);
    const warn=(W%step||H%step)?' (size not a multiple of '+step+': cropped)':'';
    $('lc-out').innerHTML=RD.stat('Latent',lw+' &times; '+lh+' &times; '+f.ch,f.f+'&times; VAE'+warn)+RD.stat(A[k].kind==='unet'?'Top-level positions':'Image tokens',U.int(tok),(f.p?'patch '+f.p:'U-Net')+(T?', + '+T+' text':''))+
      RD.stat('FLOPs per pass',U.FL(F),'quadratic terms '+U.pct(Math.max(0,attn)/F,0))+RD.stat('Per image',U.FL(img),S+' steps &times; '+Pp+' pass'+(Pp>1?'es':''))+
      RD.stat(N>1?'For '+U.int(N)+' images':'Time per image',N>1?U.FL(img*N):(sec<1?U.fx(sec*1000,0)+' ms':U.fx(sec,1)+' s'),N>1?U.fx(sec*N/3600,2)+' hours at '+U.fx(tp,2)+' TFLOP/s':'at '+U.fx(tp,2)+' TFLOP/s');
    const grid=U.grid(k,W===H?W:-1,T);
    $('lc-check').innerHTML=grid?'Counted directly at this size and text length: '+U.FL(grid[2])+' (formula: '+U.FL(F)+').':'This size or text length was not counted directly; the formula is exact for the network\'s structure, so this is arithmetic, not extrapolation of a trend'+(k==='zimg'?' (Z-Image: within 2%, its code pads sequences)':'')+'.'}
  RD.seg($('lc-pre'),m=>{if(m==='def')preset($('lc-m').value);else if(m==='m1'&&m1)$('lc-tp').value=U.fx(m1,2);else if(m==='dit'){$('lc-m').value='dit';preset('dit');$('lc-s').value=1;$('lc-p').value=1}calc();
    if(m==='dit'){const g=U.grid('dit',256);$('lc-check').innerHTML='DiT-XL/2 at 256 &times; 256: '+U.FL(g[2])+' per pass counted here = 2 &times; '+U.fx(g[2]/2e9,2)+' G multiply-accumulates; the paper\'s Table 4 says 118.64 Gflops (which are multiply-accumulates). Reproduced independently, by counting the authors\' code.'}});
  $('lc-m').addEventListener('change',()=>{preset($('lc-m').value);calc()});
  ['lc-w','lc-h','lc-t','lc-s','lc-p','lc-n','lc-tp'].forEach(i=>$(i).addEventListener('input',calc));
  preset('flux1');calc();
  // chart: FLOPs per pass vs size, all models
  const el=$('lc-svg');const col=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)','#7fa98a','#a0522d','#5b6abf','#c45b8c','#888'];
  function draw(){const W=Math.min(860,Math.max(300,el.clientWidth||600)),H=300,l=48,r=W<500?24:130,t=10,b=32;const res=[256,384,512,640,768,896,1024,1280,1536,2048];
    const X=v=>l+(Math.log2(v)-8)/3*(W-l-r),Y=v=>t+(1-(Math.log10(v)-11)/4.8)*(H-t-b);let s='';
    const short={1e11:'100 GF',1e12:'1 TF',1e13:'10 TF',1e14:'100 TF',1e15:'1 PF'};
    [1e11,1e12,1e13,1e14,1e15].forEach(v=>{s+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+RD.t(l-4,Y(v)+3,short[v],{a:'end',fs:9.5,fill:'var(--mute)'})});
    [256,512,1024,2048].forEach(v=>s+=RD.t(X(v),H-b+14,v,{a:'middle',fs:10,fill:'var(--mute)'}));
    const sel=$('lc-m').value;
    keys.forEach((k,i)=>{const pts=res.filter(v=>!(k==='dit'&&v>1024)).map(v=>[X(v),Y(U.flops(k,U.tokens(k,v,v)))]);const on=k===sel;
      s+='<polyline fill="none" stroke="'+col[i]+'" stroke-width="'+(on?3:1.3)+'" opacity="'+(on?1:0.75)+'" points="'+pts.map(p=>p[0].toFixed(1)+','+p[1].toFixed(1)).join(' ')+'"/>';
      if(r>60){const p=pts[pts.length-1];s+=RD.t(p[0]+4,p[1]+3,A[k].label.split(' (')[0].replace(' single-stream','').replace(' MMDiT','').replace(' U-Net',''),{fs:9,fill:col[i],w:on?600:400})}});
    s+=RD.t((l+W-r)/2,H-4,'image side in pixels (square, log scale)',{a:'middle',fs:10.5,fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,s,'FLOPs per pass against image size');
    $('lc-note').innerHTML='Each line: FLOPs of one pass (GF, TF, PF: giga, tera, peta) at the pipeline\'s default text length, from the counted formula; the selected denoiser is drawn thick. SD 1.5 is the cheapest pass up to 512 pixels and Sana (32&times; VAE, linear attention) from 768 up; SD 1.5\'s U-Net, with attention at its highest-resolution level, costs more per pass than SDXL\'s 2.6B U-Net between 1,536 and 2,048 pixels, because SDXL dropped attention there. <span class="der">derived</span>'+(r<=60?' Colours in order: '+keys.map((k,i)=>'<span style="color:'+col[i]+'">'+A[k].label.split(' (')[0]+'</span>').join(', ')+'.':'')}
  draw();RD.onResize(draw,'t-ldcalc');RD.onRender(draw,'t-ldcalc');$('lc-m').addEventListener('change',draw);
})();
