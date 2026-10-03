// ---- Reading, distil or RL: R1 Table 16 and Qwen3 Table 21 as grouped bars ----
(function(){
  const $=id=>document.getElementById(id);if(!$('rl'))return;
  let mode='r1';
  function draw(){
    const el=$('rlB'),W=RD.width(el);
    const D=mode==='r1'?DS.r1t16:DS.qwen21,cols=D.cols,rows=D.rows;
    const cl=['--dim','--c1','--c2'],lw=Math.min(170,Math.max(96,W*0.24)),bw=W-lw-46,gh=rows.length*13+10;
    let s='';let y=6;
    cols.forEach((c,ci)=>{s+='<text x="0" y="'+(y+10)+'" font-weight="600">'+c+'</text>';y+=14;
      rows.forEach((r,ri)=>{const v=r[1][ci];s+='<text x="'+(lw-6)+'" y="'+(y+9)+'" text-anchor="end" fill="var(--mute)" font-size="10.5">'+(ri===0?(mode==='r1'?'QwQ-32B-Preview':'Off-policy start'):ri===1?(mode==='r1'?'RL, 10K+ steps':'+ RL'):(mode==='r1'?'Distilled (SFT)':'+ On-policy distil.'))+'</text>';
        s+='<rect x="'+lw+'" y="'+y+'" width="'+(bw*v/100).toFixed(1)+'" height="11" fill="var('+cl[ri]+')" rx="2"/><text x="'+(lw+bw*v/100+4)+'" y="'+(y+9.5)+'" font-size="10.5">'+v.toFixed(1)+'</text>';y+=13});
      y+=8});
    if(mode==='q3'){s+='<text x="0" y="'+(y+10)+'" font-weight="600">GPU-hours for the stage</text>';y+=14;
      const mx=17920;rows.slice(1).forEach((r,ri)=>{s+='<text x="'+(lw-6)+'" y="'+(y+9)+'" text-anchor="end" fill="var(--mute)" font-size="10.5">'+(ri===0?'+ RL':'+ On-policy distil.')+'</text><rect x="'+lw+'" y="'+y+'" width="'+(bw*r[2]/mx).toFixed(1)+'" height="11" fill="var('+cl[ri+1]+')" rx="2"/><text x="'+(lw+bw*r[2]/mx+4)+'" y="'+(y+9.5)+'" font-size="10.5">'+PF.comma(r[2])+'</text>';y+=13});y+=8}
    el.innerHTML=PF.svg(W,y,mode==='r1'?'DeepSeek-R1 Table 16 as bars':'Qwen3 Table 21 as bars',s);
    $('rlFoot').innerHTML=mode==='r1'?'Scores in %, from <a href="'+D.url+'" target="_blank" rel="noopener noreferrer">DeepSeek-R1</a> v2 Table 16 (v1 Table 6 has the same numbers). Both lower rows start from Qwen2.5-32B-Base; the distilled one never ran RL.':'Scores in %, from <a href="'+D.url+'" target="_blank" rel="noopener noreferrer">Qwen3 Table 21</a>. Both lower rows start from the same off-policy-distilled Qwen3-8B; GPU-hours are for the second stage only, and the off-policy stage\'s cost is not reported.';
  }
  $('rlM').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;mode=b.dataset.m;[...$('rlM').children].forEach(x=>x.classList.toggle('on',x===b));draw()});
  RD.onRender(draw);addEventListener('resize',()=>{if($('rl').offsetParent)draw()});draw();
})();
