// ---- TPU and Pallas lab: MXU tiles and padding (section 2), the same matmul on a 128 and a 256 array ----
(function(){
  const T=window.TP,D=T.D,$=T.$;
  const ops=D.roof.ops.map(o=>({name:o.name,b:o.b,m:o.m,k:o.k,n:o.n,count:o.fwd+o.bwd,util:o.mxu_util}));
  ops.push({name:'7B-class MLP up projection, 4,096 tokens (4,096 to 11,008)',b:1,m:4096,k:4096,n:11008,count:32});
  let cur=ops.findIndex(o=>o.name.startsWith('output head'));if(cur<0)cur=0;let side=128;
  const sel=$('tp-mx-op');sel.innerHTML=ops.map((o,i)=>'<option value="'+i+'">'+T.esc(o.name.replace(', plus backward ops of the same shape',' (+ backward)'))+'</option>').join('');sel.value=cur;
  const pad=(v,s)=>Math.ceil(v/s)*s;
  function plan(){const o=ops[cur];const KT=Math.ceil(o.k/side),NT=Math.ceil(o.n/side),tiles=KT*NT;const per=Math.max(1,Math.ceil(tiles/40));
    const steps=Math.ceil(tiles/per)+1;const useful=o.b*o.m*o.k*o.n,issued=o.b*pad(o.m,8)*KT*side*NT*side;return {o,KT,NT,tiles,per,steps,useful,issued}}
  let P=plan();
  function draw(i){
    const el=$('tp-mx-svg');const W=T.width(el);const o=P.o;const narrow=W<520;
    const done=i===0?0:Math.min(P.tiles,i*P.per);const cur0=i===0?-1:(i-1)*P.per;
    // left: the weight matrix k x n, padded to whole tiles
    const lw=narrow?W-10:Math.round(W*0.58)-10;const KP=P.KT*side,NP=P.NT*side;
    const sc=Math.min((lw-50)/NP,(narrow?200:230)/KP);const mw=NP*sc,mh=KP*sc;const ox=40,oy=22;let b='';
    b+=T.tx(ox,14,'weight [k = '+T.fmtN(o.k)+' x n = '+T.fmtN(o.n)+'], padded to '+P.KT+' x '+P.NT+' tiles of '+side,{fs:11});
    b+=T.rect(ox,oy,mw,mh,{fill:'var(--dim)',op:.55});
    for(let t=0;t<P.tiles;t++){const r=Math.floor(t/P.NT),c=t%P.NT;const x=ox+c*side*sc,y=oy+r*side*sc;
      const ku=Math.min(side,o.k-r*side),nu=Math.min(side,o.n-c*side);
      const isCur=t>=cur0&&t<cur0+P.per&&i>0;
      b+=T.rect(x,y,nu*sc,ku*sc,{fill:isCur?'var(--c2)':(t<done?'var(--c1)':'var(--c1)'),op:isCur?.85:(t<done?.55:.18)});}
    if(side*sc>=3){for(let c=0;c<=P.NT;c++)b+='<line x1="'+(ox+c*side*sc)+'" y1="'+oy+'" x2="'+(ox+c*side*sc)+'" y2="'+(oy+mh)+'" stroke="var(--bg)" stroke-width="1"/>';
      for(let r=0;r<=P.KT;r++)b+='<line x1="'+ox+'" y1="'+(oy+r*side*sc)+'" x2="'+(ox+mw)+'" y2="'+(oy+r*side*sc)+'" stroke="var(--bg)" stroke-width="1"/>';}
    b+=T.tx(ox-4,oy+10,'k',{a:'end',fs:11,fill:'var(--mute)'});
    // right: the MXU, showing which part of the array the current tile occupies
    const t0=Math.max(0,cur0);const r0=Math.floor(t0/P.NT),c0=t0%P.NT;const ku=Math.min(side,o.k-r0*side),nu=Math.min(side,o.n-c0*side);
    const ax=narrow?40:Math.round(W*0.58)+30,ay=narrow?oy+mh+46:oy+10,as=narrow?Math.min(170,W-90):Math.min(190,W-ax-20);
    b+=T.tx(ax,ay-8,'MXU '+side+' x '+side+(i>0?': this tile uses '+ku+' x '+nu:''),{fs:11});
    b+=T.rect(ax,ay,as,as,{fill:'var(--dim)',op:.5,st:'var(--line)'});
    if(i>0)b+=T.rect(ax,ay,as*nu/side,as*ku/side,{fill:'var(--c2)',op:.75});
    const g=8;for(let q=1;q<g;q++){b+='<line x1="'+(ax+q*as/g)+'" y1="'+ay+'" x2="'+(ax+q*as/g)+'" y2="'+(ay+as)+'" stroke="var(--bg)" stroke-width="0.6"/>';b+='<line x1="'+ax+'" y1="'+(ay+q*as/g)+'" x2="'+(ax+as)+'" y2="'+(ay+q*as/g)+'" stroke="var(--bg)" stroke-width="0.6"/>'}
    b+='<path d="M'+(ax-30)+' '+(ay+as/2)+' h24" stroke="var(--c3)" stroke-width="2" marker-end="url(#tp-ar)"/>'+T.tx(ax-32,ay+as/2-6,'rows',{fs:10,fill:'var(--c3)'});
    b+='<path d="M'+(ax+as/2)+' '+(ay+as+2)+' v18" stroke="var(--c4)" stroke-width="2" marker-end="url(#tp-ar)"/>'+T.tx(ax+as/2+6,ay+as+16,'sums out',{fs:10,fill:'var(--c4)'});
    const H=Math.max(oy+mh+10,ay+as+30);
    $('tp-mx-svg').innerHTML=T.svg(W,H,'<defs><marker id="tp-ar" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L8 4L0 8z" fill="var(--mute)"/></marker></defs>'+b,'Weight matrix tiled for a '+side+' MXU');
    const util=P.useful/P.issued;const tilesAll=P.tiles*o.b;
    $('tp-mx-cap').innerHTML=i===0?'<b>Before any tile.</b> The weight is cut into '+P.KT+' &times; '+P.NT+' = '+T.fmtN(P.tiles)+' tiles of '+side+' &times; '+side+(o.b>1?', for each of the '+o.b+' heads (batch dimension)':'')+'; the grey margin is padding the hardware multiplies anyway. Press play.'
      :'<b>Tile '+T.fmtN(Math.min(done,P.tiles))+' of '+T.fmtN(P.tiles)+'.</b> The tile is loaded into the array, then all '+T.fmtN(o.m)+' rows of activations stream through it ('+T.fmtN(Math.ceil(o.m/8))+' pushes of 8 rows), each cell doing one multiply-add per row. '+(ku<side||nu<side?'Only '+ku+' &times; '+nu+' of the '+side+' &times; '+side+' cells hold real weights; the rest multiply zeros.':'Every cell holds a real weight.');
    $('tp-mx-cnt').innerHTML=T.stat('tiles per matrix',T.fmtN(P.tiles),o.b>1?T.fmtN(tilesAll)+' over '+o.b+' heads':'')+T.stat('useful multiply-adds',T.fmtE(P.useful),'b m k n')+T.stat('issued',T.fmtE(P.issued),'padded to tiles')+T.stat('MXU utilisation','<b>'+(100*util).toFixed(util<0.1?1:0)+'%</b>',side===128?'switch to 256 to compare':'switch to 128 to compare');
  }
  const A=T.anim({card:'tp-mx-card',ctl:'tp-mx-ctl',n:P.steps,ms:900,label:'Tile',draw});
  T.seg($('tp-mx-side'),[['128','128 x 128 (v4, v5e, v5p)'],['256','256 x 256 (v6e, TPU7x)']],'128',m=>{side=+m;P=plan();A.reset(P.steps)});
  sel.addEventListener('change',()=>{cur=+sel.value;P=plan();A.reset(P.steps)});
  T.onResize(()=>A.redraw());
  window.TP.mxuUtil=(i,s)=>{const o=ops[i];return o.b*o.m*o.k*o.n/(o.b*pad(o.m,8)*pad(o.k,s)*pad(o.n,s))};
  window.TP.mxuOps=ops;
})();
