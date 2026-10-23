// Reading section 4: stacked-window reach, layer by layer, all-local against 2 local : 1 global (a stepper over layers).
// Moved from the Which keys are read tab. Reach after l local layers is l x (W - 1); a global layer reaches every token.
(function(){
  if(!window.RD||!window.AVK||!document.getElementById('av-reach-card'))return;
  const $=id=>document.getElementById(id),WS=[16,32,64,128],q=AVK.tokens.length-1,n=q+1,cells=64;
  function reach(s,W,inter){for(let l=1;l<=s;l++)if(inter&&l%3===0)return Infinity;return s*(W-1)}
  function draw(i){
    const W=WS[+$('av-reach-w').value];$('av-reach-wv').textContent=W;const s=i+1;
    const bar=R=>{let h='';for(let c=0;c<cells;c++){const p=Math.floor(c*n/cells);h+='<i style="background:'+(q-p<=R?'var(--acc)':'transparent')+'"></i>'}return '<div class="c">'+h+'</div>'};
    let h='<div class="small"><b>Every layer local</b></div>';for(let l=1;l<=s;l++)h+='<div class="r"><span>layer '+l+'</span>'+bar(reach(l,W,false))+'</div>';
    h+='<div class="small" style="margin-top:4px"><b>2 local : 1 global</b> (layers 3 and 6 global)</div>';for(let l=1;l<=s;l++)h+='<div class="r"><span>layer '+l+(l%3===0?' G':'')+'</span>'+bar(reach(l,W,true))+'</div>';
    $('av-reach-strip').innerHTML=h;
    const Ra=reach(s,W,false),Rb=reach(s,W,true);
    $('av-reach-cap').innerHTML='<b>After layer '+s+' of 6.</b> All-local: the last token can be influenced by the previous '+Math.min(q,Ra)+' tokens ('+s+' x (W - 1) = '+Ra+(Ra>=q?', the whole '+n+'-token text':'')+'). Interleaved: '+(Rb===Infinity?'every token, since a global layer has run':Rb+' tokens')+'. '+(s===6?'With 6 layers and W = '+W+', the all-local stack reaches '+(6*(W-1))+' tokens; Mistral 7B\'s 32 layers x 4,096 give the "about 131K" its paper calls a theoretical span.':'Blue: positions that can reach the last token through some path.');
  }
  const an=RD.anim({card:'av-reach-card',ctl:'av-reach-ctl',n:6,ms:1300,draw,label:'Layer'});
  $('av-reach-w').addEventListener('input',()=>an.redraw());
})();
