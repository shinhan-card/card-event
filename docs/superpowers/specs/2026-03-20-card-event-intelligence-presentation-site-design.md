# Card Event Intelligence Presentation Site Design

## 1. Background

`Card Event Intelligence` is no longer just a dashboard with crawled event rows. The codebase has grown into a multi-layered intelligence system that:

- collects competitor card events from multiple issuers,
- extracts detailed event content from heterogeneous pages,
- normalizes raw text into comparable structures,
- generates rule-based and AI-assisted insights,
- delivers the result through analytics views, dashboards, and briefing outputs,
- and is now expanding into a separate product/disclosure intelligence axis through PDF, catalog, and RAG pipelines.

The current product explains these capabilities only indirectly through operational screens. That makes it hard for non-technical stakeholders to understand the system's value, and it also hides the design principles that make the platform extensible.

This project creates a separate web-based presentation site that explains the system in a polished, visually sophisticated, and structurally accurate way.

## 2. Goal

Create a separate presentation microsite that:

- persuades non-technical viewers in under a minute,
- visually explains how the platform turns scattered card-event signals into intelligence,
- clearly separates the `Event Intelligence` axis from the `Product / Disclosure Intelligence` axis,
- provides a deeper technical path for developers and operators,
- and remains low-risk to maintain by using curated, static-first content instead of live production coupling.

## 3. Non-Goals

This site is not intended to:

- become another operational dashboard,
- depend on live API status or real-time production data,
- replace the existing FastAPI product UI,
- or expose every internal detail on the landing experience.

## 4. Primary Audience

### 4.1 Primary

Non-technical stakeholders, especially people who need to quickly understand:

- why this system matters,
- what business problem it solves,
- how the information flow works at a high level,
- and why the project feels more advanced than a simple crawler.

### 4.2 Secondary

Developers, operators, and technically curious reviewers who want to see:

- the actual system decomposition,
- the orchestration model,
- the responsibility of each module,
- and the design choices that make the platform maintainable.

## 5. Core Product Strategy

The presentation site will use a `Showroom + Deep Dive` structure.

- `/`
  - a premium showroom-style landing page
  - optimized for storytelling, persuasion, and fast comprehension
- `/deep-dive`
  - a technical explainer page
  - optimized for architecture, pipeline stages, module responsibilities, and design principles

This split prevents the two audiences from competing for attention on a single page while still keeping them inside one coherent branded experience.

## 6. Information Architecture

### 6.1 Route Structure

- `/`
- `/deep-dive`
- optional future deep links:
  - `/deep-dive/event-axis`
  - `/deep-dive/product-axis`
  - `/deep-dive/module-map`

### 6.2 Navigation Model

Global navigation should stay minimal:

- `Overview`
- `How It Works`
- `Deep Dive`

The landing page should contain strong CTA handoff points into `/deep-dive`, such as:

- `See Architecture`
- `How It Works`
- `Explore Modules`

## 7. Visual Direction

The chosen direction is `Systems Atlas` for structure and clarity, combined with `Signal Theater` for the landing-page storytelling energy.

### 7.1 Visual Goals

- premium and intentional, not generic SaaS
- futuristic without becoming noisy sci-fi
- diagram-forward rather than screenshot-forward
- strong motion on the showroom page
- calmer, more legible structure on the deep-dive page

### 7.2 Visual Characteristics

- dark but warm-neutral base with luminous signal accents
- large editorial typography for story beats
- structured diagram components with thin lines, glowing nodes, and layered depth
- scroll-based scene transitions
- bento-style information blocks for outcome and capability sections
- SVG or vector-first diagrams instead of raw screenshots as the primary storytelling device

## 8. Landing Page Design

The landing page is not a documentation page. It is a guided visual story.

### 8.1 Scene 1: Hero

Purpose:

- define the project in one sentence
- establish the system as an intelligence engine, not a crawler
- create immediate visual intrigue

Content:

- primary message about transforming fragmented card-event signals into structured intelligence
- short subcopy
- CTA buttons for `How It Works` and `Open Deep Dive`
- animated signal/network background

### 8.2 Scene 2: Problem Landscape

Purpose:

- explain why the problem is messy
- show that event pages, conditions, issuer structures, and update rhythms are fragmented

Visual approach:

- scattered fragments, cards, text blocks, and channel nodes converging into order

### 8.3 Scene 3: Signal Flow

Purpose:

- show the high-level operating loop

Stages:

- Collect
- Extract
- Normalize
- Enrich
- Deliver

Each stage should explain:

- what the system does,
- what changes at that stage,
- and what value is created before moving to the next stage.

### 8.4 Scene 4: Outcomes

Purpose:

- translate system capability into visible outcomes

Examples:

- competitor event monitoring
- notable benefit detection
- briefing generation
- analytics and dashboard support
- product knowledge expansion

### 8.5 Scene 5: Orchestration

Purpose:

- show that the system works as a connected engine, not a set of isolated features

Important:

- keep this conceptual
- do not expose file names here

### 8.6 Scene 6: Deep Dive Handoff

Purpose:

- explicitly invite the viewer into the technical layer

Message:

- if the landing page explains `why it matters`,
- the deep dive explains `how it is built`.

## 9. Deep Dive Design

The deep-dive page should feel like a technical exhibition rather than plain documentation.

