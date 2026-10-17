# Vision encoders page: verified facts (key ve, 2026-10-17)

Also appended to the topic's shared FACTS.md (scratch) under "ve". Measured numbers: Apple M1 Pro CPU, float32, 4 threads; recorded in `out/*.json`.

## Models added on this page (Hub API, 2026-10-17)
- facebook/dinov2-base @ f9e44c814b77203eaa57a6bdbbd535f21ede1415, Apache 2.0, 86,580,480 parameters (measured); processor: shortest edge 256 bicubic, centre crop 224, ImageNet mean/std; position table for 518 px (37 x 37), interpolated to 16 x 16 at 224.
- facebook/dinov2-with-registers-base @ a1d738ccfa7ae170945f210395d99dde8adb1805, Apache 2.0, 4 register tokens (config num_register_tokens 4).
- facebook/vit-mae-base @ 25b184bea5538bf5c4c852c79d221195fdd2778d, Apache 2.0 (already in the HF cache); loaded with mask_ratio 0.0.
- facebook/dinov3-* checkpoints are gated (manual approval), licence "other" (DINOv3 licence); not run.

## Source lines (transformers v5.20.1, commit 0ea877911a11)
- clip/modeling_clip.py:161 interpolate_pos_encoding, :194 mode="bicubic"; :206 the ValueError "Input image size (...) doesn't match model (...)"; :641 pooled_output = last_hidden_state[:, 0, :]; :941 visual_projection.
- siglip/modeling_siglip.py:137 interpolate_pos_encoding (:168 bicubic); :622 SiglipMultiheadAttentionPoolingHead (learned probe query).
- dinov2/modeling_dinov2.py:87 interpolate_pos_encoding (:119 bicubic); :254 Dinov2SwiGLUFFN (hidden = 2/3 of D x mlp_ratio rounded up to a multiple of 8; giant uses it).
- dinov2_with_registers/modeling_dinov2_with_registers.py:89 register_tokens; :149 [CLS], registers, patches order.
- vit_mae/modeling_vit_mae.py:273 initialize_weights builds a frozen 2-D sine-cosine table; :264 random_masking always called (shuffles patches even at mask_ratio 0).
- llava/modeling_llava.py:166-168 hidden_states[vision_feature_layer], default strategy drops [CLS].
- siglip2/image_processing_siglip2.py:42 get_image_size_for_max_num_patches (NaFlex); qwen2_vl/image_processing_qwen2_vl.py:63 smart_resize. JS ports match both on 59 test cases (out/recompute.json, check_calc.mjs).

