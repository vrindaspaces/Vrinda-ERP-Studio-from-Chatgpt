import {useState, useRef} from 'react';
import {refreshSharedRecords, authHeaders} from '../../context/sharedRecords';
import {Download, Upload, CheckCircle2, AlertCircle} from 'lucide-react';

export function ErpBackup() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function download() {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch('/api/erp-backup', {
        cache: 'no-store',
        headers: {...authHeaders()}
      });
      if (!response.ok) {
        const body = await response.json();
        throw Error(body.error || 'Backup could not be downloaded.');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download =
        response.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1] ||
        'ERP-Studio-backup.json';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      setSuccess('Backup downloaded successfully.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Backup failed.');
    } finally {
      setBusy(false);
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError('');
    setSuccess('');

    try {
      const text = await file.text();
      const json = JSON.parse(text);

      const response = await fetch('/api/erp-backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders()
        },
        body: JSON.stringify(json)
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to restore backup.');
      }

      setSuccess(result.message || 'ERP backup restored successfully!');
      await refreshSharedRecords();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid backup file or restore failed.');
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
      <div>
        <h2 className="font-bold text-slate-900 text-base">ERP Data Backup & Restore</h2>
        <p className="text-sm text-slate-600 mt-1">
          Export current business collections to JSON or restore from a previously exported Owner backup.
          Includes records and file references; passwords and connection secrets are excluded.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button
          type="button"
          disabled={busy}
          onClick={download}
          className="inline-flex items-center gap-2 burgundy-gloss text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 cursor-pointer"
        >
          <Download size={16} />
          {busy ? 'Processing…' : 'Export Full ERP Backup'}
        </button>

        <label className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-colors">
          <Upload size={16} />
          <span>Restore Backup (.json)</span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            disabled={busy}
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>
      </div>

      {success && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-800">
          <AlertCircle size={16} className="text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </section>
  );
}
