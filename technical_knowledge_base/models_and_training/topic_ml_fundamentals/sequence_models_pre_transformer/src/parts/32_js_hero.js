// ---- Reading: hero. Eight tokens under five designs: the path from x1 to the output at position 8, and what must run in order ----
// Static annotated diagram, drawn at the measured width. Path lengths and sequential steps follow Vaswani et al. 2017, Table 1, at n = 8.
(function(){
  const $=id=>document.getElementById(id);
  if(!$('hr-lanes'))return;
  const N=8,HL='var(--acc)',DIM='var(--dim)',MU='var(--mute)';
  const LANES=[
    {id:'rnn',nm:'Recurrent network',sub:'1990',st:'path from x<sub>1</sub>: <b>8 hops</b>, each a multiplication by the recurrent Jacobian; in order: <b>8 steps</b>'},
    {id:'lstm',nm:'LSTM, GRU',sub:'1997, 2000, 2014',st:'path: still <b>8 hops</b>, but along the cell lane each hop only multiplies by a forget gate; in order: <b>8 steps</b>'},
    {id:'att',nm:'RNN with attention',sub:'2014',st:'path: <b>2 hops</b> (x<sub>1</sub> to its state, then read directly); in order: still <b>8 steps</b> to build the states'},
    {id:'cnn',nm:'Dilated causal convolution',sub:'2016',st:'path: <b>3 layers</b> = log<sub>2</sub> 8 (dilations 1, 2, 4); in order: <b>none</b>, every position at once'},
    {id:'tf',nm:'Self-attention (transformer)',sub:'2017',st:'path: <b>1 hop</b>, every position reads every earlier one; in order: <b>none</b>'}];
  const node=(x,y,r,on,lab)=>'<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+r+'" fill="'+(on?HL:'var(--bg)')+'" stroke="'+(on?HL:MU)+'" stroke-width="1.3"/>'+(lab?'<text x="'+x.toFixed(1)+'" y="'+(y+r+11).toFixed(1)+'" font-size="11" text-anchor="middle" fill="'+MU+'">'+lab+'</text>':'');
  const box=(x,y,w,h,on)=>'<rect x="'+(x-w/2).toFixed(1)+'" y="'+(y-h/2).toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+h+'" rx="3" fill="'+(on?'color-mix(in srgb,var(--acc) 22%,var(--bg))':'var(--soft)')+'" stroke="'+(on?HL:MU)+'" stroke-width="1.3"/>';
  const ln=(x1,y1,x2,y2,on,w)=>'<line x1="'+x1.toFixed(1)+'" y1="'+y1.toFixed(1)+'" x2="'+x2.toFixed(1)+'" y2="'+y2.toFixed(1)+'" stroke="'+(on?HL:DIM)+'" stroke-width="'+(on?(w||2.2):1.1)+'"/>';
  function lane(id,W){
    const ml=14,mr=14,X=i=>ml+(W-ml-mr)*(i+.5)/N,r=Math.max(4,Math.min(7,W/80)),bw=Math.min(26,(W-ml-mr)/N*.62);
    let s='',H;
    if(id==='rnn'||id==='lstm'){
      const yi=id==='lstm'?78:58,yh=id==='lstm'?42:22,yc=12;H=yi+r+16;
      for(let i=0;i<N;i++){s+=ln(X(i),yi-r,X(i),yh+8,i===0);if(i<N-1)s+=ln(X(i)+bw/2,yh,X(i+1)-bw/2,yh,id==='rnn')}
      if(id==='lstm'){s+=ln(X(0),yc,X(N-1)+bw/2+6,yc,true,3.2);for(let i=0;i<N;i++){s+=ln(X(i),yc,X(i),yh-8,i===0);s+='<text x="'+X(i).toFixed(1)+'" y="'+(yc+4)+'" font-size="11" text-anchor="middle" fill="'+HL+'" font-weight="700">'+(i?'+':'')+'</text>'}
        s+='<text x="'+(X(N-1)+bw/2+8).toFixed(1)+'" y="'+(yc+4)+'" font-size="11" fill="'+HL+'">C</text>'}
      for(let i=0;i<N;i++){s+=box(X(i),yh,bw,16,id==='rnn'||i===0||i===N-1);s+=node(X(i),yi,r,i===0,i===0?'x₁':i===N-1?'x₈':'')}
      s+='<text x="'+(X(N-1)+bw/2+2).toFixed(1)+'" y="'+(yh-11)+'" font-size="11" text-anchor="end" fill="'+HL+'">out</text>';
    }else if(id==='att'){
      const yi=78,yh=56,yo=12;H=yi+r+16;const xo=X(N-1);
      for(let i=0;i<N;i++){s+=ln(X(i),yi-r,X(i),yh+8,i===0);if(i<N-1)s+=ln(X(i)+bw/2,yh,X(i+1)-bw/2,yh,false);s+=ln(X(i),yh-8,xo,yo+r,i===0,2.2)}
      for(let i=0;i<N;i++){s+=box(X(i),yh,bw,16,i===0);s+=node(X(i),yi,r,i===0,i===0?'x₁':i===N-1?'x₈':'')}
      s+=node(xo,yo,r+1,true,'');s+='<text x="'+(xo-r-5).toFixed(1)+'" y="'+(yo+4)+'" font-size="11" text-anchor="end" fill="'+HL+'">out (reads every state)</text>';
    }else if(id==='cnn'){
      const rows=4,rh=24,Y=l=>12+(rows-1-l)*rh;H=Y(0)+r+16;
      // tree back from the top output at position 7 (0-based): layer l has dilation 2^(l-1)
      const reach=[new Set([N-1])];for(let l=rows-1;l>=1;l--){const d=2**(l-1),nx=new Set();reach[reach.length-1].forEach(t=>{nx.add(t);if(t-d>=0)nx.add(t-d)});reach.push(nx)}
      for(let l=rows-1;l>=1;l--){const d=2**(l-1),set=reach[rows-1-l];set.forEach(t=>{[t,t-d].forEach(u=>{if(u>=0)s+=ln(X(t),Y(l)+r,X(u),Y(l-1)-r,false)})})}
      // the path from x1: 0 -> 1 (d=1) -> 3 (d=2) -> 7 (d=4)
      const P=[0,1,3,7];for(let l=1;l<rows;l++)s+=ln(X(P[l-1]),Y(l-1)-r,X(P[l]),Y(l)+r,true,2.4);
      for(let l=0;l<rows;l++)for(let i=0;i<N;i++){s+=node(X(i),Y(l),r,P[l]===i,l===0?(i===0?'x₁':i===N-1?'x₈':''):'')}
      s+='<text x="'+(X(N-1)-r-5).toFixed(1)+'" y="'+(Y(rows-1)+4)+'" font-size="11" text-anchor="end" fill="'+HL+'">out</text>';
    }else{
      const yi=58,yo=12;H=yi+r+16;
      for(let i=0;i<N;i++){s+=ln(X(i),yi-r,X(N-1),yo+r,i===0,2.4)}
      for(let i=0;i<N;i++)s+=node(X(i),yi,r,i===0,i===0?'x₁':i===N-1?'x₈':'');
      s+=node(X(N-1),yo,r+1,true,'');s+='<text x="'+(X(N-1)-r-5).toFixed(1)+'" y="'+(yo+4)+'" font-size="11" text-anchor="end" fill="'+HL+'">out</text>';
    }
    return RD.svg(W,H,s,id+' lane');
  }
  function draw(){
    const el=$('hr-lanes'),W=RD.width(el);
    el.innerHTML=LANES.map(L=>'<div class="hr-lane"><div class="hr-nm">'+L.nm+' <span>'+L.sub+'</span></div>'+lane(L.id,Math.min(W,760))+'<div class="hr-st">'+L.st+'</div></div>').join('');
  }
  RD.onRender(draw);RD.onResize(draw);draw();
})();
