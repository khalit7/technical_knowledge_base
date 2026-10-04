    def get_instances(self, output_path: str) -> List[Instance]:
        splits = {"train": TRAIN_SPLIT, "test": TEST_SPLIT}
        base_url = "https://raw.githubusercontent.com/openai/grade-school-math/master/grade_school_math/data/"
        instances: List[Instance] = []

        for split, split_tag in splits.items():  # Iterate over the splits
            source_url: str = f"{base_url}/{split}.jsonl"
            data_path: str = os.path.join(output_path, f"gsm_data_{split}")
            ensure_file_downloaded(source_url=source_url, target_path=data_path)

            with open(data_path, "r") as f:
                for line in f.readlines():
                    example: Dict = json.loads(line)
                    answer: str = example["answer"].replace("####", "The answer is").replace("\n", " ") + "."
                    instances.append(
                        Instance(
                            input=Input(text=example["question"]),
                            references=[Reference(Output(text=answer), tags=[CORRECT_TAG])],
                            split=split_tag,  # Must assign split tag to instance.
                        ),
                    )
        return instances

