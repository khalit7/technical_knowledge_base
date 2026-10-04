// Cost-quality frontier: four MT-Bench models at mid-2023 list prices; blended price = s * prompt price + (1 - s) * completion price.
(function(){
const C=window.PEC;const $=id=>document.getElementById(id);if(!C||!$('fr'))return;
const P={'gpt-4':[30,60,'OpenAI, May 2023 (8K)'],'gpt-3.5-turbo':[2,2,'OpenAI, May 2023'],'claude-v1':[11.02,32.68,'Anthropic, July 2023 (Claude 1 at the Claude 2 price)'],'claude-instant-v1':[1.63,5.51,'Anthropic, July 2023']};
const M=Object.keys(P).map(n=>({n,q:C.mean(C.byName[n].s),p:P[n]}));
function draw(){
  const s=+$('fr-mix').value/100;$('fr-mixv').textContent=Math.round(s*100)+'%';
  M.forEach(m=>{m.b=s*m.p[0]+(1-s)*m.p[1]});
  M.forEach(m=>{m.front=!M.some(o=>o!==m&&o.b<=m.b&&o.q>=m.q&&(o.b<m.b||o.q>m.q))});
  const w=Math.max(300,$('fr-plot').clientWidth||600),h=230,l=44,r=14,t=12,b=40;
  const lx=v=>Math.log10(v),x0=lx(1),x1=lx(100),X=v=>l+(lx(v)-x0)/(x1-x0)*(w-l-r),Y=v=>t+(9.2-v)/(9.2-7.6)*(h-t-b);
  let g='<svg viewBox="0 0 '+w+' '+h+'" width="'+w+'" height="'+h+'" role="img" aria-label="MT-Bench score against blended price">';
  [1,2,5,10,20,50,100].forEach(v=>{g+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="'+t+'" y2="'+(h-b)+'" stroke="var(--line)"/><text x="'+X(v)+'" y="'+(h-b+14)+'" font-size="10.5" fill="var(--mute)" text-anchor="middle">$'+v+'</text>'});
  [7.6,8,8.4,8.8,9.2].forEach(v=>{g+='<line x1="'+l+'" x2="'+(w-r)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/><text x="'+(l-5)+'" y="'+(Y(v)+4)+'" font-size="10.5" fill="var(--mute)" text-anchor="end">'+v.toFixed(1)+'</text>'});
  g+='<text x="'+((l+w-r)/2)+'" y="'+(h-6)+'" font-size="11" fill="var(--mute)" text-anchor="middle">blended US$ per million tokens (log scale)</text>';
  const fr=M.filter(m=>m.front).sort((a,b2)=>a.b-b2.b);
  g+='<path d="'+fr.map((m,i)=>(i?'L':'M')+X(m.b)+' '+Y(m.q)).join('')+'" fill="none" stroke="var(--good)" stroke-width="1.5" stroke-dasharray="4 3"/>';
  const LAB={'gpt-4':[-9,-7,'end'],'gpt-3.5-turbo':[-4,-11,'start'],'claude-instant-v1':[0,19,'middle'],'claude-v1':[0,19,'middle']};
  M.forEach(m=>{const L=LAB[m.n];
    g+='<circle cx="'+X(m.b)+'" cy="'+Y(m.q)+'" r="5.5" fill="'+(m.front?'var(--good)':'var(--bg)')+'" stroke="'+(m.front?'var(--good)':'var(--mute)')+'" stroke-width="1.6"/>';
    let x=X(m.b)+L[0];if(L[2]==='middle')x=Math.max(l+48,Math.min(w-r-48,x));
    g+='<text x="'+x+'" y="'+(Y(m.q)+L[1])+'" font-size="11.5" text-anchor="'+L[2]+'">'+m.n+' '+m.q.toFixed(2)+'</text>'});
  $('fr-plot').innerHTML=g+'</svg>';
  $('fr-note').innerHTML='On the frontier (filled, green): '+fr.map(m=>m.n).join(', ')+'. Score: mean GPT-4 grade on MT-Bench from the released file (FastChat\'s rule, failed grades dropped). Prices per million tokens, prompt / completion: '+M.map(m=>m.n+' $'+m.p[0]+' / $'+m.p[1]+' ('+m.p[2]+')').join('; ')+'. The blend is an assumption you set; quality differences of a few hundredths are within noise (%EVSTAT%).';
  $('fr-note').innerHTML=$('fr-note').innerHTML.replace('%EVSTAT%','<a href="https://app.notion.com/p/3ef5c17b0d0d8187a7b4e5b4ec4a546d" target="_blank" rel="noopener noreferrer">Eval statistics</a>');
}
$('fr-mix').addEventListener('input',draw);
let rt;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(()=>{if(!$('t-read').hidden)draw()},120)});
(window.TAB_RENDER=window.TAB_RENDER||{})['t-read']=(window.TAB_RENDER['t-read']||[]).concat([draw]);
draw();
})();
