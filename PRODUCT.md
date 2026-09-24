# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Developers and technical owners who need to show private source code to recruiters, investors, clients, or collaborators without granting repository access.

## Product Purpose

RepoView creates a scoped, read-only share link for a private repository. The recipient can browse a GitHub-like repository experience without authenticating, while the owner can understand how the shared repository was engaged with.

## Positioning

The product combines a secure private share with a purpose-built repository viewer and engagement analytics, so private work can be reviewed with the context of GitHub without becoming public.

## Operating Context

Owners connect GitHub App-backed repositories, choose a repository and ref, create a share, and send the link. Recipients browse rendered Markdown, source, images, diagrams, and an authorized file tree. Owners review activity and receive low-volume, deduplicated notifications for meaningful views.

## Capabilities and Constraints

- Repository access remains server-side and viewers receive read-only sessions.
- Shares can be scoped, expired, revoked, and configured with branch/ref controls.
- View analytics use first-party anonymous identifiers plus approximate observed context; they do not claim verified identity, use raw keylogging, or request browser permissions.
- Downloads are disabled by default and only available when explicitly enabled by the owner.
- The public homepage must avoid invented testimonials, customer logos, performance benchmarks, or unsupported security claims.

## Brand Commitments

The product name is RepoView. The interface should feel minimal, premium, technical, and closer to Linear, Vercel, Raycast, and GitHub than to a loud startup marketing site.

## Evidence on Hand

The repository contains working viewer, analytics, dashboard, share, privacy, and notification surfaces that establish the product vocabulary. No customer logos, testimonials, or external proof assets were supplied.

## Product Principles

- Private by default.
- Show context, not credentials.
- Make technical review feel familiar.
- Measure engagement without pretending to know a person’s identity.

## Accessibility & Inclusion

The homepage should be keyboard accessible, responsive across desktop and mobile, use semantic landmarks and labels, preserve visible focus states, and respect reduced-motion preferences.
