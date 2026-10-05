// ---- Reading 7: the leaked write end, before and after O_CLOEXEC, on the descriptor-table model ----
(function(){
  const card=document.getElementById('rd-fd-card');if(!card||!window.FDSIM)return;
  const sv=document.getElementById('rd-fd-svg'),cap=document.getElementById('rd-fd-cap'),cnt=document.getElementById('rd-fd-cnt');
  let mode='leak',states=FDSIM.run(FDSCRIPTS.leak.steps);
  const meas={leak:PD.cloexec.leak_s,cloexec:PD.cloexec.cloexec_s};
  function writers(s){let n=0;s.procs.forEach(p=>{if(p.alive)Object.values(p.fds).forEach(e=>{const D=s.desc[e.d];if(D&&s.objs[D.obj].kind==='pipe'&&D.mode==='w')n++})});return n}
  function draw(i){
    const s=states[i];FDSIM.draw(sv,s,RD.width(sv));
    const rd=s.procs.find(p=>p.pid===2);const eof=/end of file/.test(s.res);
    cnt.innerHTML=RD.stat('Write ends open',writers(s),'fds referring to the pipe\'s write end')+RD.stat('Reader',rd&&rd.alive?(eof?'saw EOF':(rd.state==='S'?'blocked':'running')):'','')+RD.stat('Measured time to EOF',meas[mode].toFixed(3)+' s','cloexec.c, this mode');
    cap.innerHTML='<div class="t">Step '+(i+1)+' of '+states.length+': <code>'+RD.esc(s.res)+'</code></div><p>'+s.say+'</p>';
  }
  const A=RD.anim({card:'rd-fd-card',ctl:'rd-fd-ctl',n:states.length,draw,ms:2200,label:'Step of the descriptor example'});
  RD.seg(document.getElementById('rd-fd-mode'),m=>{mode=m;states=FDSIM.run(FDSCRIPTS[m].steps);A.reset(states.length);A.play()});
  RD.onResize(()=>A.redraw());
})();
