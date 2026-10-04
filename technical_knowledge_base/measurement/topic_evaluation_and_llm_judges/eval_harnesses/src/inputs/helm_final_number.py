def final_number_exact_match(gold: str, pred: str) -> float:
    """
    Returns 1 iff the final number in gold and pred match.
    Similar to exact_match_indicator.
    Example:
    - gold = "The answer is 15."
    - pred = "The answer is 15 eggs."
    - Returns 1
    """

    def get_final_number(x: str) -> str:
        matches = re.findall(r"-?[\d,]+(?:.\d+)?", x)
        if not matches:
            return ""
        return matches[-1].replace(",", "")

    return exact_match(get_final_number(gold), get_final_number(pred))
