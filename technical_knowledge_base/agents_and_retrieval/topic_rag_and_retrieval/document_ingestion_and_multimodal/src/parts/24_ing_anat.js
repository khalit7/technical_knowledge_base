// ---- Reading s1: one real page read three ways (data: ING.anat): content stream, pdfplumber lines, Docling order ----
(function(){
  const A=window.ING&&ING.anat;const host=document.getElementById('ing-anat');if(!A||!host)return;
  const P=A.page;let mode='stream';
  const cap=document.getElementById('ing-anat-cap'),stepEl=document.getElementById('ing-anat-step');
  cap.innerHTML='Page '+(P.page+1)+' of arXiv '+RD.esc(P.pdf.replace('.pdf',''))+' (a QASPER paper of the running example): '+A.lines.length+' text lines as PyMuPDF 1.28.2 reads them, '+P.n_chars.toLocaleString()+' characters in '+P.fonts.length+' fonts, '+P.ligatures+' ligature glyphs. Every box is drawn at its PDF coordinates over the page image; the orange line joins the boxes in the order the text comes out.';
  const NOTE={stream:'Content-stream order: the order the producer (here pdfTeX) drew the lines. On this LaTeX page it is close to reading order, except the rotated arXiv stamp in the left margin, drawn last.',
    plumber:'pdfplumber\'s <code>extract_text()</code>: characters are clustered into lines by vertical position across the whole page width, so a line of the left column and the line beside it in the right column become one line. Its default 3-point x tolerance also drops many spaces on this page.',
    read:'Docling\'s order: a layout model found the two columns, so the left column is read top to bottom, then the right. Dashed red: lines Docling dropped (the arXiv stamp, classified as page furniture).'};
  function units(){if(mode==='plumber')return A.plumber.map((l,k)=>k);if(mode==='read')return A.read;return A.lines.map((l,k)=>k)}
  const box=k=>mode==='plumber'?A.plumber[k]:A.lines[k];
  const mid=P.w/2;
  function draw(i){
    const W=Math.min(RD.width(host),540),s=W/P.w,H=P.h*s,order=units(),shown=order.slice(0,i+1);
    let sw=0,cross=0,prev=null;
    shown.forEach(k=>{const b=box(k).bbox;const both=b[0]<P.w*0.45&&b[2]>P.w*0.55;if(both)cross++;const c=both?null:((b[0]+b[2])/2<mid?'L':'R');if(c&&prev&&c!==prev)sw++;if(c)prev=c});
    let body='<image href="'+ING.anatImg+'" x="0" y="0" width="'+W+'" height="'+H.toFixed(1)+'" opacity="0.5"/>';
    if(mode==='read')A.dropped.forEach(k=>{const b=A.lines[k].bbox;body+='<rect x="'+(b[0]*s).toFixed(1)+'" y="'+(b[1]*s).toFixed(1)+'" width="'+Math.max(2,(b[2]-b[0])*s).toFixed(1)+'" height="'+Math.max(2,(b[3]-b[1])*s).toFixed(1)+'" fill="none" stroke="var(--bad)" stroke-dasharray="3 2"/>'});
    shown.forEach((k,n)=>{const b=box(k).bbox,cur=n===shown.length-1,c=cur?'var(--c2)':'var(--c1)';
      body+='<rect x="'+(b[0]*s).toFixed(1)+'" y="'+(b[1]*s).toFixed(1)+'" width="'+Math.max(2,(b[2]-b[0])*s).toFixed(1)+'" height="'+Math.max(2,(b[3]-b[1])*s).toFixed(1)+'" fill="'+c+'" fill-opacity="0.22" stroke="'+c+'" stroke-width="'+(cur?1.8:0.7)+'"/>'});
    const pts=shown.map(k=>{const b=box(k).bbox;return ((b[0]+b[2])/2*s).toFixed(1)+','+((b[1]+b[3])/2*s).toFixed(1)});
    if(pts.length>1)body+='<polyline points="'+pts.join(' ')+'" fill="none" stroke="var(--c2)" stroke-width="1.2" stroke-opacity="0.75"/>';
    host.innerHTML=RD.svg(W,Math.round(H),body,'Lines of a real PDF page in the order each reader emits them');
    const cur=box(shown[shown.length-1]);
    stepEl.innerHTML='<p class="small" style="margin:4px 0">'+NOTE[mode]+'</p><b>Line '+(i+1)+' of '+order.length+':</b> <span class="mono">'+RD.esc(cur.t.slice(0,110))+'</span><br>Column switches so far: <b>'+sw+'</b> &middot; lines that cross the gutter: <b>'+cross+'</b>'+(mode==='read'?' &middot; lines dropped: <b>'+A.dropped.length+'</b>':'');
  }
  const an=RD.anim({card:'ing-anat-card',ctl:'ing-anat-ctl',n:units().length,draw,ms:220,label:'Line'});
  RD.seg(document.getElementById('ing-anat-mode'),m=>{mode=m;an.reset(units().length);an.play()});
  RD.onResize(()=>an.redraw());
})();
