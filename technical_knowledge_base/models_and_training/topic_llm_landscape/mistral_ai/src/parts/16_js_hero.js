// ---- Hero: one row per model, its layer's attention and feed-forward shape from the config, static ----
(function(){
  const el=$('hero');if(!el)return;
  // E experts, k routed per token, sh shared; E=1 means a dense feed-forward network; E=0 means unpublished
  const R=[
    {n:'Mistral 7B',d:'Sep 2023',s:'#s-7b',lic:'a',at:'GQA, 32 query / 8 KV heads, <b>4,096-token window</b>',E:1,k:1,sh:0,num:'<b>7.24B</b>, all active',r:'1'},
    {n:'Mixtral 8x7B',d:'Dec 2023',s:'#s-mix',lic:'a',at:'the same GQA, <b>full attention</b> over 32k',E:8,k:2,sh:0,num:'<b>46.7B</b> total, 12.9B active',r:'3.6'},
    {n:'Mistral Large 3',d:'Dec 2025',s:'#s-now',lic:'a',at:'<b>latent attention</b> (512 + 64), DeepSeek-V3 skeleton',E:128,k:4,sh:1,num:'<b>675B</b> total, 41B active',r:'16.5'},
    {n:'Mistral Small 4',d:'Mar 2026',s:'#s-now',lic:'a',at:'latent attention (256 + 64)',E:128,k:4,sh:1,num:'<b>119B</b> total, 6B active',r:'19.8'},
    {n:'Mistral Medium 3.5',d:'Apr 2026',s:'#s-now',lic:'m',at:'GQA, 96 query / 8 KV heads, full attention',E:1,k:1,sh:0,num:'<b>128B</b> dense',r:'1'},
    {n:'Mistral Large 4',d:'Oct 2026',s:'#s-lin',lic:'p',at:'config unpublished',E:0,k:0,sh:0,num:'<b>1T</b> total, 52B active',r:'19.2'}];
  const LIC={a:'Apache 2.0',m:'Modified MIT',p:'API preview'};
  function glyph(m){
    if(m.E===0)return '<svg viewBox="0 0 260 34" width="260" height="34" role="img" aria-label="unpublished"><rect x="1" y="1" width="258" height="32" rx="4" fill="none" stroke="var(--mute)" stroke-dasharray="4 3"/><text x="130" y="21" font-size="11" text-anchor="middle" fill="var(--mute)">MoE, expert layout not published</text></svg>';
    if(m.E===1)return '<svg viewBox="0 0 260 34" width="260" height="34" role="img" aria-label="one dense feed-forward network"><rect x="1" y="1" width="80" height="32" rx="4" fill="var(--acc)" fill-opacity=".85"/><text x="41" y="21" font-size="11" text-anchor="middle" fill="var(--bg)">dense FFN</text><text x="90" y="21" font-size="11" fill="var(--mute)">every parameter, every token</text></svg>';
    if(m.E===8){let s='';const lit=[2,5];for(let i=0;i<8;i++){s+='<rect x="'+(1+i*25)+'" y="5" width="22" height="22" rx="3" fill="'+(lit.includes(i)?'var(--acc)':'var(--dim)')+'"/>'}
      return '<svg viewBox="0 0 260 34" width="260" height="34" role="img" aria-label="8 experts, 2 routed">'+s+'<text x="204" y="21" font-size="11" fill="var(--mute)">2 of 8</text></svg>'}
    // 128 small experts in 4 rows of 32, 4 routed, plus one shared
    let s='';const lit=[17,58,90,121];for(let i=0;i<128;i++){const c=i%32,r=Math.floor(i/32);s+='<rect x="'+(1+c*5.6)+'" y="'+(1+r*8.3)+'" width="4.6" height="7.2" rx="1" fill="'+(lit.includes(i)?'var(--acc)':'var(--dim)')+'"/>'}
    s+='<rect x="184" y="1" width="12" height="32" rx="2" fill="var(--c4)"/><text x="202" y="15" font-size="10.5" fill="var(--mute)">4 of 128</text><text x="202" y="29" font-size="10.5" fill="var(--c4)">+1 shared</text>';
    return '<svg viewBox="0 0 260 34" width="260" height="34" role="img" aria-label="128 experts, 4 routed, 1 shared">'+s+'</svg>'}
  el.innerHTML=R.map(m=>'<div class="hr-row"><div class="nm"><a href="'+m.s+'">'+m.n+'</a><span class="dt">'+m.d+'</span><span class="hr-lic '+m.lic+'">'+LIC[m.lic]+'</span></div><div class="at">'+m.at+'</div><div class="hr-g">'+glyph(m)+'</div><div class="num">'+m.num+'<br><span class="mute">r = '+m.r+'</span></div></div>').join('');
})();
