# Eval Register

Inspect Evals provides a way to share Inspect eval implementations with the broader community. However, as the number of evaluations grew, we found that maintaining quality and compatibility in a single package was not sustainable. As of the 8th of May 2026, Inspect Evals will stop accepting eval code submissions into `/src`. To register new evals, contributors can submit a simple .yaml file that points to an externally managed repo that hosts the eval. This move towards a distributed register model mirrors the approach taken by other projects that faced similar problems, such as Helm/charts, Terraform Registry, and Docker Official Images.

> [!TIP]
> This doc primarily serves as a background explainer for contributors who want to understand why we moved to a register model. Seeking a guide to help register an evaluation whose code lives in a separate upstream repository? See the [Submission Guide](register/README.md).

## Table of Contents

- [Background](#background)
- [Introducing: The Inspect Evals Register](#introducing-the-inspect-evals-register)
- [FAQ](#faq)

## Background

### Where Inspect Evals Started

Inspect Evals was [launched in May 2024](https://www.aisi.gov.uk/blog/inspect-evals) as a collection of example evaluations for the Inspect AI framework.

It was intended to foster community collaboration and make it easy to run, experiment and share Inspect AI evaluations.

In the past, we've done this by accepting PRs which submit evals directly to src/, with the intention that they can be installed and run locally from the Inspect registry. What started as a project to show a handful of evaluation examples now hosts 120+ evaluation implementations and 200+ Inspect AI tasks; with the growth, we started having to make trade-offs between opposing requirements.

### What we have learned

There are at least two opposing requirements which mean the existing model (“Inspect Evals 1.0”) is not a practical long-term solution. These requirements are:

1. Stability/reproducibility vs ease-of-use: An essential requirement of evals is that they are stable over time and have reproducible results. Naively pinning versions creates dependency conflicts, and other solutions such as containerisation/virtual environments don’t yet provide the same low-friction developer or user experience.

2. Quality vs accessibility:

   - Users want evals that are reliable and accurate; there is no easy way to provide guarantees other than thorough quality assurance checks.
   - Imposing this QA process as a prerequisite for every eval submission creates unreasonable amounts of friction, and isn’t a scalable way to help users identify evals that meet their needs.

The issues we encountered aren't unique to Inspect Evals. An informative example was Helm's [`helm/charts`](https://github.com/helm/charts). It also started as a mono-repo which eventually grew too large to be sustainable. They then moved to a distributed model where charts live in upstream repos and a central registry ([Artifact Hub](https://artifacthub.io/)) handles discovery.

|                                       Monorepo: `helm/charts`                                       |                          Distributed Register: Artifact Hub                          |
| :-------------------------------------------------------------------------------------------------: | :----------------------------------------------------------------------------------: |
| ![Screenshot of charts hosted on the helm/charts mono-repo](docs/images/helm-charts-screenshot.png) | ![Screenshot of charts on the Artifact Hub](docs/images/artifact-hub-screenshot.png) |

