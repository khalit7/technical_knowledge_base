https://github.com/BytedTsinghua-SIA/DAPO (read 2026-10-02)
 GitHub - BytedTsinghua-SIA/DAPO: An Open-source RL System from ByteDance Seed and Tsinghua AIR · GitHub
 GitHub Copilot appDirect agents from issue to merge
 GitHub Advanced SecurityFind and fix vulnerabilities
 Code securitySecure your code as you build
 Secret protectionStop leaks before they start
 GitHub SponsorsFund open source developers
 Enterprise platformAI-powered developer platform
 GitHub Advanced SecurityEnterprise-grade security features
 Copilot for BusinessEnterprise-grade AI features
 Premium SupportEnterprise-grade 24/7 support
 You signed in with another tab or window. Reload to refresh your session.
 You signed out in another tab or window. Reload to refresh your session.
 You switched accounts on another tab or window. Reload to refresh your session.
 You must be signed in to change notification settings
[2025/05] We update the wandb training record of full DAPO and the checkpoint which achieved 50%+ on AIME 2024. We also provide instructions for evaluation on AIME 2024.
[2025/03] We release the training record of an early version of DAPO (w/o Token-level PG Loss & Dynamic Sampling), achieving 44% on AIME 2024, in wandb.
We release a fully open-sourced system for large-scale LLM RL, including algorithm, code infrastructure, and dataset. The system achieves state-of-the-art large-scale LLM RL performance. We propose the Decoupled Clip and Dynamic sAmpling Policy Optimization (DAPO) algorithm.
Through open-sourcing, we provide the broader research community and society with practical access to scalable reinforcement learning, enabling all to benefit from these advancements. Our system is based on the awesome verl framework. Thanks for their great work!
🤗 If you have any questions about our paper, issues are welcomed and we could discuss there. Thank you!
🚀 DAPO achieves 50 points on AIME 2024 based on the Qwen2.5-32B base model, outperforming the previous SoTA DeepSeek-R1-Zero-Qwen-32B with 50% training steps.
Length stability and growth: The steady increase in response length allows for greater exploration, facilitating the model’s ability to learn more complex reasoning behaviors, ultimately contributing to training stability and performance improvement.
Reward score stability: A stable increase in the reward signal indicates that the model is successfully fitting the training distribution, ensuring that the learning process remains robust and consistent without significant fluctuations.
Entropy and mean probability trend: A controlled increase in entropy, after an initial decrease, ensures a healthy balance between exploration and exploitation, avoiding issues such as overfitting or excessive randomness, and promoting sustained model performance.
We provide the model weights of DAPO-Qwen-32B, which is trained based on Qwen2.5-32B using the DAPO algorithm.
We recommend using conda to setup the environment:
We provide the model inference code here:
 "question": "Solve the following math problem step by step. The last line of your response should be of the form Answer: $Answer (without quotes) where $Answer is the answer to the problem.\n\nFind the largest possible real part of \\[(75+117i)z+\\frac{96+144i}{z}\\]where $z$ is a complex number with $|z|=4$.\n\nRemember to put your answer on its own line after \"Answer:\".",
 "question": "Solve the following math problem step by step. The last line of your response should be of the form Answer: $Answer (without quotes) where $Answer is the answer to the problem.\n\nEvery morning Aya goes for a $9$-kilometer-long walk and stops at a coffee shop afterwards. When she walks at a constant speed of $s$ kilometers per hour, the walk takes her 4 hours, including $t$ minutes spent in the coffee shop. When she walks $s+2$ kilometers per hour, the walk takes her 2 hours and 24 minutes, including $t$ minutes spent in the coffee shop. Suppose Aya walks at $s+\\frac{1}{2}$ kilometers per hour. Find the number of minutes the walk takes her, including the $t$ minutes spent in the coffee shop.\n\nRemember to put your answer on its own line after \"Answer:\".",
 "question": "Solve the following math problem step by step. The last line of your response should be of the form Answer: $Answer (without quotes) where $Answer is the answer to the problem.\n\nLet $\\mathcal{B}$ be the set of rectangular boxes with surface area $54$ and volume $23$. Let $r$ be the radius of the smallest sphere that can contain each of the rectangular boxes that are elements of $\\mathcal{B}$. The value of $r^2$ can be written as $\\frac{p}{q}$, where $p$ and $q$ are relatively prime positive integers. Find $p+q$.\n\nRemember to put your answer on its own line after \"Answer:\".",
 model = "BytedTsinghua-SIA/DAPO-Qwen-32B"
 tokenzier = AutoTokenizer.from_pretrained(model)
 prompts=tokenzier.apply_chat_template(conversation=[{"content": question, "role": "user"}],
 print(f"***QUESTION***:\n{question}\n***GROUND TRUTH***:\n{answer}\n***MODEL OUTPUT***:\n{output[0].outputs[0].text}\n")
To evaluate the model on AIME 2024, we deploy DAPO-Qwen-32B with Ray Serve and vLLM.
serve run eval.llm:build_app model=BytedTsinghua-SIA/DAPO-Qwen-32B tensor-parallel-size=8
python eval/eval_aime24.py --temperature 1.0 --top_p 0.7 --max_tokens 20480 --model BytedTsinghua-SIA/DAPO-Qwen-32B --test_file eval/aime-2024.parquet
serve run eval.llm:build_app model=aaa/bbb/ccc tensor-parallel-size=8
python eval/eval_aime24.py --temperature 1.0 --top_p 0.7 --max_tokens 20480 --model ccc --test_file eval/aime-2024.parquet
To benefit the broader research community, we fully open-source the recipe of our RL training, including algorithm details, dataset, and infrastructures.
We provide training and validation datasets for DAPO training.
Training: DAPO-Math-17k, a carefully curated and processed math dataset.
We provide the out-of-the-box script for DAPO training reproduction. Quickstart and core code are mentioned in README. These are scripts for:
DAPO w/o Token-level PG Loss & Dynamic Sampling -- AIME 44
The DAPO w/o Token-level PG Loss & Dynamic Sampling -- AIME 44 script has been verified on the current verl and achieves 44 points on AIME 2024, whose training record can be accessed in wandb.
The DAPO Full -- AIME 50 script has also been validated on the latest verl version. It scores 50 points on AIME 2024. You can view the corresponding training record on wandb.
We thank the verl for providing the awesome open-source RL infrastructure.
Our open-sourced experiments were conducted on the Volcano Engine Machine Learning Platform. We will provide a full reproduction guideline later on the Volcano Engine platform to help users replicate our experiments.
An Open-source RL System from ByteDance Seed and Tsinghua AIR
 You can’t perform that action at this time.
