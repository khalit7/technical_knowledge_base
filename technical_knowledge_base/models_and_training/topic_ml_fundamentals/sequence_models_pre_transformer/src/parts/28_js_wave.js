// ---- Reading: WaveNet's dilated causal convolutions against a plain causal stack, receptive field traced (animated) ----
(function(){
  const $=id=>document.getElementById(id);
  if(!$('wv'))return;
  const st={mode:'dil',layers:4};
  let steps,anim;
  // filter size 2: output t depends on t and t - d at a layer with dilation d
  const dils=()=>Array.from({length:st.layers},(_,l)=>st.mode==='dil'?2**l:1);
  const rf=d=>1+d.reduce((a,b)=>a+b,0);
  function build(){steps=st.layers+2}
  function draw(i){
    const d=dils(),Lr=st.layers,box=$('wv-svg'),W=RD.width(box);
    const cols=Math.max(16,Math.min(64,2**Lr)),ml=6,mr=6,cw=(W-ml-mr)/cols,rh=Math.max(26,Math.min(40,220/(Lr+1))),H=(Lr+1)*rh+34;
    // reach: set of time offsets (0 = newest) that influence the output, layer by layer from the top
    const reach=[new Set([0])];for(let l=Lr-1;l>=0;l--){const s=new Set();reach[reach.length-1].forEach(t=>{s.add(t);s.add(t+d[l])});reach.push(s)}
    const shown=Math.min(i,Lr);// layers of tracing revealed
    const X=t=>W-mr-(t+.5)*cw,Y=row=>24+(Lr-row)*rh;// row 0 = input, row Lr = output
    let s='';
    for(let row=0;row<=Lr;row++){s+='<text x="'+ml+'" y="'+(Y(row)-8)+'" font-size="10" fill="var(--mute)">'+(row===0?'input':row===Lr?'output':'hidden '+row)+(row>0?', dilation '+d[row-1]:'')+'</text>'}
    // edges of the revealed tracing
    for(let k=0;k<shown;k++){const lay=Lr-k,set=reach[k];set.forEach(t=>{[t,t+d[lay-1]].forEach(u=>{if(u<cols)s+='<line x1="'+X(t)+'" y1="'+Y(lay)+'" x2="'+X(u)+'" y2="'+Y(lay-1)+'" stroke="var(--c1)" stroke-width="1.3" opacity=".8"/>'})})}
    for(let row=0;row<=Lr;row++){const k=Lr-row,set=k<=shown?reach[k]:new Set();for(let t=0;t<cols;t++){const on=set.has(t);s+='<circle cx="'+X(t)+'" cy="'+Y(row)+'" r="'+Math.min(5,cw*.32)+'" fill="'+(on?'var(--c1)':'var(--bg)')+'" stroke="'+(on?'var(--c1)':'var(--dim)')+'"/>'}}
    box.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Causal convolution stack and receptive field">'+s+'</svg>';
    const R=rf(d),part=k=>reach[Math.min(k,Lr)].size;
    let t1,t2;
    if(i===0){t1='One output sample';t2='The output at the newest time step (right). Filters have width 2 and are causal: a unit sees itself and one earlier unit, never the future.'}
    else if(i<=Lr){const lay=Lr-i+1;t1='Layer '+lay+' traced back (dilation '+d[lay-1]+')';t2='Each unit reaches its own time step and the one '+d[lay-1]+' step'+(d[lay-1]>1?'s':'')+' earlier. The output now depends on '+part(i)+' units at this depth.'}
    else{t1='Receptive field: '+R+' samples';t2=st.mode==='dil'?'With dilations 1, 2, 4, ... the field doubles every layer: 2<sup>'+Lr+'</sup> = '+R+' samples from '+Lr+' layers. A plain stack of the same depth reaches '+(Lr+1)+'. Switch modes to compare.':'Without dilation each layer adds one sample: '+Lr+' layers + filter 2 &minus; 1 = '+R+' (the paper\'s Figure 2 gives 5 for 4 layers). Switch to Dilated to see the same depth reach '+(2**Lr)+'.'}
    $('wv-cap').innerHTML='<div class="t">'+t1+'</div><p>'+t2+'</p>';
    $('wv-cnt').innerHTML=RD.stat('Receptive field',(i>Lr?R:part(i))+' samples',i>Lr?'1 + sum of dilations':'traced so far')+RD.stat('At 16 kHz',((i>Lr?R:part(i))/16).toFixed(2)+' ms','samples ÷ 16 per millisecond')+RD.stat('Layers',String(Lr),st.mode==='dil'?'dilations '+d.join(', '):'all dilation 1');
  }
  function reset(){build();if(anim)anim.reset(steps)}
  $('wv-mode').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;st.mode=b.dataset.m;[...$('wv-mode').children].forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b)});reset();anim.play()});
  $('wv-L').addEventListener('input',e=>{st.layers=+e.target.value;$('wv-Lv').textContent=st.layers;reset()});
  $('wv-Lv').textContent=st.layers;
  build();anim=RD.anim({card:'wv',ctl:'wv-ctl',n:steps,draw,ms:1300,label:'Layer traced'});
  // the paper's configuration: blocks of dilations 1, 2, ..., 512
  function cfg(){const b=+$('wv-b').value;$('wv-bv').textContent=b;const R=1+b*1023;$('wv-cfg').innerHTML=RD.stat('Receptive field',R.toLocaleString('en-GB')+' samples','1 + '+b+' × 1,023')+RD.stat('At 16 kHz',(R/16).toFixed(1)+' ms','')+RD.stat('Layers',String(10*b),b+' block'+(b>1?'s':'')+' of 10')}
  $('wv-b').addEventListener('input',cfg);cfg();
  let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>anim.redraw(),150)});
})();
