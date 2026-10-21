# Security

## Reporting a vulnerability

Please report vulnerabilities privately using [GitHub private vulnerability reporting](https://github.com/figma/expressive-components/security/advisories/new). If that route is unavailable, email security@figma.com. Include the affected version, reproduction steps, and potential impact. Do not disclose credentials or exploit details in public issues or pull requests.

## Supported versions

Security fixes target the latest release. This package is experimental; upgrade to the latest release when fixes are available.

## Release security

Public releases are exported from the private source repository without its Git history. Changes to workflows, dependencies, and export tooling require maintainer review. The export deploy key is the automation exception to public pull request and check requirements; it cannot bypass the separate rule blocking force pushes and deletion of main.

The npm release environment is restricted to main and requires approval before granting access to its token. Staging a package and approving it on npm are separate steps. Never commit tokens, private keys, or local registry credentials.
