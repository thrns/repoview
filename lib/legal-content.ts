import { RETENTION_DAYS } from './retention-policy'

export const TERMS_MARKDOWN = String.raw`
# RepoView Terms of Service

**Effective date:** September 23, 2026  
**Last updated:** September 24, 2026

RepoView is an independently developed, publicly available software project operated by **Tharun Pranav Sakthivel**, an individual developer based in **6088 Walter Gage Road, Vancouver, BC, Canada V6T 0B4** ("**RepoView**," "**I**," "**me**," or "**my**").

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
- create limited-distribution or private share links;
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

RepoView may provide Analytics for a Share as described in the Privacy Policy. Depending on configuration and privacy choices, Analytics may include session timing, file/page interactions, searches, copy/download actions, coarse browser/device context, approximate city/region/country labels, and probabilistic security signals.

Analytics can be incomplete or inaccurate.

You must not represent RepoView Analytics as verified proof of:

- a particular person's identity;
- employment by or affiliation with a particular company;
- precise physical location;
- a person's intent, interest, motive, competence, or decision;
- whether a human or automated system performed every event; or
- wrongdoing or misconduct.

VPN/proxy/Tor detection, IP-to-company mapping, bot detection, approximate location, and similar signals are probabilistic and may be wrong.

RepoView may suppress, aggregate, delay, de-identify, or remove Analytics where reasonably necessary for privacy, security, legal compliance, abuse prevention, or system integrity.

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

RepoView may depend on or link to third-party services, including GitHub and infrastructure providers.

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

The "Last updated" date will identify the latest version. If a change materially affects existing Owners' rights or obligations, I will provide reasonable notice where practical or where required by law.

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
Operator: **Tharun Pranav Sakthivel**  
Location: **6088 Walter Gage Road, Vancouver, BC, Canada V6T 0B4**
`

