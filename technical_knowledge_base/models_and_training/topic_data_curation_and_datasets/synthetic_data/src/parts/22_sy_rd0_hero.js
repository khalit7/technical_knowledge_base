// ---- Reading tab, hero: three ways to make synthetic text, one gate, the mix with all real data, and the collapse loop (static annotated diagram, two layouts) ----
(function(){
  const host=document.getElementById('sy-hero');if(!host)return;
  const T=(x,y,s,o)=>RD.t(x,y,s,o);
  function box(x,y,w,h,lines,col,o){o=o||{};let s='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="7" fill="var(--soft)" stroke="'+col+'" stroke-width="'+(o.sw||2)+'"'+(o.dash?' stroke-dasharray="5 4"':'')+'/>';
    const lh=14,y0=y+h/2-(lines.length-1)*lh/2+4;
    lines.forEach((l,i)=>{const b=i===0&&o.bold!==false;s+=T(x+w/2,y0+i*lh,l,{a:'middle',fs:11.5,w:b?600:null,fill:i===lines.length-1&&o.last?o.last:null})});return s}
  const arr=(x1,y1,x2,y2,col)=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+(col||'var(--mute)')+'" stroke-width="1.6" marker-end="url(#sy-ar)"/>';
  const defs='<defs><marker id="sy-ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--mute)"/></marker>'+
    '<marker id="sy-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--bad)"/></marker></defs>';
  const LANES=[
    {col:'var(--c2)',seed:['Seed: a topic,','3 random words,','a persona'],gen:['Generator writes','from its memory'],out:['New text: textbooks,','stories, instructions','facts: the generator\'s'],
     sseed:['Topic, words,','persona'],sout:['New textbooks,','stories','facts: generator']},
    {col:'var(--c1)',seed:['Seed: a real','web page'],gen:['Generator rewrites','style or structure'],out:['Same facts, new form:','Wikipedia-style, Q and A','facts: the page\'s'],
     sseed:['A real','web page'],sout:['Same facts,','new form','facts: the page']},
    {col:'var(--c2)',seed:['Seed: a problem','or a spec'],gen:['Generator writes','code or a solution'],out:['Run or check it,','keep what passes','facts: checked'],
     sseed:['A problem','or a spec'],sout:['Kept only','if it passes','facts: checked']}];
  const LAB=['generated from seeds (TinyStories, phi, Cosmopedia)','rephrased or transformed (WRAP, Nemotron-CC)','generated and verified (phi-1 exercises, MegaMath)'];
  function draw(){const W=RD.width(host);let s=defs,H;
    if(W>=640){const lh=70,g=16,top=16,x1=0,w1=W*0.2,x2=W*0.245,w2=W*0.19,x3=W*0.48,w3=W*0.25,x4=W*0.78,w4=W*0.22-2;
      LANES.forEach((L,i)=>{const y=top+i*(lh+g);
        s+=T(x1,y-3,LAB[i],{fs:11,fill:'var(--mute)'});
        s+=box(x1,y+2,w1,lh-6,L.seed,L.col,{bold:false});s+=arr(x1+w1+2,y+lh/2,x2-3,y+lh/2);
        s+=box(x2,y+2,w2,lh-6,L.gen,'var(--line)',{bold:false,sw:1.2});s+=arr(x2+w2+2,y+lh/2,x3-3,y+lh/2);
        s+=box(x3,y+2,w3,lh-6,L.out,L.col,{last:L.col});s+=arr(x3+w3+2,y+lh/2,x4-3,y+lh/2)});
      const gh=3*lh+2*g-6;s+=box(x4,top+2,w4,gh,['Gate: measure','and filter','openings, distinct-n,','gzip, near-duplicates,','benchmark overlap,','facts (section 6)'],'var(--good)',{});
      const yb=top+3*(lh+g)+34,bh=58,xr=0,wr=W*0.27,xm=W*0.36,wm=W*0.3,xs=W*0.75,ws=W*0.25-2;
      s+=box(xr,yb,wr,bh,['All the real data','always kept'],'var(--c3)',{});
      s+=box(xm,yb,wm,bh,['Mix: synthetic about','a third to a half','of a stage (section 5)'],'var(--acc)',{});
      s+=box(xs,yb,ws,bh,['Student model','learns faster;','no new knowledge'],'var(--ink)',{sw:1.4});
      s+='<path d="M'+(x4+w4/2)+' '+(top+gh+2)+' V'+(yb-14)+' H'+(xm+wm/2)+' V'+(yb-3)+'" fill="none" stroke="var(--mute)" stroke-width="1.6" marker-end="url(#sy-ar)"/>';
      s+=arr(xr+wr+2,yb+bh/2,xm-3,yb+bh/2);s+=arr(xm+wm+2,yb+bh/2,xs-3,yb+bh/2);
      const yl=yb+bh+26;s+='<path d="M'+(xs+ws/2)+' '+(yb+bh+1)+' V'+yl+' H'+(xr+wr/2)+' V'+(yb+bh+5)+'" fill="none" stroke="var(--bad)" stroke-width="1.8" stroke-dasharray="6 4" marker-end="url(#sy-arr)"/>';
      s+=T((xr+wr/2+xs+ws/2)/2,yl+15,'Avoid: replace the real data with the model\'s own output, generation after generation; rare things vanish (section 7)',{a:'middle',fs:11.5,fill:'var(--bad)'});
      H=yl+24}
    else{const pad=0,bw=(W-36)/2,lh=62,g=24,top=16;
      LANES.forEach((L,i)=>{const y=top+i*(lh+g);
        s+=T(0,y-3,LAB[i].split(' (')[0],{fs:11,fill:'var(--mute)'});
        s+=box(pad,y+2,bw,lh-6,L.sseed,L.col,{bold:false});
        s+=T(pad+bw+18,y+lh/2-6,'gen.',{a:'middle',fs:10.5,fill:'var(--mute)'});s+=arr(pad+bw+3,y+lh/2,pad+bw+33,y+lh/2);
        s+=box(pad+bw+36,y+2,bw,lh-6,L.sout,L.col,{last:L.col})});
      let y=top+3*(lh+g)-6;s+=box(0,y,W-2,48,['Gate: measure and filter (section 6)','openings, distinct-n, near-dups, benchmarks'],'var(--good)',{});
      y+=48;s+=arr(W/2,y+2,W/2,y+20);y+=24;
      const w3=(W-24)/3;
      s+=box(0,y,w3,56,['All real','data, kept'],'var(--c3)',{});s+=box(w3+12,y,w3,56,['Mix: 1/3','to 1/2','synthetic'],'var(--acc)',{});s+=box(2*w3+24,y,w3-2,56,['Student','model'],'var(--ink)',{sw:1.4});
      s+=arr(w3+1,y+28,w3+10,y+28);s+=arr(2*w3+13,y+28,2*w3+22,y+28);
      const yl=y+56+22;s+='<path d="M'+(2*w3+24+w3/2)+' '+(y+57)+' V'+yl+' H'+(w3/2)+' V'+(y+61)+'" fill="none" stroke="var(--bad)" stroke-width="1.8" stroke-dasharray="6 4" marker-end="url(#sy-arr)"/>';
      s+=T(W/2,yl+15,'Avoid: replacing real data',{a:'middle',fs:11.5,fill:'var(--bad)'});s+=T(W/2,yl+29,'with model output (section 7)',{a:'middle',fs:11.5,fill:'var(--bad)'});
      H=yl+36}
    host.innerHTML=RD.svg(W,H,s,'Three ways to make synthetic text, a measuring gate, a mix that keeps all real data, and the collapse loop to avoid')}
  RD.onRender(draw);RD.onResize(draw);draw();
})();
