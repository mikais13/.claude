# Skill: Writing PR Descriptions (Mikai's Style)

This skill enables writing pull request descriptions that match Mikai Somerville's voice, tone, and style. Use this when creating PRs in the generatezero/footprint repository or similar codebases.

## Structure Template

```
### Description

[Opening sentence: "This PR {verb}s {what it does}."]
[Optional: Additional context sentence if needed]
- [Bullet point for specific change 1]
- [Bullet point for specific change 2]
  - [Nested detail if complex]
- [Bullet point for specific change N]

[Ticket reference: "Closes GF-XXX" or "Relates to GF-XXX"]

[Optional: Screenshot or video for UI changes]

### How to test this change

[Specific test instructions with exact paths/steps]
[Optional: Screenshots showing expected behavior]
```

## Voice & Tone Rules

### Opening Sentence
- **Always** start with "This PR" followed by a verb
- Use present tense verbs: adds, introduces, fixes, improves, updates, moves, refactors
- Keep it to one sentence that captures the essence of the change

**Examples:**
- "This PR adds the functionality to upload CSV files containing the organisation information."
- "This PR fixes the mismatch between the selected region and the interactive region in the `ListWithSearch` component."
- "This PR introduces new api routes `api/emission-factors/simplified/licensed` and `api/emission-factors/table/licensed`."
- "This PR improves the status filter options in the `/measure/data-processing` page to increase clarity and simplify the ux."

### Tone Characteristics
- **Direct**: No pleasantries, filler phrases, or unnecessary context
- **Technical**: Use precise terminology without over-explaining
- **Practical**: Focus on what changed and why it matters
- **Conversational but professional**: Occasional first-person is fine for reasoning

### Code References
- **Always** use backticks for:
  - Component names: `ListWithSearch`, `SimpleDropdown`
  - File names: `UploadOrganisation.modal.tsx`
  - Function/method names: `useUploadOrganisation()`, `setActivityMappings()`
  - Variables/props: `isDisplayed`, `awaitingInput`
  - API routes: `api/emission-factors/simplified/licensed`
  - Config values: `EF_AC_V2`
  - CSS classes: `p-2`, `bg-tertiary-400`

### Bullet Points Style
- Start with lowercase verb (adds, updates, fixes, introduces, removes, renames)
- Use `-` for bullets, not `*`
- Nest with indentation for sub-details
- Keep each point focused on one logical change

**Example:**
```
- adds `lint:files` and `format:files` scripts to relevant `package.json` files
- updates relevant repository and service methods to allow the querying of only active licensed efs
  - adds cache invalidation to the PATCH api route
- renames the `useEmissionsFactorsTable` hook to `useEmissionsFactorsLicensedTable` to match functionality
```

### Parenthetical Asides
Use "i.e." in parentheses to clarify or give examples:
- "(i.e. tags are turned into an array)"
- "(i.e. all parent organisations exist)"

### Caveats and Notes
Use "Note that..." for important caveats:
- "Note that the filtering and searching of data doesn't work properly currently..."
- "Note that the `api` app does not use the eslint `--cache` directive as the caching does not reliably work with type-aware linting"

For critical warnings, use GitHub alerts:
```
> [!WARNING]
> This PR is deployed in Thanos, but please use one of the two "Mikais Corner x" organisations for testing.

> [!NOTE]
> This should be tested with `EF_AC_V2` as `true` and as `false`
```

## Ticket References

Use one of these patterns at the end of the description section:

| Pattern | When to Use |
|---------|-------------|
| `Closes GF-XXX` | PR fully resolves the ticket |
| `Relates to GF-XXX` | PR is part of a larger effort |
| `Fixes #XXX` | For GitHub issues (non-Jira projects) |
| `Not related to a ticket` | For small fixes, tooling updates |

## Testing Instructions Style

### Format
- Start with the exact location/path where to test
- Use bullet points for multi-step testing
- Include "I would recommend..." for helpful tips
- Provide before/after screenshots for visual changes
- Include code snippets (SQL, console commands) when relevant

### Examples

**Simple UI change:**
```
### How to test this change

In `/reporting/analytics` the `ListWithSearch` component is there on the left.
As there is no data with `awaitingInput=true`, I recommend going into the `src/components/ListWithSearch` file and removing the `{awaitingInput && (` in order to show the dots.

Hovered:
<img width="395" alt="image" src="..." />
```

**Feature with multiple test areas:**
```
### How to test this change

The emissions factors are displayed in the following locations:
- Settings → Factors & Metrics → Emission Factors
- Measure → Data Processing → Manual Entry
- Measure → Supplier → Mapping

Check that each only displays the active, licensed emissions factors as set in the admin portal.
```

**Complex feature with test data:**
```
### How to test this change

I have attached example csv files for organisations and facilities, use these to create a new organisation.

[Organisation Chart.csv](...)
[Facilities.csv](...)

I used the following SQL script to clear existing data:
\`\`\`sql
TRUNCATE TABLE footprint.Facility;
\`\`\`
```

## Anti-Patterns to Avoid

| Don't | Do Instead |
|-------|------------|
| "Hey team, just a quick PR to..." | "This PR adds..." |
| "I think this should work..." | State what it does factually |
| "Please let me know if..." | Provide clear test instructions |
| "This is a small change" | Let the diff speak for itself |
| Explaining what the reviewer can see in the code | Explain the "why" not the "what" |
| Generic "Test the feature" | Specific paths and steps |
| Over-explaining obvious changes | Trust the reader's technical knowledge |

## Real Examples

### Feature PR (Complex)
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

### Bug Fix PR
```
### Description

The platform was crashing because of an infinite recalculation of `metadataItems` due to the `setActivityMappings()` side effect causing a rerender, not allowing `metadataItems` to be validly cached by the `useMemo()`.
This has been fixed by separating the `setActivityMappings()` call into a `useEffect()`. This ensures that the cache is valid and the side effect is not called until the render is fully committed.

Closes GF-864

### How to test this change

The bug usually showed up when clicking into the activities tab, switching tab, and then returning back to the activities tab.
I would recommend clicking around without the fix to familiarize yourself with where it was happening.
```

### Small Fix PR
```
### Description

This PR moves the `p-2` padding from the parent component to the `Link`/`div` components, to ensure the clickable region is the same as the visible region on hover.

Closes GF-926

### How to test this change

You can check that the entire hovered region of the button is the same as the `<a>` tag's region.
Should now work for both the dropdown and direct link buttons.
```

### Tooling/Config PR
```
### Description

This PR adds `opened` and `reopened` to the triggers for the claude code review workflow.
The workflow will still only run on prs that are ready for review since I added a check that the pr is not in draft.

Not related to a ticket

### How to test this change

Check that there is no syntax error in the file
```

## Checklist Before Submitting

- [ ] Opens with "This PR {verb}s..."
- [ ] Uses backticks for all code references
- [ ] Bullet points start with lowercase verbs
- [ ] Includes ticket reference (or "Not related to a ticket")
- [ ] Test instructions include specific paths/steps
- [ ] Screenshots included for UI changes
- [ ] No filler phrases or unnecessary pleasantries
- [ ] Caveats noted with "Note that..." if applicable
