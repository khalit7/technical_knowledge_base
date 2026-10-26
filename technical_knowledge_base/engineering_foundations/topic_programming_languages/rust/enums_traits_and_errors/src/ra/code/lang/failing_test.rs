fn count_tokens(text: &str) -> usize {
    text.split(' ').count() // bug: two spaces in a row make an empty "token"
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn single_spaces() {
        assert_eq!(count_tokens("a b c"), 3);
    }

    #[test]
    fn double_space() {
        assert_eq!(count_tokens("a  b"), 2, "two words separated by two spaces");
    }

    #[test]
    #[should_panic(expected = "index out of bounds")]
    fn out_of_bounds_panics() {
        let v: Vec<u32> = vec![];
        let _ = v[0];
    }
}
