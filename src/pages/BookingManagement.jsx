// src/pages/BookingManagement.jsx
// ─────────────────────────────────────────────────────────────────────
//  Gestión de citas solicitadas por los clientes.
//  • Ver todas las citas con información del cliente
//  • Filtrar por estado (pendiente / confirmada / cancelada)
//  • Cambiar estado de cada cita
//  • Eliminar citas
// ─────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useMemo } from 'react';
import {
  collection, getDocs, updateDoc, deleteDoc,
  doc, query, orderBy
} from 'firebase/firestore';
import { db } from '../firebase';
import { useLocation } from 'react-router-dom';
import './BookingManagement.css';

// Formato de fecha legible
const formatDate = (ts) => {
  if (!ts) return '—';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return new Intl.DateTimeFormat('es-CR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(d);
};

const STATUS_LABELS = {
  pendiente:  { icon: '⏳', label: 'Pendiente',  class: 'pending'   },
  confirmada: { icon: '✅', label: 'Confirmada', class: 'confirmed' },
  cancelada:  { icon: '❌', label: 'Cancelada',  class: 'cancelled' },
};

function BookingManagement() {
  const [bookings,    setBookings]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [activeTab,   setActiveTab]   = useState('todos');
  const [deleteId,    setDeleteId]    = useState(null);
  const [updating,    setUpdating]    = useState(null); // id de la cita que se está actualizando
  const [expanded,    setExpanded]    = useState(null); // id de cita expandida

  const location = useLocation();

  // Leer filtro inicial de la URL (ej: /admin/bookings?status=pendiente)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const status = params.get('status');
    if (status && ['pendiente', 'confirmada', 'cancelada'].includes(status)) {
      setActiveTab(status);
    }
  }, [location.search]);

  // ── Cargar citas ──
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

  // ── Filtrar por pestaña ──
  const filtered = useMemo(() => {
    if (activeTab === 'todos') return bookings;
    return bookings.filter(b => b.status === activeTab);
  }, [bookings, activeTab]);

  // Contar por estado
  const counts = useMemo(() => ({
    todos:     bookings.length,
    pendiente: bookings.filter(b => b.status === 'pendiente').length,
    confirmada:bookings.filter(b => b.status === 'confirmada').length,
    cancelada: bookings.filter(b => b.status === 'cancelada').length,
  }), [bookings]);

  // ── Cambiar estado de cita ──
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

  // ── Eliminar cita ──
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

  // ── Renderizado ──
  return (
    <div className="admin-page">
      <div className="admin-container">

        {/* ── Header ── */}
        <div className="bm-header">
          <div>
            <h1 className="dash-title">Gestión de Citas</h1>
            <p className="dash-sub">
              {bookings.length} solicitud{bookings.length !== 1 ? 'es' : ''} en total
            </p>
          </div>
          <button className="btn btn-dark" onClick={loadBookings}>
            ↺ Actualizar
          </button>
        </div>

        {/* ── Tabs de filtro ── */}
        <div className="bm-tabs">
          {['todos', 'pendiente', 'confirmada', 'cancelada'].map(tab => (
            <button
              key={tab}
              className={`bm-tab ${activeTab === tab ? 'bm-tab--active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'todos'     && '📋 '}
              {tab === 'pendiente' && '⏳ '}
              {tab === 'confirmada' && '✅ '}
              {tab === 'cancelada' && '❌ '}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              <span className="bm-tab-count">{counts[tab]}</span>
            </button>
          ))}
        </div>

        {/* ── Lista de citas ── */}
        {loading ? (
          <div className="loading-inline">
            <div className="spinner-sm" />
            <span>Cargando citas...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
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
              const statusInfo  = STATUS_LABELS[booking.status] || STATUS_LABELS.pendiente;
              const isExpanded  = expanded === booking.id;
              const isUpdating  = updating === booking.id;

              return (
                <div
                  key={booking.id}
                  className={`bm-card bm-card--${statusInfo.class}`}
                >
                  {/* ── Cabecera de la tarjeta ── */}
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
                        {statusInfo.icon} {statusInfo.label}
                      </span>
                      <small className="bm-date">{formatDate(booking.createdAt)}</small>
                    </div>
                  </div>

                  {/* ── Info principal ── */}
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

                  {/* ── Mensaje (expandible) ── */}
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

                  {/* ── Acciones ── */}
                  <div className="bm-card__actions">
                    <div className="bm-action-group">
                      {/* Botones de cambio de estado */}
                      {booking.status !== 'confirmada' && (
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() => changeStatus(booking.id, 'confirmada')}
                          disabled={isUpdating}
                        >
                          {isUpdating ? '...' : '✅ Confirmar'}
                        </button>
                      )}
                      {booking.status !== 'pendiente' && (
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => changeStatus(booking.id, 'pendiente')}
                          disabled={isUpdating}
                          style={{ fontSize: '0.75rem', padding: '0.4rem 0.9rem' }}
                        >
                          {isUpdating ? '...' : '⏳ Marcar pendiente'}
                        </button>
                      )}
                      {booking.status !== 'cancelada' && (
                        <button
                          className="btn btn-sm"
                          style={{ background: 'rgba(231,76,60,0.08)', color: 'var(--danger)', border: '1px solid rgba(231,76,60,0.25)', fontSize: '0.75rem', padding: '0.4rem 0.9rem' }}
                          onClick={() => changeStatus(booking.id, 'cancelada')}
                          disabled={isUpdating}
                        >
                          {isUpdating ? '...' : '❌ Cancelar'}
                        </button>
                      )}
                    </div>

                    <div className="bm-action-group">
                      {/* Contacto rápido */}
                      <a href={`mailto:${booking.email}`} className="btn btn-sm btn-dark" title="Enviar email">
                        ✉️ Email
                      </a>
                      <a href={`https://wa.me/${booking.phone?.replace(/\D/g, '')}`}
                        target="_blank" rel="noopener noreferrer"
                        className="btn btn-sm"
                        style={{ background: '#25D366', color: 'white' }}
                        title="WhatsApp"
                      >
                        💬 WhatsApp
                      </a>
                      {/* Eliminar */}
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => setDeleteId(booking.id)}
                        title="Eliminar cita"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Modal de confirmación de eliminación ── */}
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
