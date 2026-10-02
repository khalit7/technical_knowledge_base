// ---- Two Lean proofs to scale: one square per billion output tokens; wall-clock hours on their own axis ----
(function(){
  const box=$('pfPlot');if(!box)return;
  const st={m:'all'};
  const O={all:{tok:300,msg:'4.9 million',lab:'OpenAI swarm, all problems'},ns:{tok:130,msg:'2.7 million',lab:'OpenAI swarm, Navier-Stokes only'}};
  const C={tok:6,h:11*24};const OH={find:88,lean:17};
  segBind('pfM',m=>{st.m=m;$('pfM').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===m?'true':'false'));draw()});
  function draw(){
    const W=Math.max(300,box.clientWidth||340),narrow=W<560,cs=narrow?9:11,g=2,per=Math.floor((W-16)/(cs+g));
    const o=O[st.m];let s='',y=16;
    const grid=(n,col,label)=>{let t='<text x="8" y="'+(y-4)+'" font-size="12" fill="var(--mute)">'+label+'</text>';const rows=Math.ceil(n/per);
      for(let i=0;i<n;i++){const r=Math.floor(i/per),c=i%per;t+='<rect x="'+(8+c*(cs+g))+'" y="'+(y+r*(cs+g))+'" width="'+cs+'" height="'+cs+'" rx="1.5" fill="'+col+'"/>'}y+=rows*(cs+g)+22;return t};
    s+=grid(o.tok,'var(--c4)',narrow?(st.m==='all'?'OpenAI, all problems':'OpenAI, Navier-Stokes only')+': ~'+o.tok+'B tokens':o.lab+': about '+o.tok+' billion output tokens');
    s+=grid(C.tok,'var(--c3)',narrow?'Claude, Fermat\'s Last Theorem: ~6B':'Claude, Fermat\'s Last Theorem: about 6 billion');
    // hours
    y+=4;s+='<text x="8" y="'+(y-4)+'" font-size="12" fill="var(--mute)">wall-clock hours</text>';
    const mx=C.h,sc=(W-16-60)/mx;
    s+='<rect x="8" y="'+y+'" width="'+(OH.find*sc)+'" height="12" fill="var(--c4)"/><rect x="'+(8+OH.find*sc)+'" y="'+y+'" width="'+(OH.lean*sc)+'" height="12" fill="var(--c4)" opacity=".5"/><text x="'+(12+(OH.find+OH.lean)*sc)+'" y="'+(y+10)+'" font-size="11">'+(OH.find+OH.lean)+' h</text>';
    s+='<text x="8" y="'+(y+26)+'" font-size="11" fill="var(--mute)">OpenAI: 88 h to the result, then 17 h of Lean'+(narrow?'':' (lighter)')+'</text>';y+=36;
    s+='<rect x="8" y="'+y+'" width="'+(C.h*sc)+'" height="12" fill="var(--c3)"/><text x="'+(12+C.h*sc)+'" y="'+(y+10)+'" font-size="11">'+C.h+' h</text>';
    s+='<text x="8" y="'+(y+26)+'" font-size="11" fill="var(--mute)">Claude: 11 days</text>';y+=34;
    box.innerHTML=svgEl(W,y,s,'Output tokens and hours of the two proofs');
    const th=st.m==='all'?null:o.tok/(OH.find+OH.lean);
    $('pfOut').innerHTML=stat('Claude\'s tokens as a share',(100*C.tok/o.tok).toFixed(1)+'%',st.m==='all'?'the issue\'s 2%, against the whole run':'like for like: the Navier-Stokes work alone')+
      stat('Agents','about 10,000 against dozens','on the order of 10,000 concurrent at peak; "dozens of Claude agents"')+
      stat('Messages (OpenAI)',o.msg,st.m==='all'?'all problems':'Navier-Stokes only')+
      stat('Output tokens per hour',st.m==='all'?'not comparable':fmt(o.tok/105,2)+'B against '+(C.tok/C.h).toFixed(3)+'B','derived: the whole run spans other problems and hours; per hour only for Navier-Stokes (105 h) against Claude (264 h)')+
      stat('Cost','$2m to $22.5m against undisclosed','The Batch\'s estimate for OpenAI; Anthropic gives none');
  }
  let rw=0;addEventListener('resize',()=>{const w=box.clientWidth;if(w&&w!==rw){rw=w;draw()}});
  onTab(box.closest('.tab').id,draw);
})();
