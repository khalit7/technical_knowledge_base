fn main() {
    let r;
    {
        let model = String::from("tiny-llm");
        r = &model;
    }
    println!("{r}");
}
