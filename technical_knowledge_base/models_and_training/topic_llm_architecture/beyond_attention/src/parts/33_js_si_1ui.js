// ---- The trained SSM, in Reading section 4 (moved from the retired Inside tab on 2026-10-23): per-token decay, hidden
// attention maps against attention maps (stepped over layers), half-lives (closed block). Data: window.BAD.inside (src/inside/out/ssm_inside.json, maps and decays quantised to 0..255). ----
(function(){
  const $=id=>document.getElementById(id);
  if(!window.BA||!window.BAD||!BAD.inside||!$('si-map-card'))return;
  const I=BAD.inside,TAB='t-read',N=I.ntok,P=BAD.rs_pieces||[];
  const tokLab=t=>{const s=(I.tokens[t]||'').replace(/\n/g,'↵');return s===''?'EOT':s};
  // 1. half-lives
  function hl(){const el=$('si-hl'),W=Math.min(820,RD.width(el)),l=56,r=30,rowH=26,t=8,H=t+rowH*I.layers.length+30;
    const lo=0,hi=3,X=v=>l+(W-l-r)*(Math.log10(v)-lo)/(hi-lo);let s='';
    [1,10,100,1000].forEach(v=>{s+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="'+t+'" y2="'+(H-26)+'" stroke="var(--line)"/>'+RD.t(X(v),H-12,v+' tok',{a:'middle',fs:11})});
    I.layers.forEach((L,i)=>{const y=t+rowH*i+rowH/2;s+=RD.t(l-6,y+4,'layer '+L.layer,{a:'end',fs:11});
      L.half_life.forEach((h,j)=>{if(h===null)return;s+='<circle cx="'+X(Math.max(1,Math.min(1000,h))).toFixed(1)+'" cy="'+(y+((j%3)-1)*4)+'" r="3.4" fill="'+(j===L.map_heads[0]?'var(--c2)':j===L.map_heads[1]?'var(--c1)':'var(--mute)')+'" opacity=".85"><title>head '+j+': '+h+' tokens</title></circle>'})});
    el.innerHTML=RD.svg(W,H,s,'half-life per head')+'<div class="leg"><span style="--sw:var(--c2)">longest-memory head of the layer</span><span style="--sw:var(--c1)">shortest</span><span style="--sw:var(--mute)">others</span></div>'}
  // 2. maps, animated over layers
  let sh=0,ah=0;
  function heat(el,arr,title){const W=Math.min(400,RD.width(el)),lab=W<330?0:44,cell=Math.max(3,Math.floor((W-lab-4)/N)),side=cell*N;let s='';
    for(let i=0;i<N;i++)for(let j=0;j<=i;j++){const v=arr[i*N+j]/255;if(v<0.02)continue;s+='<rect x="'+(lab+j*cell)+'" y="'+(16+i*cell)+'" width="'+cell+'" height="'+cell+'" fill="var(--c1)" opacity="'+v.toFixed(2)+'"/>'}
    s+='<rect x="'+lab+'" y="16" width="'+side+'" height="'+side+'" fill="none" stroke="var(--line)"/>'+RD.t(lab,11,title,{fs:11});
    if(lab)for(let i=0;i<N;i+=6)s+=RD.t(lab-3,16+i*cell+cell,RD.esc(tokLab(i).slice(0,7)),{a:'end',fs:10.5});
    el.innerHTML=RD.svg(W,side+20,s,title)}
  function drawMaps(k){const L=I.layers[k],A=I.attn[k];
    heat($('si-mb'),BA.dec(L.maps[sh]),'SSM layer '+L.layer+', head '+L.map_heads[sh]+' (half-life '+(L.half_life[L.map_heads[sh]]||0).toFixed(1)+')');
    heat($('si-ma'),BA.dec(A.maps[ah]),'attention layer '+A.layer+', head '+A.heads[ah]);
    $('si-cap').innerHTML='<b>Layer '+L.layer+'.</b> '+(sh===0?'The long-memory SSM head draws vertical stripes: a few earlier tokens were written into the state strongly (large &Delta; and B) and every later query reads them, barely faded over 48 tokens. Which tokens are read is decided mostly when they are written, not by the query.':'The short-memory SSM head is a band along the diagonal broken into small blocks: it carries the last few tokens and drops them where its decay falls to near zero.')+' The attention head '+(ah===0?'chooses its own earlier tokens for each query: the stripes are short and scattered, because softmax compares every query with every key.':'mostly reads the token just before, one position exactly, where the SSM band smears over several.')+' Same 48 tokens: "'+RD.esc(I.tokens.slice(1,13).join(''))+'..."'}
  const an=BA.anim({tab:TAB,card:'si-map-card',ctl:'si-ctl',n:I.layers.length,draw:drawMaps,ms:1600,label:'Layer'});
  RD.seg($('si-sh'),m=>{sh=+m;an.redraw()});RD.seg($('si-ah'),m=>{ah=+m;an.redraw()});
  // 3. decay per token
  $('si-l').innerHTML=I.layers.map((L,i)=>'<option value="'+i+'">'+L.layer+'</option>').join('');
  function vary(L){const a=BA.dec(L.a_tok),T=a.length/16;let best=0,bv=-1;for(let h=0;h<16;h++){let m=0,q=0;for(let t=0;t<T;t++){const v=a[h*T+t]/255;m+=v;q+=v*v}const sd=q/T-(m/T)*(m/T);if(sd>bv){bv=sd;best=h}}return best}
  function heads(){const L=I.layers[+$('si-l').value],dv=vary(L);$('si-h').innerHTML=L.half_life.map((h,j)=>'<option value="'+j+'"'+(j===dv?' selected':'')+'>'+j+(j===dv?' (most variable)':'')+'</option>').join('')}
  function dec(){const L=I.layers[+$('si-l').value],h=+$('si-h').value,a=BA.dec(L.a_tok),T=a.length/16,vals=[];for(let t=0;t<T;t++)vals.push(a[h*T+t]/255);
    const el=$('si-dec'),W=Math.min(820,RD.width(el)),H=150,l=34,r=16,t0=8,b=24,X=t=>l+(W-l-r)*t/(T-1),Y=v=>t0+(H-t0-b)*(1-v);
    let s='';[0,.5,1].forEach(v=>{s+='<line x1="'+l+'" x2="'+(W-r)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+RD.t(l-4,Y(v)+4,v.toFixed(1),{a:'end',fs:11})});
    s+='<polyline points="'+vals.map((v,t)=>X(t).toFixed(1)+','+Y(v).toFixed(1)).join(' ')+'" fill="none" stroke="var(--c2)" stroke-width="1.4"/>';
    const low=vals.map((v,t)=>[v,t]).sort((p,q)=>p[0]-q[0]).slice(0,5);
    low.forEach(([v,t])=>{s+='<circle cx="'+X(t)+'" cy="'+Y(v)+'" r="3" fill="var(--bad)"/>'});
    [0,64,128,192,255].forEach(t=>{if(t<T)s+=RD.t(X(t),H-8,String(t),{a:'middle',fs:11})});
    el.innerHTML=RD.svg(W,H,s,'decay per token');
    const mn=vals.reduce((p,v)=>p+v,0)/T;
    $('si-dec-say').innerHTML='Head '+h+' of layer '+L.layer+', half-life '+(L.half_life[h]===null?'n/a':L.half_life[h].toFixed(1))+' tokens. Mean a = '+mn.toFixed(3)+', range '+Math.min(...vals).toFixed(3)+' to '+Math.max(...vals).toFixed(3)+'. Strongest forgetting (red) at: '+low.map(([v,t])=>'"'+RD.esc(P[t]!==undefined?P[t]:'').replace(/\n/g,'↵')+'" ('+v.toFixed(2)+')').join(', ')+'. Token t here is the input at position t of the running sequence.'}
  $('si-l').addEventListener('change',()=>{heads();dec()});$('si-h').addEventListener('change',dec);heads();
  function all(){hl();dec();an.redraw()}
  BA.onTab(TAB,all);BA.onResize(TAB,all);
})();
