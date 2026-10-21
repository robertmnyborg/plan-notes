# Plan: CSV export for the reports page

## Goal

Let a user download the report table they are looking at as a CSV file.

## Approach

Fetch all rows for the current filters from the existing `/reports/rows` endpoint (unpaginated, capped at 50,000 rows), then build the CSV in the browser. Name the file `report.csv`. Above 50,000 rows, show "Narrow your filters to export" instead of downloading.

## Columns

Export every visible column, in on-screen order. Dates use ISO 8601 (`2026-03-07`).

## Steps

1. Add an "Export" button to the table toolbar.
2. Write `toCsv(rows, columns)` in `src/lib/csv.ts`.
3. Fetch all rows for the active filters, then trigger the download with a `Blob` and a temporary link.

## Risks

- Large reports may freeze the tab. The 50,000-row cap bounds this; revisit with a server endpoint if users hit the cap.

## Revisions

### r1 · 2026-03-07
- N1 "Does this export only page 1?" -> changed Approach: export now fetches all rows for the active filters, not the loaded page.
- N2 "Use ISO 8601" -> changed Columns: dates are ISO 8601.
- N3 "Client-side or server endpoint? Say why." -> changed Risks: stay client-side because the 50,000-row cap bounds the freeze risk and avoids a new endpoint; server endpoint is the fallback.
