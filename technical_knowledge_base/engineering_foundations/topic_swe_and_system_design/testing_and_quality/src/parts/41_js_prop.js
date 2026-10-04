// ---- Reading: "Same bug, two kinds of test" (examples against a property, on the buggy and the fixed chunker) ----
(function(){
  const TQ=window.TQ, esc=RD.esc, H=TQ.hyp;
  // Python's chunk()/unchunk() ported to JS (code points, like Python strings); checked against the recorded results below
  const cps=s=>Array.from(s);
  function starts(n,size,ov,fixed){const step=size-ov,out=[];
    if(fixed){if(n===0)return out;for(let i=0;i<Math.max(n-ov,1);i+=step)out.push(i)}
    else for(let i=0;i<n-size+1;i+=step)out.push(i);return out}
  function run(text,size,ov,fixed){const c=cps(text),st=starts(c.length,size,ov,fixed);
    const ch=st.map(i=>c.slice(i,i+size).join(''));
    const back=ch.length?ch[0]+ch.slice(1).map(x=>cps(x).slice(ov).join('')).join(''):'';
    const cov=new Array(c.length).fill(false);st.forEach(i=>{for(let k=i;k<Math.min(i+size,c.length);k++)cov[k]=true});
    return {c,ch,back,cov}}
  // the recorded runs must agree with the port
  [[H.log,false],[H.fixed,true]].forEach(([log,fx])=>log.forEach((e,i)=>{const r=run(e.t,e.s,e.o,fx);
    if(r.back!==e.g)window.__jsErr&&window.__jsErr('chunk port disagrees with recorded call '+i)}));
  const EX=[{t:'abcdefghij',s:4,o:1,want:['abcd','defg','ghij'],what:'chunk("abcdefghij", size=4, overlap=1) == ["abcd", "defg", "ghij"]'},
            {t:'abcdef',s:2,o:0,want:['ab','cd','ef'],what:'chunk("abcdef", size=2, overlap=0) == ["ab", "cd", "ef"]'},
            {t:'the quick brown fox jumps over the lazy dog!!',s:10,o:5,rt:true,what:'unchunk(chunk(text, 10, 5), 5) == text (45 characters)'}];
  const show=ch=>{const p=ch.codePointAt(0);if(p<32||(p>126&&p<161)||p>0xFFFF)return '<span style="font-size:9px">'+(p>0xFFFF?'U+'+p.toString(16).toUpperCase():'\\x'+p.toString(16).padStart(2,'0'))+'</span>';return ch===' '?'&nbsp;':esc(ch)};
  const rep=s=>"'"+esc(cps(s).map(ch=>{const p=ch.codePointAt(0);return (p<32||(p>126&&p<161))?'\\x'+p.toString(16).padStart(2,'0'):p>0xFFFF?'\\U'+p.toString(16).padStart(8,'0'):ch}).join(''))+"'";
  let mode='ex';
  const key=e=>[e.n,e.s,e.o];
  const less=(a,b)=>{for(let i=0;i<3;i++){if(a[i]!==b[i])return a[i]<b[i]}return false};
  function steps(){return mode==='ex'?EX.length:mode==='pb'?H.log.length:H.fixed.length}
  function draw(i){
    const fixed=mode==='fx';let input,res,pass,cap,cnt,strip='';
    if(mode==='ex'){const e=EX[i];res=run(e.t,e.s,e.o,false);pass=e.rt?res.back===e.t:JSON.stringify(res.ch)===JSON.stringify(e.want);
      input='Test '+(i+1)+' of 3: <code>'+esc(e.what)+'</code>';
      cap='<div class="t">'+(pass?'Pass':'Fail')+': test '+(i+1)+' of 3</div><p>'+(i<2?'The windows come out exactly as written in the test.':'The 45-character sentence goes through 10-character windows stepping by 5: starts 0, 5, ..., 35, and the last window ends exactly at character 45, so nothing is lost.')+
        (i===2?' All three examples pass. Each one uses a length where the windows happen to fit, so the bug (short or misaligned documents lose their end) never shows.':'')+'</p>';
      cnt=[['Tests run',(i+1)+' of 3'],['Failures','0'],['Verdict','green build']];
      strip=EX.map((x,k)=>'<span class="'+(k<=i?'p':'')+(k===i?' cur':'')+'">'+(k+1)+'</span>').join('');
    } else {
      const log=fixed?H.fixed:H.log,e=log[i];res=run(e.t,e.s,e.o,fixed);pass=!e.f;
      const first=log.findIndex(x=>x.f);let best=-1;
      for(let k=0;k<=i;k++)if(log[k].f&&(best<0||less(key(log[k]),key(log[best]))))best=k;
      const prevBest=(()=>{let b=-1;for(let k=0;k<i;k++)if(log[k].f&&(b<0||less(key(log[k]),key(log[b]))))b=k;return b})();
      input='Call '+(i+1)+': <code>text='+rep(e.t)+'</code> ('+e.n+' character'+(e.n===1?'':'s')+'), <code>size='+e.s+', overlap='+e.o+'</code>';
      const lost=res.cov.filter(x=>!x).length;
      let what;
      if(fixed)what='Windows cover every character; the round trip gives the text back.';
      else if(pass)what=e.n===0?'Empty text: no windows, and gluing nothing gives the empty text back. Pass.':'The windows cover every character. Pass.';
      else what=(res.ch.length?'The last '+lost+' character'+(lost===1?' is':'s are')+' never covered by a window.':'The text is shorter than one window, so <code>chunk()</code> returns no windows at all.')+' The round trip gives back <code>'+rep(e.g)+'</code>. Fail.';
      let phase;
      if(fixed)phase='Generating';else if(first<0||i<first)phase='Generating';else if(i===first)phase='First failure';else phase='Shrinking';
      let note='';
      if(!fixed&&i===first)note=' This is the first failure. Hypothesis now starts shrinking: it tries simpler variants (shorter text, smaller numbers, plainer characters) and keeps any that still fail.';
      else if(!fixed&&i>first){
        if(e.f&&best===i&&prevBest>=0&&prevBest!==i)note=' Still fails and is simpler than anything before, so the shrinker keeps it.';
        else if(e.f&&i===log.length-1&&best!==i&&key(log[best]).join()===key(e).join())note=' The same input as the smallest failure: Hypothesis runs it once more to print its error report.';
        else if(e.f)note=' Still fails, but no simpler than the best so far.';
        else note=' This simpler variant passes, so the shrinker throws it away and tries another.';
        if(i===log.length-1)note+=' Nothing simpler fails: Hypothesis reports <code>text='+rep(log[best].t)+', args=('+log[best].s+', '+log[best].o+')</code>.';
      }
      if(fixed&&i===log.length-1)note=' All '+log.length+' generated inputs pass; the longer run in experiments/hyp/test_fixed_property.py passed 5,000.';
      cap='<div class="t">'+phase+'</div><p>'+what+note+'</p>';
      const fails=log.slice(0,i+1).filter(x=>x.f).length;
      cnt=[['Calls',(i+1)+' of '+log.length],['Failures',String(fails)],['Phase',phase],['Smallest failure',best<0?'none yet':(log[best].n+' char, size '+log[best].s)]];
      strip=log.map((x,k)=>'<span class="'+(k<=i?(x.f?'f':'p'):'')+(k===i?' cur':'')+(k===best&&k<=i?' best':'')+'"></span>').join('');
    }
    document.getElementById('pb-in').innerHTML=input;
    const C=res.c,MAX=48;
    document.getElementById('pb-chars').innerHTML=C.length?C.slice(0,MAX).map((ch,k)=>'<span class="ch '+(res.cov[k]?'in':'lost')+'">'+show(ch)+'</span>').join('')+(C.length>MAX?'<span class="small mute">+'+(C.length-MAX)+' more</span>':''):'<span class="small mute">(empty text)</span>';
    document.getElementById('pb-out').innerHTML='<div><span class="dot '+(pass?'p':'f')+'"></span><span>windows: <code>['+res.ch.slice(0,6).map(rep).join(', ')+(res.ch.length>6?', ...':'')+']</code></span></div>'+
      '<div><span class="dot '+(pass?'p':'f')+'"></span><span>round trip: <code>'+rep(res.back.length>60?cps(res.back).slice(0,60).join('')+'...':res.back)+'</code> '+(pass?'matches':'<b style="color:var(--bad)">does not match</b>')+'</span></div>';
    document.getElementById('pb-cnt').innerHTML=cnt.map(c=>RD.stat(c[0],c[1])).join('');
    document.getElementById('pb-strip').innerHTML=strip;
    document.getElementById('pb-cap').innerHTML=cap;
  }
  const O={card:'pb-card',ctl:'pb-ctl',n:steps(),draw,ms:1500,label:'Call'};const A=RD.anim(O);
  RD.seg(document.getElementById('pb-mode'),m=>{mode=m;O.ms=m==='fx'?350:1500;A.reset(steps());A.play()});
})();
