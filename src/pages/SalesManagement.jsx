// src/pages/SalesManagement.jsx
// Registro simplificado de ventas - solo seleccionar propiedad
import React, { useState, useEffect } from 'react';
import {
  collection, getDocs, addDoc, updateDoc, doc,
  serverTimestamp, query, where
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useLocation } from 'react-router-dom';
import { DollarSign, CheckCircle, Home } from 'lucide-react';
import './SalesManagement.css';

function SalesManagement() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const location = useLocation();

  useEffect(() => {
    loadProperties();
  }, []);

  // Pre-fill property when navigating from a confirmed booking (HU-028)
  useEffect(() => {
    const fromBooking = location.state?.fromBooking;
    if (fromBooking?.propertyId) {
      setSelectedPropertyId(fromBooking.propertyId);
    }
  }, [location.state]);

  const loadProperties = async () => {
    setLoading(true);
    try {
      // Cargar solo propiedades disponibles
      const q = query(
        collection(db, 'properties'),
        where('status', '==', 'disponible')
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      setProperties(data);
    } catch (err) {
      console.error('Error cargando propiedades:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSale = async () => {
    if (!selectedPropertyId) {
      alert('Por favor selecciona una propiedad');
      return;
    }

    if (!confirm('¿Confirmar venta de esta propiedad?')) {
      return;
    }

    setSubmitting(true);
    try {
      const property = properties.find(p => p.id === selectedPropertyId);
      if (!property) {
        alert('Propiedad no encontrada');
        return;
      }

      // Obtener nombre del agente
      const currentUser = auth.currentUser;
      let agentName = 'Agente';
      let agentEmail = currentUser?.email || '';

      if (currentUser) {
        try {
          const employeesRef = collection(db, 'employees');
          const q = query(employeesRef, where('email', '==', currentUser.email.toLowerCase()));
          const snapshot = await getDocs(q);
          
          if (!snapshot.empty) {
            agentName = snapshot.docs[0].data().name || 'Agente';
          }
        } catch (err) {
          console.error('Error obteniendo nombre del agente:', err);
        }
      }

      // Registrar venta
      await addDoc(collection(db, 'sales'), {
        propertyId: property.id,
        propertyTitle: property.title,
        propertyLocation: property.location,
        propertyType: property.type,
        saleAmount: property.price,
        originalPrice: property.price,
        closingDate: new Date().toISOString().split('T')[0],
        agentName: agentName,
        agentEmail: agentEmail,
        status: 'completed',
        createdAt: serverTimestamp(),
        notes: 'Venta registrada automáticamente',
      });

      // Cambiar estado de propiedad a "vendida"
      await updateDoc(doc(db, 'properties', property.id), {
        status: 'vendida',
        updatedAt: serverTimestamp(),
      });

      alert('✅ Venta registrada exitosamente');
      setSelectedPropertyId('');
      await loadProperties(); // Recargar lista

    } catch (err) {
      console.error('Error registrando venta:', err);
      alert('Error al registrar la venta');
    } finally {
      setSubmitting(false);
    }
  };

  const formatPrice = (price) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(price);

  return (
    <div className="admin-page">
      <div className="admin-container">

        <div className="pm-header">
          <div>
            <h1 className="dash-title">Registrar Venta</h1>
            <p className="dash-sub">
              Selecciona una propiedad para marcarla como vendida
            </p>
          </div>
        </div>

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
            <h3>Sin propiedades disponibles</h3>
            <p>No hay propiedades disponibles para vender.</p>
          </div>
        ) : (
          <div className="sales-form-card">
            
            <div className="form-group">
              <label htmlFor="property-select">
                Seleccionar propiedad *
              </label>
              <select
                id="property-select"
                value={selectedPropertyId}
                onChange={(e) => setSelectedPropertyId(e.target.value)}
                className="form-control"
                style={{ fontSize: '1rem', padding: '0.75rem' }}
              >
                <option value="">-- Selecciona una propiedad --</option>
                {properties.map(property => (
                  <option key={property.id} value={property.id}>
                    {property.title} - {property.location} ({formatPrice(property.price)})
                  </option>
                ))}
              </select>
            </div>

            {selectedPropertyId && (
              <div className="property-preview">
                {(() => {
                  const selected = properties.find(p => p.id === selectedPropertyId);
                  if (!selected) return null;
                  
                  return (
                    <>
                      <h3>Vista previa:</h3>
                      <div className="preview-details">
                        <div className="preview-item">
                          <strong>Propiedad:</strong>
                          <span>{selected.title}</span>
                        </div>
                        <div className="preview-item">
                          <strong>Ubicación:</strong>
                          <span>{selected.location}</span>
                        </div>
                        <div className="preview-item">
                          <strong>Tipo:</strong>
                          <span>{selected.type}</span>
                        </div>
                        <div className="preview-item">
                          <strong>Precio de venta:</strong>
                          <span className="price-highlight">
                            {formatPrice(selected.price)}
                          </span>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            <button
              className="btn btn-success btn-block"
              onClick={handleSale}
              disabled={submitting || !selectedPropertyId}
              style={{ marginTop: '1.5rem', padding: '0.9rem', fontSize: '1rem' }}
            >
              {submitting ? (
                <>Registrando venta...</>
              ) : (
                <>
                  <CheckCircle size={18} />
                  Confirmar venta
                </>
              )}
            </button>

            <p style={{ 
              marginTop: '1rem', 
              textAlign: 'center', 
              fontSize: '0.9rem', 
              color: '#666' 
            }}>
              Esta acción marcará la propiedad como "vendida" automáticamente
            </p>
          </div>
        )}

      </div>
    </div>
  );
}

export default SalesManagement;
