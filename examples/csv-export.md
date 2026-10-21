# Plan: CSV export for the reports page

## Goal

Let a user download the report table they are looking at as a CSV file.

## Approach

Build the CSV in the browser from the rows already loaded on the page. Name the file `report.csv`.

@@ Rows loaded on the page are paginated at 50. Does this export only page 1?

## Columns

Export every visible column, in on-screen order. Dates use the user's locale format.

@@ Locale dates break spreadsheet sorting. Use ISO 8601.

## Steps

1. Add an "Export" button to the table toolbar.
2. Write `toCsv(rows, columns)` in `src/lib/csv.ts`.
3. Trigger the download with a `Blob` and a temporary link.

## Risks

- Large reports may freeze the tab.

@@ Pick: stay client-side, or add a server endpoint? Say why.
