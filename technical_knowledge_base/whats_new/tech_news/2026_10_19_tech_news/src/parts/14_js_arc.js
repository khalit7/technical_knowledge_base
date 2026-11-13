// ---- ARC-AGI-3: the same models under the standard harness and the Provider Adapter, animated (RD.anim; steps explained in sx-ar-std and sx-ar-ada) ----
(function(){
  const card=$('v-arc');if(!card)return;
  // [model, lab colour, standard %, adapter % (null: no entry), note]
  const M=[['GPT-6 Astra','var(--c1)',62.7,99.95,'3 Sep'],['GPT-6.1 Sol','var(--c1)',52.7,96.2,'29 Sep, max effort'],['Gemini 4 Argon','var(--c3)',49.8,97.5,'13 Oct, low effort; standard run 42 of 55 tasks'],['Claude Opus 5','var(--c2)',30.16,null,'standard only']];
  const MODES={std:{name:'Standard harness'},ada:{name:'Provider Adapter'}};
  const st={m:'std',k:0,t:1,raf:0};
  const cl=v=>Math.max(0,Math.min(1,v)),ease=v=>v<.5?2*v*v:1-Math.pow(-2*v+2,2)/2;
  function draw(){
    const mode=MODES[st.m];
    const box=$('arSvg'),W=Math.max(300,Math.round(box.clientWidth||340)),narrow=W<560;
    const lw=narrow?92:130,pr=narrow?44:60,rh=narrow?40:44,pt=22,H=pt+M.length*rh+30;
    const X=v=>lw+(W-lw-pr)*v/100;
    let s='';
    [0,25,50,75,100].forEach(v=>{s+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="'+(pt-6)+'" y2="'+(pt+M.length*rh)+'" stroke="var(--line)"/><text x="'+X(v)+'" y="'+(H-12)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+v+'%</text>'});
    const ada=st.m==='ada';
    M.forEach((m,i)=>{
      const y=pt+i*rh,shown=i<st.k||(i===st.k),f=i<st.k?1:(i===st.k?ease(cl(st.t)):0);
      s+='<text x="'+(lw-8)+'" y="'+(y+rh/2+1)+'" font-size="'+(narrow?11:12)+'" text-anchor="end">'+m[0]+'</text>';
      // standard bar: drawn grey as the "before" once in adapter mode
      const sv=ada?m[2]:m[2]*f;
      if(ada||shown)s+='<rect x="'+X(0)+'" y="'+(y+8)+'" width="'+(X(sv)-X(0))+'" height="'+(rh-18)+'" rx="3" fill="'+(ada?'var(--dim)':m[1])+'"/>';
      if(!ada&&shown&&f>.6)s+='<text x="'+(X(sv)+5)+'" y="'+(y+rh/2+4)+'" font-size="11.5">'+m[2]+'%</text>';
      if(ada){
        if(m[3]==null){if(shown)s+='<text x="'+(X(m[2])+5)+'" y="'+(y+rh/2+4)+'" font-size="11" fill="var(--mute)">'+m[2]+'%, no adapter entry</text>';}
        else if(shown){const av=m[2]+(m[3]-m[2])*f;
          s+='<rect x="'+X(m[2])+'" y="'+(y+8)+'" width="'+(X(av)-X(m[2]))+'" height="'+(rh-18)+'" rx="3" fill="'+m[1]+'"/>';
          if(f>.6)s+='<text x="'+(X(av)+(narrow?-4:5))+'" y="'+(y+rh/2+4)+'" font-size="11.5" text-anchor="'+(narrow?'end':'start')+'"'+(narrow?' fill="var(--bg)" font-weight="600"':'')+'>'+m[3]+'%</text>'}
        else s+='<text x="'+(X(m[2])+5)+'" y="'+(y+rh/2+4)+'" font-size="11" fill="var(--mute)">'+m[2]+'%</text>';
      }
    });
    box.innerHTML=svgEl(W,H,s,'ARC-AGI-3 scores, '+mode.name);
    const done=M.filter((m,i)=>i<st.k||(i===st.k&&st.t>=1));
    const gaps=done.filter(m=>m[3]!=null).map(m=>m[3]-m[2]);
    $('arCnt').innerHTML=ada?stat('Models with both harnesses',String(gaps.length),'of 4 shown')+stat('Average gain from the adapter',gaps.length?'+'+(gaps.reduce((a,b)=>a+b,0)/gaps.length).toFixed(1)+' points':'..','same tasks, same models')+stat('Best standard score','62.7%','GPT-6 Astra'):
      stat('Models shown',String(done.length),'of 4')+stat('Highest so far',done.length?Math.max(...done.map(m=>m[2]))+'%':'..','standard harness')+stat('Range',done.length?Math.min(...done.map(m=>m[2]))+'% to '+Math.max(...done.map(m=>m[2]))+'%':'..','standard harness');
  }
  // the controller: RD.anim (template 21_js_rd_common.js), one model per step, the step list on the left (one list per harness);
  // a step reached by moving forward grows its bar over about a second, any other move draws it whole
  function tween(){const t0=performance.now();cancelAnimationFrame(st.raf);
    const f=now=>{st.t=Math.min(1,(now-t0)/1000);card.dataset.frames=(+card.dataset.frames||0)+1;draw();st.raf=st.t<1?requestAnimationFrame(f):0};st.raf=requestAnimationFrame(f)}
  const anim=RD.anim({card:'v-arc',ctl:'arCtl',n:M.length,list:'sx-ar-std',ms:4200,label:'Model',
    draw:i=>{st.k=i;if(card.classList.contains('rd-fwd')&&!RD.RM){st.t=0;draw();tween()}else{cancelAnimationFrame(st.raf);st.raf=0;st.t=1;draw()}}});
  // switching harness swaps the step list and replays from the first model (the one exception to "stops for good")
  const seg=$('arM');seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{
    seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    st.m=b.dataset.m;document.querySelectorAll('ol[id^="sx-ar-"]').forEach(o=>o.hidden=o.id!=='sx-ar-'+st.m);anim.reset(M.length,'sx-ar-'+st.m)}));
  let rw=0;addEventListener('resize',()=>{const w=card.clientWidth;if(w&&w!==rw){rw=w;draw()}});
  onTab(card.closest('.tab').id,()=>anim.redraw());
})();
