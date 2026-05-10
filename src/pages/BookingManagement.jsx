// src/pages/BookingManagement.jsx
// Con reasignación de citas a otros agentes
import React, { useState, useEffect, useMemo } from 'react';
import {
  collection, getDocs, updateDoc, deleteDoc,
  doc, query, orderBy, serverTimestamp, where
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  RefreshCw, Mail, Clock, CheckCircle, X, 
  Phone, MessageSquare, Trash2, ClipboardList, Calendar, UserCheck 
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
  const [agents,      setAgents]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [activeTab,   setActiveTab]   = useState('todos');
  const [deleteId,    setDeleteId]    = useState(null);
  const [updating,    setUpdating]    = useState(null);
  const [expanded,    setExpanded]    = useState(null);
  
  // Estados para asignación
  const [assigningId, setAssigningId] = useState(null);
  const [assignForm,  setAssignForm]  = useState({ date: '', time: '' });

  // ← NUEVO: Estados para reasignación
  const [reassigningId, setReassigningId] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [validating, setValidating] = useState(false);

  // ← NUEVO: Estado para rol del usuario
  const [userRole, setUserRole] = useState('');

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const status = params.get('status');
    if (status && ['pendiente', 'confirmada', 'cancelada'].includes(status)) {
      setActiveTab(status);
    }
  }, [location.search]);

  useEffect(() => { loadData(); }, []);

  // ← NUEVO: Cargar rol del usuario actual
  useEffect(() => {
    const loadUserRole = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const employeesSnap = await getDocs(
          query(collection(db, 'employees'), where('email', '==', user.email.toLowerCase()))
        );
        
        if (!employeesSnap.empty) {
          const userData = employeesSnap.docs[0].data();
          setUserRole(userData.role || 'agente');
        }
      } catch (err) {
        console.error('Error cargando rol:', err);
      }
    };

    loadUserRole();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Cargar citas
      let bookingsData = [];
      try {
        const snap = await getDocs(
          query(collection(db, 'bookings'), orderBy('createdAt', 'desc'))
        );
        bookingsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch {
        const snap = await getDocs(collection(db, 'bookings'));
        bookingsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      }
      setBookings(bookingsData);

      // ← NUEVO: Cargar agentes activos
      const agentsSnap = await getDocs(
        query(collection(db, 'employees'), where('status', '==', 'activo'))
      );
      const agentsData = agentsSnap.docs.map(d => ({ 
        id: d.id, 
        ...d.data() 
      }));
      setAgents(agentsData);

    } catch (err) {
      console.error('Error cargando datos:', err);
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

  // Asignación de fecha/hora
  const openAssignModal = (booking) => {
    setAssigningId(booking.id);
    setAssignForm({
      date: booking.date || '',
      time: booking.time || '',
    });
  };

  const closeAssignModal = () => {
    setAssigningId(null);
    setAssignForm({ date: '', time: '' });
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    
    if (!assignForm.date || !assignForm.time) {
      alert('Por favor selecciona fecha y hora.');
      return;
    }

    setUpdating(assigningId);
    try {
      // ← NUEVO: Obtener email del usuario actual
      const currentUser = auth.currentUser;
      const userEmail = currentUser?.email?.toLowerCase() || '';

      await updateDoc(doc(db, 'bookings', assigningId), {
        date: assignForm.date,
        time: assignForm.time,
        status: 'confirmada',
        assignedTo: userEmail, // ← NUEVO: Guardar quién asignó
        updatedAt: serverTimestamp(),
      });

      setBookings(prev =>
        prev.map(b => b.id === assigningId 
          ? { ...b, date: assignForm.date, time: assignForm.time, status: 'confirmada', assignedTo: userEmail }
          : b
        )
      );

      closeAssignModal();

      // HU-028: Trigger automático cita → venta
      const confirmedBooking = bookings.find(b => b.id === assigningId);
      const registerSale = window.confirm(
        '✅ Cita confirmada.\n\n¿Deseas registrar esta cita como venta ahora?'
      );
      if (registerSale) {
        const salesPath = location.pathname.startsWith('/agent') ? '/agent/sales' : '/admin/sales';
        navigate(salesPath, {
          state: {
            fromBooking: {
              bookingId: assigningId,
              propertyId: confirmedBooking?.propertyId || '',
              clientEmail: confirmedBooking?.email || '',
              assignedTo: userEmail,
            }
          }
        });
      } else {
        alert('✅ Cita confirmada y fecha asignada');
      }
    } catch (err) {
      console.error('Error asignando cita:', err);
      alert('Error al asignar la cita.');
    } finally {
      setUpdating(null);
    }
  };

  // ← NUEVO: Reasignación de agente
  const openReassignModal = (booking) => {
    setReassigningId(booking.id);
    setSelectedAgent(booking.assignedTo || '');
  };

  const closeReassignModal = () => {
    setReassigningId(null);
    setSelectedAgent('');
    setValidating(false);
  };

  const validateAvailability = async () => {
    const booking = bookings.find(b => b.id === reassigningId);
    if (!booking || !booking.date || !booking.time || !selectedAgent) {
      return true; // Si no hay fecha/hora, no validamos
    }

    setValidating(true);
    try {
      // Buscar conflictos: mismo agente, misma fecha/hora
      const conflictsSnap = await getDocs(
        query(
          collection(db, 'bookings'),
          where('assignedTo', '==', selectedAgent),
          where('date', '==', booking.date),
          where('status', '==', 'confirmada')
        )
      );

      const conflicts = conflictsSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(b => b.id !== reassigningId && b.time === booking.time);

      if (conflicts.length > 0) {
        alert(`⚠️ El agente ya tiene una cita confirmada a las ${booking.time} ese día.`);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Error validando disponibilidad:', err);
      return true; // En caso de error, permitimos la reasignación
    } finally {
      setValidating(false);
    }
  };

  const handleReassign = async () => {
    if (!selectedAgent) {
      alert('Por favor selecciona un agente.');
      return;
    }

    // Validar disponibilidad
    const isAvailable = await validateAvailability();
    if (!isAvailable) return;

    const agent = agents.find(a => a.email === selectedAgent);
    if (!agent) {
      alert('Agente no encontrado.');
      return;
    }

    if (!confirm(`¿Reasignar esta cita a ${agent.name}?`)) {
      return;
    }

    setUpdating(reassigningId);
    try {
      await updateDoc(doc(db, 'bookings', reassigningId), {
        assignedTo: selectedAgent,
        assignedToName: agent.name,
        updatedAt: serverTimestamp(),
      });

      setBookings(prev =>
        prev.map(b => b.id === reassigningId 
          ? { ...b, assignedTo: selectedAgent, assignedToName: agent.name }
          : b
        )
      );

      closeReassignModal();
      alert(`✅ Cita reasignada a ${agent.name}`);
    } catch (err) {
      console.error('Error reasignando cita:', err);
      alert('Error al reasignar la cita.');
    } finally {
      setUpdating(null);
    }
  };

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
          <button className="btn btn-dark" onClick={loadData}>
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
                    {/* ← NUEVO: Mostrar agente asignado */}
                    {booking.assignedToName && (
                      <div className="bm-info-item">
                        <span className="bm-info-label">Agente asignado</span>
                        <span className="agent-name">
                          <UserCheck size={14} />
                          {booking.assignedToName}
                        </span>
                      </div>
                    )}
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
                      {booking.status === 'pendiente' && (
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() => openAssignModal(booking)}
                          disabled={isUpdating}
                        >
                          <Calendar size={14} />
                          {isUpdating ? '...' : 'Asignar'}
                        </button>
                      )}
                      
                      {/* ← NUEVO: Botón reasignar (solo confirmadas Y solo admins) */}
                      {booking.status === 'confirmada' && agents.length > 0 && userRole === 'admin' && (
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={() => openReassignModal(booking)}
                          disabled={isUpdating}
                          title="Reasignar a otro agente"
                        >
                          <UserCheck size={14} />
                          {isUpdating ? '...' : 'Reasignar'}
                        </button>
                      )}

                      {booking.status === 'confirmada' && (
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

        {/* Modal de asignación de fecha/hora */}
        {assigningId && (
          <div className="modal-overlay" onClick={closeAssignModal}>
            <div className="modal modal-assign" onClick={(e) => e.stopPropagation()}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '1.5rem' }}>
                <Calendar size={24} />
                Asignar fecha y hora
              </h3>

              <form onSubmit={handleAssign}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  
                  <div className="form-group">
                    <label htmlFor="assign-date" style={{ display: 'block', marginBottom: '.5rem', fontWeight: 600 }}>
                      Fecha de la visita *
                    </label>
                    <input
                      type="date"
                      id="assign-date"
                      value={assignForm.date}
                      onChange={(e) => setAssignForm(prev => ({ ...prev, date: e.target.value }))}
                      className="form-control"
                      required
                      min={new Date().toISOString().split('T')[0]}
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="assign-time" style={{ display: 'block', marginBottom: '.5rem', fontWeight: 600 }}>
                      Hora de la visita *
                    </label>
                    <select
                      id="assign-time"
                      value={assignForm.time}
                      onChange={(e) => setAssignForm(prev => ({ ...prev, time: e.target.value }))}
                      className="form-control"
                      required
                      style={{ width: '100%' }}
                    >
                      <option value="">Seleccionar hora</option>
                      <option value="08:00 AM">08:00 AM</option>
                      <option value="09:00 AM">09:00 AM</option>
                      <option value="10:00 AM">10:00 AM</option>
                      <option value="11:00 AM">11:00 AM</option>
                      <option value="12:00 PM">12:00 PM</option>
                      <option value="01:00 PM">01:00 PM</option>
                      <option value="02:00 PM">02:00 PM</option>
                      <option value="03:00 PM">03:00 PM</option>
                      <option value="04:00 PM">04:00 PM</option>
                      <option value="05:00 PM">05:00 PM</option>
                      <option value="06:00 PM">06:00 PM</option>
                    </select>
                  </div>

                </div>

                <div className="modal__actions" style={{ marginTop: '1.5rem' }}>
                  <button 
                    type="button" 
                    className="btn btn-outline" 
                    onClick={closeAssignModal}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-success"
                    disabled={updating === assigningId}
                  >
                    <CheckCircle size={16} />
                    {updating === assigningId ? 'Confirmando...' : 'Confirmar cita'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ← NUEVO: Modal de reasignación */}
        {reassigningId && (
          <div className="modal-overlay" onClick={closeReassignModal}>
            <div className="modal modal-assign" onClick={(e) => e.stopPropagation()}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '1.5rem' }}>
                <UserCheck size={24} />
                Reasignar cita
              </h3>

              <div className="form-group">
                <label htmlFor="agent-select" style={{ display: 'block', marginBottom: '.5rem', fontWeight: 600 }}>
                  Seleccionar agente *
                </label>
                <select
                  id="agent-select"
                  value={selectedAgent}
                  onChange={(e) => setSelectedAgent(e.target.value)}
                  className="form-control"
                  style={{ width: '100%' }}
                >
                  <option value="">-- Selecciona un agente --</option>
                  {agents.map(agent => (
                    <option key={agent.id} value={agent.email}>
                      {agent.name} ({agent.email})
                    </option>
                  ))}
                </select>
              </div>

              <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '1rem' }}>
                Se verificará la disponibilidad del agente antes de reasignar.
              </p>

              <div className="modal__actions" style={{ marginTop: '1.5rem' }}>
                <button 
                  type="button" 
                  className="btn btn-outline" 
                  onClick={closeReassignModal}
                >
                  Cancelar
                </button>
                <button 
                  type="button" 
                  className="btn btn-success"
                  onClick={handleReassign}
                  disabled={updating === reassigningId || validating || !selectedAgent}
                >
                  <UserCheck size={16} />
                  {validating ? 'Validando...' : updating === reassigningId ? 'Reasignando...' : 'Reasignar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de confirmación de eliminación */}
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
