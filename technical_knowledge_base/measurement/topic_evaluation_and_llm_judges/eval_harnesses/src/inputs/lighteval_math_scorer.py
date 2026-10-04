def math_scorer():
    gold_extraction_target = (ExprExtractionConfig(),)
    pred_extraction_target = (ExprExtractionConfig(), LatexExtractionConfig(boxed_match_priority=0))
    language = Language.ENGLISH
    fallback_mode = "first_match"
    extraction_mode = "first_match"
    timeout_seconds = 5

    gold_extraction_regexes = get_extraction_regexes_inspect(gold_extraction_target, language, len_choices=1)
    pred_extraction_regexes = get_extraction_regexes_inspect(pred_extraction_target, language, len_choices=1)

    async def score(state: TaskState, target: Target):
        extracted_predictions = extract_target_from_pred(
            state.output.completion, pred_extraction_regexes, fallback_mode, extraction_mode, timeout_seconds
        )
        extracted_gold = extract_target_from_pred(
            target.text, gold_extraction_regexes, fallback_mode, extraction_mode, timeout_seconds
        )
        return Score(
            # Correct or Incorrect, used by inspect-ai backend
            value="C" if extracted_predictions == extracted_gold else "I",
            explanation=state.output.completion,
            answer=str(extracted_predictions),
        )

    return score
