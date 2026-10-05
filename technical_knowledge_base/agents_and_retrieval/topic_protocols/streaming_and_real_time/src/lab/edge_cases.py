"""SSE byte streams that test a parser against the WHATWG rules (HTML section 9.2.6).

Each case: the bytes, how they are cut into network writes (chunks, 30 ms apart), and what the
standard says a parser dispatches (spec), as a list of (event type, data, last event id).
"""
E = "é".encode()  # two bytes, c3 a9


def C(chunks, spec, title, rule):
    return {"chunks": chunks, "spec": spec, "title": title, "rule": rule}


CASES = {
    "lf": C([b"data: a\n\n"], [["message", "a", ""]], "Plain LF line ends",
            "Lines end with LF, CR LF or a lone CR."),
    "crlf": C([b"data: a\r\n\r\n"], [["message", "a", ""]], "CR LF line ends", "Same event as LF."),
    "cr": C([b"data: a\r\r"], [["message", "a", ""]], "Lone CR line ends",
            "A lone CR also ends a line (old Mac style)."),
    "nospace": C([b"data:a\n\n"], [["message", "a", ""]], "No space after the colon",
                 "The space after the colon is optional."),
    "twospace": C([b"data:  a\n\n"], [["message", " a", ""]], "Two spaces after the colon",
                  "Only ONE leading space is removed; the second is data."),
    "multiline": C([b"data: a\ndata: b\n\n"], [["message", "a\nb", ""]], "Two data lines",
                   "data lines are joined with a newline."),
    "eof": C([b"data: a\n\ndata: b\n"], [["message", "a", ""]], "Stream ends without the blank line",
             "An event not ended by a blank line is discarded at end of stream."),
    "bom": C([b"\xef\xbb\xbfdata: a\n\n"], [["message", "a", ""]], "Byte order mark at the start",
             "One leading UTF-8 BOM is stripped."),
    "comment": C([b": ping\n\ndata: a\n\n"], [["message", "a", ""]], "Comment line (keep-alive)",
                 "A line starting with a colon is ignored, and a blank line after it dispatches nothing."),
    "named": C([b"event: delta\ndata: a\n\n"], [["delta", "a", ""]], "Named event",
               "event: sets the type; EventSource needs addEventListener('delta')."),
    "noevent": C([b"event: x\n\n", b"data: a\n\n"], [["message", "a", ""]], "Event with no data line",
                 "An event whose data buffer is empty is not dispatched, and its type does not leak into the next one."),
    "emptydata": C([b"data\n\n"], [["message", "", ""]], "Field name with no colon",
                   "A line with no colon is a field with an empty value: one event with empty data."),
    "spacename": C([b"data : a\n\n"], [], "Space before the colon",
                   "The field name is 'data ' (with a space): unknown, ignored, so nothing is dispatched."),
    "id": C([b"id: 7\ndata: a\n\n"], [["message", "a", "7"]], "Event id",
            "id: sets the last event id, sent back as Last-Event-ID on reconnect."),
    "idnull": C([b"id: 7\ndata: a\n\nid: 8\x009\ndata: b\n\n"], [["message", "a", "7"], ["message", "b", "7"]],
                "An id containing NUL", "An id with a NUL character is ignored; the previous id stays."),
    "split": C([b"da", b"ta: hel", b"lo\n", b"\n"], [["message", "hello", ""]], "One event cut into four reads",
               "Network reads do not respect lines; the parser must buffer."),
    "utf8": C([b"data: caf" + E[:1], E[1:] + b"\n\n"], [["message", "café", ""]],
              "A two-byte character cut between reads", "Decode UTF-8 as a stream, not read by read."),
    "done": C([b'data: {"x":1}\n\n', b"data: [DONE]\n\n"], [["message", '{"x":1}', ""], ["message", "[DONE]", ""]],
              "OpenAI-style [DONE] sentinel", "To SSE it is just data; only the SDK knows it means the end."),
}
