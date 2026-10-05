// ---- Reading: binary entropy (s2), Huffman build (s3), one stream two codes (s6) ----
(function(){
  const T=RD.t,f3=v=>v.toFixed(3);
  // binary entropy curve
  const hb=document.getElementById('it-hb');
  function drawHb(){if(!hb)return;const W=Math.min(RD.width(hb),640),H=190,l=36,r=12,t=12,b=30,pw=W-l-r,ph=H-t-b;
    const X=x=>l+x*pw,Y=y=>t+(1-y)*ph;let o='';
    for(let k=0;k<=4;k++){const y=k/4;o+='<line x1="'+l+'" y1="'+Y(y)+'" x2="'+(W-r)+'" y2="'+Y(y)+'" stroke="var(--line)"/>'+T(l-5,Y(y)+4,y.toFixed(2),{a:'end',fs:10.5,fill:'var(--mute)'})}
    for(let k=0;k<=4;k++){const x=k/4;o+=T(X(x),H-12,x.toFixed(2),{a:'middle',fs:10.5,fill:'var(--mute)'})}
    let d='';for(let i=0;i<=200;i++){const x=i/200,y=IT.H([x,1-x],2);d+=(i?'L':'M')+X(x).toFixed(1)+','+Y(y).toFixed(1)}
    o+='<path d="'+d+'" fill="none" stroke="var(--c4)" stroke-width="2.2"/>';
    [[0.9,'0.9 coin: 0.469'],[0.5,'fair: 1 bit']].forEach(([x,s])=>{const y=IT.H([x,1-x],2);o+='<circle cx="'+X(x)+'" cy="'+Y(y)+'" r="4" fill="var(--c2)"/>'+T(X(x)+(x>0.6?-6:6),Y(y)+(x>0.6?-6:16),s,{a:x>0.6?'end':'start',fs:11,w:600})});
    o+=T(l+pw/2,H-1,'θ, probability of heads',{a:'middle',fs:10.5,fill:'var(--mute)'});
    hb.innerHTML=RD.svg(W,H,o,'Binary entropy in bits against the probability of heads')}
  RD.onRender(drawHb);RD.onResize(drawHb);drawHb();

  // Huffman on the tiny model's bet
  const P=[0.665,0.245,0.090],NM=['cat','dog','sat'];
  const hf=document.getElementById('it-huf');
  const hcap=[
    ['Three leaves','The tiny model\'s bet: cat 0.665, dog 0.245, sat 0.090. Ideal code lengths are −log₂ q: 0.588, 2.031 and 3.473 bits, not whole numbers.'],
    ['Merge the two least likely','dog (0.245) and sat (0.090) are the two smallest. Join them under one node of weight 0.335.'],
    ['Merge again','Two items are left: cat (0.665) and the dog-sat node (0.335). Join them: the root, weight 1.'],
    ['Read the codewords','Label every left branch 0 and every right branch 1, and read from the root down: cat 0, dog 10, sat 11. No codeword starts another, and the Kraft sum is 2⁻¹ + 2⁻² + 2⁻² = 1: no budget wasted.'],
    ['The cost','Average length 0.665 × 1 + 0.245 × 2 + 0.090 × 2 = 1.335 bits per word, against the entropy 1.201. The 0.134 bits are the price of whole bits: cat deserves 0.588 bits and gets 1.']];
  function drawHuf(i){if(!hf)return;const W=Math.min(RD.width(hf),620),H=210;let o='';
    const lx=[W*0.18,W*0.5,W*0.82],ly=170,nodeY1=105,nodeY2=40;
    const dsx=(lx[1]+lx[2])/2;
    const node=(x,y,w,lab,col)=>'<rect x="'+(x-34)+'" y="'+(y-15)+'" width="68" height="30" rx="7" fill="var(--soft)" stroke="'+col+'" stroke-width="1.8"/>'+T(x,y-1,lab,{a:'middle',fs:12,w:600})+T(x,y+11,w,{a:'middle',fs:10.5,fill:'var(--mute)'});
    const edge=(x1,y1,x2,y2,b)=>'<line x1="'+x1+'" y1="'+(y1+15)+'" x2="'+x2+'" y2="'+(y2-15)+'" stroke="var(--mute)" stroke-width="1.5"/>'+(i>=3?T((x1+x2)/2+(b==='0'?-8:8),(y1+y2)/2+4,b,{a:'middle',fs:12,w:700,fill:'var(--c2)'}):'');
    if(i>=1)o+=edge(dsx,nodeY1,lx[1],ly,'0')+edge(dsx,nodeY1,lx[2],ly,'1');
    if(i>=2)o+=edge((lx[0]+dsx)/2,nodeY2,lx[0],ly,'0')+edge((lx[0]+dsx)/2,nodeY2,dsx,nodeY1,'1');
    if(i>=2)o+=node((lx[0]+dsx)/2,nodeY2,'1.000','root','var(--ink)');
    if(i>=1)o+=node(dsx,nodeY1,'0.335','dog+sat','var(--c4)');
    const code=['0','10','11'];
    for(let k=0;k<3;k++){o+=node(lx[k],ly,f3(P[k]),NM[k],(i===1&&k>0)||(i===2&&k===0)?'var(--c2)':'var(--c1)');
      if(i>=3)o+=T(lx[k],ly+30,code[k],{a:'middle',fs:13,w:700,fill:'var(--c2)'})}
    hf.innerHTML=RD.svg(W,H+(i>=3?14:0),o,'Huffman tree for the tiny model bet');
    document.getElementById('it-huf-cap').innerHTML='<div class="t">Step '+(i+1)+' of 5: '+hcap[i][0]+'</div><p>'+hcap[i][1]+'</p>';
    document.getElementById('it-huf-cnt').innerHTML=RD.stat('entropy H','1.201 bits','')+RD.stat('Huffman length L',i>=4?'1.335 bits':'…','')+RD.stat('L − H',i>=4?'0.134 bits':'…','less than 1, as the theorem promises');}
  if(hf)RD.anim({card:'it-huf-card',ctl:'it-huf-ctl',n:5,draw:drawHuf,ms:2200,label:'Huffman step'});

  // one stream, two codes
  const SEQ='ABACABADABACABDA',CP={A:'0',B:'10',C:'110',D:'111'},CQ={A:'110',B:'0',C:'10',D:'111'};
  const kl=document.getElementById('it-kl');
  function drawKl(i){if(!kl)return;const W=RD.width(kl),n=i;// symbols encoded so far
    let bitsP=0,bitsQ=0;for(let k=0;k<n;k++){bitsP+=CP[SEQ[k]].length;bitsQ+=CQ[SEQ[k]].length}
    const bw=Math.max(4,Math.min(16,(W-90)/38)),rowH=22,lab=82;let o='';
    // symbol row
    const sw=Math.max(14,Math.min(30,(W-lab)/16));
    o+=T(0,16,'symbols',{fs:11,fill:'var(--mute)'});
    for(let k=0;k<16;k++){const x=lab+k*sw;o+='<rect x="'+x+'" y="4" width="'+(sw-2)+'" height="18" rx="3" fill="'+(k<n?'var(--acc2)':'var(--soft)')+'" stroke="'+(k===n-1?'var(--acc)':'var(--line)')+'"/>'+T(x+sw/2-1,17,SEQ[k],{a:'middle',fs:11,w:k<n?600:400,fill:k<n?'var(--ink)':'var(--mute)'})}
    const strip=(y,code,col,name)=>{let s=T(0,y+14,name,{fs:11,fill:'var(--mute)'}),x=lab,alt=0;
      for(let k=0;k<n;k++){const c=code[SEQ[k]];for(let j=0;j<c.length;j++){s+='<rect x="'+x+'" y="'+y+'" width="'+(bw-1)+'" height="'+(rowH-4)+'" rx="2" fill="'+col+'" opacity="'+(alt?0.6:1)+'"/>'+(bw>=10?T(x+bw/2-0.5,y+13,c[j],{a:'middle',fs:10,fill:'var(--bg)'}):'');x+=bw}alt^=1}
      return s};
    o+=strip(34,CP,'var(--c3)','code for p');o+=strip(34+rowH+8,CQ,'var(--c2)','code for q');
    const H=34+2*rowH+16;
    kl.innerHTML=RD.svg(W,H,o,'Bits used by the code for p and by the code for q on the same symbols');
    const cap=n===0?['Nothing encoded yet','The same 16 symbols will go through both codes. Shades alternate per symbol so you can see each codeword.']:
      n<16?['After '+n+' symbol'+(n>1?'s':''),'Last symbol '+SEQ[n-1]+': '+CP[SEQ[n-1]].length+' bit'+(CP[SEQ[n-1]].length>1?'s':'')+' with the code for p ('+CP[SEQ[n-1]]+'), '+CQ[SEQ[n-1]].length+' with the code for q ('+CQ[SEQ[n-1]]+'). The wrong code saves bits on B and loses them on A, the most common symbol.']:
      ['All 16 symbols','28 bits against 38: 1.75 against 2.375 bits per symbol. The gap, 0.625 bits per symbol, is exactly D_KL(p ‖ q), because the 16 symbols occur in exactly the proportions of p and every probability is a power of one half.'];
    document.getElementById('it-kl-cap').innerHTML='<div class="t">'+cap[0]+'</div><p>'+cap[1]+'</p>';
    const per=(b)=>n?(b/n).toFixed(3):'…';
    document.getElementById('it-kl-cnt').innerHTML=RD.stat('symbols',n+' / 16','')+RD.stat('bits, code for p',bitsP,per(bitsP)+' per symbol; H(p) = 1.75')+RD.stat('bits, code for q',bitsQ,per(bitsQ)+' per symbol; H(p, q) = 2.375')+RD.stat('extra per symbol',n?((bitsQ-bitsP)/n).toFixed(3):'…','D_KL(p ‖ q) = 0.625')}
  if(kl){const a=RD.anim({card:'it-kl-card',ctl:'it-kl-ctl',n:17,draw:drawKl,ms:700,label:'Symbols encoded'});RD.onResize(()=>a.redraw())}
})();
