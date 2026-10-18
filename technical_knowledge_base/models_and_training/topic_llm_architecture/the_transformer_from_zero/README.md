# The transformer from zero: one block, every shape, a GPT you train

Notion: https://app.notion.com/p/3fd5c17b0d0d8174980ddde4a20c7b3c

Child page of Topic: llm-architecture. `index.html` is the whole Notion page, built from `src/` with `sh src/build.sh`.

Tabs: Reading (the decoder written from an empty file in nine steps, each with shapes and a test; training and the
loss curve; sampling; parameters and FLOPs by hand checked against the code and nine real configs; six ablations at an
equal budget; mistakes; interview questions), Build it up (stepper over the file), Ablation explorer (recorded runs),
Shape drill (questions over real configs), Further reading. How it was built: `src/README.md`.
