// json_lite.hpp: a small strict JSON parser (RFC 8259) for one chat message.
// The C++ standard library has no JSON parser; real projects use nlohmann/json or simdjson.
#pragma once
#include <optional>
#include <string>
#include <string_view>

struct Message {
    std::string user;
    std::string text;
};

// Keeps only the two string fields we need; skips everything else.
class Parser {
public:
    explicit Parser(std::string_view s) : s_(s) {}

    // Why the last message() call failed, and at which byte.
    std::string error() const { return std::string(err_) + " at byte " + std::to_string(i_); }

    std::optional<Message> message() {
        Message m;
        bool has_user = false, has_text = false;
        ws();
        if (!eat('{')) return fail("expected '{'");
        ws();
        if (!eat('}')) {
            while (true) {
                ws();
                std::string key;
                if (!string(&key)) return fail("bad key");
                ws();
                if (!eat(':')) return fail("expected ':'");
                ws();
                std::string* dst = key == "user" ? &m.user : key == "text" ? &m.text : nullptr;
                bool* flag = key == "user" ? &has_user : key == "text" ? &has_text : nullptr;
                if (dst && peek() == '"') {
                    dst->clear();
                    if (!string(dst)) return fail("bad string");
                    *flag = true;
                } else {
                    if (!value()) return fail("bad value");
                    if (flag) *flag = false;  // present but not a string
                }
                ws();
                if (eat(',')) continue;
                if (eat('}')) break;
                return fail("expected ',' or '}'");
            }
        }
        ws();
        if (i_ != s_.size()) return fail("trailing characters");
        if (!has_user || !has_text) return fail("user and text must be strings");
        return m;
    }

private:
    std::string_view s_;
    size_t i_ = 0;
    const char* err_ = "";
    std::nullopt_t fail(const char* why) { err_ = why; return std::nullopt; }

    char peek() const { return i_ < s_.size() ? s_[i_] : '\0'; }
    bool eat(char c) {
        if (peek() != c || i_ >= s_.size()) return false;
        ++i_;
        return true;
    }
    void ws() {
        while (i_ < s_.size() && (s_[i_] == ' ' || s_[i_] == '\t' || s_[i_] == '\n' || s_[i_] == '\r')) ++i_;
    }
    bool lit(std::string_view w) {
        if (s_.substr(i_, w.size()) != w) return false;
        i_ += w.size();
        return true;
    }
    static bool digit(char c) { return c >= '0' && c <= '9'; }
    bool number() {
        eat('-');
        if (eat('0')) {
        } else if (digit(peek())) {
            while (digit(peek())) ++i_;
        } else {
            return false;
        }
        if (eat('.')) {
            if (!digit(peek())) return false;
            while (digit(peek())) ++i_;
        }
        if (peek() == 'e' || peek() == 'E') {
            ++i_;
            if (peek() == '+' || peek() == '-') ++i_;
            if (!digit(peek())) return false;
            while (digit(peek())) ++i_;
        }
        return true;
    }
    bool hex4(unsigned* out) {
        if (i_ + 4 > s_.size()) return false;
        unsigned v = 0;
        for (int k = 0; k < 4; ++k) {
            char c = s_[i_++];
            v <<= 4;
            if (c >= '0' && c <= '9') v |= c - '0';
            else if (c >= 'a' && c <= 'f') v |= c - 'a' + 10;
            else if (c >= 'A' && c <= 'F') v |= c - 'A' + 10;
            else return false;
        }
        *out = v;
        return true;
    }
    static void utf8(std::string* o, unsigned cp) {
        if (cp < 0x80) o->push_back(char(cp));
        else if (cp < 0x800) { o->push_back(char(0xC0 | cp >> 6)); o->push_back(char(0x80 | (cp & 0x3F))); }
        else if (cp < 0x10000) { o->push_back(char(0xE0 | cp >> 12)); o->push_back(char(0x80 | (cp >> 6 & 0x3F))); o->push_back(char(0x80 | (cp & 0x3F))); }
        else { o->push_back(char(0xF0 | cp >> 18)); o->push_back(char(0x80 | (cp >> 12 & 0x3F))); o->push_back(char(0x80 | (cp >> 6 & 0x3F))); o->push_back(char(0x80 | (cp & 0x3F))); }
    }
    // Parse a JSON string; append the decoded bytes to *out if out is not null.
    bool string(std::string* out) {
        if (!eat('"')) return false;
        while (i_ < s_.size()) {
            unsigned char c = s_[i_++];
            if (c == '"') return true;
            if (c < 0x20) return false;  // raw control characters are not allowed
            if (c != '\\') { if (out) out->push_back(char(c)); continue; }
            if (i_ >= s_.size()) return false;
            char e = s_[i_++];
            char simple = e == '"' ? '"' : e == '\\' ? '\\' : e == '/' ? '/' : e == 'b' ? '\b'
                        : e == 'f' ? '\f' : e == 'n' ? '\n' : e == 'r' ? '\r' : e == 't' ? '\t' : 0;
            if (simple) { if (out) out->push_back(simple); continue; }
            if (e != 'u') return false;  // e.g. \x41 is not JSON
            unsigned cp;
            if (!hex4(&cp)) return false;
            if (cp >= 0xD800 && cp < 0xDC00 && s_.substr(i_, 2) == "\\u") {
                size_t save = i_;
                i_ += 2;
                unsigned lo;
                if (hex4(&lo) && lo >= 0xDC00 && lo < 0xE000) cp = 0x10000 + ((cp - 0xD800) << 10) + (lo - 0xDC00);
                else i_ = save;
            }
            if (out) utf8(out, cp);
        }
        return false;  // ran off the end: unterminated string
    }
    bool value() {
        char c = peek();
        if (c == '"') return string(nullptr);
        if (c == '{') {
            ++i_; ws();
            if (eat('}')) return true;
            while (true) {
                ws();
                if (!string(nullptr)) return false;
                ws();
                if (!eat(':')) return false;
                ws();
                if (!value()) return false;
                ws();
                if (eat(',')) continue;
                return eat('}');
            }
        }
        if (c == '[') {
            ++i_; ws();
            if (eat(']')) return true;
            while (true) {
                ws();
                if (!value()) return false;
                ws();
                if (eat(',')) continue;
                return eat(']');
            }
        }
        if (c == 't') return lit("true");
        if (c == 'f') return lit("false");
        if (c == 'n') return lit("null");
        return number();
    }
};

