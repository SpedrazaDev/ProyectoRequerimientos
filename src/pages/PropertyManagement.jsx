// src/pages/PropertyManagement.jsx
// ALTERNATIVA: Subida de imágenes con CLOUDINARY (gratis)
import React, { useState, useEffect } from 'react';
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc,
  doc, serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { Plus, Edit2, Trash2, Home, Image as ImageIcon, X, Upload, Loader } from 'lucide-react';
import './PropertyManagement.css';

// ← CONFIGURACIÓN DE CLOUDINARY
const CLOUDINARY_UPLOAD_PRESET = 'inmobiliaria_uploads'; // Crear en Cloudinary
const CLOUDINARY_CLOUD_NAME = 'dxglvzif1';

const formatPrice = (price) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
    .format(price);

const EMPTY_FORM = {
  title:       '',
  location:    '',
  price:       '',
  type:        'Casa',
  status:      'disponible',
  bedrooms:    '',
  bathrooms:   '',
  area:        '',
  garage:      '0',
  description: '',
  amenities:   '',
};

const STATUS_OPTIONS = [
  { value: 'disponible', label: 'Disponible', color: '#27ae60' },
  { value: 'reservada', label: 'Reservada', color: '#f39c12' },
  { value: 'vendida', label: 'Vendida', color: '#e74c3c' },
];

