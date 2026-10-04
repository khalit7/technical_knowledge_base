            value = model_args.get(name, None)
            if value is not None:
                model_args.pop(name)
            return value

        device = collect_model_arg("device")
        tokenizer = collect_model_arg("tokenizer")
        model_path = collect_model_arg("model_path")
        tokenizer_path = collect_model_arg("tokenizer_path")
        self.batch_size = collect_model_arg("batch_size")
        self.chat_template = collect_model_arg("chat_template")
        self.use_chat_template = collect_model_arg("use_chat_template")
        self.tokenizer_call_args = collect_model_arg("tokenizer_call_args")
        self.enable_thinking = collect_model_arg("enable_thinking")
        if self.tokenizer_call_args is None:
            self.tokenizer_call_args = {}
        self.hidden_states = collect_model_arg("hidden_states")
        do_sample = collect_model_arg("do_sample")
        self.do_sample: bool = do_sample if do_sample is not None else True
        trust_remote_code = collect_model_arg("trust_remote_code")
        if trust_remote_code is None:
            trust_remote_code = False
        if not isinstance(trust_remote_code, bool):
            raise ValueError("trust_remote_code must be a bool")

        # select the transformers auto-class used to load the model. Some
