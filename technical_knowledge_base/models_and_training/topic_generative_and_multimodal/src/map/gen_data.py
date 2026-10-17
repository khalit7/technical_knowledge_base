"""Build the Model map data (parts/36_js_mm_0data.js) from models_*.py, out/hf_meta.json, out/arxiv.json,
inputs/cfg_*.json, inputs/vcfg_*.json and out/component_params.json. Validates every row and prints the derived
numbers the tab's prose quotes. Usage: python3 -I gen_data.py"""
import json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
PARTS = os.path.join(HERE, '..', 'parts')
ns = {}
for f in ('models_a.py', 'models_b.py', 'models_c.py'):
    exec(open(os.path.join(HERE, f)).read(), ns)
ROWS = ns['A'] + ns['B'] + ns['C']
HF = json.load(open(os.path.join(HERE, 'out', 'hf_meta.json')))
AX = json.load(open(os.path.join(HERE, 'out', 'arxiv.json')))
CHECKED = HF['fetched']
FAM = {  # key: (label, short description)
 'ar': ('Autoregressive tokens', 'predicts discrete tokens (image, audio codec) one after another'),
 'pixdiff': ('Pixel diffusion', 'diffusion directly on pixels, often a cascade of resolutions'),
 'ldm': ('Latent diffusion, U-Net', 'diffusion in an autoencoder latent with a convolutional U-Net'),
 'dit': ('Diffusion transformer', 'latent diffusion with a transformer denoiser, noise/v objective'),
 'flow': ('Flow-matching transformer', 'transformer trained with flow matching or rectified flow (MMDiT, single-stream)'),
 'unified': ('Unified generate + understand', 'one model reads and generates images (and more)'),
 'vlmx': ('VLM, cross-attention', 'image features enter the LLM through cross-attention layers'),
 'vlmp': ('VLM, encoder + projector', 'vision encoder, a projector, image tokens in the LLM sequence'),
 'native': ('Native multimodal LLM', 'vision trained into the main model from the start or encoder-free'),
 'enc': ('Vision encoder', 'contrastive, self-supervised or supervised image encoders'),
 'other': ('Other', 'codecs, recognition, non-autoregressive TTS'),
 'na': ('Not disclosed', 'closed model with no published architecture'),
 'lib': ('Library', 'software, not a model'),
}
CAT = {'image': 'Image generation', 'video': 'Video generation', 'audio': 'Audio and speech', 'encoder': 'Vision encoders',
       'vlm': 'Vision-language models', 'native': 'Native multimodal', 'library': 'Libraries'}
ACC = {'osi': 'Open weights, permissive licence', 'restr': 'Open weights with conditions', 'nc': 'Open weights, non-commercial or research only',
       'closed': 'Closed (API or product)', 'paper': 'Paper only, no weights'}
ST = {'current': 'current', 'superseded': 'superseded', 'retired': 'retired or removed'}
JOBS = {
 't2i': ('Generate images from text', None),
 'edit': ('Edit images with instructions or references', ['kontext', 'qimg', 'flux2d', 'flux2k', 'qimg21', 'flux3k', 'nanob', 'gpt4oimg', 'gptimg15', 'himg3', 'bagel']),
 'video': ('Generate video', None),
 'tts': ('Speech synthesis (TTS)', ['bark', 'xtts', 'parler', 'f5', 'kokoro', 'csm', 'dia', 'chatter', 'moshi']),
 'music': ('Music and sound effects', ['musicgen', 'sao', 'sa3']),
 'vlm': ('Answer questions about images (VLM)', ['llama4', 'blip2', 'llava', 'qwenvl', 'internvl', 'idefics', 'paligemma', 'llama32v', 'qwen2vl', 'molmo', 'pixtral', 'smolvlm', 'gemma3', 'kimivl', 'glm45v', 'qwen3vl', 'llava15ov', 'gemma4', 'qwen38', 'gpt4o', 'gemma4u', 'emu3', 'janus', 'bagel']),
 'embed': ('Image-text embeddings, zero-shot labels, retrieval', ['clip', 'openclip', 'siglip', 'siglip2', 'evaclip', 'pe', 'aimv2']),
 'dense': ('Frozen dense features (depth, segmentation, matching)', ['dinov2', 'dinov3', 'sam', 'mae', 'pe']),
 'learn': ('Learn the internals on a laptop', ['sd15', 'pixs', 'sana', 'zimg', 'smolvlm', 'siglip2', 'clip', 'kokoro', 'showo', 'wan21']),
}
errs = []
ids = set()
for r in ROWS:
    for k in ('id', 'n', 'c', 'o', 'fam', 'obj', 'size', 'acc', 'lic', 'st', 'what', 'v', 'src', 'ev'):
        if k not in r: errs.append('%s missing %s' % (r.get('id'), k))
    if r['id'] in ids: errs.append('duplicate ' + r['id'])
    ids.add(r['id'])
    if r['fam'] not in FAM: errs.append('%s bad fam %s' % (r['id'], r['fam']))
    if r['acc'] not in ACC: errs.append('%s bad acc' % r['id'])
    if r['c'] not in CAT: errs.append('%s bad cat' % r['id'])
    if r['st'] not in ST: errs.append('%s bad st' % r['id'])
    h = r.get('hf')
    if h:
        m = HF['repos'].get(h)
        if not m or 'error' in m: errs.append('%s hf missing %s' % (r['id'], h)); continue
        r['hfm'] = {'created': m['createdAt'], 'lic': m.get('license_name') or m.get('license'), 'gated': m.get('gated'),
                    'params': m.get('st_total'), 'dl': m.get('downloads'), 'likes': m.get('likes')}
        if not r.get('d'): r['d'] = m['createdAt']; r['dk'] = 'HF repo created'
    a = r.get('ax')
    if a:
        p = AX['papers'].get(a)
        if not p: errs.append('%s arxiv missing %s' % (r['id'], a))
        else:
            r['axm'] = {'t': p['title'], 'd': p['published']}
            if r.get('dk', '').startswith('paper v1') and r['d'] != p['published']:
                errs.append('%s paper date %s != arXiv %s' % (r['id'], r['d'], p['published']))
    if not re.match(r'^\d{4}-\d{2}-\d{2}$', r.get('d', '')): errs.append('%s bad date %r' % (r['id'], r.get('d')))
    if re.search('—', json.dumps(r, ensure_ascii=False)): errs.append('%s em dash' % r['id'])
