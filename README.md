# Reaktivate Books

A books list with create, an All/Private switch, and a sticky header showing a private-books
count — rebuilt from a hardcoded-mock React page into an MVP/MVVM architecture: views hold no
logic, controllers hold all of it, MobX drives reactivity, and every controller/service/mapper is
unit-tested in isolation from React.

## What's implemented, and where

| Requirement | Where |
|---|---|
| Zero logic in views; a controller behind every view | Every `*Controller.ts` under `src/features/`; mechanically enforced by the `no-restricted-imports` ESLint rule in `eslint.config.js`, which blocks any `services/*` import from a `.tsx` file |
| MobX state + `mobx-react` reactivity | `src/stores/`, every view wrapped in `observer()` |
| Book creation | `src/features/books/AddBookForm/` |
| Logic covered by tests | `src/**/*.test.ts` — 92 tests across 8 files |
| All / Private switch | `src/features/books/BooksFilterSwitch/`, backed by `BooksPageController.filter` |
| Sticky header with a private-books counter | `src/features/header/AppHeader.tsx` + `AppHeaderController` |

## Running it

```bash
npm install
cp .env.example .env   # set VITE_USER_ID to your own nickname
npm run dev
```

The demo API (`tdd.demo.reaktivate.com`) uses a self-signed certificate. Rather than have the
browser or the app code deal with that, `vite.config.ts` proxies `/api/*` to the real host in dev
(`secure: false` on that one proxy entry, nowhere else), so the app only ever talks to a relative
`/api` URL. The alternative — opening an API URL directly once and accepting the certificate in
the browser — also works, but shouldn't be necessary.

```bash
npm run test          # vitest, single run — 92 tests, well under a second
npm run test:watch
npm run test:coverage
npm run lint           # eslint
npm run typecheck      # tsc --noEmit
npm run build          # tsc -b && vite build
```

## Architecture

```
View --actions--> Controller --PM--> Repository --DTO--> Gateway --HTTP--> API
View <--VM (observable)-- Controller <--PM-- Repository <--DTO-- Gateway <--JSON-- API
```

- **Gateway** (`services/books/BooksGateway.ts`) is the only place that knows a URL. It speaks raw,
  unvalidated JSON — its return type is `unknown`, not a typed DTO array, because that's the
  honest description of what `fetch` actually hands back: the API's own schema documents its
  response bodies as an untyped `object`, so a static `BookDto[]` return type would be a compile-time
  fiction the mapper's runtime checks would immediately contradict.
- **Mapper** (`services/books/booksMapper.ts`) is the trust boundary: it turns that `unknown` into
  `Book[]`, dropping anything that isn't a real book and never throwing on a merely-odd record (a
  non-array body is the one thing treated as an actual error, not an empty list).
- **Repository** (`services/books/BooksRepository.ts`) speaks the domain model (`Book`, not DTOs)
  and decides which gateway method a given filter maps to. It's the only repository in the app —
  nothing else here has enough mapping or source-selection complexity to earn one; a plain
  service/gateway call would do for anything simpler than "two possible sources plus untrusted
  wire data," which is exactly the books case and nothing else.
- **Controller** (one per feature: `BooksPageController`, `AddBookFormController`,
  `AppHeaderController`) owns loading state, error messages, validation, formatting, and the view
  model. Plain TypeScript classes — no React import, fully constructible and testable with fakes,
  zero DOM.
- **Store** (`stores/BooksStore.ts`, `stores/UserStore.ts`) holds only observable data and a
  `booksRevision` counter (see below). No store method is `async`.
