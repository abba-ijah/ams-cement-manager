# M1 Installation Notes

1. Add `src/CementAuth.gs` to a non-production copy of the existing AMS Business Hub – Production Apps Script project. Do not install this into the standalone legacy Cement Manager deployment.
2. Confirm the Hub `Code.gs` contains the documented authentication/RBAC dependencies and that the `Users`, `Roles`, `Permissions`, `Role Permissions`, `Sessions`, `Businesses`, `User Business Access` and `Audit Logs` sheets have their expected headers.
3. Set up a test copy of the Hub administration spreadsheet and test project properties. Do not point the test project at production credentials or databases.
4. Sign in through the Hub's existing login page and obtain its in-memory session token through the existing application flow.
5. Call `cementGetAuthorizationContext(token)` and verify the returned Hub identity and current Cement permission flags.
6. Call `cementInstallHubPermissions(token)` once as the Hub Owner or Administrator. Verify the five permission records, Owner/Admin mappings and audit event on the test copy.
7. Call the installer a second time. It should report zero additional permission records and mappings and must not create duplicates.
8. Verify a non-privileged role is denied until it has both active AMS-CEMENT business access and the required Hub role permissions.
9. Do not run the installer against production until test results are reviewed and the complete M1 source has been installed in the intended Hub project.

The function only adds missing records; it does not delete or rewrite existing records. Nevertheless, the first execution must be performed on a test copy.