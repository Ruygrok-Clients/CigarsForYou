import React, { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { Edit3, Newspaper, Plus, Search, Trash2, X } from 'lucide-react';
import { db } from '../../firebase';
import type { NewsPost } from '../../types';
import { useToast } from '../../components/Toast';
import { Modal } from '../../components/Modal';
import { useAdminContext } from './AdminContext';
import { mapNewsPost, slugifyNewsTitle } from '../../services/news';

const emptyForm = {
  title: '',
  slug: '',
  excerpt: '',
  imageUrl: '',
  body: '',
  publishedAt: '',
  readMinutes: 4,
  active: true
};

function todayDateInput(): string {
  return new Date().toISOString().slice(0, 10);
}

export const AdminNews: React.FC = () => {
  const { screenLocked } = useAdminContext();
  const { showToast } = useToast();
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<NewsPost | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadPosts = async () => {
    const snap = await getDocs(collection(db, 'newsPosts'));
    const list: NewsPost[] = [];
    snap.forEach((entry) => {
      list.push(mapNewsPost(entry.id, entry.data() as Record<string, unknown>));
    });
    list.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.title.localeCompare(b.title));
    return list;
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await loadPosts();
        if (!cancelled) setPosts(list);
      } catch (err) {
        console.error('Error fetching news posts:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openAdd = () => {
    setEditing(null);
    setSlugTouched(false);
    setForm({ ...emptyForm, publishedAt: todayDateInput() });
    setModalOpen(true);
  };

  const openEdit = (post: NewsPost) => {
    setEditing(post);
    setSlugTouched(true);
    setForm({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      imageUrl: post.imageUrl,
      body: post.body,
      publishedAt: post.publishedAt.slice(0, 10),
      readMinutes: post.readMinutes || 1,
      active: post.active
    });
    setModalOpen(true);
  };

  const handleTitleChange = (title: string) => {
    setForm((current) => ({
      ...current,
      title,
      slug: slugTouched ? current.slug : slugifyNewsTitle(title)
    }));
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (screenLocked || saving) return;

    const slug = slugifyNewsTitle(form.slug || form.title);
    const title = form.title.trim();
    if (!title || !slug) {
      showToast('A title and slug are required', 'error');
      return;
    }

    setSaving(true);
    try {
      if (!editing || editing.id !== slug) {
        const existing = await getDoc(doc(db, 'newsPosts', slug));
        if (existing.exists() && existing.id !== editing?.id) {
          showToast('Another post already uses that slug', 'error');
          return;
        }
      }

      const now = new Date().toISOString();
      const payload = {
        slug,
        title,
        excerpt: form.excerpt.trim(),
        imageUrl: form.imageUrl.trim(),
        body: form.body.trim(),
        publishedAt: form.publishedAt || todayDateInput(),
        readMinutes: Math.max(1, Math.round(Number(form.readMinutes) || 1)),
        active: form.active,
        createdAt: editing?.createdAt || now,
        updatedAt: now
      };

      await setDoc(doc(db, 'newsPosts', slug), payload);
      if (editing?.id && editing.id !== slug) {
        await deleteDoc(doc(db, 'newsPosts', editing.id));
      }

      setPosts(await loadPosts());
      setModalOpen(false);
      showToast(editing ? 'News post updated' : 'News post published');
    } catch (err) {
      console.error('Error saving news post:', err);
      showToast('Failed to save news post', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (post: NewsPost) => {
    if (screenLocked || !post.id) return;
    if (!window.confirm(`Delete “${post.title}”?`)) return;
    try {
      await deleteDoc(doc(db, 'newsPosts', post.id));
      setPosts((prev) => prev.filter((entry) => entry.id !== post.id));
      showToast('News post deleted');
    } catch (err) {
      console.error('Error deleting news post:', err);
      showToast('Failed to delete news post', 'error');
    }
  };

  const filtered = posts.filter((post) => {
    if (!searchQuery.trim()) return true;
    const queryText = searchQuery.toLowerCase();
    return post.title.toLowerCase().includes(queryText) || post.slug.toLowerCase().includes(queryText);
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span className="badge badge-gold" style={{ marginBottom: '0.4rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <Newspaper size={14} /> Marketing
          </span>
          <h1 style={{ fontSize: '2rem', margin: 0, color: 'var(--text-primary)' }}>News & Blogs</h1>
          <p style={{ color: 'var(--text-secondary)', margin: '0.4rem 0 0', maxWidth: '640px' }}>
            Publish stories for the News page. Unpublished posts stay in this list and stay off the storefront.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openAdd} disabled={screenLocked} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <Plus size={16} /> New post
        </button>
      </div>

      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ position: 'relative', maxWidth: '360px' }}>
          <Search size={18} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-control"
            style={{ paddingLeft: '2.5rem' }}
            placeholder="Search title or slug..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>Loading news posts...</div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
          <Newspaper size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>No news posts yet</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Write a title, an excerpt, and the story body to publish on News.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem' }}>Title</th>
                  <th style={{ padding: '0.75rem' }}>Published</th>
                  <th style={{ padding: '0.75rem' }}>Read</th>
                  <th style={{ padding: '0.75rem' }}>Status</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((post) => (
                  <tr key={post.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.75rem', color: 'var(--text-primary)' }}>
                      <strong>{post.title}</strong>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.2rem' }}>/news/{post.slug}</div>
                    </td>
                    <td style={{ padding: '0.75rem', whiteSpace: 'nowrap' }}>{post.publishedAt.slice(0, 10)}</td>
                    <td style={{ padding: '0.75rem' }}>{post.readMinutes} min</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span className={post.active ? 'badge badge-green' : 'badge badge-amber'}>
                        {post.active ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(post)} disabled={screenLocked} title="Edit">
                          <Edit3 size={14} />
                        </button>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleDelete(post)} disabled={screenLocked} title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalOpen && (
        <Modal onClick={() => setModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '680px' }} onClick={(event) => event.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-primary)' }}>
                {editing ? 'Edit post' : 'New post'}
              </h2>
              <button type="button" onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div>
                <label className="form-label">Title</label>
                <input className="form-control" value={form.title} onChange={(event) => handleTitleChange(event.target.value)} required />
              </div>
              <div>
                <label className="form-label">Slug</label>
                <input
                  className="form-control"
                  value={form.slug}
                  onChange={(event) => {
                    setSlugTouched(true);
                    setForm({ ...form, slug: event.target.value });
                  }}
                  required
                />
              </div>
              <div>
                <label className="form-label">Excerpt</label>
                <textarea className="form-control" rows={3} value={form.excerpt} onChange={(event) => setForm({ ...form, excerpt: event.target.value })} required />
              </div>
              <div>
                <label className="form-label">Image URL</label>
                <input className="form-control" value={form.imageUrl} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} placeholder="/news/cover.jpeg or https://" />
              </div>
              <div>
                <label className="form-label">Body</label>
                <textarea
                  className="form-control"
                  rows={12}
                  value={form.body}
                  onChange={(event) => setForm({ ...form, body: event.target.value })}
                  placeholder={'Separate paragraphs with a blank line.\n\n## Section heading'}
                  required
                />
                <p style={{ margin: '0.35rem 0 0', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                  Blank line between paragraphs. Start a block with ## for a section heading.
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label className="form-label">Published date</label>
                  <input type="date" className="form-control" value={form.publishedAt} onChange={(event) => setForm({ ...form, publishedAt: event.target.value })} required />
                </div>
                <div>
                  <label className="form-label">Read minutes</label>
                  <input type="number" min={1} className="form-control" value={form.readMinutes} onChange={(event) => setForm({ ...form, readMinutes: Number(event.target.value) })} required />
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                <input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />
                Published on the News page
              </label>
              <button type="submit" className="btn btn-primary" disabled={screenLocked || saving}>
                {saving ? 'Saving...' : editing ? 'Save changes' : 'Publish post'}
              </button>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
};
