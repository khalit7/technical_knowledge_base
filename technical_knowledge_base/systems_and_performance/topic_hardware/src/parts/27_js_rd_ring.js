// ---- Reading 6: ring all-reduce of the 8B's bf16 gradients over 8 GPUs, inside one NVLink server vs across 8 servers on InfiniBand ----
(function(){
  const box=document.getElementById('rd-ring-svg');if(!box||!window.RDH)return;
  const A0=RDH.ar,N=A0.G,S=A0.S,bw={nvlink:A0.links.nvlink,ib:A0.links.ib};
  const name={nvlink:'NVLink 4, 450 GB/s',ib:'InfiniBand NDR, 50 GB/s'};
  let mode='nvlink';
  const NS=2*(N-1)+1;               // step 0 = start, 1..7 reduce-scatter, 8..14 all-gather
  const per=m=>S/N/bw[m];           // seconds per ring step
  function state(k){const c=[...Array(N)].map(()=>Array(N).fill(1));let send=[];
    for(let s=0;s<k;s++){send=[];
      if(s<N-1){const nx=c.map(r=>r.slice());for(let i=0;i<N;i++){const ch=((i-s)%N+N)%N,j=(i+1)%N;nx[j][ch]=c[j][ch]+c[i][ch];send.push([i,ch])}for(let i=0;i<N;i++)c[i]=nx[i]}
      else{const t=s-(N-1);for(let i=0;i<N;i++){const ch=((i+1-t)%N+N)%N,j=(i+1)%N;c[j][ch]=N;send.push([i,ch])}}}
    return {c,send}}
  const ms=x=>x*1e3>=100?(x*1e3).toFixed(0):(x*1e3).toFixed(1);
  function draw(k){
    const w=RD.width(box),H=Math.min(420,Math.max(330,w*0.62)),cx=w/2,cy=H/2-8,R=Math.min(w/2-44,H/2-50);
    const st=state(k),bwx=Math.min(64,w/6.5),bh=bwx*0.55,cs=bwx/4;
    let b='';
    if(mode==='nvlink')b+='<rect x="'+(cx-R-bwx/2-10)+'" y="'+(cy-R-bh/2-22)+'" width="'+(2*R+bwx+20)+'" height="'+(2*R+bh+44)+'" rx="12" fill="none" stroke="var(--mute)" stroke-dasharray="5 4"/>'+RD.t(cx,cy+R+bh/2+16,'one server: 8 GPUs on NVSwitch',{a:'middle',fs:11,fill:'var(--mute)'});
    const pos=[...Array(N)].map((_,i)=>{const a=-Math.PI/2+2*Math.PI*i/N;return [cx+R*Math.cos(a),cy+R*Math.sin(a)]});
    // links
    const sending=new Map(st.send.map(x=>[x[0],x[1]]));
    for(let i=0;i<N;i++){const [x1,y1]=pos[i],[x2,y2]=pos[(i+1)%N];const on=k>0&&sending.has(i);
      b+='<line x1="'+x1.toFixed(1)+'" y1="'+y1.toFixed(1)+'" x2="'+x2.toFixed(1)+'" y2="'+y2.toFixed(1)+'" stroke="'+(on?(mode==='ib'?'var(--c2)':'var(--c3)'):'var(--line)')+'" stroke-width="'+(on?3:1.5)+'"'+(mode==='ib'?' stroke-dasharray="6 4"':'')+'/>';
      if(on){const mx=(x1+x2)/2,my=(y1+y2)/2;b+='<circle cx="'+mx.toFixed(1)+'" cy="'+my.toFixed(1)+'" r="9" fill="var(--bg)" stroke="var(--ink)" stroke-width=".8"/>'+RD.t(mx,my+4,String(sending.get(i)+1),{a:'middle',fs:10,w:600})}}
    // GPUs with their 8 chunks: shade = how many GPUs' gradients are summed into that chunk
    for(let i=0;i<N;i++){const [x,y]=pos[i],x0=x-bwx/2,y0=y-bh/2;
      if(mode==='ib')b+='<rect x="'+(x0-5)+'" y="'+(y0-17)+'" width="'+(bwx+10)+'" height="'+(bh+22)+'" rx="6" fill="none" stroke="var(--mute)" stroke-dasharray="3 3"/>'+RD.t(x,y0-6,'server '+(i+1),{a:'middle',fs:9.5,fill:'var(--mute)'});
      else b+=RD.t(x,y0-4,'GPU '+(i+1),{a:'middle',fs:10,fill:'var(--mute)'});
      for(let c=0;c<N;c++){const v=st.c[i][c],xx=x0+(c%4)*cs,yy=y0+Math.floor(c/4)*(bh/2);
        b+='<rect x="'+xx.toFixed(1)+'" y="'+yy.toFixed(1)+'" width="'+(cs-1.5).toFixed(1)+'" height="'+(bh/2-1.5).toFixed(1)+'" fill="'+(v===N?'var(--good)':'var(--c1)')+'" fill-opacity="'+(v===N?1:(0.15+0.75*(v-1)/(N-1))).toFixed(2)+'" stroke="var(--line)" stroke-width=".5"/>'}}
    // time bar, both links to scale
    const tot={nvlink:per('nvlink')*(NS-1),ib:per('ib')*(NS-1)},yb=H-8;
    b+=RD.t(w/2,cy+4,(k===0?'start':k<N?'reduce-scatter '+k+'/7':'all-gather '+(k-(N-1))+'/7'),{a:'middle',fs:12,w:600});
    box.innerHTML=RD.svg(w,H,b,'Eight GPUs in a ring, each holding eight gradient chunks; chunks are summed around the ring, then the sums are passed around');
    const t=k*per(mode),done=k===NS-1;
    let cap='<div class="t">'+(k===0?'Start':k<N?'Reduce-scatter, step '+k+' of 7':'All-gather, step '+(k-N+1)+' of 7')+': '+ms(t)+' ms on '+name[mode]+'</div>';
    if(k===0)cap+='<p>Each GPU holds its own 16.06 GB of gradients, cut into 8 chunks of 2.0 GB (pale squares: one GPU\'s contribution). Every step, every GPU sends one chunk to its right-hand neighbour at the same time, so all links are busy at once.</p>';
    else if(k<N-1)cap+='<p>Each GPU adds the chunk it receives to its own copy and passes that partial sum on next step. Darker squares hold the sum of more GPUs\' gradients. Each step moves 2.0 GB per link: '+ms(per(mode))+' ms here.</p>';
    else if(k===N-1)cap+='<p>After 7 steps each GPU owns one chunk that is the full sum over all 8 GPUs (green). That half is a <b>reduce-scatter</b>, which is all ZeRO and FSDP need for gradients.</p>';
    else if(!done)cap+='<p>Now the finished chunks travel around the ring and overwrite the stale copies (an <b>all-gather</b>), another 7 steps of 2.0 GB.</p>';
    else cap+='<p>Every GPU has the full sum. Each sent 2 &times; 7/8 &times; 16.06 = 28.1 GB: '+ms(tot.nvlink)+' ms over NVLink, '+ms(tot.ib)+' ms over InfiniBand, 9 times longer for the same bytes. Against an 8.0 s step (8 GPUs at 40% MFU) both overlap with the backward pass; per-layer tensor-parallel traffic would not.</p>';
    document.getElementById('rd-ring-cap').innerHTML=cap;
    const other=mode==='nvlink'?'ib':'nvlink';
    document.getElementById('rd-ring-cnt').innerHTML=RD.stat('Sent per GPU',(k*S/N/1e9).toFixed(1)+' GB','of 28.1 GB')+RD.stat('Time, '+name[mode],ms(t)+' ms','total '+ms(tot[mode])+' ms')+RD.stat('Same point, '+name[other],ms(k*per(other))+' ms','total '+ms(tot[other])+' ms');
  }
  const A=RD.anim({card:'rd-ring-card',ctl:'rd-ring-ctl',n:NS,draw,ms:1100,label:'Ring step'});
  RD.seg(document.getElementById('rd-ring-mode'),m=>{mode=m;A.reset(NS)});
  RD.onResize(()=>A.redraw());
})();
