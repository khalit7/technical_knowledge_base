// ---- Access lab tab (t-acc): global sectors and shared-memory banks for any pattern, from window.MHM ----
(function(){
  const M=window.MHM,D=window.MHD,f=MC.fmtN,$=id=>document.getElementById(id);
  const PRE=[['Contiguous float (thread i reads x[i])',4,4,0],['Contiguous bf16',2,2,0],['Contiguous float4',16,16,0],['Contiguous float, misaligned by 4 bytes',4,4,4],
    ['Float, stride 2',4,8,0],['Field of a 32-byte struct (AoS)',4,32,0],['Column of a row-major [N, 4096] float matrix',4,16384,0],['xyz points, float3 (12-byte stride, one field)',4,12,0]];
  $('acc-gpre').innerHTML=PRE.map((p,i)=>'<option value="'+i+'">'+p[0]+'</option>').join('');
  function g(){
    const w=+$('acc-gw').value,s=Math.max(0,Math.round(+$('acc-gs').value||0)),o=Math.max(0,Math.round(+$('acc-go').value||0));
    const r=M.sectors({w:w,stride:s,off:o});
    const lines=[...new Set(r.list.map(x=>Math.floor(x/4)))].sort((a,b)=>a-b);
    const used=new Set();r.acc.forEach(x=>{for(let b=x.a;b<x.a+w;b++)used.add(b)});
    const show=lines.slice(0,16),el=$('acc-gsvg'),W=RD.width(el),L=W<500?60:76,cw=(W-L-6)/32,ch=Math.max(8,Math.min(13,cw*0.85)),gap=4;
    const sec=new Set(r.list);let svg='';
    show.forEach((ln,ri)=>{const y=4+ri*(ch+gap);svg+=RD.t(L-5,y+ch-1,'+'+f(ln*128,0)+' B',{a:'end',fs:10,fill:'var(--mute)'});
      for(let q=0;q<4;q++){const id=ln*4+q;if(sec.has(id))svg+='<rect x="'+(L+q*8*cw).toFixed(1)+'" y="'+(y-1.5)+'" width="'+(8*cw-1).toFixed(1)+'" height="'+(ch+3)+'" rx="2" style="fill:var(--acc2);stroke:var(--acc)"/>'}
      for(let c=0;c<32;c++){const b0=ln*128+c*4;let u=0;for(let b=b0;b<b0+4;b++)if(used.has(b))u++;
        svg+='<rect x="'+(L+c*cw+1).toFixed(1)+'" y="'+y+'" width="'+Math.max(1,cw-3).toFixed(1)+'" height="'+ch+'" rx="1" style="fill:'+(u?'var(--acc)':sec.has(ln*4+Math.floor(c/8))?'var(--dim)':'var(--soft)')+';opacity:'+(u&&u<4?0.55:1)+'"/>'}});
    el.innerHTML=RD.svg(W,show.length*(ch+gap)+8,svg,'Cache lines touched by one warp');
    const ideal=Math.ceil(r.used/32);
    $('acc-gout').innerHTML=RD.stat('Sectors fetched',r.nSec,f(r.fetched,0)+' bytes')+RD.stat('Bytes wanted',f(r.used,0),'32 lanes &times; '+w)+RD.stat('Useful fraction',f(100*r.eff,1)+'%','')+RD.stat('Against the ideal',f(r.nSec/ideal,2)+'&times;',ideal+' sectors if contiguous and aligned');
    $('acc-gnote').innerHTML=(lines.length>16?'Showing 16 of the '+lines.length+' 128-byte lines touched. ':'')+'Each row is a 128-byte line; outlined groups are the 32-byte sectors fetched; blue words are wanted (pale when only partly), grey fetched but unused. <span class="der">derived</span> from the 32-byte rule.';
  }
  $('acc-gpre').addEventListener('change',e=>{const p=PRE[+e.target.value];$('acc-gw').value=p[1];$('acc-gs').value=p[2];$('acc-go').value=p[3];g()});
  ['acc-gw','acc-gs','acc-go'].forEach(id=>$(id).addEventListener('input',g));
  function s(){
    const mode=$('acc-smode').value;$('acc-sstride').hidden=mode!=='stride';$('acc-scol').hidden=mode!=='col';
    const p=mode==='col'?{mode:'col',layout:$('acc-slay').value,c:Math.max(0,Math.min(31,Math.round(+$('acc-sc').value||0)))}:{mode:'stride',w:+$('acc-sw').value,s:Math.max(0,Math.round(+$('acc-ss').value||0))};
    const r=M.banks(p);const el=$('acc-ssvg'),W=RD.width(el),L=26,bw=(W-L-4)/32,mx=Math.max(4,r.passes),bh=Math.max(4,Math.min(14,170/mx)),H=mx*bh+28;
    let svg=RD.t(2,H-16,'bank',{fs:10,fill:'var(--mute)'});
    for(let b=0;b<32;b++){const x=L+b*bw;if(b%4===0)svg+=RD.t(x+bw/2,H-16,String(b),{a:'middle',fs:9,fill:'var(--mute)'});
      r.bankWords[b].forEach((wd,k)=>{const y=H-24-(k+1)*bh;svg+='<rect x="'+(x+0.5).toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+Math.max(1,bw-1.5).toFixed(1)+'" height="'+(bh-1)+'" style="fill:'+(k<r.ideal?'var(--c1)':'var(--c2)')+'"><title>bank '+b+', word '+wd+', pass '+(k+1)+'</title></rect>'})}
    el.innerHTML=RD.svg(W,H,svg,'Words per shared memory bank');
    $('acc-sout').innerHTML=RD.stat('Passes',r.passes,'the busiest bank')+RD.stat('Ideal passes',r.ideal,'bytes requested / 128')+RD.stat('Conflict',r.degree===1?'none':f(r.degree,r.degree%1?2:0)+'-way','passes / ideal')+RD.stat('Banks used',r.counts.filter(c=>c).length+' of 32','');
    $('acc-snote').textContent=mode==='col'?(p.layout==='plain'?'Row r starts at word 32r, so every element of a column is in the same bank.':p.layout==='pad'?'Row r starts at word 33r: column c of row r is in bank (r + c) mod 32, all different.':'Element (r, c) is stored at column c XOR r: a column visits every bank once, with no wasted memory.')
      :'Lane l reads words '+(p.s*p.w/4)+'l to '+(p.s*p.w/4)+'l + '+(p.w/4-1)+'. For 4-byte elements the conflict degree is gcd(s, 32) (s = 0 is a broadcast).';
  }
  ['acc-smode','acc-sw','acc-ss','acc-slay','acc-sc'].forEach(id=>$(id).addEventListener('input',s));
  $('acc-sm1').textContent=D.m1.tgwide.filter(r=>r.bytes_per_access===16).map(r=>f(r.rate,0)).join(', ');
  function all(){g();s()}
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-acc']=[all];
  addEventListener('resize',()=>{if(!$('t-acc').hidden)all()});
})();
