// ---- Scene, Fig. 3: nvcc as a driver. The real nvcc --dryrun commands for the row softmax (window.CSD.dryrun, -arch=sm_90a, 11 commands;
// window.CSD.dryrun_sm90, -arch=sm_90, 8), one box per program, one slab per file it writes (height on a log scale of the --keep size,
// window.CSD.keep), dots flowing along each file's path; lanes in depth: host (blue), the generic compute_90 pass (purple),
// the Hopper-specific compute_90a pass (teal), SASS (orange). Steps are explained by #sx-nvcc / #sx-nvccp on the left. ----
(function(){
  if(!document.getElementById('stg-nvcc'))return;const {at,mix}=S3,D=window.CSD,E=RD.esc;
  const keep={};D.keep.forEach(k=>keep[k[0]]=+k[1]);
  const kb=n=>n>=1e6?(n/1e6).toFixed(2)+' MB':n>=1e3?(n/1e3).toFixed(1)+' KB':n+' B';
  const ZH=1.9,ZG=0,ZA=-1.9;  // lanes: host, generic compute_90, specific compute_90a
  // tools: [id, x, z, name, lane]; files: [id, x, z, short name, keep file (size) or null, lane]
  const TOOLS={H1:[-3.8,ZH,'gcc -E','h'],H2:[-1.8,ZH,'cudafe++','h'],G1:[-3.8,ZG,'gcc -E','g'],G2:[-1.8,ZG,'cicc','g'],G3:[.3,ZG,'ptxas','g'],
    A1:[-3.8,ZA,'gcc -E','a'],A2:[-1.8,ZA,'cicc','a'],A3:[.3,ZA,'ptxas','a'],F:[2.6,ZG,'fatbinary','f'],H3:[4.9,ZH,'gcc -c','h']};
  const FILES={ii_h:[-2.8,ZH,'.cpp4.ii','softmax.cpp4.ii','h'],cpp:[-.7,ZH,'.cudafe1.cpp','softmax.compute_90a.cudafe1.cpp','h'],stub:[.7,ZH,'.stub.c','softmax.compute_90a.cudafe1.stub.c','h'],
    ii_g:[-2.8,ZG,'.cpp1.ii','softmax.compute_90.cpp1.ii','g'],ptx_g:[-.8,ZG,'compute_90.ptx','softmax.compute_90.ptx','g'],
    ii_a:[-2.8,ZA,'.cpp1.ii','softmax.compute_90a.cpp1.ii','a'],ptx_a:[-.8,ZA,'compute_90a.ptx','softmax.compute_90a.ptx','a'],cub_a:[1.4,ZA,'sm_90a.cubin','softmax.compute_90a.sm_90a.cubin','s'],
    cub_g:[1.4,ZG,'sm_90.cubin',null,'s'],fatc:[3.8,.85,'.fatbin.c','softmax.fatbin.c','f'],o:[6.1,ZH,'softmax.o','softmax.o','h']};
  // per mode, per step: tools and files that act, flows [from, to], the commands (1-based) the step covers, the images packed
  const M={
    a:{list:'sx-nvcc',cmds:()=>D.dryrun,steps:[
      {t:['H1','H2'],f:['ii_h','cpp','stub'],fl:[['src','H1'],['H1','ii_h'],['ii_h','H2'],['H2','cpp'],['H2','stub']],c:[1,2]},
      {t:['G1','G2'],f:['ii_g','ptx_g'],fl:[['src','G1'],['G1','ii_g'],['ii_g','G2'],['G2','ptx_g']],c:[3,4]},
      {t:['G3'],f:[],fl:[['ptx_g','G3']],c:[5],check:1},
      {t:['A1','A2'],f:['ii_a','ptx_a'],fl:[['src','A1'],['A1','ii_a'],['ii_a','A2'],['A2','ptx_a']],c:[6,7]},
      {t:['A3'],f:['cub_a'],fl:[['ptx_a','A3'],['A3','cub_a']],c:[8]},
      {t:['F'],f:['fatc'],fl:[['ptx_g','F'],['cub_a','F'],['ptx_a','F'],['F','fatc']],c:[9,10],img:[['PTX compute_90','g'],['SASS sm_90a','s'],['PTX compute_90a','a']]},
      {t:['H3'],f:['o'],fl:[['cpp','H3'],['stub','H3'],['fatc','H3'],['H3','o']],c:[11]}]},
    p:{list:'sx-nvccp',cmds:()=>D.dryrun_sm90,steps:[
      {t:['H1','H2'],f:['ii_h','cpp','stub'],fl:[['src','H1'],['H1','ii_h'],['ii_h','H2'],['H2','cpp'],['H2','stub']],c:[1,2]},
      {t:['G1','G2'],f:['ii_g','ptx_g'],fl:[['src','G1'],['G1','ii_g'],['ii_g','G2'],['G2','ptx_g']],c:[3,4]},
      {t:['G3'],f:['cub_g'],fl:[['ptx_g','G3'],['G3','cub_g']],c:[5]},
      {t:['F'],f:['fatc'],fl:[['cub_g','F'],['ptx_g','F'],['F','fatc']],c:[6,7],img:[['SASS sm_90','s'],['PTX compute_90','g']]},
      {t:['H3'],f:['o'],fl:[['cpp','H3'],['stub','H3'],['fatc','H3'],['H3','o']],c:[8]}]}};
  let mode='a';
  // the step at which each object first acts, in the current mode (-1: not in this mode)
  function firstStep(id){const S=M[mode].steps;for(let i=0;i<S.length;i++)if(S[i].t.includes(id)||S[i].f.includes(id))return i;return -1}
  const fh=b=>b?.06+.085*Math.max(0,Math.log10(b)-1):.16;  // slab height: log scale of the size
  const pos=id=>id==='src'?[-5.4,0,ZG]:TOOLS[id]?[TOOLS[id][0],0,TOOLS[id][1]]:[FILES[id][0],0,FILES[id][1]];
  const top=id=>{const p=pos(id);return [p[0],id==='src'?.42:TOOLS[id]?(id==='F'?.62:.46):fh(FILES[id][3]&&keep[FILES[id][3]])+.02,p[2]]};
  function draw(R,k,e){const P=R.P,S=M[mode].steps,col={h:P.c1,g:P.c4,a:P.c6,s:P.c2,f:P.ink},W=R.W,H=R.H;R.grid(-6,6.8,-2.6,2.6,.5);
    // a label only where its anchor is on the canvas (labels are clamped to the card; one whose object is out of view would point at nothing)
    const lab=(p,t,o)=>{const q=R.p(p);if(q[0]<6||q[0]>W-6||q[1]<6||q[1]>H-6)return;R.label(p,t,o)};
    // objects fade out as they reach the card's edge, so a close-up never shows a box cut by the frame
    const edge=(c,sz)=>{let m=1e9;for(let i=0;i<8;i++){const q=R.p([c[0]+(i&1?.5:-.5)*sz[0],c[1]+(i&2?sz[1]:0),c[2]+(i&4?.5:-.5)*sz[2]]);m=Math.min(m,q[0],W-q[0],q[1],H-q[1])}return Math.max(0,Math.min(1,(m-4)/26))};
    const alpha=s=>s<0?0:s<k?.32:s===k?(s===0&&k===0?1:Math.max(.12,e)):.12;  // done recede, the step's objects arrive, later ones faint
    // the source, feeding every gcc -E
    {const f=edge([-5.4,0,ZG],[.7,.42,.7]);R.box([-5.4,0,ZG],[.7,.42,.7],{fill:mix(P.paper,P.c3,.3),a:f});if(f>.5)lab([-5.4,.42,ZG-.35],'softmax.cu',{mono:true,fs:12.5,b:1,dy:-10,c:P.c3,wide:1})}
    // the lane at work is named at its front-left end (blue host, purple compute_90, teal compute_90a)
    const act=new Set(S[k].t.map(t=>TOOLS[t][3]));
    [[ZH,'h','host'],[ZG,'g','compute_90'],[ZA,'a','compute_90a']].forEach(([z,l,nm])=>{if(act.has(l))lab([-4.3,0,z+.31],nm+' pass',{mono:true,fs:12,al:'right',dx:-4,dy:10,c:col[l],a:e,wide:1})});
    Object.entries(TOOLS).forEach(([id,[x,z,nm,l]])=>{const s=firstStep(id);if(s<0)return;const a=alpha(s)*edge([x,0,z],[.9,.9,.8]),c=l==='f'?P.c5:col[l];
      if(id==='F'){const imgs=(S[s].img||[]);R.box([x,0,z],[.9,.62,.8],{fill:mix(P.paper,c,.28),a});
        // the images packed: one thin coloured layer each, on top of the box
        imgs.forEach(([t,l2],j)=>R.box([x,.62+j*.11,z],[.8,.09,.7],{fill:col[l2],a:a*(s<=k?at(k,e,s):0),shadow:false}));
        if(s<=k&&a>.1){lab([x,.62+imgs.length*.11,z-.4],'fatbinary',{mono:true,fs:12.5,b:1,dy:-17,a:Math.max(a,.6)});
          if(s===k)imgs.forEach(([t,l2],j)=>lab([x+.45,.66+j*.11,z],t,{mono:true,fs:12,al:'left',dx:8,c:col[l2],grp:'img',a:e}))}
        return}
      R.box([x,0,z],[.84,.46,.62],{fill:mix(P.paper,c,.22),a});
      if(s===k&&a>.1)lab([x,.46,z-.31],nm,{mono:true,fs:12.5,b:1,dy:-17,a:Math.max(a,.6)})});
    Object.entries(FILES).forEach(([id,[x,z,nm,kf,l]])=>{const s=firstStep(id);if(s<0)return;const b=kf&&keep[kf],h=fh(b),y=0,a=alpha(s)*edge([x,0,z],[.56,h,.46]);
      R.box([x,y,z],[.56,h,.46],{fill:l==='f'?P.c5:col[l],a:a*.9});
      if(s===k&&a>.1)lab([x,0,z+.23],nm+(b&&mode==='a'?' · '+kb(b):''),{mono:true,fs:12,dy:12,c:l==='f'?P.c5:col[l],a:e,wide:S[k].f[S[k].f.length-1]===id?0:1})});
    // flows on the step's paths, coloured by what moves
    const st=S[k];st.fl.forEach(([a0,b0])=>{const A=top(a0),B=top(b0),l=a0==='src'?'h':(TOOLS[a0]||FILES[a0])[TOOLS[a0]?3:4],c=a0==='src'?P.c3:l==='f'?P.c5:col[l];
      const d=Math.hypot(B[0]-A[0],B[2]-A[2]);R.flowArc(A,B,.18+.06*d,{c,a:Math.min(1,e*1.6),r:.06,speed:1.4})});
    if(st.check&&k>=0){const g=top('G3');lab([g[0],0,g[2]+.31],'checked, no output',{fs:12,dy:13,c:P.c4,a:e})}
  }
  // per step the camera frames the lane at work, wide and shallow like the card; the last step shows the whole build
  const VA=[[-6,0,-2.6],[6.8,1,2.6]];
  const views={a:[[[-6,0,-.5],[1.6,.6,2.9]],[[-6,0,-1.1],[1.2,.6,1.1]],[[-3,0,-1.3],[3.4,.6,1.3]],[[-6,0,-2.9],[1.2,.6,.5]],[[-3,0,-2.9],[3.4,.6,-.6]],[[-1.6,0,-2.6],[4.8,1.1,1.3]],VA],
    p:[[[-6,0,-.5],[1.6,.6,2.9]],[[-6,0,-1.1],[1.2,.6,1.1]],[[-3,0,-1.3],[3.4,.6,1.3]],[[-1.6,0,-1.4],[4.8,1.1,1.6]],VA]};
  function readout(k){const S=M[mode].steps[k],C=M[mode].cmds();
    document.getElementById('cs-nvccWhich').textContent='Command'+(S.c.length>1?'s ':' ')+S.c.join(' and ')+' of '+C.length+', as nvcc --dryrun printed '+(S.c.length>1?'them':'it')+' (each cut at 300 characters):';
    document.getElementById('cs-nvccCmd').textContent=S.c.map(i=>{const c=C[i-1];return c.length>300?c.slice(0,300)+' ...':c}).join('\n\n')}
  const full=[[-6,0,-2.6],[6.8,1,2.6]];
  const st=S3.stage({id:'stg-nvcc',list:'sx-nvcc',fig:'Fig. 3 · the programs nvcc runs, and the files they write',cam:[.12,.95],bounds:full,aspect:.5,dur:1400,hold:5200,draw,
    margin:w=>w<520?[16,10,16,10]:[24,18,24,18],
    view:k=>({cam:[.12,.95],bounds:views[mode][Math.min(k,views[mode].length-1)]}),
    onStep:k=>{try{readout(k)}catch(e){}}});
  (window.CSSTG=window.CSSTG||{})['stg-nvcc']=st;
  RD.seg(document.getElementById('cs-nvccMode'),m=>{mode=m;document.getElementById('sx-nvcc').hidden=m!=='a';document.getElementById('sx-nvccp').hidden=m!=='p';st.list(M[m].list)});
})();
