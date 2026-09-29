import { RETENTION_DAYS } from './retention-policy'

export const TERMS_MARKDOWN = String.raw`
# RepoView Terms of Service

**Effective date:** September 23, 2026  
**Last updated:** September 24, 2026

RepoView is an independently developed, publicly available software project operated by **Tharun Pranav Sakthivel**, an individual developer based in **Vancouver, British Columbia, Canada** ("**RepoView**," "**I**," "**me**," or "**my**").

These Terms of Service ("**Terms**") govern access to and use of the RepoView website, Owner dashboard, repository-sharing features, share pages, rendering features, analytics, and related functionality (collectively, the "**Service**").

By creating an account, connecting a repository, creating or managing a share, or using a RepoView share, you agree to these Terms. If you do not agree, do not use the Service.

The Privacy Policy forms part of the rules governing use of RepoView and explains how personal information is handled.

## 1. Definitions

- **"Owner"** means a person or organization that connects a repository, creates or manages a RepoView share, or controls a RepoView Owner account.
- **"Viewer"** means a person who accesses Repository Content through a RepoView share.
- **"Repository Content"** means code, documentation, images, diagrams, files, repository/ref information, and other material made available through a repository or share.
- **"Share"** means a RepoView URL or access mechanism used to make selected Repository Content available to a Viewer.
- **"Analytics"** means pseudonymous session, interaction, technical, network, and engagement information associated with a Share, as described in the Privacy Policy.
- **"Recipient Label"** means a name, company, email address, role, source/campaign label, or note that an Owner associates with a Share or unique link.

## 2. Eligibility and authority

You must have the legal capacity required in your jurisdiction to agree to these Terms.

If you use RepoView on behalf of a company, university, employer, client, club, or other organization, you represent that you are authorized to do so and to provide or share the relevant Repository Content.

RepoView is not intended for use by children in circumstances where they cannot legally agree to these Terms or where parental consent is required and has not been obtained.

## 3. What RepoView provides

RepoView may allow Owners to:

- connect or select repositories and refs;
- create limited-distribution bearer-link Shares; the connected repository itself may be private on GitHub;
- render source code, Markdown, images, diagrams, and other repository files;
- review engagement associated with a Share;
- receive configured notifications; and
- manage shares and analytics through an authenticated dashboard.

Viewers may be able to browse a Share without creating a RepoView account.

RepoView is an independently maintained public project. Features may be incomplete, experimental, changed, suspended, or removed at any time. Unless I expressly state otherwise in writing, RepoView does not provide a service-level agreement, guaranteed support response time, guaranteed uptime, or enterprise support commitment.

## 4. Owner accounts and security

Owners are responsible for:

- providing accurate account information;
- protecting authentication credentials;
- keeping connected GitHub or other service accounts secure;
- reviewing the permissions granted to RepoView;
- revoking access that is no longer needed; and
- notifying me at **tharunpranav.ubc@gmail.com** if an Owner account or Share may have been compromised.
Do not share authentication credentials in a way that bypasses RepoView security or access restrictions.

I may require re-authentication, revoke sessions, rate-limit traffic, disable a Share, or take other reasonable steps to protect the Service or its users.

## 5. GitHub and other connected services

RepoView may integrate with GitHub or other third-party services. Those services remain governed by their own terms, policies, permissions, availability, and APIs.

When an Owner authorizes an integration, the Owner instructs RepoView to access information and Repository Content within the permissions granted for the purpose of providing RepoView features.

The Owner is responsible for ensuring that:

- the Owner has authority to connect the relevant account, repository, organization, and ref;
- RepoView is granted only appropriate permissions;
- sharing the Repository Content does not violate an NDA, employment agreement, client obligation, license, confidentiality duty, privacy right, intellectual-property right, or other restriction; and
- access is revoked when no longer appropriate.

RepoView is not responsible for a third-party service's outage, API change, account restriction, authorization decision, or other event outside my reasonable control.

## 6. Repository Content and ownership

As between an Owner and RepoView, the Owner retains whatever rights the Owner has in Repository Content. These Terms do not transfer ownership of Repository Content to me.

The Owner grants RepoView a limited, non-exclusive, worldwide license to access, cache, reproduce, transform for rendering, transmit, and display Repository Content **only as reasonably necessary to operate, secure, maintain, and provide the Service and the Shares the Owner creates**.

That license ends when the relevant content is removed from active systems, subject to ordinary backup rotation, legal preservation requirements, and technical caching that expires in the normal course.

An Owner must not connect or share Repository Content that:

- the Owner is not authorized to disclose;
- unlawfully contains another person's personal information;
- infringes copyright, trademark, patent, trade-secret, privacy, publicity, contractual, confidentiality, or other rights;
- contains malicious code intended primarily to compromise RepoView or another system without authorization; or
- is illegal to possess, transmit, or make available in the relevant context.

## 7. Shares are bearer links, not identity verification

Unless RepoView expressly adds a separate authentication feature, possession of a valid Share link may be sufficient to open that Share.

**Treat a Share link like a confidential bearer link.** Anyone who receives, obtains, or is forwarded the link may be able to access it until it expires or is revoked.

RepoView does not guarantee that:

- only the intended recipient opened the Share;
- a Share was not forwarded, copied, previewed, or opened from several devices;
- a browser session corresponds to one human being;
- an IP address, device, network, company association, city, or location proves identity; or
- a Recipient Label identifies the actual Viewer.

A Recipient Label describes the Owner's intended recipient or context. It is **not authentication**. RepoView should present that identity as **Unverified** unless separate identity verification is introduced.

Owners are responsible for choosing a sharing method appropriate to the sensitivity of their Repository Content. RepoView is not a substitute for a secured source-control account, data room, clean-room environment, digital-rights-management system, NDA, or other control where those protections are required.

## 8. Analytics are signals, not proof

RepoView may provide Analytics for a Share as described in the Privacy Policy. Depending on configuration and privacy choices, Analytics may include session timing, repository-relative file and directory interactions, searches, copy/download actions, coarse browser/device context, approximate city/region/country labels, and probabilistic security signals.

Depending on the Owner's settings and the Viewer's privacy choice, Owners may receive Analytics through dashboard interfaces, view notifications, and session-summary emails. A view notification may include a pseudonymous Viewer label, Recipient Label, first-or-returning-visit status, repository/ref, timestamp, browser, operating system, device category, approximate location, and referring host. A session-summary email may include session duration, files and directories viewed, search/copy/download counts, first and last file, top files by dwell, and probabilistic security signals.

Analytics can be incomplete or inaccurate.

You must not represent RepoView Analytics as verified proof of:

- a particular person's identity;
- employment by or affiliation with a particular company;
- precise physical location;
- a person's intent, interest, motive, competence, or decision;
- whether a human or automated system performed every event; or
- wrongdoing or misconduct.

VPN/proxy/Tor detection, IP-to-company mapping, bot detection, approximate location, and similar signals are probabilistic and may be wrong.

RepoView may suppress, delay, or remove Analytics where reasonably necessary for privacy, security, legal compliance, abuse prevention, or system integrity.

## 9. Privacy and lawful use of Analytics

Your use of RepoView is subject to the Privacy Policy.

Owners are responsible for ensuring that their creation, distribution, labelling, monitoring, and use of Shares and Analytics comply with laws and obligations that apply to them.

You must not use RepoView to:

- secretly collect information where applicable law requires notice or consent;
- unlawfully attempt to identify or deanonymize a Viewer using RepoView data and external data;
- stalk, harass, intimidate, or monitor a person outside the legitimate context in which a Share was provided;
- infer a person's sensitive or legally protected characteristics from RepoView Analytics;
- use approximate location, network/company mapping, or engagement signals as conclusive evidence of identity or misconduct;
- make an unlawful employment, housing, credit, insurance, education, or similar eligibility decision based on RepoView Analytics; or
- combine RepoView Analytics with advertising/data-broker information for unrelated behavioural profiling.

If an Owner adds a recipient's name, email address, company, role, or notes, the Owner is responsible for having an appropriate and lawful reason to store and use that information.

## 10. Recruiting, portfolio, and review use

RepoView may be used to share engineering or project work with recruiters, hiring managers, collaborators, reviewers, clients, or other recipients.

RepoView Analytics may help an Owner understand whether and how a Share was interacted with, but they do not establish why a Viewer opened a file, whether a recipient personally performed every event, whether a recipient formed a positive or negative opinion, or what decision anyone should make.

Owners remain responsible for complying with any employment, recruiting, anti-discrimination, accessibility, candidate-record, monitoring, and privacy requirements that apply to their own use of RepoView.

## 11. Acceptable use

You must not use RepoView to:

- violate applicable law or another person's rights;
- gain unauthorized access to an account, repository, share, system, or data;
- bypass share expiry, revocation, authorization checks, rate limits, or security controls;
- distribute malware, credential-stealing code, ransomware, or destructive payloads;
- operate phishing, fraud, impersonation, or deceptive schemes;
- intentionally create fake engagement or misleading Analytics;
- scrape or automate requests at a volume that materially interferes with the Service;
- conduct denial-of-service activity;
- probe or exploit vulnerabilities outside a good-faith security-testing context authorized by me or protected by applicable law;
- use the Service to facilitate unlawful discrimination, harassment, stalking, or privacy invasion; or
- intentionally interfere with the operation or security of RepoView.

I may use technical controls to enforce this Section.

## 12. Secrets and confidential information

Before creating a Share, Owners should review Repository Content for material that should not be exposed, including:

- passwords, API keys, access tokens, private keys, signing secrets, database credentials, or environment files;
- production customer/user data;
- confidential employer or client information;
- personal information that should not be disclosed;
- regulated health, financial, educational, or government-identification information;
- export-controlled or otherwise restricted technical information; and
- third-party code or documents the Owner is not authorized to share.

RepoView may provide protections intended to reduce accidental exposure, but the Owner remains responsible for deciding whether specific content is appropriate to share.

If a credential or secret is accidentally exposed, revoking a RepoView Share does **not** rotate or invalidate the credential. The Owner must rotate/revoke the credential at its source.

## 13. Free project; future paid features

RepoView is currently provided as a public project without a promise of paid-service features.

No fee, subscription, renewal obligation, refund right, service credit, or service-level commitment exists unless I separately introduce a paid offering with clear terms before purchase.

If paid features are introduced later, the applicable price, billing interval, renewal/cancellation rules, taxes, refund terms, and any additional conditions will be disclosed before a user is charged. These Terms will be updated where appropriate.

## 14. Feedback

If you voluntarily send feedback, suggestions, bug reports, or feature ideas, you give me permission to use them to improve RepoView without an obligation to compensate you.

This permission does not transfer ownership of your Repository Content or confidential information.

Do not send feedback containing information you are not authorized to disclose.

## 15. RepoView intellectual property

Except for Repository Content and third-party/open-source components, RepoView's software, interface, design, branding, documentation, and other original project materials are owned by me or licensed to me.

Your right to use the hosted Service is limited, non-exclusive, revocable, non-transferable, and subject to these Terms.

If RepoView's source code or specific components are released under an open-source license, that license governs your use of the licensed source code. **Public availability of the hosted project does not, by itself, grant an open-source license to code that has not been released under one.**

Third-party software remains subject to its own license terms.

## 16. Copyright and rights complaints

If you believe content available through RepoView infringes your copyright, privacy, confidentiality, or other legal rights, contact **tharunpranav.ubc@gmail.com** and include enough information to identify the material, explain the claimed right, and allow me to contact you.

I may temporarily restrict or remove access while reviewing a good-faith complaint. Where appropriate and legally permitted, I may notify the affected Owner.

Submitting a knowingly false legal or infringement complaint may itself create liability.

## 17. Availability, changes, and experimental features

RepoView is provided as an independently maintained public software project and may change frequently.

I do not guarantee that the Service will be uninterrupted, error-free, secure against every attack, compatible with every repository/file, or available indefinitely.

RepoView may be affected by maintenance, bugs, provider outages, Internet failures, GitHub/API changes, security incidents, dependency failures, legal requirements, or events outside my control.

I may add, change, limit, suspend, or discontinue features at any time. Where reasonably practical, I will avoid intentionally making a material change that creates unnecessary risk to existing user data without notice.

Features marked beta, preview, experimental, or similar may be incomplete and should not be relied on for high-risk or legally regulated workflows without independent safeguards.

## 18. Suspension and termination

You may stop using RepoView at any time. Owners may revoke or delete Shares using available controls.

I may restrict, suspend, or terminate access, revoke a Share, or block traffic if I reasonably believe that:

- these Terms have been materially breached;
- use of RepoView creates a material security, legal, privacy, or operational risk;
- activity is fraudulent, abusive, or harmful;
- action is necessary to respond to a vulnerability or compromised account/share;
- a third-party platform requires it; or
- applicable law or legal process requires it.

Where reasonable and safe, I may provide notice or an opportunity to correct a remediable issue. Immediate action may be taken for security, abuse, fraud, or legal reasons.

After termination, information will be handled according to the Privacy Policy and ordinary backup/deletion cycles.

Sections that logically survive termination, including ownership, disclaimers, liability limitations, indemnity, and dispute provisions, continue to apply.

## 19. Third-party services and links

RepoView may depend on or link to third-party services, including GitHub, Supabase, hosting or infrastructure providers, and email providers.

I do not control and am not responsible for third-party content, terms, privacy practices, security, availability, or decisions.

Following an external link may cause the destination site to receive ordinary browser/request information according to that site's own practices.

## 20. Disclaimers

TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, REPOVIEW IS PROVIDED **"AS IS" AND "AS AVAILABLE."**

I DISCLAIM WARRANTIES, REPRESENTATIONS, AND CONDITIONS NOT EXPRESSLY STATED IN THESE TERMS, INCLUDING IMPLIED WARRANTIES OR CONDITIONS OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, NON-INFRINGEMENT, ACCURACY, QUIET ENJOYMENT, AND UNINTERRUPTED OR ERROR-FREE OPERATION.

WITHOUT LIMITING THE ABOVE, I DO NOT WARRANT THAT:

- A SHARE WILL REMAIN CONFIDENTIAL AFTER AN OWNER GIVES THE URL TO ANOTHER PERSON;
- REPOSITORY CONTENT WILL NEVER BE COPIED, DOWNLOADED, SCREENSHOTTED, OR FORWARDED BY A VIEWER;
- ANALYTICS WILL IDENTIFY A PARTICULAR PERSON, COMPANY, DEVICE, OR LOCATION;
- ANALYTICS WILL BE COMPLETE OR FREE OF BOT/AUTOMATION EFFECTS;
- A VIEWER'S BEHAVIOUR REVEALS THEIR INTENT, OPINION, OR DECISION;
- THIRD-PARTY SERVICES WILL REMAIN AVAILABLE; OR
- THE SERVICE WILL BE FREE FROM EVERY SECURITY VULNERABILITY.

Some jurisdictions do not allow certain warranty exclusions. In those jurisdictions, the exclusions apply only to the maximum extent permitted by law.

## 21. Limitation of liability

TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, I WILL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, PUNITIVE, OR CONSEQUENTIAL DAMAGES, OR FOR LOSS OF PROFITS, REVENUE, BUSINESS, OPPORTUNITY, GOODWILL, DATA, OR REPOSITORY CONTENT, ARISING OUT OF OR RELATED TO REPOVIEW, EVEN IF ADVISED THAT SUCH LOSS COULD OCCUR.

TO THE MAXIMUM EXTENT PERMITTED BY LAW, MY TOTAL AGGREGATE LIABILITY ARISING OUT OF OR RELATING TO REPOVIEW WILL NOT EXCEED THE GREATER OF:

1. THE AMOUNT YOU PAID DIRECTLY FOR REPOVIEW DURING THE 12 MONTHS BEFORE THE EVENT GIVING RISE TO THE CLAIM; OR
2. **CAD $100**.

These limitations do not exclude liability that cannot lawfully be excluded or limited and do not reduce non-waivable consumer rights.

Because RepoView is a project operated by an individual rather than a separate corporation, these Terms do not create a corporate liability shield. They define the contractual limits of the Service only to the extent enforceable under applicable law.

## 22. Indemnity for Owner-controlled content and use

To the extent permitted by law, if you are an Owner, or use RepoView on behalf of an organization, you agree to indemnify and hold me harmless from third-party claims, damages, penalties, costs, and reasonable legal expenses arising from:

- Repository Content you connect, upload, or share without the required rights or authorization;
- your unlawful or unauthorized use of Analytics;
- recipient labels or personal information you add without a lawful basis;
- your violation of another person's intellectual-property, confidentiality, privacy, or contractual rights; or
- your material breach of these Terms.

This Section does not require you to indemnify me for a claim to the extent caused by my own fraud, wilful misconduct, or liability that cannot lawfully be shifted to you.

## 23. Governing law and disputes

Except where mandatory consumer or privacy law requires otherwise, these Terms and disputes arising from them are governed by the laws of the **Province of British Columbia and the applicable federal laws of Canada**, without regard to conflict-of-law rules.

Subject to any mandatory right to bring a claim elsewhere, the courts located in **British Columbia, Canada** will have jurisdiction over disputes arising from or relating to these Terms or RepoView.

Nothing in this Section prevents either party from seeking urgent injunctive or protective relief from a court with jurisdiction where reasonably necessary to protect security, confidential information, intellectual property, or legal rights.

## 24. Changes to these Terms

I may update these Terms as RepoView evolves.

The displayed effective and last-updated dates identify the published copy. RepoView's application legal-version records may be maintained separately. If a change materially affects existing Owners' rights or obligations, I will provide reasonable notice where practical or where required by law.

Continued use after updated Terms take effect constitutes acceptance to the extent permitted by law. If applicable law requires express agreement to a particular change, I will seek that agreement.

## 25. Assignment and project transfer

You may not transfer an Owner account in a way that circumvents security restrictions or gives an unauthorized person access to repositories or Analytics.

I may transfer operation of RepoView and these Terms to a successor operator or legal entity if RepoView is incorporated, sold, or otherwise transferred, subject to applicable law and the Privacy Policy. Where required, users will receive notice of a material change in the operator.

## 26. General terms

If a provision of these Terms is found unenforceable, it will be enforced to the maximum extent permitted and the remaining provisions will remain in effect.

A failure to enforce a provision is not a waiver of the right to enforce it later.

Headings are for convenience only.

These Terms, together with the Privacy Policy and any additional terms expressly presented for a specific feature, form the agreement governing use of the hosted RepoView Service.

No person other than the parties to these Terms has a right to enforce them except where applicable law provides otherwise.

## 27. Contact

Questions about these Terms or rights complaints: **tharunpranav.ubc@gmail.com**  
Technical or account support: **tharunpranav.ubc@gmail.com**  
Privacy requests: **tharunpranav.ubc@gmail.com**

**RepoView**
- Operator: **Tharun Pranav Sakthivel**
- Location: **Vancouver, British Columbia, Canada**
- Privacy contact / Privacy Officer: **Tharun Pranav Sakthivel**
- Email: **tharunpranav.ubc@gmail.com**
`

