// src/pages/AgentBlockedDates.jsx
// HU-006: Bloquear días específicos (vacaciones/feriados)
import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Calendar as CalendarIcon, X, Plus, AlertCircle } from 'lucide-react';
import './AgentBlockedDates.css';

function AgentBlockedDates() {
  const [agentId, setAgentId] = useState(null);
  const [blockedDates, setBlockedDates] = useState([]);
  const [newDate, setNewDate] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Cargar fechas bloqueadas
  useEffect(() => {
    const loadBlockedDates = async () => {
      if (!auth.currentUser) return;

      try {
        const employeesRef = collection(db, 'employees');
        const q = query(employeesRef, where('email', '==', auth.currentUser.email.toLowerCase()));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const agentData = snapshot.docs[0].data();
          const docId = snapshot.docs[0].id;
          setAgentId(docId);

          if (agentData.blockedDates) {
            setBlockedDates(agentData.blockedDates);
          }
        }
      } catch (err) {
        console.error('Error cargando fechas bloqueadas:', err);
        setMessage({ type: 'error', text: 'Error al cargar fechas' });
      } finally {
        setLoading(false);
      }
    };

    loadBlockedDates();
  }, []);

  const handleAddDate = async () => {
    if (!newDate) {
      setMessage({ type: 'error', text: 'Selecciona una fecha' });
      return;
    }

    if (!reason.trim()) {
      setMessage({ type: 'error', text: 'Escribe un motivo para el bloqueo' });
      return;
    }

    // Validar que la fecha no esté en el pasado
    const selectedDate = new Date(newDate + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      setMessage({ type: 'error', text: 'No puedes bloquear fechas pasadas' });
      return;
    }

    // Validar que no esté duplicada
    if (blockedDates.some(d => d.date === newDate)) {
      setMessage({ type: 'error', text: 'Esta fecha ya está bloqueada' });
      return;
    }

    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const newBlockedDates = [
        ...blockedDates,
        {
          date: newDate,
          reason: reason.trim(),
          createdAt: new Date().toISOString()
        }
      ];

      const agentRef = doc(db, 'employees', agentId);
      await updateDoc(agentRef, {
        blockedDates: newBlockedDates,
        updatedAt: new Date()
      });

      setBlockedDates(newBlockedDates);
      setNewDate('');
      setReason('');
      setMessage({ type: 'success', text: '✅ Fecha bloqueada correctamente' });
    } catch (err) {
      console.error('Error bloqueando fecha:', err);
      setMessage({ type: 'error', text: 'Error al guardar. Intenta de nuevo.' });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveDate = async (dateToRemove) => {
    if (!window.confirm('¿Desbloquear esta fecha?')) return;

    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const newBlockedDates = blockedDates.filter(d => d.date !== dateToRemove);

      const agentRef = doc(db, 'employees', agentId);
      await updateDoc(agentRef, {
        blockedDates: newBlockedDates,
        updatedAt: new Date()
      });

      setBlockedDates(newBlockedDates);
      setMessage({ type: 'success', text: '✅ Fecha desbloqueada' });
    } catch (err) {
      console.error('Error desbloqueando fecha:', err);
      setMessage({ type: 'error', text: 'Error al eliminar. Intenta de nuevo.' });
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('es-ES', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const getTodayString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  if (loading) {
    return (
      <div className="blocked-dates-container">
        <div className="loading">
          <div className="spinner" />
          <p>Cargando fechas bloqueadas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="blocked-dates-container">
      <div className="blocked-dates-header">
        <CalendarIcon size={32} />
        <h1>Bloquear Fechas</h1>
        <p>Marca días no disponibles (vacaciones, feriados, etc.)</p>
      </div>

      {message.text && (
        <div className={`message message-${message.type}`}>
          <AlertCircle size={18} />
          <span>{message.text}</span>
        </div>
      )}

      <div className="add-date-section">
        <h2>Agregar nueva fecha bloqueada</h2>
        
        <div className="add-date-form">
          <div className="form-group">
            <label>Fecha</label>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              min={getTodayString()}
            />
          </div>

          <div className="form-group">
            <label>Motivo</label>
            <input
              type="text"
              placeholder="Ej: Vacaciones, Feriado, Permiso personal"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={100}
            />
          </div>

          <button 
            onClick={handleAddDate} 
            className="btn-add"
            disabled={saving || !newDate || !reason.trim()}
          >
            <Plus size={18} />
            {saving ? 'Guardando...' : 'Bloquear Fecha'}
          </button>
        </div>
      </div>

      <div className="blocked-dates-list">
        <h2>
          Fechas bloqueadas 
          <span className="count">({blockedDates.length})</span>
        </h2>

        {blockedDates.length === 0 ? (
          <div className="empty-state">
            <CalendarIcon size={48} />
            <p>No tienes fechas bloqueadas</p>
            <span>Agrega fechas que no estarás disponible</span>
          </div>
        ) : (
          <div className="dates-grid">
            {blockedDates
              .sort((a, b) => new Date(a.date) - new Date(b.date))
              .map((blocked, index) => (
                <div key={index} className="date-card">
                  <div className="date-info">
                    <div className="date-main">{formatDate(blocked.date)}</div>
                    <div className="date-reason">{blocked.reason}</div>
                  </div>
                  
                  <button 
                    onClick={() => handleRemoveDate(blocked.date)}
                    className="btn-remove"
                    disabled={saving}
                    title="Desbloquear fecha"
                  >
                    <X size={18} />
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>

      <div className="blocked-dates-info">
        <AlertCircle size={16} />
        <p>Las fechas bloqueadas no estarán disponibles para asignación de citas en el calendario del administrador.</p>
      </div>
    </div>
  );
}

export default AgentBlockedDates;
