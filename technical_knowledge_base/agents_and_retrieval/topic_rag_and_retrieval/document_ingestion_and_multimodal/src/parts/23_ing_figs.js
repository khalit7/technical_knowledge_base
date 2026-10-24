// ---- Reading: static figures drawn at the measured width (hero, rule-based thresholds, OCR routing, ColPali patches and cost) ----
// Numbers on the figures are the page's own (sections 1 to 11, data in ING) or quoted with their source in the caption beside each figure.
(function(){
  if(!window.RD)return;
  const T=RD.t,esc=RD.esc;
  const rect=(x,y,w,h,o)=>{o=o||{};return '<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+Math.max(0,w).toFixed(1)+'" height="'+Math.max(0,h).toFixed(1)+'" rx="'+(o.rx==null?6:o.rx)+'" fill="'+(o.fill||'var(--bg)')+'"'+(o.fo!=null?' fill-opacity="'+o.fo+'"':'')+' stroke="'+(o.stroke||'var(--line)')+'" stroke-width="'+(o.sw||1)+'"'+(o.dash?' stroke-dasharray="'+o.dash+'"':'')+'/>'};
  const line=(x1,y1,x2,y2,o)=>{o=o||{};return '<line x1="'+x1.toFixed(1)+'" y1="'+y1.toFixed(1)+'" x2="'+x2.toFixed(1)+'" y2="'+y2.toFixed(1)+'" stroke="'+(o.stroke||'var(--mute)')+'" stroke-width="'+(o.sw||1.3)+'"'+(o.dash?' stroke-dasharray="'+o.dash+'"':'')+(o.arrow?' marker-end="url(#'+o.arrow+')"':'')+'/>'};
  const marker=(id,c)=>'<defs><marker id="'+id+'" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="'+c+'"/></marker></defs>';

  // ---------- hero: two routes from a file to an index ----------
  const hero=document.getElementById('ing-hero');
  const PARSE=[
    {t:'Text layer / OCR',l:['rules: 0.01 s/page','OCR: 2.2 s/page'],s:'ing-s2'},
    {t:'Layout, order',l:['evidence intact:','1 to 94 of 107'],s:'ing-s4'},
    {t:'Tables, figures',l:['1 of 6 table tools','kept every header'],s:'ing-s6'},
    {t:'Chunks, metadata',l:['page, box,','heading path, ACL'],s:'ing-s8'},
    {t:'Hash, embed new',l:['fixed windows: 76%','for 15% changed'],n:'fixed windows re-embed 76% for 15% changed',s:'ing-s9'}];
  const PDF={t:'PDF file',l:['glyphs at x, y','no paragraphs','0 of 38 tagged'],s:'ing-s1'};
  const IMG={t:'Page image',l:['no parsing;','1,030 vectors/page'],n:'no parsing; 1,030 vectors per page',s:'ing-s10'};
  const MAX={t:'MaxSim over patches, multi-vector index',l:['figures (ArxivQA): nDCG@5 74.2 against 37.9 for OCR + BM25','text-heavy reports: a tie (97.7 against 95.0)'],s:'ing-s11'};
  function box(x,y,w,h,b,o){o=o||{};let s='<a href="#'+b.s+'">'+rect(x,y,w,h,{fill:o.fill||'var(--soft)',stroke:o.stroke||'var(--line)',sw:o.sw||1});
    s+=T(x+8,y+16,esc(b.t),{fs:11.5,w:600});
    b.l.forEach((l,k)=>{s+=T(x+8,y+31+k*14,esc(l),{fs:11,fill:'var(--mute)'})});return s+'</a>'}
  function boxRow(x,y,w,h,b,o){o=o||{};let s='<a href="#'+b.s+'">'+rect(x,y,w,h,{fill:o.fill||'var(--soft)',stroke:o.stroke||'var(--line)'});
    s+=T(x+8,y+15,esc(b.t),{fs:12,w:600});s+=T(x+8,y+30,esc(b.n||b.l.reduce((a,l)=>a?(/[,:]$/.test(a)?a+' ':a+'; ')+l:l,'')),{fs:11,fill:'var(--mute)'});return s+'</a>'}
  function drawHero(){
    if(!hero)return;const W=RD.width(hero);let body=marker('ing-ah','var(--mute)'),H;
    if(W>=820){
      const gap=16,cw=(W-5*gap)/6,rh=66,y0=18,y1=y0+rh+26;H=y1+rh+4;
      body+=T(cw+gap,12,'Parse route',{fs:11,w:600,fill:'var(--acc)'})+T(cw+gap,y1-8,'Page-image route: skip the parser',{fs:11,w:600,fill:'var(--c4)'});
      body+=box(0,y0,cw,y1+rh-y0,PDF,{});
      PARSE.forEach((b,k)=>{const x=(k+1)*(cw+gap);body+=box(x,y0,cw,rh,b,{stroke:'var(--acc)'});if(k<4)body+=line(x+cw+2,y0+rh/2,x+cw+gap-2,y0+rh/2,{arrow:'ing-ah'})});
      body+=line(cw+2,y0+rh/2,cw+gap-2,y0+rh/2,{arrow:'ing-ah'})+line(cw+2,y1+rh/2,cw+gap-2,y1+rh/2,{arrow:'ing-ah'});
      const x1=cw+gap;body+=box(x1,y1,cw,rh,IMG,{stroke:'var(--c4)'});
      const x2=2*(cw+gap);body+=line(x1+cw+2,y1+rh/2,x2-2,y1+rh/2,{arrow:'ing-ah'});
      body+='<a href="#'+MAX.s+'">'+rect(x2,y1,W-x2-1,rh,{fill:'var(--soft)',stroke:'var(--c4)'})+T(x2+8,y1+16,esc(MAX.t),{fs:12,w:600})+MAX.l.map((l,k)=>T(x2+8,y1+33+k*15,esc(l),{fs:11,fill:'var(--mute)'})).join('')+'</a>';
    }else{
      const bh=38,g=12;let y=4;
      body+=boxRow(0,y,W-1,bh,PDF,{});y+=bh+g;
      body+=T(0,y+8,'Parse route',{fs:11,w:600,fill:'var(--acc)'});y+=14;
      PARSE.forEach((b,k)=>{if(k>0)body+=line(W/2,y-g+2,W/2,y-2,{arrow:'ing-ah'});body+=boxRow(0,y,W-1,bh,b,{stroke:'var(--acc)'});y+=bh+g});
      body+=T(0,y+8,'Page-image route: skip the parser',{fs:11,w:600,fill:'var(--c4)'});y+=14;
      body+=boxRow(0,y,W-1,bh,IMG,{stroke:'var(--c4)'});y+=bh+g;
      body+=line(W/2,y-g+2,W/2,y-2,{arrow:'ing-ah'});
      body+='<a href="#'+MAX.s+'">'+rect(0,y,W-1,50,{fill:'var(--soft)',stroke:'var(--c4)'})+T(8,y+15,'MaxSim over patches',{fs:12,w:600})+T(8,y+30,'figures: nDCG@5 74.2 against 37.9 (OCR + BM25)',{fs:11,fill:'var(--mute)'})+T(8,y+44,'text-heavy reports: a tie (97.7 against 95.0)',{fs:11,fill:'var(--mute)'})+'</a>';y+=52;H=y;
    }
    hero.innerHTML=RD.svg(W,Math.ceil(H),body,'Two routes from a PDF to an index: parse the text, or embed the page image');
  }

  // ---------- section 2: thresholds of a rule-based extractor (illustrative glyph boxes) ----------
  const rules=document.getElementById('ing-rules');
  function drawRules(){
    if(!rules)return;const W=RD.width(rules),wide=W>=640,pw=wide?(W-24)/3:W,ph=150;let body=marker('ing-ah2','var(--good)')+marker('ing-ah3','var(--bad)');
    const at=k=>wide?[k*(pw+12),0]:[0,k*(ph+10)];
    // panel 1: glyphs to words and lines
    let [x,y]=at(0);body+=rect(x,y,pw,ph,{fill:'none'})+T(x+8,y+16,'1. glyphs to words and lines',{fs:12,w:600});
    const gw=13,gh=17;let gx=x+10;const word=(s,yy)=>{let o='';for(const c of s){o+=rect(gx,yy,gw-2,gh,{rx:2,fill:'var(--soft)'})+T(gx+gw/2-1,yy+12.5,c,{fs:11,a:'middle'});gx+=gw}return o};
    body+=word('text',y+32);const g1=gx;gx+=10;body+=word('layer',y+32);
    body+=line(g1-1,y+56,gx-5*gw-1,y+56,{stroke:'var(--acc)',sw:1.5})+T(x+10,y+72,'gap over 0.1 char width: a space',{fs:11,fill:'var(--acc)'});
    gx=x+10;body+=word('of',y+86);gx+=10;body+=word('a',y+86);gx+=10;body+=word('PDF',y+86);
    body+=T(x+10,y+122,'same line: overlap half a height,',{fs:11,fill:'var(--mute)'})+T(x+10,y+136,'under 2 char widths apart',{fs:11,fill:'var(--mute)'});
    // panel 2: lines to boxes
    [x,y]=at(1);body+=rect(x,y,pw,ph,{fill:'none'})+T(x+8,y+16,'2. lines to boxes',{fs:12,w:600});
    const lw=Math.min(pw-110,160);let ly=y+30;
    body+=rect(x+8,ly-4,lw+8,3*9+8,{fill:'none',stroke:'var(--acc)',dash:'4 3'});
    for(let k=0;k<3;k++){body+=rect(x+12,ly,lw-(k===2?40:0),6,{rx:1,fill:'var(--mute)',stroke:'none',fo:0.6});ly+=9}
    ly+=22;body+=rect(x+8,ly-4,lw+8,2*9+8,{fill:'none',stroke:'var(--acc)',dash:'4 3'});
    for(let k=0;k<2;k++){body+=rect(x+12,ly,lw-(k===1?60:0),6,{rx:1,fill:'var(--mute)',stroke:'none',fo:0.6});ly+=9}
    body+=T(x+lw+22,y+44,'gap under',{fs:11,fill:'var(--acc)'})+T(x+lw+22,y+58,'0.5 line:',{fs:11,fill:'var(--acc)'})+T(x+lw+22,y+72,'same box',{fs:11,fill:'var(--acc)'});
    body+=T(x+10,y+ph-12,'a wider gap starts a new box',{fs:11,fill:'var(--mute)'});
    // panel 3: boxes to an order
    [x,y]=at(2);body+=rect(x,y,pw,ph,{fill:'none'})+T(x+8,y+16,'3. boxes to an order',{fs:12,w:600});
    const cx=x+12,cg=44,cw=(Math.min(pw,300)-24-cg)/2,by=[y+28,y+84];
    const B={L1:[cx,by[0]],L2:[cx,by[1]],R1:[cx+cw+cg,by[0]],R2:[cx+cw+cg,by[1]]};
    Object.entries(B).forEach(([k,p])=>{body+=rect(p[0],p[1],cw,26,{rx:3,fill:'var(--soft)'})+T(p[0]+cw/2,p[1]+17,k,{fs:11,a:'middle',w:600})});
    const c=(k,dy)=>[B[k][0]+cw/2,B[k][1]+(dy||15)];
    const good=[['L1','L2'],['L2','R1'],['R1','R2']];
    const qx=k=>B[k][0]+cw*0.25,rx=k=>B[k][0]+cw*0.75;
    body+=line(qx('L1'),by[0]+26,qx('L2'),by[1],{stroke:'var(--good)',sw:1.8,arrow:'ing-ah2'});
    body+=line(qx('L2')+6,by[1],qx('R1')-6,by[0]+26,{stroke:'var(--good)',sw:1.8,arrow:'ing-ah2'});
    body+=line(qx('R1'),by[0]+26,qx('R2'),by[1],{stroke:'var(--good)',sw:1.8,arrow:'ing-ah2'});
    body+=line(B.L1[0]+cw,by[0]+13,B.R1[0]-2,by[0]+13,{stroke:'var(--bad)',sw:1.5,dash:'4 3',arrow:'ing-ah3'});
    body+=line(rx('R1'),by[0]+26,B.L2[0]+cw+2,by[1]+6,{stroke:'var(--bad)',sw:1.5,dash:'4 3',arrow:'ing-ah3'});
    body+=line(B.L2[0]+cw,by[1]+18,B.R2[0]-2,by[1]+18,{stroke:'var(--bad)',sw:1.5,dash:'4 3',arrow:'ing-ah3'});
    body+=T(x+10,y+ph-26,'by column: L1 L2 R1 R2',{fs:11,fill:'var(--good)',w:600})+T(x+10,y+ph-11,'top to bottom, full width: L1 R1 L2 R2',{fs:11,fill:'var(--bad)',w:600});
    rules.innerHTML=RD.svg(W,wide?ph+1:3*ph+21,body,'How a rule-based extractor groups glyphs into words, lines and boxes and orders the boxes');
  }

  // ---------- section 5: route pages to OCR ----------
  const ocr=document.getElementById('ing-ocr');
  const OUT=[
    {t:'Good text layer',l:['extract it: 0.01 to 0.13 s per page','(section 4); exact characters'],c:'var(--good)'},
    {t:'Missing or broken layer',l:['classic OCR (Tesseract here:','2.18 s per page at 300 dpi)'],c:'var(--c5)'},
    {t:'Hard layout, handwriting',l:['VLM OCR on a GPU: seconds per','page; can hallucinate or repeat'],c:'var(--bad)'}];
  function drawOcr(){
    if(!ocr)return;const W=RD.width(ocr),wide=W>=640;let body=marker('ing-ah4','var(--mute)'),H;
    const chk=['characters per page area','replacement or private-use share','share of dictionary words','one full-page image?'];
    if(wide){
      const c1=110,c2=236,gap=26,x2=c1+gap,x3=x2+c2+gap,bw=W-x3-1,bh=50,H0=3*bh+2*10;H=H0+2;
      body+=rect(0,H0/2-25,c1,50,{fill:'var(--soft)'})+T(10,H0/2-4,'Each page',{fs:12,w:600})+T(10,H0/2+12,'of the file',{fs:11,fill:'var(--mute)'});
      body+=line(c1+2,H0/2,x2-2,H0/2,{arrow:'ing-ah4'});
      body+=rect(x2,6,c2,H0-12,{fill:'var(--soft)',stroke:'var(--acc)'})+T(x2+10,26,'Text-layer check',{fs:12,w:600});
      chk.forEach((s,k)=>{body+=T(x2+10,46+k*18,'· '+s,{fs:11,fill:'var(--mute)'})});
      OUT.forEach((o,k)=>{const y=k*(bh+10);body+=line(x2+c2+2,H0/2,x3-2,y+bh/2,{arrow:'ing-ah4'});
        body+=rect(x3,y,bw,bh,{fill:'var(--soft)',stroke:o.c,sw:1.4})+T(x3+10,y+17,o.t,{fs:12,w:600})+T(x3+10,y+32,o.l[0],{fs:11,fill:'var(--mute)'})+T(x3+10,y+45,o.l[1],{fs:11,fill:'var(--mute)'})});
    }else{
      let y=0;body+=rect(0,y,W-1,30,{fill:'var(--soft)'})+T(10,y+19,'Each page of the file',{fs:12,w:600});y+=30;
      body+=line(W/2,y+2,W/2,y+12,{arrow:'ing-ah4'});y+=14;
      const ch=24+chk.length*16;body+=rect(0,y,W-1,ch,{fill:'var(--soft)',stroke:'var(--acc)'})+T(10,y+18,'Text-layer check',{fs:12,w:600});
      chk.forEach((s,k)=>{body+=T(10,y+36+k*16,'· '+s,{fs:11,fill:'var(--mute)'})});y+=ch;
      OUT.forEach(o=>{body+=line(W/2,y+2,W/2,y+12,{arrow:'ing-ah4'});y+=14;
        body+=rect(0,y,W-1,50,{fill:'var(--soft)',stroke:o.c,sw:1.4})+T(10,y+17,o.t,{fs:12,w:600})+T(10,y+32,o.l[0],{fs:11,fill:'var(--mute)'})+T(10,y+45,o.l[1],{fs:11,fill:'var(--mute)'});y+=50});H=y+2;
    }
    ocr.innerHTML=RD.svg(W,Math.ceil(H),body,'Route each page by a text-layer check: extract, classic OCR, or VLM OCR');
  }

  // ---------- section 10: ColPali patches and the cost trade, to scale ----------
  const cp=document.getElementById('ing-cp');
  const M=window.ING&&ING.mm;const thumb=M&&M.thumbs&&M.thumbs['InfoQ:55'];
  function drawCp(){
    if(!cp)return;const W=RD.width(cp),wide=W>=620;let body=marker('ing-ah5','var(--mute)');
    const S=wide?190:Math.min(190,W-20);let ix=0,iy=18;
    body+=T(0,12,'Page resized to 448 × 448: 32 × 32 patches',{fs:11,w:600});
    if(thumb)body+='<image href="'+thumb+'" x="'+ix+'" y="'+iy+'" width="'+S+'" height="'+S+'" preserveAspectRatio="none"/>';
    body+=rect(ix,iy,S,S,{rx:0,fill:'none',stroke:'var(--ink)'});
    let g='';for(let k=1;k<32;k++){const d=(S*k/32).toFixed(1);g+='M'+(ix+ +d)+','+iy+'v'+S+'M'+ix+','+(iy+ +d)+'h'+S}
    body+='<path d="'+g+'" stroke="var(--c4)" stroke-width="0.5" stroke-opacity="0.75" fill="none"/>';
    body+=rect(ix+S*5/32,iy+S*9/32,S/32,S/32,{rx:0,fill:'var(--c4)',stroke:'var(--c4)',fo:0.9});
    let bx,by;
    if(wide){bx=S+40;by=18;body+=line(ix+S*5.5/32,iy+S*9.5/32,bx-6,by,{arrow:'ing-ah5',sw:1.2});}
    else{bx=0;by=iy+S+22;}
    const bw=W-bx-1;
    body+=T(bx,by+4,'1 patch → 1 vector of 128 numbers',{fs:11,fill:'var(--mute)'})+T(bx,by+18,'1,024 patches + 6 prompt tokens = 1,030 per page',{fs:11,fill:'var(--mute)'});
    // storage to scale
    const lab=wide?96:84,maxw=bw-lab-70;let y=by+40;
    const bar=(lbl,v,max,c,txt)=>{const w=maxw*v/max;const s=T(bx,y+11,lbl,{fs:11})+rect(bx+lab,y,Math.max(1.5,w),14,{rx:2,fill:c,stroke:'none'})+T(bx+lab+Math.max(1.5,w)+5,y+11,txt,{fs:11,w:600});y+=20;return s};
    body+=T(bx,y,'Storage per page, to scale',{fs:11.5,w:600});y+=8;
    body+=bar('Text chunk',8.6,257.5,'var(--c2)','8.6 KB')+bar('ColPali',257.5,257.5,'var(--c4)','257.5 KB');
    y+=10;body+=T(bx,y,'Indexing time per page (NVIDIA L4), to scale',{fs:11.5,w:600});y+=8;
    const segs=[['layout',0.81],['OCR',2.67],['captions',3.71],['encode',0.03]];let x=bx+lab;
    body+=T(bx,y+11,'Text pipeline',{fs:11});
    segs.forEach(([n,v],k)=>{const w=maxw*v/7.22;body+=rect(x,y,Math.max(1,w-1),14,{rx:1,fill:'var(--c2)',stroke:'none',fo:0.45+0.15*k});if(w>46)body+=T(x+4,y+11,n,{fs:11,fill:'var(--ink)'});x+=w});
    body+=T(x+5,y+11,'7.22 s',{fs:11,w:600});y+=20;
    body+=T(bx,y+11,'ColPali',{fs:11})+rect(bx+lab,y,Math.max(1.5,maxw*0.39/7.22),14,{rx:2,fill:'var(--c4)',stroke:'none'})+T(bx+lab+maxw*0.39/7.22+5,y+11,'0.39 s',{fs:11,w:600});y+=20;
    const H=Math.max(iy+S+4,y+4);
    cp.innerHTML=RD.svg(W,Math.ceil(H),body,'A page image cut into 32 by 32 patches, and storage and indexing time of ColPali against a text pipeline, to scale');
  }

  function all(){drawHero();drawRules();drawOcr();drawCp()}
  all();RD.onRender(all);RD.onResize(all);
})();
