# Vision

Recast is one app that gathers all the small tools I reach for every day —
file conversion, compression, PDF juggling, media downloads, screenshots,
pastes, DNS lookups, currency math — into a single, easy-to-use place that is
**mine**.

## Why build it at all

Every one of these tools exists online, usually polished and free. But every
one of them runs on someone else's server. When I drag a contract PDF or a
family photo onto a converter site, I'm trusting a company I know nothing
about not to log it, keep it, or train on it. Is CloudConvert saving a copy of
every file? Almost certainly not — but *"almost certainly"* is doing a lot of
work in that sentence, and I can't verify any of it.

Recast removes the question. The files are processed by my own machine, by
open-source engines I can read, behind a UI I control. Privacy here isn't a
policy — it's the architecture.

The second reason is friction. Ten bookmarked tools means ten different UIs,
ten ad walls, ten upload limits. One toolbench with a consistent design, no
ads and no artificial caps is simply nicer to use every day.

## Where it's going

Right now Recast is just for me. The plan, roughly in order:

1. **Personal daily driver** — running locally, covering everything I
   currently open other sites for.
2. **Hosted** — at [recast.serhiifotex.dev](https://recast.serhiifotex.dev),
   so it works from any device. The hardening (rate limits, size caps,
   private-host blocking) exists for this step.
3. **Maybe promoted** — shared publicly as an open-source, self-hostable
   alternative. If other people run their own Recast, the privacy argument
   scales with them.

I don't expect to make money from this, and that's fine — it isn't the point.
If some way of sustaining it appears later, good; but the tool stays open
source and self-hostable either way.

## Principles

- **Own machine first.** Every tool must work fully self-hosted. External
  services are allowed only for data that is inherently external (exchange
  rates, geo-IP, RDAP) — never for processing user files.
- **A tool earns its place by being used.** This is a collection of tools I
  actually reach for, not a feature checklist.
- **No dark patterns.** No ads, no accounts except where genuinely needed
  (pastes belong to someone), no telemetry, no upsell walls.
- **Easy to run.** `bun run dev` for the laptop, `docker compose up` for a
  server. If self-hosting is hard, the privacy argument is theoretical.
