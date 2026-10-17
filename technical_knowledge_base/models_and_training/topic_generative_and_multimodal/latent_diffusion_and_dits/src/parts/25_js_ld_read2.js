// ---- Reading, sections 4 to 7: conditioning variants, DiT scaling, the tiny experiment, attention patterns, parameter shares, FLUX position ids ----
(function(){
  const U=window.LDU,L=U.L,$=id=>document.getElementById(id),A=U.byKey,PUB=L.pub;
  // ------------------------------------------------ DiT conditioning variants (Table 4)
  (function(){
    const c=PUB.dit_table4.conditioning;
    U.bars($('ld-condbars'),c.map(r=>({name:r[0]+' ('+r[2]+'M, '+r[1]+' Gflops)',v:r[3],label:'FID '+U.fx(r[3],2),color:r[0]==='adaLN-Zero'?'var(--c3)':'var(--c1)',hl:r[0]==='adaLN-Zero'})),160);
  })();
  // ------------------------------------------------ DiT scaling chart
  (function(){
    const rows=PUB.dit_table4.rows,ours={};(L.dit_count||[]).forEach(r=>{if(r.res===256)ours[r.model]=r});
    const col={S:'var(--c5)',B:'var(--c6)',L:'var(--c4)',XL:'var(--c2)'};
    const el=$('ld-scale-svg');let sel=null;
    function draw(){const W=Math.min(860,Math.max(300,el.clientWidth||600)),H=Math.round(Math.min(330,W*0.62)),l=44,r=14,t=12,b=34;
      const lx=v=>l+(Math.log10(v)-Math.log10(0.25))/(Math.log10(200)-Math.log10(0.25))*(W-l-r),ly=v=>t+(1-v/165)*(H-t-b);
      let s='';[0.3,1,3,10,30,100].forEach(v=>{s+='<line x1="'+lx(v)+'" x2="'+lx(v)+'" y1="'+t+'" y2="'+(H-b)+'" stroke="var(--line)"/>'+RD.t(lx(v),H-b+14,v,{a:'middle',fs:10,fill:'var(--mute)'})});
      [0,40,80,120,160].forEach(v=>{s+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+ly(v)+'" y2="'+ly(v)+'" stroke="var(--line)"/>'+RD.t(l-4,ly(v)+3,v,{a:'end',fs:10,fill:'var(--mute)'})});
      s+=RD.t((l+W-r)/2,H-4,'Gflops per forward pass (multiply-accumulates, log scale)',{a:'middle',fs:10.5,fill:'var(--mute)'});
      s+='<text x="12" y="'+((t+H-b)/2)+'" font-size="10.5" fill="var(--mute)" transform="rotate(-90 12 '+((t+H-b)/2)+')" text-anchor="middle">FID-50K at 400K steps</text>';
      ['S','B','L','XL'].forEach(cfg=>{const pts=rows.filter(q=>q[0].split('-')[1].split('/')[0]===cfg);
        s+='<polyline fill="none" stroke="'+col[cfg]+'" stroke-width="1.5" points="'+pts.map(q=>lx(q[1]).toFixed(1)+','+ly(q[3]).toFixed(1)).join(' ')+'"/>';
        pts.forEach(q=>{const on=sel===q[0];s+='<circle data-m="'+q[0]+'" cx="'+lx(q[1]).toFixed(1)+'" cy="'+ly(q[3]).toFixed(1)+'" r="'+(on?7:5)+'" fill="'+col[cfg]+'" stroke="var(--bg)" style="cursor:pointer"/>';
          if(W>420||on)s+=RD.t(lx(q[1])+7,ly(q[3])-6,q[0].replace('DiT-',''),{fs:9.5,fill:'var(--mute)'})})});
      el.innerHTML=RD.svg(W,H,s,'DiT models: forward Gflops against FID');
      el.querySelectorAll('circle').forEach(cn=>cn.addEventListener('click',()=>{sel=cn.dataset.m;draw();note()}))}
    function note(){const worst=Math.max(...rows.map(q=>Math.abs(ours[q[0]].flops/2e9-q[1])/q[1]));
      let h='Points: Table 4 of the paper (<span class="indep">published, the authors\' runs</span>), one per model; lines join the same width and depth at patch 8, 4 and 2. The Gflops column is reproduced here independently: the authors\' code counted on meta tensors gives exactly twice each value (FLOPs count a multiply and an add), within '+U.pct(worst,1)+' for all 12 models (the paper rounds to two decimals). <span class="der">derived</span>';
      if(sel){const q=rows.find(x=>x[0]===sel),o=ours[sel];h='<b>'+sel+'</b>: '+q[2]+'M parameters in the paper ('+U.int(o.params)+' counted here), '+q[1]+' Gflops ('+U.fx(o.flops/2e9,2)+' counted / 2), FID '+q[3]+'. '+h}
      $('ld-scale-note').innerHTML=h}
    draw();note();RD.onResize(draw);RD.onRender(draw);
    const x4=rows.find(q=>q[0]==='DiT-XL/4'),x2=rows.find(q=>q[0]==='DiT-XL/2');
    U.setAns('ld-pr-patch','Table 4: DiT-XL/2 has '+x2[2]+'M parameters (counted here: '+U.int(ours['DiT-XL/2'].params)+' against '+U.int(ours['DiT-XL/4'].params)+' at patch 4: the patch embedding and output layer shrink slightly), <b>'+x2[1]+' Gflops ('+U.fx(x2[1]/x4[1],2)+' times)</b> and <b>FID '+x2[3]+'</b> (less than half of '+x4[3]+'). Four times the tokens, the same weights: compute, not parameters, is what improved it.');
  })();
  // ------------------------------------------------ the tiny experiment
  (function(){
    const T=L.tiny;if(!T)return;
    const S=T.scores,F=T.flops,tr=T.train;
    const R=[['fw_fm_4000','TinyUNet (Flow lab)','unet',4000,'unet'],['ld_dit_p4_4000','TinyDiT, 4 &times; 4 patches','dit_p4',4000,'p4'],['ld_dit_p4_6473','TinyDiT, 4 &times; 4, equal compute','dit_p4',6473,'p4'],
      ['ld_dit_p8_4000','TinyDiT, 8 &times; 8 patches','dit_p8',4000,'p8'],['ld_dit_p2_4000','TinyDiT, 2 &times; 2 patches','dit_p2',4000,'p2'],['ld_dit_p4_nozero_4000','TinyDiT 4 &times; 4, gates not zero-initialised','dit_p4',4000,'p4_nozero']].filter(r=>S[r[0]]);
    const comp=r=>3*F[r[2]].fwd*128*r[3];
    $('ld-tinytab').querySelector('tbody').innerHTML=R.map(r=>{const s=S[r[0]];return '<tr><td>'+r[1]+'</td><td data-h="Parameters">'+U.int(F[r[2]].params)+'</td><td data-h="Tokens">'+(F[r[2]].tokens||'32 &times; 32 grid')+'</td><td data-h="FLOPs per pass">'+U.FL(F[r[2]].fwd)+'</td><td data-h="Steps">'+U.int(r[3])+'</td><td data-h="Training compute">'+U.fx(comp(r)/1e15,2)+' PFLOP</td><td data-h="FD, s = 1">'+U.fx(s['euler50_s1.0'].fd,1)+'</td><td data-h="FD, s = 1.5">'+U.fx(s['euler50_s1.5'].fd,1)+'</td><td data-h="Accuracy">'+U.pct(s['euler50_s1.5'].acc,1)+'</td></tr>'}).join('');
    const pick=$('ld-tiny-pick');pick.innerHTML=R.map((r,i)=>'<button data-m="'+r[0]+'"'+(i===0?' class="on"':'')+'>'+r[1].replace(' (Flow lab)','').replace('TinyDiT, ','DiT ').replace('TinyDiT ','DiT ')+'</button>').join('');
    function show(k){const r=R.find(x=>x[0]===k);$('ld-tiny-strip').innerHTML=['1.0','1.5'].map(s=>'<div class="ld-rowlab">guidance s = '+s+' (FD '+U.fx(S[k]['euler50_s'+s].fd,1)+')</div><img class="ld-img" src="'+T.strips[k+'_s'+s]+'" alt="ten samples">').join('');
      $('ld-tiny-note').innerHTML='One sample per class (T-shirt to ankle boot, left to right), all from the same starting noise (the Flow lab\'s strip noise, seed 5) and 50 Euler steps: only the denoiser differs. '+r[1]+'. <span class="meas">measured on Apple M1 Pro (MPS)</span>'}
    RD.seg(pick,show);show(R[0][0]);
    const g=k=>S[k]?S[k]['euler50_s1.5'].fd:NaN,g1=k=>S[k]?S[k]['euler50_s1.0'].fd:NaN;
    let h='<b>What the runs show.</b> At equal training compute ('+U.fx(comp(R[0])/1e15,2)+' PFLOP) the U-Net wins clearly: FD '+U.fx(g('fw_fm_4000'),1)+' against '+U.fx(g('ld_dit_p4_6473'),1)+' for the DiT with guidance, '+U.fx(g1('fw_fm_4000'),1)+' against '+U.fx(g1('ld_dit_p4_6473'),1)+' without. This is the expected small-scale result, not a contradiction of DiT: convolutions build in locality and translation equivariance that a transformer must learn from data, and 4,000 to 6,500 steps on 55,000 tiny images is far below the regime (400K steps of batch 256 on ImageNet latents, and more) where DiT\'s paper compared backbones. ';
    if(S.ld_dit_p2_4000&&S.ld_dit_p8_4000)h+='<b>The patch-size sweep</b> follows DiT\'s Figure 8 in direction: at the same 4,000 steps and almost the same parameters, 8 &times; 8 patches (16 tokens) give FD '+U.fx(g('ld_dit_p8_4000'),1)+', 4 &times; 4 (64 tokens) '+U.fx(g('ld_dit_p4_4000'),1)+', 2 &times; 2 (256 tokens, '+U.fx(F.dit_p2.fwd/F.dit_p4.fwd,1)+' times the FLOPs of 4 &times; 4) '+U.fx(g('ld_dit_p2_4000'),1)+'. ';
    if(S.ld_dit_p4_nozero_4000)h+='<b>Zero initialisation:</b> the same 4 &times; 4 DiT with the gates and output layer left at PyTorch\'s default initialisation reaches FD '+U.fx(g('ld_dit_p4_nozero_4000'),1)+' against '+U.fx(g('ld_dit_p4_4000'),1)+' (this isolates the initialisation; the paper\'s "adaLN" row also drops the gates). ';
    h+='One seed per run, so differences of a few FD points are noise; FD is measured in the topic\'s Fashion-MNIST classifier\'s feature space, not Inception\'s.';
    $('ld-tiny-read').innerHTML=h;
  })();
  // ------------------------------------------------ attention patterns
  (function(){
    const el=$('ld-mask-svg');let mode='cross';const N=12,Tt=4;
    const info={cross:{w:'1 set (image) + a cross-attention layer reading static text',upd:'no: the 77 text vectors are the same in every layer',ent:(n,t)=>n*n+n*t,note:'Two layers: self-attention among image positions (blue), then cross-attention from image positions to text (purple). Text tokens are never queries, so they never change.'},
      concat:{w:'1 set shared by image and text tokens',upd:'yes',ent:(n,t)=>(n+t)*(n+t),note:'The SD3 paper\'s "DiT" baseline: text tokens appended to the sequence and processed by the same weights as image tokens.'},
      mmdit:{w:'2 sets per block (image, text); one shared softmax',upd:'yes',ent:(n,t)=>(n+t)*(n+t),note:'Every query sees every key; image rows use the image stream\'s projections (blue), text rows the text stream\'s (teal). SD3, SD3.5, Qwen-Image, and FLUX\'s first 19 blocks.'},
      single:{w:'1 set (after the double-stream blocks or short refiners)',upd:'yes',ent:(n,t)=>(n+t)*(n+t),note:'The same full pattern, but one set of weights for both kinds of token: FLUX.1\'s last 38 blocks, Z-Image\'s 30 main layers. Half the parameters per block of MMDiT.'}};
    function draw(){const W=Math.min(520,Math.max(260,el.clientWidth||400)),n=N+Tt,c=Math.floor((W-60)/n),S=c*n,H=S+40,x0=40,y0=16;let s='';
      for(let i=0;i<n;i++)for(let j=0;j<n;j++){const qi=i<N,kj=j<N;let f=null;
        if(mode==='cross'){if(qi&&kj)f='var(--c1)';else if(qi&&!kj)f='var(--c4)'}
        else if(mode==='concat'||mode==='single')f='var(--c1)';
        else f=qi?'var(--c1)':'var(--c6)';
        s+='<rect x="'+(x0+j*c)+'" y="'+(y0+i*c)+'" width="'+(c-1)+'" height="'+(c-1)+'" fill="'+(f||'var(--soft)')+'" opacity="'+(f?(qi===kj?0.85:0.6):1)+'"/>'}
      s+='<line x1="'+(x0+N*c-0.5)+'" x2="'+(x0+N*c-0.5)+'" y1="'+y0+'" y2="'+(y0+S)+'" stroke="var(--ink)"/><line y1="'+(y0+N*c-0.5)+'" y2="'+(y0+N*c-0.5)+'" x1="'+x0+'" x2="'+(x0+S)+'" stroke="var(--ink)"/>';
      s+=RD.t(x0+N*c/2,y0+S+14,'keys: image',{a:'middle',fs:10,fill:'var(--mute)'})+RD.t(x0+N*c+Tt*c/2,y0+S+14,'text',{a:'middle',fs:10,fill:'var(--mute)'});
      s+='<text x="12" y="'+(y0+N*c/2)+'" font-size="10" fill="var(--mute)" text-anchor="middle" transform="rotate(-90 12 '+(y0+N*c/2)+')">queries: image</text><text x="12" y="'+(y0+N*c+Tt*c/2)+'" font-size="10" fill="var(--mute)" text-anchor="middle" transform="rotate(-90 12 '+(y0+N*c+Tt*c/2)+')">text</text>';
      el.innerHTML=RD.svg(x0+S+10,H,s,'Attention pattern');
      const I=info[mode],e1=I.ent(4096,512),e0=info.cross.ent(4096,512);
      $('ld-mask-cnt').innerHTML=RD.stat('Weights per block',I.w,'')+RD.stat('Text updated by the image?',I.upd,'')+RD.stat('Attention entries per layer at 4,096 image + 512 text tokens',U.int(e1),U.fx(e1/e0,2)+' &times; cross-attention');
      $('ld-mask-note').innerHTML=I.note+' Drawn for 12 image and 4 text tokens; filled cells are pairs that interact.'}
    RD.seg($('ld-mask-mode'),m=>{mode=m;draw()});draw();RD.onResize(draw);
  })();
  // ------------------------------------------------ parameter shares in ten denoisers
  (function(){
    const keys=['sd15','sdxl','dit','pixart','sana','sd3m','sd35l','flux1','flux2k','qwen','zimg'];
    $('ld-mod-leg').innerHTML=U.CATS.map(c=>'<span style="--sw:'+U.CAT[c][1]+'">'+U.CAT[c][0]+'</span>').join('');
    $('ld-mod-bars').innerHTML=keys.map(k=>{const m=A[k];return '<div><span class="nm">'+m.label.replace(' (class-conditional, ImageNet 256)','')+'</span><span class="tr" style="display:flex">'+U.CATS.map(c=>m.cats[c]?'<span style="position:static;display:block;height:100%;border-radius:0;width:'+(100*m.cats[c]/m.params).toFixed(2)+'%;background:'+U.CAT[c][1]+'" title="'+U.CAT[c][0]+' '+U.pct(m.cats[c]/m.params,1)+'"></span>':'').join('')+'</span><span class="v">'+U.P(m.params)+'</span></div>'}).join('');
    const f=A.flux1,s=A.sd35l,p=L.pipe,F1=U.grid('flux1',1024),S3=U.grid('sd35l',1024);
    const fi=p.flux1.num_inference_steps*1*F1[2],si=p.sd3.num_inference_steps*2*S3[2];
    U.setAns('ld-pr-dev','Counted at 1024 pixels with each pipeline\'s default text length: FLUX.1 [dev] '+U.FL(F1[2])+' per pass &times; '+p.flux1.num_inference_steps+' steps &times; 1 pass = <b>'+U.FL(fi)+'</b>; SD3.5 Large '+U.FL(S3[2])+' &times; '+p.sd3.num_inference_steps+' &times; 2 passes = <b>'+U.FL(si)+'</b>. FLUX.1 costs '+U.fx(fi/si,2)+' times as much, not 1.5: guidance distillation removed half of its passes. Parameters ('+U.B(f.params)+' against '+U.B(s.params)+') are a poor guide to cost per image.');
  })();
  // ------------------------------------------------ FLUX position ids
  (function(){
    const el=$('ld-rope-svg');
    function draw(){const h=Math.max(1,Math.min(8,+$('ld-rope-h').value||1)),w=Math.max(1,Math.min(8,+$('ld-rope-w').value||1)),t=Math.max(1,Math.min(6,+$('ld-rope-t').value||1));
      const W=Math.min(700,Math.max(280,el.clientWidth||500)),cw=Math.min(64,Math.floor((W-20)/Math.max(w,t))),ch=34;let s='',y=14;
      s+=RD.t(10,y,'text tokens (ids)',{fs:10.5,fill:'var(--mute)'});y+=6;
      for(let i=0;i<t;i++)s+='<rect x="'+(10+i*cw)+'" y="'+y+'" width="'+(cw-3)+'" height="'+(ch-4)+'" rx="3" fill="var(--c6)" opacity=".35"/>'+RD.t(10+i*cw+(cw-3)/2,y+ch/2+2,'0,0,0',{a:'middle',fs:10});
      y+=ch+16;s+=RD.t(10,y,'image tokens (ids = time, row, column)',{fs:10.5,fill:'var(--mute)'});y+=6;
      for(let r=0;r<h;r++)for(let c=0;c<w;c++)s+='<rect x="'+(10+c*cw)+'" y="'+(y+r*ch)+'" width="'+(cw-3)+'" height="'+(ch-4)+'" rx="3" fill="var(--c1)" opacity=".3"/>'+RD.t(10+c*cw+(cw-3)/2,y+r*ch+ch/2+2,'0,'+r+','+c,{a:'middle',fs:10});
      y+=h*ch+18;const bw=W-20;s+=RD.t(10,y,'one 128-wide attention head, split by axis',{fs:10.5,fill:'var(--mute)'});y+=6;
      [[16,'time',"var(--c5)"],[56,'row',"var(--c1)"],[56,'column',"var(--c3)"]].reduce((x,[d,n,col])=>{s+='<rect x="'+x+'" y="'+y+'" width="'+(bw*d/128-2)+'" height="18" fill="'+col+'" opacity=".6"/>'+RD.t(x+bw*d/256,y+13,d+' '+n,{a:'middle',fs:10});return x+bw*d/128},10);
      el.innerHTML=RD.svg(W,y+26,s,'FLUX position ids');
      $('ld-rope-note').innerHTML=(h*w)+' image tokens and '+t+' text tokens, '+(h*w+t)+' in the joint sequence. The text ids are all zero (pipeline line 387: <span class="ld-mono">torch.zeros(prompt_embeds.shape[1], 3)</span>), so rotary embedding leaves text unrotated; each image token\'s query and key are rotated by angles set by its row (56 channels) and column (56 channels), so the score between two image tokens depends on their row and column offsets only. A 1024 &times; 1024 image is a 128 &times; 128 latent packed to '+64+' &times; 64 = 4,096 tokens.'}
    ['ld-rope-h','ld-rope-w','ld-rope-t'].forEach(i=>$(i).addEventListener('input',draw));draw();RD.onResize(draw);
  })();
})();
