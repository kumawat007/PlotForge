# Security Policy

## Supported Versions

PlotForge adheres to modern semantic versioning standards. Critical security updates and patches are actively applied to the latest release line.

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

---

## 100% Client-Side Architecture & Privacy (GDPR Compliant)

PlotForge is architected as an **offline-capable, static client-side web application**:
- **Zero Remote Storage**: All CAD vectors, Hershey text, user SVGs, and raster images are processed purely inside your local browser memory via Web Workers and HTML5 Canvas APIs.
- **Zero Telemetry**: No user analytics, session recordings, external telemetry, or tracking cookies are utilized.
- **No Account Required**: No passwords, personal identity data, or payment information are collected or stored on external servers.

---

## Reporting a Vulnerability

We take the security and integrity of PlotForge very seriously. If you discover a potential vulnerability or security concern, please follow responsible disclosure guidelines:

1. **Do not create a public GitHub Issue** for sensitive security vulnerabilities.
2. Please report findings directly via **[GitHub Private Vulnerability Reporting](https://github.com/kumawat007/PlotForge/security/advisories/new)** or email the maintainer at **`p.kumawat252368@google.com`**.
3. Include detailed steps to reproduce the issue (proof of concept, browser environment, and operating system).

### Response SLA
- **Initial Acknowledgement**: Within 48 hours.
- **Status Update & Assessment**: Within 5 business days.
- **Patch Release**: Released as a high-priority patch upon verification.
