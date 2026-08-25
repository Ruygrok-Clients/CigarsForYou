import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import type { Product } from '../../types';
import { useAdminContext } from './AdminContext';
import { useToast } from '../../components/Toast';
import { CIGAR_BRANDS } from '../../components/Navbar';
import { 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  X, 
  Layers
} from 'lucide-react';

export const AdminProducts: React.FC = () => {
  const { screenLocked } = useAdminContext();
  const { showToast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('all');

  // Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkNamesText, setBulkNamesText] = useState('');

  // Form State for Add/Edit
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('Cohiba');
  const [price, setPrice] = useState(100);
  const [stock, setStock] = useState(100); // Default stock = 100 per brief requirement
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'cigars' | 'cigarettes'>('cigars');
  const [origin, setOrigin] = useState('Cuban');
  const [active, setActive] = useState(true);
  const [imageUrl, setImageUrl] = useState('');

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'products'));
      const list: Product[] = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() } as Product);
      });
      list.sort((a, b) => a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name));
      setProducts(list);
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setName('');
    setBrand('Cohiba');
    setPrice(100);
    setStock(100); // Default 100 stock
    setDescription('');
    setCategory('cigars');
    setOrigin('Cuban');
    setActive(true);
    setImageUrl('');
    setIsEditModalOpen(true);
  };

  const handleOpenEditModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setBrand(p.brand);
    setPrice(p.price);
    setStock(p.stock);
    setDescription(p.description || '');
    setCategory(p.category || 'cigars');
    setOrigin(p.origin || 'Cuban');
    setActive(p.active);
    setImageUrl(p.imageUrl || '');
    setIsEditModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (screenLocked) return;

    const slug = `${brand.toLowerCase()}-${name.toLowerCase()}`.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const productPayload: Product = {
      name: name.trim(),
      brand: brand.trim(),
      slug,
      price: Number(price),
      currency: 'AUD',
      stock: Number(stock),
      imageUrl: imageUrl.trim(),
      category,
      origin: origin.trim(),
      active,
      description: description.trim()
    };

    try {
      if (editingProduct && editingProduct.id) {
        await updateDoc(doc(db, 'products', editingProduct.id), productPayload as any);
        showToast(`Updated product ${productPayload.name}`);
      } else {
        await addDoc(collection(db, 'products'), productPayload);
        showToast(`Created new product ${productPayload.name} (Initial stock 100)`);
      }
      setIsEditModalOpen(false);
      fetchProducts();
    } catch (err) {
      console.error('Error saving product:', err);
      showToast('Failed to save product', 'error');
    }
  };

  // Inline Editing direct in table
  const handleInlineUpdate = async (productId: string, field: 'stock' | 'price', value: number) => {
    if (screenLocked) return;
    try {
      const pRef = doc(db, 'products', productId);
      await updateDoc(pRef, { [field]: value });
      setProducts(prev => prev.map(p => p.id === productId ? { ...p, [field]: value } : p));
      showToast(`Updated ${field} to ${value}`);
    } catch (err) {
      console.error('Inline update error:', err);
    }
  };

  const handleDeleteProduct = async (productId: string, productName: string) => {
    if (screenLocked) return;
    if (!window.confirm(`Delete ${productName} permanently?`)) return;
    try {
      await deleteDoc(doc(db, 'products', productId));
      setProducts(prev => prev.filter(p => p.id !== productId));
      showToast(`Deleted ${productName}`);
    } catch (err) {
      console.error('Error deleting product:', err);
    }
  };

  // Bulk-add Tool Handler
  const handleBulkAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (screenLocked || !bulkNamesText.trim()) return;

    const names = bulkNamesText.split(',').map(n => n.trim()).filter(Boolean);
    if (names.length === 0) return;

    try {
      for (const itemName of names) {
        const slug = `cigar-${itemName.toLowerCase()}`.replace(/[^a-z0-9]+/g, '-');
        await addDoc(collection(db, 'products'), {
          name: itemName,
          brand: 'Unassigned',
          slug,
          price: 50,
          currency: 'AUD',
          stock: 0, // Created at 0 stock per requirements
          imageUrl: '',
          category: 'cigars',
          origin: 'Cuban',
          active: true,
          description: 'Bulk added product pending brand assignment'
        });
      }
      showToast(`Bulk added ${names.length} product(s) at 0 stock`);
      setIsBulkModalOpen(false);
      setBulkNamesText('');
      fetchProducts();
    } catch (err) {
      console.error('Bulk add error:', err);
      showToast('Failed to bulk add products', 'error');
    }
  };

  const filteredProducts = products.filter(p => {
    if (selectedBrand !== 'all' && p.brand.toLowerCase() !== selectedBrand.toLowerCase()) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span className="badge badge-gold" style={{ marginBottom: '0.4rem' }}>
            Catalog & Inventory Control
          </span>
          <h1 style={{ fontSize: '2.2rem', color: '#ffffff' }}>Products & Stock</h1>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => setIsBulkModalOpen(true)}
            disabled={screenLocked}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Layers size={16} /> Bulk-Add Tool
          </button>

          <button 
            className="btn btn-primary btn-sm"
            onClick={handleOpenAddModal}
            disabled={screenLocked}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Plus size={16} /> Add Product
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: '360px' }}>
            <Search size={18} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-control"
              style={{ paddingLeft: '2.5rem' }}
              placeholder="Search product or brand..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto' }}>
            <button
              className={`btn btn-sm ${selectedBrand === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedBrand('all')}
            >
              All ({products.length})
            </button>
            {CIGAR_BRANDS.map(b => (
              <button
                key={b.slug}
                className={`btn btn-sm ${selectedBrand.toLowerCase() === b.name.toLowerCase() ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setSelectedBrand(b.name)}
              >
                {b.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Products Table with Inline Editing */}
      {loading ? (
        <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>Loading product catalog...</div>
      ) : (
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '0.75rem' }}>Brand</th>
                  <th style={{ padding: '0.75rem' }}>Product Name</th>
                  <th style={{ padding: '0.75rem' }}>Price (AUD)</th>
                  <th style={{ padding: '0.75rem' }}>Stock Qty (Inline Edit)</th>
                  <th style={{ padding: '0.75rem' }}>Stock Status</th>
                  <th style={{ padding: '0.75rem' }}>Category</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(p => {
                  const isOut = p.stock <= 0;
                  const isLow = p.stock > 0 && p.stock < 10;
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 600, color: 'var(--accent-gold)' }}>
                        {p.brand}
                      </td>
                      <td style={{ padding: '0.75rem', color: '#ffffff', fontWeight: 600 }}>
                        {p.name}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <input
                          type="number"
                          className="form-control"
                          disabled={screenLocked}
                          style={{ width: '100px', padding: '0.35rem 0.5rem', fontSize: '0.85rem' }}
                          value={p.price}
                          onChange={(e) => handleInlineUpdate(p.id!, 'price', Number(e.target.value))}
                        />
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <input
                          type="number"
                          className="form-control"
                          disabled={screenLocked}
                          style={{ width: '100px', padding: '0.35rem 0.5rem', fontSize: '0.85rem', borderColor: isOut ? 'var(--accent-ruby)' : isLow ? 'orange' : 'var(--border-subtle)' }}
                          value={p.stock}
                          onChange={(e) => handleInlineUpdate(p.id!, 'stock', Number(e.target.value))}
                        />
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        {isOut ? (
                          <span className="badge badge-red">Out of Stock</span>
                        ) : isLow ? (
                          <span className="badge badge-amber">Low Stock ({p.stock})</span>
                        ) : (
                          <span className="badge badge-green">In Stock ({p.stock})</span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        {p.category === 'cigarettes' ? (
                          <span className="badge badge-amber">Cigarettes (Coming Soon)</span>
                        ) : (
                          <span className="badge badge-gray">Cuban Cigar</span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            title="Edit Full Details"
                            onClick={() => handleOpenEditModal(p)}
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            title="Delete Product"
                            disabled={screenLocked}
                            onClick={() => handleDeleteProduct(p.id!, p.name)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isEditModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '580px', position: 'relative' }}>
            <button
              onClick={() => setIsEditModalOpen(false)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', color: 'var(--text-muted)' }}
            >
              <X size={20} />
            </button>

            <h2 style={{ fontSize: '1.8rem', color: '#ffffff', marginBottom: '1.5rem' }}>
              {editingProduct ? 'Edit Product' : 'Add New Product (Default Stock 100)'}
            </h2>

            <form onSubmit={handleSaveProduct}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Brand Name</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="Cohiba, Montecristo..."
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Product Title</label>
                  <input
                    type="text"
                    required
                    className="form-control"
                    placeholder="Siglo VI, Serie D No.4..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Price AUD ($)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    className="form-control"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Stock Quantity (Default 100)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    className="form-control"
                    value={stock}
                    onChange={(e) => setStock(Number(e.target.value))}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="form-control"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                  >
                    <option value="cigars">Cuban Cigars</option>
                    <option value="cigarettes">Cigarettes (Coming Soon)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Origin</label>
                  <input
                    type="text"
                    className="form-control"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description / Tasting Notes</label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="Rich cedar aromas, smooth draw..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsEditModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={screenLocked}>
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Add Tool Modal */}
      {isBulkModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px', position: 'relative' }}>
            <button
              onClick={() => setIsBulkModalOpen(false)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', color: 'var(--text-muted)' }}
            >
              <X size={20} />
            </button>

            <h2 style={{ fontSize: '1.8rem', color: '#ffffff', marginBottom: '0.5rem' }}>
              Bulk Product Generator
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Paste a comma-separated list of product names below. Items will be created with an initial stock of <strong>0</strong> so you can assign brands and stock quantities later.
            </p>

            <form onSubmit={handleBulkAdd}>
              <div className="form-group">
                <label className="form-label">Comma-Separated Product Names</label>
                <textarea
                  className="form-control"
                  rows={5}
                  required
                  placeholder="Robustos Extra, Linea 1935, Short Churchills, Petit Edmundo..."
                  value={bulkNamesText}
                  onChange={(e) => setBulkNamesText(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setIsBulkModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={screenLocked}>
                  Bulk Add Items (at 0 stock)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
