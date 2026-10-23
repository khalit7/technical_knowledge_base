// ---- Reading top: the hero figure, one training step and the state a checkpoint must hold (static, drawn at the measured width) ----
(function(){
  const el=document.getElementById('ts-hero');if(!el)return;
  const T=RD.t;
  function box(x,y,w,h,o){o=o||{};return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="7" fill="'+(o.fill||'var(--bg)')+'" stroke="'+(o.stroke||'var(--line)')+'" stroke-width="'+(o.sw||1.2)+'"'+(o.dash?' stroke-dasharray="'+o.dash+'"':'')+'/>'}
  function lines(x,y,arr,o){o=o||{};let s='';arr.forEach((l,i)=>{s+=T(x,y+i*(o.lh||15),l,{fs:o.fs||11,fill:o.fill||'var(--ink)',w:(i===0&&o.bold)?600:null,a:o.a})});return s}
  function arrow(x1,y1,x2,y2,o){o=o||{};const a=Math.atan2(y2-y1,x2-x1),h=6;
    return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+(o.c||'var(--mute)')+'" stroke-width="1.4"'+(o.dash?' stroke-dasharray="'+o.dash+'"':'')+'/>'+
      '<path d="M'+x2+' '+y2+' L'+(x2-h*Math.cos(a-0.45)).toFixed(1)+' '+(y2-h*Math.sin(a-0.45)).toFixed(1)+' L'+(x2-h*Math.cos(a+0.45)).toFixed(1)+' '+(y2-h*Math.sin(a+0.45)).toFixed(1)+'Z" fill="'+(o.c||'var(--mute)')+'"/>'}
  const ST={fill:'var(--acc2)',stroke:'var(--acc)'};
  // the step box's inner rows, laid out from (x, y) at width w; returns [svg, height, anchors]
  function step(x,y,w){let s='',yy=y+22;const p=10,iw=w-2*p,half=(iw-8)/2;
    s+=lines(x+p,y+16,['train_step: compiled once by nnx.jit (2)'],{bold:1,fs:11.5});
    s+=box(x+p,yy,iw,92);s+=lines(x+p+8,yy+16,['model: an nnx.Module object (1)'],{bold:1});
    s+=box(x+p+6,yy+24,half-6,60,{fill:'var(--soft)',dash:'4 3'});s+=lines(x+p+14,yy+40,['graphdef','structure, static:','keys the compile cache'],{fill:'var(--mute)'});
    s+=box(x+p+half+8,yy+24,half-6,60,ST);s+=lines(x+p+half+16,yy+40,['state','Param arrays','RngKey, RngCount'],{bold:1});
    const aModel=[x+p+half+8+half-6,yy+54];
    yy+=100;s+=box(x+p,yy,iw,26);s+=lines(x+p+8,yy+17,['loss, then nnx.grad: d loss / d Params only (2)']);
    yy+=34;s+=box(x+p,yy,iw,64);s+=lines(x+p+8,yy+16,['nnx.Optimizer: an optax chain (4)','clip, Adam moments, decay, x(-lr)'],{bold:1});
    s+=box(x+p+6,yy+38,iw-12,20,ST);s+=lines(x+p+14,yy+52,['OptState: mu, nu, step count']);
    const aOpt=[x+p+iw-6,yy+48];
    yy+=72;s+=box(x+p,yy,iw,26);s+=lines(x+p+8,yy+17,['nnx.metrics: running sums on device (8)']);
    yy+=34;return [s,yy-y,aModel,aOpt]}
  function ckptItems(x,y,w,cols){let s='';const it=[['model/','Params + RNG'],['opt/','mu, nu, count'],['data/','iterator JSON'],['meta/','step, config']];
    const cw=cols===2?(w-6)/2:w,rh=34;const pos=[];
    it.forEach((r,i)=>{const cx=x+(cols===2?(i%2)*(cw+6):0),cy=y+(cols===2?Math.floor(i/2):i)*(rh+6);
      s+=box(cx,cy,cw,rh,i<3?ST:{});s+=lines(cx+8,cy+14,[r[0],r[1]],{bold:1,lh:14});pos.push([cx,cy+rh/2])});
    return [s,(cols===2?2:4)*(rh+6),pos]}
  function draw(){const W=RD.width(el);let s='',H;
    if(W>=640){const gap=34,gw=Math.round(W*0.23),cw=Math.round(W*0.22),sw=W-gw-cw-2*gap,sx=gw+gap,cx=sx+sw+gap;
      const [st,sh,aM,aO]=step(sx,0,sw);H=sh+26;
      s+=box(sx,0,sw,sh,{stroke:'var(--mute)'})+st;
      // grain
      const gy=24;s+=box(0,gy,gw,150,{stroke:'var(--c2)'});
      s+=lines(8,gy+18,['grain (6)','record i = f(i, seed, epoch)','shuffle, random_map,','batch in the MapDataset'],{bold:1});
      s+=box(6,gy+92,gw-12,48,ST);s+=lines(14,gy+108,['iterator state','{next_index: 80}'],{bold:1});
      s+=arrow(gw,gy+50,sx-2,gy+50,{c:'var(--c2)'})+T((gw+sx)/2,gy+44,'batch',{a:'middle',fs:11,fill:'var(--c2)'});
      // checkpoint
      s+=box(cx,0,cw,sh,{stroke:'var(--c4)'});s+=lines(cx+8,18,['orbax checkpoint (5)','step_80/: async, sharded'],{bold:1});
      const [ci,ch,pos]=ckptItems(cx+6,42,cw-12,1);s+=ci;
      s+=arrow(aM[0],aM[1],cx+4,pos[0][1],{c:'var(--acc)',dash:'4 3'});
      s+=arrow(aO[0],aO[1],cx+4,pos[1][1],{c:'var(--acc)',dash:'4 3'});
      const ly=sh+16,ix=Math.round(gw/2);s+='<path d="M'+ix+' '+(gy+140)+' L'+ix+' '+ly+' L'+(cx-16)+' '+ly+' L'+(cx-16)+' '+pos[2][1]+'" fill="none" stroke="var(--acc)" stroke-width="1.4" stroke-dasharray="4 3"/>'+arrow(cx-16,pos[2][1],cx+4,pos[2][1],{c:'var(--acc)'});
      s+=lines(cx+8,42+ch+16,['graphdef: not saved,','rebuilt from your code'],{fill:'var(--mute)'});
    }else{const w=W;let y=0;
      s+=box(0,y,w,74,{stroke:'var(--c2)'});s+=lines(8,y+17,['grain (6): record i = f(i, seed, epoch)'],{bold:1});
      s+=box(6,y+26,w-12,40,ST);s+=lines(14,y+42,['iterator state','{next_index: 80}'],{bold:1});
      y+=74;s+=arrow(w/2,y+2,w/2,y+22,{c:'var(--c2)'})+T(w/2+8,y+16,'batch',{fs:11,fill:'var(--c2)'});y+=24;
      const [st,sh]=step(0,y,w);s+=box(0,y,w,sh,{stroke:'var(--mute)'})+st;y+=sh;
      s+=arrow(w/2,y+2,w/2,y+22,{c:'var(--acc)',dash:'4 3'})+T(w/2+8,y+16,'save the state',{fs:11,fill:'var(--acc)'});y+=24;
      const [ci,ch]=ckptItems(6,y+42,w-12,2);s+=box(0,y,w,ch+48,{stroke:'var(--c4)'});s+=lines(8,y+17,['orbax checkpoint (5): step_80/','async, sharded; graphdef not saved'],{bold:1});s+=ci;y+=ch+50;
      H=y;}
    el.innerHTML=RD.svg(W,H,s,'One JAX training step: grain feeds a batch to a train step compiled by nnx.jit, which holds the model state, gradients and optimiser state; orbax saves model state with RNG, optimiser state and the data iterator, but not the graphdef')}
  RD.onRender(draw);RD.onResize(draw);draw();
})();
