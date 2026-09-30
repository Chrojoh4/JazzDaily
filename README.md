# Monthly business journal

A private-file business journal built for **Chrojoh4/JazzDaily** and GitHub Pages. The website runs entirely in the browser. Financial records are not uploaded to GitHub or an application server.

## Start using it

1. Open the website in desktop Chrome or Edge.
2. Choose **Choose save file** and create `My-business.journal.json` in a local folder or Google Drive for desktop folder.
3. Add employees and effective-dated hourly rates under **Staff & wages**.
4. Add bills with a **company**, **account label**, and **Personal/Business** category. Every bill has an independent permanent ID; same-company bills never overwrite one another.
5. Choose your usual work week under **Working days**. Open individual calendar dates to mark them Planned, Worked, Cancelled, or Off.
6. Enter daily sales, review time cards, and add extra purchases under **Expenses**.

The initial journal is blank. **Files & connections → Open example journal** creates clearly labelled fictional examples in your browser after confirmation. It does not modify your existing journal file. The original Excel workbook has not been imported or published.

## Local development

Requires Node.js 22 or newer; no dependency install or build is needed.

```sh
node server.mjs
# open http://127.0.0.1:4173
node --test tests/core.test.mjs
```

`npm start` and `npm test` are equivalent where npm is installed. Serve `public/` over HTTPS or localhost; do not double-click `index.html` because module scripts and file permissions need a web origin.

## Calculations

- Money is stored as integer cents. Hourly earnings are rounded to cents per time card.
- Monthly coverage = personal bill amounts + business bill amounts. Amount paid does not change the coverage target.
- The initial allowance is distributed across all Planned and Worked days. Remainder cents are assigned in date order so allocations reconcile exactly.
- **Keep worked days fixed** is the default. Marking a day Worked snapshots its allowance. The rest of the monthly bill total is distributed across remaining Planned days.
- **Recalculate all selected days** recalculates even historical days. The setting applies to all months and requires confirmation.
- Cancelling/off removes a day's allocation and unlocks it; sales, time cards and expenses are retained. A review confirmation is required when that date has records.
- With no remaining days, an unallocated balance is shown. If bills decrease below already allocated costs, remaining allowances can be negative and represent the credit needed to reconcile the month.
- Daily clear = entered sales − approved wages − bill allowance − additional expenses. Blank sales mean unentered; zero means an entered zero-sales day. The headline clear total includes only dates with sales entered.
- Wages earned use the latest rate effective **on or before the work date**. A missing historical rate blocks approval. A new raise never overwrites the previous rate. Retroactive changes affecting existing cards require explicit confirmation.
- Wages paid are separate dated payment records. They appear in weekly totals and are not deducted again from daily clear.
- Recurring bill templates populate a month the first time it is opened. Template edits do not overwrite existing months. A due day of 31 becomes the last day of a shorter month.
- Additional expenses belong outside the bill allowance. Record a payment for an existing bill against that bill instead of creating another expense.

Time cards calculate straight-time hourly wages. The Payroll tab adds BC weekly deduction estimates, vacation pay, commission and holiday helpers, and CRA review records; see the scope below. Overtime eligibility, task-based commission time cards, sales taxes and bank reconciliation are not automated. Split overnight work into separate dated time cards.

## Google Form and Sheet imports

### CSV (available immediately)

Create a Google Form with these fields:

| Field | Suggested format |
|---|---|
| Employee code | Dropdown matching the unique staff codes in the journal |
| Work date | Date; format response-sheet column as `yyyy-mm-dd` |
| Start time / End time | Time; format response-sheet columns as 24-hour `HH:mm` |
| Break minutes | Number of unpaid minutes |
| Paid hours | Optional alternative to start/end; decimal hours such as 7.5 |
| Notes | Optional text |

Keep Google's submission timestamp. Link the form to a private response spreadsheet. Download that sheet as CSV, then use **Time cards → Import form responses**. Map your headings, choose month/day or day/month slash-date order, and review the import. Valid rows become pending cards. Invalid rows are left out with row-specific errors. Reimporting the same response skips it. An edited source response is treated as a new pending entry; reject/supersede the previous card as appropriate. Approval checks prevent overlapping approved shifts and catch duplicates when only paid hours are supplied.

Paid hours take precedence over start/end times when both are provided by an import. No Google access is required for CSV. `public/timecard-template.csv` contains fictional example headings and one example row.

### Private live connection (requires your Google configuration)

The app includes the Google Identity Services token flow and Sheets read API. You must configure it for your own Google account/project; no credentials are bundled.

