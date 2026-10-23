// ---- Reading sections 6 and 8: two static annotated diagrams (a constrained request's path; the router's decision), drawn at the measured width ----
(function(){
  const D=window.SGDRAW;if(!D)return;
  // section 6: where the grammar sits
  const g=document.getElementById('sg-gram');
  function drawGram(){if(!g)return;const W=RD.width(g),wide=W>=640,gap=wide?26:22;let b='';
    const items=[['1. Request','json_schema, regex or ebnf in the sampling parameters, or the OpenAI response_format',''],
      ['2. Compile once','XGrammar builds the grammar matcher; cached per schema, so only the first request with a new schema pays',''],
      ['3. Every decode step','the GPU runs the forward pass while the CPU fills a mask over the vocabulary (151,936 tokens for Qwen3)','var(--good)'],
      ['4. Mask, sample, advance','invalid tokens get probability zero, one token is sampled, the matcher advances by it','var(--good)']];
    if(wide){const bw=(W-2-3*gap)/4;let hs=items.map(it=>D.box(0,0,bw,it[0],it[1]).h),h=Math.max(...hs);
      items.forEach((it,i)=>{const x=1+i*(bw+gap);b+=D.box(x,1,bw,it[0],it[1],{h:h,stroke:it[2]||'var(--line)',sw:it[2]?1.6:1}).svg;if(i<3)b+=D.arrow(x+bw+2,1+h/2,x+bw+gap-2,1+h/2)});
      const x3=1+2*(bw+gap)+bw/2,x4=1+3*(bw+gap)+bw/2,yb=h+3;
      b+='<path d="M'+x4.toFixed(1)+','+yb+' C'+x4.toFixed(1)+','+(yb+26)+' '+x3.toFixed(1)+','+(yb+26)+' '+x3.toFixed(1)+','+(yb+4)+'" fill="none" stroke="var(--good)" stroke-width="1.5"/>'+D.arrow(x3,yb+8,x3,yb+1,'','var(--good)');
      b+=RD.t((x3+x4)/2,yb+38,'next token',{fs:11,fill:'var(--good)',a:'middle'});
      g.innerHTML=RD.svg(W,yb+44,b,'A constrained request in SGLang: request, compile once, mask every step, sample')}
    else{let y=1;const bw=W-40;const ys=[];
      items.forEach((it,i)=>{const r=D.box(1,y,bw,it[0],it[1],{stroke:it[2]||'var(--line)',sw:it[2]?1.6:1});b+=r.svg;ys.push([y,r.h]);y+=r.h;if(i<3){b+=D.arrow(bw/2,y+2,bw/2,y+gap-2);y+=gap}});
      const ya=ys[3][0]+ys[3][1]/2,yc=ys[2][0]+ys[2][1]/2,xr=bw+1;
      b+='<path d="M'+xr+','+ya+' H'+(xr+18)+' V'+yc+' H'+(xr+6)+'" fill="none" stroke="var(--good)" stroke-width="1.5"/>'+D.arrow(xr+10,yc,xr+1,yc,'','var(--good)');
      b+='<text x="'+(xr+32)+'" y="'+((ya+yc)/2)+'" font-size="11" fill="var(--good)" text-anchor="middle" transform="rotate(-90 '+(xr+32)+' '+((ya+yc)/2)+')">next token</text>';
      g.innerHTML=RD.svg(W,y+2,b,'A constrained request in SGLang: request, compile once, mask every step, sample')}}
  // section 8: the router's decision
  const r=document.getElementById('sg-route');
  function drawRoute(){if(!r)return;const W=RD.width(r),wide=W>=600;let b='',y=1;
    const mainW=wide?Math.round((W-2)*0.58):W-2,outX=wide?mainW+40:22,outW=wide?W-2-outX:W-24;
    const step=(t,s,o)=>{const q=D.box(1,y,mainW,t,s,o);b+=q.svg;const top=y;y+=q.h;return [top,q.h]};
    const out=(top,h,t,s,col)=>{if(wide){const q=D.box(outX,top,outW,t,s,{stroke:col,sw:1.6,fill:'var(--bg)'});b+=q.svg;const ay=top+Math.min(h,q.h)/2;b+=D.arrow(mainW+2,ay,outX-2,ay,'')+RD.t((mainW+outX)/2,ay-5,'yes',{fs:11,fill:'var(--mute)',a:'middle'});return 0}
      b+=D.arrow(10,y+2,10,y+18,'');const q=D.box(outX,y+4,outW,'yes: '+t,s,{stroke:col,sw:1.6,fill:'var(--bg)'});b+='<line x1="10" y1="'+(y+18)+'" x2="'+(outX-2)+'" y2="'+(y+18)+'" stroke="var(--mute)" stroke-width="1.5"/>';b+=q.svg;y+=q.h+8;return 1};
    const down=(lab)=>{b+=D.arrow(mainW/2,y+2,mainW/2,y+24,lab);y+=28};
    step('A request arrives (its text)','');down('');
    let s1=step('Is the load imbalanced?','busiest worker has more than 64 requests above the idlest AND more than 1.5 times as many');
    out(s1[0],s1[1],'least-loaded worker','load wins over cache','var(--bad)');down('no');
    step('Longest prefix match','against each worker\'s approximate tree of the text it was sent (characters, not tokens)');down('');
    let s3=step('Does the best match cover more than 0.3 of the text?','');
    out(s3[0],s3[1],'that worker','its replica likely holds the KV','var(--good)');down('no');
    step('Least-loaded worker','ties broken at random (the header comment says "smallest tree size"; the code does not)',{stroke:'var(--acc)',sw:1.6});down('');
    step('Insert the text into the chosen worker\'s tree','trees trimmed least recently used every 120 s, up to 2^26 nodes',{fill:'var(--bg)'});
    r.innerHTML=RD.svg(W,y+2,b,'Cache-aware routing decision: imbalance check, longest prefix, threshold, least loaded')}
  function draw(){drawGram();drawRoute()}
  draw();RD.onRender(draw);RD.onResize(draw);
})();
