// ---- Reading section 3: six timeline shapes (illustrative, labelled so), chosen by a row of the static symptom table ----
(function(){
  const el=document.getElementById('rd-sym-svg'),tab=document.getElementById('rd-sym-tab');if(!el||!tab)return;
  // each shape: lanes, then bars [lane, start, end, colour, label]; time runs 0..100 (one step); br: the bracket [lane, start, end, note]
  const K='var(--c1)',W8='var(--dim)',CP='var(--c5)',NC='var(--c4)',LD='var(--c6)',BW='var(--c2)';
  function launches(a,b,n,lane,col,lab){const o=[],d=(b-a)/n;for(let i=0;i<n;i++)o.push([lane,a+i*d,a+i*d+d*0.7,col,i===0?lab:'']);return o}
  const SH=[
    {lanes:['CPU','GPU'],bars:launches(0,100,10,0,'var(--c3)','launch').concat(launches(2,100,10,1,K,'kernel').map(b=>[b[0],b[1]+3,b[1]+5.5,b[3],b[4]])),br:[1,10.5,15,'idle: waiting for the next launch']},
    {lanes:['CPU','GPU'],bars:launches(0,28,6,0,'var(--c3)','launch').concat([[0,28,74,W8,'cudaStreamSynchronize (.item())']],launches(74,100,5,0,'var(--c3)','')).concat([[1,2,72,K,'kernels queued earlier'],[1,78,100,K,'']]),br:[1,72,78,'GPU idle while the CPU catches up']},
    {lanes:['CPU','Copy','GPU'],bars:[[0,0,34,W8,'cudaMemcpy (pageable)'],[1,1,34,CP,'host-to-device copy'],[2,35,100,K,'forward and backward']].concat(launches(35,100,8,0,'var(--c3)','')),br:[2,0,35,'compute waits for the copy']},
    {lanes:['GPU','NCCL'],bars:[[0,0,30,K,'forward'],[0,30,70,BW,'backward'],[1,70,96,NC,'all-reduce'],[0,96,100,'var(--c3)','opt']],br:[0,70,96,'compute idle during communication']},
    {lanes:['Loader','CPU','GPU'],bars:[[0,0,38,LD,'next batch: decode, augment'],[1,38,100,'var(--c3)','launches'],[2,40,100,K,'forward, backward, optimizer']],br:[2,0,40,'whole GPU idle at step start']},
    {lanes:['CPU','GPU'],bars:launches(0,30,6,0,'var(--c3)','launch').concat([[1,1,3,K,''],[1,3,40,'var(--c2)','gemm A'],[1,40,42,K,''],[1,42,78,'var(--c2)','gemm B'],[1,78,80,K,''],[1,80,96,'var(--c4)','attention'],[1,96,100,K,'']]),br:[1,3,78,'two kernels take most of the GPU time']}
  ];
  let k=0;
  function draw(){
    const s=SH[k],Wd=RD.width(el),L=Wd<500?48:60,R=10,X=t=>L+t/100*(Wd-L-R),rh=26,top=30;let o='';
    s.lanes.forEach((n,i)=>{const y=top+i*(rh+8);o+='<rect x="'+L+'" y="'+y+'" width="'+(Wd-L-R)+'" height="'+rh+'" style="fill:var(--soft);stroke:var(--line)"/>'+RD.t(L-6,y+17,n,{a:'end',fs:11,w:600})});
    s.bars.forEach(b=>{const y=top+b[0]*(rh+8)+3,x=X(b[1]),w=Math.max(1.5,X(b[2])-x);o+='<rect x="'+x.toFixed(1)+'" y="'+y+'" width="'+w.toFixed(1)+'" height="'+(rh-6)+'" rx="2" style="fill:'+b[3]+';opacity:.85"/>';
      if(b[4]&&w>b[4].length*5.8+6)o+=RD.t(x+4,y+14,RD.esc(b[4]),{fs:10.5,fill:b[3]===W8?'var(--ink)':'var(--bg)'})});
    const br=s.br,ly=top+br[0]*(rh+8),a=X(br[1]),b=X(br[2]),nl=s.lanes.length,ny=top+nl*(rh+8)+12;
    o+='<rect x="'+(a-1).toFixed(1)+'" y="'+(ly-2)+'" width="'+(b-a+2).toFixed(1)+'" height="'+(rh+4)+'" rx="3" fill="none" style="stroke:var(--bad)" stroke-width="2" stroke-dasharray="5 3"/>';
    o+='<line x1="'+((a+b)/2).toFixed(1)+'" x2="'+((a+b)/2).toFixed(1)+'" y1="'+(ly+rh+2)+'" y2="'+(ny-11)+'" style="stroke:var(--bad)" stroke-width="1.5"/>';
    const tx=Math.min(Wd-R,Math.max(L,(a+b)/2)),half=br[3].length*3.1,anc=tx+half>Wd-R?'end':tx-half<L?'start':'middle';
    o+=RD.t(anc==='end'?Wd-R:anc==='start'?Math.max(L,a):tx,ny,RD.esc(br[3]),{a:anc,fs:11,w:600,fill:'var(--bad)'});
    const H=ny+20;
    o+=RD.t(L,top-10,'one step, time left to right',{fs:10,fill:'var(--mute)'});
    el.innerHTML=RD.svg(Wd,H,o,'illustrative timeline shape');
  }
  function pick(tr){if(!tr||!tr.dataset.k)return;k=+tr.dataset.k;tab.querySelectorAll('tbody tr').forEach(r=>r.classList.toggle('on',r===tr));draw()}
  tab.addEventListener('click',e=>{if(e.target.closest('a'))return;pick(e.target.closest('tr[data-k]'))});
  tab.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){const tr=e.target.closest('tr[data-k]');if(tr){e.preventDefault();pick(tr)}}});
  RD.onRender(draw);RD.onResize(draw);draw();
})();