1. In Google Cloud, create/select a project and enable the **Google Sheets API**.
2. Configure the OAuth consent screen, audience, and required test users while the project is in testing. Request the Sheets read-only scope: `https://www.googleapis.com/auth/spreadsheets.readonly`. Follow Google's verification requirements if distributing beyond your testing audience.
3. Create a **Web application OAuth client ID**. Add `https://chrojoh4.github.io` as an authorized JavaScript origin. For local development also add `http://127.0.0.1:4173`. Origins contain no repository path.
4. In **Files & connections**, enter the client ID, the response spreadsheet URL, and the sheet range (default `'Form Responses 1'!A:Z`). Save the connection.
5. Choose **Sign in with Google**, then **Continue to Google**. After connecting, choose **Import time cards**. Sign in as someone with read access to the sheet. Map columns and review rows in the same import flow as CSV.

The read-only scope can authorize reading Google spreadsheets accessible to the signed-in account; the app requests only the configured range. The access token is used in memory for that read and is not persisted. No client secret is used in browser code. The app neither creates the Form nor writes to the response sheet. It does not perform background/unattended synchronization.

References: [Google token model](https://developers.google.com/identity/oauth2/web/guides/use-token-model), [Sheets values API](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/get).

## Saving and switching computers

- Direct autosave requires the File System Access API, user selection of the file, and write permission. Reopen the file when starting a new browser session. The app deliberately does not silently reconnect and overwrite a file after a reload.
- In browsers without direct file access, use Open and Download backup. Downloads are manual snapshots, not automatic syncing.
- A recovery draft is also saved to browser storage. This is local to the browser profile; it does not sync to Drive and can be cleared by the browser. A shared computer profile can read its draft.
- Save the file in a Google Drive **desktop** folder. Wait for Drive to finish syncing before opening that file on the other computer. The Google Sheet is the time-card input, separate from your journal data file.
- Use one editor at a time. Before writing, the app compares the file contents against the last read/save. If it changed externally, autosave stops. Download a backup of your current draft, reopen the synced file, and reconcile entries manually. This is not distributed locking: simultaneous/offline edits on two computers may still create Drive conflicts.
- **Choose save file / Save a copy** intentionally writes the current journal to the file you select. Choose a new filename when preserving another version.
- Keep periodic downloaded backups. Files are plain JSON, not encrypted by this application. Never commit journal files to the repository. `.gitignore` excludes `*.journal.json` and `*.backup.json`.
- After an initial online visit, the browser caches the application shell for offline use where service workers are supported. Google Sheet imports and Drive synchronization still need a connection; reopening a local file may require browser permission again.

## GitHub Pages deployment

The repository's `.github/workflows/pages.yml` tests the calculation engine and publishes **only `public/`** on pushes to `main`. No private journal data belongs in `public/`.

In the repository, set **Settings → Pages → Build and deployment → Source → GitHub Actions**. Push to `main` or run the workflow. The expected project URL is `https://chrojoh4.github.io/JazzDaily/`. Treat that URL as available only after a successful Pages deployment.

The website is public application code. Users do not need GitHub accounts to open it; privacy comes from keeping each user's data file local, not from a GitHub login or app-level staff access controls.

## Verification

`tests/core.test.mjs` checks separate same-company bills, effective-date wage boundaries, fixed and whole-month allocations, cancellation, zero work days, negative residual allocation, duplicate imports, invalid imports, overlapping shifts, recurring snapshots, validation, and serialized autosave/external-file conflict handling.

The Google sign-in flow requires a configured client and a private response sheet to verify end to end. Google Drive synchronization is performed by Drive for desktop and must be verified on the user's devices.

Calendar columns and weekly summaries run Sunday through Saturday. Files & connections includes a direct Google Drive link, a session-only Google account connection, and a response-sheet link field. Google app setup remains required for private-sheet access.

## BC weekly payroll estimates (2026)

Use **Staff & wages → Payroll settings** for each employee, then **Payroll → Prepare weekly payroll**. Enter the employment start date, 52/53 weekly pay schedule, TD1 claim amounts, vacation percentage/agreement, and CPP/EI applicability. EI exemptions are individually configured and require a reason; family status never automatically exempts an employee. No SIN or banking data is required.

Before the first calculation, enter opening year-to-date amounts from this employer, including pensionable earnings and contributions. Prior vacation/non-periodic payment amounts and their contribution portions are needed for subsequent vacation-tax calculations. Confirm zeros only when there were no prior payments. Opening balances are locked while payroll records are active.

The earnings screen prefills approved straight-time hourly time cards. Review/replace earnings and add overtime adjustments or holiday pay as needed. The commission helper multiplies sales excluding tax/tips by a percentage; use separate manual subtotals when rates change during a week. It does not yet add task-based commission time cards. The holiday helper divides owner-reviewed eligible wages by eligible days in the preceding 30 calendar days; eligibility and worked-holiday premiums are reviewed manually. Vacation pay is calculated from the entered wage base and rate; additional eligible wage base can accommodate previously paid vacation and other entitlement adjustments. The annual vacation entitlement/reconciliation is not automated.

### Calculation scope

- BC employee payroll with pay dates in 2026. January–June and July–December tables are selected by **pay date**, not work date. Other years are blocked pending a rules update.
- CRA T4127 Option 1 federal/BC income tax, basic/custom TD1 claims, additional tax, CPP/CPP2 with contribution ceilings and contributory-month proration, EI, standard employer EI multiplier 1.4, matching employer CPP, net pay and estimated remittance.
- Weekly regular remuneration and scheduled commission without TD1X expenses. Vacation added on each cheque is treated as a non-periodic payment using the regular bonus method, including prior non-periodic earnings and enhanced CPP allocation. One weekly CPP exemption applies to combined regular/vacation pay. CPP exemption is truncated to cents; deductions and enhanced CPP allocations are rounded to cents.
- The engine uses CRA's published bracket constants, basic-claim phaseout and BC reduction thresholds. Federal/BC credits annualize regular CPP/EI plus non-periodic portions, capped at annual maxima and with prior contributions as a floor. The period reaching an annual ceiling receives the maximum regular contribution credit. Total income tax is rounded once, so displayed federal/BC components may differ by a cent.
- Not supported: other provinces/years, TD1X, irregular commission schedules, Quebec transfers, special tax credits/exempt claim code, RRSP/union/authorized deductions, non-cash taxable benefits, reduced employer EI rates, or termination/vacation-only payments. Use a separate CRA calculation for those cases.

Every result starts **Needs CRA review**. Open the CRA calculator, enter the displayed inputs, compare and record corrected deductions if necessary. Corrected CPP/EI also require review of the non-periodic contribution portions. A note and confirmation are required to mark a result checked. This records the owner's comparison; the app does not contact CRA, submit payroll or certify CRA approval. The original estimate, employee settings and YTD inputs remain as a snapshot. Subsequent payroll uses verified actual deductions. Duplicate/overlapping periods, pending time cards and out-of-order runs are blocked. Void later records first to correct an earlier period; voiding preserves the audit record and does not reverse a payment.

Payroll results are saved in the existing local journal/browser draft. Choose a save file for durable autosave. The application code is public on GitHub Pages; payroll records are not uploaded. A user-selected Drive desktop folder can sync the journal. This release still uses the existing file picker/browser recovery draft; a mandatory folder-opening shared-computer workflow remains separate work.

Payroll results do not automatically create payment or expense entries. Record actual **net** payments separately using Record staff payment. Monthly clear still uses approved time-card gross wages and does not automatically include commission overrides, vacation or employer payroll contributions calculated in Payroll. Do not treat monthly clear as a reconciled payroll-inclusive profit figure.

### Sources and verification

Rules researched September 30, 2026:

- [CRA T4127 January 2026 formulas](https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4127-payroll-deductions-formulas/t4127-jan/t4127-jan-payroll-deductions-formulas-computer-programs.html)
- [CRA T4127 July 2026 updates](https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4127-payroll-deductions-formulas/t4127-jul/t4127-jul-payroll-deductions-formulas.html)
- [CRA vacation/public holiday deductions](https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/payroll-deductions-contributions/special-payments/vacation-pay-public-holidays.html)
- [CRA commission payments](https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/payroll-deductions-contributions/income-tax/employees-paid-commission.html)
- [BC vacation entitlement](https://www2.gov.bc.ca/gov/content/employment-business/employment-standards-advice/employment-standards/time-off/vacation)
- [BC statutory holiday calculations](https://www2.gov.bc.ca/gov/content/employment-business/employment-standards-advice/employment-standards/statutory-holidays/calculate-statutory-holiday-pay)
- [CRA Payroll Deductions Online Calculator](https://www.canada.ca/en/revenue-agency/services/e-services/digital-services-businesses/payroll-deductions-online-calculator.html)

`tests/payroll.test.mjs` covers published CRA reference calculations, contribution ceilings, CPP2 thresholds, July rules, exemptions, TD1 zero claims, vacation entitlement, rejected unsupported dates, historical snapshots, corrections and YTD sequencing. Browser checks use fictional data in a separate local origin. The owner's live PDOC comparison remains required before using results for actual pay.