for j, (lab, lst) in JOBS.items():
    for i in lst or []:
        if i not in ids: errs.append('job %s unknown id %s' % (j, i))
if errs:
    print('\n'.join(errs)); sys.exit(1)
for r in ROWS:
    js = [j for j, (lab, lst) in JOBS.items() if (lst and r['id'] in lst)]
    if r['c'] == 'image' and r['acc'] != 'paper': js.append('t2i')
    if r['c'] == 'video' and r['acc'] != 'paper': js.append('video')
    r['jobs'] = js
# ---- stacks for the before/after animation (from configs and safetensors headers) ----
CP = json.load(open(os.path.join(HERE, 'out', 'component_params.json')))
def cfg(rp): return json.load(open(os.path.join(HERE, 'inputs', 'cfg_' + rp.replace('/', '__') + '.json')))
T2I = [('sd15', 'stable-diffusion-v1-5/stable-diffusion-v1-5'), ('sdxl', 'stabilityai/stable-diffusion-xl-base-1.0'),
       ('pixs', 'PixArt-alpha/PixArt-Sigma-XL-2-1024-MS'), ('sana', 'Efficient-Large-Model/Sana_1600M_1024px_diffusers'),
       ('qimg', 'Qwen/Qwen-Image'), ('zimg', 'Tongyi-MAI/Z-Image-Turbo')]
