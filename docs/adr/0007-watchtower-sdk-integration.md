# SDK Integration ADR

## Status

-Approved

## Context

Users need a way to get the watchtower.js sdk into their projects so they can keep their dashboard updated.

## Decision

A Jsdelivr cdn will be used to give the user access to the watchtower sdk. They can do so by adding the following script tage to their html document.

```
<script src = "https://cdn.jsdelivr.net/..."></script> 
```

## Consequences

This makes it super easy for the user to gain access to the sdk. The user does not have to npm install.
