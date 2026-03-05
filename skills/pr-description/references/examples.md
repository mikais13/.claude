# Real PR Description Examples

## Feature PR (Complex)

```
### Description

This PR adds the "Emission Factors & Activity Categories V2" feature flag so that organisations can separately be migrated onto the V2.
- introduces the `FeatureFlagContext` class that provides a wrapper around the `OrganisationFeatureFlagsClient` by storing the results of feature flag fetching
  - this class uses generic types to enforce that where it is consumed, it contains the specific flags required
  - `protectedRoute` has been updated to include the new config option `includeFeatureFlags` which creates a `FeatureFlagContext` instance
- updates all affected services and routes to pass in the required feature flags
- adds the logger to the openFeature initialisation

Closes GF-976

### How to test this change

In `admin/[orgslug]/features` toggle the "Emission Factors & Activity Categories V2" feature flag.

The primary feature-flagged UIs are:
1. Settings pages: licensed filtering in v2
2. Admin pages: Emission factor sets tree (v2-only), license management
```

## Bug Fix PR

```
### Description

The platform was crashing because of an infinite recalculation of `metadataItems` due to the `setActivityMappings()` side effect causing a rerender, not allowing `metadataItems` to be validly cached by the `useMemo()`.
This has been fixed by separating the `setActivityMappings()` call into a `useEffect()`. This ensures that the cache is valid and the side effect is not called until the render is fully committed.

Closes GF-864

### How to test this change

The bug usually showed up when clicking into the activities tab, switching tab, and then returning back to the activities tab.
I would recommend clicking around without the fix to familiarize yourself with where it was happening.
```

## Small Fix PR

```
### Description

This PR moves the `p-2` padding from the parent component to the `Link`/`div` components, to ensure the clickable region is the same as the visible region on hover.

Closes GF-926

### How to test this change

You can check that the entire hovered region of the button is the same as the `<a>` tag's region.
Should now work for both the dropdown and direct link buttons.
```

## Tooling/Config PR

```
### Description

This PR adds `opened` and `reopened` to the triggers for the claude code review workflow.
The workflow will still only run on prs that are ready for review since I added a check that the pr is not in draft.

Not related to a ticket

### How to test this change

Check that there is no syntax error in the file
```
