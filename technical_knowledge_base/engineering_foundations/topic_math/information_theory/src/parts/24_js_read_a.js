// ---- Reading: binary entropy (section 1), Huffman build (section 2); the two-code stream of section 3 is now the 3D stage 28_js_sc_3kl.js ----
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
    document.getElementById('it-huf-cnt').innerHTML=RD.stat('entropy H','1.201 bits','')+RD.stat('Huffman length L',i>=4?'1.335 bits':'…','')+RD.stat('L − H',i>=4?'0.134 bits':'…','less than 1, as the theorem promises');}
  if(hf)RD.anim({card:'it-huf-card',ctl:'it-huf-ctl',n:5,draw:drawHuf,ms:4200,label:'Huffman step',list:'sx-huf'});

})();
