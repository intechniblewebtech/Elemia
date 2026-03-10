# The Case for Elemia

> Elemia's design philosophy — why BEM deserves first-class tooling, what Elemia provides, and the principles that guide its decisions.

---

## The Starting Observation

CSS has a naming problem that the industry has tried to solve in two fundamentally different ways. One camp says: abandon naming entirely — generate class names from hashes, or skip classes altogether and scope styles to components through framework magic. The other camp says: naming is fine, just be disciplined about it — follow BEM, use conventions, trust the team.

Both camps are half right. The first camp correctly identifies that global scope is CSS's original sin. The second camp correctly identifies that human-readable class names are a feature, not a bug. When you inspect a BEM component in DevTools, you can read the DOM like a document: `card__header`, `card__title--highlighted`. That legibility has real value — for debugging, for onboarding, for understanding a page without opening source files.

The problem is that the second camp has no tooling. BEM practitioners get string concatenation and good intentions. The first camp gets CSS Modules, Styled Components, Vanilla Extract, Tailwind — entire ecosystems of build tools, IDE integrations, type systems, and runtime optimizations. BEM gets a naming convention and a wiki page.

Elemia starts from the premise that BEM's structural model — blocks containing elements, modified by modifiers — is genuinely good, and that the reason it hasn't evolved is not because it's outdated, but because nobody has built the infrastructure to let it evolve.

---

## What BEM Actually Is (And Isn't)

BEM is often reduced to a naming convention: double underscores for elements, double dashes for modifiers. But that's the surface syntax. The underlying model is more interesting.

A BEM block is a self-contained unit of interface. It owns its elements. Its modifiers describe its states and variations. This is a component model — it predates React, Vue, and every modern framework. The block/element/modifier hierarchy is a way of expressing the same relationships that component trees express, but at the CSS level rather than the JS level.

The naming convention exists to make this hierarchy visible in flat class name strings. `card__header--sticky` encodes three pieces of information: the block (`card`), the element (`header`), and a modifier (`sticky`). That's a data structure serialized into a string. And right now, every team that uses BEM is manually serializing and deserializing that data structure by hand, in template strings, every time they write a className prop.

A framework for BEM wouldn't be a framework for a naming convention. It would be a framework for a component model — one that happens to serialize beautifully into CSS class names.

---

## Why "Hono-Style"

Hono is a useful reference point not because of what it does (HTTP routing) but because of how it thinks about its role.

Hono is tiny. It runs everywhere. It doesn't care what runtime you're on, what framework you use for rendering, or what database you connect to. It provides one primitive — a router — and does it well enough that you can build anything on top of it without fighting the tool.