export const PRIVACY_MARKDOWN = String.raw`
# RepoView Privacy Policy

**Effective date:** September 23, 2026  
**Last updated:** September 24, 2026

RepoView is an independently developed, publicly available software project operated by **Tharun Pranav Sakthivel**, an individual developer based in **6088 Walter Gage Road, Vancouver, BC, Canada V6T 0B4** ("**RepoView**," "**I**," "**me**," or "**my**").

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

When a Viewer opens a valid share, RepoView may process:

- a **pseudonymous** first-party viewer identifier, only after optional engagement analytics is enabled;
- a server-side session identifier;
- repository and file interaction events;
- coarse browser, operating-system, and device-category context when optional analytics is enabled;
- coarse city, region, or country labels when optional analytics is enabled; and
- a salted IP hash and compact security/abuse-prevention signals. The ordinary request IP may be processed in memory for security, but the raw IP is not stored.

RepoView may make relevant share analytics available to the Owner who created the share.

A RepoView viewer identifier is **not a verified identity**. A recipient-labelled share link is also **not proof that the intended recipient opened the link**. Links can be forwarded, opened on multiple devices, inspected by automated systems, or used by someone other than the intended recipient.

RepoView does **not** intentionally collect precise GPS location, raw keystrokes, camera or microphone content, Bluetooth or USB information, or clipboard contents for viewer analytics. RepoView does not sell Viewer personal information and does not use Viewer analytics for third-party advertising or cross-service behavioural advertising.

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

- a first-party pseudonymous viewer identifier, only after optional engagement analytics is enabled;
- a server-side session identifier;
- a share or share-token identifier;
- timestamps, session start/end, active engagement duration, and returning-session status; and
- consent, objection, or analytics-preference records where applicable.

A pseudonymous identifier distinguishes browser activity over time but does not establish a person's legal name or identity.

### 4.2 Repository interaction analytics

RepoView may record events such as:

- repository and ref viewed;
- directories, pages, and files opened;
- order and active engagement duration of file views;
- search and search-result events;
- copy and download actions; and
- other clearly disclosed interactions introduced as RepoView evolves.

RepoView does not intentionally record every key pressed while a Viewer types. Search events store a bounded signal such as query length, not the submitted search text.

### 4.3 Browser, device, and request context

Depending on what the browser, network request, host, CDN, or security layer provides, RepoView may process:

- browser family, operating-system family, and device category when optional analytics is enabled;
- a referring host, without URL paths, queries, fragments, or credentials, when optional analytics is enabled; and
- a salted IP hash and bot, VPN, proxy, Tor, datacenter, and unusual-traffic indicators for necessary security processing.

### 4.4 Approximate location and security/network signals

RepoView may derive a coarse country, region/province/state, or city label from provider infrastructure metadata when optional analytics is enabled.

RepoView may also receive or derive probabilistic indicators such as likely VPN, proxy, Tor, hosting/datacenter, bot/automation, or unusual traffic signals.

These signals are **estimates, not facts**. They may be incorrect because of VPNs, proxies, corporate gateways, cellular networks, privacy relays, shared networks, automated previews, or inaccurate third-party databases.

RepoView does not request browser precise-location/GPS permission for share analytics and does not store postal codes, timezones, coordinates, ASN/ISP details, raw user agents, device-profile hashes, screen characteristics, CPU count, memory estimates, or similar fingerprinting inputs.

## 5. Recipient-labelled links

An Owner may associate a unique share URL with a recipient name, company, email address, role, source, or notes.

That label describes the **intended recipient or context chosen by the Owner**. RepoView does not verify that the person who opens the URL is that recipient.

For example, if a link labelled for a recruiter is forwarded to a colleague, RepoView cannot reliably distinguish the colleague from the intended recipient merely from the label, IP address, network, browser, or location.

For that reason, RepoView should display recipient identity as **Unverified** unless a separate authentication mechanism is introduced.

## 6. What RepoView does not intentionally collect for Viewer analytics

Unless a future feature is separately disclosed and lawfully enabled, RepoView does not intentionally collect for Viewer analytics:

- precise GPS location;
- camera or microphone recordings;
- Bluetooth, USB, or nearby-device data;
- raw keystroke logs;
- passwords typed into unrelated services;
- background clipboard contents;
- biometric identifiers;
- government identification numbers; or
- cross-site browsing history for advertising or unrelated profiling.

RepoView does not use browser fingerprinting techniques intended to circumvent a Viewer's privacy choices.

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

## 8. Consent, cookies, local storage, and similar technologies

RepoView may use first-party cookies, browser storage, or equivalent first-party technologies for authentication, security, session continuity, preferences, and analytics.

New share sessions start in **Necessary only** mode. In that mode RepoView may process the share authentication token, a server-side security session, ordinary request IP information, abuse and rate-limit signals, bot-detection signals, and security logs. RepoView does not create a persistent cross-session Viewer analytics identifier or collect detailed engagement analytics in this mode.

After a Viewer chooses **Optional engagement analytics**, RepoView may activate a first-party pseudonymous Viewer identifier and collect returning-viewer recognition, file engagement/order, active time spent, coarse browser/OS/device context, coarse location labels, search/copy/download events, and other disclosed engagement events. This choice is stored as a privacy preference and can be changed from the share page. Refusing or later disabling optional analytics does not prevent access to an otherwise valid share.

Where applicable law requires consent before non-essential storage or access on a Viewer's device, RepoView will ask for that consent before activating a persistent individual-level Viewer analytics identifier. Refusing optional analytics will not, by itself, prevent access to an otherwise valid repository share.

Strictly necessary processing may continue without optional analytics where permitted by law. Examples include receiving an IP address as part of an ordinary web request, preventing abuse, maintaining a server-side request/session log, enforcing rate limits, and preserving the security of a share.

Where an objection rather than prior consent is legally sufficient for a limited analytics use, RepoView will provide a simple way to object.

A Viewer should be able to revisit **Privacy / Analytics Settings** from a share page and change a prospective analytics preference.

If RepoView receives a recognized **Global Privacy Control (GPC)** signal, RepoView is designed to treat it as an objection to optional individual-level Viewer analytics to the extent technically applicable. Necessary security processing may continue.

## 9. When information is disclosed

RepoView does not sell personal information.

Information may be disclosed only as reasonably necessary in the following circumstances.

### 9.1 To the Owner of a share

The Owner who created a share may receive analytics associated with that share, including the categories described in this Policy. Owners do not automatically receive a verified identity for the Viewer.

### 9.2 Service providers

RepoView may rely on service providers that process information on my behalf to operate the project. Depending on the deployed configuration, these may include:

- **GitHub**, for repository authorization and repository content requested by an Owner;
- **Supabase**, for database, authentication, storage, or backend infrastructure where used;
- a hosting, CDN, DNS, or edge-network provider;
- an email delivery or SMTP provider;
- error-monitoring, logging, or security infrastructure; and
- IP/network-context or abuse-prevention providers, if enabled.

A provider receives only the information reasonably necessary for the service it performs. Its own handling may also be governed by its privacy terms and applicable law.

A current list of production providers should be available at **[Privacy Policy](https://repoview.thrn.im/privacy)** or on request at **tharunpranav.ubc@gmail.com**.

### 9.3 Legal, security, and rights protection

I may disclose information where I reasonably believe disclosure is required by law, legal process, or a valid governmental request, or is necessary to investigate abuse, protect RepoView or another person, enforce applicable terms, or establish/exercise/defend legal claims.

Where legally permitted, I will seek to limit disclosures to what is reasonably necessary.

### 9.4 Change in project ownership

If RepoView is later transferred to another operator or legal entity, information may be transferred as part of that transaction or transition, subject to applicable privacy requirements and notice where required.

## 10. International processing

RepoView is operated by an individual developer in **6088 Walter Gage Road, Vancouver, BC, Canada V6T 0B4**, but hosting and service providers may process information in other countries.

As a result, personal information may be subject to the laws of the jurisdiction where it is processed and may be accessible to courts, law-enforcement bodies, or regulators in accordance with those laws.

Where cross-border transfer rules apply, RepoView will use an appropriate legal mechanism where required.

## 11. Retention

RepoView follows data-minimization principles and is intended to use the following **default maximum retention periods** unless a shorter period is required by law or selected by the Owner:

| Data category | Default maximum retention |
|---|---|
| Repository/view events, file engagement, and Viewer sessions | **${RETENTION_DAYS.repositoryViewEvents} days from the event or last activity** |
| Persistent pseudonymous Viewer identifier/profile | **${RETENTION_DAYS.persistentViewerIdentifiers} days from last Viewer activity** |
| Salted IP hashes, coarse network/location metadata, and security indicators | **${RETENTION_DAYS.networkLocationMetadata} days from the event**, unless needed for an active investigation |
| Share access attempts and security/abuse request logs | **${RETENTION_DAYS.shareAccessAttempts} days** unless needed for an active investigation |
| Notification delivery logs | **${RETENTION_DAYS.notificationDeliveryLogs} days** |
| Revoked/expired Share configuration and recipient labels | **${RETENTION_DAYS.revokedExpiredShareMetadata} days** from revocation or expiry; minimal references may remain until related analytics age out |
| Owner account/configuration data | Until account deletion, then **${RETENTION_DAYS.deletedAccountsWorkspaces} days** from active systems |
| Workspace security/activity audit logs | **${RETENTION_DAYS.securityAuditLogs} days**, unless needed for an active investigation |
| Support and privacy correspondence | **24 months** after the matter is closed, unless longer retention is reasonably required for a dispute or legal obligation |
| Backups | Rotated/deleted within **35 days** after deletion from active systems, unless legally preserved |
| Aggregated or de-identified statistics that no longer reasonably identify an individual | May be retained longer for project reliability and product improvement |

RepoView may retain specific information longer when reasonably necessary for an active security investigation, fraud/abuse prevention, a legal hold, dispute, or legal requirement. When the reason ends, the information should return to the ordinary deletion schedule. A revoked or expired Share may retain a minimal inactive row while separately scheduled analytics still reference it; the Share cannot be opened during that period.

**These periods must match the production implementation.** If RepoView's actual production retention differs, this section should be updated before launch or before the change takes effect.

## 12. Privacy rights and choices

Depending on where a person lives and which law applies, they may have rights to:

- ask whether RepoView holds personal information about them;
- request access to personal information;
- request correction of inaccurate information;
- request deletion;
- withdraw consent prospectively where processing is based on consent;
- object to or restrict certain processing;
- receive certain data in a portable format;
- complain to an applicable privacy regulator; or
- exercise other rights provided by local law.

To make a request, email **tharunpranav.ubc@gmail.com** with enough information to identify the relevant share/session without sending unnecessary sensitive information.

Owners can start account deletion from Settings after a recent authentication and explicit confirmation. RepoView disables the Owner's workspace and public shares before cleanup begins, stops workspace notifications, disconnects GitHub installations, and deletes the account's workspace metadata, recipient data, and associated analytics. If cleanup is interrupted, the workspace remains disabled and its shares remain unavailable until cleanup can safely complete. Where retention is required for security, legal, or rights-protection reasons, the limited retained information described in this Policy may be kept for that purpose and then deleted under the applicable retention schedule.

Because Viewers are normally pseudonymous, RepoView may need a Viewer identifier, share URL/token reference, approximate date/time of access, or other limited information to locate responsive records. RepoView will not collect substantially more identifying information merely to satisfy a request when the request can be handled another way.

I may need to verify a request before disclosing, correcting, or deleting information. A request may be denied or limited where permitted by law, including where identity cannot reasonably be verified or information must be retained for security, legal, or rights-protection purposes.

RepoView will not discriminate against a person for exercising a privacy right where such discrimination is prohibited by law.

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

The "Last updated" date will be changed when the Policy is revised. If a change materially expands how personal information is collected, used, or disclosed, RepoView will provide additional notice or obtain consent where required by applicable law before the new practice applies.

Older versions should be retained or made available where reasonably practical so material changes can be reviewed.

## 20. Contact

**RepoView Privacy Contact**  
Operator: **Tharun Pranav Sakthivel**  
Location: **6088 Walter Gage Road, Vancouver, BC, Canada V6T 0B4**  
Privacy: **tharunpranav.ubc@gmail.com**  
General support: **tharunpranav.ubc@gmail.com**

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
