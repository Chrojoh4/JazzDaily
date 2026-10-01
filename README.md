# JazzDaily

A local-file business journal for a small BC business. The public website contains application code only. Journal records stay in the selected file and a local browser recovery draft. No GitHub account is needed.

## Start here

1. Open JazzDaily in desktop Microsoft Edge or Chrome.
2. Choose **Start a new journal**, give it a name, and select an empty folder. Existing users choose **Open journal folder**. The file is named JazzDaily.journal.json.
3. Under **More → Employees & pay**, add employees, their jobs and dated hourly or commission rates. Complete each employee’s payroll settings, including earlier pay this year, vacation and applicable deductions.
4. Under **More → Monthly bills**, add company, account label, Personal/Business, amount and due date. Separate accounts with the same company have independent IDs.
5. Set working days and review the Sunday–Saturday calendar.

Each launch starts at the folder-opening screen. Financial data is not automatically displayed from the browser recovery draft. **Try with example data** is practice only and does not save changes.

## Three everyday screens

- **Today:** enter sales, additional expenses and staff hours; see money left after bills and staffing costs. “Needs attention” means hours, employee setup or holiday/overtime review is incomplete.
- **Staff time card:** choose name, work date, start/end and unpaid break. The job selector appears only for employees with multiple jobs. Commission jobs ask for sales excluding tax and tips. Submissions wait for approval.
- **Pay staff:** review time cards, prepare a seven-day pay period, answer overtime/holiday questions, calculate, compare with CRA, and record the actual payment. Record payment does not transfer money or pay CRA.

For a holiday with no entitlement (including a week without hours), **Check holiday eligibility** records the decision and reason. A change to the relevant time cards or employment start date requires a fresh check. Eligible holiday pay is entered in weekly payroll. Substituted holidays need a written agreement and manual tracking of the replacement date.

## Desktop app and offline use

Choose **Install JazzDaily** on the opening screen in Edge or Chrome, then follow the browser’s installation prompt. If unavailable, use the browser’s app-install menu. This installs a web app that opens in its own window; it is not a separate Windows executable. The manifest also offers a Staff time card shortcut where supported.

The application shell is cached after a successful online visit. Once cached, ordinary journal work can run offline. Installation, updates, CRA checks and Drive syncing need internet. File permission may be requested again when opening the journal. Close and reopen the app after an update. Payroll rules currently support 2026 only; installing the app does not extend those rules to later years.

## Saving and backups

- Selecting a journal file grants access; edits autosave to that file. Check the save status before closing. Browsers without direct file access require manual backups and clearly show that autosave is unavailable.
- A local browser recovery draft is a second recovery option, not the main journal. It does not automatically reopen or sync. Recovery requires choosing a destination before financial data is displayed.
- An optional Google Drive **desktop folder** can sync the file between computers. There is no Google Form, public staff submission service, or Google sign-in inside this app. Wait for Drive to finish syncing before switching computers.
- Use one editor at a time. An external file change stops autosave. Save a backup of the current draft, reopen the latest file and reconcile changes manually. Simultaneous/offline edits can still create Drive conflicts.
- Keep regular backups. Files and browser recovery drafts are unencrypted. Anyone with access to that Windows/browser account and folder can read them, similarly to an unprotected spreadsheet. Opening a folder is a workflow step, not a password lock.
- Never put private journals in public/ or commit them to GitHub. Ignore rules exclude *.journal.json and *.backup.json.

## How money left is calculated

Money is stored as integer cents. Monthly bill amounts are distributed over Planned and Worked days. Paid amounts do not change the bill coverage target. **Keep worked days fixed** retains past daily allowances and spreads the remainder over planned days; **Recalculate all selected days** redistributes across the whole month. Cancelled/off days lose their allocation but retain recorded sales, hours and expenses. Unallocated balances remain visible when no working days are left.

Daily money left = sales − allocated bills − additional expenses − staffing cost. Staffing includes gross wages/commission, vacation and employer CPP/EI. Employee deductions are already part of gross pay. Before saved payroll, this is a provisional estimate; missing setup, pending cards and overtime/holiday questions prevent a misleading complete figure. Saved payroll replaces that estimate and distributes its full cost over the work dates using fixed weights. Old payroll records without work-date weights use their period-end date. Recording net pay never deducts payroll a second time.

