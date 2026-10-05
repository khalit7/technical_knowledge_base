// ---- Step timeline tab ----
(function(){
  const $=id=>document.getElementById(id);if(!$('t-step'))return;
  const caps=[1,5,10,15,25,50,100,200,400];
  function cfg(){const c=SGM.cfgFromData();const [h,L]=$('st-model').value.split(',').map(Number);
    c.h=h;c.L=L;c.tied=$('st-tied').checked;c.gpus=Math.pow(2,+$('st-g').value);c.tokens=Math.pow(2,+$('st-t').value);
    c.batch_bytes=c.tokens*8*2;c.mfu=+$('st-m').value/100;c.busbw=+$('st-net').value*1e9;c.cap=caps[+$('st-b').value]*1048576;
    c.first_cap=Math.min(1048576,c.cap);c.alpha=+$('st-a').value*1e-6;return c}
  function render(){const c=cfg(),slow=+$('st-s').value/100;
    $('st-gv').textContent=c.gpus.toLocaleString('en-US');$('st-tv').textContent=c.tokens.toLocaleString('en-US');$('st-mv').textContent=Math.round(c.mfu*100)+'%';
    $('st-bv').textContent=(c.cap/1048576)+' MiB';$('st-av').innerHTML=$('st-a').value+' &micro;s';$('st-sv').textContent=$('st-s').value+'%';
    const se=SGM.step(c,false,0),ov=SGM.step(c,true,slow),tmax=Math.max(se.total,ov.total)*1.02;
    const ev=[];se.events.forEach(e=>ev.push(['s'+e[0],e[1],e[2],e[3]==='forward'||e[3]==='backward'?e[3]:'',e[3]==='optimizer'?'var(--c3)':SGT.col[e[0]]]));
    ov.events.forEach(e=>ev.push(['o'+e[0],e[1],e[2],e[3]==='forward'||e[3]==='backward'?e[3]:'',e[3]==='optimizer'?'var(--c3)':SGT.col[e[0]]]));
    SGT.lanes({el:$('st-fig'),lanes:[['scompute','A compute'],['scomm','A NCCL'],['ocopy','B copy'],['ocompute','B compute'],['ocomm','B NCCL']],ev,tmax,unit:'ms',lw:84,
      marks:[[se.total,''],[ov.total,'']],label:'step timelines'});
    const nb=ov.buckets.length,last=ov.buckets[nb-1][1]/1048576;
    $('st-out').innerHTML=RD.stat('Parameters',(se.N/1e6).toFixed(1)+' M',(se.N*2/1048576).toFixed(0)+' MiB of BF16 gradients')+
      RD.stat('Step, no overlap',se.total.toFixed(2)+' ms','comm '+se.comm.toFixed(2)+' ms')+
      RD.stat('Step, overlapped',ov.total.toFixed(2)+' ms',(100*(1-ov.total/se.total)).toFixed(0)+'% less')+
      RD.stat('Comm still exposed',Math.max(0,ov.exposed).toFixed(2)+' ms',nb+' buckets, last '+last.toFixed(1)+' MiB')+
      RD.stat('Compute share, overlapped',(100*(ov.fwd+ov.bwd+ov.opt)/ov.total).toFixed(0)+'%','time the step spends on math');
    $('st-note').textContent=c.gpus===1?'One GPU: no all-reduce at all.':(ov.comm>ov.bwd?'Communication is longer than backward: overlap can hide at most the backward time; the rest is exposed whatever you do. Fewer, larger steps per all-reduce (more tokens per GPU, gradient accumulation) or a faster network are the fixes.':
      (c.tied?'The last bucket carries the tied embedding, which is ready only when backward ends; untie it (or reorder buckets) and see the tail shrink.':'Untied: the output layer gradient is ready first and leaves in the first buckets; the embedding still finishes last.'));
    // sweep
    const pts=caps.map(cp=>{const c2=Object.assign({},c,{cap:cp*1048576,first_cap:Math.min(1048576,cp*1048576)});return [cp,SGM.step(c2,true,slow).total]});
    const el=$('st-sweep'),W=RD.width(el),H=190,l=48,r=12,t=10,b=34,ymax=Math.max(...pts.map(p=>p[1]))*1.05,ymin=Math.min(...pts.map(p=>p[1]))*0.95;
    const X=v=>l+(W-l-r)*Math.log(v)/Math.log(400),Y=v=>t+(H-t-b)*(1-(v-ymin)/(ymax-ymin||1));let s='';
    [ymin,(ymin+ymax)/2,ymax].forEach(v=>{s+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+RD.t(l-4,Y(v)+4,v.toFixed(1),{fs:10,a:'end',fill:'var(--mute)'})});
    s+='<polyline fill="none" stroke="var(--c2)" stroke-width="2" points="'+pts.map(p=>X(p[0]).toFixed(1)+','+Y(p[1]).toFixed(1)).join(' ')+'"/>';
    pts.forEach(p=>{s+='<circle cx="'+X(p[0])+'" cy="'+Y(p[1])+'" r="'+(p[0]*1048576===c.cap?5:3)+'" fill="var(--c2)"/>'+RD.t(X(p[0]),H-b+14,p[0],{fs:10,a:'middle',fill:'var(--mute)'})});
    s+=RD.t(l,H-4,'bucket size, MiB (log scale)',{fs:10.5,fill:'var(--mute)'})+RD.t(l+4,t+10,'overlapped step, ms',{fs:10.5,fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,s,'step time against bucket size');
  }
  ['st-model','st-net','st-g','st-t','st-m','st-b','st-a','st-s','st-tied'].forEach(id=>{$(id).addEventListener('input',render);$(id).addEventListener('change',render)});
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-step']=window.TAB_RENDER['t-step']||[]).push(render);
  let tm=0;addEventListener('resize',()=>{if($('t-step').hidden)return;clearTimeout(tm);tm=setTimeout(render,80)});
})();
