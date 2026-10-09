// ---- Reading section 2: PagedAttention Fig. 2 (transcribed labels) and memory share on real trace lengths ----
(function(){
  const f2=document.getElementById('bk-f2-svg');if(!f2)return;
  // PagedAttention (arXiv 2309.06180) Fig. 2, printed labels: token states, reservation, internal frag., external frag. & others
  const F2=[['Orca (Max)',[20.4,13.3,57.3,8.9]],['Orca (Pow2)',[26.8,17.9,13.6,41.6]],['Orca (Oracle)',[38.2,25.2,0,36.6]],['vLLM',[96.3,0,0,3.7]]];
  const CC=['var(--good)','var(--c5)','var(--c2)','var(--c4)'];
  function drawF2(){
    const W=Math.max(300,Math.min(860,RD.width(f2))),lab=W<480?78:100,bw=W-lab-10,rh=26;let b='';
    F2.forEach((r,i)=>{const y=6+i*(rh+8);let x=lab;b+=RD.t(0,y+rh/2+4,r[0],{fs:11.5});
      r[1].forEach((v,k)=>{if(!v)return;const w=bw*v/100;b+='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+rh+'" fill="'+CC[k]+'" opacity="'+(k?0.75:1)+'"/>';
        if(w>26)b+=RD.t(x+w/2,y+rh/2+4,v.toFixed(1),{a:'middle',fs:10.5,fill:'var(--bg)'});x+=w});});
    f2.innerHTML=RD.svg(W,6+F2.length*(rh+8),b,'PagedAttention figure 2');
  }
  const bars=document.getElementById('bk-fr-bars'),tr=document.getElementById('bk-fr-tr'),mm=document.getElementById('bk-fr-m');
  function drawFr(){
    const d=BKD.frag.traces[tr.value],M=mm.value;
    const rows=[['Contiguous, Max (max_tokens '+(+M).toLocaleString('en-US')+')',d.max[M],'var(--c2)'],['Contiguous, Pow2',d.pow2,'var(--c5)'],['Contiguous, Oracle',d.oracle,'var(--c4)'],
      ['Paged, 2,048-token blocks',d.paged['2048'],'var(--c6)'],['Paged, 512-token blocks',d.paged['512'],'var(--c6)'],['Paged, 16-token blocks (vLLM)',d.paged['16'],'var(--good)']];
    bars.innerHTML=rows.map(r=>'<div class="row"><div class="nm">'+r[0]+'</div><div class="track"><div class="fill" style="width:'+(r[1]*100).toFixed(2)+'%;background:'+r[2]+'"></div></div><div class="val">'+(r[1]*100).toFixed(r[1]>0.995?2:1)+'%</div></div>').join('');
  }
  tr.addEventListener('change',drawFr);mm.addEventListener('change',drawFr);
  drawF2();drawFr();RD.onRender(()=>{drawF2();drawFr()});RD.onResize(()=>{drawF2()});
})();
