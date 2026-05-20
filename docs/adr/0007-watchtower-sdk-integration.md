# SDK Integration ADR

## Status

-Approved

## Context

Users need a way to get the watchtower.js sdk into their projects so they can get data sent from their projects to their dashboard.

## Decision

A Jsdelivr cdn will be used to give the user access to the watchtower sdk. They can do so by adding the following script tage to their html document.

```
<script src = "https://cdn.jsdelivr.net/..."></script> 
```

## Consequences

- The user does not have to npm install.
- Must add the script tag to their html file
