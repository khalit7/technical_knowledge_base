// ---- Reading 7: descriptor tables step by step on the FDSIM model (leak and fix measured; shell examples; your own script) ----
// Merged from the old Reading animation and the old Process lab tab (2026-10-24). Nothing moves until the reader steps or plays.
(function(){
  const card=document.getElementById('rd-fd-card');if(!card||!window.FDSIM||!window.RD)return;
  const $=id=>document.getElementById(id);
  const sv=$('rd-fd-svg'),cap=$('rd-fd-cap'),cnt=$('rd-fd-cnt'),pick=$('rd-fd-pick'),err=$('rd-fd-err');
  let key='leak',states=FDSIM.run(FDSCRIPTS.leak.steps);
  const meas={leak:PD.cloexec.leak_s.toFixed(3)+' s to EOF',cloexec:PD.cloexec.cloexec_s.toFixed(3)+' s to EOF',share:'39 bytes, lines intact'};
  function writers(s){let n=0;s.procs.forEach(p=>{if(p.alive)Object.values(p.fds).forEach(e=>{const D=s.desc[e.d];if(D&&s.objs[D.obj]&&s.objs[D.obj].kind==='pipe'&&D.mode==='w')n++})});return n}
  function parseOwn(){return $('rd-fd-own').value.split('\n').map(l=>l.trim()).filter(l=>l&&!l.startsWith('#')).map(l=>({op:l,say:''}))}
  function draw(i){
    const s=states[Math.min(i,states.length-1)];FDSIM.draw(sv,s,Math.max(300,RD.width(sv)));
    const descs=Object.keys(s.desc).length;
    cnt.innerHTML=RD.stat('Write ends open',writers(s),'fds referring to a pipe\'s write end')+RD.stat('Open file descriptions',descs,'shared by every fd that points at them')+
      RD.stat('Measured',meas[key]||'not a timed run',key in meas?'real program, this example':'model only');
    cap.innerHTML='<div class="t">Step '+(i+1)+' of '+states.length+': <code>'+RD.esc(s.op)+'</code></div><p><b>'+RD.esc(s.res)+'</b>'+(s.say?'<br>'+s.say:'')+'</p>';
  }
  const A=RD.anim({card:'rd-fd-card',ctl:'rd-fd-ctl',n:states.length,draw,ms:2200,label:'Step of the descriptor example'});
  function load(k){
    key=k;
    try{states=k==='own'?FDSIM.run(parseOwn()):FDSIM.run(FDSCRIPTS[k].steps);if(err)err.textContent=''}
    catch(e){if(err){err.textContent='Stopped: '+e.message;err.className='small bad'}states=FDSIM.run([{op:'proc 1 sh',say:'(script error)'}])}
    A.reset(states.length);
  }
  pick.addEventListener('change',()=>load(pick.value));
  $('rd-fd-run').addEventListener('click',()=>{pick.value='own';load('own')});
  RD.onResize(()=>A.redraw());
})();
