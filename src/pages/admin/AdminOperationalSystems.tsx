import React, { useEffect, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore';
import { deleteObject, getBlob, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '../../firebase';
import type { OperationalSystem, OperationalSystemFile } from '../../types';
import { useAdminContext } from './AdminContext';
import { useToast } from '../../components/Toast';
import { Modal } from '../../components/Modal';
import { ArrowLeft, FileText, Plus, Trash2, Upload, X } from 'lucide-react';

const MAX_PDF_BYTES = 25 * 1024 * 1024;

const isPdf = (file: File) =>
  file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

export const AdminOperationalSystems: React.FC = () => {
  const { screenLocked } = useAdminContext();
  const { showToast } = useToast();

  const [systems, setSystems] = useState<OperationalSystem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [displayDrafts, setDisplayDrafts] = useState<Record<string, string>>({});
  const [pendingFiles, setPendingFiles] = useState<{ key: string; file: File; displayName: string }[]>([]);
  const [uploading, setUploading] = useState(false);

  const selected = systems.find(system => system.id === selectedId) || null;

  const loadSystems = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'operationalSystems'));
      const list: OperationalSystem[] = [];
      snap.forEach(item => {
        const data = item.data();
        list.push({
          id: item.id,
          name: typeof data.name === 'string' ? data.name : 'Untitled system',
          createdAt: typeof data.createdAt === 'string' ? data.createdAt : '',
          updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : '',
          files: Array.isArray(data.files) ? data.files as OperationalSystemFile[] : [],
        });
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setSystems(list);
    } catch (err) {
      console.error('Error loading operational systems:', err);
      showToast('Failed to load operational systems', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSystems();
  }, []);

  useEffect(() => {
    setPendingFiles([]);
  }, [selectedId]);

  useEffect(() => {
    if (!selected) return;
    setNameDraft(selected.name);
    const drafts: Record<string, string> = {};
    selected.files.forEach(file => {
      drafts[file.id] = file.displayName;
    });
    setDisplayDrafts(drafts);
  }, [selected]);

  const requireUnlocked = () => {
    if (!screenLocked) return true;
    showToast('Screen Lock active (View-Only Mode)', 'info');
    return false;
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!requireUnlocked()) return;
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const created = await addDoc(collection(db, 'operationalSystems'), {
        name,
        createdAt: now,
        updatedAt: now,
        files: [],
      });
      setCreateOpen(false);
      setNewName('');
      showToast(`System “${name}” created`);
      await loadSystems();
      setSelectedId(created.id);
    } catch (err) {
      console.error('Error creating operational system:', err);
      showToast('Failed to create system', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRenameSystem = async () => {
    if (!requireUnlocked() || !selected?.id) return;
    const name = nameDraft.trim();
    if (!name || name === selected.name) return;
    setSaving(true);
    try {
      const updatedAt = new Date().toISOString();
      await updateDoc(doc(db, 'operationalSystems', selected.id), { name, updatedAt });
      setSystems(prev => prev.map(system => system.id === selected.id ? { ...system, name, updatedAt } : system));
      showToast('System name updated');
    } catch (err) {
      console.error('Error renaming system:', err);
      showToast('Failed to rename system', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSystem = async () => {
    if (!requireUnlocked() || !selected?.id) return;
    if (!window.confirm(`Delete “${selected.name}” and all of its PDF files?`)) return;
    setSaving(true);
    try {
      await Promise.all(selected.files.map(async file => {
        try {
          await deleteObject(ref(storage, file.storagePath));
        } catch {
          // The storage object may already be gone.
        }
      }));
      await deleteDoc(doc(db, 'operationalSystems', selected.id));
      setSystems(prev => prev.filter(system => system.id !== selected.id));
      setSelectedId(null);
      showToast(`Deleted ${selected.name}`);
    } catch (err) {
      console.error('Error deleting system:', err);
      showToast('Failed to delete system', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePickFiles = (list: FileList | null) => {
    if (!requireUnlocked() || !list) return;
    const accepted: { key: string; file: File; displayName: string }[] = [];
    let rejected = 0;
    Array.from(list).forEach(file => {
      if (!isPdf(file)) {
        rejected += 1;
        return;
      }
      if (file.size > MAX_PDF_BYTES) {
        rejected += 1;
        return;
      }
      accepted.push({
        key: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        displayName: file.name,
      });
    });
    if (rejected > 0) {
      showToast('Only PDF files up to 25 MB can be added', 'error');
    }
    if (accepted.length > 0) {
      setPendingFiles(prev => [...prev, ...accepted]);
    }
  };

  const handleUploadPending = async () => {
    if (!requireUnlocked() || !selected?.id || pendingFiles.length === 0) return;
    const missingName = pendingFiles.some(item => !item.displayName.trim());
    if (missingName) {
      showToast('Each file needs a display name', 'error');
      return;
    }
    setUploading(true);
    try {
      const uploaded: OperationalSystemFile[] = [];
      for (const item of pendingFiles) {
        const id = crypto.randomUUID();
        const storagePath = `operational-systems/${selected.id}/${id}.pdf`;
        await uploadBytes(ref(storage, storagePath), item.file, { contentType: 'application/pdf' });
        uploaded.push({
          id,
          displayName: item.displayName.trim(),
          originalFileName: item.file.name,
          storagePath,
          uploadedAt: new Date().toISOString(),
        });
      }
      const files = [...selected.files, ...uploaded];
      const updatedAt = new Date().toISOString();
      await updateDoc(doc(db, 'operationalSystems', selected.id), { files, updatedAt });
      setSystems(prev => prev.map(system => system.id === selected.id ? { ...system, files, updatedAt } : system));
      setDisplayDrafts(prev => {
        const next = { ...prev };
        uploaded.forEach(file => {
          next[file.id] = file.displayName;
        });
        return next;
      });
      setPendingFiles([]);
      showToast(uploaded.length === 1 ? 'PDF uploaded' : `${uploaded.length} PDFs uploaded`);
    } catch (err) {
      console.error('Error uploading PDFs:', err);
      showToast('Failed to upload PDF', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveDisplayName = async (file: OperationalSystemFile) => {
    if (!requireUnlocked() || !selected?.id) return;
    const displayName = (displayDrafts[file.id] || '').trim();
    if (!displayName || displayName === file.displayName) return;
    setSaving(true);
    try {
      const files = selected.files.map(item => item.id === file.id ? { ...item, displayName } : item);
      const updatedAt = new Date().toISOString();
      await updateDoc(doc(db, 'operationalSystems', selected.id), { files, updatedAt });
      setSystems(prev => prev.map(system => system.id === selected.id ? { ...system, files, updatedAt } : system));
      showToast('Display name updated');
    } catch (err) {
      console.error('Error renaming file:', err);
      showToast('Failed to update display name', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFile = async (file: OperationalSystemFile) => {
    if (!requireUnlocked() || !selected?.id) return;
    if (!window.confirm(`Remove “${file.displayName}” from this system?`)) return;
    setSaving(true);
    try {
      try {
        await deleteObject(ref(storage, file.storagePath));
      } catch {
        // Continue so the portal record does not keep a missing file.
      }
      const files = selected.files.filter(item => item.id !== file.id);
      const updatedAt = new Date().toISOString();
      await updateDoc(doc(db, 'operationalSystems', selected.id), { files, updatedAt });
      setSystems(prev => prev.map(system => system.id === selected.id ? { ...system, files, updatedAt } : system));
      showToast('File removed');
    } catch (err) {
      console.error('Error deleting file:', err);
      showToast('Failed to remove file', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenFile = async (file: OperationalSystemFile) => {
    try {
      const blob = await getBlob(ref(storage, file.storagePath));
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      console.error('Error opening PDF:', err);
      showToast('Failed to open PDF', 'error');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span className="badge badge-gold" style={{ marginBottom: '0.4rem' }}>
            Operations
          </span>
          <h1 style={{ fontSize: '2.2rem', color: 'var(--text-primary)', margin: 0 }}>Operational Systems</h1>
          <p style={{ color: 'var(--text-muted)', margin: '0.45rem 0 0', maxWidth: '640px', lineHeight: 1.5 }}>
            Add a system, then upload the PDF process documents staff should follow. Each file can keep its PDF name or use a different name on screen.
          </p>
        </div>
        {!selected && (
          <button
            type="button"
            className="btn btn-primary"
            disabled={screenLocked}
            onClick={() => {
              if (!requireUnlocked()) return;
              setNewName('');
              setCreateOpen(true);
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Plus size={16} /> New System
          </button>
        )}
      </div>

      {selected ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setSelectedId(null)}
            style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <ArrowLeft size={14} /> All systems
          </button>

          <div className="card" style={{ padding: '1.25rem' }}>
            <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
              System name
            </label>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <input
                className="form-control"
                value={nameDraft}
                disabled={screenLocked || saving}
                onChange={(event) => setNameDraft(event.target.value)}
                style={{ flex: '1 1 240px' }}
              />
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={screenLocked || saving || !nameDraft.trim() || nameDraft.trim() === selected.name}
                onClick={handleRenameSystem}
              >
                Save name
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                disabled={screenLocked || saving}
                onClick={handleDeleteSystem}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <Trash2 size={14} /> Delete system
              </button>
            </div>
          </div>

          <div className="card" style={{ padding: '1.25rem' }}>
            <h2 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', margin: '0 0 0.35rem' }}>Process PDFs</h2>
            <p style={{ color: 'var(--text-muted)', margin: '0 0 1rem', fontSize: '0.9rem' }}>
              Upload one or more PDFs. The name shown here starts as the file name and can be changed.
            </p>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '1.25rem',
                border: '1px dashed var(--border-color)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-secondary)',
                cursor: screenLocked ? 'not-allowed' : 'pointer',
                marginBottom: pendingFiles.length > 0 ? '1rem' : 0
              }}
            >
              <Upload size={16} />
              Choose PDF files
              <input
                type="file"
                accept="application/pdf,.pdf"
                multiple
                disabled={screenLocked || uploading}
                onChange={(event) => {
                  handlePickFiles(event.target.files);
                  event.target.value = '';
                }}
                style={{ display: 'none' }}
              />
            </label>

            {pendingFiles.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                {pendingFiles.map(item => (
                  <div key={item.key} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      className="form-control"
                      value={item.displayName}
                      disabled={uploading}
                      onChange={(event) => {
                        const value = event.target.value;
                        setPendingFiles(prev => prev.map(entry => entry.key === item.key ? { ...entry, displayName: value } : entry));
                      }}
                      style={{ flex: '1 1 220px' }}
                      aria-label={`Display name for ${item.file.name}`}
                    />
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', flex: '1 1 160px' }}>{item.file.name}</span>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={uploading}
                      onClick={() => setPendingFiles(prev => prev.filter(entry => entry.key !== item.key))}
                      aria-label={`Remove ${item.file.name}`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={screenLocked || uploading}
                  onClick={handleUploadPending}
                  style={{ alignSelf: 'flex-start' }}
                >
                  {uploading ? 'Uploading…' : `Upload ${pendingFiles.length} PDF${pendingFiles.length === 1 ? '' : 's'}`}
                </button>
              </div>
            )}

            {selected.files.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', margin: '1rem 0 0' }}>No PDFs uploaded for this system yet.</p>
            ) : (
              <div style={{ overflowX: 'auto', marginTop: '0.5rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '0.75rem' }}>Shown as</th>
                      <th style={{ padding: '0.75rem' }}>PDF file</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.files.map(file => (
                      <tr key={file.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '0.75rem', minWidth: '220px' }}>
                          <input
                            className="form-control"
                            value={displayDrafts[file.id] ?? file.displayName}
                            disabled={screenLocked || saving}
                            onChange={(event) => setDisplayDrafts(prev => ({ ...prev, [file.id]: event.target.value }))}
                          />
                        </td>
                        <td style={{ padding: '0.75rem', color: 'var(--text-secondary)' }}>{file.originalFileName}</td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleOpenFile(file)}>
                              Open
                            </button>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              disabled={screenLocked || saving || !(displayDrafts[file.id] || '').trim() || (displayDrafts[file.id] || '').trim() === file.displayName}
                              onClick={() => handleSaveDisplayName(file)}
                            >
                              Save name
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              disabled={screenLocked || saving}
                              onClick={() => handleDeleteFile(file)}
                              aria-label={`Remove ${file.displayName}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Loading systems…</p>
      ) : systems.length === 0 ? (
        <div className="card" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          No operational systems yet. Create one, then upload the PDFs for that process.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
          {systems.map(system => (
            <button
              key={system.id}
              type="button"
              onClick={() => setSelectedId(system.id || null)}
              className="card"
              style={{
                padding: '1.25rem',
                textAlign: 'left',
                cursor: 'pointer',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-surface)',
                color: 'inherit'
              }}
            >
              <FileText size={20} style={{ color: 'var(--accent-gold)', marginBottom: '0.75rem' }} />
              <strong style={{ display: 'block', color: 'var(--text-primary)', fontSize: '1.05rem', marginBottom: '0.35rem' }}>
                {system.name}
              </strong>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                {system.files.length} PDF{system.files.length === 1 ? '' : 's'}
              </span>
            </button>
          ))}
        </div>
      )}

      {createOpen && (
        <Modal onClick={() => { if (!saving) setCreateOpen(false); }}>
          <div className="modal-content" style={{ maxWidth: '480px', position: 'relative' }} onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              aria-label="Close"
              onClick={() => { if (!saving) setCreateOpen(false); }}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer'
              }}
            >
              <X size={20} />
            </button>
            <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', marginTop: 0 }}>New system</h2>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <label>
                <span style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Name</span>
                <input
                  className="form-control"
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  placeholder="e.g. Immediate Dispatch booking"
                  autoFocus
                  required
                />
              </label>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} disabled={saving} onClick={() => setCreateOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving || !newName.trim()}>
                  {saving ? 'Creating…' : 'Create system'}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
};
