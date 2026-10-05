from tokcount import tokens


def test_snake_case_is_one_token():
    # wrong belief on purpose: "_" separates tokens, so this is 2
    assert tokens("max_tokens") == 1
