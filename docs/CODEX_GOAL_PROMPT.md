Build **RepoView** by following `tasks.md` strictly from top to bottom.

Before doing any implementation work:

1. Read `docs.md` completely. It is the authoritative architecture, security, UI, database, GitHub, Markdown, notification, and deployment specification.
2. Read `tasks.md` completely. It is the execution order and completion checklist.
3. Inspect the entire provided `design-system/` folder before making UI decisions.
4. Inspect the rest of the repository and determine the current implementation state.

Then work on **only the first unchecked task in `tasks.md`**.

For each task:

- reread the relevant sections of `docs.md`;
- inspect the existing implementation before editing;
- implement the task completely;
- run the task's verification commands/tests;
- manually inspect affected UI or behavior when applicable;
- fix all failures and regressions;
- update `tasks.md` from `[ ]` to `[x]` only after the acceptance criteria are genuinely satisfied;
- add an implementation note in `tasks.md` if you deliberately deviate from `docs.md`;
- then continue to the next unchecked task.

Keep doing this sequentially until every task in `tasks.md` is complete.

Important rules:

- Do not skip tasks.
- Do not batch-mark tasks complete.
- Do not mark work complete merely because code was written.
- Do not stop after scaffolding.
- Do not leave core TODOs/placeholders.
- Do not redesign the architecture without a concrete technical reason.
- When implementation details are unclear, use `docs.md` first and current official documentation second.
- Preserve good existing code instead of replacing it unnecessarily.
- For every UI task, inspect `design-system/` first and reuse the closest existing primitive/variant before writing new UI code.
- Prefer composing design-system components under RepoView's `components/` directory over modifying shared design-system primitives.
- Modify `design-system/` only when a shared primitive genuinely needs a reusable extension or contains a defect; keep such changes backward-compatible and document them in `tasks.md`.
- Use the design system's existing styling stack and theme mechanism. Do not add Tailwind, Radix, Base UI, `next-themes`, or another UI/theme dependency just because it is familiar.
- Keep secrets server-side.
- Use Supabase SDK directly; do not add Prisma, Drizzle, Clerk, Firebase, Auth0, or another database/auth abstraction.
- Keep Next.js pinned to exactly **16.3.3**.
- Use the provided `design-system/` folder as the authoritative UI source. Reuse its components, variants, tokens, typography, themes, spacing, surfaces, navigation patterns, form controls, overlays, tables, loading states, and accessibility conventions. Do not initialize shadcn/ui or another parallel component library. Do not recreate a component or token when an equivalent already exists in `design-system/`.
- Use Shiki for source-code and Markdown code-block highlighting.
- README and all Markdown rendering must work correctly, including GFM tables, task lists, fenced code, safe links, nested relative links, and private relative images.
- Use a GitHub App for read-only private repository access.
- Use Gmail SMTP through Nodemailer for meaningful-view notifications.
- Keep RepoView deployable to Vercel at `code.thrn.im`.
- Never expose GitHub App credentials, installation tokens, Supabase service-role credentials, SMTP credentials, raw share tokens, viewer-session tokens, or unrestricted private source URLs to the browser.
- A simple email/link scanner must not trigger a confirmed-view notification.

After every meaningful implementation step, inspect the result before continuing.

Before considering RepoView finished, run:

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Fix every failure.

The project is complete only when:
- every checkbox in `tasks.md` is `[x]`;
- `docs.md` matches the implementation;
- `README.md` contains reproducible setup/deployment instructions;
- all quality gates pass;
- the end-to-end private share flow works;
- code and Markdown render correctly;
- meaningful-view Gmail notifications work;
- revoked/expired links are denied;
- no core security requirement in `docs.md` is violated.

Start with the first unchecked task in `tasks.md`.
