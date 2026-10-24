// ---- Reading hero: the first 8 pairs of the real batch as a cosine matrix, BERT before and after SimCSE ----
(function(){
  const el=document.getElementById('hr-svg');if(!el||!window.CSD)return;
  const D=CSD.rb,N0=D.s1.length,n=8,$=id=>document.getElementById(id);
  let m='bert';
  const cos=(i,j)=>D.M[m][i*N0+j]/1000;
  function loss(tau){let L=0;for(let i=0;i<n;i++){let mx=-1e9;for(let j=0;j<n;j++)mx=Math.max(mx,cos(i,j)/tau);
    let s=0;for(let j=0;j<n;j++)s+=Math.exp(cos(i,j)/tau-mx);L+=mx+Math.log(s)-cos(i,i)/tau}return L/n}
  function draw(){
    const W=Math.min(RD.width(el),460),L=46,T=30,c=Math.floor((W-L-4)/n),S=c*n,H=T+S+6;
    let h='<text x="'+(L+S/2)+'" y="11" text-anchor="middle" font-size="11" fill="var(--mute)">candidate (the partner sentences)</text>';
    for(let k=0;k<n;k++){h+='<text x="'+(L+k*c+c/2)+'" y="'+(T-5)+'" text-anchor="middle" font-size="11" fill="var(--mute)">'+(k+1)+'</text>';
      h+='<text x="'+(L-6)+'" y="'+(T+k*c+c/2+4)+'" text-anchor="end" font-size="11" fill="var(--mute)">'+(k+1)+'</text>'}
    h+='<text x="10" y="'+(T+S/2)+'" font-size="11" fill="var(--mute)" text-anchor="middle" transform="rotate(-90 10 '+(T+S/2)+')">anchor</text>';
    for(let i=0;i<n;i++)for(let j=0;j<n;j++){const v=cos(i,j),a=Math.max(0,Math.min(1,(v-0.1)/0.9));
      h+='<rect x="'+(L+j*c)+'" y="'+(T+i*c)+'" width="'+(c-1)+'" height="'+(c-1)+'" fill="var(--c1)" fill-opacity="'+(0.06+0.86*a).toFixed(3)+'"><title>anchor '+(i+1)+', candidate '+(j+1)+': cosine '+v.toFixed(3)+'</title></rect>';
      if(c>=30)h+='<text x="'+(L+j*c+c/2)+'" y="'+(T+i*c+c/2+4)+'" text-anchor="middle" font-size="11" fill="'+(a>0.6?'var(--bg)':'var(--ink)')+'">'+v.toFixed(2).replace(/^0/,'')+'</text>';
      if(i===j)h+='<rect x="'+(L+j*c+1)+'" y="'+(T+i*c+1)+'" width="'+(c-3)+'" height="'+(c-3)+'" fill="none" stroke="var(--c2)" stroke-width="2.4"/>'}
    el.innerHTML=PF.svg(W,H,'Cosine matrix of eight real sentence pairs, '+(m==='bert'?'BERT':'after SimCSE'),h);
    let pos=0,neg=0;for(let i=0;i<n;i++)for(let j=0;j<n;j++){if(i===j)pos+=cos(i,j);else neg+=cos(i,j)}
    pos/=n;neg/=n*(n-1);
    $('hr-cnt').innerHTML=RD.stat('positives (diagonal)',pos.toFixed(2),'mean cosine, these 8')+RD.stat('negatives (off-diagonal)',neg.toFixed(2),'mean cosine, these 8')+
      RD.stat('InfoNCE at τ = 0.05',loss(0.05).toFixed(3),'nats; chance ln 8 = '+Math.log(8).toFixed(2));
  }
  PF.seg($('hr-m'),'m',v=>{m=v;draw()});
  $('hr-pairs').innerHTML='<ol style="margin:4px 0;padding-left:22px">'+[...Array(n).keys()].map(i=>'<li>'+RD.esc(D.s1[i])+' <span class="mute">/</span> '+RD.esc(D.s2[i])+'</li>').join('')+'</ol>';
  RD.onRender(draw);RD.onResize(draw);draw();
})();
