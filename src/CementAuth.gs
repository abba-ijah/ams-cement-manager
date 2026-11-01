/**
 * AMS Cement Manager — Milestone 1 authentication bridge.
 * Uses the existing AMS Business Hub identity, session and RBAC services.
 * No standalone login, password, token issuance or legacy App Users code.
 */
const CEMENT_RBAC = Object.freeze({
  PERMISSIONS: [
    { id: 'PERM_CEMENT_ACCESS', code: 'cement.access', description: 'Access the integrated AMS Cement Manager.' },
    { id: 'PERM_CEMENT_DASHBOARD_VIEW', code: 'cement.dashboard.view', description: 'View the Cement Manager dashboard.' },
    { id: 'PERM_CEMENT_TRANSACTIONS_CREATE', code: 'cement.transactions.create', description: 'Create Cement Manager transactions.' },
    { id: 'PERM_CEMENT_HISTORY_VIEW', code: 'cement.history.view', description: 'View Cement Manager transaction history.' },
    { id: 'PERM_CEMENT_ACCOUNTS_VIEW', code: 'cement.accounts.view', description: 'View Cement customer and supplier accounts.' }
  ],
  PRIVILEGED_ROLE_IDS: ['ROLE_OWNER', 'ROLE_ADMIN']
});

/**
 * Explicit, authenticated, additive and idempotent installer.
 * Run only in a test copy first. Existing rows are never overwritten/deleted.
 */
function cementInstallHubPermissions(sessionToken) {
  const actor = amsValidateSession(sessionToken);
  if (!CEMENT_RBAC.PRIVILEGED_ROLE_IDS.includes(String(actor.roleId))) {
    throw new Error('Only the Hub Owner or Administrator can install Cement permissions.');
  }
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const db = amsAuthDatabase_();
    const permissions = db.getSheetByName('Permissions');
    const roles = db.getSheetByName('Roles');
    const mappings = db.getSheetByName('Role Permissions');
    if (!permissions || !roles || !mappings) throw new Error('Hub RBAC sheets are missing. No permissions were installed.');

    const p = cementReadHeaders_(permissions, ['permissionId','permissionCode','description','createdAt']);
    const r = cementReadHeaders_(roles, ['roleId','roleName']);
    const m = cementReadHeaders_(mappings, ['rolePermissionId','roleId','permissionId','createdAt']);
    const pRows = permissions.getDataRange().getValues();
    const roleRows = roles.getDataRange().getValues();
    const mapRows = mappings.getDataRange().getValues();
    const pId = p.index('permissionId'), pCode = p.index('permissionCode');
    const roleId = r.index('roleId'), mapRole = m.index('roleId'), mapPermission = m.index('permissionId');

    // Validate all required roles before making any database changes.
    const existingRoles = new Set(roleRows.slice(1).map(row => String(row[roleId] || '').trim()));
    CEMENT_RBAC.PRIVILEGED_ROLE_IDS.forEach(id => {
      if (!existingRoles.has(id)) throw new Error('Required Hub role is missing: ' + id + '. No changes were made.');
    });

    const permissionIds = new Map();
    pRows.slice(1).forEach(row => {
      const code = String(row[pCode] || '').trim();
      const id = String(row[pId] || '').trim();
      if (code && id) permissionIds.set(code, id);
    });
    const permissionAdds = [];
    CEMENT_RBAC.PERMISSIONS.forEach(def => {
      if (!permissionIds.has(def.code)) {
        permissionAdds.push([def.id, def.code, def.description, new Date()]);
        permissionIds.set(def.code, def.id);
      }
    });

    const existingMappings = new Set(mapRows.slice(1).map(row =>
      String(row[mapRole] || '').trim() + '::' + String(row[mapPermission] || '').trim()
    ));
    const mappingAdds = [];
    CEMENT_RBAC.PRIVILEGED_ROLE_IDS.forEach(rid => {
      CEMENT_RBAC.PERMISSIONS.forEach(def => {
        const pid = permissionIds.get(def.code);
        const key = rid + '::' + pid;
        if (!existingMappings.has(key)) {
          mappingAdds.push([rid + '__' + pid, rid, pid, new Date()]);
          existingMappings.add(key);
        }
      });
    });

    // Hub schema defines these columns in this exact order. Fail closed otherwise.
    cementAssertHeaderOrder_(permissions, ['permissionId','permissionCode','description','createdAt']);
    cementAssertHeaderOrder_(mappings, ['rolePermissionId','roleId','permissionId','createdAt']);
    if (permissionAdds.length) permissions.getRange(permissions.getLastRow() + 1, 1, permissionAdds.length, 4).setValues(permissionAdds);
    if (mappingAdds.length) mappings.getRange(mappings.getLastRow() + 1, 1, mappingAdds.length, 4).setValues(mappingAdds);

    amsWriteAuditLog_(actor.userId, 'CEMENT_RBAC_INSTALLED', 'PERMISSIONS', 'AMS-CEMENT', {
      permissionRecordsAdded: permissionAdds.length,
      roleMappingsAdded: mappingAdds.length,
      rolesGranted: CEMENT_RBAC.PRIVILEGED_ROLE_IDS.slice()
    });
    SpreadsheetApp.flush();
    return {
      success: true,
      permissionRecordsAdded: permissionAdds.length,
      roleMappingsAdded: mappingAdds.length,
      protectedExistingRecords: true
    };
  } finally {
    lock.releaseLock();
  }
}

