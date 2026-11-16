# Security Policy

N-Ops Admin UI is the front door to infrastructure credentials and privileged operations, so we
take security reports seriously.

## Supported versions

The project is in early development and has no stable releases yet. Security fixes go to the
`main` branch and the `latest` Docker image (`neko7nik/n-ops-admin-ui:latest`).

## Reporting a vulnerability

**Please do not report security issues in public issues, pull requests, or discussions.**

Report them privately through
[GitHub Security Advisories](https://github.com/Neko-Nik-Org/N-Ops-Admin-UI/security/advisories/new).

Include:

- what the issue is and what an attacker could do with it;
- steps to reproduce, or a proof of concept;
- the affected commit, version, or image tag;
- any suggested fix, if you have one.

Never include real production secrets, session tokens, private keys, or credentials. Use test values.

## What to expect

- We aim to acknowledge reports within **3 business days**.
- We'll keep you updated while we investigate and fix the issue.
- Once a fix is released, we'll publish an advisory and credit you, unless you prefer to stay anonymous.

## Scope

In scope: this repository's code, its Docker image, and its CI/CD configuration.

Issues in the backend belong to the
[N-Ops Main API](https://github.com/Neko-Nik-Org/N-Ops-Main-API) and should be reported there.
Note that every permission check in this UI only hides or disables controls. The API is the
real enforcement point, so a hidden button that becomes visible is not a vulnerability unless the
API also allows the action.
