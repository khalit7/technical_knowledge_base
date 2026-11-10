# Sequence models: the pre-transformer lineage

Notion: https://app.notion.com/p/3c65c17b0d0d818da4ded61ace6847ce
Site: https://khalit7.github.io/technical_knowledge_base/models_and_training/topic_ml_fundamentals/sequence_models_pre_transformer/

Interactive page: `index.html`, built from `src/` (`sh src/build.sh`) and published to Notion as an HTML-only page. How sequences were modelled before the transformer, one fix at a time: recurrent networks and backpropagation through time, vanishing gradients (plain RNN against LSTM), the LSTM and GRU gates, seq2seq and the attention that removed its bottleneck, WaveNet's dilated convolutions, why the transformer replaced them (path length and parallelism), and the static word vectors they read (word2vec, GloVe). Every animation and 3D figure runs real trained weights or real GloVe vectors. Rebuilt 2026-10-24 to the teaching contract (core idea and hero at the top, visuals inline, depth closed); 2026-11-10 on the split layout with four 3D stages (the RNN unrolled with BPTT, one LSTM cell, seq2seq with attention, WaveNet's stacks) that play once in view. Part of Topic: ml-fundamentals. Tabs: Reading, Word vectors, Further reading.
