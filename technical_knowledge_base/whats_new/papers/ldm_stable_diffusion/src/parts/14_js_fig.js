// ---- Figure 1 at a glance, beside the Problem section: three tokenizers reconstructing ImageNet, from PAPER.tables.T8 (2026-10-24) ----
(function(){const el=$('fig1');if(!el||!window.PAPER)return;
  const rows=PAPER.tables.T8.rows,find=(lab,z)=>rows.find(r=>r[0]===lab&&r[1]===z);
  const D=[['LDM autoencoder, f = 4 (this paper)',find('4','8192'),'var(--acc)'],['DALL-E tokenizer, f = 8',find('8 DALL-E [66]','8192'),'var(--bad)'],['VQGAN, f = 16',find('16 VQGAN [23]','16384'),'var(--bad)']]
    .map(([n,r,c])=>({n,c,psnr:parseFloat(r[5]),rfid:parseFloat(r[3])}));
  fit(el,w=>{const narrow=w<560,lw=narrow?0:230,bh=22,gap=narrow?10:10,x0=lw,bwMax=w-x0-150,X=v=>bwMax*(v-15)/(30-15);let s='',y=4;
    D.forEach(d=>{if(narrow){s+=tx(0,y+12,d.n,{fs:12});y+=18}else s+=tx(lw-8,y+15,d.n,{fs:12,a:'end'});
      s+=rc(x0,y,X(d.psnr),bh,d.c,{r:3})+tx(x0+X(d.psnr)+6,y+15,d.psnr.toFixed(1)+' dB, rFID '+d.rfid,{fs:11});y+=bh+gap});
    const notes=narrow?['Bars: PSNR of reconstructions, axis from 15 dB.','rFID: reconstruction FID, lower is better.']:['Bars: PSNR of reconstructions, axis from 15 dB; rFID: reconstruction FID, lower is better.'];
    notes.forEach((t,i)=>{s+=tx(0,y+8+i*15,t,{fs:11,c:'var(--mute)'})});y+=15*(notes.length-1);
    el.innerHTML=svgW(w,y+14,s,'Reconstruction quality of three image tokenizers on ImageNet')})})();