byid = {r['id']: r for r in ROWS}
stack = []
for rid, rp in T2I:
    c = cfg(rp); p = CP[rp]; den = 'unet' if 'unet' in c else 'transformer'
    te = [k for k in ('text_encoder', 'text_encoder_2') if k in c]
    te_names = [(c[k].get('architectures') or ['?'])[0] for k in te]
    te_p = sum(p[k]['params'] for k in te)
    v = c['vae']; vcls = v['_class_name']
    if vcls == 'AutoencoderKL':
        ch = v['latent_channels']; down = 2 ** (len(v['block_out_channels']) - 1)
        sf = v.get('scaling_factor') or 0.18215; sh = v.get('shift_factor')
    elif vcls == 'AutoencoderDC':
        ch = v['latent_channels']; down = 32; sf = v.get('scaling_factor'); sh = None  # f32 per the DC-AE repo name (dc-ae-f32c32)
    else:
        ch = v['z_dim']; down = 2 ** (len(v['dim_mult']) - 1); sf = None; sh = None  # per-channel latents_mean/std instead
    s = c['scheduler']
    obj = 'flow matching' if (s['_class_name'].startswith('FlowMatch') or s.get('prediction_type') == 'flow_prediction') else \
          ('diffusion, ' + (s.get('prediction_type') or 'epsilon') + ' prediction')
    tot = p[den]['params'] + te_p + p['vae']['params']
    stack.append({'id': rid, 'name': byid[rid]['n'], 'date': byid[rid]['d'], 'repo': rp,
      'te': ' + '.join(te_names), 'teP': te_p, 'vae': vcls, 'ch': ch, 'down': down, 'sf': sf, 'sh': sh, 'vaeP': p['vae']['params'],
      'den': c[den]['_class_name'], 'denP': p[den]['params'], 'fam': byid[rid]['fam'], 'obj': obj, 'sched': s['_class_name'],
      'tot': tot, 'lic': byid[rid]['lic'], 'acc': byid[rid]['acc'],
      'tok1024': (1024 // down) ** 2 // ((2 if den == 'transformer' and vcls != 'AutoencoderDC' else 1) ** 2) if den == 'transformer' else None})
# image tokens a 1024x1024 image becomes for a transformer denoiser: (1024/down)^2 latent positions, / patch^2
for s_ in stack:
    if s_['den'] == 'UNet2DConditionModel': s_['tok1024'] = None
def vc(rp): return json.load(open(os.path.join(HERE, 'inputs', 'vcfg_' + rp.replace('/', '__') + '.json')))
l = vc('llava-hf/llava-1.5-7b-hf'); q = vc('Qwen/Qwen2-VL-7B-Instruct'); sm = vc('HuggingFaceTB/SmolVLM-Instruct')
g31 = vc('google/gemma-4-31B-it'); g12 = vc('google/gemma-4-12B-it')
vstack = [
 {'id': 'llava', 'name': 'LLaVA-1.5 7B', 'enc': 'CLIP ViT-L/14 at %d px, %d layers' % (l['vision_config']['image_size'], l['vision_config']['num_hidden_layers']),
  'conn': '2-layer MLP (%s), features from layer %d' % (l['projector_hidden_act'], l['vision_feature_layer']),
  'tok': (l['vision_config']['image_size'] // l['vision_config']['patch_size']) ** 2, 'tokNote': '(336/14)^2 = 576, fixed resolution',
  'llm': 'Vicuna 7B (Llama)', 'fam': 'vlmp'},
 {'id': 'qwen2vl', 'name': 'Qwen2-VL 7B', 'enc': 'ViT, %d layers, width %d, native resolution' % (q['vision_config']['depth'], q['vision_config']['embed_dim']),
  'conn': 'merge %dx%d neighbouring patches, MLP' % (q['vision_config']['spatial_merge_size'], q['vision_config']['spatial_merge_size']),
  'tok': (448 // (q['vision_config']['patch_size'] * q['vision_config']['spatial_merge_size'])) ** 2, 'tokNote': 'for a 448x448 image: (448/28)^2 = 256; grows with resolution',
  'llm': 'Qwen2 7B (%d layers)' % q['num_hidden_layers'], 'fam': 'vlmp'},
 {'id': 'smolvlm', 'name': 'SmolVLM 2.2B', 'enc': 'SigLIP, %d layers, %d px tiles' % (sm['vision_config']['num_hidden_layers'], sm['vision_config']['image_size']),
  'conn': 'pixel shuffle, scale %d, then a linear layer' % sm['scale_factor'], 'tok': sm['image_seq_len'], 'tokNote': 'per 384 px tile: 729 patches / 3^2 = 81',
  'llm': 'SmolLM2 1.7B (%d layers)' % sm['text_config']['num_hidden_layers'], 'fam': 'vlmp'},
 {'id': 'gemma4', 'name': 'Gemma 4 31B', 'enc': 'ViT, %d layers, width %d (about 550M, card)' % (g31['vision_config']['num_hidden_layers'], g31['vision_config']['hidden_size']),
  'conn': '3x3 pooling, projection', 'tok': g31['vision_soft_tokens_per_image'], 'tokNote': 'default soft tokens per image (config)',
  'llm': 'Gemma 4 31B (%d layers)' % g31['text_config']['num_hidden_layers'], 'fam': 'vlmp'},
 {'id': 'gemma4u', 'name': 'Gemma 4 12B Unified', 'enc': 'none: 16 px patches go straight in', 'conn': '3x3 pooling to %d px patches, linear to width %d' % (g12['vision_config']['model_patch_size'], g12['vision_config']['mm_embed_dim']),
  'tok': g12['vision_config']['num_soft_tokens'], 'tokNote': 'default soft tokens per image (config)', 'llm': 'Gemma 4 12B (%d layers)' % g12['text_config']['num_hidden_layers'], 'fam': 'native'},
]
for v in vstack: v['date'] = byid[v['id']]['d']; v['lic'] = byid[v['id']]['lic']
out = {'checked': CHECKED, 'fam': FAM, 'cat': CAT, 'acc': ACC, 'st': ST, 'jobs': {k: v[0] for k, v in JOBS.items()},
       'rows': ROWS, 'stack': stack, 'vstack': vstack}
js = '// ---- Model map data (t-map). Generated by src/map/gen_data.py from checked sources; do not edit by hand ----\nwindow.MM_DATA=' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n'
open(os.path.join(PARTS, '36_js_mm_0data.js'), 'w').write(js)
json.dump(out, open(os.path.join(HERE, 'out', 'mm_data.json'), 'w'), ensure_ascii=False, indent=1)
print('rows', len(ROWS), 'bytes', len(js.encode()))
from collections import Counter
print('by cat', Counter(r['c'] for r in ROWS)); print('by acc', Counter(r['acc'] for r in ROWS)); print('by st', Counter(r['st'] for r in ROWS))
print('secondary', sum(r['ev'] == 'secondary' for r in ROWS))
for s_ in stack: print(s_['name'], s_['date'], s_['te'], round(s_['teP']/1e9, 3), s_['vae'], s_['ch'], s_['down'], s_['sf'], s_['den'], round(s_['denP']/1e9, 3), s_['obj'], round(s_['tot']/1e9, 2), 'bf16 GB', round(2*s_['tot']/1e9, 1), 'tok1024', s_['tok1024'])
for v in vstack: print(v['name'], v['tok'], v['enc'], '|', v['conn'], '|', v['llm'])
