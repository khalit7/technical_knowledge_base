// ---- Protocol atlas: stack map (click a protocol: what it runs on, what runs on it) and the path walk ----
(function(){
  const A=window.AT,D=A.D,E=A.E,$=A.$,esc=A.esc,md=A.md;
  let sel=A.store.get('at-sel','sse');if(!E[sel])sel='sse';
  // ---- the map ----
  function buildRows(){
    let h='';
    D.groups.forEach(g=>{
      const es=D.entries.filter(e=>e.group===g.id);if(!es.length)return;
      h+='<div class="at-row"><div class="at-rl"><b>'+esc(g.label)+'</b><span>'+esc(g.adds)+'</span></div><div class="at-chips">'+
        es.map(e=>'<button type="button" class="at-chip'+(e.brief?' br':'')+'" data-at-chip="'+e.id+'" aria-pressed="false">'+esc(e.name)+'</button>').join('')+'</div></div>';
    });
    $('at-stack').innerHTML=h;
    $('at-stack').querySelectorAll('[data-at-chip]').forEach(b=>b.addEventListener('click',()=>select(b.getAttribute('data-at-chip'))));
    let o='';D.entries.forEach(e=>{o+='<option value="'+e.id+'">'+esc(e.name)+' ('+esc(A.G[e.group].label)+')</option>'});
    $('at-find').innerHTML=o;$('at-find').addEventListener('change',ev=>select(ev.target.value));
  }
  function chip(id){return $('at-stack').querySelector('[data-at-chip="'+id+'"]')}
  function mark(){
    const down=new Set(E[sel].runs_on||[]),up=new Set(A.UP[sel]||[]);
    $('at-stack').querySelectorAll('[data-at-chip]').forEach(b=>{
      const id=b.getAttribute('data-at-chip');
      b.classList.toggle('sel',id===sel);b.classList.toggle('dn',down.has(id));b.classList.toggle('up',up.has(id));
      b.classList.toggle('dim',id!==sel&&!down.has(id)&&!up.has(id));b.setAttribute('aria-pressed',id===sel?'true':'false');
    });
    $('at-find').value=sel;
  }
  function lines(){
    const svg=$('at-lines'),wrap=$('at-stackwrap');if(!A.visible()||!wrap.offsetWidth)return;
    const W=wrap.offsetWidth,H=wrap.offsetHeight,R=wrap.getBoundingClientRect();
    svg.setAttribute('width',W);svg.setAttribute('height',H);svg.setAttribute('viewBox','0 0 '+W+' '+H);
    const box=id=>{const c=chip(id);if(!c)return null;const r=c.getBoundingClientRect();return {x:r.left-R.left+r.width/2,t:r.top-R.top,b:r.bottom-R.top,cy:r.top-R.top+r.height/2}};
    const s=box(sel);if(!s){svg.innerHTML='';return}
    let h='';
    const seg=(a,b,col,dash)=>{
      let d;
      if(Math.abs(a.cy-b.cy)<4){const y=a.t-2;d='M'+a.x+' '+y+' C'+a.x+' '+(y-22)+' '+b.x+' '+(y-22)+' '+b.x+' '+y}
      else if(b.cy>a.cy){d='M'+a.x+' '+a.b+' C'+a.x+' '+(a.b+(b.t-a.b)*0.5)+' '+b.x+' '+(a.b+(b.t-a.b)*0.5)+' '+b.x+' '+b.t}
      else{d='M'+a.x+' '+a.t+' C'+a.x+' '+(a.t-(a.t-b.b)*0.5)+' '+b.x+' '+(a.t-(a.t-b.b)*0.5)+' '+b.x+' '+b.b}
      h+='<path d="'+d+'" fill="none" stroke="var(--'+col+')" stroke-width="2"'+(dash?' stroke-dasharray="5 4"':'')+' opacity=".85"/>';
    };
    (E[sel].runs_on||[]).forEach(t=>{const b=box(t);if(b)seg(s,b,'c3',false)});
    (A.UP[sel]||[]).forEach(t=>{const b=box(t);if(b)seg(s,b,'c4',true)});
    svg.innerHTML=h;
  }
  function select(id,noScroll){
    if(!E[id])return;sel=id;A.store.set('at-sel',id);mark();lines();
    $('at-det').innerHTML='<div class="at-det">'+A.detailHTML(id)+'</div>';
    walkSet(id);
  }
  A.setOpenHook(id=>select(id));

  // ---- path walk: one message going down the stack, one layer per step ----
  let W={id:null,paths:[],pi:0,step:0,playing:false,timer:null,speed:1,onScreen:false};
  function allPaths(id){
    const out=[];
    (function dfs(cur,acc){if(out.length>=6)return;const r=(E[cur].runs_on||[]).filter(x=>!acc.includes(x));
      if(!r.length){out.push(acc.concat([cur]));return}r.forEach(n=>dfs(n,acc.concat([cur])))})(id,[]);
    return out;
  }
  function walkSet(id){
    W.id=id;W.paths=allPaths(id);W.pi=0;W.step=0;stop();drawWalk();
    if(!A.RM&&W.onScreen&&W.paths[0].length>1)play();
  }
  function stepsOf(){return W.paths[W.pi]||[W.id]}
  function drawWalk(){
    const p=stepsOf(),n=p.length,k=Math.min(W.step,n-1),e=E[p[k]];
    let h='<div class="small"><b>One message down the stack.</b> Start from '+esc(E[W.id].name)+' and follow what it runs on down to the network. ';
    h+=W.paths.length>1?'This protocol can travel more than one way; pick a path to compare.':'One path only.';
    h+='</div>';
    if(W.paths.length>1){h+='<div class="at-ctl"><label class="small" for="at-wpath">Path</label><select id="at-wpath">'+W.paths.map((q,i)=>'<option value="'+i+'"'+(i===W.pi?' selected':'')+'>'+q.map(x=>esc(E[x].name)).join(' on ')+'</option>').join('')+'</select></div>'}
    h+='<div class="at-ctl"><button type="button" id="at-wback" aria-label="Step back">&#9664;</button><button type="button" id="at-wplay">'+(W.playing?'Pause':'Play')+'</button><button type="button" id="at-wfwd" aria-label="Step forward">&#9654;</button>'+
      '<input type="range" id="at-wscr" min="0" max="'+(n-1)+'" value="'+k+'" aria-label="Step"><select id="at-wspd" aria-label="Speed"><option value="0.5">0.5x</option><option value="1">1x</option><option value="2">2x</option></select>'+
      '<span class="small mute">step '+(k+1)+' of '+n+' · layers so far: '+(k+1)+'</span></div>';
    h+='<div class="at-env">';
    p.forEach((x,i)=>{const ex=E[x];h+='<div class="'+(i>k?'off':'')+(i===k?' cur':'')+'"><b>'+esc(ex.name)+'</b>: '+md(ex.adds||ex.plain)+'</div>'});
    h+='</div><div class="at-cap" aria-live="polite">'+(k===0?'The application hands '+esc(e.name)+' its message. ':esc(E[p[k-1]].name)+' is carried by '+esc(e.name)+'. ')+
      (k===n-1?'This is the bottom of this path: from here the packet leaves on the wire.':'Next it goes down to '+esc(E[p[k+1]].name)+'.')+'</div>';
    $('at-walk').innerHTML=h;
    $('at-wspd').value=String(W.speed);
    $('at-wplay').addEventListener('click',()=>{W.playing?stop():play()});
    $('at-wback').addEventListener('click',()=>{stop();W.step=Math.max(0,W.step-1);drawWalk();hl()});
    $('at-wfwd').addEventListener('click',()=>{stop();W.step=Math.min(n-1,W.step+1);drawWalk();hl()});
    $('at-wscr').addEventListener('input',ev=>{stop();W.step=+ev.target.value;drawWalk();hl()});
    $('at-wspd').addEventListener('change',ev=>{W.speed=+ev.target.value});
    const ps=$('at-wpath');if(ps)ps.addEventListener('change',ev=>{W.pi=+ev.target.value;W.step=0;stop();drawWalk();hl()});
    hl();
  }
  function hl(){const p=stepsOf(),k=Math.min(W.step,p.length-1);$('at-stack').querySelectorAll('.walk').forEach(b=>b.classList.remove('walk'));const c=chip(p[k]);if(c)c.classList.add('walk')}
  function tick(){
    if(!W.playing)return;
    if(!A.visible()||!W.onScreen){stop();return}
    const n=stepsOf().length;
    if(W.step>=n-1){W.step=0}else W.step++;
    drawWalk();W.timer=setTimeout(tick,1600/W.speed);
  }
  function play(){if(W.playing)return;W.playing=true;drawWalk();W.timer=setTimeout(tick,1600/W.speed)}
  function stop(){W.playing=false;if(W.timer)clearTimeout(W.timer);W.timer=null;const b=$('at-wplay');if(b)b.textContent='Play'}
  if('IntersectionObserver' in window){
    new IntersectionObserver(es=>{es.forEach(x=>{W.onScreen=x.isIntersecting;if(!W.onScreen)stop()})}).observe($('at-walk'));
  }else W.onScreen=true;

  buildRows();
  A.vrender.stack=()=>{mark();select(sel,true);requestAnimationFrame(lines)};
  addEventListener('resize',()=>{if(A.visible()&&!$('at-v-stack').hidden)lines()});
})();
