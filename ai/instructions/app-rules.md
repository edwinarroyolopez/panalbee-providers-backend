# App design system + UX rules (mobile)

## 1. Role of the app

The app exists to turn business complexity into clear action.

It is not a place to expose internal system complexity.  
It is a place to make operation, understanding, and decision-making feel natural.

---

## 2. Design mindset

The app must be designed with strong product discipline (clarity, hierarchy, purposeful reduction):

- remove noise
- keep what matters
- create obvious hierarchy
- make actions feel inevitable
- avoid decorative complexity
- let beauty emerge from order and usefulness

This does not mean empty minimalism.

It means radical clarity.

---

## 3. UX principle

> The user should feel guided, not burdened.

---

## 4. What the app should feel like

The app should feel:

- fast
- clear
- calm
- reliable
- operational
- elegant
- lightweight
- useful

It should not feel:

- cluttered
- noisy
- technical
- enterprise-heavy
- overdecorated
- confusing
- “feature-rich” in a chaotic way

---

## 5. App shell

New screens must integrate with the established app shell.

Respect the existing product structure:

- main layout
- app header
- app menu
- bottom navigation
- offline banners
- global loaders
- session bootstrap behavior
- version checks
- push initialization
- active **workspace** context (see `ai/instructions/starter-semantics.md`)

Do not create disconnected micro-design systems inside the app.

---

## 6. Modular app structure

The app should be organized by domain.

Typical structure:

```txt
src/modules/
  auth/
  user/
  accounts/
  <your-domain-modules>/
  system-design/
  starter-public/
  starter-protected/
```

Each module may include:

* screens
* components
* hooks
* services
* types
* utils

Organize around business meaning, not around arbitrary UI fragments.

---

## 6.1 Dynamic domain UI rule

The app UI must adapt to the active domain or profile (when your product defines one) while preserving a coherent shell.

This means:

* shared patterns stay stable (layout, cards, loaders, selector behavior, feedback states)
* domain modules adapt labels, flows, and data entry priorities
* screens should render according to active capabilities and context
* avoid hardcoded assumptions that all workspaces use the same entities

Do not duplicate the whole app per domain.

Build one dynamic product language with domain-specific content.

---

## 7. Reuse-first rule

Before creating a new component:

1. check if a pattern already exists
2. check if an existing component can be extended safely
3. only create a new one when it adds real clarity

Prefer reuse over proliferation.

Important reusable patterns include:

* layout shells
* cards
* loaders
* action flows
* capability gates
* limit banners
* headers
* modals
* selectors
* summary blocks

---

## 8. Screen hierarchy

Every screen should have a visible hierarchy:

1. context
2. primary information
3. primary action
4. secondary actions
5. expandable detail
6. technical or low-priority metadata last

Do not let screens compete with themselves.

---

## 9. One primary intention per screen

Each screen must have one dominant intention.

Examples:

* register
* review
* confirm
* pay
* filter
* close
* compare
* unlock
* understand summary

If a screen tries to do everything, it will communicate nothing clearly.

---

## 10. Visual principles

### 10.1 Clarity before decoration

Every visual element must help understanding.

### 10.2 Hierarchy before quantity

More blocks do not equal more value.

### 10.3 Space before saturation

Breathing room improves confidence and speed.

### 10.4 One strong CTA

The main action should be obvious.

### 10.5 Consistency before novelty

Do not invent a new pattern for every feature.

### 10.6 Feedback must always exist

The user should never wonder whether something happened.

---

## 11. Copywriting rules

Interface copy must be:

* short
* direct
* useful
* human
* operational

Good examples:

* Register purchase
* Pending payment
* No connection
* Retry
* Available in Premium
* Last closing

Avoid:

* internal jargon
* overly technical labels
* vague generic text
* robotic error wording
* long explanatory paragraphs inside operational screens

The UI should sound like a practical business assistant, not a tired machine manual.

---

## 12. Capability and plan gating UX

When a feature is unavailable, the app must handle it with clarity and elegance.

Possible strategies:

* hide it if showing it creates confusion
* show it locked if that helps communicate value
* show a limit banner
* show plan comparison
* show upgrade CTA
* record upgrade intent when useful

Do not frustrate the user without explanation.

Domain-specific feature availability must be explicit and understandable.

---

## 13. Limits as UX

A plan limit should not feel like a system failure.

When a user hits a limit, the interface should make clear:

* what happened
* why it happened
* whether anything can still be done
* whether upgrading changes the outcome

Limits are part of product design, not just permission logic.

---

## 14. Feedback immediacy rule

Any important action must provide clear visible state.

Minimum states:

* loading
* success
* error
* next possible step

Never leave the user guessing whether a tap worked.

