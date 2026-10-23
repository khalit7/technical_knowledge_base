// ---- Reading section 10: the same 8 tokens through one attention layer (growing KV cache) and one recurrent layer (fixed state) ----
// Shapes from the Qwen3-Next-80B-A3B config: attention layer 2 KV heads x 256 (1,024 numbers per token),
// Gated DeltaNet layer 32 value heads x 128 x 128 (524,288 numbers). Areas are to scale: one cache cell = 1,024 numbers.
(function(){
  const $=id=>document.getElementById(id);
  if(!window.RD||!$('rd-ssm'))return;
  const TOK=['Once','upon','a','time',',','a','little','girl'];
  const PER=1024,STATE=32*128*128,CROSS=STATE/PER;
  let mode='attn';
  const svgEl=$('rd-ssm-svg'),cap=$('rd-ssm-cap'),cnt=$('rd-ssm-cnt'),chart=$('rd-ssm-chart');
  const f=n=>n.toLocaleString('en-GB');
  const bytes=n=>{const b=n*2;return b>=1073741824?(b/1073741824).toFixed(1).replace(/\.0$/,'')+' GiB':b>=1048576?(b/1048576).toFixed(1).replace(/\.0$/,'')+' MiB':(b/1024).toFixed(0)+' KiB'};
  function draw(i){
    const W=Math.min(760,RD.width(svgEl)),pad=6,bw=(W-2*pad)/8,tw=bw-4;
    const cell=Math.max(7,Math.min(11,Math.floor((W-40)/Math.sqrt(CROSS)))),side=cell*Math.sqrt(CROSS);
    const yT=8,hT=26,yA=yT+hT+22,H=yA+side+28;
    let b='';
    const tx=t=>pad+t*bw+2;
    TOK.forEach((s,t)=>{const cur=t===i,done=t<=i;
      b+='<rect x="'+tx(t)+'" y="'+yT+'" width="'+tw+'" height="'+hT+'" rx="4" fill="'+(cur?'var(--acc2)':'var(--soft)')+'" stroke="'+(cur?'var(--acc)':'var(--line)')+'" opacity="'+(done?1:.4)+'"/>';
      b+=RD.t(tx(t)+tw/2,yT+17,RD.esc(s),{a:'middle',fs:11});
    });
    const sx=(W-side)/2,sy=yA;
    // the cache: one cell per token, laid left to right inside the state's footprint
    const cx=k=>sx+(k%Math.floor(side/cell))*cell,cy=k=>sy+side-cell-Math.floor(k/Math.floor(side/cell))*cell;
    if(mode==='attn'){
      b+='<rect x="'+sx+'" y="'+sy+'" width="'+side+'" height="'+side+'" fill="none" stroke="var(--mute)" stroke-dasharray="4 3"/>';
      b+=RD.t(sx+side/2,sy+side/2,'a recurrent layer\'s fixed state, to scale',{a:'middle',fs:11,fill:'var(--mute)'});
      for(let k=0;k<=i;k++)b+='<rect x="'+cx(k)+'" y="'+cy(k)+'" width="'+(cell-1)+'" height="'+(cell-1)+'" fill="'+(k===i?'var(--c2)':'var(--acc)')+'"/>';
      const qx=tx(i)+tw/2,qy=yT+hT+1;
      for(let k=0;k<=i;k++)b+='<line x1="'+qx+'" y1="'+qy+'" x2="'+(cx(k)+cell/2)+'" y2="'+cy(k)+'" stroke="var(--acc)" stroke-opacity=".45"/>';
      b+=RD.t(sx,sy+side+16,'cache: '+(i+1)+' cell'+(i?'s':'')+' of 1,024 numbers',{fs:11});
    }else{
      const op=(0.25+0.6*((i+1)/TOK.length)).toFixed(2);
      b+='<rect x="'+sx+'" y="'+sy+'" width="'+side+'" height="'+side+'" fill="var(--c4)" fill-opacity="'+op+'" stroke="var(--c4)"/>';
      for(let k=0;k<=i;k++)b+='<rect x="'+cx(k)+'" y="'+cy(k)+'" width="'+(cell-1)+'" height="'+(cell-1)+'" fill="none" stroke="var(--ink)" stroke-dasharray="2 2" stroke-opacity=".6"/>';
      const qx=tx(i)+tw/2,qy=yT+hT+1;
      b+='<line x1="'+qx+'" y1="'+qy+'" x2="'+(sx+side/2)+'" y2="'+sy+'" stroke="var(--c4)" stroke-width="2"/>';
      b+=RD.t(sx+side/2,sy+side/2,'state S (32 heads of 128 &times; 128)',{a:'middle',fs:11});
      b+=RD.t(sx+side/2,sy+side/2+15,'overwritten in place, token '+(i+1),{a:'middle',fs:11});
      b+=RD.t(sx,sy+side+16,'dashed: the cache attention would hold now',{fs:11});
    }
    svgEl.innerHTML=RD.svg(W,H,b,mode==='attn'?'Attention: one cache cell per token, every cell read':'Recurrent layer: one fixed state updated per token');
    const k=i+1;
    const c=mode==='attn'?
      ['Token '+k+': append its key and value, read them all','Its key and value (2 KV heads &times; 256, for keys and for values: 1,024 numbers) join the cache; its query then scores all '+k+' cached keys. Memory and reads both grow with every token: at 128K tokens this one layer holds '+bytes(PER*131072)+' in BF16.'+(k===TOK.length?' The dashed square is what the recurrent layer holds from the first token: bigger than this cache until token '+f(CROSS)+'.':'')]
     :['Token '+k+': decay, erase, write, read','The state fades a little (the gate &alpha;), what it stored under this token\'s key is erased and the new value written (the delta rule, strength &beta;), and the output is read from the state. The state never grows: '+f(STATE)+' numbers ('+bytes(STATE)+' in BF16) at token 1 and at token 1 million.'+(k===TOK.length?' What was not written into it cannot be recovered later: exact recall is the price.':'')];
    cap.innerHTML='<div class="t">Step '+k+' of '+TOK.length+': '+c[0]+'</div><p>'+c[1]+'</p>';
    cnt.innerHTML=RD.stat('Tokens seen',String(k),'')+
      RD.stat('Numbers held',mode==='attn'?f(PER*k):f(STATE),mode==='attn'?'grows by 1,024 a token':'fixed')+
      RD.stat('Read this step',mode==='attn'?f(PER*k):f(STATE),mode==='attn'?k+' cache entries':'the whole state')+
      RD.stat('At 128K tokens',mode==='attn'?bytes(PER*131072):bytes(STATE),'per layer, BF16');
  }
  function drawChart(){
    const W=Math.min(760,RD.width(chart)),H=170,l=46,rr=24,t=10,bt=34;
    const X=T=>l+(W-l-rr)*Math.log2(T)/18,Y=n=>t+(H-t-bt)*(1-(Math.log2(n)-10)/(28-10));
    let b='';
    [1,64,512,4096,32768,262144].forEach(T=>{b+='<line x1="'+X(T)+'" x2="'+X(T)+'" y1="'+t+'" y2="'+(H-bt)+'" stroke="var(--line)"/>';
      if(W>420||[1,512,32768,262144].includes(T))b+=RD.t(X(T),H-bt+14,T>=1024?(T/1024)+'K':String(T),{a:'middle',fs:11})});
    [1024,32768,1048576,33554432].forEach(n=>{b+='<line x1="'+l+'" x2="'+(W-rr)+'" y1="'+Y(n)+'" y2="'+Y(n)+'" stroke="var(--line)"/>';
      b+=RD.t(l-4,Y(n)+4,n>=1048576?(n/1048576)+'M':(n/1024)+'K',{a:'end',fs:11})});
    b+='<line x1="'+X(1)+'" y1="'+Y(PER)+'" x2="'+X(262144)+'" y2="'+Y(PER*262144)+'" stroke="var(--acc)" stroke-width="2"/>';
    b+='<line x1="'+X(1)+'" y1="'+Y(STATE)+'" x2="'+X(262144)+'" y2="'+Y(STATE)+'" stroke="var(--c4)" stroke-width="2"/>';
    b+='<circle cx="'+X(CROSS)+'" cy="'+Y(STATE)+'" r="4" fill="var(--bad)"/>';
    b+=RD.t(X(CROSS)+6,Y(STATE)+15,'equal at '+CROSS+' tokens',{fs:11,fill:'var(--bad)'});
    b+=RD.t(l+(W-l-rr)/2,H-4,'context length (tokens, log scale)',{a:'middle',fs:11,fill:'var(--mute)'});
    chart.innerHTML=RD.svg(W,H,b,'Numbers held by one layer against context: attention grows, the recurrent state is flat')+
      '<div class="leg"><span style="--sw:var(--acc)">attention layer (KV cache)</span><span style="--sw:var(--c4)">recurrent layer (fixed state)</span></div>';
  }
  const an=RD.anim({card:'rd-ssm',ctl:'rd-ssm-ctl',n:TOK.length,draw,ms:1500,label:'Token'});
  RD.seg($('rd-ssm-mode'),m=>{mode=m;an.reset(TOK.length)});
  RD.onRender(drawChart);RD.onResize(()=>{an.redraw();drawChart()});
  drawChart();
})();
