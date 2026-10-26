import tokrs

print(tokrs.count_tokens("Hello from hello-tokens, x86_64 café!"))
print(tokrs.count_tokens("日本語 v2.1 C++"))
print(type(tokrs.count_tokens))
print(tokrs.count_tokens.__doc__)
print(tokrs.count_tokens.__text_signature__)
