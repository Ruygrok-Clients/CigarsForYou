import React, { useState, useEffect, useRef } from 'react';
import { addDoc, collection, deleteDoc, deleteField, doc, updateDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '../../firebase';
import type { BrandStory, BulkDiscountTier, CatalogCategory, Product, ProductRange, ProductSpecification } from '../../types';
import { useAdminContext } from './AdminContext';
import { useToast } from '../../components/Toast';
import { Modal } from '../../components/Modal';
import { PRODUCT_RANGES, rangeLabel, slugifyLabel } from '../../constants/productRanges';
import { DEFAULT_BULK_DISCOUNT_TIERS, isTobaccoRange, percentToMultiplier, savingsPercent } from '../../utils/bulkPricing';
import {
  deleteBrandStory,
  ensureDefaultCigarCategories,
  fetchBrandStories,
  fetchCatalogCategories,
  fetchProducts,
  productUsesCategory,
  saveBrandStory
} from '../../services/catalog';
import { Plus, Search, X, Layers, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

type EditorTab = 'identity' | 'media' | 'pricing' | 'story' | 'fbt' | 'danger';
type CatalogView = ProductRange | 'brandStories';

const EDITOR_TABS: { id: EditorTab; label: string }[] = [
  { id: 'identity', label: 'Identity & Category' },
  { id: 'media', label: 'Media & Imagery' },
  { id: 'pricing', label: 'Pricing & Stock' },
  { id: 'story', label: 'Description & Story' },
  { id: 'fbt', label: 'FBT' },
  { id: 'danger', label: 'Danger Zone' }
];

const SPEC_FIELDS: { key: keyof ProductSpecification; label: string }[] = [
  { key: 'vitola', label: 'Vitola Shape' },
  { key: 'factoryName', label: 'Factory name' },
  { key: 'length', label: 'Length' },
  { key: 'strength', label: 'Strength Profile' },
  { key: 'wrapper', label: 'Wrapper Leaf' },
  { key: 'filler', label: 'Filler' },
  { key: 'binder', label: 'Binder' },
  { key: 'smokingTime', label: 'Smoking Duration' }
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
  const product: Product = {
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
    shortDescription: '',
    extendedDescription: '',
    brandStoryId: '',
    brandStoryName: '',
    tastingNotes: [],
    fbtRanges: [],
    fbtCompanionIds: [],
    fbtDefaultIds: [],
    specifications: emptySpecs()
  };
  if (isTobaccoRange(range)) {
    product.bulkDiscountTiers = DEFAULT_BULK_DISCOUNT_TIERS.map((tier) => ({ ...tier }));
  }
  return product;
}

function blankStory(): BrandStory {
  return {
    name: '',
    title: '',
    factory: '',
    origin: '',
    founded: '',
    description: '',
    highlights: []
  };
}

function StringListEditor({
  label,
  hint,
  values,
  onChange,
  addLabel
}: {
  label: string;
  hint?: string;
  values: string[];
  onChange: (next: string[]) => void;
  addLabel: string;
}) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      {hint && (
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 0 }}>{hint}</p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {values.map((value, index) => (
          <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.5rem' }}>
            <input
              className="form-control"
              value={value}
              onChange={(e) => {
                const next = [...values];
                next[index] = e.target.value;
                onChange(next);
              }}
            />
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => onChange(values.filter((_, itemIndex) => itemIndex !== index))}
              aria-label="Remove"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        style={{ marginTop: '0.6rem' }}
        onClick={() => onChange([...values, ''])}
      >
        {addLabel}
      </button>
    </div>
  );
}

export const AdminProducts: React.FC = () => {
  const { screenLocked } = useAdminContext();
  const { showToast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [brandStories, setBrandStories] = useState<BrandStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<CatalogView>('cigars');
  const [searchQuery, setSearchQuery] = useState('');

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorTab, setEditorTab] = useState<EditorTab>('identity');
  const [draft, setDraft] = useState<Product>(blankProduct('cigars'));
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
  const tabStripRef = useRef<HTMLDivElement>(null);

  const [storyOpen, setStoryOpen] = useState(false);
  const [storyDraft, setStoryDraft] = useState<BrandStory>(blankStory());
  const [storySaving, setStorySaving] = useState(false);
  const [blockedStory, setBlockedStory] = useState<{ name: string; count: number } | null>(null);

  const range: ProductRange = view === 'brandStories' ? 'cigars' : view;

  const loadCatalog = async () => {
    setLoading(true);
    try {
      const productList = await fetchProducts();
      productList.sort((a, b) => a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name));
      setProducts(productList);
      try {
        await ensureDefaultCigarCategories(productList);
        const [categoryList, storyList] = await Promise.all([
          fetchCatalogCategories(),
          fetchBrandStories()
        ]);
        setCategories(categoryList);
        setBrandStories(storyList);
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
          const [categoryList, storyList] = await Promise.all([
            fetchCatalogCategories(),
            fetchBrandStories()
          ]);
          if (cancelled) return;
          setCategories(categoryList);
          setBrandStories(storyList);
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
          bulkDiscountTiers: isTobaccoRange(range)
            ? (product.bulkDiscountTiers && product.bulkDiscountTiers.length > 0
              ? product.bulkDiscountTiers.map((tier) => ({ ...tier }))
              : DEFAULT_BULK_DISCOUNT_TIERS.map((tier) => ({ ...tier })))
            : undefined,
          tastingNotes: product.tastingNotes || [],
          shortDescription: product.shortDescription || '',
          extendedDescription: product.extendedDescription || '',
          brandStoryId: product.brandStoryId || '',
          brandStoryName: product.brandStoryName || ''
        }
      : blankProduct(range, rangeCategories[0]);
    const matched = rangeCategories.find((category) => category.id === next.catalogCategoryId)
      || rangeCategories.find((category) => category.name.toLowerCase() === (next.brand || '').toLowerCase());
    if (matched) {
      next.catalogCategoryId = matched.id;
      next.brand = matched.name;
    }
    setDraft(next);
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
    if (!(draft.extendedDescription || '').trim()) {
      setEditorTab('story');
      showToast('Extended description is required', 'error');
      return null;
    }
    const notes = (draft.tastingNotes || []).map((line) => line.trim()).filter(Boolean);
    const specs = draft.specifications || emptySpecs();
    const tobacco = isTobaccoRange(range);
    const tiers = tobacco
      ? (draft.bulkDiscountTiers || [])
          .filter((tier) => tier.minQuantity > 0)
          .map((tier) => ({
            id: tier.id || `qty${tier.minQuantity}`,
            minQuantity: Math.max(1, Math.round(Number(tier.minQuantity) || 1)),
            unitPriceMultiplier: Math.min(1, Math.max(0, Number(tier.unitPriceMultiplier) || 1))
          }))
          .sort((a, b) => a.minQuantity - b.minQuantity)
      : undefined;
    const linked = brandStories.find((story) => story.id === draft.brandStoryId);

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
      shortDescription: (draft.shortDescription || '').trim(),
      extendedDescription: (draft.extendedDescription || '').trim(),
      brandStoryId: linked?.id || '',
      brandStoryName: linked?.name || '',
      tastingNotes: notes,
      fbtRanges: range === 'accessories' ? (draft.fbtRanges || []) : [],
      fbtStat: Number.isFinite(Number(draft.fbtStat)) ? Math.max(0, Math.min(100, Math.round(Number(draft.fbtStat)))) : undefined,
      fbtCompanionIds: (draft.fbtCompanionIds || []).filter(Boolean).slice(0, 3),
      fbtDefaultIds: (draft.fbtDefaultIds || []).filter((id) => id && id !== draft.id),
      specifications: range === 'cigars'
        ? Object.fromEntries(Object.entries(specs).filter(([, value]) => value !== undefined && value !== ''))
        : {},
      ...(tobacco && tiers ? { bulkDiscountTiers: tiers } : {})
    };
  };

  const stripProductFromFbtLists = async (productId: string) => {
    const affected = products.filter((product) => (
      product.id
      && product.id !== productId
      && (
        (product.fbtCompanionIds || []).includes(productId)
        || (product.fbtDefaultIds || []).includes(productId)
      )
    ));
    await Promise.all(affected.map((product) => updateDoc(doc(db, 'products', product.id!), {
      fbtCompanionIds: (product.fbtCompanionIds || []).filter((id) => id !== productId),
      fbtDefaultIds: (product.fbtDefaultIds || []).filter((id) => id !== productId)
    })));
  };

  const handleSaveProduct = async () => {
    if (screenLocked || saving) return;
    const payload = buildPayload();
    if (!payload) return;
    setSaving(true);
    try {
      const storyFields = payload.brandStoryId
        ? { brandStoryId: payload.brandStoryId, brandStoryName: payload.brandStoryName || '' }
        : { brandStoryId: deleteField(), brandStoryName: deleteField() };
      if (draft.id) {
        await updateDoc(doc(db, 'products', draft.id), {
          ...(payload as unknown as Record<string, unknown>),
          ...storyFields,
          packagingOptions: deleteField(),
          description: deleteField(),
          tagline: deleteField(),
          brandHistory: deleteField(),
          ...(isTobaccoRange(range) ? {} : { bulkDiscountTiers: deleteField() }),
          ...(payload.fbtStat === undefined ? { fbtStat: deleteField() } : {})
        });
        if (!payload.active) await stripProductFromFbtLists(draft.id);
        showToast(`Updated product ${payload.name}`);
      } else {
        const createPayload = { ...payload } as Record<string, unknown>;
        if (payload.fbtStat === undefined) delete createPayload.fbtStat;
        if (!payload.brandStoryId) {
          delete createPayload.brandStoryId;
          delete createPayload.brandStoryName;
        }
        await addDoc(collection(db, 'products'), createPayload);
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
      await stripProductFromFbtLists(draft.id);
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
          extendedDescription: 'Details coming soon.'
        };
        const createPayload = { ...payload } as Record<string, unknown>;
        delete createPayload.brandStoryId;
        delete createPayload.brandStoryName;
        await addDoc(collection(db, 'products'), createPayload);
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

  const updateTier = (index: number, patch: Partial<BulkDiscountTier>) => {
    setDraft((current) => {
      const bulkDiscountTiers = [...(current.bulkDiscountTiers || [])];
      bulkDiscountTiers[index] = { ...bulkDiscountTiers[index], ...patch };
      return { ...current, bulkDiscountTiers };
    });
  };

  const openStoryEditor = (story: BrandStory | null) => {
    setStoryDraft(story ? { ...story, highlights: [...(story.highlights || [])] } : blankStory());
    setStoryOpen(true);
  };

  const handleSaveStory = async () => {
    if (screenLocked || storySaving) return;
    if (!storyDraft.name.trim() || !storyDraft.description.trim()) {
      showToast('A brand name and description are required', 'error');
      return;
    }
    setStorySaving(true);
    try {
      const id = await saveBrandStory(storyDraft);
      const name = storyDraft.name.trim();
      const linked = products.filter((product) => product.brandStoryId === (storyDraft.id || id));
      if (storyDraft.id) {
        await Promise.all(linked.map((product) => {
          if (!product.id) return Promise.resolve();
          return updateDoc(doc(db, 'products', product.id), { brandStoryName: name });
        }));
      }
      showToast(storyDraft.id ? `Updated ${name}` : `Created ${name}`);
      setStoryOpen(false);
      await loadCatalog();
    } catch (err) {
      console.error('Error saving brand story:', err);
      showToast('Failed to save brand story', 'error');
    } finally {
      setStorySaving(false);
    }
  };

  const handleDeleteStory = async (story: BrandStory) => {
    if (screenLocked || !story.id) return;
    const linked = products.filter((product) => product.brandStoryId === story.id);
    if (linked.length > 0) {
      setBlockedStory({ name: story.name, count: linked.length });
      return;
    }
    try {
      await deleteBrandStory(story.id);
      showToast(`Deleted ${story.name}`);
      setBrandStories(await fetchBrandStories());
    } catch (err) {
      console.error('Error deleting brand story:', err);
      showToast('Failed to delete brand story', 'error');
    }
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
        {view === 'brandStories' ? (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => openStoryEditor(null)}
            disabled={screenLocked}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Plus size={16} /> Add Brand Story
          </button>
        ) : (
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
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {PRODUCT_RANGES.map((item) => (
          <button
            key={item}
            className={`btn btn-sm ${view === item ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => {
              setView(item);
              setSearchQuery('');
            }}
          >
            {rangeLabel(item)}
          </button>
        ))}
        <span aria-hidden="true" style={{ width: '1px', alignSelf: 'stretch', minHeight: '2rem', background: 'var(--border-color)', margin: '0 0.35rem' }} />
        <button
          className={`btn btn-sm ${view === 'brandStories' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setView('brandStories')}
        >
          Brand Stories
        </button>
      </div>

      {view !== 'brandStories' && (
        <>
          <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
            <div style={{ marginBottom: '0.85rem' }}>
              <h2 style={{ fontSize: '1.15rem', marginBottom: '0.25rem' }}>{rangeLabel(range)} categories</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>
                Brands or product types, such as lighters. Rename and delete sit on each tile.
              </p>
            </div>
            {rangeCategories.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: '0 0 1rem' }}>
                No categories yet. Add one before creating products in this range.
              </p>
            ) : (
              <div className="admin-category-grid" style={{ marginBottom: '1rem' }}>
                {rangeCategories.map((category) => (
                  <div key={category.id} className="admin-category-tile">
                    {editingCategoryId === category.id ? (
                      <div style={{ display: 'flex', gap: '0.4rem', width: '100%', flexWrap: 'wrap' }}>
                        <input
                          className="form-control"
                          value={editingCategoryName}
                          onChange={(e) => setEditingCategoryName(e.target.value)}
                          style={{ flex: '1 1 140px', minWidth: 0 }}
                        />
                        <button className="btn btn-primary btn-sm" disabled={screenLocked} onClick={() => handleRenameCategory(category)}>Save</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => setEditingCategoryId(null)}>Cancel</button>
                      </div>
                    ) : (
                      <>
                        <strong>{category.name}</strong>
                        <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
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
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
            <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
              <input
                className="form-control"
                placeholder="New category name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                style={{ flex: 1 }}
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
        </>
      )}

      {loading ? (
        <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>Loading product catalog...</div>
      ) : view === 'brandStories' ? (
        <div className="card" style={{ padding: '1rem' }}>
          {brandStories.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', margin: '0.5rem' }}>No brand stories yet.</p>
          ) : (
            <div className="admin-category-grid">
              {brandStories.map((story) => {
                const linkedCount = products.filter((product) => product.brandStoryId === story.id).length;
                return (
                  <div key={story.id} className="admin-category-tile" style={{ alignItems: 'flex-start', flexDirection: 'column' }}>
                    <div style={{ width: '100%' }}>
                      <strong style={{ display: 'block' }}>{story.name}</strong>
                      <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                        {story.title || 'Untitled'} · {linkedCount} linked product{linkedCount === 1 ? '' : 's'}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button className="btn btn-secondary btn-sm" disabled={screenLocked} onClick={() => openStoryEditor(story)}>Edit</button>
                      <button className="btn btn-danger btn-sm" disabled={screenLocked} onClick={() => handleDeleteStory(story)}>Delete</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-product-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
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
                      className="admin-product-row"
                      onClick={() => openEditor(product)}
                      style={{ borderBottom: '1px solid var(--border-subtle)' }}
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
        <Modal>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '1.25rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                aria-label="Scroll tabs left"
                onClick={() => tabStripRef.current?.scrollBy({ left: -180, behavior: 'smooth' })}
              >
                <ChevronLeft size={16} />
              </button>
              <div
                ref={tabStripRef}
                style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', flex: 1, scrollbarWidth: 'thin' }}
              >
                {EDITOR_TABS.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    className={`btn btn-sm ${editorTab === tab.id ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flexShrink: 0 }}
                    onClick={() => setEditorTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                aria-label="Scroll tabs right"
                onClick={() => tabStripRef.current?.scrollBy({ left: 180, behavior: 'smooth' })}
              >
                <ChevronRight size={16} />
              </button>
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
                {isTobaccoRange(range) && (
                  <div>
                    <label className="form-label">Bulk discount tiers</label>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 0 }}>
                      Cigars and cigarettes only. Set a minimum quantity and the percent off the base unit price. Once that quantity is reached, every unit uses that discounted rate.
                    </p>
                    {(draft.bulkDiscountTiers || []).map((tier, index) => (
                      <div key={`${tier.id}-${index}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.5rem', marginBottom: '0.65rem', alignItems: 'end' }}>
                        <div>
                          <label className="form-label">Quantity</label>
                          <input
                            className="form-control"
                            type="number"
                            min={1}
                            value={tier.minQuantity}
                            onChange={(e) => {
                              const minQuantity = Math.max(1, Number(e.target.value) || 1);
                              updateTier(index, { minQuantity, id: `qty${minQuantity}` });
                            }}
                          />
                        </div>
                        <div>
                          <label className="form-label">Discount</label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                            <input
                              className="form-control"
                              type="number"
                              min={0}
                              max={100}
                              step="1"
                              value={savingsPercent(tier)}
                              onChange={(e) => updateTier(index, { unitPriceMultiplier: percentToMultiplier(Number(e.target.value) || 0) })}
                            />
                            <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>%</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => setDraft((current) => ({
                            ...current,
                            bulkDiscountTiers: (current.bulkDiscountTiers || []).filter((_, itemIndex) => itemIndex !== index)
                          }))}
                          aria-label="Remove tier"
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
                        bulkDiscountTiers: [
                          ...(current.bulkDiscountTiers || []),
                          { id: `qty-${Date.now()}`, minQuantity: 1, unitPriceMultiplier: 1 }
                        ]
                      }))}
                    >
                      Add bulk tier
                    </button>
                  </div>
                )}
                {saveBar}
              </div>
            )}

            {editorTab === 'story' && (
              <div>
                <div className="form-group">
                  <label className="form-label">Short description</label>
                  <input
                    className="form-control"
                    value={draft.shortDescription || ''}
                    onChange={(e) => setDraft({ ...draft, shortDescription: e.target.value })}
                    placeholder="Cuban Hand-Rolled Vitola • Medium to Full Body"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Extended description</label>
                  <textarea
                    className="form-control"
                    rows={5}
                    required
                    value={draft.extendedDescription || ''}
                    onChange={(e) => setDraft({ ...draft, extendedDescription: e.target.value })}
                  />
                </div>
                <StringListEditor
                  label="Tasting notes"
                  hint="Each note is its own line on the product page."
                  values={draft.tastingNotes || []}
                  onChange={(tastingNotes) => setDraft({ ...draft, tastingNotes })}
                  addLabel="Add tasting note"
                />
                {range === 'cigars' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    {SPEC_FIELDS.map(({ key, label }) => (
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
                      <label className="form-label">Ring Gauge</label>
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
                <div className="form-group" style={{ marginTop: '0.5rem' }}>
                  <label className="form-label">Brand story</label>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 0 }}>
                    Optional. Leave this blank and the product page skips the brand heritage section.
                  </p>
                  <select
                    className="form-control"
                    value={draft.brandStoryId || ''}
                    onChange={(e) => {
                      const story = brandStories.find((item) => item.id === e.target.value);
                      setDraft({
                        ...draft,
                        brandStoryId: story?.id || '',
                        brandStoryName: story?.name || ''
                      });
                    }}
                  >
                    <option value="">None</option>
                    {brandStories.map((story) => (
                      <option key={story.id} value={story.id}>{story.name}</option>
                    ))}
                  </select>
                </div>
                {saveBar}
              </div>
            )}

            {editorTab === 'fbt' && (
              <div>
                {draft.id && (
                  <p style={{ color: 'var(--text-secondary)', marginTop: 0 }}>
                    {products.filter((product) => product.id !== draft.id && (product.fbtCompanionIds || []).includes(draft.id || '')).length} other product{products.filter((product) => product.id !== draft.id && (product.fbtCompanionIds || []).includes(draft.id || '')).length === 1 ? '' : 's'} include this product in their 3 Frequently Bought Together options.
                  </p>
                )}
                <div className="form-group">
                  <label className="form-label">Frequently Bought Together % Stat</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', maxWidth: '180px' }}>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      className="form-control"
                      value={draft.fbtStat ?? ''}
                      onChange={(e) => setDraft({
                        ...draft,
                        fbtStat: e.target.value === '' ? undefined : Number(e.target.value)
                      })}
                    />
                    <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>%</span>
                  </div>
                </div>
                <label className="form-label">Frequently Bought Together</label>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 0 }}>
                  Up to three products shown with this one. Stock does not matter.
                </p>
                {[0, 1, 2].map((slot) => (
                  <div className="form-group" key={slot}>
                    <select
                      className="form-control"
                      value={(draft.fbtCompanionIds || [])[slot] || ''}
                      onChange={(e) => {
                        const next = [...(draft.fbtCompanionIds || [])];
                        while (next.length < 3) next.push('');
                        next[slot] = e.target.value;
                        setDraft({ ...draft, fbtCompanionIds: next });
                      }}
                    >
                      <option value="">None</option>
                      {products.filter((product) => product.id && product.id !== draft.id).map((product) => (
                        <option key={product.id} value={product.id}>{product.brand} — {product.name}</option>
                      ))}
                    </select>
                  </div>
                ))}
                <label className="form-label">Default matches</label>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 0 }}>
                  Used when order history cannot fill all three companions. Each open slot is chosen at random from this list.
                </p>
                {(draft.fbtDefaultIds || []).map((value, index) => (
                  <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <select
                      className="form-control"
                      value={value}
                      onChange={(e) => {
                        const next = [...(draft.fbtDefaultIds || [])];
                        next[index] = e.target.value;
                        setDraft({ ...draft, fbtDefaultIds: next });
                      }}
                    >
                      <option value="">Select a product</option>
                      {products.filter((product) => product.id && product.id !== draft.id).map((product) => (
                        <option key={product.id} value={product.id}>{product.brand} — {product.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => setDraft({
                        ...draft,
                        fbtDefaultIds: (draft.fbtDefaultIds || []).filter((_, itemIndex) => itemIndex !== index)
                      })}
                      aria-label="Remove default match"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setDraft({ ...draft, fbtDefaultIds: [...(draft.fbtDefaultIds || []), ''] })}
                >
                  Add default match
                </button>
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
        </Modal>
      )}

      {bulkOpen && (
        <Modal>
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
        </Modal>
      )}

      {blockedCategory && (
        <Modal onClick={() => setBlockedCategory(null)}>
          <div className="modal-content" style={{ maxWidth: '460px' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>Category still in use</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {blockedCategory.name} is attached to {blockedCategory.count} product{blockedCategory.count === 1 ? '' : 's'}. Move or delete those products before deleting this category.
            </p>
            <button className="btn btn-primary" style={{ marginTop: '1.25rem' }} onClick={() => setBlockedCategory(null)}>Close</button>
          </div>
        </Modal>
      )}

      {storyOpen && (
        <Modal>
          <div className="modal-content" style={{ maxWidth: '720px', width: '100%', position: 'relative' }}>
            <button
              onClick={() => setStoryOpen(false)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
            <h2 style={{ fontSize: '1.6rem', marginBottom: '1rem' }}>
              {storyDraft.id ? storyDraft.name || 'Edit brand story' : 'Add brand story'}
            </h2>
            <div className="form-group">
              <label className="form-label">Name</label>
              <input className="form-control" value={storyDraft.name} onChange={(e) => setStoryDraft({ ...storyDraft, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Title</label>
              <input className="form-control" value={storyDraft.title} onChange={(e) => setStoryDraft({ ...storyDraft, title: e.target.value })} placeholder="Cohiba: The Apex of Habanos Mastery" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Factory</label>
                <input className="form-control" value={storyDraft.factory} onChange={(e) => setStoryDraft({ ...storyDraft, factory: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Origin</label>
                <input className="form-control" value={storyDraft.origin} onChange={(e) => setStoryDraft({ ...storyDraft, origin: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Founded</label>
                <input className="form-control" value={storyDraft.founded} onChange={(e) => setStoryDraft({ ...storyDraft, founded: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-control" rows={6} value={storyDraft.description} onChange={(e) => setStoryDraft({ ...storyDraft, description: e.target.value })} />
            </div>
            <StringListEditor
              label="Highlights"
              values={storyDraft.highlights}
              onChange={(highlights) => setStoryDraft({ ...storyDraft, highlights })}
              addLabel="Add highlight"
            />
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setStoryOpen(false)}>Cancel</button>
              <button type="button" className="btn btn-primary" style={{ flex: 2 }} disabled={screenLocked || storySaving} onClick={handleSaveStory}>
                {storySaving ? 'Saving...' : 'Save brand story'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {blockedStory && (
        <Modal onClick={() => setBlockedStory(null)}>
          <div className="modal-content" style={{ maxWidth: '460px' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>Brand story still in use</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {blockedStory.name} is linked to {blockedStory.count} product{blockedStory.count === 1 ? '' : 's'}. Unlink those products before deleting this brand story.
            </p>
            <button className="btn btn-primary" style={{ marginTop: '1.25rem' }} onClick={() => setBlockedStory(null)}>Close</button>
          </div>
        </Modal>
      )}
    </div>
  );
};
