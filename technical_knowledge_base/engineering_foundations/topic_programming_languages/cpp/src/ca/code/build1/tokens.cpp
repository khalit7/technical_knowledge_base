// tokens.cpp: the definition
#include "tokens.h"
#include <cctype>

int count_tokens(std::string_view text) {
    int n = 0;
    bool inside = false;
    for (unsigned char c : text) {
        bool tok = std::isalnum(c) && c < 128;
        if (tok && !inside) n += 1;
        inside = tok;
    }
    return n;
}
