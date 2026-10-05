// Integration tests: compiled as a separate crate, so they see only the public API.
use tokstat::tally::Tally;

#[test]
fn malformed_lines_are_counted_not_fatal() {
    let mut t = Tally::default();
    for l in [r#"{"user":"a","text":"one two"}"#, "not json", r#"{"user":"b","text":"x"}"#, r#"{"user":17,"text":"x"}"#] {
        t.add_line(l);
    }
    assert_eq!((t.lines, t.ok, t.malformed, t.first_bad), (4, 2, 2, Some(2)));
    assert_eq!(t.top(5), vec![("a", 2), ("b", 1)]);
}

#[test]
fn binary_matches_the_root_spec() {
    let out = std::process::Command::new(env!("CARGO_BIN_EXE_tokstat"))
        .arg("../chat.jsonl")
        .output()
        .unwrap();
    let s = String::from_utf8(out.stdout).unwrap();
    assert!(s.starts_with("lines 2000  ok 1992  malformed 8 (first at line 53)"), "{s}");
}