/** Guard protected Cement operations with the Hub RBAC service. */
function cementRequireHubPermission_(sessionToken, permissionCode) {
  if (!CEMENT_RBAC.PERMISSIONS.some(item => item.code === permissionCode)) {
    throw new Error('Unknown Cement permission: ' + permissionCode);
  }
  return amsRequirePermission_(sessionToken, permissionCode);
}

/** Return Hub identity and Cement permission flags; never creates a session. */
function cementGetAuthorizationContext(sessionToken) {
  const actor = amsValidateSession(sessionToken);
  const users = amsAuthHeaders_('Users');
  const values = users.sheet.getDataRange().getValues();
  const user = values.slice(1).find(row =>
    String(row[users.index('userId')]) === String(actor.userId)
  );
  if (!user) throw new Error('Authenticated Hub user record was not found.');
  const has = code => amsHasPermissionForRole_(actor.roleId, code);
  return {
    success: true,
    identity: {
      userId: actor.userId,
      username: actor.username,
      fullName: String(user[users.index('fullName')] || actor.username || ''),
      roleId: actor.roleId
    },
    permissions: {
      access: has('cement.access'),
      dashboard: has('cement.dashboard.view'),
      transactionsCreate: has('cement.transactions.create'),
      historyView: has('cement.history.view'),
      accountsView: has('cement.accounts.view')
    }
  };
}

/** Read-only schema guard. */
function cementReadHeaders_(sheet, required) {
  const lastColumn = sheet.getLastColumn();
  if (!lastColumn || sheet.getLastRow() < 1) {
    throw new Error('Hub RBAC sheet has no header row: ' + sheet.getName());
  }
  const headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0];
  required.forEach(name => {
    if (headers.indexOf(name) < 0) {
      throw new Error('Hub RBAC schema mismatch in ' + sheet.getName() + ': missing ' + name);
    }
  });
  return {
    index: name => {
      const index = headers.indexOf(name);
      if (index < 0) throw new Error('Missing column ' + name + ' in ' + sheet.getName());
      return index;
    }
  };
}

/** Prevent append-at-column-one if a sheet's schema order has drifted. */
function cementAssertHeaderOrder_(sheet, expected) {
  const actual = sheet.getRange(1, 1, 1, expected.length).getDisplayValues()[0];
  if (!expected.every((header, index) => actual[index] === header)) {
    throw new Error('Unexpected column order in ' + sheet.getName() + '. No RBAC records were written.');
  }
}
