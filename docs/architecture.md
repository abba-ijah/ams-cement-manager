# AMS Business Hub Architecture

## Boundary
AMS Business Hub is an independent administration and navigation application.
Cement Manager remains separate, with its own source, deployment, permissions,
and operational spreadsheet.

## Milestone 001
- Apps Script web app shell
- HTML frontend
- GitHub source control
- Separate central administration spreadsheet created manually in Drive
- No authentication or user records yet

## Planned administration sheets
1. Users
2. Businesses
3. Roles
4. Permissions
5. User Business Access
6. Sessions
7. Audit Logs
8. System Settings

The exact schema will be designed and validated in a later milestone before any
setup function creates or changes sheets.

## Security boundaries
- Initial deployment restricted to the owner.
- No passwords stored in this milestone.
- No IDs, secrets, tokens, or deployment URLs committed.
- Server-side authorization required before staff access is enabled.
- Business transaction data remains in each business application's own database.

## Future integration
Cement Manager integration is deferred until the Hub passes independent
authentication, authorization, and acceptance tests.
