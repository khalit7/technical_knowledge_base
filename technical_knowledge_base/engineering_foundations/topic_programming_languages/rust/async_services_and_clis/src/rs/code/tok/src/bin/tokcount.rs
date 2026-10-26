//! tokcount: the token counter as a command-line tool.
use anyhow::{Context, Result};
use clap::{Parser, Subcommand};
use std::fs::File;
use std::io::{self, BufRead, BufReader, IsTerminal, Read, Write};
use std::path::PathBuf;
use std::process::ExitCode;
use tok::{Tally, count_tokens};

/// Count word-ish tokens per user in JSONL chat logs.
#[derive(Parser)]
#[command(name = "tokcount", version)]
struct Cli {
    #[command(subcommand)]
    cmd: Cmd,
}

#[derive(Subcommand)]
enum Cmd {
    /// Count tokens per user in one or more JSONL files ("-" reads stdin)
    Count {
        /// Input files; "-" means standard input
        #[arg(required = true)]
        files: Vec<PathBuf>,
        /// How many users to list
        #[arg(short = 'n', long, default_value_t = 5, value_parser = clap::value_parser!(u16).range(1..=1000))]
        top: u16,
        /// Print JSON instead of text
        #[arg(long)]
        json: bool,
        /// Exit with code 3 if any line is malformed
        #[arg(long)]
        strict: bool,
    },
    /// Count tokens in a piece of text (an argument, or stdin when absent)
    Text { text: Option<String> },
}

fn main() -> ExitCode {
    let cli = Cli::parse(); // bad arguments: clap prints usage and exits with code 2
    match run(cli) {
        Ok(code) => code,
        Err(e) => {
            // {:#} prints the whole context chain on one line: "outer: inner: cause"
            eprintln!("error: {e:#}");
            ExitCode::from(1)
        }
    }
}

fn run(cli: Cli) -> Result<ExitCode> {
    match cli.cmd {
        Cmd::Text { text } => {
            let text = match text {
                Some(t) => t,
                None => {
                    let mut s = String::new();
                    io::stdin().read_to_string(&mut s).context("reading stdin")?;
                    s
                }
            };
            println!("{}", count_tokens(&text));
            Ok(ExitCode::SUCCESS)
        }
        Cmd::Count { files, top, json, strict } => {
            let mut tally = Tally::default();
            for path in &files {
                if path.as_os_str() == "-" {
                    feed(&mut tally, io::stdin().lock(), "stdin")?;
                } else {
                    let f = File::open(path)
                        .with_context(|| format!("cannot open {}", path.display()))?;
                    feed(&mut tally, BufReader::new(f), &path.display().to_string())?;
                }
            }
            let report = tally.report(top as usize);
            let out = if json {
                serde_json::to_string_pretty(&report)? + "\n"
            } else {
                report.to_text()
            };
            // Write through a locked handle and treat a closed pipe (`| head`) as success:
            // println! would panic with "failed printing to stdout: Broken pipe".
            let mut stdout = io::stdout().lock();
            if let Err(e) = stdout.write_all(out.as_bytes()).and_then(|_| stdout.flush()) {
                if e.kind() != io::ErrorKind::BrokenPipe {
                    return Err(e).context("writing stdout");
                }
            }
            Ok(if strict && report.malformed > 0 { ExitCode::from(3) } else { ExitCode::SUCCESS })
        }
    }
}

/// Read lines into the tally. Progress goes to stderr, and only when stderr is a terminal,
/// so pipes and logs stay clean.
fn feed(tally: &mut Tally, mut r: impl BufRead, name: &str) -> Result<()> {
    let show = io::stderr().is_terminal();
    let mut line = String::new();
    loop {
        line.clear();
        let n = r.read_line(&mut line).with_context(|| format!("reading {name}"))?;
        if n == 0 {
            break;
        }
        tally.add_line(line.trim_end_matches(['\n', '\r']));
        if show && tally.lines % 100_000 == 0 {
            eprint!("\r{name}: {} lines", tally.lines);
        }
    }
    if show && tally.lines >= 100_000 {
        eprintln!();
    }
    Ok(())
}
