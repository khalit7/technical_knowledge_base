// ---- Reading, learns less and forgets less: Biderman et al. 2024 Tables S1 to S8 stepped checkpoint by checkpoint ----
(function(){
  const $=id=>document.getElementById(id);if(!$('bd'))return;
  const B=PF_DATA.bid;
  const SER=[['LoRA (r=16)','LoRA r = 16','var(--c6)'],['LoRA (r=64)','LoRA r = 64','var(--c4)'],['LoRA (r=256)','LoRA r = 256','var(--c1)'],['Full Finetuning','Full fine-tuning','var(--c2)']];
  const NAME={code_cpt:'code continued pretraining (StarCoder-Python)',math_cpt:'math continued pretraining (OpenWebMath)',code_ift:'code instruction tuning (Magicoder-Evol-Instruct-110K)',math_ift:'math instruction tuning (MetaMathQA)'};
  let key='code_cpt';
  $('bdL').innerHTML=SER.map(s=>'<span><i style="background:'+s[2]+'"></i>'+s[1]+'</span>').join('');
  const at=(x,d)=>d.xlab==='epoch'?'epoch '+x:x+'B tokens';
  function draw(i){
    const d=B[key],n=d.x.length;i=Math.min(i,n-1);
    const el=$('bdP'),W=RD.width(el),H=Math.min(320,Math.max(240,W*0.55)),l=46,r=14,t=12,b=40;
    const xs=[],ys=[];SER.forEach(s=>{xs.push(...d.forget[s[0]]);ys.push(...d.learn[s[0]])});
    const x0=Math.min(...xs)-.01,x1=Math.max(...xs)+.01,y0=Math.max(0,Math.min(...ys)-.03),y1=Math.max(...ys)+.03;
    const X=v=>l+(W-l-r)*(v-x0)/(x1-x0),Y=v=>t+(H-t-b)*(1-(v-y0)/(y1-y0));
    let h='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Target skill against forgetting, by checkpoint">';
    const tick=(a,z,k)=>{const s=(z-a)/k,p=Math.pow(10,Math.floor(Math.log10(s))),m=[1,2,5,10].find(m=>m*p>=s)*p;const o=[];for(let v=Math.ceil(a/m)*m;v<=z+1e-9;v+=m)o.push(+v.toFixed(4));return o};
    tick(y0,y1,5).forEach(v=>{h+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/><text x="'+(l-5)+'" y="'+(Y(v)+4)+'" text-anchor="end" font-size="10.5" fill="var(--mute)">'+v.toFixed(2)+'</text>'});
    tick(x0,x1,W<500?3:5).forEach(v=>{h+='<text x="'+X(v)+'" y="'+(H-b+15)+'" text-anchor="middle" font-size="10.5" fill="var(--mute)">'+v.toFixed(2)+'</text>'});
    h+='<text x="'+(l+(W-l-r)/2)+'" y="'+(H-6)+'" text-anchor="middle" font-size="11" fill="var(--mute)">forgetting average (right = forgot less)</text>';
    h+='<text x="12" y="'+(t+(H-t-b)/2)+'" transform="rotate(-90 12 '+(t+(H-t-b)/2)+')" text-anchor="middle" font-size="11" fill="var(--mute)">'+d.metric+'</text>';
    SER.forEach(s=>{const fx=d.forget[s[0]],ly=d.learn[s[0]];let p='';
      for(let k=0;k<=i;k++)p+=(k?'L':'M')+X(fx[k]).toFixed(1)+','+Y(ly[k]).toFixed(1);
      h+='<path d="'+p+'" fill="none" stroke="'+s[2]+'" stroke-width="2" opacity=".85"/>';
      for(let k=0;k<=i;k++)h+='<circle cx="'+X(fx[k])+'" cy="'+Y(ly[k])+'" r="'+(k===i?5:2.5)+'" fill="'+s[2]+'"><title>'+s[1]+', '+at(d.x[k],d)+': '+d.metric+' '+ly[k].toFixed(3)+', forgetting average '+fx[k].toFixed(3)+'</title></circle>'});
    el.innerHTML=h+'</svg>';
    const g=s=>[d.learn[s][i],d.forget[s][i]];const f=g('Full Finetuning'),q=g('LoRA (r=256)'),q16=g('LoRA (r=16)');
    $('bdCap').innerHTML='<div class="t">'+NAME[key]+', '+at(d.x[i],d)+' ('+(i+1)+' of '+n+')</div>Full fine-tuning: '+d.metric+' '+f[0].toFixed(3)+', forgetting average '+f[1].toFixed(3)+'. LoRA r = 256: '+q[0].toFixed(3)+' and '+q[1].toFixed(3)+'. LoRA r = 16: '+q16[0].toFixed(3)+' and '+q16[1].toFixed(3)+'.'+
      (i===n-1?(key.endsWith('cpt')?' On billions of tokens, full fine-tuning learns more and forgets more; LoRA stays close to the base on both counts.':' On a small instruction set, high-rank LoRA learns about as much while keeping more of what the base knew.'):'');
  }
  const A=RD.anim({card:'bd',ctl:'bdCtl',n:B[key].x.length,draw,ms:1300,label:'Checkpoint'});
  $('bdM').addEventListener('click',e=>{const b=e.target.closest('button[data-m]');if(!b)return;key=b.dataset.m;
    $('bdM').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));A.reset(B[key].x.length);A.play()});
  addEventListener('resize',()=>A.redraw());
})();
