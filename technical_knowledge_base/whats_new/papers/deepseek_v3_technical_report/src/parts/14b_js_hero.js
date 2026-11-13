// ---- Hero: the seven co-designed pieces, each with the number the paper gives for it, and the bill they add up to; static, nothing moves ----
// ---- (the all-to-all route that was drawn here is the 3D stage Fig. 1 since 2026-11-12, 31_js_sc_a2a.js) ----
(function(){
const host=$('heroSvg');
if(host){
  const M=[['DeepSeekMoE','1 shared + 8 of 256 routed','37B of 671B active','s-arch'],
           ['Aux-loss-free balancing','a bias bᵢ only picks the top 8','no tokens dropped','s-bal'],
           ['MLA','K and V from a 512-d latent','576 numbers cached, not 32,768','s-arch'],
           ['Multi-token prediction','1 extra block predicts t + 2','1.8× decoding as a draft','s-mtp']];
  const S=[['FP8 training','1×128 tiles, 128×128 blocks','loss within 0.25% of BF16','s-fp8'],
           ['DualPipe','hides all-to-all behind compute','16-way PP, no TP','s-infra'],
           ['All-to-all kernels','IB once per node, then NVLink','20 of 132 SMs','s-infra']];
  function box(x,y,w,h,b,c){return rc(x,y,w,h,'var(--bg)',{s:c,sw:1.6,r:6})+rc(x,y,5,h,c,{r:2})
    +tx(x+13,y+18,b[0],{fs:12.5,w:600})+tx(x+13,y+35,b[1],{fs:11,c:'var(--mute)'})+tx(x+13,y+52,b[2],{fs:12,w:600,c})}
  function row(items,y,W,cols,c){const g=10,bw=(W-2-(cols-1)*g)/cols,bh=62;let s='',r=0;
    items.forEach((b,i)=>{const cx=i%cols,ry=Math.floor(i/cols);r=ry;s+=box(1+cx*(bw+g),y+ry*(bh+g),bw,bh,b,c)});
    return {s,h:(r+1)*(bh+g)-g}}
  function draw(W){const cols=W>=780?4:W>=500?2:1,c3=W>=780?3:cols;let s='',y=14;
    s+=tx(1,y,'Do less arithmetic per token: the model',{fs:12.5,w:600,c:'var(--c1)'});y+=10;
    let r=row(M,y,W,cols,'var(--c1)');s+=r.s;y+=r.h+24;
    s+=tx(1,y,'Keep 2,048 H800s busy: the system',{fs:12.5,w:600,c:'var(--c2)'});y+=10;
    r=row(S,y,W,c3,'var(--c2)');s+=r.s;y+=r.h+16;
    s+=rc(1,y,W-2,W>=520?40:58,'var(--soft)',{r:6});
    if(W>=520){s+=tx(13,y+17,'= 2.788M H800 GPU hours, $5.576M at an assumed $2 an hour',{fs:12.5,w:600})+tx(13,y+33,'Llama 3.1 405B took 11.1× the hours for 11.5× the work (active parameters × tokens)',{fs:11,c:'var(--mute)'});y+=40}
    else{s+=tx(13,y+17,'= 2.788M H800 GPU hours',{fs:12.5,w:600})+tx(13,y+33,'$5.576M at an assumed $2 an hour',{fs:11,c:'var(--mute)'})+tx(13,y+49,'Llama 3.1 405B: 11.1× hours, 11.5× work',{fs:11,c:'var(--mute)'});y+=58}
    host.innerHTML=svgW(W,y+2,s,'DeepSeek-V3 in one picture: four model choices that cut arithmetic per token (DeepSeekMoE with 37B of 671B active, auxiliary-loss-free balancing, MLA with 576 cached numbers, multi-token prediction) and three system choices that keep the cluster busy (FP8 with fine-grained scales, DualPipe, all-to-all kernels), adding up to 2.788M H800 GPU hours')}
  fit(host,draw)}

})();
