// ---- Hero: eight constraints, the labs that bet on each, and the one number that shows the bet (static, click a row to jump) ----
(function(){
  const box=$('heroSvg');if(!box)return;
  const R=[
    ['s-data','Data quality per parameter','--c1','Microsoft Phi, OpenBMB MiniCPM','Phi-4: 14B dense, 84.8% on MMLU'],
    ['s-mem','Memory per token','--c2','NVIDIA Nemotron, IBM Granite, Liquid AI, AI21 Jamba, TII Falcon-H','KV cache 6 KiB per token, not 96 KiB'],
    ['s-trust','Auditability, on-prem','--c3','Cohere, IBM','Command A: 111B dense on two GPUs at 8-bit'],
    ['s-comp','Bits per weight','--c6','Prism ML Bonsai 2','27B weights in 5.94 GB at 1.76 bits'],
    ['s-dist','Distribution and billing','--c4','Amazon Nova and Bedrock, Microsoft Azure','many vendors, one bill, one IAM policy'],
    ['s-scale','Open scale, low price','--c5','Tencent, Xiaomi, StepFun, NaiveAI; Arcee, Reflection, Aleph Alpha','MiMo-V2.6-Pro: 1.02T / 42B, last RL stage $2.62M'],
    ['s-olmo','Openness itself','--acc','Ai2 OLMo, IFM K2 Horizon, Prime Intellect, Hugging Face','Olmo 3 32B: 718 public checkpoints, not 1'],
    ['s-route','Not a single model','--bad','Sakana Fugu, TypeSafe Jev, Cloudflare Clef','routes or decides; Jev answers in 70 to 500 ms']];
  const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;');
  function wrap(t,max){const w=t.split(' ');const out=[];let cur='';w.forEach(x=>{if((cur+' '+x).trim().length>max&&cur){out.push(cur);cur=x}else cur=(cur+' '+x).trim()});if(cur)out.push(cur);return out}
  function draw(){
    const W=Math.max(300,box.clientWidth||700),narrow=W<640;let s='',y=0;
    if(!narrow){
      const c1=Math.round(W*.29),c2=Math.round(W*.37),fs=12.5,cw=fs*.56;
      s+='<text x="12" y="14" font-size="11" fill="var(--mute)">CONSTRAINT</text><text x="'+(c1+8)+'" y="14" font-size="11" fill="var(--mute)">LABS</text><text x="'+(c1+c2+8)+'" y="14" font-size="11" fill="var(--mute)">THE NUMBER THAT SHOWS THE BET</text>';y=22;
      R.forEach(r=>{const L=wrap(r[3],Math.floor((c2-14)/cw)),N=wrap(r[4],Math.floor((W-c1-c2-14)/cw)),n=Math.max(L.length,N.length,1),h=10+n*16;
        s+='<g class="hr" data-s="'+r[0]+'" role="link" tabindex="0"><rect class="bgr" x="0" y="'+y+'" width="'+W+'" height="'+h+'" fill="var(--bg)" stroke="var(--line)"/>'+
          '<rect x="0" y="'+y+'" width="5" height="'+h+'" fill="var('+r[2]+')"/><text x="12" y="'+(y+18)+'" font-size="'+fs+'" font-weight="600" fill="var(--ink)">'+esc(r[1])+'</text>';
        L.forEach((l,i)=>{s+='<text x="'+(c1+8)+'" y="'+(y+18+i*16)+'" font-size="'+fs+'" fill="var(--mute)">'+esc(l)+'</text>'});
        N.forEach((l,i)=>{s+='<text x="'+(c1+c2+8)+'" y="'+(y+18+i*16)+'" font-size="'+fs+'" fill="var(--ink)">'+esc(l)+'</text>'});
        s+='</g>';y+=h+4});
    }else{
      const fs=12,cw=fs*.56,mx=Math.floor((W-20)/cw);
      R.forEach(r=>{const L=wrap(r[3],mx),N=wrap(r[4],mx),h=8+(1+L.length+N.length)*15;
        s+='<g class="hr" data-s="'+r[0]+'" role="link" tabindex="0"><rect class="bgr" x="0" y="'+y+'" width="'+W+'" height="'+h+'" fill="var(--bg)" stroke="var(--line)"/><rect x="0" y="'+y+'" width="5" height="'+h+'" fill="var('+r[2]+')"/>'+
          '<text x="11" y="'+(y+16)+'" font-size="'+(fs+.5)+'" font-weight="600" fill="var(--ink)">'+esc(r[1])+'</text>';
        let k=1;L.forEach(l=>{s+='<text x="11" y="'+(y+16+k*15)+'" font-size="'+fs+'" fill="var(--mute)">'+esc(l)+'</text>';k++});
        N.forEach(l=>{s+='<text x="11" y="'+(y+16+k*15)+'" font-size="'+fs+'" fill="var(--ink)">'+esc(l)+'</text>';k++});
        s+='</g>';y+=h+4});
    }
    box.innerHTML='<svg viewBox="0 0 '+W+' '+y+'" width="'+W+'" height="'+y+'" role="img" aria-label="Eight constraints, the labs that bet on each and the number that shows the bet">'+s+'</svg>';
    box.querySelectorAll('.hr').forEach(g=>{const go=()=>{const t=$(g.dataset.s);if(t)t.scrollIntoView({block:'start'})};g.addEventListener('click',go);g.addEventListener('keydown',e=>{if(e.key==='Enter')go()})});
  }
  let lw=0;addEventListener('resize',()=>{const w=box.clientWidth;if(w&&w!==lw){lw=w;draw()}});onTab('t-read',draw);draw();
})();
