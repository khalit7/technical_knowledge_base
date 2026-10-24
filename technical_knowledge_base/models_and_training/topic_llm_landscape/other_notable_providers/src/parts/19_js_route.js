// ---- Not a single model: the shape of the call for a model, an orchestrator (Fugu) and a decision model (Jev); static ----
(function(){
  const box=$('rtSvg');if(!box)return;
  const esc=s=>s.replace(/&/g,'&amp;');
  function node(x,y,w,h,t,sub,col){let s='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="6" fill="var(--bg)" stroke="'+(col||'var(--line)')+'" stroke-width="'+(col?1.6:1)+'"/>';
    s+='<text x="'+(x+w/2)+'" y="'+(y+(sub?h/2-2:h/2+4))+'" font-size="12" text-anchor="middle" fill="var(--ink)" font-weight="600">'+esc(t)+'</text>';
    if(sub)s+='<text x="'+(x+w/2)+'" y="'+(y+h/2+12)+'" font-size="11" text-anchor="middle" fill="var(--mute)">'+esc(sub)+'</text>';return s}
  const arr=(x1,y1,x2,y2)=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="var(--mute)" stroke-width="1.3" marker-end="MARK"/>';
  function draw(){
    const W=Math.max(300,box.clientWidth||700),narrow=W<600;let s='',y=0;
    const rows=[
      {t:'A model',a:'prompt',m:['the model',''],o:['text','one token at a time']},
      {t:'Fugu: a learned orchestrator',a:'query',m:['Fugu','builds a scaffold'],pool:['Thinker','Worker','Verifier'],o:['one answer','OpenAI-compatible API']},
      {t:'Jev: a decision model',a:'unstructured state',m:['Jev','sampled in parallel'],o:['typed value','+ calibrated confidence']}];
    rows.forEach((r,i)=>{
      s+='<text x="0" y="'+(y+14)+'" font-size="12" font-weight="600" fill="'+(i?'var(--acc)':'var(--mute)')+'">'+esc(r.t)+'</text>';y+=22;
      if(!narrow){
        const bw=(W-60)/4,h=r.pool?62:42,mid=y+h/2;
        s+=node(0,y,bw*.8,h,r.a,'');s+=arr(bw*.8+2,mid,bw+8,mid);
        s+=node(bw+10,y,bw,h,r.m[0],r.m[1],i?'var(--acc)':null);
        if(r.pool){const px=2*bw+30,pw=bw*.9;r.pool.forEach((p,k)=>{const py=y+k*21;s+=node(px,py,pw,19,p,'')});s+=arr(2*bw+12,mid,px-2,mid);s+='<text x="'+(px+pw/2)+'" y="'+(y+h+12)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">pool of other models</text>';s+=arr(px+pw+2,mid,3*bw+38,mid);s+=node(3*bw+40,y,W-(3*bw+40),h,r.o[0],r.o[1])}
        else{s+=arr(2*bw+12,mid,3*bw+38,mid);s+=node(3*bw+40,y,W-(3*bw+40),h,r.o[0],r.o[1])}
        y+=h+(r.pool?26:16);
      }else{
        const bw=W*.62,x=(W-bw)/2;let h=34;
        s+=node(x,y,bw,26,r.a,'');y+=26;s+=arr(W/2,y+1,W/2,y+13);y+=15;
        s+=node(x,y,bw,40,r.m[0],r.m[1],i?'var(--acc)':null);y+=40;s+=arr(W/2,y+1,W/2,y+13);y+=15;
        if(r.pool){const pw=(bw-8)/3;r.pool.forEach((p,k)=>{s+=node(x+k*(pw+4),y,pw,22,p,'')});y+=22;s+='<text x="'+(W/2)+'" y="'+(y+12)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">pool of other models</text>';y+=16;s+=arr(W/2,y+1,W/2,y+13);y+=15}
        s+=node(x,y,bw,40,r.o[0],r.o[1]);y+=40+18;
      }
    });
    const H=y;
    box.innerHTML=svgEl(W,H,s,'A model, an orchestrator and a decision model, each behind one endpoint').replace('width="100%"','width="'+W+'" height="'+H+'"');
  }
  let lw=0;addEventListener('resize',()=>{const w=box.clientWidth;if(w&&w!==lw){lw=w;draw()}});onTab('t-read',draw);draw();
})();
