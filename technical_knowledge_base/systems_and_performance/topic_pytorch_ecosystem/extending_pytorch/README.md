# Extending PyTorch: custom ops, tensor subclasses, kernels

Notion: https://app.notion.com/p/3f85c17b0d0d8158a7addcd3d601d72a (child of Topic: pytorch-ecosystem, 3c65c17b0d0d8150aa65ca44b6ed2fd5)
Site: https://khalit7.github.io/technical_knowledge_base/systems_and_performance/topic_pytorch_ecosystem/extending_pytorch/

HTML-only page (`index.html`, built by `src/build.sh`). New page (no old Notion text). Tabs: Reading (split layout since 2026-11-12: three 3D stages, the call down the dispatcher keys, Dynamo on one forward, the Int8Weight subclass; the subclass tracer inline in 5.1), Which extension point?, Custom-op lab, Further reading. Every result was recorded with torch 2.14.1 on an Apple M1 Pro (CPU and MPS); see `src/README.md`.