Most CSS tooling takes the opposite approach. Styled Components is deeply coupled to React's component model. CSS Modules are coupled to webpack's loader system (and later Vite's). Tailwind is coupled to its own utility class vocabulary. Even Vanilla Extract, which is more general, requires a specific build plugin and makes assumptions about how you want to organize styles.

A BEM framework should be like Hono: a small, portable primitive that works in any environment and makes no assumptions about what you build with it. If you're using React, there should be a thin adapter. If you're using Vue, a different thin adapter. If you're using vanilla JS, it should work without any adapter at all. The core should never import React, never import Vue, never touch the DOM.

This isn't just an aesthetic preference. Portability has a practical consequence: it forces the core to be simple. If the core can't depend on React's lifecycle, it can't hide complexity behind hooks. If it can't depend on a build tool, it has to work at runtime. These constraints produce better design.

---

## Meeting Codebases Where They Are

The most important design insight came not from thinking about what the framework should do, but from looking at what real codebases already have.

A production application with hundreds of CSS Module files and tens of thousands of lines of CSS doesn't need a new way to write styles. It has styles. They work. They've been tested, debugged, and refined over months or years. Asking that team to rewrite their CSS in a new format — no matter how elegant that format is — is asking them to pay a massive upfront cost for a benefit they can only evaluate after the migration is complete. That's a terrible value proposition.

The pain in these codebases isn't in the CSS. It's in the TypeScript. It's in the `className={`${styles.card} ${featured ? styles.cardFeatured : ''} ${loading ? styles.cardLoading : ''}`}` expressions that litter every component. It's in the `styles.statusDraft ?? ''` fallbacks that exist because CSS Module imports are `Record<string, string>` and TypeScript can't tell you whether `statusDraft` is a real class. It's in the absence of autocomplete, the silence when you typo a class name, the boilerplate mapping objects that translate props to class strings.

This realization defines Elemia's entry point. Instead of saying "define your blocks and write your styles here," Elemia should say "show me your existing stylesheet and tell me its structure — I'll give you type safety, autocomplete, and a clean API on top of what you already have."

The CSS stays. The `.module.css` files stay. The only thing that changes is how components consume those styles. That's a fundamentally different adoption story — one where the cost is measured in minutes per component, not weeks per codebase.

---

## The Wrapper-First Architecture

This leads to a specific architectural decision: Elemia's primary mode should be wrapping existing CSS, not generating new CSS.

When you pass a CSS Module import and a schema to the framework, you're essentially giving it a runtime type system for your stylesheet. The schema says "this block has elements called `header`, `body`, and `footer`, and it accepts modifiers called `featured` and `variant`." The framework uses that schema to validate your className expressions at compile time and to resolve the right CSS Module keys at runtime.

The CSS Module's scoping is preserved. The build tooling is unchanged. The CSS file is untouched. The framework is purely a consumption layer — it sits between your component's JSX and your CSS Module import, providing the type safety and ergonomics that CSS Modules have always lacked.

This wrapper mode isn't a stepping stone to something "better." It's a complete product. For most components in most codebases, it delivers the full value proposition — type safety, autocomplete, clean modifier syntax, conditional class joining — without requiring any CSS changes. A team that stops here has made a meaningful improvement to their development experience.

The framework also supports an authoring mode — defining blocks from scratch and writing styles in JavaScript. That mode exists for new components, for teams that prefer co-located styles, and for projects that want to eventually extract static CSS at build time. But it's the second door, not the front door. You reach for it when you have a reason to, not because the framework defaults to it.

---

## The Scoping Problem

BEM's biggest practical weakness is that it relies on human discipline for scope isolation. If two developers independently create a block called `card`, their styles collide. The naming convention helps — teams adopt prefixes, namespaces, component-based folder structures — but none of this is enforced. It's convention all the way down.

CSS Modules solved this by hashing class names at build time. `.card` becomes `.card_x7f2a` in the output. Two files that both define `.card` get different hashes. Collision eliminated.

But CSS Modules threw away the baby with the bathwater. The hashed names are unreadable. The mapping from source to output is opaque. And the solution is entirely build-tool-dependent — there's no runtime story, no SSR story without framework-specific integration.

Elemia takes a pragmatic stance on scoping. In wrapper mode, it doesn't scope at all — it defers to whatever scoping mechanism already exists (CSS Modules, naming convention, or nothing). It doesn't add a redundant layer on top of a system that's already working. In author mode, it provides its own scoping — hash-based by default, with the block name preserved for readability. A scoped BEM class looks like `card_x7f2__header`, not `_header_x7f2a`. The structure stays visible.

This means the framework doesn't force a scoping opinion on codebases that already have one. And for codebases that don't — like projects using pure global BEM — the author mode's scoping is available when they want it.

---

## On Coexistence

Real codebases don't adopt new tools all at once. They adopt them one component at a time, over weeks and months, while the rest of the codebase continues working as before. A framework that doesn't account for this isn't a framework for real codebases.

Coexistence means the framework must work alongside raw CSS Module access in the same component. A developer converting one section of a large component shouldn't have to convert the whole thing. The typed block helper and the raw `styles.foo` import should coexist peacefully — same file, same JSX tree, no conflicts.

This is a design constraint with teeth. It means the block helper can't intercept or replace the styles object. It has to wrap it, exposing both the typed API (for converted sections) and the raw passthrough (for everything else). It means the framework can't assume it's the only thing touching className props. It means partial adoption isn't a hack — it's a first-class, permanent, documented state.

Some teams will convert their entire codebase. Some will convert a handful of high-churn components and leave the rest alone. Both are valid outcomes, and Elemia should make both feel natural.

---

## Type Safety as a Design Goal

One of the subtler problems with BEM in practice is that it's stringly typed. When you write `className="card__hedaer"`, nothing catches the typo. When you write `className="card--size-xl"` but the card only supports `sm`, `md`, and `lg`, nothing warns you. The BEM model has a schema — defined elements, defined modifiers — but that schema lives in the developer's head, not in the code.

A framework should make this schema explicit and machine-checkable. If a block defines its elements and modifiers upfront, TypeScript can enforce them at every usage site. Trying to reference a nonexistent element becomes a red squiggle. Passing an invalid modifier value becomes a compile error. This isn't just about catching bugs — it's about discoverability. When a developer types `b('` and gets autocomplete showing `header`, `body`, `footer`, `title`, they can understand the block's structure without leaving their editor.

The type system should flow naturally from the block definition. You shouldn't need to write separate type declarations or maintain `.d.ts` files. The block's config object _is_ its type definition. This is the same insight that drove Zod, tRPC, and similar "schema as code" tools: if the runtime value and the type come from the same source, they can never drift apart.

For existing codebases, there's a pragmatic shortcut: the framework's CLI can infer a schema from an existing CSS Module file by analyzing its class names. `cardFeatured`, `cardCompact`, `statusDraft`, `statusActive` — these names encode BEM structure. A parser can extract it and generate a typed schema automatically. The output won't be perfect, but it gets the team 80% of the way there with zero manual effort. The remaining 20% is a quick review.

---

## On CSS-in-JS vs. CSS Files

There's a longstanding debate about whether styles should live in JavaScript or in CSS files. This framework shouldn't take sides. It should support both — and it should be honest about when each approach is warranted.

The class name generator — the core of the framework — doesn't care where the CSS lives. You can use it purely for class name generation and write your styles in `.css` files by hand, using the scoped names as your selectors. This is the lowest-friction adoption path and the right choice for teams that prefer traditional CSS authoring. For codebases with existing CSS, it's the only reasonable starting point.

For teams that want co-located styles, the framework offers a CSS-in-JS authoring layer. But this layer should be designed with static extraction in mind. The styles you write in JavaScript should be mechanically extractable to `.css` files at build time. This means the authoring API has to be constrained — no dynamic expressions, no runtime interpolation, only literals and design token references. That's a real limitation, but it's the right tradeoff: you get the DX of co-located styles in development and the performance of static CSS in production.

The important thing is that the style layer is separate from the class name layer. They're different packages, different concerns. You can use one without the other. This separation is what makes the framework composable rather than monolithic.

The style authoring mode is where most codebases end up for _new_ components — it's genuinely nice to define the block schema and its styles in one file. But for the hundreds of existing components, the wrapper mode is the right tool, and it should never feel like a second-class citizen.

---

## The Three-Stage Model

Adoption should be progressive, and every stage should feel like a finished product.

The first stage is wrapping. You keep your CSS files exactly as they are. You add a block definition that describes the structure — elements and modifiers — and the framework gives you type safety and a clean consumption API. The only files that change are your TSX components. This delivers most of the value with the least risk.

The second stage is authoring. You move a component's CSS into a JavaScript-defined stylesheet. The block definition and the styles live in one file. The CSS Module is deleted. This gives you a single source of truth — the schema and the styles can never drift apart. It also opens the door to expressing things like dark mode through modifiers rather than duplicated selectors. Teams push to this stage selectively, for components where the CSS itself is a maintenance burden — the thousand-line monoliths, the files with tripled dark mode selectors, the ones where structural duplication has gotten out of hand.

The third stage is extraction. A build plugin compiles the JavaScript-defined styles into static CSS files at build time. The runtime injection code is eliminated. The output is indistinguishable from hand-written CSS. This is a performance optimization, not a functional change — the component works identically before and after extraction.

The critical design principle is that stopping at any stage is permanent and dignified. Stage 1 is not a compromise. Stage 2 is not a prerequisite for Stage 3. A codebase where some components are at Stage 1, some at Stage 2, and some at Stage 3 is functioning as intended. Elemia should make this heterogeneity feel natural, not transitional.

---

## Making Stage 2 Tractable

For teams that choose to push components from wrapper mode to author mode, the framework should make the conversion mechanical rather than creative. The work is translating CSS rules into JavaScript objects — tedious but deterministic. A codemod should handle 90% of it automatically: parse the CSS, emit camelCase property objects, map selectors to block helper calls. The developer reviews the output, handles the edge cases the codemod flagged, and deletes the original CSS file.

A comparison tool validates the conversion by diffing the generated CSS against the original. If they produce equivalent rules, the migration is safe. If they differ, the tool shows exactly which selectors changed. This gives developers confidence that conversion didn't alter behavior — a confidence that's essential for migrating production CSS.

The codemod isn't about making migration fast. It's about making migration boring. When conversion is boring, developers do it incrementally as part of normal work — touching a component for a feature, running the codemod while they're in the file, reviewing the output, moving on. That's how hundreds of files get converted without anyone planning a "migration sprint."

---

## The Role of Build Tooling

A framework that requires a build plugin to function is not truly agnostic. A framework that ignores build tooling leaves value on the table. The right stance depends on what the tooling does.

For wrapper mode — the primary entry point — no build tooling is required. The framework works as a pure runtime library. You import it, pass it your CSS Module, and use the typed helper. Nothing needs to compile, transform, or extract.

For analysis — type generation, schema validation, manifest generation — the tooling operates as a standalone CLI. It reads CSS files and TypeScript files and tells you when they disagree. It's a linter, not a compiler. You can run it in CI, as a pre-commit hook, or not at all. It doesn't transform any code.

For author mode extraction — the heavy transformation — the tooling is a Vite or Webpack plugin that replaces `styles()` calls with CSS file imports at build time. This is opt-in, production-only, and only applies to components that have moved to author mode. The plugin operates incrementally: it extracts what it finds and ignores the rest. If 20 out of 500 components have migrated, the plugin extracts CSS for those 20 and leaves the other 480 alone.

This progressive model means the build tooling is never a gating dependency. You can use the framework for years without a build plugin. You add the plugin when you need it, and only for the slice of the codebase that benefits from it.

---

## Naming Conventions: Meeting Every Pattern

Real CSS Module codebases don't follow a single naming convention. Even within a single project, you'll find flat camelCase (`statusDraft`), strict BEM (`curriculumManager__header`), and bracket notation (`item--unread`). This isn't inconsistency — it's the natural result of different developers, different time periods, and different preferences converging in one codebase.

The framework needs to handle all of these patterns without asking teams to standardize first. A naming resolver sits between the block helper and the CSS Module import, translating the helper's structured calls (`element: 'title', modifier: { active: true }`) into the right key in the styles object (`styles.titleActive` or `styles['title--active']` or `styles.card__title`).

An auto-detection resolver examines the styles object at initialization time, determines which convention it uses, and caches the result. It tries flat camelCase first (the most common pattern), then bracket BEM, then strict BEM. If auto-detection guesses wrong, an explicit `naming` option overrides it.

The resolver design also future-proofs the framework. If a team migrates their CSS naming convention — perhaps standardizing on strict BEM during a refactor — they change one config option in the block definition, and all the TypeScript consumption code continues working without modification.

---

## Framework Adapters: Thin by Design

Each framework adapter should do exactly two things: inject styles into the environment (for author mode) and provide ergonomic bindings for that framework's idioms. Nothing more.

For React, this means a hook that registers an author-mode block's styles and returns the class helper. For wrapper mode, the hook is optional — the block helper is a pure function that works without any React integration. This is an important distinction: most components in a wrapper-mode codebase won't use the hook at all. The `block()` call happens at module scope, and the helper is called directly in JSX. No provider, no context, no lifecycle management.

The adapter should never contain business logic. It should never transform class names, merge styles, resolve conflicts, or manage component hierarchies. All of that belongs in the core. The adapter is a bridge — it translates between the framework's lifecycle and the framework-agnostic style management.

If an adapter grows beyond ~100 lines of code, that's a signal that logic has leaked into the wrong layer.

---

## The cx() Question

Many codebases need a conditional class name utility — something like `classnames` or `clsx`. Some have one. Many don't. The one examined for this design had 690 component files building class names with raw template literals because no utility existed.

The framework should subsume this need rather than compete with it. The block helper accepts extra class arguments beyond element and modifiers — strings, false values, and undefined are all handled. This means it works as a conditional class joiner for its own blocks and for arbitrary external classes. A component that mixes typed block classes with one-off utility classes or a parent's className prop does so naturally, without importing a separate utility.

For code that doesn't use block helpers at all — plain conditional class joining — the framework exports a standalone `cx()` utility. It's tiny (15 lines), has no dependency on the rest of the framework, and works as a drop-in replacement for `classnames` or `clsx`. This means even components that never adopt block definitions get a useful utility from the framework's package.

---

## On Composition and Inheritance

BEM has a classical answer to composition: mix blocks. A component can apply classes from multiple blocks. A `media-card` might use its own `media-card__thumbnail` element alongside `card__body` from the base card block.

This works in practice but has no tooling support. The framework should formalize composition in a way that preserves type safety. If a `media-card` composes a `card`, it should inherit the card's elements and modifiers in its type definition. Developers should get autocomplete for both the inherited and the new members.

Composition should work across both modes. A wrapper-mode block (backed by a CSS Module) and an author-mode block (backed by a styles() definition) should be composable with each other. The composed block's helper resolves classes from whichever source each part came from.

The question of whether composition should produce new CSS (a new scoped block that inherits styles) or just merge class names (applying both blocks' classes) is genuinely open. Both approaches have merits. A good framework might support both modes and let the developer choose. This is the kind of design question that should be answered by building prototypes and seeing which approach feels right.

---

## Design Tokens: A Natural Fit

BEM and design token systems are natural allies. BEM's block model gives you component-level structure. Design tokens give you system-level consistency. Together, they form a complete styling architecture: tokens define the vocabulary (`--color-primary`, `--space-md`), and blocks consume that vocabulary through `var()` references.

The framework should be aware of design tokens without depending on any specific token system. If a team has a token schema, the framework should be able to validate that `var()` references in author-mode styles point to real tokens. If a team doesn't use tokens, the framework shouldn't care.

Token validation is a build-time concern, not a runtime concern. It belongs in the CLI or as an optional lint step. The style layer accepts `var()` references as opaque strings and only validates them when asked.

Wrapper-mode codebases already have their token discipline baked into CSS files. The framework doesn't interfere with that. Token validation becomes relevant only when styles move into JavaScript via the authoring layer, where the risk of referencing nonexistent tokens is higher because there's no CSS linter catching the mistake.

### The Nudge, Not the Gate

There's a philosophical choice hiding inside token support: how strongly should the framework push teams toward token discipline?

One extreme is permissive — accept anything, validate nothing. The other extreme is strict — reject raw `#ff0000` and `16px` values outright, requiring token references for all visual properties. Both are wrong as defaults.

The right stance is a configurable nudge. In its default mode, the framework accepts anything and warns about nothing — zero friction. A team that opts into strict token mode gets compile-time errors when a `styles()` definition uses a raw color or spacing literal instead of a `var()` reference. This is an explicit, reversible choice. The framework doesn't know what's best for your project. It gives you a dial and lets you set it.

The same philosophy applies to theming. Author-mode blocks can declare theme variants — `dark`, `high-contrast`, `compact` — and the framework generates the appropriate `:root[data-theme="..."]` selectors automatically. But this is additive, not required. A block without theme channels is not incomplete. Theme support is a capability the framework offers when you need it, not a structure it imposes on every block. A team that handles dark mode through media queries in their existing CSS files is doing it right. A team that wants data-attribute-driven theme switching in their authored blocks is also doing it right. The framework should be agnostic about which approach is correct and helpful with whichever approach is chosen.

---

## Fail Loud, Fail Early: Diagnostics as a Design Principle

Most CSS tooling fails silently. A typo in a CSS Module key resolves to `undefined`, which React renders as an empty string, which produces a DOM element with no class — and nobody notices until a QA engineer spots a missing style two weeks later. This silent failure mode is one of the deepest problems in CSS development, and a framework that reproduces it has failed at its most basic job.

Elemia should treat every ambiguity as an error until proven otherwise. If a block helper receives a modifier value that doesn't match the schema, that's a development-time error — a console warning at minimum, a thrown error in strict mode. If the CLI generates types from a CSS Module and finds class names that don't match any BEM pattern, it should flag them with `// REVIEW` annotations rather than silently guessing. If a naming resolver can't determine the convention of a styles object, it should say so explicitly rather than defaulting to camelCase and hoping.

This principle extends beyond error messages into the development experience. The framework should offer a dev overlay — a visual diagnostic layer that highlights which blocks are active, which modifiers are applied, and which elements are being rendered. Not for production. Not for testing. For the developer sitting in front of their browser wondering why a component looks wrong. The overlay turns the invisible (class name resolution, modifier application, scope hashing) into the visible. It answers the question "what did the framework do?" without requiring `console.log` archaeology.

Diagnostics should also be available passively. A manifest file — generated by the CLI, consumed by linters and CI — should document every block in the project: its elements, its modifiers, its source file, its stage (wrapper/author/extracted). This manifest is the framework's accounting ledger. It makes the system's state queryable by other tools and auditable by humans.

The philosophy here is borrowed from Rust's compiler: errors should be so helpful that reading the error message is faster than reading the documentation. A framework that tells you "undefined is not a valid modifier for block 'card'" is mediocre. A framework that tells you "modifier 'featured' is not defined on block 'card' — did you mean 'isFeatured'? Available modifiers: variant, isFeatured, isCompact" is actually helpful. The investment in good error messages pays compound interest across every developer who uses the framework.

---

## Security as a Design Value

CSS frameworks rarely think about security. Class names feel harmless — they're just strings, right? But in enterprise environments, the gap between "just strings" and "injection vector" is measured in audit findings and blocked deployments.

Elemia handles security by making the safe path the default path. Class names are produced from enum values, not from user input. Block names are sanitized to ASCII alphanumeric characters — no angle brackets, no quotes, no control characters can survive into a class string. Scope hashes are deterministic and derived from file paths and a project salt, not from content that an attacker could influence. These aren't security features bolted onto Elemia — they're consequences of a design that constrains its own output.

Content Security Policy (CSP) compliance is the harder problem and the one that matters most for enterprise adoption. Any framework that injects `<style>` tags at runtime — which author mode does — is incompatible with CSP's `style-src` directive unless the injected styles carry a valid nonce. A framework that ignores this reality will be rejected by security teams before it reaches a single developer's editor.

The framework threads nonce support through every layer that touches style injection. The React adapter accepts a nonce via context (set once at the application root, available to every block). The vanilla adapter accepts it as a mount option. The SSR adapter includes it in server-rendered style tags. The streaming adapter propagates it through the response. In every case, the nonce is provided by the application — the framework never generates, stores, or transmits nonces. It just uses what it's given.

The deeper principle is that security should be structural, not procedural. A framework where "the developer has to remember to sanitize" is a framework with XSS vulnerabilities waiting to happen. A framework where the type system prevents unsanitized values from reaching the output is a framework that's secure by construction. The modifier schema is a perfect example: modifiers are defined as finite enum types, and the class name resolver only accepts values from that enum. There's no code path where arbitrary user input becomes a class name, because the type system doesn't allow it.

This doesn't mean the framework is a security product. It means the framework's design doesn't create security problems — and for teams that operate under security constraints (CSP, SOC 2, HIPAA-adjacent environments), that absence of problems is the difference between "approved" and "blocked."

---

## Enterprise Readiness: A Prerequisite, Not a Feature

It's tempting to treat enterprise concerns — CSP compliance, audit logging, deployment policies — as features to add later, after the core is solid. This is backwards. Enterprise environments aren't a special case; they're the environments where CSS scaling problems are worst and where a framework like this has the most value.

A hospital system's internal training platform has hundreds of components, strict CSP headers, and a security team that reviews every new dependency. A financial services firm's dashboard has thousands of CSS Module files and a compliance requirement that no inline styles appear in production HTML. A government contractor's application runs in air-gapped environments where CDN links are impossible.

These aren't edge cases. They're the exact codebases where BEM-at-scale breaks down and where a typed framework would deliver the most value. If the framework can't run in these environments — because it requires `unsafe-inline` for style injection, because its build plugin phones home for telemetry, because its CLI requires network access to fetch a schema registry — then it's excluded from its own best use cases.

Enterprise readiness means: works offline, respects CSP, produces deterministic output, supports vendoring, carries no implicit network dependencies, and can be audited by reading its source. These properties aren't expensive to maintain if they're built in from the start. They're extremely expensive to retrofit once the architecture has hardened around assumptions that violate them.

---

## Who This Is For

This framework is for three audiences.

The first audience is teams with existing CSS — CSS Modules, global BEM stylesheets, or a mix — who want better TypeScript integration without rewriting their styles. They want autocomplete for their class names. They want the compiler to catch typos. They want to stop writing `${styles.card} ${featured ? styles.cardFeatured : ''}` and start writing something readable. For these teams, wrapper mode is the product. Author mode is something they may never touch.

The second audience is teams starting new projects — or new components within existing projects — who want to write BEM CSS with type safety and optional scoping from day one. They want to define a block, write its styles, and get a typed helper that produces clean, readable BEM class strings. For these teams, author mode is the product. Wrapper mode is irrelevant.

The third audience is enterprise teams operating under security and compliance constraints — CSP-enforced environments, audited codebases, air-gapped deployments — who need CSS tooling that respects those constraints rather than fighting them. These teams have often been excluded from modern CSS frameworks entirely because the frameworks assume they can inject inline styles, fetch remote resources, or operate outside of strict content policies. For these teams, the framework's value isn't just its API — it's the fact that the API works within their security posture.

All three audiences should feel that the framework was designed for them specifically. The wrapper-first architecture ensures the first audience isn't treated as an afterthought. The clean author-mode API ensures the second audience doesn't feel like they're using a migration tool. CSP nonce threading and deterministic output ensure the third audience doesn't need to file a security exception to use it.

It's explicitly not for teams that prefer utility-first CSS (Tailwind), teams that want to hide CSS entirely behind component APIs (Styled Components), or teams that see CSS as an implementation detail that shouldn't be human-readable. Those are valid preferences, and there are excellent tools for all of them.

---

## What Success Looks Like

The framework has succeeded if it meets five criteria:

**1. It disappears.** The best infrastructure is invisible. A developer using this framework should think about their components, not about the framework. The API should be so small and intuitive that there's nothing to learn — if you know BEM, you know how to use this. No configuration, no magic, no surprising behavior.

**2. It's honest.** The output should be unsurprising. In wrapper mode, the framework resolves to the same CSS Module classes the developer was using before — just with a cleaner API. In author mode, the generated CSS should look like what a careful developer would write by hand. No specificity hacks, no `!important`, no generated names that obscure meaning.

**3. It's loud when it matters.** When things go right, the framework is invisible (criterion 1). When things go wrong, it should be the opposite — maximally visible, maximally specific, maximally helpful. A silent failure is a betrayal of trust. A good error message is a gift of time. The framework should be designed so that the developer who makes a mistake spends thirty seconds reading an error, not thirty minutes debugging a blank DOM element.

**4. It's optional at every level.** Use only the wrapper. Or use the wrapper with the CLI type generator. Or use author mode for new components. Or use extraction for production builds. Removing a layer should never break the layers below it. The framework should be easy to adopt incrementally and easy to walk away from if it doesn't work out.

**5. It respects what's already there.** Existing CSS files should never need to change for the framework to deliver value. Existing naming conventions — however inconsistent — should be handled, not rejected. Existing build tooling should be complemented, not replaced. Security policies should be honored, not circumvented. The framework enters a codebase as a guest, not as a conqueror.

If a team can adopt this framework for one component, see immediate benefit, and gradually expand to more components without any big-bang migration — that's the right adoption story. If another team adopts it for a greenfield project and writes every component in author mode from day one — that's also the right adoption story. If a third team in a CSP-enforced environment uses it because it's the only typed CSS framework that doesn't require `unsafe-inline` — that's also the right adoption story. If a fourth team uses only the `cx()` utility and ignores everything else — that's fine too. The framework should be useful at every level of engagement.

---

## On Not Over-Designing

There's a temptation, when planning a framework, to solve every problem upfront. Animation scoping. Container query integration. CSS layer management. Server component compatibility. Custom property APIs. Theming. Dark mode. RTL support.

All of these are real concerns, and all of them can be addressed. But addressing them upfront, before the core is proven, is a mistake. The history of frontend tooling is littered with frameworks that tried to do everything and collapsed under their own weight.

The right approach is to build the smallest useful thing — a type-safe wrapper for existing CSS Modules — and use it. Wrap real components with it. Feel where it's friction-free and where it's awkward. Let the pain points of real usage drive the roadmap, not the imagined requirements of a hypothetical future.

If the core is well-designed — small, composable, framework-agnostic — then adding capabilities later is cheap. If the core is over-designed, adding capabilities means navigating existing complexity. Simplicity now is an investment in flexibility later.

The wrapper-first approach enforces this discipline naturally. You can't over-engineer a typed wrapper around an existing CSS Module. The scope is inherently limited. The complexity is inherently low. That's exactly the right starting point for a framework that needs to prove its value before expanding its ambition.

---

## Closing Thought

The web platform has matured enormously. We have custom properties, cascade layers, container queries, `:has()`, nesting. CSS is more powerful than it's ever been. And yet the gap between "CSS can do this" and "my team can do this reliably at scale" remains wide.

BEM was one of the first serious attempts to bridge that gap. It did it through convention — a shared language for how to name things. That convention worked surprisingly well for surprisingly long. But convention alone doesn't scale the way tooling does. TypeScript proved that for JavaScript. ESLint proved it for code quality. Prettier proved it for formatting.

BEM deserves the same treatment. Not to replace it with something "better," but to give it the infrastructure it's always lacked — type safety, structured consumption, optional scoping, build optimization, framework integration — while respecting the CSS that teams have already written. The best framework isn't the one that asks you to start over. It's the one that makes what you already have work better.
