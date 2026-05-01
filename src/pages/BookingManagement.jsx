// src/pages/BookingManagement.jsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  collection, getDocs, updateDoc, deleteDoc,
  doc, query, orderBy
} from 'firebase/firestore';
import { db } from '../firebase';
import { useLocation } from 'react-router-dom';
import { 
  RefreshCw, Mail, Clock, CheckCircle, X, 
  Phone, MessageSquare, Trash2, ClipboardList 
} from 'lucide-react';
import './BookingManagement.css';

const formatDate = (ts) => {
  if (!ts) return '—';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return new Intl.DateTimeFormat('es-CR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(d);
};

const STATUS_LABELS = {
  pendiente:  { icon: Clock,       label: 'Pendiente',  class: 'pending'   },
  confirmada: { icon: CheckCircle, label: 'Confirmada', class: 'confirmed' },
  cancelada:  { icon: X,           label: 'Cancelada',  class: 'cancelled' },
};

function BookingManagement() {
  const [bookings,    setBookings]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [activeTab,   setActiveTab]   = useState('todos');
  const [deleteId,    setDeleteId]    = useState(null);
  const [updating,    setUpdating]    = useState(null);
  const [expanded,    setExpanded]    = useState(null);

  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const status = params.get('status');
    if (status && ['pendiente', 'confirmada', 'cancelada'].includes(status)) {
      setActiveTab(status);
    }
  }, [location.search]);

  useEffect(() => { loadBookings(); }, []);

  const loadBookings = async () => {
    setLoading(true);
    try {
      let data = [];
      try {
        const snap = await getDocs(
          query(collection(db, 'bookings'), orderBy('createdAt', 'desc'))
        );
        data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch {
        const snap = await getDocs(collection(db, 'bookings'));
        data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      }
      setBookings(data);
    } catch (err) {
      console.error('Error cargando citas:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (activeTab === 'todos') return bookings;
    return bookings.filter(b => b.status === activeTab);
  }, [bookings, activeTab]);

  const counts = useMemo(() => ({
    todos:     bookings.length,
    pendiente: bookings.filter(b => b.status === 'pendiente').length,
    confirmada:bookings.filter(b => b.status === 'confirmada').length,
    cancelada: bookings.filter(b => b.status === 'cancelada').length,
  }), [bookings]);

  const changeStatus = async (id, newStatus) => {
    setUpdating(id);
    try {
      await updateDoc(doc(db, 'bookings', id), { status: newStatus });
      setBookings(prev =>
        prev.map(b => b.id === id ? { ...b, status: newStatus } : b)
      );
    } catch (err) {
      console.error('Error actualizando estado:', err);
      alert('Error al actualizar. Intenta de nuevo.');
    } finally {
      setUpdating(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteDoc(doc(db, 'bookings', deleteId));
      setBookings(prev => prev.filter(b => b.id !== deleteId));
      setDeleteId(null);
    } catch (err) {
      console.error('Error eliminando cita:', err);
      alert('Error al eliminar la cita.');
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-container">

        {/* Header */}
        <div className="bm-header">
          <div>
            <h1 className="dash-title">Gestión de Citas</h1>
            <p className="dash-sub">
              {bookings.length} solicitud{bookings.length !== 1 ? 'es' : ''} en total
            </p>
          </div>
          <button className="btn btn-dark" onClick={loadBookings}>
            <RefreshCw size={16} />
            Actualizar
          </button>
        </div>

        {/* Tabs */}
        <div className="bm-tabs">
          {['todos', 'pendiente', 'confirmada', 'cancelada'].map(tab => {
            const Icon = tab === 'todos' ? ClipboardList : 
                        tab === 'pendiente' ? Clock :
                        tab === 'confirmada' ? CheckCircle : X;
            return (
              <button
                key={tab}
                className={`bm-tab ${activeTab === tab ? 'bm-tab--active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                <Icon size={16} />
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                <span className="bm-tab-count">{counts[tab]}</span>
              </button>
            );
          })}
        </div>

        {/* Lista */}
        {loading ? (
          <div className="loading-inline">
            <div className="spinner-sm" />
            <span>Cargando citas...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <Mail size={48} strokeWidth={1.5} />
            </div>
            <h3>Sin citas aquí</h3>
            <p>
              {activeTab === 'todos'
                ? 'Cuando los clientes soliciten visitas, aparecerán aquí.'
                : `No hay citas con estado "${activeTab}".`}
            </p>
          </div>
        ) : (
          <div className="bm-list">
            {filtered.map(booking => {
              const StatusIcon  = STATUS_LABELS[booking.status]?.icon || Clock;
              const statusInfo  = STATUS_LABELS[booking.status] || STATUS_LABELS.pendiente;
              const isExpanded  = expanded === booking.id;
              const isUpdating  = updating === booking.id;

              return (
                <div
                  key={booking.id}
                  className={`bm-card bm-card--${statusInfo.class}`}
                >
                  {/* Cabecera */}
                  <div className="bm-card__head">
                    <div className="bm-card__client">
                      <div className="client-avatar">
                        {booking.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <strong>{booking.name}</strong>
                        <small>{booking.email}</small>
                      </div>
                    </div>

                    <div className="bm-card__meta">
                      <span className={`badge badge-${statusInfo.class}`}>
                        <StatusIcon size={12} />
                        {statusInfo.label}
                      </span>
                      <small className="bm-date">{formatDate(booking.createdAt)}</small>
                    </div>
                  </div>

                  {/* Info principal */}
                  <div className="bm-card__info">
                    <div className="bm-info-item">
                      <span className="bm-info-label">Propiedad</span>
                      <span>{booking.propertyTitle || '—'}</span>
                    </div>
                    <div className="bm-info-item">
                      <span className="bm-info-label">Teléfono</span>
                      <a href={`tel:${booking.phone}`} className="bm-phone">{booking.phone}</a>
                    </div>
                    <div className="bm-info-item">
                      <span className="bm-info-label">Fecha y hora</span>
                      <span>
                        {booking.date
                          ? `${booking.date} · ${booking.time || '—'}`
                          : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Mensaje */}
                  {booking.message && (
                    <div className="bm-message">
                      <button
                        className="bm-toggle"
                        onClick={() => setExpanded(isExpanded ? null : booking.id)}
                      >
                        {isExpanded ? '▲ Ocultar mensaje' : '▼ Ver mensaje del cliente'}
                      </button>
                      {isExpanded && (
                        <p className="bm-message-text">"{booking.message}"</p>
                      )}
                    </div>
                  )}

                  {/* Acciones */}
                  <div className="bm-card__actions">
                    <div className="bm-action-group">
                      {booking.status !== 'confirmada' && (
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() => changeStatus(booking.id, 'confirmada')}
                          disabled={isUpdating}
                        >
                          <CheckCircle size={14} />
                          {isUpdating ? '...' : 'Confirmar'}
                        </button>
                      )}
                      {booking.status !== 'pendiente' && (
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => changeStatus(booking.id, 'pendiente')}
                          disabled={isUpdating}
                          style={{ fontSize: '.75rem', padding: '.4rem .9rem' }}
                        >
                          <Clock size={14} />
                          {isUpdating ? '...' : 'Marcar pendiente'}
                        </button>
                      )}
                      {booking.status !== 'cancelada' && (
                        <button
                          className="btn btn-sm"
                          style={{ background: 'rgba(231,76,60,.08)', color: 'var(--danger)', border: '1px solid rgba(231,76,60,.25)' }}
                          onClick={() => changeStatus(booking.id, 'cancelada')}
                          disabled={isUpdating}
                        >
                          <X size={14} />
                          {isUpdating ? '...' : 'Cancelar'}
                        </button>
                      )}
                    </div>

                    <div className="bm-action-group">
                      <a href={`mailto:${booking.email}`} className="btn btn-sm btn-dark" title="Enviar email">
                        <Mail size={14} />
                        Email
                      </a>
                      <a href={`https://wa.me/${booking.phone?.replace(/\D/g, '')}`}
                        target="_blank" rel="noopener noreferrer"
                        className="btn btn-sm"
                        style={{ background: '#25D366', color: 'white' }}
                        title="WhatsApp"
                      >
                        <MessageSquare size={14} />
                        WhatsApp
                      </a>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => setDeleteId(booking.id)}
                        title="Eliminar cita"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal de confirmación */}
        {deleteId && (
          <div className="modal-overlay" onClick={() => setDeleteId(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal__icon">⚠️</div>
              <h3>¿Eliminar esta cita?</h3>
              <p>Esta acción no se puede deshacer.</p>
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

export default BookingManagement;