Monthly money left includes all staffing and extra expenses for the month, including days without sales; bill coverage is deducted for dates with sales entered. Blank sales means not entered; zero is an entered zero-sales day. This is a planning/cashout figure, not tax profit or bank reconciliation.

Rates are selected by work date and job. A raise preserves the earlier rate. Commission cards calculate sales × the effective percentage. Saved payroll locks its period’s time cards against edits; correct payroll first. Recurring bill edits affect future unopened months, leaving existing month copies intact. Record bill payments against the bill rather than entering the same amount as an extra expense.

## BC weekly payroll estimates (2026)

Payroll setup records employment date, vacation added to each cheque, written agreement, CPP/EI applicability and earlier year-to-date pay from this employer. Advanced settings hold TD1 claims, CPP months, additional tax and 52/53 weekly payments. EI exemptions are individual settings with a reason; family status does not automatically exempt anyone. No SIN or bank data is required.

Approved hourly and commission cards prefill earnings. Overtime thresholds and statutory holidays prompt review; eligibility, premiums, minimum-wage top-ups, substituted holidays and annual vacation reconciliation still need the owner’s review. The holiday helper uses eligible wages and eligible days in the preceding 30 calendar days. Split overnight shifts into separate dated cards.

### Calculation scope

- BC employee payroll with pay dates in 2026. January–June and July–December tables are selected by **pay date**, not work date. Other years are blocked pending a rules update.
- CRA T4127 Option 1 federal/BC income tax, basic/custom TD1 claims, additional tax, CPP/CPP2 with contribution ceilings and contributory-month proration, EI, standard employer EI multiplier 1.4, matching employer CPP, net pay and estimated remittance.
- Weekly regular remuneration and scheduled commission without TD1X expenses. Vacation added on each cheque is treated as a non-periodic payment using the regular bonus method, including prior non-periodic earnings and enhanced CPP allocation. One weekly CPP exemption applies to combined regular/vacation pay. CPP exemption is truncated to cents; deductions and enhanced CPP allocations are rounded to cents.
- The engine uses CRA's published bracket constants, basic-claim phaseout and BC reduction thresholds. Federal/BC credits annualize regular CPP/EI plus non-periodic portions, capped at annual maxima and with prior contributions as a floor. The period reaching an annual ceiling receives the maximum regular contribution credit. Total income tax is rounded once, so displayed federal/BC components may differ by a cent.
- Not supported: other provinces/years, TD1X, irregular commission schedules, Quebec transfers, special tax credits/exempt claim code, RRSP/union/authorized deductions, non-cash taxable benefits, reduced employer EI rates, or termination/vacation-only payments. Use a separate CRA calculation for those cases.

Every result starts **Needs CRA review**. Open the CRA calculator, enter the displayed inputs, compare and record corrected deductions if necessary. Corrected CPP/EI also require review of the non-periodic contribution portions. A note and confirmation are required to mark a result checked. This records the owner's comparison; the app does not contact CRA, submit payroll or certify CRA approval. The original estimate, employee settings and YTD inputs remain as a snapshot. Subsequent payroll uses verified actual deductions. Duplicate/overlapping periods, pending time cards and out-of-order runs are blocked. Void later records first to correct an earlier period; voiding preserves the audit record and does not reverse a payment.


## Development and deployment

Run Node.js 22+ with no dependency installation:

~~~sh
node server.mjs
node --test tests/*.test.mjs
~~~

Serve public/ over localhost or HTTPS. The GitHub Actions Pages workflow tests the application and publishes only public/ on pushes to main. The live URL is https://chrojoh4.github.io/JazzDaily/ after a successful deployment.

Tests cover allocations, historical rates, commission jobs, full staffing costs, cross-month payroll, duplicate payment prevention, file saving/conflicts, holiday reviews and offline shell behavior. Browser checks use fictional practice data. Native installation and Drive synchronization must also be checked on the user’s devices.

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
