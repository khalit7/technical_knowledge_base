// ---- Hero: the two contributions in one picture: MATH score at each stage (Tables 2 and 5), and PPO against GRPO as the models each one keeps; static, nothing moves ----
(function(){const host=$('heroSvg');if(!host)return;
  function scores(x0,pw){const top=22,ch=150,base=top+ch,mx=60,Y=v=>base-ch*v/mx;let s=tx(x0,13,'MATH, chain-of-thought, no tools',{fs:12.5,w:600});
    const B=[['Base 7B','500B tokens',36.2,'var(--c3)'],['Instruct 7B','776K SFT',46.8,'var(--c2)'],['RL 7B','GRPO',51.7,'var(--acc)']];
    const pr=104,pl=x0+30,aw=pw-30-pr,bw=Math.min(70,aw/3-18),gap=(aw-3*bw)/3,xe=pl+aw;
    [0,20,40,60].forEach(v=>{s+=ln2(pl-4,Y(v),xe,Y(v),'var(--line)')+tx(pl-8,Y(v)+4,v+'%',{fs:11,a:'end',c:'var(--mute)'})});
    B.forEach((b,i)=>{const x=pl+gap/2+i*(bw+gap);s+=rc(x,Y(b[2]),bw,base-Y(b[2]),b[3],{r:3})+tx(x+bw/2,Y(b[2])+16,b[2].toFixed(1),{fs:12.5,a:'middle',w:600,c:'var(--bg)'})
      +tx(x+bw/2,base+15,b[0],{fs:11.5,a:'middle',w:600})+tx(x+bw/2,base+30,b[1],{fs:11,a:'middle',c:'var(--mute)'})});
    [[52.9,'GPT-4: 52.9'],[37.7,'best open: 37.7']].forEach(([v,l])=>{s+=ln2(pl,Y(v),xe+4,Y(v),'var(--ink)',{da:'4 3',op:.7})+tx(xe+8,Y(v)+4,l,{fs:11,c:'var(--mute)'})});
    return {s,h:base+36}}
  function models(x0,pw){let s=tx(x0,13,'GRPO: PPO without the critic',{fs:12.5,w:600});
    const row=(y,name,bx,note)=>{let o=tx(x0,y+17,name,{fs:12,w:600});const bw0=(pw-46-(bx.length-1)*6)/4;
      bx.forEach((b,i)=>{const x=x0+46+i*(bw0+6);o+=rc(x,y,bw0,26,b[1]?'var(--acc)':'var(--bg)',{s:b[1]?'var(--acc)':'var(--line)',r:4,op:b[1]?.9:1})+tx(x+bw0/2,y+17,b[0],{fs:11,a:'middle',c:b[1]?'var(--bg)':'var(--ink)',w:b[1]?600:null})});
      o+=tx(x0+46,y+44,note,{fs:11,c:'var(--mute)'});return o};
    s+=row(24,'PPO',[['policy',1],['value',1],['reward',0],['reference',0]],'advantage per token, from GAE and the value model');
    s+=row(88,'GRPO',[['policy',1],['reward',0],['reference',0]],'no value model: the group is the baseline');
    const gy=152,gx=x0+46,n=8,dw=Math.min(22,(pw-60)/n-4);
    const R=[1,0,0,1,0,0,0,0];
    for(let i=0;i<n;i++){const x=gx+i*(dw+4);s+=rc(x,gy,dw,18,R[i]?'var(--good)':'var(--soft)',{s:'var(--line)',r:3})+tx(x+dw/2,gy+13,R[i]?'1':'0',{fs:11,a:'middle',c:R[i]?'var(--bg)':'var(--mute)',w:600})}
    s+=tx(gx,gy+36,'G answers to one question, rewards r',{fs:11,c:'var(--mute)'});
    s+=tx(gx,gy+52,'Â = (r − mean) / std, the same for every token',{fs:11.5,w:600});
    return {s,h:gy+58}}
  function draw(W){const two=W>=700;let s,h;
    if(two){const pw=(W-30)/2,a=scores(1,pw),b=models(pw+29,pw);s=a.s+b.s;h=Math.max(a.h,b.h)}
    else{const a=scores(1,W-2),b=models(1,W-2);s=a.s+'<g transform="translate(0,'+(a.h+18)+')">'+b.s+'</g>';h=a.h+18+b.h}
    host.innerHTML=svgW(W,h+2,s,'Left: MATH accuracy rises from 36.2% for the base model to 46.8% after SFT and 51.7% after GRPO, against GPT-4 at 52.9%. Right: PPO trains a policy and a value model and keeps a reward and a reference model; GRPO drops the value model and normalises the rewards of a group of answers to the same question')}
  fit(host,draw)})();