## Published (read from arXiv HTML on 2026-10-17; transcribed in inputs/published.json)
- DINOv2 (2304.07193) Table 4 frozen ImageNet-1k: DINOv2 B/14 kNN 82.1 / linear 84.5; MAE ViT-H/14 49.4 / 76.6; CLIP ViT-L/14 79.8 / 84.3 (336: 80.5 / 85.3); all run with the authors' code. Table 10 ADE20K linear mIoU: DINOv2 B/14 47.3, OpenCLIP G/14 39.3, MAE H/14 33.3. LVD-142M; ViT-g 1.1B.
- Registers (2309.16588): outliers "roughly 10x higher norm", "around 2%"; in DINOv2 "with models larger than and including ViT-Large"; also in their OpenCLIP ViT-B/16 and DeiT-III B; Table 2a DINOv2 (ViT-L, ImageNet-22k) ADE20k 46.6 -> 47.9 with registers, ImageNet 84.3 -> 84.8; kept 4 registers.
- DINOv3 (2508.10104) Table 2: ViT-7B 6.7B params, 40 blocks, patch 16, RoPE, 4 registers, width 4096, SwiGLU hidden 8192; LVD-1689M; global crops 256 px; Gram anchoring.
- MAE (2111.06377): linear probe ViT-B 68.0, L 75.8, H 76.6 (Table 12); fine-tuned ViT-B 83.6; class token is "an auxiliary dummy token"; "works similarly well without this token (with average pooling)".
- SigLIP 2 (2502.14786) Table 1, B/16 at 224: ImageNet zero-shot CLIP 68.3, SigLIP 76.2, SigLIP 2 78.2; COCO T->I / I->T 33.1/52.4, 47.2/64.5, 52.1/68.9; Flickr 62.1/81.9, 77.9/89.6, 80.7/93.0. Table 2 ADE20K: SigLIP So/14 224 37.6, SigLIP 2 41.8. WebLI 10B images, 12B alt-texts, 109 languages, 90% English. Fixed-res checkpoints: resume at 95%, resize position embedding. NaFlex default max_num_patches 256 (preprocessor_config of siglip2-so400m-patch16-naflex).
- LAION-5B (2210.08402): 5.85B pairs; OpenAI CLIP ViT-B/32 cosine >= 0.28 English, >= 0.26 other; removed about 90% of 50B.
- DataComp (2304.14108): CommonPool 12.8B; best filter +6.9 pp; DataComp-1B 1.4B (image-based intersect CLIP score L/14 30%) -> ViT-L/14 79.2%, +3.7 pp over OpenAI CLIP L/14.
- MetaCLIP (2309.16671): 500k entries, cap 20k; ViT-B/32 fixed steps 57.4 raw English, 60.8 unbalanced, 65.5 MetaCLIP, WIT 63.4, LAION-400M 60.0. Quotes CLIP: "500,000 queries", "up to 20,000 (image, text) pairs per query".
- ALIGN (2102.05918): 1.8B pairs, "only minimal frequency-based filtering". LiT (2111.07991): ViT-g/14 locked 85.2%. DeiT (2012.12877): 86M, 83.1%, under 3 days on one computer.
- Qwen2.5-VL (2502.13923 sec. 2.1.1): 2D-RoPE, window attention, "only four layers employ full self-attention", window 112 x 112; config depth 32, width 1280, patch 14, merge 2, fullatt [7, 15, 23, 31]; max_pixels 12,845,056.
- PaliGemma (2407.07726 sec. 3.1): SigLIP So400m, "(zero initialized) linear projection".
- Perception Encoder (2504.13181, Bolya et al.): best embeddings "hidden within the intermediate layers".
- timm cards: ViT-B/16 224 GMACs 16.9 (matches the count without attention scores), DINOv2 B/14 518 GMACs 151.7 (matches the count with them).

## Measured here (see out/)
- High-norm tokens (last block, before final LayerNorm, ratio to the image's median patch norm): SigLIP 2 B/16 three fixed slots (row, col) (0,1), (0,13), (3,13) in all 16 test images, max 14.6 to 22.5 times; DINOv2 B up to 4.7 times in 8 of 16 images at varying places; DINOv2 B + registers max 1.4; CLIP B/32 max 1.5; MAE B max 1.2.
- FLOPs: formula = FlopCounterMode with eager attention exactly; with sdpa the counter omits 2N^2DL (ViT-B/16 224: 17.56 vs 16.85 GMACs; DINOv2 B/14 518: 151.57 vs 116.98).
- Resolution with interpolate_pos_encoding (16 colour test images): CLIP B/32 at 448 cosine to its 224 embedding 0.910 mean (min 0.762), caption matches 15/16 at 224, 336, 448; SigLIP 2 at 448 0.940 (min 0.802), 16/16. Without interpolation: the exact ValueError (CLIP) and RuntimeError (SigLIP 2) in out/resolution.json.
- MAE: with mask_ratio 0 and default noise only 3 of 196 patches stay in place; patch-0 output cosine 0.26 with the unshuffled run; mean pooled identical.
- Fashion-MNIST frozen features (probe = Vision lab settings, test 10,000): probe k=500 CLIP 87.8, SigLIP 2 89.3, DINOv2 [CLS] 88.6 / mean 89.1 / both 89.3, MAE [CLS] 86.4 / mean 80.6; kNN-20 84.4, 87.4, 86.7/86.9/87.1, 83.4/76.9; image-to-image mAP 52.1, 59.6, 55.7/55.8/56.4, 48.7/33.6. CLIP and SigLIP 2 probe values equal the Vision lab's (asserted in probes.py).
- Layer-wise probe (2,000 train / 5,000 test): CLIP best block 8 (87.8) vs pooled 85.4; SigLIP 2 best block 10 (89.4) vs pooled 87.4, block 0 20.3; DINOv2 best block 10 (88.2) vs pooled [CLS] 87.6, block 0 31.9; CLIP block 0 55.2.
- CPU embedding speed (15,000 images, batch 64): DINOv2 B/14 22.8 img/s; MAE B/16 24.8 img/s. MAE layer-wise: block 0 14.4, best block 9 (86.1), last 85.2 (mean before final LayerNorm), pooled [CLS] 85.4.
