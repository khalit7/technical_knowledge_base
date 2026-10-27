// ---- Weight memory = params x bits / 8, against the memory you have ----
(function(){
  const card=$('v-quant');if(!card)return;
  const M=[['Qwen 3.6 35B-A3B',35,'1.5 bits stated'],['Qwen 3.8 Flash Next',125,'"one 24 GB GPU"'],['DeepSeek V4.1',550,'"a 128 GB MacBook"']];
  const gb=(p,b)=>p*b/8;
  function draw(){
    const b=+$('qb').value,mem=+$('qm').value;$('qbV').textContent=b.toFixed(2);
    const box=$('qSvg'),W=Math.max(300,Math.round(box.clientWidth||340)),narrow=W<560;
    const pl=narrow?20:170,pr=26,rh=narrow?46:34,top=10,H=top+M.length*rh+40;
    const lo=2,hi=1200,lg=Math.log10,X=v=>pl+(W-pl-pr)*(lg(Math.max(lo,v))-lg(lo))/(lg(hi)-lg(lo));
    let s='';[2,5,10,20,50,100,200,500,1000].forEach((v,j)=>{const x=X(v);s+='<line x1="'+x+'" x2="'+x+'" y1="'+top+'" y2="'+(H-34)+'" stroke="var(--line)"/>';if(!narrow||j%2===0)s+='<text x="'+x+'" y="'+(H-20)+'" font-size="11" text-anchor="middle" fill="var(--mute)">'+v+' GB</text>'});
    s+='<text x="'+((pl+W-pr)/2)+'" y="'+(H-5)+'" font-size="11" text-anchor="middle" fill="var(--mute)">weight memory (log scale)</text>';
    const xm=X(mem);s+='<line x1="'+xm+'" x2="'+xm+'" y1="'+(top-4)+'" y2="'+(H-34)+'" stroke="var(--ink)" stroke-width="2" stroke-dasharray="5 3"/>';
    M.forEach((m,i)=>{const y=top+i*rh+(narrow?32:rh/2),g=gb(m[1],b),g16=gb(m[1],16),fit=g<=mem;
      s+='<text x="'+(narrow?pl:pl-8)+'" y="'+(narrow?y-14:y+4)+'" font-size="12" text-anchor="'+(narrow?'start':'end')+'">'+m[0]+' <tspan fill="var(--mute)" font-size="11">'+m[1]+'B</tspan></text>';
      s+='<rect x="'+pl+'" y="'+(y-7)+'" width="'+(X(g16)-pl)+'" height="14" rx="3" fill="none" stroke="var(--mute)" stroke-dasharray="3 2"/>';
      s+='<rect x="'+pl+'" y="'+(y-7)+'" width="'+Math.max(2,X(g)-pl)+'" height="14" rx="3" fill="'+(fit?'var(--good)':'var(--bad)')+'" opacity=".85"/>';
      const lab=(g<10?g.toFixed(1):fmt(g))+' GB, '+(fit?'fits':'does not fit');const a=X(g)+8,ok=a+lab.length*6<W-pr&&!(a<xm+4&&a+lab.length*6>xm-4&&false);
      s+='<text x="'+(ok?a:W-pr)+'" y="'+(ok?y+4:y-10)+'" font-size="11" text-anchor="'+(ok?'start':'end')+'">'+lab+'</text>'});
    box.innerHTML=svgEl(W,H,s,'Weight memory against available memory');
    const need=M.map(m=>8*mem/m[1]);
    $('qOut').innerHTML=stat('Share of 16-bit memory',(b/16*100).toFixed(1)+'%',b.toFixed(2)+' / 16')+M.map((m,i)=>stat('Most bits for '+m[0].split(' ').slice(0,2).join(' ')+' in '+mem+' GB',need[i]>=16?'16 (any)':need[i].toFixed(2),'8 × '+mem+' / '+m[1]+', weights only')).join('');
  }
  $('qb').addEventListener('input',draw);$('qm').addEventListener('change',draw);
  let rw=0;addEventListener('resize',()=>{const w=card.clientWidth;if(w!==rw){rw=w;draw()}});
  onTab(card.closest('.tab').id,draw);
})();
