# SDK Integration ADR

## Status

-Approved

## Context

Users need a way to get the watchtower.js sdk into their projects so they can get data sent from their projects to their dashboard. A fast, free, and easy to use SDK serves this purpose.

## Decision

A [Jsdelivr](https://www.jsdelivr.com/?docs=gh) cdn will be used to give the user access to the watchtower sdk. They can do so by adding the following script tage to their html document.

Example: `<script src = "https://cdn.jsdelivr.net/..."></script>`

We will use Jsdelivr's GitHub integration to directly publish the SDK.

## Consequences
### Positive
- The user does not have to npm install.
- We are not forcing the user to add code to their project
- Jsdelivr is battle-tested
- Their GitHub integration allows us to publish and maintain an up-to-date SDK

### Negative
- We are relying on Jsdelivr's uptime
- The user must add the script tag to their html file
