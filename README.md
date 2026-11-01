# AMS Business Hub

Standalone administration portal for AMS Enterprises and Services.

## Boundaries
- New Apps Script project; do not reuse the Cement Manager project.
- New Google Spreadsheet; do not use the Cement Manager spreadsheet.
- No credentials, tokens, secrets, spreadsheet IDs, or deployment URLs in Git.
- Authentication and database setup are intentionally deferred beyond Milestone 001.

## Prerequisites
Install Node.js LTS and Git, then install clasp:
```bash
npm install -g @google/clasp
clasp --version
clasp login
```
Enable the Apps Script API at https://script.google.com/home/usersettings.

## Create the Google resources
1. In Google Drive, create a standalone Apps Script project named `AMS Business Hub – Production`.
2. In Drive, create a separate spreadsheet named `AMS Central Administration Database`.
3. Do not reuse or edit either Cement Manager resource.
4. Copy the new Apps Script project ID from Project Settings.
5. Copy `.clasp.json.example` to `.clasp.json` and replace its placeholder with the new project ID.

## Push the starter
From this folder:
```bash
clasp push
clasp open
```
In Apps Script, select Deploy > New deployment > Web app.
- Description: AMS Business Hub - Milestone 001 test
- Execute as: Me (the new owner account)
- Who has access: Only myself
Deploy and open the URL. Confirm the foundation page appears and reports that the backend connection works.

Keep this deployment private during Milestone 001. Do not enable public access before authentication and server-side authorization are implemented and tested.

## GitHub
Create a **private** repository named `ams-business-hub`, with no README/license/.gitignore pre-generated. Then run:
```bash
git init
git add .
git commit -m "chore: establish AMS Business Hub foundation"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/ams-business-hub.git
git push -u origin main
```
Replace `YOUR_GITHUB_USERNAME` with your GitHub login.

## Local workflow
```bash
clasp pull
clasp push
clasp open
```

## Safety
`.clasp.json` is ignored by Git. Never commit credentials, tokens, OAuth secrets, spreadsheet IDs, or deployment URLs. Do not run setup/reset functions against production data.
