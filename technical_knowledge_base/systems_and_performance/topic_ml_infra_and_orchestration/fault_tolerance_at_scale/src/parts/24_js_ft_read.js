// ---- Reading: predict-then-reveal, and the Llama 3 / 32K-job comparison (window.FT.tax) ----
(function(){
const $=id=>document.getElementById(id), E=RD.esc, T=window.FT.tax;
document.querySelectorAll('.ft-pr').forEach(pr=>pr.querySelector('.opts').addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  pr.querySelectorAll('.opts button').forEach(x=>{x.classList.toggle('right',x.dataset.r==='1');if(x===b&&x.dataset.r!=='1')x.classList.add('wrong')});
  pr.classList.add('done')}));
if(!$('wf-card'))return;
const COL={gpu:'var(--c1)',mem:'var(--c2)',net:'var(--c4)',host:'var(--c3)',sto:'var(--c6)',sw:'var(--c5)',user:'var(--ink)',unk:'var(--mute)'};
let M='l3';
function draw(){
  const x=T.sources.find(s=>s.id===(M==='l3'?'llama3':'meta32k')),el=$('wf-chart'),w=RD.width(el),narrow=w<560,lw=narrow?0:200,rowH=narrow?30:19;
  const rows=x.rows.slice().sort((a,b)=>b.n-a.n),mx=155;
  let s='';
  rows.forEach((r,i)=>{const y=i*rowH+(narrow?12:2),v=100*r.n/x.total,bw=w-lw-60;
    s+=RD.t(narrow?2:lw-6,narrow?y-2:y+11,E(r.name),{fs:11,a:narrow?'start':'end'});
    s+='<rect x="'+lw+'" y="'+y+'" width="'+Math.max(1,r.n/mx*bw).toFixed(1)+'" height="13" fill="'+COL[r.b]+'"/>';
    s+=RD.t(lw+r.n/mx*bw+4,y+11,r.n+' ('+v.toFixed(1)+'%)',{fs:10.5,fill:'var(--mute)'});
  });
  el.innerHTML=RD.svg(w,rows.length*rowH+6,s,'Interruptions by cause, as printed');
  const sh=x.bucket_share,g=(sh.gpu||0)+(sh.mem||0);
  $('wf-cap').innerHTML=M==='l3'?'<b>Llama 3 405B, 54 days, up to 16,384 H100.</b> 419 unexpected interruptions: GPU compute and GPU memory '+g.toFixed(1)+'% by count; the single largest row is "Faulty GPU" (148, printed as 30.1%, which is 35.3% of 419). 3.8 interruptions per 1,000 servers per day (our arithmetic).':'<b>A recurring 32K-GPU job, 2026.</b> 678 unexpected interruptions: GPU compute and memory '+g.toFixed(1)+'%, host hardware (PCIe devices, reboots, maintenance) '+(sh.host||0).toFixed(1)+'%; HBM is now the top row and faulty GPU compute fourth. Meta reports 2.3 interruptions per 1,000 servers per day and 95% to 97% effective training time.';
}
RD.seg($('wf-mode'),m=>{M=m;draw()});
RD.onRender(draw);RD.onResize(draw);draw();
})();
