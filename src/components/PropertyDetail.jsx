// src/pages/PropertyDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { ChevronLeft, Home, MapPin, Bed, Bath, Maximize, Car, Phone, Mail, Lock, Calendar, Clock } from 'lucide-react';
import './PropertyDetail.css';

const formatPrice = (price) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
    .format(price);

const EMPTY_FORM = {
  name:    '',
  email:   '',
  phone:   '',
  date:    '',
  time:    '',
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
    if (!formData.date)         errs.date  = 'Selecciona una fecha.';
    if (!formData.time)         errs.time  = 'Selecciona una hora.';

    if (formData.date) {
      const today = new Date().toISOString().split('T')[0];
      if (formData.date < today) errs.date = 'La fecha no puede ser en el pasado.';
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      await addDoc(collection(db, 'bookings'), {
        ...formData,
        name:          formData.name.trim(),
        email:         formData.email.trim().toLowerCase(),
        phone:         formData.phone.trim(),
        propertyId:    id,
        propertyTitle: property.title,
        propertyImage: property.imageUrl || (Array.isArray(property.images) ? property.images[0] : ''),
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

  const today = new Date().toISOString().split('T')[0];
  const firstImage = Array.isArray(property.images) ? property.images[0] : (property.imageUrl || '');

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

          {/* Imagen */}
          <div className="detail-image-wrap">
            {firstImage ? (
              <img src={firstImage} alt={property.title} className="detail-image" loading="lazy" />
            ) : (
              <div className="detail-image-placeholder">
                <Home size={64} strokeWidth={1.5} />
                <p>Sin imagen disponible</p>
              </div>
            )}
            <div className="detail-type-badge">{property.type}</div>
          </div>

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

                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="date">Fecha preferida *</label>
                        <input
                          id="date"
                          type="date"
                          name="date"
                          value={formData.date}
                          onChange={handleInput}
                          min={today}
                          className={`form-control ${formErrors.date ? 'form-control--error' : ''}`}
                        />
                        {formErrors.date && <span className="field-error">{formErrors.date}</span>}
                      </div>

                      <div className="form-group">
                        <label htmlFor="time">Hora preferida *</label>
                        <select
                          id="time"
                          name="time"
                          value={formData.time}
                          onChange={handleInput}
                          className={`form-control ${formErrors.time ? 'form-control--error' : ''}`}
                        >
                          <option value="">Seleccionar</option>
                          <option value="09:00">9:00 AM</option>
                          <option value="10:00">10:00 AM</option>
                          <option value="11:00">11:00 AM</option>
                          <option value="14:00">2:00 PM</option>
                          <option value="15:00">3:00 PM</option>
                          <option value="16:00">4:00 PM</option>
                          <option value="17:00">5:00 PM</option>
                        </select>
                        {formErrors.time && <span className="field-error">{formErrors.time}</span>}
                      </div>
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
