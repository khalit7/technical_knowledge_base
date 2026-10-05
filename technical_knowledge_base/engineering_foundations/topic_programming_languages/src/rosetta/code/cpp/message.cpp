// Task: a Message type; what happens when you copy it and change the copy.
#include <cctype>
#include <iostream>
#include <string>
#include <utility>

struct Message {
    std::string user;
    std::string text;

    int tokens() const {
        int n = 0;
        bool inside = false;
        for (unsigned char c : text) {
            bool tok = std::isalnum(c) && c < 128;
            if (tok && !inside) ++n;
            inside = tok;
        }
        return n;
    }
};

int main() {
    Message a{"u0029", "hello world"};
    Message b = a;            // a COPY: b owns its own strings
    b.text = "changed";
    std::cout << a.text << " " << b.text << "\n";

    Message& r = a;           // a reference: a second name for a (like Python's b = a)
    r.text = "via ref";
    std::cout << a.text << "\n";

    Message c = std::move(a); // a move: c steals a's buffers; a is left valid but unspecified
    std::cout << c.text << " " << c.tokens() << " [" << a.text << "]\n";
}
