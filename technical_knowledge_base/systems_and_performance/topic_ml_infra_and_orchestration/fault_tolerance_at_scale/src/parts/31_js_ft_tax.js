// ---- Failure taxonomies tab (t-tax): published tables on one scheme (window.FT.tax) ----
(function(){
const T=window.FT.tax, $=id=>document.getElementById(id), E=RD.esc;
if(!T||!$('tx-card'))return;
const BK=['gpu','mem','net','host','sto','sw','user','unk'];
const COL={gpu:'var(--c1)',mem:'var(--c2)',net:'var(--c4)',host:'var(--c3)',sto:'var(--c6)',sw:'var(--c5)',user:'var(--ink)',unk:'var(--mute)'};
let W='n',SELID='llama3';
function drawBars(){
  const el=$('tx-bars'),w=RD.width(el),narrow=w<600,lw=narrow?0:230,rowH=narrow?42:26,top=4;
  const src=T.sources.filter(s=>W==='n'||s.bucket_share_gpu);
  const bw=w-lw-8;let s='';
  src.forEach((x,i)=>{const y=top+i*rowH+(narrow?15:0),sh=W==='n'?x.bucket_share:x.bucket_share_gpu;
    const lab=x.org+': '+x.name+(x.kind==='one job'?' (one job)':'');
    s+='<g data-id="'+x.id+'" style="cursor:pointer">';
    s+=RD.t(narrow?2:lw-6,narrow?y-3:y+13,E(lab.length>36&&!narrow?lab.slice(0,34)+'...':lab),{fs:11.5,a:narrow?'start':'end',w:x.id===SELID?700:400});
    let acc=0;const tot=BK.reduce((a,b)=>a+(sh[b]||0),0);
    BK.forEach(b=>{const v=(sh[b]||0)/tot;if(!v)return;const x0=lw+acc*bw,ww=v*bw;
      s+='<rect x="'+x0.toFixed(1)+'" y="'+y+'" width="'+ww.toFixed(1)+'" height="18" fill="'+COL[b]+'"'+(x.id===SELID?' stroke="var(--ink)" stroke-width="1"':'')+'><title>'+E(T.buckets[b])+': '+(sh[b]).toFixed(1)+'%</title></rect>';
      if(ww>30)s+=RD.t(x0+ww/2,y+13,Math.round(sh[b])+'%',{fs:10,a:'middle',fill:'var(--bg)'});
      acc+=v});
    s+='</g>';
  });
  const H=top+src.length*rowH+(narrow?18:8);
  el.innerHTML=RD.svg(w,H,s,'Share of failures by common category, one bar per published report');
  el.querySelectorAll('g[data-id]').forEach(g=>g.addEventListener('click',()=>{SELID=g.dataset.id;drawBars();drawDet()}));
  $('tx-leg').innerHTML=BK.map(b=>'<span><i style="background:'+COL[b]+'"></i>'+E(T.buckets[b])+'</span>').join('');
}
function drawDet(){
  const x=T.sources.find(s=>s.id===SELID),el=$('tx-det'),w=RD.width(el),narrow=w<600,lw=narrow?0:210,rowH=narrow?34:20;
  $('tx-det-h').innerHTML=E(x.org+': '+x.name)+' <span class="ft-pub">published</span>';
  $('tx-det-meta').innerHTML='<a href="'+E(x.url)+'" target="_blank" rel="noopener noreferrer">'+E(x.cite)+'</a>. Scale: '+E(x.scale)+'. Period: '+E(x.period)+'. Counting unit: <b>'+E(x.unit)+'</b>.';
  const rows=x.rows.slice();const useN=x.total!==null&&x.total!==undefined;
  const val=r=>useN?100*r.n/x.total:r.pct;
  const mx=Math.max(...rows.map(val),...rows.map(r=>r.gpu_pct||0));
  const labOf=r=>{const v=val(r),bad=useN&&r.pct!==undefined&&Math.abs(Math.round(1000*r.n/x.total)/10-r.pct)>0.15;
    return (useN?r.n.toLocaleString('en-US')+', ':'')+(r.pct!==undefined?r.pct+'% printed':v.toFixed(1)+'%')+(r.gpu_pct!==undefined?'; GPU time '+r.gpu_pct+'%':'')+(bad?' (count gives '+(100*r.n/x.total).toFixed(1)+'%)':'')};
  const lwMax=Math.max(...rows.map(r=>labOf(r).length))*5.7+10;
  const bw=Math.max(40,w-lw-lwMax);let s='';
  rows.forEach((r,i)=>{const y=i*rowH+(narrow?13:2);
    s+=RD.t(narrow?2:lw-6,narrow?y-2:y+12,E(r.name)+(r.group?' ('+E(r.group)+')':''),{fs:11,a:narrow?'start':'end'});
    const v=val(r),h=r.gpu_pct!==undefined?8:14;
    s+='<rect x="'+lw+'" y="'+y+'" width="'+Math.max(1,v/mx*bw).toFixed(1)+'" height="'+h+'" fill="'+COL[r.b]+'"><title>'+E(T.buckets[r.b])+'</title></rect>';
    if(r.gpu_pct!==undefined)s+='<rect x="'+lw+'" y="'+(y+9)+'" width="'+Math.max(1,r.gpu_pct/mx*bw).toFixed(1)+'" height="6" fill="'+COL[r.b]+'" opacity=".45"/>';
    const bad=useN&&r.pct!==undefined&&Math.abs(Math.round(1000*r.n/x.total)/10-r.pct)>0.15;
    const lab=labOf(r);
    s+=RD.t(lw+Math.max(1,v/mx*bw)+4,y+11,lab,{fs:10.5,fill:bad?'var(--bad)':'var(--mute)',w:bad?700:400});
  });
  el.innerHTML=RD.svg(w,rows.length*rowH+8,s,'Every row of the selected table as printed');
  const c=x.checks.map(k=>k.sum!==undefined?'Counts add up to '+k.sum.toLocaleString('en-US')+(k.pct_mismatch.length?'; printed percentages that do not match their count: '+k.pct_mismatch.map(m=>E(m[0])+' printed '+m[1]+'%, count gives '+m[2]+'%').join('; '):'; every printed percentage matches its count'):k.pct_sum!==undefined?'Printed percentages add up to '+k.pct_sum+'%'+(x.success_pct?' (including '+x.success_pct+'% successful, not drawn)':''):'GPU-time column adds up to '+k.gpu_pct_sum+'%').join('. ');
  $('tx-det-chk').innerHTML='<b>Table check</b> <span class="ft-der">calculation</span> '+c+'. '+E(x.note)+(x.rows.some(r=>r.gpu_pct!==undefined)?' Thin lighter bars: share of GPU time.':'');
}
$('tx-none').innerHTML='<div class="grid">'+T.no_table.map(n=>'<div class="sp"><div class="n"><a href="'+E(n.url)+'" target="_blank" rel="noopener noreferrer">'+E(n.name)+'</a></div><p>'+E(n.what)+'</p></div>').join('')+'</div>';
RD.seg($('tx-w'),m=>{W=m;const ok=T.sources.find(s=>s.id===SELID);if(m==='gpu'&&!ok.bucket_share_gpu)SELID='acme';drawBars();drawDet()});
let inited=false;
function render(){inited=true;drawBars();drawDet()}
(window.TAB_RENDER=window.TAB_RENDER||{})['t-tax']=[render];
addEventListener('resize',()=>{const t=$('t-tax');if(t&&!t.hidden&&inited)render()});
})();