export const PRIVACY_MARKDOWN = String.raw`
# RepoView Privacy Policy

**Effective date:** September 23, 2026  
**Last updated:** September 24, 2026

RepoView is an independently developed, publicly available software project operated by **Tharun Pranav Sakthivel**, an individual developer based in **Vancouver, British Columbia, Canada** ("**RepoView**," "**I**," "**me**," or "**my**").

This Privacy Policy explains what information RepoView collects, why it is collected, how it is used and disclosed, how long it is kept, and the choices available to people who use RepoView.

For privacy requests or questions, contact **tharunpranav.ubc@gmail.com**.

## 1. Scope

This Policy applies to:

- people who create or manage RepoView shares or connect repositories ("**Owners**");
- people who open or interact with a repository through a RepoView share link ("**Viewers**"); and
- visitors to RepoView's public website or people who contact me about RepoView.

RepoView may link to or integrate with third-party services such as GitHub. Those services have their own privacy practices and are not controlled by this Policy.

## 2. Privacy summary

RepoView is designed to let an Owner share selected repository content and understand how a share is used without requiring the Viewer to create a RepoView account.

When a Viewer opens a valid Share, RepoView may process:

- a **pseudonymous** first-party Viewer identifier, only after Optional engagement analytics is enabled;
- a server-side Viewer session and bearer-link/access records;
- repository and file interaction events, only in Optional engagement analytics mode;
- coarse browser, operating-system, and device-category context when Optional engagement analytics is enabled;
- coarse city, region, or country labels when Optional engagement analytics is enabled; and
- a salted, workspace-scoped IP hash and compact security/abuse-prevention signals. The ordinary request IP may be processed transiently for security and rate limiting, but the raw IP is not persisted in the RepoView application database.

RepoView may make relevant Share Analytics available to the Owner through dashboard interfaces and, where configured, view notifications or session-summary emails.

A RepoView viewer identifier is **not a verified identity**. A recipient-labelled share link is also **not proof that the intended recipient opened the link**. Links can be forwarded, opened on multiple devices, inspected by automated systems, or used by someone other than the intended recipient.

RepoView does **not** intentionally collect precise GPS location, raw keystrokes, camera or microphone content, Bluetooth or USB information, or clipboard contents for Viewer Analytics. RepoView does not sell Viewer personal information and does not use Viewer Analytics for third-party advertising or cross-service behavioural advertising.

## 3. Information collected from Owners

Depending on the features used, RepoView may process:

- name, email address, authentication identifier, profile information, and account settings;
- GitHub or other connected-service identifiers and authorization metadata;
- repository names, repository IDs, branches, refs, installation identifiers, and permissions needed to provide the requested feature;
- share settings, share tokens, creation/expiry times, revocation status, and repository/ref selection;
- recipient labels supplied by the Owner, which may include a name, company, email address, role, source/campaign label, or notes;
- support requests, feedback, bug reports, and correspondence; and
- account, security, and administrative logs.

RepoView does not ask for or need an Owner's GitHub password. When GitHub authorization is used, access is limited by the permissions granted through GitHub.

Owners can download an account export from Settings. The export includes their account profile, workspace memberships, workspace configuration, repository and share metadata, share recipient metadata, notification settings, connected GitHub installation metadata, relevant analytics, and account activity. It does not include passwords, provider credentials, private keys, bearer tokens, or raw session-token verifiers.

## 4. Information collected from Viewers

### 4.1 Pseudonymous identifiers and sessions

RepoView may create or receive:

- a first-party pseudonymous Viewer identifier, only after Optional engagement analytics is enabled;
- a server-side Viewer session identifier and session-token hash;
- a Share, hashed Share-token, and access-attempt identifier;
- timestamps, session start/end, active engagement duration, and returning-session status when Optional engagement analytics is enabled; and
- consent, objection, or analytics-preference records where applicable.

A pseudonymous identifier distinguishes browser activity over time but does not establish a person's legal name or identity. The database Viewer record is workspace-scoped, so the same browser may be recognized across that Owner's Shares in that workspace when the Viewer identifier cookie is available. It is not identity verification.

### 4.2 Repository interaction analytics

RepoView may record events such as:

- a Share link being opened and a Viewer session being confirmed;
- repository and ref activity;
- directories, pages, source files, Markdown, images, diagrams, and other repository-relative paths opened or viewed;
- first-view order and active engagement duration for file views;
- search and search-result events;
- copy and download actions; and
- entry and exit paths and session-ended events.

RepoView does not intentionally record every key pressed while a Viewer types. Search events store a bounded signal such as query length, not the submitted search text.

RepoView may add new analytics features in the future. Materially new categories of personal information will be reflected in this Policy and, where required, the relevant notice or privacy choice before the new processing applies.

### 4.3 Browser, device, and request context

Depending on what the browser, network request, host, CDN, or security layer provides, RepoView may process:

- browser family, operating-system family, and device category when Optional engagement analytics is enabled;
- a referring host, without URL paths, queries, fragments, or credentials, for some link-open/security records and, when Optional engagement analytics is enabled, for Viewer session Analytics;
- fetch-site, prefetch, link-preview, and bot/automation signals for share-open and security processing; and
- the ordinary request IP transiently, plus a salted workspace-scoped IP hash and VPN, proxy, Tor, datacenter, and unusual-traffic indicators for Necessary-only security processing.

### 4.4 Approximate location and security/network signals

RepoView may derive a coarse country, region/province/state, or city label from provider infrastructure metadata when Optional engagement analytics is enabled.

RepoView may also receive or derive probabilistic indicators such as likely VPN, proxy, Tor, hosting/datacenter, bot/automation, or unusual traffic signals.

These signals are **estimates, not facts**. They may be incorrect because of VPNs, proxies, corporate gateways, cellular networks, privacy relays, shared networks, automated previews, or inaccurate third-party databases.

RepoView does not request browser precise-location/GPS permission for Share Analytics and does not store postal codes, timezones, coordinates, ASN/ISP details, raw user agents, device-profile hashes, screen characteristics, CPU count, memory estimates, or similar fingerprinting inputs.

## 5. Recipient-labelled links

An Owner may associate a unique share URL with a recipient name, company, email address, role, source, or notes.

That label describes the **intended recipient or context chosen by the Owner**. RepoView does not verify that the person who opens the URL is that recipient.

For example, if a link labelled for a recruiter is forwarded to a colleague, RepoView cannot reliably distinguish the colleague from the intended recipient merely from the label, IP address, network, browser, or location.

For that reason, RepoView should display recipient identity as **Unverified** unless a separate authentication mechanism is introduced.

## 6. What RepoView does not intentionally collect or persist for Viewer Analytics

RepoView does not intentionally collect or persist in its application database for Viewer Analytics:

- raw public IP addresses (the ordinary request IP may still be exposed to and processed by web, hosting, CDN, or security infrastructure);
- precise GPS location, postal code, timezone, ASN, ISP organization, coordinates, or other precise location/network fields;
- raw user-agent strings, browser versions, operating-system versions, rendering-engine details, or architecture details;
- screen resolution, viewport dimensions, pixel ratio, color depth, orientation, CPU count, device-memory estimates, language lists, touch capability, or similar device-profile inputs;
- network or device fingerprints designed for tracking;
- raw keystrokes, passwords typed into unrelated services, clipboard contents, camera or microphone content, Bluetooth or USB information, nearby-device data, or biometric information;
- unrelated cross-site browsing history for advertising or unrelated profiling; or
- government-identification information for Viewer Analytics.

RepoView does not use browser fingerprinting techniques intended to circumvent a Viewer's privacy choices. Repository Content that an Owner chooses to share may of course contain information of its own; that is different from RepoView collecting it as Viewer Analytics.

## 7. Why RepoView uses information

RepoView may use the information described above to:

1. **Provide the project.** Authenticate Owners, connect repositories, create and revoke shares, render repository content, and operate the dashboard.
2. **Provide share analytics.** Show an Owner how a particular share was used, subject to the privacy choices described in this Policy.
3. **Maintain security.** Detect abuse, unauthorized access, automated attacks, malicious traffic, compromised links, and technical failures using request-time IP handling, salted hashes, bot signals, and compact security indicators.
4. **Maintain reliability.** Diagnose errors, measure performance, debug failures, and improve rendering or navigation.
5. **Remember privacy choices.** Record consent, objections, or settings so that RepoView can respect them.
6. **Communicate.** Send requested service messages, security notices, share notifications, or replies to support requests.
7. **Comply with law.** Respond to lawful requests and protect legal rights where required or permitted by applicable law.

RepoView does not use Viewer analytics to build advertising profiles, sell audiences, or follow Viewers across unrelated websites or apps.

## 8. Privacy choices, Necessary-only processing, cookies, and browser storage

RepoView may use first-party cookies, browser storage, or equivalent first-party technologies for authentication, security, session continuity, privacy preferences, and Optional engagement analytics.

Every new Share session starts in **Necessary only** mode unless the browser presents a previously saved Optional engagement analytics preference and no recognized Global Privacy Control signal overrides it. Necessary-only processing can include:

- validating the bearer-link Share token and recording its hash, validity or failure reason, token age, and timestamps;
- creating a server-side Viewer session and storing only a session-token hash;
- receiving the ordinary request IP as part of the request and processing it transiently for rate limiting, abuse prevention, and security;
- deriving a salted, workspace-scoped IP hash rather than storing the raw IP;
- processing fetch-site, prefetch, link-preview, bot/automation, VPN, proxy, Tor, datacenter, and unusual-traffic indicators;
- writing compact Share access-attempt, rate-limit, quota, session, and security records; and
- keeping the Share and Repository Content protected by server-side authorization checks.

Necessary-only mode does not create a persistent cross-session Viewer identifier and does not store the detailed Owner-facing engagement events described below. A confirmed session can nevertheless trigger a configured Owner view-notification email under the current implementation, even in Necessary only mode; that notification may contain the Share's Recipient Label, repository/ref, confirmation time, and available security/context fields, but it does not provide the Optional engagement event set or a verified identity. Some necessary session and security records are still stored, and their retention is described in Section 11. Security processing is not necessarily anonymous: salted hashes, session identifiers, bearer-link records, and compact security signals may be pseudonymous or personal information under applicable law.

After a Viewer chooses **Optional engagement analytics**, RepoView may activate a first-party pseudonymous Viewer identifier and collect returning-Viewer recognition, first/returning visit state, repository/ref activity, directories/files and repository-relative paths, first-view order, active engagement duration, entry/exit paths, referring host, coarse browser/OS/device context, coarse country/region/city labels, search/search-result events, copy events, download events, and other specific event categories described in this Policy. Optional Analytics can be displayed to the Owner; the current implementation can also send a configured view notification after confirmation, while session-summary emails use Optional engagement event data after a session ends. Refusing or later disabling Optional engagement analytics does not prevent access to an otherwise valid Share.

The privacy preference is not stored per individual Share. When the same browser presents the same valid first-party preference token, RepoView may recognize that preference again when the browser opens another RepoView Share. This can cause Optional engagement analytics to be enabled across more than one Share; it is not a guarantee that a choice is limited to the Share where it was made. The pseudonymous Viewer identifier is separately scoped to each workspace in the database.

The relevant browser-side lifetimes are:

| Browser item | Current behavior |
|---|---|
| \`repoview_viewer_privacy\` | Opaque HttpOnly first-party preference token; may remain in the browser for approximately **730 days** after a choice. The server-side preference record is retained separately for **${RETENTION_DAYS.viewerPrivacyPreferences} days from update**. |
| \`repoview_viewer_id\` | Opaque HttpOnly first-party pseudonymous Viewer token; may remain in the browser for approximately **730 days** while Optional engagement analytics is active. Selecting Necessary only clears this cookie, but does not by itself erase already stored server-side records. |
| \`repoview_viewer_session\` | HttpOnly server-session cookie used for the current Share. If the Share has an expiry, the cookie is set to expire with that Share; otherwise it is a browser-session cookie. The server stores a hash and session record, not the raw session token. |
| \`repoview_share_redirect\` | Short-lived HttpOnly marker used during the legacy Share redirect flow; it may remain in the browser for up to approximately **60 seconds** and is not a Viewer analytics identifier. |

Where applicable law requires consent before non-essential storage or access on a Viewer's device, RepoView will ask for that consent before activating a persistent individual-level Viewer analytics identifier. Refusing Optional engagement analytics will not, by itself, prevent access to an otherwise valid Share.

Strictly necessary processing may continue without Optional engagement analytics where permitted by law. Examples include receiving an IP address as part of an ordinary web request, preventing abuse, maintaining server-side session and access records, enforcing rate limits, and preserving the security of a Share.

Where an objection rather than prior consent is legally sufficient for a limited analytics use, RepoView will provide a simple way to object.

A Viewer should be able to revisit **Privacy / Analytics Settings** from a share page and change a prospective analytics preference.

If RepoView receives a recognized **Global Privacy Control (GPC)** signal, RepoView is designed to treat it as an objection to Optional engagement analytics to the extent technically applicable. GPC keeps the optional Viewer identifier and optional engagement collection off for that request/session; Necessary-only security processing may continue.

## 9. When information is disclosed

RepoView does not sell personal information.

Information may be disclosed only as reasonably necessary in the following circumstances.

### 9.1 To the Owner of a share

The Owner who created a Share may receive Optional engagement Analytics associated with that Share through dashboard interfaces. Where the Owner has enabled the relevant notification settings, the current implementation may also email the Owner a view notification after a confirmed browser session, including when the session is in Necessary only mode, or a session summary after an Optional-analytics session ends. Delivery may be suppressed for probable-bot sessions or when the Share, destination, or notification setting is not eligible.

A view notification may contain:

- a pseudonymous Viewer label such as \`Anonymous Viewer #...\` when Optional engagement analytics provides one, or a generic/Recipient Label when it does not;
- the Recipient Label, which represents the Owner's intended recipient or context;
- first-visit or returning-visit status;
- repository and ref;
- the date and time of the confirmed browser session;
- browser family, operating-system family, and device category;
- approximate country, region, or city; and
- referring host.

A session-summary email, which the current implementation builds from Optional engagement event data, may contain:

- the pseudonymous Viewer label, Recipient Label, repository, and ref;
- session duration and end time;
- numbers of files and directories viewed, searches, copies, and downloads;
- first file, last file, and top files by dwell; and
- probabilistic security signals such as possible link forwarding, automation/headless activity, or a VPN/proxy/Tor/datacenter signal.

These signals do not verify identity, employment or company affiliation, precise location, intent, interest, competence, decision-making, or misconduct. Approximate location can be wrong. The Recipient Label is the Owner's intended label, not authentication. A forwarded bearer link may be opened by someone else, and bots, link previews, scanners, shared networks, and other automated or network behavior may affect the Analytics.

RepoView's notification system also stores a delivery record for operational purposes. Depending on the message, that record may include the recipient address, message payload, status, provider message identifier, and delivery timestamps.

### 9.2 Service providers

RepoView may rely on service providers that process information on my behalf to operate the project. Depending on the deployed configuration, RepoView may use:

- **GitHub**, for repository authorization and repository content requested by an Owner;
- **Supabase**, for database, authentication, storage, or backend infrastructure where used;
- a hosting, CDN, DNS, or edge-network provider;
- **SMTP, Resend, Postmark, or another configured email provider**, for Owner notification delivery;
- error-monitoring, logging, or security infrastructure, if configured; and
- other configuration-dependent infrastructure reasonably necessary to operate the Service.

A provider receives only the information reasonably necessary for the service it performs. RepoView supports these provider categories, but a provider being supported by the repository does not mean that provider is active in every deployment. The provider's own handling may also be governed by its privacy terms and applicable law.

### 9.3 Legal, security, and rights protection

I may disclose information where I reasonably believe disclosure is required by law, legal process, or a valid governmental request, or is necessary to investigate abuse, protect RepoView or another person, enforce applicable terms, or establish/exercise/defend legal claims.

Where legally permitted, I will seek to limit disclosures to what is reasonably necessary.

### 9.4 Change in project ownership

If RepoView is later transferred to another operator or legal entity, information may be transferred as part of that transaction or transition, subject to applicable privacy requirements and notice where required.

## 10. International processing

RepoView is operated by an individual developer in **Vancouver, British Columbia, Canada**, but hosting and service providers may process information in other countries.

As a result, personal information may be subject to the laws of the jurisdiction where it is processed and may be accessible to courts, law-enforcement bodies, or regulators in accordance with those laws.

Where cross-border transfer rules apply, RepoView will use an appropriate legal mechanism where required.

## 11. Retention

RepoView follows data-minimization principles. Analytics cleanup is workspace-aware: Owners can select **30, 90, or 180 days** for the workspace's engagement analytics retention. The following describes the current cleanup behavior; a shorter period may apply where selected, and records can be removed earlier when a Share or account is deleted:

| Data category | Default maximum retention |
|---|---|
| Viewer sessions, View Analytics events, repository events, and file engagement | **30, 90, or ${RETENTION_DAYS.repositoryViewEvents} days** based on the workspace setting, measured from the relevant event or the session/file's last activity; session deletion can wait until dependent event rows are gone |
| Persistent pseudonymous Viewer identifiers/profiles | **30, 90, or ${RETENTION_DAYS.persistentViewerIdentifiers} days** based on the workspace setting, measured from last Viewer activity; references are cleared before the Viewer record is deleted |
| Salted IP hashes, coarse network/location metadata, and compact security indicators | Scrubbed after approximately **${RETENTION_DAYS.networkLocationMetadata} days** based on the Viewer session's first-seen time; the session may remain until its selected analytics retention period |
| Share access attempts and security/abuse request records | **${RETENTION_DAYS.shareAccessAttempts} days** from creation |
| Hashed application rate-limit buckets | **${RETENTION_DAYS.rateLimitBuckets} days** from update |
| Tenant-scoped quota counters used for abuse/cost control | **${RETENTION_DAYS.quotaCounters} days** from update |
| Notification delivery records, including delivery metadata and the queued message payload | Up to **${RETENTION_DAYS.notificationDeliveryLogs} days** from creation, and potentially earlier when the associated session reaches the workspace's selected analytics retention or the Share/workspace is deleted |
| Viewer privacy-preference records | **${RETENTION_DAYS.viewerPrivacyPreferences} days** from update |
| GitHub webhook delivery/idempotency records | **${RETENTION_DAYS.githubWebhookDeliveries} days** |
| Expired GitHub connection transactions and step-up confirmations | Deleted after expiry |
| Server-side retention-cleanup run records | **${RETENTION_DAYS.retentionCleanupRuns} days** after completion; stale running records are converted to bounded failed records before normal cleanup |
| Revoked/expired Share configuration and recipient labels | Scheduled after **${RETENTION_DAYS.revokedExpiredShareMetadata} days** from revocation or expiry; sensitive Share fields are scrubbed, and a minimal inactive row may remain while related Analytics or access records reference it |
| Workspace security/activity audit logs | **${RETENTION_DAYS.securityAuditLogs} days**; system-admin audit logs use a separate **${RETENTION_DAYS.systemAdminAuditLogs}-day** period |
| Owner account/workspace data | Account deletion disables the workspace and revokes active Shares before batched cleanup; the account-deletion worker removes workspace data, and any deleted workspace row awaiting finalization is removed after **${RETENTION_DAYS.deletedAccountsWorkspaces} days** from deletion start once workspace data is gone |
| Account-deletion jobs and lifecycle records | Completed history is retained for **${RETENTION_DAYS.accountDeletionJobs} days** / **${RETENTION_DAYS.accountLifecycleAudit} days**; queued, running, and failed records are preserved while work remains incomplete or retryable |
| Support and privacy correspondence | Retained as reasonably necessary to respond to and document the matter, comply with law, or handle a dispute; the application has no separate automated correspondence-retention job |
| Backups and provider-held copies | The RepoView application does not set a backup-rotation period; hosting, database, email, and other providers may retain backups or copies under their own terms and operational schedules |

The cleanup process is automated and bounded; it does not provide a separate application-level legal-hold mechanism. Information may nevertheless be preserved outside ordinary cleanup where required by applicable law or valid legal process. A revoked or expired Share cannot be opened during the period in which a minimal inactive row remains.

## 12. Privacy requests and complaints

Depending on where a person lives and which law applies, a Viewer or Owner may contact the Privacy Officer to:

- ask what information RepoView holds about them;
- request access to that information;
- request correction of inaccurate information;
- request deletion where applicable;
- withdraw consent prospectively where processing is based on consent;
- object to or restrict certain processing where applicable;
- exercise other rights provided by local law; or
- raise a privacy complaint.

To make a request or complaint, contact **Tharun Pranav Sakthivel**, Privacy contact / Privacy Officer, at **tharunpranav.ubc@gmail.com**. RepoView may need limited information such as a Share reference, pseudonymous Viewer identifier, approximate access date/time, or Owner account information to locate records. Please do not send unnecessary sensitive information. No response deadline is promised by this Policy, but requests will be handled as required by applicable law.

Owners can start account deletion from Settings after a recent authentication and explicit confirmation. RepoView disables the Owner's workspace and public shares before cleanup begins, stops workspace notifications, disconnects GitHub installations, and deletes the account's workspace metadata, recipient data, and associated analytics. If cleanup is interrupted, the workspace remains disabled and its shares remain unavailable until cleanup can safely complete. Where retention is required for security, legal, or rights-protection reasons, the limited retained information described in this Policy may be kept for that purpose and then deleted under the applicable retention schedule.

Because Viewers are normally pseudonymous, RepoView may need a Viewer identifier, Share URL/token reference, approximate date/time of access, or other limited information to locate responsive records. RepoView will not collect substantially more identifying information merely to satisfy a request when the request can be handled another way.

I may need to verify a request before disclosing, correcting, or deleting information. A request may be denied or limited where permitted by law, including where identity cannot reasonably be verified or information must be retained for security, legal, or rights-protection purposes.

RepoView will not discriminate against a person for exercising a privacy right where such discrimination is prohibited by law. An applicable privacy regulator may also be contacted where the person has that right.

## 13. Canadian privacy principles

Where Canadian or British Columbia private-sector privacy law applies, RepoView will seek to:

- identify the purposes for collecting personal information at or before collection;
- obtain meaningful consent where consent is required;
- provide a meaningful choice for non-essential collection, use, or disclosure;
- limit collection to information reasonably necessary for stated purposes;
- use and disclose personal information only for appropriate and disclosed purposes, subject to lawful exceptions;
- retain personal information only as long as reasonably necessary;
- use reasonable safeguards; and
- provide access/correction and complaint mechanisms where required.

Consent may be withdrawn prospectively subject to legal or technical limitations and processing that is otherwise permitted or required by law.

## 14. EEA, UK, and similar data-protection regimes

Where the GDPR, UK GDPR, or a similar regime applies, RepoView processes personal data only where an applicable lawful basis exists. Depending on the feature and context, this may include:

- **consent**, particularly where required for non-essential device storage/access or individual-level analytics;
- **contract or steps requested before a contract**, for Owner account and share-management functionality;
- **legitimate interests**, where permitted, for security, fraud prevention, reliability, and limited operational processing that does not override the individual's rights; and
- **legal obligation** or **legal claims**, where applicable.

Pseudonymized data, IP addresses, cookie/device identifiers, location information, and browsing/activity records may still be personal data even if RepoView does not know the person's name.

Where consent is required for a particular activity, RepoView will not rely on legitimate interests as a substitute for that required consent.

## 15. United States state privacy disclosures

Where an applicable U.S. state privacy law provides rights to a Viewer or Owner, RepoView will honor those rights to the extent required.

RepoView does not sell personal information and does not share personal information for cross-context behavioural advertising as those concepts are commonly defined under U.S. state privacy laws.

RepoView does not knowingly use sensitive personal information to infer characteristics about Viewers for advertising, eligibility, or unrelated profiling.

If RepoView's practices change, this Policy will be updated before relying on materially different uses where notice or consent is required.

## 16. Security

RepoView uses reasonable technical and organizational measures designed for a small public software project, which may include:

- HTTPS/TLS in transit;
- database and platform access controls;
- least-privilege permissions;
- secret-management practices;
- server-side authorization checks;
- rate limiting and abuse controls;
- logging and monitoring;
- separation of service-role credentials from public clients; and
- prompt revocation/rotation of exposed credentials.

No Internet service is perfectly secure. RepoView cannot guarantee that information will never be accessed, altered, lost, or disclosed through a vulnerability, provider failure, malicious attack, or other event.

If I become aware of a qualifying breach, I will take reasonable steps to investigate, contain, remediate, and provide notice where applicable law requires it.

## 17. Children

RepoView is a developer/repository-sharing project and is not directed to children.

RepoView does not knowingly seek to collect personal information from a child in circumstances where parental consent is legally required. If you believe a child has provided personal information in such circumstances, contact **tharunpranav.ubc@gmail.com**.

## 18. Do Not Track

Some browsers transmit a "Do Not Track" signal for which there is no universal technical standard. RepoView may not respond to legacy Do Not Track signals in a uniform way.

Where supported, **Global Privacy Control (GPC)** is treated as described in Section 8.

## 19. Changes to this Policy

I may update this Policy as RepoView changes.

The displayed effective and last-updated dates identify the published copy. RepoView's application legal-version records may be maintained separately. If a change materially expands how personal information is collected, used, or disclosed, RepoView will provide additional notice or obtain consent where required by applicable law before the new practice applies.

Older versions should be retained or made available where reasonably practical so material changes can be reviewed.

## 20. Contact

**RepoView Privacy Contact**
- Operator: **Tharun Pranav Sakthivel**
- Privacy contact / Privacy Officer: **Tharun Pranav Sakthivel**
- Location: **Vancouver, British Columbia, Canada**
- Email: **tharunpranav.ubc@gmail.com**

If a privacy concern is not resolved, you may also have the right to contact the privacy or data-protection regulator in your jurisdiction.
`
export type LegalSection = {
  id: string
  label: string
  number: string
}

export function getLegalSections(markdown: string): LegalSection[] {
  return [...markdown.matchAll(/^## (.+)$/gm)].map(([, heading]) => {
    const match = heading.match(/^(\d+(?:\.\d+)?)\.\s+(.+)$/)
    const number = match?.[1] ?? ''
    const label = match?.[2] ?? heading
    const id = heading.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')
    return { id, label, number }
  })
}
