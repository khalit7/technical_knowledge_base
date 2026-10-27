// ---- ARC-AGI-3: the same models under the standard harness and the Provider Adapter, animated ----
(function(){
  const card=$('v-arc');if(!card)return;
  $('arAnim').innerHTML=animCtl('ar',[['std','Standard harness'],['ada','Provider Adapter']]);
  // [model, lab colour, standard %, adapter % (null: no entry), note]
  const M=[['GPT-6 Astra','var(--c1)',62.7,99.95,'3 Sep'],['GPT-6.1 Sol','var(--c1)',52.7,96.2,'29 Sep, max effort'],['Gemini 4 Argon','var(--c3)',49.8,97.5,'13 Oct, low effort; standard run 42 of 55 tasks'],['Claude Opus 5','var(--c2)',30.16,null,'standard only']];
  const STD=[{t:'GPT-6 Astra',c:'Under the standard harness the model keeps only the notes it writes for itself between requests. GPT-6 Astra reaches <b>62.7%</b>, still the best standard score on the board.',dur:1},
    {t:'GPT-6.1 Sol',c:'GPT-6.1 Sol, a cheaper model, reaches <b>52.7%</b> at max effort.',dur:1},
    {t:'Gemini 4 Argon',c:'Gemini 4 Argon reaches <b>49.8%</b> at low effort, the best non-OpenAI standard score. API errors stopped 13 of the 55 tasks early; they count with whatever partial credit they reached.',dur:1},
    {t:'Claude Opus 5',c:'Claude Opus 5 reaches <b>30.16%</b>. Every standard score sits between 30% and 63%: on this harness the benchmark is far from solved.',dur:1}];
  const ADA=[{t:'GPT-6 Astra',c:'The same model with the Provider Adapter, which keeps its hidden reasoning state from one request to the next and compacts context: <b>99.95%</b>, up 37 points.',dur:1},
    {t:'GPT-6.1 Sol',c:'GPT-6.1 Sol: <b>96.2%</b>, up 43.5 points from the same tasks.',dur:1},
    {t:'Gemini 4 Argon',c:'Gemini 4 Argon: <b>97.5%</b>, up 47.7 points. The pattern now holds for two labs and three models, so it is a property of the harness, not of one model.',dur:1},
    {t:'Claude Opus 5',c:'Claude Opus 5 has no adapter entry, and Opus 5.5 none at all, so the gap cannot be read for Anthropic yet. A bare ARC-AGI-3 score without its harness is not a comparable number.',dur:1}];
  const MODES={std:{name:'Standard harness',steps:STD},ada:{name:'Provider Adapter',steps:ADA}};
  const cl=v=>Math.max(0,Math.min(1,v)),ease=v=>v<.5?2*v*v:1-Math.pow(-2*v+2,2)/2;
  function draw(st,mode){
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
  makeAnim({card,pre:'ar',modes:MODES,start:'std',dur:1500,draw});
})();
