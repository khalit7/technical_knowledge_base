// ---- Token economics tab (t-nmtok) ----
(function(){
  const $=id=>document.getElementById(id), fmt=n=>Math.round(n).toLocaleString('en-US');
  const big=n=>n>=1e15?(n/1e15).toFixed(2)+' PFLOP':n>=1e12?(n/1e12).toFixed(2)+' TFLOP':n>=1e9?(n/1e9).toFixed(2)+' GFLOP':fmt(n)+' FLOP';
  const bytes=b=>b>=2**30?(b/2**30).toFixed(2)+' GiB':b>=2**20?(b/2**20).toFixed(1)+' MiB':fmt(b/1024)+' KiB';
  // Qwen3.5 image rule, ported from transformers qwen2_vl smart_resize (factor 32, min 65,536 px, max 16,777,216 px)
  const rhe=x=>{const r=Math.round(x);return (Math.abs(x%1)===0.5&&r%2!==0)?r-1:r}; // Python round(): halves to even
  function qwenTok(h,w){const f=32,mn=65536,mx=16777216;let hb=Math.max(f,rhe(h/f)*f),wb=Math.max(f,rhe(w/f)*f);
    if(hb*wb>mx){const b=Math.sqrt(h*w/mx);hb=Math.max(f,Math.floor(h/b/f)*f);wb=Math.max(f,Math.floor(w/b/f)*f)}
    else if(hb*wb<mn){const b=Math.sqrt(mn/(h*w));hb=Math.ceil(h*b/f)*f;wb=Math.ceil(w*b/f)*f}
    return hb*wb/(f*f)}
  // SmolVLM-500M: long side resized to 2,048, cut into 512 tiles (rounded up), plus one global view; 64 tokens each
  function smolTok(h,w){const s=2048/Math.max(h,w),hh=Math.round(h*s),ww=Math.round(w*s);return (Math.ceil(hh/512)*Math.ceil(ww/512)+1)*64}
  // Gemini API docs: <=384 px in both dimensions 258 tokens; larger images tiled 768 x 768, 258 each
  function gemTok(h,w){return (h<=384&&w<=384)?258:Math.ceil(h/768)*Math.ceil(w/768)*258}
  const P=[
    {id:'gem',n:'Gemini API (vendor docs)',img:gemTok,aud:32,vid:263,src:'Gemini API token docs (updated 2026-10-13): 258 tokens per image up to 384 px, else per 768 px tile; 32 tokens per second of audio; 263 per second of video (static processing, 1 frame per second). Vendor documentation.',tag:'vend'},
    {id:'qwen',n:'Qwen3.5 (open, native vision)',img:qwenTok,aud:null,vid:720,src:'Images: the processor rule (one token per 32 x 32 px after rounding, 64 to 16,384 tokens), ported and checked against the sibling page {{Vision-language models|n:3fc5c17b0d0d81adbb7be5bc41c4d9d0}}\' recorded rows. Video: 7,200 tokens for 10 s of 720p at 2 frames per second, recorded there, so 720 per second at that setting. The 0.8B model has no audio input.',tag:'meas'},
    {id:'smol',n:'SmolVLM-500M (late fusion)',img:smolTok,aud:null,vid:null,src:'1,088 image tokens for any square image (17 views x 64), 832 for 16:9: measured on the sibling page {{Vision-language models|n:3fc5c17b0d0d81adbb7be5bc41c4d9d0}}. Images only.',tag:'meas'},
    {id:'cham',n:'Chameleon (early fusion, discrete)',img:()=>1024,aud:null,vid:null,src:'Every image resized to 512 x 512 and encoded to 1,024 tokens from 8,192 codes (Chameleon paper). Images and text only.',tag:'vend'},
    {id:'moshi',n:'Moshi audio (Mimi codec)',img:null,aud:100,vid:null,src:'Mimi: 12.5 frames per second x 8 codebooks = 100 tokens per second (the sibling page {{Video and audio generation|n:3c65c17b0d0d8198bd7be111a3dc4c3a}}). Audio and text only.',tag:'vend'}];
  const KV=[{n:'SmolVLM-500M: 40,960 B per token (measured)',b:40960,f:0},{n:'Qwen3.5-0.8B: 12,288 B per token + 19.76 MB fixed (measured)',b:12288,f:19.76e6},
    {n:'Llama-3-8B-shaped (32 layers, 8 KV heads, 128 dims, bf16): 131,072 B (derived)',b:131072,f:0}];
  const COL={img:'var(--c1)',aud:'var(--c2)',vid:'var(--c3)',txt:'var(--c5)'};
  function init(){
    if(init.done)return;init.done=1;
    $('tk-prof').innerHTML=P.map((p,i)=>'<option value="'+i+'"'+(i===0?' selected':'')+'>'+p.n+'</option>').join('');
    $('tk-kv').innerHTML=KV.map((k,i)=>'<option value="'+i+'">'+k.n+'</option>').join('');
    ['tk-prof','tk-ni','tk-w','tk-h','tk-as','tk-vs','tk-tt','tk-kv'].forEach(id=>$(id).addEventListener('input',drawIn));
    ['tk-r','tk-f','tk-par','tk-ms','tk-dpar','tk-ds','tk-cfg','tk-ms1'].forEach(id=>$(id).addEventListener('input',drawGen));
    ['tk-sps','tk-codec','tk-lay'].forEach(id=>$(id).addEventListener('input',drawSp));
    drawIn();drawGen();drawSp();
  }
  const num=(id,d)=>{const v=+$(id).value;return isFinite(v)&&v>=0?v:d};
  function drawIn(){
    const p=P[+$('tk-prof').value],ni=num('tk-ni',0),w=Math.max(16,num('tk-w',512)),h=Math.max(16,num('tk-h',512));
    const parts={img:p.img?ni*p.img(h,w):null,aud:p.aud!=null?num('tk-as',0)*p.aud:null,vid:p.vid!=null?num('tk-vs',0)*p.vid:null,txt:num('tk-tt',0)};
    const tot=Object.values(parts).reduce((a,v)=>a+(v||0),0),k=KV[+$('tk-kv').value];
    $('tk-bar').innerHTML=tot?Object.entries(parts).filter(e=>e[1]).map(([m,v])=>'<span style="width:'+(100*v/tot).toFixed(2)+'%;background:'+COL[m]+'" title="'+m+' '+fmt(v)+'"></span>').join(''):'';
    $('tk-leg').innerHTML=[['img','images'],['aud','audio'],['vid','video'],['txt','text']].map(([m,l])=>'<span style="--sw:'+COL[m]+'">'+l+'</span>').join('');
    const na='<span class="mute">not an input</span>';
    $('tk-out').innerHTML=RD.stat('Images',parts.img==null?na:fmt(parts.img),p.img&&ni?fmt(p.img(h,w))+' per image':'')+
      RD.stat('Audio',parts.aud==null?na:fmt(parts.aud),parts.aud!=null?p.aud+' per second':'')+
      RD.stat('Video',parts.vid==null?na:fmt(parts.vid),parts.vid!=null?p.vid+' per second':'')+
      RD.stat('Total context',fmt(tot),'tokens')+
      RD.stat('Cache after prefill',bytes(tot*k.b+k.f),'tokens x bytes per token'+(k.f?' + fixed state':''));
    $('tk-psrc').innerHTML=p.src+' <span class="'+p.tag+'">'+(p.tag==='meas'?'measured':'vendor')+'</span>';
  }
  function drawGen(){
    const R=Math.max(64,num('tk-r',512)),f=+$('tk-f').value,Pa=num('tk-par',7)*1e9,ms=Math.max(1,Math.round(num('tk-ms',8))),
      Pd=num('tk-dpar',2)*1e9,ds=Math.max(1,Math.round(num('tk-ds',28))),g=+$('tk-cfg').value,t1=num('tk-ms1',20);
    const nA=Math.pow(Math.floor(R/f),2),nD=Math.pow(Math.floor(R/16),2);
    const rows=[
      ['Autoregressive, one token per call',fmt(nA)+' tokens',fmt(nA),big(2*Pa*nA*g),(nA*t1/1000).toFixed(2)+' s'],
      ['Masked, '+ms+' parallel rounds',fmt(nA)+' tokens',fmt(Math.min(ms,nA)),big(2*Pa*nA*Math.min(ms,nA)*g),(Math.min(ms,nA)*t1/1000).toFixed(2)+' s'],
      ['Diffusion transformer, '+ds+' steps',fmt(nD)+' latent tokens',fmt(ds),big(2*Pd*nD*ds*g),(ds*t1/1000).toFixed(2)+' s']];
    $('tk-gen').innerHTML='<tr><th>Style</th><th class="num">Sequence</th><th class="num">Sequential calls</th><th class="num">Compute</th><th class="num">Time at your ms per call</th></tr>'+
      rows.map(r=>'<tr><td>'+r[0]+'</td><td class="num">'+r[1]+'</td><td class="num">'+r[2]+'</td><td class="num">'+r[3]+'</td><td class="num">'+r[4]+'</td></tr>').join('');
  }
  function drawSp(){
    const s=Math.max(1,num('tk-sps',10)),c=$('tk-codec').value,lay=$('tk-lay').value;
    const fr=c==='mimi'?12.5:75,cb=8,frames=s*fr,toks=frames*cb,steps=lay==='depth'?frames:toks;
    $('tk-spout').innerHTML=RD.stat('Frames',fmt(frames),fr+' per second')+RD.stat('Audio tokens',fmt(toks),cb+' per frame')+
      RD.stat('Big-model steps',fmt(steps),lay==='depth'?'one per frame':'one per token')+
      RD.stat('Budget per big step for real time',(1000*s/steps).toFixed(1)+' ms','1 / steps per second of audio');
  }
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-nmtok']=window.TAB_RENDER['t-nmtok']||[]).push(init);
  window.NMTOK={qwenTok,smolTok,gemTok};
})();
