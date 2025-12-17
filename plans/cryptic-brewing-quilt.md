# Facilities Bulk Upload Implementation Plan

## Overview
Add facilities bulk upload to the existing organisation upload feature with:
- **Comma-delimited organisation names** in a single CSV column for many-to-many relationships
- **Single transaction** for atomicity (orgs + facilities all-or-nothing)
- **Cross-reference validation** against the organisations CSV
- **Abstract base class** for shared CSV parsing utilities

## Facility CSV Structure
```csv
Name,Description,Organisations,Address,Suburb,City,Region,Country,Postal Code,Tags
Main Plant,Manufacturing,"Org A, Org B",123 Industrial Ave,,Sydney,NSW,Australia,2000,"production, active"
Warehouse,Storage,Org A,456 Logistics St,,Melbourne,VIC,Australia,3000,warehouse
```

- **Organisations column**: Comma-delimited org names (must match names in org CSV)
- `isSharedFacility` auto-set to `true` if 2+ organisations

---

## Files to Create

### 1. `apps/footprint/src/server/modules/Organisation/parsers/AbstractOrganisationalUnitCsvParser.ts`

Base class with shared CSV parsing utilities:

```typescript
import { ILogger } from "@generatezero/ports/logger";
import { CSVParser } from "../../File/CSVParser";
import { OrganisationServiceError } from "../services/Organisation.service";

export abstract class AbstractOrganisationalUnitCsvParser {
  constructor(protected logger: ILogger) {}

  /** Convert buffer to UTF-8 string */
  protected parseBufferToString(buffer: Buffer): string {
    return buffer.toString("utf8");
  }

  /** Validate CSV format using CSVParser utility */
  protected validateCsvFormat(content: string): void {
    const validation = CSVParser.isValid(content);
    if (!validation.isValid) {
      throw new OrganisationServiceError(
        `Invalid CSV format: ${validation.error}`
      );
    }
  }

  /** Parse CSV content into 2D array */
  protected parseCsvContent(content: string): string[][] {
    return CSVParser.parse(content);
  }

  /** Find column index by name (case-insensitive) */
  protected findColumnIndex(
    normalizedHeaders: string[],
    columnName: string,
    required: boolean = true
  ): number {
    const index = normalizedHeaders.indexOf(columnName.toLowerCase());
    if (index === -1 && required) {
      throw new OrganisationServiceError(
        `Missing required column: ${columnName}`
      );
    }
    return index;
  }

  /** Parse comma-separated tags string into array and collect into Set */
  protected parseTags(tagsStr: string | undefined, tagsSet: Set<string>): string[] {
    const tags = tagsStr
      ? tagsStr
          .split(",")
          .map((t) => t.trim())
          .filter((t) => t.length > 0)
      : [];
    tags.forEach((tag) => tagsSet.add(tag));
    return tags;
  }

  /** Validate minimum row count */
  protected validateMinimumRows(parsedData: string[][], entityName: string): void {
    if (parsedData.length < 2) {
      throw new OrganisationServiceError(
        `File must contain at least a header row and one ${entityName}`
      );
    }
  }

  /** Normalize headers for case-insensitive matching */
  protected normalizeHeaders(headerRow: string[]): string[] {
    return headerRow.map((h) => h.trim().toLowerCase());
  }
}
```

### 2. `apps/footprint/src/server/modules/Organisation/parsers/constants/FacilityCsvParser.constants.ts`
```typescript
export const FACILITY_TEMPLATE_CSV_COLUMNS = {
  NAME: "Name",
  DESCRIPTION: "Description",
  ORGANISATIONS: "Organisations",
  ADDRESS: "Address",
  SUBURB: "Suburb",
  CITY: "City",
  REGION: "Region",
  COUNTRY: "Country",
  POSTAL_CODE: "Postal Code",
  TAGS: "Tags"
} as const;
```

### 2. `apps/footprint/src/server/modules/Organisation/parsers/interfaces/FacilityCsvParser.interfaces.ts`
- `ParsedFacility` type with `organisationNames: string[]`
- `FacilityTemplateColumnIndices` type

### 4. `apps/footprint/src/server/modules/Organisation/parsers/FacilityCsvParser.ts`
Extends `AbstractOrganisationalUnitCsvParser`:
- `parseFacilityTemplateBuffer(buffer)` → `{ facilities, tagsSet }`
- Uses base class utilities: `parseBufferToString()`, `validateCsvFormat()`, `parseCsvContent()`, `findColumnIndex()`, `parseTags()`, `validateMinimumRows()`, `normalizeHeaders()`
- Parse comma-delimited orgs column into array
- Auto-compute `isSharedFacility: organisationNames.length >= 2`
- Skip rows missing name or organisations

### 5. `apps/footprint/src/server/modules/Organisation/parsers/__tests__/FacilityCsvParser.test.ts`
Test cases for parsing, validation, tag collection

---

## Files to Modify

### 1. `apps/footprint/src/server/modules/Organisation/parsers/OrganisationCsvParser.ts`
Refactor to extend `AbstractOrganisationalUnitCsvParser`:
- Change class declaration to `extends AbstractOrganisationalUnitCsvParser`
- Replace inline CSV validation with `this.validateCsvFormat()`
- Replace inline CSV parsing with `this.parseCsvContent()`
- Replace inline header normalization with `this.normalizeHeaders()`
- Replace inline `findColumnIndex` function with `this.findColumnIndex()`
- Replace inline tag parsing with `this.parseTags()`
- Replace inline minimum rows check with `this.validateMinimumRows()`
- Keep org-specific logic: `parseDate()`, `validateHierarchy()`, `detectCycles()`

