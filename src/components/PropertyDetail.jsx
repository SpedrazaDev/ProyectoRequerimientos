// src/pages/PropertyDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { ChevronLeft, ChevronRight, Home, MapPin, Bed, Bath, Maximize, Car, Phone, Mail, Lock, Calendar, Clock } from 'lucide-react';
import './PropertyDetail.css';

const formatPrice = (price) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
    .format(price);

const EMPTY_FORM = {
  name:    '',
  email:   '',
  phone:   '',
  message: '',
};

function PropertyDetail() {
  const { id } = useParams();

  const [property,     setProperty]     = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [showForm,     setShowForm]     = useState(false);
  const [formData,     setFormData]     = useState(EMPTY_FORM);
  const [formErrors,   setFormErrors]   = useState({});
  const [submitting,   setSubmitting]   = useState(false);
  const [submitted,    setSubmitted]    = useState(false);
  const [imgIndex,     setImgIndex]     = useState(0);

  useEffect(() => {
    const fetch = async () => {
      try {
        const docRef  = doc(db, 'properties', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setProperty({ id: docSnap.id, ...docSnap.data() });
        } else {
          setError('Propiedad no encontrada.');
        }
      } catch (err) {
        setError('Error al cargar la propiedad. Verifica tu conexión.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  const handleInput = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const errs = {};
    if (!formData.name.trim())  errs.name  = 'El nombre es requerido.';
    if (!formData.email.trim()) errs.email = 'El email es requerido.';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errs.email = 'Email no válido.';
    if (!formData.phone.trim()) errs.phone = 'El teléfono es requerido.';

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'bookings'), {
        name:          formData.name.trim(),
        email:         formData.email.trim().toLowerCase(),
        phone:         formData.phone.trim(),
        message:       formData.message.trim(),
        propertyId:    id,
        propertyTitle: property.title,
        propertyImage: property.imageUrl || (Array.isArray(property.images) ? property.images[0] : ''),
        date:          null,
        time:          null,
        status:        'pendiente',
        createdAt:     serverTimestamp(),
      });

      setSubmitted(true);
      setFormData(EMPTY_FORM);
    } catch (err) {
      alert('Error al enviar la solicitud. Por favor intenta de nuevo.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="detail-page detail-page--loading">
        <div className="loading-inline">
          <div className="spinner-sm" />
          <span>Cargando propiedad...</span>
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="detail-page detail-page--error">
        <div className="detail-error">
          <Home size={64} strokeWidth={1.5} />
          <h2>Oops</h2>
          <p>{error || 'Propiedad no encontrada.'}</p>
          <Link to="/" className="btn btn-gold">
            <ChevronLeft size={16} />
            Volver al catálogo
          </Link>
        </div>
      </div>
    );
  }

  const images = Array.isArray(property.images) && property.images.length > 0
    ? property.images
    : property.imageUrl ? [property.imageUrl] : [];
  const hasMany = images.length > 1;

  const prevImg = () => setImgIndex(i => (i - 1 + images.length) % images.length);
  const nextImg = () => setImgIndex(i => (i + 1) % images.length);

  return (
    <div className="detail-page">

      {/* Breadcrumb */}
      <div className="detail-breadcrumb">
        <div className="container">
          <Link to="/" className="breadcrumb-link">
            <ChevronLeft size={14} />
            Catálogo
          </Link>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-current">{property.title}</span>
        </div>
      </div>

      <div className="detail-container container">

        {/* Columna izquierda */}
        <div className="detail-left">

          {/* Carrusel de imágenes */}
          <div className="detail-image-wrap">
            {images.length > 0 ? (
              <img
                src={images[imgIndex]}
                alt={`${property.title} — foto ${imgIndex + 1}`}
                className="detail-image"
                loading="lazy"
              />
            ) : (
              <div className="detail-image-placeholder">
                <Home size={64} strokeWidth={1.5} />
                <p>Sin imagen disponible</p>
              </div>
            )}

            <div className="detail-type-badge">{property.type}</div>

            {property.status && (
              <div className={`detail-status-badge detail-status-badge--${property.status}`}>
                {property.status === 'disponible' ? 'Disponible'
                  : property.status === 'reservada' ? 'Reservada'
                  : property.status === 'vendida'   ? 'Vendida'
                  : property.status}
              </div>
            )}

            {hasMany && (
              <>
                <button className="carousel-btn carousel-btn--prev" onClick={prevImg} aria-label="Foto anterior">
                  <ChevronLeft size={22} />
                </button>
                <button className="carousel-btn carousel-btn--next" onClick={nextImg} aria-label="Foto siguiente">
                  <ChevronRight size={22} />
                </button>
                <div className="carousel-counter">{imgIndex + 1} / {images.length}</div>
              </>
            )}
          </div>

          {/* Miniaturas */}
          {hasMany && (
            <div className="carousel-thumbs">
              {images.map((src, i) => (
                <button
                  key={i}
                  className={`carousel-thumb ${i === imgIndex ? 'carousel-thumb--active' : ''}`}
                  onClick={() => setImgIndex(i)}
                  aria-label={`Foto ${i + 1}`}
                >
                  <img src={src} alt={`miniatura ${i + 1}`} />
                </button>
              ))}
            </div>
          )}

          {/* Info */}
          <div className="detail-info">
            <p className="detail-price">{formatPrice(property.price)}</p>
            <h1 className="detail-title">{property.title}</h1>
            <p className="detail-location">
              <MapPin size={16} />
              {property.location}
            </p>

            <div className="gold-divider" />

            {/* Features */}
            <div className="detail-features">
              {property.bedrooms > 0 && (
                <div className="feature-box">
                  <Bed size={24} />
                  <span className="feature-box__val">{property.bedrooms}</span>
                  <span className="feature-box__lbl">Habitaciones</span>
                </div>
              )}
              {property.bathrooms > 0 && (
                <div className="feature-box">
                  <Bath size={24} />
                  <span className="feature-box__val">{property.bathrooms}</span>
                  <span className="feature-box__lbl">Baños</span>
                </div>
              )}
              {property.area > 0 && (
                <div className="feature-box">
                  <Maximize size={24} />
                  <span className="feature-box__val">{property.area}</span>
                  <span className="feature-box__lbl">m²</span>
                </div>
              )}
              {property.garage > 0 && (
                <div className="feature-box">
                  <Car size={24} />
                  <span className="feature-box__val">{property.garage}</span>
                  <span className="feature-box__lbl">Garaje</span>
                </div>
              )}
            </div>

            {/* Descripción */}
            {property.description && (
              <div className="detail-description">
                <h3>Descripción</h3>
                <p>{property.description}</p>
              </div>
            )}

            {/* Amenidades */}
            {property.amenities && property.amenities.length > 0 && (
              <div className="detail-amenities">
                <h3>Amenidades</h3>
                <ul>
                  {property.amenities.map((a, i) => (
                    <li key={i}>✓ {a}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Columna derecha: Formulario */}
        <div className="detail-right">
          <div className="booking-card">
            <h2 className="booking-card__title">Solicitar visita</h2>
            <p className="booking-card__sub">
              Completa el formulario y un asesor te contactará.
            </p>

            {submitted ? (
              <div className="booking-success">
                <div className="booking-success__icon">
                  <Calendar size={48} strokeWidth={1.5} />
                </div>
                <h3>¡Solicitud enviada!</h3>
                <p>
                  Recibimos tu solicitud de visita para <strong>{property.title}</strong>.
                  Un asesor se pondrá en contacto contigo pronto.
                </p>
                <button
                  className="btn btn-outline btn-block"
                  style={{ marginTop: '1.5rem' }}
                  onClick={() => { setSubmitted(false); setShowForm(false); }}
                >
                  Solicitar otra cita
                </button>
              </div>
            ) : (
              <>
                <button
                  className="btn btn-gold btn-block"
                  style={{ marginBottom: showForm ? '1.5rem' : 0 }}
                  onClick={() => setShowForm(!showForm)}
                >
                  <Calendar size={16} />
                  {showForm ? 'Ocultar formulario' : 'Agendar visita'}
                </button>

                {showForm && (
                  <form className="booking-form" onSubmit={handleSubmit} noValidate>
                    <div className="form-group">
                      <label htmlFor="name">Nombre completo *</label>
                      <input
                        id="name"
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInput}
                        className={`form-control ${formErrors.name ? 'form-control--error' : ''}`}
                        placeholder="Ej: María González"
                      />
                      {formErrors.name && <span className="field-error">{formErrors.name}</span>}
                    </div>

                    <div className="form-group">
                      <label htmlFor="email">Correo electrónico *</label>
                      <input
                        id="email"
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInput}
                        className={`form-control ${formErrors.email ? 'form-control--error' : ''}`}
                        placeholder="correo@ejemplo.com"
                      />
                      {formErrors.email && <span className="field-error">{formErrors.email}</span>}
                    </div>

                    <div className="form-group">
                      <label htmlFor="phone">Teléfono *</label>
                      <input
                        id="phone"
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInput}
                        className={`form-control ${formErrors.phone ? 'form-control--error' : ''}`}
                        placeholder="+506 8888 8888"
                      />
                      {formErrors.phone && <span className="field-error">{formErrors.phone}</span>}
                    </div>

                    <div className="form-group">
                      <label htmlFor="message">Mensaje adicional (opcional)</label>
                      <textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleInput}
                        className="form-control"
                        placeholder="¿Alguna pregunta o comentario?"
                        rows={3}
                      />
                    </div>

                    <button
                      type="submit"
                      className="btn btn-gold btn-block"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <Clock className="spinner-icon" size={16} />
                          Enviando...
                        </>
                      ) : (
                        <>Confirmar solicitud</>
                      )}
                    </button>

                    <p className="booking-note">
                      <Lock size={12} />
                      Tu información es confidencial y solo será usada para coordinar la visita.
                    </p>
                  </form>
                )}
              </>
            )}

            {/* Contacto directo */}
            <div className="booking-contact">
              <p>¿Prefieres llamar?</p>
              <a href="tel:+50688888888" className="contact-phone">
                <Phone size={14} />
                +506 8888-8888
              </a>
              <a href="mailto:info@inmobiliariapro.com" className="contact-email">
                <Mail size={14} />
                info@inmobiliariapro.com
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PropertyDetail;
