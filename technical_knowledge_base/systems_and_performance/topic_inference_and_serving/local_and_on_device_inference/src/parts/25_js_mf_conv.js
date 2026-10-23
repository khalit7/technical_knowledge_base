// ---- Reading section 3: the conversion map ----
(function(){
  const $=id=>document.getElementById(id);if(!$('mf-cv-nodes'))return;const E=RD.esc,c=MFU.c;
  const N=[['pkl','PyTorch pickle','.bin / .pt','var(--c2)'],['st','HF safetensors','BF16, the original','var(--c1)'],['ggbf','GGUF BF16','one file, lossless','var(--c3)'],['ggf16','GGUF F16','','var(--c3)'],['ggq','GGUF Q4_K_M','quantized','var(--c3)'],
    ['mlx','MLX 4-bit','safetensors + config','var(--c5)'],['ct','compressed-tensors','FP8, W4A16, NVFP4','var(--c1)'],['onnx','ONNX','graph + weights','var(--c4)'],['trt','TensorRT engine','compiled plan','var(--c6)'],
    ['ov','OpenVINO IR','.xml + .bin','var(--c6)'],['cml','Core ML','.mlpackage','var(--c6)'],['pte','ExecuTorch','.pte','var(--c6)'],['tfl','LiteRT','.tflite / .litertlm','var(--c6)']];
  const cv=MF.conv,q=MF.quant,mc=MF.mlxconv,o6=MF.onnx_06,cmp=MF.cmp.files;
  const L='lossless',Y='lossy',K='kept';
  const ED=[
   ['pkl','st',L,'<code>safetensors.torch.save_file(torch.load(path, weights_only=True), out)</code>, or the Hub\'s convert space','Pure re-serialization. Run the load inside a sandbox if the source is untrusted.','Run here in reverse (torch.save of the safetensors tensors) to make the pickle file for the load test in section 3.'],
   ['st','ggbf',L,'<code>python convert_hf_to_gguf.py Qwen3-0.6B/ --outtype bf16</code>','Tokenizer, template and generation defaults are copied into the file; llama.cpp b11146 also writes general.sampling.* keys.','Run here twice: '+cv.filter(x=>x.run.startsWith('bf16')).map(x=>(+x.seconds).toFixed(1)+' s').join(' and ')+', '+c(cv[0].bytes)+' bytes, identical SHA-256 ('+cv[0].sha256.slice(0,12)+'...). All '+cmp.ours_bf16.tensors_exact+' tensors bit-identical to the original after decoding.'],
   ['st','ggf16',Y,'<code>... --outtype f16</code>','F16 has 5 exponent bits: tiny BF16 values lose bits or become zero.','Run here: '+c(cmp.ours_f16.values_diff)+' values changed, largest by '+cmp.ours_f16.max_abs_diff.toExponential(1)+'; '+c(MF.cmp.f16_representability.flushed_to_zero)+' became zero.'],
   ['ggbf','ggq',Y,'<code>llama-quantize in-bf16.gguf out.gguf Q4_K_M</code> (add <code>--imatrix</code> for i-quants)','Quality per type: section 5. Quantize from BF16/F32, never from another quant.','Run here: '+q.map(x=>x.src+' '+(+x.s).toFixed(1)+' s, '+c(x.bytes)+' bytes').join('; ')+'. Re-running on the store\'s BF16 file reproduced its Q4_K_M byte for byte. Ours is bigger because it keeps the separate output tensor (Q6_K).'],
   ['st','mlx',Y,'<code>python -m mlx_lm convert --hf-path Qwen3-0.6B -q --q-bits 4 --q-group-size 64</code>','Writes config "quantization" and a separate chat_template.jinja; keeps tied weights once.','Run here twice: '+mc.map(x=>(+x.seconds).toFixed(1)+' s').join(' and ')+', '+c(mc[0].bytes)+' bytes, same SHA-256 as the store\'s copy from 2026-10-08.'],
   ['st','ct',Y,'llm-compressor (<code>oneshot</code> with a recipe: FP8 dynamic, W4A16 GPTQ/AWQ, NVFP4)','Still safetensors; config.json gains quantization_config with quant_method compressed-tensors. What vLLM and SGLang load.','Not run here: the useful targets (FP8, NVFP4 kernels) need NVIDIA GPUs.'],
   ['st','onnx',K,'<code>torch.onnx.export(model, args, dynamo=True)</code> or Optimum','Numbers kept in F32 (BF16 widens exactly); tokenizer, template and sampling defaults are not in the graph; no KV cache unless you export one.','Run here: '+c(o6.n_nodes)+' operators, opset '+o6.opset[0][1]+', '+MFU.fmtB(o6.files['qwen3_06b.onnx.data'])+' external data, '+o6.export_seconds.toFixed(0)+' s; ONNX Runtime matched PyTorch within '+o6.max_abs_diff.toExponential(1)+'.'],
   ['st','trt',Y,'TensorRT-LLM: PyTorch backend reads safetensors directly (no engine); legacy <code>trtllm-build</code> in v1.2.x only','The plan is tied to GPU type and TensorRT version.','Not run here: needs an NVIDIA GPU.'],
   ['onnx','trt',Y,'<code>trtexec --onnx=model.onnx --saveEngine=model.plan</code>','The route for encoders and vision models, not for LLMs.','Not run here: needs an NVIDIA GPU.'],
   ['onnx','ov',K,'OpenVINO reads ONNX directly, or <code>ovc model.onnx</code> to save IR; NNCF to compress weights','PyTorch models go through openvino.convert_model in Python instead.','Not run here: Intel toolchain.'],
   ['st','cml',Y,'coremltools: <code>ct.convert(torch.export(...))</code>, then palettize or quantize','Produces an ML program (.mlpackage); compiled to .mlmodelc on device.','Not run here: an app-packaging route, out of scope for serving.'],
   ['st','pte',Y,'<code>torch.export</code> then <code>to_edge_transform_and_lower(...).to_executorch()</code>','Backend delegates (XNNPACK, Core ML, Qualcomm ...) are baked into the program.','Not run here.'],
   ['st','tfl',Y,'the Generative Torch API to .tflite or .litertlm','.litertlm bundles graph, weights, tokenizer and metadata.','Not run here.'],
   ['ggq','st',Y,'Dequantize (gguf-py, or loaders that read GGUF)','Gives a rounded shadow of the model, never the original.','Not run here; section 4 decodes one block by hand.']];
  const EC={lossless:'var(--good)',lossy:'var(--bad)',kept:'var(--c4)'};
  const LBL={lossless:'lossless',lossy:'lossy',kept:'numbers kept, other things lost'};
  let sel='ggbf';
  function draw(){const rel=ED.filter(e=>e[0]===sel||e[1]===sel),touch=new Set(rel.flatMap(e=>[e[0],e[1]]));
    $('mf-cv-nodes').innerHTML=N.map(n=>'<button data-n="'+n[0]+'" style="--sc:'+n[3]+'" class="'+(n[0]===sel?'sel':touch.has(n[0])?'':'dim')+'"><b>'+n[1]+'</b><span>'+n[2]+'</span></button>').join('');
    const nm=id=>N.find(n=>n[0]===id)[1];
    $('mf-cv-edges').innerHTML='<h3>'+E(nm(sel))+': '+rel.length+' route'+(rel.length===1?'':'s')+'</h3>'+rel.map(e=>'<div class="edge" style="--ec:'+EC[e[2]]+'"><div class="h">'+E(nm(e[0]))+' &rarr; '+E(nm(e[1]))+'<span class="lab" style="color:'+EC[e[2]]+'">'+LBL[e[2]]+'</span></div><div>'+e[3]+'</div><div class="small">'+e[4]+'</div><div class="small">'+e[5]+'</div></div>').join('')}
  $('mf-cv-nodes').addEventListener('click',ev=>{const b=ev.target.closest('button[data-n]');if(b){sel=b.dataset.n;draw()}});
  draw();
  // sizes
  const SZ=[['HF safetensors BF16','as released, lm_head stored twice',MF.st.hf06.size,'var(--c1)'],['GGUF BF16, ours','output kept',+cv[0].bytes,'var(--c3)'],['GGUF BF16, Unsloth','output dropped',MF.gg.bf16.size,'var(--c3)'],
    ['GGUF Q8_0','made here from Unsloth BF16',MF.gg.q8.size,'var(--c3)'],['GGUF Q4_K_M, ours','output kept (Q6_K)',+q[1].bytes,'var(--c3)'],['GGUF Q4_K_M, Unsloth base','output dropped',+q[0].bytes,'var(--c3)'],
    ['MLX 4-bit, group 64','made here',MF.st.mlx4.size,'var(--c5)'],['ONNX F32','graph + external data',o6.files['qwen3_06b.onnx']+o6.files['qwen3_06b.onnx.data'],'var(--c4)']];
  MFU.bars($('mf-cv-sizes'),SZ.map(s=>({nm:s[0],ml:s[1],v:s[2],col:s[3],txt:MFU.fmtB(s[2])})));
})();