### 2. `apps/footprint/src/server/modules/Organisation/interfaces/OrganisationRepository.interface.ts`
Add types:
```typescript
export type BulkFacility = {
  name: string;
  description?: string;
  organisationNames: string[];
  address?: string;
  suburb?: string;
  city?: string;
  region?: string;
  country?: string;
  postalCode?: string;
  tags: string[];
  isSharedFacility: boolean;
};

export type BulkOrganisationAndFacilityUploadInput = {
  organisationUnits: BulkOrganisationUnit[];
  facilities: BulkFacility[];
  tagMap: Map<string, string>;
  rootOrgFinancialYears: FinancialYearInputArgs[];
  rootOrgFinancialQuarters: FinancialQuarterInputArgs[];
};
```

### 2. `apps/footprint/src/server/modules/Organisation/repositories/OrganisationRepository.ts`
Add method `bulkUploadOrganisationsAndFacilities()`:
1. Create orgs first (build `orgNameToIdMap`)
2. Create facilities, resolve org names to IDs
3. Create `organisationFacility` join records
4. Create `facilityTag` join records
5. All within single `$transaction()`

### 3. `apps/footprint/src/server/modules/Organisation/services/Organisation.service.ts`
Update `uploadOrganisationTemplate()`:
```typescript
async uploadOrganisationTemplate(
  orgBuffer: Buffer,
  parentOrganisationInfo: ParentOrganisationInfo,
  facilitiesBuffer?: Buffer
): Promise<{ organisationCount: number; facilityCount: number }>
```
- Add `FacilityCsvParser` instance
- Parse facilities CSV if provided
- **Validate facility org references** against org CSV names
- Combine tags from both CSVs
- Call new `bulkUploadOrganisationsAndFacilities()` method

### 4. `apps/footprint/src/server/modules/Organisation/interfaces/OrganisationUpload.interface.ts`
Add `facilityCount` to response:
```typescript
export type UploadOrganisationResponse = {
  message: string;
  success: boolean;
  createdCount?: number;
  facilityCount?: number;  // NEW
};
```

### 5. `apps/footprint/src/app/api/organisations/bulk/upload/route.ts`
- Extract `facilitiesTemplateFile` from FormData
- Validate CSV extension
- Convert to Buffer
- Pass to service method
- Return facility count in response

### 6. `apps/footprint/src/server/modules/Organisation/__tests__/UploadOrganisation.test.ts`
Add test cases:
- Upload orgs with facilities successfully
- Validate org references (throw on unknown org)
- Correct `isSharedFacility` flag
- Combined tag handling
- Return correct counts

---

## Implementation Order

| Step | File | Task |
|------|------|------|
| 1 | `AbstractOrganisationalUnitCsvParser.ts` | Create base class with shared utilities |
| 2 | `OrganisationCsvParser.ts` | Refactor to extend base class (minimal changes) |
| 3 | Run existing tests to verify no regression |
| 4 | `FacilityCsvParser.constants.ts` | Create column definitions |
| 5 | `FacilityCsvParser.interfaces.ts` | Create types |
| 6 | `FacilityCsvParser.ts` | Implement parser extending base class |
| 7 | `FacilityCsvParser.test.ts` | Write parser tests |
| 8 | `OrganisationRepository.interface.ts` | Add `BulkFacility` types |
| 9 | `OrganisationRepository.ts` | Implement `bulkUploadOrganisationsAndFacilities()` |
| 10 | `OrganisationUpload.interface.ts` | Add `facilityCount` to response |
| 11 | `Organisation.service.ts` | Update upload method with facilities |
| 12 | `route.ts` | Handle facilities file in API (already partially done) |
| 13 | `UploadOrganisation.test.ts` | Add integration tests |
| 14 | Run `pnpm types:check && pnpm lint:fix && pnpm test:unit` |

---

## Key Validation Logic

**In `Organisation.service.ts`:**
```typescript
// Validate facility org references against org CSV
const orgNames = new Set(organisationUnits.map(o => o.name));
for (const facility of facilities) {
  for (const orgName of facility.organisationNames) {
    if (!orgNames.has(orgName)) {
      throw new OrganisationServiceError(
        `Facility "${facility.name}" references unknown organisation "${orgName}"`
      );
    }
  }
}
```

---

## Transaction Flow

```
$transaction() {
  1. Create organisations sequentially (respecting hierarchy)
     → Build orgNameToIdMap

  2. For each facility:
     a. Create facility record
     b. Resolve org names → IDs using orgNameToIdMap
     c. Create organisationFacility join records
     d. Create facilityTag join records

  3. Return counts
}
```

If any step fails, entire transaction rolls back (no orgs, no facilities created).

---

## Note on Tag Atomicity

Current implementation creates tags **outside** the main transaction (in service layer before calling repository). This is a pre-existing pattern. For full atomicity, tags would need to be created inside the transaction, but this requires refactoring `TagRepository.createManyTags()`. Keeping current pattern for consistency.
