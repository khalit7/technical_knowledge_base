fn main() {
    let r;
    let model = String::from("tiny-llm"); // declared in the outer scope: lives as long as r
    {
        r = &model;
    }
    println!("{r}");
}
