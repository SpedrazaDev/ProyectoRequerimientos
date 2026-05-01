// src/pages/PropertyManagement.jsx
// AHORA CON GALERÍA DE IMÁGENES (múltiples URLs)
import React, { useState, useEffect } from 'react';
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { Plus, Edit2, Trash2, Home, Image as ImageIcon, X } from 'lucide-react';
import './PropertyManagement.css';

const formatPrice = (price) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
    .format(price);

const EMPTY_FORM = {
  title:       '',
  location:    '',
  price:       '',
  type:        'Casa',
  bedrooms:    '',
  bathrooms:   '',
  area:        '',
  garage:      '0',
  description: '',
  images:      [''], // ← Ahora es array de URLs
  amenities:   '',
};

function PropertyManagement() {
  const [properties,  setProperties]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showForm,    setShowForm]    = useState(false);
  const [editingId,   setEditingId]   = useState(null);
  const [formData,    setFormData]    = useState(EMPTY_FORM);
  const [formErrors,  setFormErrors]  = useState({});
  const [saving,      setSaving]      = useState(false);
  const [deleteId,    setDeleteId]    = useState(null);

  useEffect(() => { loadProperties(); }, []);

  const loadProperties = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'properties'));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setProperties(data);
    } catch (err) {
      console.error('Error cargando propiedades:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInput = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]: '' }));
  };

  // Manejo de imágenes (array)
  const handleImageChange = (index, value) => {
    const newImages = [...formData.images];
    newImages[index] = value;
    setFormData(prev => ({ ...prev, images: newImages }));
  };

  const addImageField = () => {
    setFormData(prev => ({ ...prev, images: [...prev.images, ''] }));
  };

  const removeImageField = (index) => {
    if (formData.images.length === 1) return; // Siempre dejar al menos 1
    const newImages = formData.images.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, images: newImages }));
  };

  const validate = () => {
    const errs = {};
    if (!formData.title.trim())       errs.title    = 'El título es requerido.';
    if (!formData.location.trim())    errs.location = 'La ubicación es requerida.';
    if (!formData.price)              errs.price    = 'El precio es requerido.';
    else if (Number(formData.price) <= 0) errs.price = 'El precio debe ser mayor a 0.';
    if (!formData.bedrooms && formData.type !== 'Terreno')
      errs.bedrooms = 'Indica el número de habitaciones.';
    if (!formData.bathrooms && formData.type !== 'Terreno')
      errs.bathrooms = 'Indica el número de baños.';
    if (!formData.area)               errs.area     = 'El área es requerida.';
    if (!formData.description.trim()) errs.description = 'La descripción es requerida.';

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const openCreate = () => {
    setFormData(EMPTY_FORM);
    setFormErrors({});
    setEditingId(null);
    setShowForm(true);
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  const openEdit = (property) => {
    // Convertir imageUrl antigua a array si existe
    let images = [''];
    if (property.images && Array.isArray(property.images)) {
      images = property.images.filter(Boolean);
      if (images.length === 0) images = [''];
    } else if (property.imageUrl) {
      images = [property.imageUrl];
    }

    setFormData({
      title:       property.title       || '',
      location:    property.location    || '',
      price:       property.price?.toString() || '',
      type:        property.type        || 'Casa',
      bedrooms:    property.bedrooms?.toString() || '',
      bathrooms:   property.bathrooms?.toString() || '',
      area:        property.area?.toString() || '',
      garage:      property.garage?.toString() || '0',
      description: property.description || '',
      images:      images,
      amenities:   Array.isArray(property.amenities)
                     ? property.amenities.join(', ')
                     : (property.amenities || ''),
    });
    setFormErrors({});
    setEditingId(property.id);
    setShowForm(true);
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormErrors({});
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      // Filtrar imágenes vacías
      const validImages = formData.images.filter(img => img.trim());

      const dataToSave = {
        title:       formData.title.trim(),
        location:    formData.location.trim(),
        price:       Number(formData.price),
        type:        formData.type,
        bedrooms:    Number(formData.bedrooms) || 0,
        bathrooms:   Number(formData.bathrooms) || 0,
        area:        Number(formData.area),
        garage:      Number(formData.garage) || 0,
        description: formData.description.trim(),
        images:      validImages, // ← Array de URLs
        imageUrl:    validImages[0] || '', // Compatibilidad hacia atrás
        amenities:   formData.amenities
                       ? formData.amenities.split(',').map(a => a.trim()).filter(Boolean)
                       : [],
      };

      if (editingId) {
        await updateDoc(doc(db, 'properties', editingId), {
          ...dataToSave,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, 'properties'), {
          ...dataToSave,
          createdAt: serverTimestamp(),
        });
      }

      cancelForm();
      await loadProperties();
    } catch (err) {
      console.error('Error guardando propiedad:', err);
      alert('Error al guardar. Por favor intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteDoc(doc(db, 'properties', deleteId));
      setDeleteId(null);
      await loadProperties();
    } catch (err) {
      console.error('Error eliminando:', err);
      alert('Error al eliminar la propiedad.');
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-container">

        {/* Header */}
        <div className="pm-header">
          <div>
            <h1 className="dash-title">Gestión de Propiedades</h1>
            <p className="dash-sub">
              {properties.length} propiedad{properties.length !== 1 ? 'es' : ''} registrada{properties.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button className="btn btn-gold" onClick={showForm ? cancelForm : openCreate}>
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? 'Cancelar' : 'Nueva propiedad'}
          </button>
        </div>

        {/* Formulario */}
        {showForm && (
          <div className="pm-form-card">
            <h2 className="pm-form-title">
              {editingId ? <><Edit2 size={20} /> Editar propiedad</> : <><Home size={20} /> Nueva propiedad</>}
            </h2>

            <form onSubmit={handleSave} noValidate>
              <div className="pm-form-grid">

                <div className="form-group pm-col-2">
                  <label>Título *</label>
                  <input type="text" name="title" value={formData.title} onChange={handleInput}
                    className={`form-control ${formErrors.title ? 'form-control--error' : ''}`}
                    placeholder="Ej: Hermosa casa con jardín en Santa Ana"
                  />
                  {formErrors.title && <span className="field-error">{formErrors.title}</span>}
                </div>

                <div className="form-group pm-col-2">
                  <label>Ubicación *</label>
                  <input type="text" name="location" value={formData.location} onChange={handleInput}
                    className={`form-control ${formErrors.location ? 'form-control--error' : ''}`}
                    placeholder="Ej: Santa Ana, San José"
                  />
                  {formErrors.location && <span className="field-error">{formErrors.location}</span>}
                </div>

                <div className="form-group">
                  <label>Precio (USD) *</label>
                  <input type="number" name="price" value={formData.price} onChange={handleInput}
                    className={`form-control ${formErrors.price ? 'form-control--error' : ''}`}
                    placeholder="250000" min="0"
                  />
                  {formErrors.price && <span className="field-error">{formErrors.price}</span>}
                </div>

                <div className="form-group">
                  <label>Tipo *</label>
                  <select name="type" value={formData.type} onChange={handleInput} className="form-control">
                    <option value="Casa">🏠 Casa</option>
                    <option value="Apartamento">🏢 Apartamento</option>
                    <option value="Terreno">🌿 Terreno</option>
                    <option value="Comercial">🏪 Comercial</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Habitaciones {formData.type !== 'Terreno' && '*'}</label>
                  <input type="number" name="bedrooms" value={formData.bedrooms} onChange={handleInput}
                    className={`form-control ${formErrors.bedrooms ? 'form-control--error' : ''}`}
                    placeholder="3" min="0" disabled={formData.type === 'Terreno'}
                  />
                  {formErrors.bedrooms && <span className="field-error">{formErrors.bedrooms}</span>}
                </div>

                <div className="form-group">
                  <label>Baños {formData.type !== 'Terreno' && '*'}</label>
                  <input type="number" name="bathrooms" value={formData.bathrooms} onChange={handleInput}
                    className={`form-control ${formErrors.bathrooms ? 'form-control--error' : ''}`}
                    placeholder="2" min="0" disabled={formData.type === 'Terreno'}
                  />
                  {formErrors.bathrooms && <span className="field-error">{formErrors.bathrooms}</span>}
                </div>

                <div className="form-group">
                  <label>Área (m²) *</label>
                  <input type="number" name="area" value={formData.area} onChange={handleInput}
                    className={`form-control ${formErrors.area ? 'form-control--error' : ''}`}
                    placeholder="150" min="1"
                  />
                  {formErrors.area && <span className="field-error">{formErrors.area}</span>}
                </div>

                <div className="form-group">
                  <label>Garage (espacios)</label>
                  <input type="number" name="garage" value={formData.garage} onChange={handleInput}
                    className="form-control" placeholder="2" min="0"
                  />
                </div>

                {/* GALERÍA DE IMÁGENES */}
                <div className="form-group pm-col-2">
                  <label>
                    <ImageIcon size={14} style={{ display: 'inline', marginRight: '4px' }} />
                    Galería de imágenes (URLs)
                  </label>
                  {formData.images.map((img, index) => (
                    <div key={index} className="image-input-row">
                      <input
                        type="url"
                        value={img}
                        onChange={(e) => handleImageChange(index, e.target.value)}
                        className="form-control"
                        placeholder={`https://images.unsplash.com/... (Imagen ${index + 1})`}
                      />
                      {formData.images.length > 1 && (
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={() => removeImageField(index)}
                          style={{ flexShrink: 0 }}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={addImageField}
                    style={{ marginTop: '.5rem' }}
                  >
                    <Plus size={14} />
                    Agregar otra imagen
                  </button>
                  <small className="field-hint">
                    Puedes usar imágenes de Unsplash: https://unsplash.com
                  </small>
                  {/* Preview de imágenes */}
                  {formData.images.some(img => img.trim()) && (
                    <div className="images-preview">
                      {formData.images.filter(img => img.trim()).map((img, i) => (
                        <img
                          key={i}
                          src={img}
                          alt={`Preview ${i + 1}`}
                          className="image-preview-small"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="form-group pm-col-2">
                  <label>Amenidades (separadas por comas)</label>
                  <input type="text" name="amenities" value={formData.amenities} onChange={handleInput}
                    className="form-control"
                    placeholder="Piscina, Jardín, Seguridad 24h, Cuarto de servicio"
                  />
                </div>

                <div className="form-group pm-col-2">
                  <label>Descripción *</label>
                  <textarea name="description" value={formData.description} onChange={handleInput}
                    className={`form-control ${formErrors.description ? 'form-control--error' : ''}`}
                    rows={4}
                    placeholder="Describe la propiedad de forma atractiva y detallada..."
                  />
                  {formErrors.description && <span className="field-error">{formErrors.description}</span>}
                </div>
              </div>

              <div className="pm-form-actions">
                <button type="button" className="btn btn-outline" onClick={cancelForm}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-gold" disabled={saving}>
                  {saving ? '⏳ Guardando...' : (editingId ? '✓ Actualizar' : '✓ Crear propiedad')}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tabla */}
        {loading ? (
          <div className="loading-inline">
            <div className="spinner-sm" />
            <span>Cargando propiedades...</span>
          </div>
        ) : properties.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <Home size={48} strokeWidth={1.5} />
            </div>
            <h3>Sin propiedades</h3>
            <p>Agrega tu primera propiedad con el botón de arriba.</p>
          </div>
        ) : (
          <div className="pm-table-wrap">
            <table className="pm-table">
              <thead>
                <tr>
                  <th>Imagen</th>
                  <th>Propiedad</th>
                  <th>Tipo</th>
                  <th>Precio</th>
                  <th>Características</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {properties.map(p => {
                  const firstImage = Array.isArray(p.images) ? p.images[0] : (p.imageUrl || '');
                  return (
                    <tr key={p.id}>
                      <td>
                        <div className="table-thumbnail">
                          {firstImage ? (
                            <img src={firstImage} alt={p.title}
                              onError={(e) => { e.target.src = ''; e.target.style.display = 'none'; }}
                            />
                          ) : (
                            <span className="thumb-placeholder">
                              <Home size={20} />
                            </span>
                          )}
                        </div>
                      </td>

                      <td>
                        <div className="table-title-cell">
                          <strong>{p.title}</strong>
                          <small>📍 {p.location}</small>
                        </div>
                      </td>

                      <td>
                        <span className="type-chip">{p.type}</span>
                      </td>

                      <td className="price-cell">{formatPrice(p.price)}</td>

                      <td>
                        <div className="char-list">
                          {p.bedrooms > 0 && <span>🛏 {p.bedrooms}</span>}
                          {p.bathrooms > 0 && <span>🚿 {p.bathrooms}</span>}
                          <span>📐 {p.area} m²</span>
                        </div>
                      </td>

                      <td>
                        <div className="table-actions">
                          <button
                            className="btn btn-sm btn-dark"
                            onClick={() => openEdit(p)}
                            title="Editar"
                          >
                            <Edit2 size={14} />
                            Editar
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => setDeleteId(p.id)}
                            title="Eliminar"
                          >
                            <Trash2 size={14} />
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal */}
        {deleteId && (
          <div className="modal-overlay" onClick={() => setDeleteId(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal__icon">⚠️</div>
              <h3>¿Eliminar propiedad?</h3>
              <p>Esta acción es permanente y no se puede deshacer.</p>
              <div className="modal__actions">
                <button className="btn btn-outline" onClick={() => setDeleteId(null)}>
                  Cancelar
                </button>
                <button className="btn btn-danger" onClick={handleDelete}>
                  Sí, eliminar
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default PropertyManagement;
