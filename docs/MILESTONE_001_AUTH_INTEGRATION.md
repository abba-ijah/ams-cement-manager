# Milestone 1 — Hub Authentication & Authorisation Integration

## Scope
Connect Cement Manager to the existing AMS Business Hub authentication, session, user and role-permission infrastructure. This milestone does not migrate operational records or deploy to production.

## Hub functions reused
- `amsValidateSession(token)` validates the Hub session, active user and AMS-CEMENT business access.
- `amsRequirePermission_(token, permissionCode)` validates the session and enforces role permissions.
- `amsHasPermissionForRole_(roleId, permissionCode)` reads existing Hub role-permission mappings.
- `amsAuthDatabase_()` and `amsAuthHeaders_(sheetName)` access the existing Hub identity/RBAC database.
- `amsWriteAuditLog_(...)` writes to the existing Hub audit log.

No duplicate login, password hashing, token issuance, session store, `App Users` table or legacy Cement authentication is introduced.

## Cement permission codes
- `cement.access`
- `cement.dashboard.view`
- `cement.transactions.create`
- `cement.history.view`
- `cement.accounts.view`

The installer grants these permissions to `ROLE_OWNER` and `ROLE_ADMIN` only. Other roles remain deny-by-default until permissions are deliberately assigned through the authorised Hub role-management process. Non-administrator users must also pass the existing AMS-CEMENT business-access check inside `amsValidateSession`.

## Installer behaviour
`cementInstallHubPermissions(sessionToken)` is an explicit, authenticated, additive installer. It validates the caller, restricts execution to Owner/Administrator, validates RBAC sheet headers, adds only missing permission records and privileged-role mappings, preserves existing rows, writes to the Hub Audit Logs sheet and uses a script lock. It is not run automatically and has not been run against production.

## Client integration contract
The integrated UI must pass the existing in-memory Hub session token to `cementGetAuthorizationContext(token)` and all protected Cement endpoints. It must not create or read a separate Cement token in `sessionStorage` or local storage. Hub login/logout remains authoritative.

## Verification checklist
- [ ] Existing Hub login remains unchanged.
- [ ] Existing Hub logout and session expiry remain unchanged.
- [ ] Hub session validation enforces active user and AMS-CEMENT business access.
- [ ] No Cement legacy login/session functions are included.
- [ ] Permission installer is idempotent on a test database copy.
- [ ] Owner and Administrator receive the five Cement permissions.
- [ ] Other roles are denied until explicitly assigned permissions.
- [ ] Invalid token, expired session, inactive user and missing business access are rejected.
- [ ] Every Cement server operation calls the Hub permission guard before accessing operational data.
- [ ] Installer audit event appears in Hub Audit Logs.

## Not in this milestone
Cement operations spreadsheet writes/migration, operational UI, dashboard/report UI, or production deployment.