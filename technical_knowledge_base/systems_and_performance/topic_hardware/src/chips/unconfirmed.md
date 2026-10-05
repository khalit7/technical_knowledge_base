# Chip atlas: claims that could not be verified (2026-10-05)

Kept off the table, or shown only with a label. "Tried" says where it was looked for.

| Claim | Status | Tried |
|---|---|---|
| First-generation GroqChip: 230 MB SRAM, 750 INT8 TOPS, 188 FP16 TFLOPS, 80 TB/s | Not verified; the Groq row uses only the Groq 3 LPX rack totals on groq.com, divided by 256 (labelled derived) | groq.com (now a cloud landing page), groq.com/lpu-architecture (no figures), Wayback copy of groq.com/products (no figures in text) |
| B200 / B300 SM counts (148, 160) and L2 size (126 MB) | Not on any fetched NVIDIA page; only "up to 160 SMs" for Blackwell Ultra is stated (NVIDIA blog, Aug 22 2025) | HGX, DGX B200, DGX B300, GB200/GB300 NVL72 pages; Blackwell Ultra blog. NVIDIA's Blackwell datasheet link (nvdam.widen.net) returns 404 |
| HGX B200 power 1,000 W per GPU | Not on fetched pages; atlas shows "up to 1,200 W (Blackwell)" from the blog's Table 2 and says the SKU is not stated | same as above |
| B200 bandwidth 7.7 TB/s | AMD's MI355X page footnote quotes NVIDIA's (removed) Blackwell datasheet as 7.7 TB/s for HGX B200 180 GB; NVIDIA's current pages give 64 TB/s per 8 GPUs and 8 TB/s per GPU. Atlas uses 8 and names the 7.7 in the row note | AMD MI350 page footnotes |
| Rubin power, process node, tensor-core generation | Not stated in the Rubin blog, HGX page or NVL72 page | those pages |
| Rubin bandwidth and NVLink per GPU | NVIDIA disagrees with itself: 22 TB/s and 3.6 TB/s (HGX page, Rubin blog) vs 19.2 TB/s and 3 TB/s (Vera Rubin NVL72 page). Atlas uses 22 and 3.6 and shows the rack check gap (+13%, +20%) | |
| MI455X process node; whether AMD's 40 / 20 / 5 PF are dense | AMD gives "up to" figures without density; its footnotes compare them with Rubin's "NVFP4 Dense". Read as dense, labelled | AMD MI400 page, Helios page, Helios PDFs |
| MI455X bandwidth | 23.3 TB/s on most AMD pages, 19.6 TB/s in the Helios tray specification. Atlas uses 23.3 | |
| MI455X release date | AMD: "volume deployments expected in 2H 2026"; the timeline places it at July 2026 (the date of AMD's PDF) only to draw it | |
| TPU process nodes and per-chip power | Google does not publish them. Ironwood pod "spanning nearly 10 MW" is the only power figure (Google blog, Apr 9 2025) | v5e, v5p, v6e, TPU7x docs; Ironwood blog |
| TPU7x memory unit | Docs table says 192 GiB, prose says 192 GB; atlas uses 192 GiB = 206 GB | |
| Trainium2 GA date (Dec 2024) | AWS's announcement blog URL returned 404; date on the timeline is unconfirmed | aws.amazon.com/blogs/aws/amazon-ec2-trn2-instances-...-are-now-available/ |
| Trainium memory units | Neuron docs: 96 GiB (Trn2) and 144 GiB (Trn3). AWS marketing: Trn2 UltraServer "6 TB" (= 64 x 96 GiB in TiB), Trn3 "144 GB HBM3e" and UltraServer "20.7 TB" (= 144 x 144 GB decimal). Atlas uses the docs' GiB, so the rack check shows +10% and +8% gaps | |
| RTX PRO 6000 Blackwell release date and BF16 tensor rate | Not on the datasheet (only FP32 126 TF and 4,000 FP4 TOPS sparse) | datasheet PDF, product page |
| Cerebras WSE-3 dense FLOPS | Only "125 petaFLOPS* FP16 ... * FLOPS shown as sparse"; WSE-3 Turbo (250 PF, CS-4, Aug 2026) density unstated | press release, CS-3 datasheet, chip page, CS-4 blog |
| Groq 3 LPX power, process, per-chip figures | Only rack totals; "When released" | groq.com |
| Independent measurements of B200, MI355X, TPUs | No text-form measurement found in the time available; Chips and Cheese's MI300X article gives its bandwidth results only in images | Chips and Cheese MI300X (Jun 25 2024); arXiv 2507.10789 measures RTX 5080 and H100 PCIe, not B200 |
