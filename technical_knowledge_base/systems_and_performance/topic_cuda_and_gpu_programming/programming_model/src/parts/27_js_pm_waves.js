// ---- Reading s5: wave quantization, NVIDIA's A100 example, N = 1536 against N = 1544 ----
(function(){
  const fig=document.getElementById('pm-wq-fig');if(!fig)return;
  const cap=document.getElementById('pm-wq-cap'),cnt=document.getElementById('pm-wq-cnt'),P=window.PM.wq,SMS=108;
  function steps(c){const out=[{t:0,run:0,done:0}];let done=0,t=0;
    for(let w=0;w<c.waves;w++){const run=Math.min(SMS,c.tiles-done);out.push({t,run,done,w:w+1});done+=run;t+=1;
      if(w===c.waves-1)out.push({t,run:0,done,end:1})}return out}
  const D={before:steps(P.before),after:steps(P.after)};
  let mode='before';
  function draw(i){
    const c=P[mode],S=D[mode][i],W=RD.width(fig);
    const cols=12,rows=9,cell=Math.max(14,Math.min(34,Math.floor((Math.min(W,560)-8)/cols)));
    const gw=cols*cell+8,tw=Math.max(gw,Math.min(W,560));
    let b='';
    for(let k=0;k<SMS;k++){const x=4+(k%cols)*cell,y=4+Math.floor(k/cols)*cell,busy=k<S.run;
      b+='<rect x="'+x+'" y="'+y+'" width="'+(cell-3)+'" height="'+(cell-3)+'" rx="2" style="fill:'+(busy?(S.w===2?'var(--c2)':'var(--c1)'):'var(--soft)')+';stroke:var(--line)"></rect>'}
    // time axis to scale: 2 tile-times wide
    const ty=4+rows*cell+14,ax=4,aw=tw-8,u=aw/2;
    b+=RD.t(ax,ty-3,'time (one unit = one tile)',{fs:10.5,fill:'var(--mute)'});
    for(let w=0;w<c.waves;w++){const shown=(S.end||S.w>w+1)?1:(S.w===w+1?0.5:0);
      if(shown)b+='<rect x="'+(ax+w*u)+'" y="'+ty+'" width="'+(u*(shown===1?1:0.5)-2)+'" height="12" rx="2" style="fill:'+(w===1?'var(--c2)':'var(--c1)')+';opacity:'+(shown===1?0.9:0.5)+'"></rect>'}
    b+='<line x1="'+ax+'" x2="'+(ax+aw)+'" y1="'+(ty+16)+'" y2="'+(ty+16)+'" stroke="var(--line)"></line>';
    [0,1,2].forEach(k=>{b+=RD.t(ax+k*u,ty+28,k,{a:k===0?'start':(k===2?'end':'middle'),fs:10,fill:'var(--mute)'})});
    fig.innerHTML=RD.svg(tw,ty+32,b,'108 SMs and the tiles running on them');
    const el=S.end?c.waves:(S.w?S.t+0.5:0);
    const busy=S.end?c.tiles:(S.w?S.done+S.run*0.5:0);
    const util=el?busy/(SMS*el):0;
    let t,p;
    if(i===0){t=c.tiles+' tiles to compute';p='M = 2,304 gives ceil(2304 / 256) = 9 tile rows; N = '+c.N.toLocaleString('en-US')+' gives ceil('+c.N+' / 128) = '+Math.ceil(c.N/128)+' tile columns: '+c.tiles+' tiles, one block each, one block per SM.'}
    else if(S.end){t='Done after '+c.waves+' wave'+(c.waves>1?'s':'');p=c.waves===1?'Every SM ran exactly one tile: the GPU was full the whole time.':'The second wave ran '+c.last_wave_tiles+' tiles on '+c.last_wave_tiles+' SMs while '+(SMS-c.last_wave_tiles)+' sat idle, and it took as long as the first. 0.5% more work, twice the time: SM utilisation '+Math.round(c.util*1000)/10+'%.'}
    else{t='Wave '+S.w+': '+S.run+' tiles running';p=S.w===1?'The first '+S.run+' tiles fill all 108 SMs.':'Only '+S.run+' tiles are left, so only '+S.run+' SMs work.'}
    cap.innerHTML='<div class="t">'+t+'</div><p>'+p+'</p>';
    const rel=S.end?(c.tiles/c.waves)/(P.before.tiles/P.before.waves):null;
    cnt.innerHTML=RD.stat('Tiles done',(S.end?c.tiles:S.done)+' / '+c.tiles)+RD.stat('Elapsed',el?el+' tile time'+(el===1?'':'s'):'0')+
      RD.stat('SM utilisation',el?Math.round(util*1000)/10+'%':'...')+RD.stat('Throughput vs N = 1,536',rel===null?'...':Math.round(rel*100)+'%','work done per unit time')}
  const A=RD.anim({card:'pm-wq-card',ctl:'pm-wq-ctl',n:D.before.length,draw,ms:1500,label:'Wave step'});
  RD.seg(document.getElementById('pm-wq-mode'),m=>{mode=m;A.reset(D[m].length);A.play()});
  RD.onResize(()=>A.redraw());
  window.PM_WQ=D;
})();
