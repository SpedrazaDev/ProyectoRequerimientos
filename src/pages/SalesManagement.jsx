// src/pages/SalesManagement.jsx
// RF: Registro de Ventas - datos completos de transacción
import React, { useState, useEffect } from 'react';
import {
  collection, getDocs, addDoc, updateDoc, doc,
  serverTimestamp, query, where
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useLocation } from 'react-router-dom';
import { DollarSign, CheckCircle, Home, User, CreditCard } from 'lucide-react';
import './SalesManagement.css';

const PAYMENT_METHODS = [
  { id: 'cash',       label: 'Contado' },
  { id: 'mortgage',   label: 'Hipoteca / Crédito bancario' },
  { id: 'financing',  label: 'Financiamiento interno' },
  { id: 'other',      label: 'Otro' },
];

const PAYMENT_STATUSES = [
  { id: 'paid',     label: 'Pagado' },
  { id: 'pending',  label: 'Pendiente' },
  { id: 'partial',  label: 'Parcial' },
];

const EMPTY_FORM = {
  clientName: '',
  clientEmail: '',
  clientDocument: '',
  clientPhone: '',
  paymentMethod: 'cash',
  paymentStatus: 'paid',
  saleAmount: '',
  notes: '',
};

function SalesManagement() {
  const [properties, setProperties]     = useState([]);
  const [loading, setLoading]           = useState(true);
  const [submitting, setSubmitting]     = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [success, setSuccess]           = useState(false);
  const location = useLocation();

  useEffect(() => { loadProperties(); }, []);

  // Pre-fill desde booking confirmada (HU-028) o desde lead del pipeline
  useEffect(() => {
    const fromBooking = location.state?.fromBooking;
    const fromLead    = location.state?.fromLead;
    if (fromBooking?.propertyId) {
      setSelectedPropertyId(fromBooking.propertyId);
      if (fromBooking.clientEmail) setForm(f => ({ ...f, clientEmail: fromBooking.clientEmail }));
    } else if (fromLead?.propertyId) {
      setSelectedPropertyId(fromLead.propertyId);
      setForm(f => ({
        ...f,
        clientName:  fromLead.clientName  || f.clientName,
        clientEmail: fromLead.clientEmail || f.clientEmail,
        saleAmount:  fromLead.estimatedValue ? String(fromLead.estimatedValue) : f.saleAmount,
      }));
    }
  }, [location.state]);

  // Auto-fill sale amount cuando se selecciona propiedad
  useEffect(() => {
    if (selectedPropertyId) {
      const prop = properties.find(p => p.id === selectedPropertyId);
      if (prop?.price) setForm(f => ({ ...f, saleAmount: String(prop.price) }));
    }
  }, [selectedPropertyId, properties]);

  const loadProperties = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'properties'), where('status', '==', 'disponible')));
      setProperties(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedPropertyId)        return alert('Selecciona una propiedad');
    if (!form.clientName.trim())    return alert('El nombre del cliente es obligatorio');
    if (!form.saleAmount || isNaN(Number(form.saleAmount))) return alert('Monto de venta inválido');

    if (!confirm('¿Confirmar el registro de esta venta?')) return;

    setSubmitting(true);
    try {
      const property = properties.find(p => p.id === selectedPropertyId);
      if (!property) return alert('Propiedad no encontrada');

      // Obtener datos del agente
      const currentUser = auth.currentUser;
      let agentName  = 'Agente';
      let agentEmail = currentUser?.email || '';

      if (currentUser) {
        try {
          const empSnap = await getDocs(
            query(collection(db, 'employees'), where('email', '==', currentUser.email.toLowerCase()))
          );
          if (!empSnap.empty) agentName = empSnap.docs[0].data().name || 'Agente';
        } catch (_) { /* ignorar */ }
      }

      // Registrar venta con todos los campos
      await addDoc(collection(db, 'sales'), {
        // Propiedad
        propertyId:       property.id,
        propertyTitle:    property.title,
        propertyLocation: property.location || '',
        propertyType:     property.type     || '',
        originalPrice:    property.price    || 0,
        // Venta
        saleAmount:       Number(form.saleAmount),
        closingDate:      new Date().toISOString().split('T')[0],
        paymentMethod:    form.paymentMethod,
        paymentStatus:    form.paymentStatus,
        // Cliente
        clientName:       form.clientName.trim(),
        clientEmail:      form.clientEmail.trim().toLowerCase(),
        clientDocument:   form.clientDocument.trim(),
        clientPhone:      form.clientPhone.trim(),
        // Agente
        agentName,
        agentEmail,
        // Meta
        notes:            form.notes.trim(),
        isManual:         false,
        createdAt:        serverTimestamp(),
      });

      // Marcar propiedad como vendida
      await updateDoc(doc(db, 'properties', property.id), {
        status: 'vendida',
        updatedAt: serverTimestamp(),
      });

      setSuccess(true);
      setSelectedPropertyId('');
      setForm(EMPTY_FORM);
      await loadProperties();
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      console.error(err);
      alert('Error al registrar la venta');
    } finally {
      setSubmitting(false);
    }
  };

  const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
  const selectedProp = properties.find(p => p.id === selectedPropertyId);

  return (
    <div className="admin-page">
      <div className="admin-container">

        <div className="pm-header">
          <div>
            <h1 className="dash-title">Registrar Venta</h1>
            <p className="dash-sub">Completa los datos de la transacción</p>
          </div>
        </div>

        {success && (
          <div className="sale-success-banner">
            <CheckCircle size={20} />
            Venta registrada exitosamente. La propiedad fue marcada como vendida.
          </div>
        )}

        {loading ? (
          <div className="loading-inline"><div className="spinner-sm" /><span>Cargando...</span></div>
        ) : properties.length === 0 && !selectedPropertyId ? (
          <div className="empty-state">
            <div className="empty-icon"><Home size={48} strokeWidth={1.5} /></div>
            <h3>Sin propiedades disponibles</h3>
            <p>No hay propiedades disponibles para vender en este momento.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="sale-form">

            {/* ── Propiedad ── */}
            <div className="sale-section">
              <h3 className="sale-section-title"><Home size={18} /> Propiedad</h3>
              <div className="sale-form-row">
                <div className="sale-form-group full">
                  <label>Propiedad *</label>
                  <select
                    value={selectedPropertyId}
                    onChange={e => setSelectedPropertyId(e.target.value)}
                    required
                  >
                    <option value="">— Seleccionar propiedad —</option>
                    {properties.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.title} · {p.location} ({fmt(p.price)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedProp && (
                <div className="property-preview-bar">
                  <span><strong>Tipo:</strong> {selectedProp.type || '—'}</span>
                  <span><strong>Precio lista:</strong> {fmt(selectedProp.price)}</span>
                  <span><strong>Ubicación:</strong> {selectedProp.location || '—'}</span>
                </div>
              )}
            </div>

            {/* ── Cliente ── */}
            <div className="sale-section">
              <h3 className="sale-section-title"><User size={18} /> Cliente comprador</h3>
              <div className="sale-form-row">
                <div className="sale-form-group">
                  <label>Nombre completo *</label>
                  <input type="text" value={form.clientName}
                    onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))} required />
                </div>
                <div className="sale-form-group">
                  <label>Documento / Cédula</label>
                  <input type="text" value={form.clientDocument} placeholder="N.º identificación"
                    onChange={e => setForm(f => ({ ...f, clientDocument: e.target.value }))} />
                </div>
                <div className="sale-form-group">
                  <label>Email</label>
                  <input type="email" value={form.clientEmail}
                    onChange={e => setForm(f => ({ ...f, clientEmail: e.target.value }))} />
                </div>
                <div className="sale-form-group">
                  <label>Teléfono</label>
                  <input type="tel" value={form.clientPhone}
                    onChange={e => setForm(f => ({ ...f, clientPhone: e.target.value }))} />
                </div>
              </div>
            </div>

            {/* ── Transacción ── */}
            <div className="sale-section">
              <h3 className="sale-section-title"><CreditCard size={18} /> Transacción</h3>
              <div className="sale-form-row">
                <div className="sale-form-group">
                  <label>Monto de venta (USD) *</label>
                  <input type="number" min="0" step="0.01" value={form.saleAmount}
                    onChange={e => setForm(f => ({ ...f, saleAmount: e.target.value }))} required />
                </div>
                <div className="sale-form-group">
                  <label>Método de pago *</label>
                  <select value={form.paymentMethod}
                    onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))}>
                    {PAYMENT_METHODS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </select>
                </div>
                <div className="sale-form-group">
                  <label>Estado de pago *</label>
                  <select value={form.paymentStatus}
                    onChange={e => setForm(f => ({ ...f, paymentStatus: e.target.value }))}>
                    {PAYMENT_STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                </div>
                <div className="sale-form-group full">
                  <label>Notas adicionales</label>
                  <textarea rows={2} value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Condiciones especiales, observaciones..." />
                </div>
              </div>
            </div>

            <button type="submit" className="btn btn-success btn-block sale-submit"
              disabled={submitting || !selectedPropertyId}>
              {submitting ? 'Registrando...' : <><CheckCircle size={18} /> Confirmar venta</>}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}

export default SalesManagement;