- **View** connects exactly one controller via `useController` and renders its VM. Every `.tsx`
  file was checked against that rule line by line; the two deliberate exceptions are `useDi()`
  (the sanctioned path to a controller's constructor dependencies — data, not logic) and the
  handful of `components/` primitives that unwrap a raw DOM event before calling a prop (e.g.
  `Input`'s `onChange`), which keeps every feature view's own handler a bare `vm.someAction` pass-through.

**File layout**: `components/` is reusable, zero-domain-knowledge UI (`Button`, `Input`, `Spinner`,
`ErrorMessage`, `RadioGroup`) — none of it imports anything from `services/` or `stores/`.
`features/` is everything that knows what a "book" is. The rule of thumb: if the word "book"
appears in a file, it's a feature; otherwise it's a component.

## Decisions and trade-offs

**Why one Repository and not five.** A repository earns its place by doing real translation work:
DTO↔domain mapping plus "which of two sources do I read from." Nothing else in this app has either
property, so nothing else gets one — `UserStore` and `BooksStore` talk to no service at all, and
adding a repository layer under them would be structure with no job to do.

**Why hand-rolled DI instead of a container library.** The whole graph is four things
(`HttpClient`, `BooksGateway`, `BooksRepository`, two stores), built once in
`core/di/Container.ts` and handed to the tree through one context. A dependency-injection
framework would replace ~30 lines of straightforward constructor calls with decorators, tokens,
and a runtime resolution step for a graph that never grows past four nodes.

**How the private counter stays correct on both tabs, and after a create — without a callback
threaded through the view.** The header's controller and the books-page controller are both local,
independently-lifecycled controllers; neither is allowed to hold a reference to the other, and
composing "call both of their reload methods" as an inline callback in a view is itself logic
living in a view. Instead, `BooksStore` carries a plain `booksRevision` counter and a
`bumpBooksRevision()` action. `AddBookFormController` bumps it after a successful create; both
`BooksPageController` and `AppHeaderController` set up a MobX `reaction` on it in their own
`init()` (disposed in their own `dispose()`) and reload themselves when it changes. Nobody
imports anybody else — the store is the entire coordination mechanism, and `fireImmediately`
staying `false` on both reactions is what stops that reload from firing during setup, before any
book has actually been created. On the "All" tab, `BooksPageController` renders `booksStore.books`;
the header always renders `booksStore.privateCount`, a MobX `computed` over
`booksStore.privateBooks` — a separate field entirely, so an all-books update never touches
anything the header reads, and the header never re-renders for it.

**Disposal and cancellation.** Every controller that fetches owns an `AbortController` and an
`isDisposed` flag; `dispose()` sets both. A response that arrives after disposal, or after being
superseded by a newer request from the same controller (a monotonic version counter), is
discarded rather than committed. React 18 StrictMode's dev-only double
mount → cleanup → mount means `init()` can run twice on one instance; `isDisposed` is reset at the
top of `init()` for exactly that reason, with the trade-off written down in a comment there: a
duplicate request from the first, cleaned-up mount is accepted (it's aborted immediately, and it's
dev-only), while correctness of the final, committed state is what's actually guarded.
`AddBookFormController` is the one controller without an `init()` — nothing there auto-starts on
mount, so there's no double-invoke hazard to guard against in the first place.

**Avoiding unnecessary re-renders.** Every async state transition commits through exactly one
`runInAction`. Internal bookkeeping fields (`abortController`, `requestVersion`, `isDisposed`,
a reaction's disposer) are explicitly annotated out of `makeAutoObservable` — nothing renders
because of them, so MobX shouldn't track them. List rows are `React.memo`, not `observer()` — a
row reads no MobX observable directly (its title string is already resolved by the controller), so
`observer()` would have been the wrong tool for the job; using it anyway produced a real MobX
warning at runtime ("created/updated without reading any observable value"), which is what caught
the mistake.

**Left out on purpose**: no routing library (the All/Private switch is state, not a route); no
Redux/Zustand/React Query (MobX only); no generic `BaseController<T>`/`AbstractRepository<T>`; no
event bus (the revision-counter reaction replaces exactly the coordination one would otherwise
provide); no MSW (gateway tests inject a fake `HttpClient` instead); no caching, retry/backoff, or
optimistic updates. `mobx-react`'s `observer` is a re-export of `mobx-react-lite`'s — kept because
`mobx-react` was already a dependency of the project being refactored, not added fresh; noted once
here rather than every time it comes up.

## Known limitations / what's next

- **Synthetic key collisions.** A book created via the private feed has no server-assigned id, so
  it's keyed by its position in that response plus its name (`pos:<index>:<name>`). Two private
  books with an identical name and author, created without a reload between them, would collide on
  that key. A narrow edge case — not worth a client-generated UUID for a field the server itself
  never provides.
- **No optimistic UI.** After creating a book, the list and the header count update once their own
  reactions refetch — not at the instant the POST resolves. Deliberate: the POST response carries
  no entity to render optimistically from, and a real refetch a moment later is simpler than
  reconciling a synthetic local record against whatever the server eventually returns.
- **No delete.** Not asked for, and the demo API doesn't expose one — only create, list, and a
  full per-user reset.