---

## 15. ActionLoader and long operations

Use `ActionLoader` or equivalent multi-step progress feedback when operations are long or meaningfully staged.

Examples:

* creating a purchase
* registering a payment
* creating a product
* inventory closure or audit
* synchronization flows
* any operation with noticeable latency or important intermediate steps

Steps must reflect real process meaning.
Do not fabricate steps just to animate waiting.

---

## 16. Input rules

Operational inputs deserve special care.

### 16.1 Money inputs

* format in real time
* remain easy to edit
* preserve readability

### 16.2 Quantity inputs

* use appropriate keyboard
* validate clearly
* reduce trivial mistakes

### 16.3 Date and state selectors

* use sensible defaults
* minimize taps
* avoid unnecessary decision burden

---

## 17. State management rules

Recommended separation:

* **React Query** for remote server data
* **Zustand** for lightweight global state
* **local component state** for local screen interaction

Do not duplicate server state into global stores without strong reason.

Do not turn Zustand into a dumping ground.

---

## 18. Offline and sync awareness

The app must be designed assuming network conditions may fail.

Every feature should consider:

* what happens when offline
* what is stored locally
* what is queued
* how retry works
* how pending state is communicated
* how duplicates are avoided

Offline-aware design is not optional realism.
It is part of product trust.

---

## 19. Navigation rules

Navigation must feel obvious.

Rules:

* critical actions should not be hidden
* routes should not feel like dead ends
* depth should stay reasonable
* context should remain visible when useful
* transitions should preserve orientation

The user should never feel lost inside the product.

---

## 20. Feedback collection as product input

User feedback is not decorative.

If the product has moments to ask whether something felt easy, hard, useful, or blocked, that is valuable signal.

Use feedback intentionally:

* not constantly
* not randomly
* not intrusively

But do not waste the chance to learn from real use.

---

## 21. Accessibility in practical terms

Even if the product is not built from a formal accessibility-first checklist, it must still respect real-world usability:

* adequate contrast
* readable sizes
* comfortable touch targets
* state not communicated by color alone
* short flows
* visible primary actions

Design for stressed humans, not idealized demos.

---

## 22. App testing priorities

Prioritize testing:

1. hooks with real logic
2. capability / limit / plan gating behavior
3. critical navigation flows
4. important conditional rendering
5. reusable components involved in operational tasks

Avoid overreliance on low-value snapshots.

Test behavior that matters.

---

## 23. What must never happen in the app

Never:

* overload screens with too many equal-weight blocks
* create visually disconnected feature islands
* show cryptic technical errors
* hide the primary action
* ignore plan and capability context in UX
* duplicate backend logic carelessly
* make beautiful screens that are slow, dense, or unclear
* let a user wonder whether the system responded

---

## 24. Final app rule

The app must make the business feel more manageable.

If a screen increases stress, hesitation, or confusion, it is not aligned with product intent.

---

## 25. Multi-profile app architecture rule (when applicable)

If the product serves more than one profile, workspace type, or industry mode, structure the app as:

1. **shared shell** (layout, navigation primitives, feedback states, attachment patterns)
2. **profile registry/config** (main intent, primary CTA, widget order, route priorities)
3. **specialized modules/screens** only when the dominant workflow truly differs

Avoid scattering profile-specific if/else checks across unrelated screens.

---

## 26. Main dashboard composition rule

Main dashboard should use:

- common shell
- registry by operational profile (when applicable)
- reusable widgets with explicit contracts

Main dashboard must answer the dominant operational question for the active profile or workspace context.

---

## 27. Deep analytics reuse rule

Deep analytics may share blocks across profiles when semantics are compatible.

Do not force the same home/dashboard structure just because analytics blocks are reusable.

---

## 28. Navigation and CTA coherence rule

For each profile (when applicable), define explicit:

- menu priorities
- primary CTA routes
- secondary operational routes

The app must keep orientation clear when switching between workspace or tenant contexts.

---

## 29. New profile onboarding rule (when applicable)

Adding a new profile or mode in the app requires:

1. type and feature mapping
2. dashboard registry entry (if used)
3. menu/bottom bar adaptation
4. primary flow route checks
5. blocked/unavailable state handling
6. validation of shared vs specialized screens

No new profile should be introduced by only adding enum labels.

---

## 30. Operational completion rule

A new operational screen or flow is incomplete if it does not include all of the following:

1. one clear primary intention
2. visible operational state
3. explicit blocked/pending/ready states
4. immediate user feedback after important actions
5. contextual help using the existing global help pattern
6. safe route entry and safe route exit
7. coherence with app shell and existing reusable patterns

Do not ship operational UI that depends on hidden assumptions or missing explanation.
