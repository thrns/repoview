# Viewer analytics data inventory

RepoView uses a small set of viewer signals to answer two questions: was a
share opened, and what repository content did the viewer engage with? The
inventory below is the source of truth for collection and storage.

## Stored fields

| Field or signal | Purpose | Classification | Treatment |
| --- | --- | --- | --- |
| Workspace/share/session IDs | Scope access and join product events | Necessary | Stored as relational identifiers |
| Session timestamps, `confirmed_at`, and `ended_at` | Session lifecycle, confirmed-view counts, duration | Necessary | Stored; duration is derived from timestamps |
| `analytics_mode`, `gpc_applied` | Enforce the viewer's privacy choice | Necessary | Stored on each session |
| `notified_at`, `session_summary_notified_at` | Prevent duplicate owner notifications | Necessary | Internal delivery state; not viewer analytics |
| `viewer_id`, `viewer_code` | Returning-visit recognition when optional analytics is enabled | Optional | Workspace-scoped pseudonymous ID; never created in necessary-only mode |
| `is_returning_visit`, `previous_visit_count` | Show first vs returning visits | Optional | Stored only for optional sessions |
| `entry_path`, `exit_path` | Show where a session started and ended | Optional | Coarse repository-relative path only |
| `referrer_host` | Explain a share's high-level traffic source and possible forwarding | Optional | Host only; URL, query, fragment, and credentials are removed |
| Fetch-site and prefetch signals | Distinguish browser/link scanners from human navigation | Necessary | Used in memory and optional link-open metadata; no URL or request body is stored |
| Browser family, OS family, device category | Useful owner-facing viewing context | Optional | Coarse allow-listed labels only; versions and raw user agents are discarded |
| Country, region, city | Coarse location context where available | Optional | Provider-supplied labels only; no postal code, timezone, or coordinates |
| `active_ms` and file active duration | Engagement duration and time spent on files | Optional | Client-reported values are bounded and accumulated server-side |
| File paths, content kind, view count, first-view order | Show what was viewed and in what order | Optional | Repository-relative paths only |
| Search, search-result, copy, download, and view events | Product engagement reporting | Optional | Event names and bounded metadata; search text is not stored |
| `is_probable_bot` | Suppress false view notifications and identify automation | Necessary | Boolean signal only |
| VPN/proxy/Tor/datacenter/automation/link-forwarding signals | Abuse and security review | Necessary | Compact booleans/counters in `security_signals` and bounded boolean columns; probabilistic only |
| `ip_hash` | Rate limiting and security correlation | Necessary | Salted workspace-scoped HMAC; raw IP is not stored |
| Token hash, validity, failure reason, token age, referrer host, timestamps | Bearer-link abuse and security logging | Necessary | Stored in `share_access_attempts`; no raw IP or device profile |
| Notification delivery timestamps/status | Delivery idempotency and operations | Necessary | Stored separately from viewer analytics |

## Not collected or no longer stored

RepoView no longer stores raw public IPs, IP version, postal area, timezone,
continent, latitude/longitude, ASN or ISP organization, HTTP protocol, raw
user-agent strings, browser/OS versions, rendering engine, architecture,
language lists, screen/viewport size, pixel ratio, color depth, orientation,
CPU count, approximate memory, touch capability, dark mode, reduced-motion
preference, device-profile hashes, network-profile hashes, focus/visibility
change counters, idle time, maximum directory depth, or scroll-depth events.

These values either did not have a clear RepoView product or security use or
created unnecessary fingerprinting and precision. They are removed from the
database by the minimization migration; they are not merely hidden from the
dashboard.

## Privacy modes

Every new share session starts in **Necessary only** mode. Necessary mode may
process the ordinary request IP in memory, derive a salted IP hash, run bot and
abuse checks, and write security logs. It does not create a persistent viewer
ID or store optional engagement context. Optional engagement is collected only
after the viewer chooses it, and is disabled by a recognized Global Privacy
Control signal.
