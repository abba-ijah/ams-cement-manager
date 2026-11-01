/**
 * AMS Cement Manager — Milestone 1 authentication bridge.
 *
 * Dependencies supplied by AMS Business Hub – Production:
 * amsValidateSession(token), amsRequirePermission_(token, permissionCode),
 * amsHasPermissionForRole_(roleId, permissionCode), amsAuthDatabase_(),
 * amsAuthHeaders_(sheetName), amsWriteAuditLog_(...).
 *
 * No login, password, token issuance, legacy App Users or separate session code.
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

/** Add missing Cement permissions and Owner/Admin mappings only. */
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
    const pId=p.index('permissionId'), pCode=p.index('permissionCode'), roleId=r.index('roleId');
    const mapRole=m.index('roleId'), mapPermission=m.index('permissionId');
    const permissionIds=new Map();
    pRows.slice(1).forEach(row=>{const code=String(row[pCode]||'').trim(),id=String(row[pId]||'').trim();if(code&&id)permissionIds.set(code,id);});
    const permissionAdds=[];
    CEMENT_RBAC.PERMISSIONS.forEach(def=>{if(!permissionIds.has(def.code)){permissionAdds.push([def.id,def.code,def.description,new Date()]);permissionIds.set(def.code,def.id);}});
    if(permissionAdds.length)permissions.getRange(permissions.getLastRow()+1,1,permissionAdds.length,4).setValues(permissionAdds);
    const existingRoles=new Set(roleRows.slice(1).map(row=>String(row[roleId]||'').trim()));
    CEMENT_RBAC.PRIVILEGED_ROLE_IDS.forEach(id=>{if(!existingRoles.has(id))throw new Error('Required Hub role is missing: '+id+'. No role mappings were changed.');});
    const existingMappings=new Set(mapRows.slice(1).map(row=>String(row[mapRole]||'').trim()+'::'+String(row[mapPermission]||'').trim()));
    const mappingAdds=[];
    CEMENT_RBAC.PRIVILEGED_ROLE_IDS.forEach(rid=>CEMENT_RBAC.PERMISSIONS.forEach(def=>{const pid=permissionIds.get(def.code),key=rid+'::'+pid;if(!existingMappings.has(key)){mappingAdds.push([rid+'__'+pid,rid,pid,new Date()]);existingMappings.add(key);}}));
    if(mappingAdds.length)mappings.getRange(mappings.getLastRow()+1,1,mappingAdds.length,4).setValues(mappingAdds);
    amsWriteAuditLog_(actor.userId,'CEMENT_RBAC_INSTALLED','PERMISSIONS','AMS-CEMENT',{permissionRecordsAdded:permissionAdds.length,roleMappingsAdded:mappingAdds.length,rolesGranted:CEMENT_RBAC.PRIVILEGED_ROLE_IDS.slice()});
    SpreadsheetApp.flush();
    return {success:true,permissionRecordsAdded:permissionAdds.length,roleMappingsAdded:mappingAdds.length,protectedExistingRecords:true};
  } finally { lock.releaseLock(); }
}

/** Guard protected Cement operations with Hub RBAC. */
function cementRequireHubPermission_(sessionToken, permissionCode) {
  if (!CEMENT_RBAC.PERMISSIONS.some(item=>item.code===permissionCode)) throw new Error('Unknown Cement permission: '+permissionCode);
  return amsRequirePermission_(sessionToken,permissionCode);
}

/** Returns the current Hub identity and Cement permissions; never creates a session. */
function cementGetAuthorizationContext(sessionToken) {
  const actor=amsValidateSession(sessionToken),users=amsAuthHeaders_('Users'),values=users.sheet.getDataRange().getValues();
  const user=values.slice(1).find(row=>String(row[users.index('userId')])===String(actor.userId));
  if(!user)throw new Error('Authenticated Hub user record was not found.');
  const has=code=>amsHasPermissionForRole_(actor.roleId,code);
  return {success:true,identity:{userId:actor.userId,username:actor.username,fullName:String(user[users.index('fullName')]||actor.username||''),roleId:actor.roleId},permissions:{access:has('cement.access'),dashboard:has('cement.dashboard.view'),transactionsCreate:has('cement.transactions.create'),historyView:has('cement.history.view'),accountsView:has('cement.accounts.view')}};
}

/** Validate expected RBAC columns without changing the sheet. */
function cementReadHeaders_(sheet,required) {
  const lastColumn=sheet.getLastColumn();
  if(!lastColumn||sheet.getLastRow()<1)throw new Error('Hub RBAC sheet has no header row: '+sheet.getName());
  const headers=sheet.getRange(1,1,1,lastColumn).getDisplayValues()[0];
  required.forEach(name=>{if(headers.indexOf(name)<0)throw new Error('Hub RBAC schema mismatch in '+sheet.getName()+': missing '+name);});
  return {index:name=>{const index=headers.indexOf(name);if(index<0)throw new Error('Missing column '+name+' in '+sheet.getName());return index;}};
}
