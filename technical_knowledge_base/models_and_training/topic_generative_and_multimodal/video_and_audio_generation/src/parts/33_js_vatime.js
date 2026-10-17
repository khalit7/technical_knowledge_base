// ---- Tab: Model timeline ----
(function(){
  const U=window.VAU,V=U.V,$=id=>document.getElementById(id),esc=RD.esc;
  const FAM={dit:['Diffusion transformer','var(--c1)'],flow:['Flow matching','var(--c3)'],ar:['Autoregressive (tokens)','var(--c2)'],unified:['Unified multimodal','var(--c4)'],method:['Method, codec or metric paper','var(--c5)'],other:['Other (codec, recognition, TTS)','var(--c6)'],na:['Not disclosed','var(--mute)']};
  const EXTRA={sora:'Space-time patches of a compressed latent (Reading 1).',moviegen:'73,728 tokens for 16 s at 768 px, reproduced (Reading 1).',cogvx:'17,550 tokens for 49 frames at 480 x 720 (Reading 3).',ltxv:'1:8192 pixels per token, reproduced; 7,392 tokens at its default (Reading 1).',
    mochi:'44,520 tokens, reproduced; card says 128x compression, factors give 96 (Mistakes).',hyvid:'118,800 tokens at 720p, 129 frames; 3-D RoPE 16 / 56 / 56.',wan21:'VAE measured on this page (Reading 1); FLOPs counted (Reading 4).',wan22:'4 x 16 x 16 VAE, 27,280 tokens for 121 frames at 1280 x 704.',
    encodec:'Measured on this page at 1 to 32 codebooks.',dac:'Measured on this page at 1 to 9 codebooks.',moshi:'Its codec Mimi measured on this page at 1 to 32 codebooks.',soundstream:'Introduced RVQ with quantizer dropout for audio.'};
  let fc='all',fk='all',sel=null;
  const rows=V.timeline;$('tl-checked').textContent=V.mapchecked||'2026-10-17';
  const vis=()=>rows.filter(r=>(fc==='all'||r.c===fc)&&(fk==='all'||(fk==='method')===(r.fam==='method')));
  const t=d=>{const [y,m,dd]=d.split('-').map(Number);return y+(m-1)/12+(dd-1)/365};
  function draw(){const el=$('tl-svg'),w=RD.width(el),R=vis(),lanes=fc==='all'?['video','audio']:[fc],L=46,Rm=10,T=8,lh=Math.max(90,Math.min(130,w*0.2)),h=T+lanes.length*lh+24;
    const x0=2018.7,x1=2026.95,X=v=>L+(w-L-Rm)*(v-x0)/(x1-x0);let s='';
    for(let y=2019;y<=2026;y++)s+='<line x1="'+X(y)+'" x2="'+X(y)+'" y1="'+T+'" y2="'+(h-20)+'" stroke="var(--line)"/>'+RD.t(X(y),h-6,y,{a:'middle',fill:'var(--mute)',fs:10.5});
    lanes.forEach((ln,li)=>{const y0=T+li*lh;s+=RD.t(4,y0+14,ln,{fill:'var(--mute)',fs:11,w:600});
      const items=R.filter(r=>r.c===ln).sort((a,b)=>t(a.d)-t(b.d));const lastX=[];
      items.forEach(r=>{const x=X(t(r.d));let row=0;while(lastX[row]!=null&&x-lastX[row]<9)row++;lastX[row]=x;const y=y0+22+(row%7)*((lh-30)/7);
        const f=FAM[r.fam]||FAM.other,hollow=r.st==='retired'||r.st==='superseded',on=sel===r.id;
        s+='<circle data-id="'+r.id+'" cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+(on?7:5)+'" fill="'+(hollow?'var(--bg)':f[1])+'" stroke="'+f[1]+'" stroke-width="'+(on?3:2)+'" style="cursor:pointer"><title>'+esc(r.n+' ('+r.d+')')+'</title></circle>'})});
    el.innerHTML=RD.svg(w,h,s,'Timeline of video and audio models');
    $('tl-leg').innerHTML=Object.values(FAM).map(f=>'<span style="--sw:'+f[1]+'">'+f[0]+'</span>').join('');
    $('tl-table').innerHTML='<thead><tr><th>Date</th><th>Name</th><th>Kind</th><th>Family</th><th>Status</th></tr></thead><tbody>'+R.slice().sort((a,b)=>a.d<b.d?-1:1).map(r=>'<tr data-id="'+r.id+'"'+(sel===r.id?' class="sel"':'')+'><td>'+r.d+'</td><td>'+esc(r.n)+'</td><td>'+r.c+'</td><td>'+(FAM[r.fam]||FAM.other)[0]+'</td><td>'+esc(r.st)+(r.ev==='secondary'?' (secondary)':'')+'</td></tr>').join('')+'</tbody>'}
  function detail(id){sel=id;const r=rows.find(x=>x.id===id);if(!r)return;
    $('tl-det').innerHTML='<b>'+esc(r.n)+'</b>'+(r.o?' ('+esc(r.o)+')':'')+', '+r.d+' ('+esc(r.dk)+'), '+r.c+'. '+(r.obj?esc(r.obj)+'. ':'')+(r.size?'Size: '+esc(r.size)+'. ':'')+'Status: '+esc(r.st)+'.<br>'+esc(r.what)+(EXTRA[r.id]?'<br><i>On this page:</i> '+esc(EXTRA[r.id]):'')+(r.ax?'<br><a href="https://arxiv.org/abs/'+r.ax+'" target="_blank" rel="noopener noreferrer">arXiv '+r.ax+'</a>':'');draw()}
  $('tl-svg').addEventListener('click',e=>{const c=e.target.closest('circle[data-id]');if(c)detail(c.dataset.id)});
  $('tl-table').addEventListener('click',e=>{const tr=e.target.closest('tr[data-id]');if(tr)detail(tr.dataset.id)});
  RD.seg($('tl-c'),v=>{fc=v;draw()});RD.seg($('tl-k'),v=>{fk=v;draw()});
  RD.onResize(draw,'t-vatime');RD.onRender(draw,'t-vatime');
})();
