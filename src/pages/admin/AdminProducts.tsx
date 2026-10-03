import React, { useState, useEffect } from 'react';
import { addDoc, collection, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '../../firebase';
import type { CatalogCategory, PackagingOption, Product, ProductRange, ProductSpecification } from '../../types';
import { useAdminContext } from './AdminContext';
import { useToast } from '../../components/Toast';
import { PRODUCT_RANGES, rangeLabel, slugifyLabel } from '../../constants/productRanges';
import {
  ensureDefaultCigarCategories,
  fetchCatalogCategories,
  fetchProducts,
  productUsesCategory
} from '../../services/catalog';
import { Plus, Search, X, Layers, Trash2 } from 'lucide-react';

type EditorTab = 'identity' | 'media' | 'pricing' | 'story' | 'danger';

const EDITOR_TABS: { id: EditorTab; label: string }[] = [
  { id: 'identity', label: 'Identity & Category' },
  { id: 'media', label: 'Media & Imagery' },
  { id: 'pricing', label: 'Pricing & Stock' },
  { id: 'story', label: 'Description & Story' },
  { id: 'danger', label: 'Danger Zone' }
];

const emptySpecs = (): ProductSpecification => ({
  vitola: '',
  factoryName: '',
  ringGauge: undefined,
  length: '',
  strength: '',
  wrapper: '',
  filler: '',
  binder: '',
  smokingTime: ''
});

function blankProduct(range: ProductRange, category?: CatalogCategory): Product {
  return {
    name: '',
    brand: category?.name || '',
    catalogCategoryId: category?.id,
    slug: '',
    price: 100,
    currency: 'AUD',
    stock: 100,
    imageUrl: '',
    category: range,
    origin: range === 'cigars' ? 'Cuban' : '',
    active: true,
    description: '',
    extendedDescription: '',
    tagline: '',
    brandHistory: '',
    tastingNotes: [],
    fbtRanges: [],
    specifications: emptySpecs(),
    packagingOptions: range === 'cigars'
      ? [
          { id: 'single', name: 'Single Stick', priceMultiplier: 1, stock: 100 },
          { id: 'box10', name: 'Box of 10', priceMultiplier: 9.5, stock: 10 },
          { id: 'box25', name: 'Cabinet of 25', priceMultiplier: 23.5, stock: 4 }
        ]
      : []
  };
}

export const AdminProducts: React.FC = () => {
  const { screenLocked } = useAdminContext();
  const { showToast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<ProductRange>('cigars');
  const [searchQuery, setSearchQuery] = useState('');

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorTab, setEditorTab] = useState<EditorTab>('identity');
  const [draft, setDraft] = useState<Product>(blankProduct('cigars'));
  const [notesText, setNotesText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkNames, setBulkNames] = useState('');
  const [bulkCategoryId, setBulkCategoryId] = useState('');

  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [blockedCategory, setBlockedCategory] = useState<{ name: string; count: number } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const loadCatalog = async () => {
    setLoading(true);
    try {
      const productList = await fetchProducts();
      productList.sort((a, b) => a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name));
      setProducts(productList);
      try {
        await ensureDefaultCigarCategories(productList);
        setCategories(await fetchCatalogCategories());
      } catch (err) {
        console.error('Error loading categories:', err);
        showToast('Failed to load categories. Deploy the latest Firestore rules if this persists.', 'error');
      }
    } catch (err) {
      console.error('Error fetching products:', err);
      showToast('Failed to load the catalogue', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const productList = await fetchProducts();
        if (cancelled) return;
        productList.sort((a, b) => a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name));
        setProducts(productList);
        try {
          await ensureDefaultCigarCategories(productList);
          if (cancelled) return;
          setCategories(await fetchCatalogCategories());
        } catch (err) {
          console.error('Error loading categories:', err);
          if (!cancelled) showToast('Failed to load categories. Deploy the latest Firestore rules if this persists.', 'error');
        }
      } catch (err) {
        console.error('Error fetching products:', err);
        if (!cancelled) showToast('Failed to load the catalogue', 'error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Initial catalogue load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rangeCategories = categories
    .filter((category) => category.range === range)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));

  const rangeProducts = products.filter((product) => {
    const productRange = product.category || 'cigars';
    if (productRange !== range) return false;
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return product.name.toLowerCase().includes(query) || product.brand.toLowerCase().includes(query);
  });

  const openEditor = (product: Product | null) => {
    if (!product && rangeCategories.length === 0) {
      showToast('Create a category for this range before adding a product', 'error');
      return;
    }
    const next = product
      ? {
          ...blankProduct(range),
          ...product,
          category: (product.category || 'cigars') as ProductRange,
          specifications: { ...emptySpecs(), ...(product.specifications || {}) },
          packagingOptions: product.packagingOptions ? [...product.packagingOptions] : blankProduct(range).packagingOptions,
          tastingNotes: product.tastingNotes || []
        }
      : blankProduct(range, rangeCategories[0]);
    const matched = rangeCategories.find((category) => category.id === next.catalogCategoryId)
      || rangeCategories.find((category) => category.name.toLowerCase() === (next.brand || '').toLowerCase());
    if (matched) {
      next.catalogCategoryId = matched.id;
      next.brand = matched.name;
    }
    setDraft(next);
    setNotesText((next.tastingNotes || []).join('\n'));
    setEditorTab('identity');
    setConfirmDelete(false);
    setEditorOpen(true);
  };

  const buildPayload = (): Product | null => {
    const category = rangeCategories.find((item) => item.id === draft.catalogCategoryId)
      || rangeCategories.find((item) => item.name.toLowerCase() === draft.brand.trim().toLowerCase());
    if (!draft.name.trim() || !category) {
      setEditorTab('identity');
      showToast('A product name and category are required', 'error');
      return null;
    }
    const notes = notesText.split('\n').map((line) => line.trim()).filter(Boolean);
    const specs = draft.specifications || emptySpecs();
    const packaging = (draft.packagingOptions || [])
      .filter((option) => option.name.trim())
      .map((option) => ({
        ...option,
        id: option.id || slugifyLabel(option.name),
        name: option.name.trim(),
        priceMultiplier: Number(option.priceMultiplier) || 1,
        stock: Number(option.stock) || 0
      }));

    return {
      name: draft.name.trim(),
      brand: category.name,
      catalogCategoryId: category.id,
      slug: slugifyLabel(`${category.name}-${draft.name}`),
      price: Number(draft.price) || 0,
      currency: 'AUD',
      stock: Number(draft.stock) || 0,
      imageUrl: (draft.imageUrl || '').trim(),
      category: range,
      origin: (draft.origin || '').trim(),
      active: draft.active,
      description: (draft.description || '').trim(),
      extendedDescription: (draft.extendedDescription || '').trim(),
      tagline: (draft.tagline || '').trim(),
      brandHistory: (draft.brandHistory || '').trim(),
      tastingNotes: notes,
      fbtRanges: range === 'accessories' ? (draft.fbtRanges || []) : [],
      specifications: range === 'cigars'
        ? Object.fromEntries(Object.entries(specs).filter(([, value]) => value !== undefined && value !== ''))
        : {},
      packagingOptions: range === 'cigars' ? packaging : []
    };
  };

  const handleSaveProduct = async () => {
    if (screenLocked || saving) return;
    const payload = buildPayload();
    if (!payload) return;
    setSaving(true);
    try {
      if (draft.id) {
        await updateDoc(doc(db, 'products', draft.id), payload as unknown as Record<string, unknown>);
        showToast(`Updated product ${payload.name}`);
      } else {
        await addDoc(collection(db, 'products'), payload);
        showToast(`Created new product ${payload.name}`);
      }
      setEditorOpen(false);
      await loadCatalog();
    } catch (err) {
      console.error('Error saving product:', err);
      showToast('Failed to save product', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (screenLocked || !draft.id) return;
    try {
      await deleteDoc(doc(db, 'products', draft.id));
      showToast(`Deleted ${draft.name}`);
      setEditorOpen(false);
      await loadCatalog();
    } catch (err) {
      console.error('Error deleting product:', err);
      showToast('Failed to delete product', 'error');
    }
  };

  const handleImageUpload = async (file: File) => {
    if (screenLocked) return;
    setUploading(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
      const folder = draft.id || `new-${Date.now()}`;
      const storageRef = ref(storage, `product-images/${folder}/${Date.now()}-${safeName}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setDraft((current) => ({ ...current, imageUrl: url }));
      showToast('Image uploaded');
    } catch (err) {
      console.error('Image upload error:', err);
      showToast('Failed to upload image', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (screenLocked || !newCategoryName.trim()) return;
    const name = newCategoryName.trim();
    if (rangeCategories.some((category) => category.name.toLowerCase() === name.toLowerCase())) {
      showToast('That category already exists in this range', 'error');
      return;
    }
    try {
      await addDoc(collection(db, 'catalogCategories'), {
        range,
        name,
        slug: slugifyLabel(name),
        sortOrder: rangeCategories.length
      });
      setNewCategoryName('');
      showToast(`Added category ${name}`);
      setCategories(await fetchCatalogCategories());
    } catch (err) {
      console.error('Error adding category:', err);
      showToast('Failed to add category', 'error');
    }
  };

  const handleRenameCategory = async (category: CatalogCategory) => {
    if (screenLocked || !category.id) return;
    const name = editingCategoryName.trim();
    if (!name) return;
    try {
      await updateDoc(doc(db, 'catalogCategories', category.id), {
        name,
        slug: slugifyLabel(name)
      });
      const attached = products.filter((product) => productUsesCategory(product, category));
      await Promise.all(attached.map((product) => {
        if (!product.id) return Promise.resolve();
        return updateDoc(doc(db, 'products', product.id), {
          brand: name,
          catalogCategoryId: category.id
        });
      }));
      setEditingCategoryId(null);
      showToast(`Renamed category to ${name}`);
      await loadCatalog();
    } catch (err) {
      console.error('Error renaming category:', err);
      showToast('Failed to rename category', 'error');
    }
  };

  const handleDeleteCategory = async (category: CatalogCategory) => {
    if (screenLocked || !category.id) return;
    const attached = products.filter((product) => productUsesCategory(product, category));
    if (attached.length > 0) {
      setBlockedCategory({ name: category.name, count: attached.length });
      return;
    }
    try {
      await deleteDoc(doc(db, 'catalogCategories', category.id));
      showToast(`Deleted category ${category.name}`);
      setCategories(await fetchCatalogCategories());
    } catch (err) {
      console.error('Error deleting category:', err);
      showToast('Failed to delete category', 'error');
    }
  };

  const handleBulkAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (screenLocked || !bulkNames.trim()) return;
    const category = rangeCategories.find((item) => item.id === bulkCategoryId);
    if (!category) {
      showToast('Choose a category before bulk adding', 'error');
      return;
    }
    const names = bulkNames.split(',').map((name) => name.trim()).filter(Boolean);
    if (names.length === 0) return;
    try {
      for (const itemName of names) {
        const payload: Product = {
          ...blankProduct(range, category),
          name: itemName,
          slug: slugifyLabel(`${category.name}-${itemName}`),
          price: 50,
          stock: 0,
          active: true,
          description: 'Bulk added product pending details'
        };
        await addDoc(collection(db, 'products'), payload);
      }
      showToast(`Bulk added ${names.length} product(s) at 0 stock`);
      setBulkOpen(false);
      setBulkNames('');
      await loadCatalog();
    } catch (err) {
      console.error('Bulk add error:', err);
      showToast('Failed to bulk add products', 'error');
    }
  };

  const updatePackaging = (index: number, patch: Partial<PackagingOption>) => {
    setDraft((current) => {
      const packagingOptions = [...(current.packagingOptions || [])];
      packagingOptions[index] = { ...packagingOptions[index], ...patch };
      return { ...current, packagingOptions };
    });
  };

  const saveBar = (
    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
      <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setEditorOpen(false)}>
        Cancel
      </button>
      <button type="button" className="btn btn-primary" style={{ flex: 2 }} disabled={screenLocked || saving} onClick={handleSaveProduct}>
        {saving ? 'Saving...' : 'Save Product'}
      </button>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span className="badge badge-gold" style={{ marginBottom: '0.4rem' }}>
            Catalog & Inventory Control
          </span>
          <h1 style={{ fontSize: '2.2rem', color: 'var(--text-primary)' }}>Products & Stock</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              if (rangeCategories.length === 0) {
                showToast('Create a category for this range before bulk adding', 'error');
                return;
              }
              setBulkCategoryId(rangeCategories[0].id || '');
              setBulkOpen(true);
            }}
            disabled={screenLocked}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Layers size={16} /> Bulk-Add Tool
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => openEditor(null)}
            disabled={screenLocked}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Plus size={16} /> Add Product
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {PRODUCT_RANGES.map((item) => (
          <button
            key={item}
            className={`btn btn-sm ${range === item ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => {
              setRange(item);
              setSearchQuery('');
            }}
          >
            {rangeLabel(item)}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ marginBottom: '0.85rem' }}>
          <h2 style={{ fontSize: '1.15rem', marginBottom: '0.25rem' }}>{rangeLabel(range)} categories</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
            E.g. brands or product type e.g. Lighters etc.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
          {rangeCategories.length === 0 && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
              No categories yet. Add one before creating products in this range.
            </p>
          )}
          {rangeCategories.map((category) => (
            <div key={category.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              {editingCategoryId === category.id ? (
                <>
                  <input
                    className="form-control"
                    value={editingCategoryName}
                    onChange={(e) => setEditingCategoryName(e.target.value)}
                    style={{ maxWidth: '280px' }}
                  />
                  <button className="btn btn-primary btn-sm" disabled={screenLocked} onClick={() => handleRenameCategory(category)}>Save</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setEditingCategoryId(null)}>Cancel</button>
                </>
              ) : (
                <>
                  <strong style={{ minWidth: '140px' }}>{category.name}</strong>
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={screenLocked}
                    onClick={() => {
                      setEditingCategoryId(category.id || null);
                      setEditingCategoryName(category.name);
                    }}
                  >
                    Rename
                  </button>
                  <button className="btn btn-danger btn-sm" disabled={screenLocked} onClick={() => handleDeleteCategory(category)}>
                    Delete
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
        <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <input
            className="form-control"
            placeholder="New category name"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            style={{ maxWidth: '280px' }}
          />
          <button className="btn btn-secondary btn-sm" type="submit" disabled={screenLocked}>Add category</button>
        </form>
      </div>

      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ position: 'relative', maxWidth: '360px' }}>
          <Search size={18} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-control"
            style={{ paddingLeft: '2.5rem' }}
            placeholder="Search product or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>Loading product catalog...</div>
      ) : (
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem' }}>Category</th>
                  <th style={{ padding: '0.75rem' }}>Product Name</th>
                  <th style={{ padding: '0.75rem' }}>Price (AUD)</th>
                  <th style={{ padding: '0.75rem' }}>Stock</th>
                  <th style={{ padding: '0.75rem' }}>Status</th>
                  <th style={{ padding: '0.75rem' }}>Published</th>
                </tr>
              </thead>
              <tbody>
                {rangeProducts.map((product) => {
                  const isOut = product.stock <= 0;
                  const isLow = product.stock > 0 && product.stock < 10;
                  return (
                    <tr
                      key={product.id}
                      onClick={() => openEditor(product)}
                      style={{ borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' }}
                    >
                      <td style={{ padding: '0.75rem', fontWeight: 600, color: 'var(--accent-gold)' }}>{product.brand}</td>
                      <td style={{ padding: '0.75rem', color: 'var(--text-primary)', fontWeight: 600 }}>{product.name}</td>
                      <td style={{ padding: '0.75rem' }}>${Number(product.price).toFixed(2)}</td>
                      <td style={{ padding: '0.75rem' }}>{product.stock}</td>
                      <td style={{ padding: '0.75rem' }}>
                        {isOut ? (
                          <span className="badge badge-red">Out of Stock</span>
                        ) : isLow ? (
                          <span className="badge badge-amber">Low Stock ({product.stock})</span>
                        ) : (
                          <span className="badge badge-green">In Stock ({product.stock})</span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        {product.active ? (
                          <span className="badge badge-green">Live</span>
                        ) : (
                          <span className="badge badge-gray">Hidden</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {rangeProducts.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: '1.5rem', color: 'var(--text-muted)' }}>
                      No products in {rangeLabel(range)} yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editorOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '760px', width: '100%', maxHeight: '90vh', overflow: 'auto', position: 'relative' }}>
            <button
              onClick={() => setEditorOpen(false)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
            <h2 style={{ fontSize: '1.6rem', marginBottom: '0.35rem' }}>
              {draft.id ? draft.name || 'Edit Product' : `Add ${rangeLabel(range)} product`}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
              Range: {rangeLabel(range)}
            </p>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
              {EDITOR_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`btn btn-sm ${editorTab === tab.id ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setEditorTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {editorTab === 'identity' && (
              <div>
                <div className="form-group">
                  <label className="form-label">Product title</label>
                  <input className="form-control" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="form-control"
                    value={draft.catalogCategoryId || ''}
                    onChange={(e) => {
                      const category = rangeCategories.find((item) => item.id === e.target.value);
                      setDraft({
                        ...draft,
                        catalogCategoryId: e.target.value,
                        brand: category?.name || draft.brand
                      });
                    }}
                  >
                    <option value="" disabled>Select a category</option>
                    {rangeCategories.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Origin</label>
                  <input className="form-control" value={draft.origin} onChange={(e) => setDraft({ ...draft, origin: e.target.value })} />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={draft.active}
                    onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
                  />
                  Published (live on the storefront)
                </label>
                {range === 'accessories' && (
                  <div className="form-group" style={{ marginTop: '1.25rem' }}>
                    <label className="form-label">Frequently Bought Together</label>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 0 }}>
                      Choose the catalogues that should offer this accessory beside their products. Some accessories suit cigars, some suit cigarettes, and some suit both.
                    </p>
                    {PRODUCT_RANGES.map((item) => (
                      <label key={item} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                        <input
                          type="checkbox"
                          checked={(draft.fbtRanges || []).includes(item)}
                          onChange={(e) => {
                            const current = draft.fbtRanges || [];
                            const next = e.target.checked
                              ? [...current, item]
                              : current.filter((value) => value !== item);
                            setDraft({ ...draft, fbtRanges: next });
                          }}
                        />
                        {rangeLabel(item)}
                      </label>
                    ))}
                  </div>
                )}
                {saveBar}
              </div>
            )}

            {editorTab === 'media' && (
              <div>
                {draft.imageUrl ? (
                  <img src={draft.imageUrl} alt="" style={{ width: '100%', maxHeight: '240px', objectFit: 'cover', borderRadius: '8px', marginBottom: '1rem' }} />
                ) : (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-subtle)', borderRadius: '8px', marginBottom: '1rem' }}>
                    No image yet
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Upload image</label>
                  <input
                    type="file"
                    accept="image/*"
                    className="form-control"
                    disabled={screenLocked || uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file);
                    }}
                  />
                  {uploading && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Uploading...</p>}
                </div>
                <div className="form-group">
                  <label className="form-label">Image URL</label>
                  <input
                    className="form-control"
                    placeholder="https://"
                    value={draft.imageUrl}
                    onChange={(e) => setDraft({ ...draft, imageUrl: e.target.value })}
                  />
                </div>
                {saveBar}
              </div>
            )}

            {editorTab === 'pricing' && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Price AUD ($)</label>
                    <input type="number" min={0} className="form-control" value={draft.price} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Stock quantity</label>
                    <input type="number" min={0} className="form-control" value={draft.stock} onChange={(e) => setDraft({ ...draft, stock: Number(e.target.value) })} />
                  </div>
                </div>
                {range === 'cigars' && (
                  <div>
                    <label className="form-label">Packaging options</label>
                    {(draft.packagingOptions || []).map((option, index) => (
                      <div key={`${option.id}-${index}`} style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.8fr 0.8fr auto', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <input className="form-control" value={option.name} onChange={(e) => updatePackaging(index, { name: e.target.value })} placeholder="Single Stick" />
                        <input className="form-control" type="number" step="0.1" value={option.priceMultiplier} onChange={(e) => updatePackaging(index, { priceMultiplier: Number(e.target.value) })} />
                        <input className="form-control" type="number" value={option.stock} onChange={(e) => updatePackaging(index, { stock: Number(e.target.value) })} />
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => setDraft((current) => ({
                            ...current,
                            packagingOptions: (current.packagingOptions || []).filter((_, itemIndex) => itemIndex !== index)
                          }))}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setDraft((current) => ({
                        ...current,
                        packagingOptions: [
                          ...(current.packagingOptions || []),
                          { id: `pack-${Date.now()}`, name: '', priceMultiplier: 1, stock: 0 }
                        ]
                      }))}
                    >
                      Add packaging option
                    </button>
                  </div>
                )}
                {saveBar}
              </div>
            )}

            {editorTab === 'story' && (
              <div>
                <div className="form-group">
                  <label className="form-label">Tagline</label>
                  <input className="form-control" value={draft.tagline || ''} onChange={(e) => setDraft({ ...draft, tagline: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Short description</label>
                  <textarea className="form-control" rows={3} value={draft.description || ''} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Extended description</label>
                  <textarea className="form-control" rows={4} value={draft.extendedDescription || ''} onChange={(e) => setDraft({ ...draft, extendedDescription: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Tasting notes (one per line)</label>
                  <textarea className="form-control" rows={4} value={notesText} onChange={(e) => setNotesText(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Brand story</label>
                  <textarea className="form-control" rows={4} value={draft.brandHistory || ''} onChange={(e) => setDraft({ ...draft, brandHistory: e.target.value })} />
                </div>
                {range === 'cigars' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    {([
                      ['vitola', 'Vitola'],
                      ['factoryName', 'Factory name'],
                      ['length', 'Length'],
                      ['strength', 'Strength'],
                      ['wrapper', 'Wrapper'],
                      ['filler', 'Filler'],
                      ['binder', 'Binder'],
                      ['smokingTime', 'Smoking time']
                    ] as const).map(([key, label]) => (
                      <div className="form-group" key={key}>
                        <label className="form-label">{label}</label>
                        <input
                          className="form-control"
                          value={(draft.specifications?.[key] as string) || ''}
                          onChange={(e) => setDraft({
                            ...draft,
                            specifications: { ...emptySpecs(), ...draft.specifications, [key]: e.target.value }
                          })}
                        />
                      </div>
                    ))}
                    <div className="form-group">
                      <label className="form-label">Ring gauge</label>
                      <input
                        type="number"
                        className="form-control"
                        value={draft.specifications?.ringGauge ?? ''}
                        onChange={(e) => setDraft({
                          ...draft,
                          specifications: {
                            ...emptySpecs(),
                            ...draft.specifications,
                            ringGauge: e.target.value === '' ? undefined : Number(e.target.value)
                          }
                        })}
                      />
                    </div>
                  </div>
                )}
                {saveBar}
              </div>
            )}

            {editorTab === 'danger' && (
              <div>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  Deleting a product removes it from the catalogue. This cannot be undone.
                </p>
                {!confirmDelete ? (
                  <button
                    type="button"
                    className="btn btn-danger"
                    disabled={screenLocked || !draft.id}
                    onClick={() => setConfirmDelete(true)}
                  >
                    Delete product
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button type="button" className="btn btn-danger" disabled={screenLocked} onClick={handleDeleteProduct}>
                      Confirm delete {draft.name}
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => setConfirmDelete(false)}>
                      Cancel
                    </button>
                  </div>
                )}
                {!draft.id && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.75rem' }}>
                    Save the product before it can be deleted.
                  </p>
                )}
                {saveBar}
              </div>
            )}
          </div>
        </div>
      )}

      {bulkOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px', position: 'relative' }}>
            <button
              onClick={() => setBulkOpen(false)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
            <h2 style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>Bulk Product Generator</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Paste a comma-separated list of product names. Items are created in {rangeLabel(range)} with stock 0.
            </p>
            <form onSubmit={handleBulkAdd}>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-control" value={bulkCategoryId} onChange={(e) => setBulkCategoryId(e.target.value)} required>
                  {rangeCategories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Comma-separated product names</label>
                <textarea className="form-control" rows={5} required value={bulkNames} onChange={(e) => setBulkNames(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setBulkOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={screenLocked}>Bulk add items</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {blockedCategory && (
        <div className="modal-overlay" onClick={() => setBlockedCategory(null)}>
          <div className="modal-content" style={{ maxWidth: '460px' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>Category still in use</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {blockedCategory.name} is attached to {blockedCategory.count} product{blockedCategory.count === 1 ? '' : 's'}. Move or delete those products before deleting this category.
            </p>
            <button className="btn btn-primary" style={{ marginTop: '1.25rem' }} onClick={() => setBlockedCategory(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};
