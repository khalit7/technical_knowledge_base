// ---- Part 1: object-lifetime animation. Replays the recorded output of lifetime.cpp (src/ca/out/lt_*.txt) step by step ----
CA.life=(function(){
  const D=window.CA_DATA.lifetime;
  // parse one recorded log into steps: each step = one output line, with the state after it
  function steps(key){
    const sc=D[key],objs={},order=[],st=[];let line=0;
    const cnt={ctor:0,copy:0,move:0,dtor:0,assign:0};
    const snap=(ev,cap,kind)=>st.push({ev,cap,kind,line,cnt:Object.assign({},cnt),objs:order.map(id=>Object.assign({id},objs[id]))});
    sc.log.forEach(ev=>{
      let m;
      if((m=ev.match(/^ctor #(\d+) (\S+) (stack|heap) L(\d+)/))){const id=+m[1];if(+m[4])line=+m[4];
        objs[id]={name:m[2],where:m[3],state:'new',from:'constructed'};order.push(id);cnt.ctor++;
        snap(ev,'#'+id+' is constructed on the '+m[3]+' with the name "'+m[2]+'"'+(+m[4]?'':' (inside the standard library)')+'.','ctor');objs[id].state='live';}
      else if((m=ev.match(/^(copy|move) #(\d+) from #(\d+) (\S+) (stack|heap) L(\d+)/))){const id=+m[2],src=+m[3];if(+m[6])line=+m[6];
        objs[id]={name:m[4],where:m[5],state:'new',from:m[1]+' of #'+src};order.push(id);cnt[m[1]]++;
        if(m[1]==='move'&&objs[src])objs[src].state='moved';
        const lib=+m[6]?'':' The standard library did this inside the call.';
        snap(ev,m[1]==='copy'?'#'+id+' is copy-constructed from #'+src+' on the '+m[5]+': a new string buffer, the bytes duplicated.'+lib
          :'#'+id+' is move-constructed from #'+src+' on the '+m[5]+': it takes #'+src+"'s string; #"+src+' is left valid but empty.'+lib,m[1]);objs[id].state='live';}
      else if((m=ev.match(/^(copy|move)= #(\d+) from #(\d+)/))){const id=+m[2],src=+m[3];cnt.assign++;
        if(m[1]==='move'&&objs[src])objs[src].state='moved';if(objs[id])objs[id].state='hit';
        snap(ev,'#'+id+' already exists, so this is '+m[1]+' assignment from #'+src+', not construction: no new object.','assign');if(objs[id])objs[id].state='live';}
      else if((m=ev.match(/^dtor #(\d+)/))){const id=+m[1];cnt.dtor++;if(objs[id])objs[id].state='dying';
        snap(ev,'#'+id+"'s destructor runs: the object ends here"+(objs[id]&&objs[id].where==='heap'?' and its heap memory is released.':'.'),'dtor');
        delete objs[id];order.splice(order.indexOf(id),1);}
      else if((m=ev.match(/^@(\d+) (.*)/))){if(+m[1])line=+m[1];snap(ev,+m[1]?'The program reaches line '+m[1]+': '+m[2]+'.':'The scenario function has returned; every local is gone.','step');}
      else snap(ev,'The program prints: '+ev,'print');
    });
    return st;
  }
  function codeHTML(sc,line){
    const blocks=[];if(sc.helpers)blocks.push(sc.helpers);blocks.push({first:sc.first,lines:sc.lines});
    return blocks.map(b=>'<pre class="ca-code ca-lc">'+b.lines.map((l,i)=>{const n=b.first+i;
      return '<span class="ca-ln'+(n===line?' on':'')+'"><span class="ca-no">'+n+'</span>'+(CA.hl(l)||' ')+'</span>'}).join('')+'</pre>').join('');
  }
  function box(o){const cls={new:' new',moved:' moved',dying:' dying',hit:' hit',live:''}[o.state]||'';
    return '<div class="ca-obj'+cls+'"><b>#'+o.id+'</b> '+CA.esc(o.state==='moved'?'"" (moved-from)':'"'+o.name+'"')+'<span>'+CA.esc(o.from)+'</span></div>'}
  // mount an animation in element el; keys = scenarios selectable by a segmented control (seg element id) or one key
  function mount(o){
    const el=document.getElementById(o.el);let key=o.key,st=steps(key);
    el.innerHTML='<div class="ca-lgrid"><div class="ca-lcode" id="'+o.el+'-code"></div><div class="ca-mem"><div class="ca-col"><div class="h">Stack</div><div id="'+o.el+'-st"></div></div><div class="ca-col"><div class="h">Heap</div><div id="'+o.el+'-hp"></div></div></div></div>'+
      '<div class="ca-cap" id="'+o.el+'-cap" aria-live="polite"></div><div class="ca-cnt" id="'+o.el+'-cnt"></div><pre class="ca-out ca-log" id="'+o.el+'-log"></pre>';
    const $=s=>document.getElementById(o.el+'-'+s);
    function draw(i){const s=st[i],sc=D[key];
      $('code').innerHTML=codeHTML(sc,s.line);
      $('st').innerHTML=s.objs.filter(x=>x.where==='stack').map(box).join('')||'<div class="ca-none">empty</div>';
      $('hp').innerHTML=s.objs.filter(x=>x.where==='heap').map(box).join('')||'<div class="ca-none">empty</div>';
      $('cap').innerHTML='<b>Step '+(i+1)+' of '+st.length+'.</b> '+CA.esc(s.cap);
      const c=s.cnt;$('cnt').innerHTML=['constructed '+c.ctor,'copied '+c.copy,'moved '+c.move,'assigned '+c.assign,'destroyed '+c.dtor,'alive '+s.objs.filter(x=>x.state!=='dying').length].map(x=>'<span>'+x+'</span>').join('');
      $('log').innerHTML='<span class="ca-cmd">$ '+CA.esc(sc.cmd.replace(/^.*&& /,''))+'</span>\n'+sc.log.map((l,j)=>j===i?'<mark>'+CA.esc(l)+'</mark>':j<i?CA.esc(l):'<span class="ca-fut">'+CA.esc(l)+'</span>').join('\n');
      const lg=$('log'),mk=lg.querySelector('mark');if(mk){const y=mk.offsetTop-lg.offsetTop;if(y<lg.scrollTop||y>lg.scrollTop+lg.clientHeight-24)lg.scrollTop=Math.max(0,y-60)}
      const lc=$('code').querySelector('.ca-ln.on');if(lc&&lc.parentNode){const p=lc.parentNode;if(lc.offsetTop<p.scrollTop||lc.offsetTop>p.scrollTop+p.clientHeight-20)p.scrollTop=Math.max(0,lc.offsetTop-40)}
    }
    const a=CA.anim({card:o.card,ctl:o.ctl,n:st.length,draw,ms:1300,label:'Step of the program run'},o.tab);
    function set(k){key=k;st=steps(k);a.reset(st.length);a.play()}
    if(o.seg)RD.seg(document.getElementById(o.seg),set);
    return {set,get key(){return key}};
  }
  return {mount,steps};
})();