function PropertyManagement() {
  const [properties,  setProperties]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showForm,    setShowForm]    = useState(false);
  const [editingId,   setEditingId]   = useState(null);
  const [formData,    setFormData]    = useState(EMPTY_FORM);
  const [formErrors,  setFormErrors]  = useState({});
  const [saving,      setSaving]      = useState(false);
  const [deleteId,    setDeleteId]    = useState(null);
  
  const [imageFiles,  setImageFiles]  = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [uploading,   setUploading]   = useState(false);

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

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const validFiles = files.filter(f => {
      if (f.size > 5 * 1024 * 1024) {
        alert(`${f.name} es muy grande. Máximo 5MB.`);
        return false;
      }
      return true;
    });

    setImageFiles(prev => [...prev, ...validFiles]);

    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  // ← SUBIR A CLOUDINARY
  const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) throw new Error('Error subiendo imagen');
    
    const data = await response.json();
    return data.secure_url; // URL de la imagen
  };

  const uploadImages = async () => {
    if (imageFiles.length === 0) return [];

    setUploading(true);
    const uploadedUrls = [];

    try {
      for (const file of imageFiles) {
        const url = await uploadToCloudinary(file);
        uploadedUrls.push(url);
      }
    } catch (err) {
      console.error('Error subiendo imágenes:', err);
      alert('Error al subir imágenes.');
    } finally {
      setUploading(false);
    }

    return uploadedUrls;
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
    setImageFiles([]);
    setImagePreviews([]);
    setShowForm(true);
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  const openEdit = (property) => {
    setFormData({
      title:       property.title       || '',
      location:    property.location    || '',
      price:       property.price?.toString() || '',
      type:        property.type        || 'Casa',
      status:      property.status      || 'disponible',
      bedrooms:    property.bedrooms?.toString() || '',
      bathrooms:   property.bathrooms?.toString() || '',
      area:        property.area?.toString() || '',
      garage:      property.garage?.toString() || '0',
      description: property.description || '',
      amenities:   Array.isArray(property.amenities)
                     ? property.amenities.join(', ')
                     : (property.amenities || ''),
    });
    setFormErrors({});
    setEditingId(property.id);
    setImageFiles([]);
    
    const existingImages = property.images || (property.imageUrl ? [property.imageUrl] : []);
    setImagePreviews(existingImages);
    
    setShowForm(true);
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormErrors({});
    setImageFiles([]);
    setImagePreviews([]);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const newImageUrls = await uploadImages();

      let allImageUrls = [...newImageUrls];
      if (editingId) {
        const existingUrls = imagePreviews.filter(url => typeof url === 'string' && url.startsWith('http'));
        allImageUrls = [...existingUrls, ...newImageUrls];
      }

      const dataToSave = {
        title:       formData.title.trim(),
        location:    formData.location.trim(),
        price:       Number(formData.price),
        type:        formData.type,
        status:      formData.status,
        bedrooms:    Number(formData.bedrooms) || 0,
        bathrooms:   Number(formData.bathrooms) || 0,
        area:        Number(formData.area),
        garage:      Number(formData.garage) || 0,
        description: formData.description.trim(),
        images:      allImageUrls,
        imageUrl:    allImageUrls[0] || '',
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
      alert('Error al guardar.');
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
      alert('Error al eliminar.');
    }
  };

  const changeStatus = async (propertyId, newStatus) => {
    try {
      await updateDoc(doc(db, 'properties', propertyId), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      await loadProperties();
    } catch (err) {
      console.error('Error cambiando estado:', err);
      alert('Error al cambiar el estado.');
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-container">

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
                    placeholder="Ej: Hermosa casa en Santa Ana"
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

                <div className="form-group pm-col-2">
                  <label>
                    <ImageIcon size={14} style={{ display: 'inline', marginRight: '4px' }} />
                    Imágenes (Cloudinary - Gratis)
                  </label>
                  
                  <div className="image-upload-zone">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageSelect}
                      className="file-input"
                      id="image-upload"
                    />
                    <label htmlFor="image-upload" className="file-upload-btn">
                      <Upload size={18} />
                      Seleccionar imágenes
                    </label>
                    <small className="field-hint">Máximo 5MB por imagen</small>
                  </div>

                  {imagePreviews.length > 0 && (
                    <div className="images-preview">
                      {imagePreviews.map((preview, i) => (
                        <div key={i} className="image-preview-item">
                          <img src={preview} alt={`Preview ${i + 1}`} className="image-preview-small" />
                          <button
                            type="button"
                            className="image-remove-btn"
                            onClick={() => removeImage(i)}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="form-group pm-col-2">
                  <label>Amenidades</label>
                  <input type="text" name="amenities" value={formData.amenities} onChange={handleInput}
                    className="form-control"
                    placeholder="Piscina, Jardín, Seguridad 24h"
                  />
                </div>

                <div className="form-group pm-col-2">
                  <label>Descripción *</label>
                  <textarea name="description" value={formData.description} onChange={handleInput}
                    className={`form-control ${formErrors.description ? 'form-control--error' : ''}`}
                    rows={4}
                    placeholder="Describe la propiedad..."
                  />
                  {formErrors.description && <span className="field-error">{formErrors.description}</span>}
                </div>
              </div>

              <div className="pm-form-actions">
                <button type="button" className="btn btn-outline" onClick={cancelForm}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-gold" disabled={saving || uploading}>
                  {saving || uploading ? (
                    <>
                      <Loader size={16} className="spinner-icon" />
                      {uploading ? 'Subiendo...' : 'Guardando...'}
                    </>
                  ) : (
                    editingId ? '✓ Actualizar' : '✓ Crear'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="loading-inline">
            <div className="spinner-sm" />
            <span>Cargando...</span>
          </div>
        ) : properties.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <Home size={48} strokeWidth={1.5} />
            </div>
            <h3>Sin propiedades</h3>
            <p>Agrega tu primera propiedad.</p>
          </div>
        ) : (
          <div className="pm-table-wrap">
            <table className="pm-table">
              <thead>
                <tr>
                  <th>Imagen</th>
                  <th>Propiedad</th>
                  <th>Tipo</th>
                  <th>Estado</th>
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
                            <img src={firstImage} alt={p.title} loading="lazy" />
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

                      <td>
                        <select
                          value={p.status || 'disponible'}
                          onChange={(e) => changeStatus(p.id, e.target.value)}
                          className="status-select"
                        >
                          {STATUS_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
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
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => setDeleteId(p.id)}
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
        )}

        {deleteId && (
          <div className="modal-overlay" onClick={() => setDeleteId(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal__icon">⚠️</div>
              <h3>¿Eliminar propiedad?</h3>
              <p>Esta acción es permanente.</p>
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
