export function exportErpBackup(actor: any, rows: any[]) {
  if (!actor) return Response.json({error: 'Please sign in.'}, {status: 401});
  if (actor.role !== 'Owner') return Response.json({error: 'Only the Owner can export ERP data.'}, {status: 403});
  const records = Object.fromEntries(rows.map(row => [row.key, JSON.parse(row.value)]));
  records.employees = (records.employees || []).map((employee: any) => {
    const {password, ...profile} = employee;
    return profile;
  });
  const files: any[] = [];
  for (const task of records.tasks || []) {
    for (const file of task.attachments || []) {
      files.push({collection: 'tasks', recordId: task.id, projectId: task.projectId, ...file, ...(!file.driveFileId ? {storage: 'application', objectKey: 'tasks/' + task.id + '/' + file.id} : {storage: 'google-drive'})});
    }
  }
  for (const invoice of records.supplierInvoices || []) {
    if (invoice.attachment) {
      files.push({collection: 'supplierInvoices', recordId: invoice.id, projectId: invoice.projectId, storage: 'google-drive', ...invoice.attachment});
    }
  }
  if (records.companyProfile?.logoId) {
    files.push({collection: 'companyProfile', storage: 'application', objectKey: 'logos/' + records.companyProfile.logoId});
  }
  const backup = {
    format: 'vrinda-erp-backup',
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    records,
    collectionRevisions: Object.fromEntries(rows.map(row => [row.key, row.revision])),
    recordCounts: Object.fromEntries(Object.entries(records).map(([key, value]) => [key, Array.isArray(value) ? value.length : 1])),
    fileManifest: files,
    migrationNotes: [
      'Contains all current business collections from a single shared database read.',
      'Recreate the target database using the source-code schema, then import each records collection, preserving IDs and relationships.',
      'Employee passwords, login sessions, API keys, OAuth tokens and notification delivery queues are excluded. Configure fresh authentication and reconnect email and Google Drive.',
      'File references are included; binary files are not embedded. Keep access to the existing Google Shared Drive or copy its files and update references. Copy application-storage objects listed in fileManifest separately. Project document links and legacy photo URLs remain in their original records.',
      'No restore/import operation is supplied by this export. Have your vendor validate the imported records and file access before switching hosting.'
    ]
  };
  return new Response(JSON.stringify(backup, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': 'attachment; filename="ERP-Studio-backup-' + new Date().toISOString().replace(/[:.]/g, '-') + '.json"',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

export async function restoreErpBackup(request: Request, env: any, actor: any) {
  if (!actor) return Response.json({error: 'Please sign in.'}, {status: 401});
  if (actor.role !== 'Owner') return Response.json({error: 'Only the Owner can restore ERP data.'}, {status: 403});
  try {
    const raw = await request.json() as any;
    const backup = raw.records ? raw : (raw.format === 'vrinda-erp-backup' ? raw : null);
    if (!backup?.records || typeof backup.records !== 'object') {
      return Response.json({error: 'Invalid backup file format. Expected a vrinda-erp-backup JSON.'}, {status: 400});
    }

    const records = backup.records;
    const statements: any[] = [];
    const updatedCollections: string[] = [];

    for (const [key, val] of Object.entries(records)) {
      if (val !== undefined && key !== '__identity') {
        let sanitizedVal = val;
        if (key === 'employees' && Array.isArray(val)) {
          const currentEmployees = (await env.DB.prepare("SELECT value FROM erp_collections WHERE key='employees'").all()).results[0];
          let currentList: any[] = [];
          try { currentList = JSON.parse(currentEmployees.value); } catch {}
          sanitizedVal = val.map((e: any) => {
            const existing = currentList.find((c: any) => c.id === e.id || c.email === e.email);
            return {
              ...e,
              password: e.password || existing?.password || 'vrinda123'
            };
          });
        }
        statements.push(
          env.DB.prepare("INSERT INTO erp_collections (key, value, revision) VALUES (?, ?, 1) ON CONFLICT(key) DO UPDATE SET value=excluded.value, revision=revision+1").bind(key, JSON.stringify(sanitizedVal))
        );
        updatedCollections.push(key);
      }
    }

    if (statements.length > 0) {
      await env.DB.batch(statements);
    }

    return Response.json({
      success: true,
      message: `Successfully restored ${updatedCollections.length} collections.`,
      restoredCollections: updatedCollections
    });
  } catch (err) {
    return Response.json({error: err instanceof Error ? err.message : 'Failed to parse or restore backup.'}, {status: 400});
  }
}
