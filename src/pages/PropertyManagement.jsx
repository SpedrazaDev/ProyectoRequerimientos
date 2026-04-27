// src/pages/PropertyManagement.jsx
// ─────────────────────────────────────────────────────────────────────
//  Gestión CRUD de propiedades para el admin.
//  • Crear, editar y eliminar propiedades
//  • Formulario con validación
//  • Tabla con todas las propiedades
// ─────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import './PropertyManagement.css';

// Formateador de precios
const formatPrice = (price) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
    .format(price);

// Formulario vacío
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
  imageUrl:    '',
  amenities:   '', // cadena separada por comas
};

// Campos numéricos que se convierten al guardar
const NUM_FIELDS = ['price', 'bedrooms', 'bathrooms', 'area', 'garage'];

function PropertyManagement() {
  const [properties,  setProperties]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showForm,    setShowForm]    = useState(false);
  const [editingId,   setEditingId]   = useState(null); // null = creando
  const [formData,    setFormData]    = useState(EMPTY_FORM);
  const [formErrors,  setFormErrors]  = useState({});
  const [saving,      setSaving]      = useState(false);
  const [deleteId,    setDeleteId]    = useState(null); // para modal de confirmación

  // ── Cargar propiedades ──
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

  // ── Manejo del formulario ──
  const handleInput = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]: '' }));
  };

  // Validar antes de guardar
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

  // Abrir formulario para crear
  const openCreate = () => {
    setFormData(EMPTY_FORM);
    setFormErrors({});
    setEditingId(null);
    setShowForm(true);
    // Hacer scroll hacia arriba
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  // Abrir formulario para editar
  const openEdit = (property) => {
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
      imageUrl:    property.imageUrl    || '',
      amenities:   Array.isArray(property.amenities)
                     ? property.amenities.join(', ')
                     : (property.amenities || ''),
    });
    setFormErrors({});
    setEditingId(property.id);
    setShowForm(true);
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  // Cancelar formulario
  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormErrors({});
  };

  // Guardar (crear o actualizar)
  const handleSave = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      // Preparar datos convirtiendo campos numéricos
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
        imageUrl:    formData.imageUrl.trim(),
        // Convertir amenidades de string a array
        amenities:   formData.amenities
                       ? formData.amenities.split(',').map(a => a.trim()).filter(Boolean)
                       : [],
      };

      if (editingId) {
        // Actualizar documento existente
        await updateDoc(doc(db, 'properties', editingId), {
          ...dataToSave,
          updatedAt: serverTimestamp(),
        });
      } else {
        // Crear nuevo documento
        await addDoc(collection(db, 'properties'), {
          ...dataToSave,
          createdAt: serverTimestamp(),
        });
      }

      cancelForm();
      await loadProperties(); // recargar la lista
    } catch (err) {
      console.error('Error guardando propiedad:', err);
      alert('Error al guardar. Por favor intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  // Eliminar propiedad
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

  // ── Renderizado ──
  return (
    <div className="admin-page">
      <div className="admin-container">

        {/* ── Header ── */}
        <div className="pm-header">
          <div>
            <h1 className="dash-title">Gestión de Propiedades</h1>
            <p className="dash-sub">
              {properties.length} propiedad{properties.length !== 1 ? 'es' : ''} registrada{properties.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button className="btn btn-gold" onClick={showForm ? cancelForm : openCreate}>
            {showForm ? '✕ Cancelar' : '+ Nueva propiedad'}
          </button>
        </div>

        {/* ── Formulario (crear / editar) ── */}
        {showForm && (
          <div className="pm-form-card">
            <h2 className="pm-form-title">
              {editingId ? '✏️ Editar propiedad' : '🏠 Nueva propiedad'}
            </h2>

            <form onSubmit={handleSave} noValidate>
              <div className="pm-form-grid">

                {/* Título */}
                <div className="form-group pm-col-2">
                  <label>Título *</label>
                  <input type="text" name="title" value={formData.title} onChange={handleInput}
                    className={`form-control ${formErrors.title ? 'form-control--error' : ''}`}
                    placeholder="Ej: Hermosa casa con jardín en Santa Ana"
                  />
                  {formErrors.title && <span className="field-error">{formErrors.title}</span>}
                </div>

                {/* Ubicación */}
                <div className="form-group pm-col-2">
                  <label>Ubicación *</label>
                  <input type="text" name="location" value={formData.location} onChange={handleInput}
                    className={`form-control ${formErrors.location ? 'form-control--error' : ''}`}
                    placeholder="Ej: Santa Ana, San José"
                  />
                  {formErrors.location && <span className="field-error">{formErrors.location}</span>}
                </div>

                {/* Precio */}
                <div className="form-group">
                  <label>Precio (USD) *</label>
                  <input type="number" name="price" value={formData.price} onChange={handleInput}
                    className={`form-control ${formErrors.price ? 'form-control--error' : ''}`}
                    placeholder="250000" min="0"
                  />
                  {formErrors.price && <span className="field-error">{formErrors.price}</span>}
                </div>

                {/* Tipo */}
                <div className="form-group">
                  <label>Tipo *</label>
                  <select name="type" value={formData.type} onChange={handleInput} className="form-control">
                    <option value="Casa">🏠 Casa</option>
                    <option value="Apartamento">🏢 Apartamento</option>
                    <option value="Terreno">🌿 Terreno</option>
                    <option value="Comercial">🏪 Comercial</option>
                  </select>
                </div>

                {/* Habitaciones */}
                <div className="form-group">
                  <label>Habitaciones {formData.type !== 'Terreno' && '*'}</label>
                  <input type="number" name="bedrooms" value={formData.bedrooms} onChange={handleInput}
                    className={`form-control ${formErrors.bedrooms ? 'form-control--error' : ''}`}
                    placeholder="3" min="0"
                    disabled={formData.type === 'Terreno'}
                  />
                  {formErrors.bedrooms && <span className="field-error">{formErrors.bedrooms}</span>}
                </div>

                {/* Baños */}
                <div className="form-group">
                  <label>Baños {formData.type !== 'Terreno' && '*'}</label>
                  <input type="number" name="bathrooms" value={formData.bathrooms} onChange={handleInput}
                    className={`form-control ${formErrors.bathrooms ? 'form-control--error' : ''}`}
                    placeholder="2" min="0"
                    disabled={formData.type === 'Terreno'}
                  />
                  {formErrors.bathrooms && <span className="field-error">{formErrors.bathrooms}</span>}
                </div>

                {/* Área */}
                <div className="form-group">
                  <label>Área (m²) *</label>
                  <input type="number" name="area" value={formData.area} onChange={handleInput}
                    className={`form-control ${formErrors.area ? 'form-control--error' : ''}`}
                    placeholder="150" min="1"
                  />
                  {formErrors.area && <span className="field-error">{formErrors.area}</span>}
                </div>

                {/* Garage */}
                <div className="form-group">
                  <label>Garage (espacios)</label>
                  <input type="number" name="garage" value={formData.garage} onChange={handleInput}
                    className="form-control" placeholder="2" min="0"
                  />
                </div>

                {/* URL de imagen */}
                <div className="form-group pm-col-2">
                  <label>URL de imagen</label>
                  <input type="url" name="imageUrl" value={formData.imageUrl} onChange={handleInput}
                    className="form-control"
                    placeholder="https://images.unsplash.com/..."
                  />
                  <small className="field-hint">
                    Puedes usar imágenes de Unsplash: https://unsplash.com
                  </small>
                  {/* Preview de imagen */}
                  {formData.imageUrl && (
                    <img
                      src={formData.imageUrl}
                      alt="Preview"
                      className="image-preview"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  )}
                </div>

                {/* Amenidades */}
                <div className="form-group pm-col-2">
                  <label>Amenidades (separadas por comas)</label>
                  <input type="text" name="amenities" value={formData.amenities} onChange={handleInput}
                    className="form-control"
                    placeholder="Piscina, Jardín, Seguridad 24h, Cuarto de servicio"
                  />
                </div>

                {/* Descripción */}
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

              {/* Acciones del formulario */}
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

        {/* ── Tabla de propiedades ── */}
        {loading ? (
          <div className="loading-inline">
            <div className="spinner-sm" />
            <span>Cargando propiedades...</span>
          </div>
        ) : properties.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🏚️</div>
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
                {properties.map(p => (
                  <tr key={p.id}>
                    {/* Miniatura */}
                    <td>
                      <div className="table-thumbnail">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.title}
                            onError={(e) => { e.target.src = ''; e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <span className="thumb-placeholder">🏠</span>
                        )}
                      </div>
                    </td>

                    {/* Título y ubicación */}
                    <td>
                      <div className="table-title-cell">
                        <strong>{p.title}</strong>
                        <small>📍 {p.location}</small>
                      </div>
                    </td>

                    {/* Tipo */}
                    <td>
                      <span className="type-chip">{p.type}</span>
                    </td>

                    {/* Precio */}
                    <td className="price-cell">{formatPrice(p.price)}</td>

                    {/* Características */}
                    <td>
                      <div className="char-list">
                        {p.bedrooms > 0 && <span>🛏 {p.bedrooms}</span>}
                        {p.bathrooms > 0 && <span>🚿 {p.bathrooms}</span>}
                        <span>📐 {p.area} m²</span>
                      </div>
                    </td>

                    {/* Acciones */}
                    <td>
                      <div className="table-actions">
                        <button
                          className="btn btn-sm btn-dark"
                          onClick={() => openEdit(p)}
                          title="Editar"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => setDeleteId(p.id)}
                          title="Eliminar"
                        >
                          🗑️ Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Modal de confirmación para eliminar ── */}
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