### 9.1 Section 1: Concept Architecture

Show the platform as a high-level concept map with major zones:

- data sources
- collection layer
- extraction and normalization
- intelligence generation
- delivery surfaces

### 9.2 Section 2: Stage Breakdown

For each major step, explain:

- what it does
- why it exists
- which technologies or techniques it uses
- where its output goes next

### 9.3 Section 3: Orchestration Map

Show the runtime relationships between:

- FastAPI bootstrap and routing
- schedulers and jobs
- event pipeline
- briefing pipeline
- analytics reads
- disclosure sync
- RAG/product enrichment

### 9.4 Section 4: Real Module Map

Expose real modules and file groups by responsibility, not just folder listing.

Important code areas to represent:

- `app.py`
- `database.py`
- `routers/*`
- `modules/connectors/*`
- `modules/pipeline.py`
- `modules/event_enrichment.py`
- `modules/insights.py`
- `modules/briefing.py`
- `modules/rag/*`
- `templates/*`
- `static/js/*`

### 9.5 Section 5: Design Principles

Explain the reasoning behind the architecture:

- connector abstraction absorbs source diversity
- extraction and interpretation are separated
- rule-based and AI-based logic are combined with fallback
- shared data supports multiple delivery surfaces
- the product/disclosure intelligence path is kept distinct from the event-intelligence path

### 9.6 Section 6: Reliability and Evolution

Show how the system can evolve:

- add new issuers
- refine rules and classification
- strengthen briefing intelligence
- deepen product knowledge via disclosures and RAG
- preserve operational resilience through fallback behavior

## 10. Two-Axis Architecture Rule

This is a critical design requirement.

The presentation must clearly separate the following two axes.

### 10.1 Axis A: Event Intelligence

Question answered:

- `What is happening in competitor card events, and what does it mean?`

Representative code areas:

- `modules/connectors/*`
- `modules/pipeline.py`
- `modules/extraction.py`
- `modules/normalization.py`
- `modules/event_enrichment.py`
- `modules/insights.py`
- `routers/events.py`
- `routers/jobs.py`
- `routers/pipeline.py`
- `routers/analytics.py`
- `modules/briefing.py`

### 10.2 Axis B: Product / Disclosure Intelligence

Question answered:

- `What card products exist, and what structured product knowledge can be derived from disclosures, PDFs, and catalogs?`

Representative code areas:

- `routers/disclosures.py`
- `routers/rag.py`
- `modules/rag/product_scraper.py`
- `modules/rag/collector.py`
- `modules/rag/chunker.py`
- `modules/rag/embedder.py`
- `modules/rag/catalog_summary.py`

### 10.3 Bridge Layer

The two axes are not identical and should not be merged visually.

They should meet only where necessary:

- event-to-product linking
- dashboard/operator experience
- briefing context enhancement
- analytics surfaces that combine event signals with product knowledge

The preferred visual model is:

- left lane: `Event Intelligence`
- right lane: `Product / Disclosure Intelligence`
- bottom convergence: `Analytics / Dashboard / Briefing / Operator View`

## 11. Content Strategy

The site should be `static-first`.

### 11.1 Reason

The user explicitly prefers a low-risk presentation layer that does not become fragile when the main system evolves.

### 11.2 Implication

- no dependence on live production APIs for core storytelling
- no real-time system status embedded in the landing experience
- use curated copy, diagrams, and fixed snapshots
- optionally use generated metadata later, but only as a controlled build-time input

### 11.3 Content Sources

Recommended initial sources:

- curated text content in local files
- hand-authored architecture metadata
- manually selected numbers or labels derived from the current codebase
- static diagrams generated from configuration or local JSON

## 12. Technology Direction

The presentation site should be implemented as a separate frontend app.

### 12.1 Recommended Stack

- Next.js
- TypeScript
- Tailwind CSS
- motion library for scroll scenes and transitions
- SVG/vector-driven diagrams

### 12.2 Why Separate

- avoids coupling to the FastAPI product
- allows independent deployment
- makes visual storytelling easier
- gives cleaner ownership boundaries
- supports future expansion without operational risk

## 13. Success Criteria

The project succeeds if:

- a non-technical viewer understands the system's value in under one minute,
- the landing page feels polished and memorable,
- the deep-dive page accurately reflects the real architecture,
- the two-axis distinction is obvious,
- and the site can be updated safely without depending on live product behavior.

## 14. Risks and Mitigations

### 14.1 Risk: Style overwhelms clarity

Mitigation:

- keep diagrams readable
- reserve strongest motion for the landing page
- use the deep-dive page for structured reading

### 14.2 Risk: Architecture becomes inaccurate over time

Mitigation:

- isolate architecture content in editable content/config files
- clearly separate conceptual diagrams from real module maps

### 14.3 Risk: Event axis and product axis get visually conflated

Mitigation:

- enforce separate lanes, labels, and explanations
- show convergence only in downstream delivery surfaces

## 15. Approval State

This design reflects the following validated decisions:

- primary audience is non-technical
- the site is a separate presentation property
- content is curated and current-state based, not live-coupled
- visual direction is `Systems Atlas`
- overall product structure is `Showroom + Deep Dive`
- the landing page is more theatrical
- the deep dive is more structural
- event intelligence and product/disclosure intelligence must be shown as distinct axes
