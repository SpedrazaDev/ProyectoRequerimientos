// src/pages/AgentAvailability.jsx
// HU-005: Configurar días y horas de trabajo
import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Clock, Save, AlertCircle } from 'lucide-react';
import './AgentAvailability.css';

const DAYS_OF_WEEK = [
  { id: 'monday', label: 'Lunes' },
  { id: 'tuesday', label: 'Martes' },
  { id: 'wednesday', label: 'Miércoles' },
  { id: 'thursday', label: 'Jueves' },
  { id: 'friday', label: 'Viernes' },
  { id: 'saturday', label: 'Sábado' },
  { id: 'sunday', label: 'Domingo' }
];

function AgentAvailability() {
  const [agentId, setAgentId] = useState(null);
  const [availability, setAvailability] = useState({
    monday: { enabled: false, start: '09:00', end: '18:00' },
    tuesday: { enabled: false, start: '09:00', end: '18:00' },
    wednesday: { enabled: false, start: '09:00', end: '18:00' },
    thursday: { enabled: false, start: '09:00', end: '18:00' },
    friday: { enabled: false, start: '09:00', end: '18:00' },
    saturday: { enabled: false, start: '09:00', end: '14:00' },
    sunday: { enabled: false, start: '09:00', end: '14:00' }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Cargar disponibilidad actual
  useEffect(() => {
    const loadAvailability = async () => {
      if (!auth.currentUser) return;

      try {
        const employeesRef = collection(db, 'employees');
        const q = query(employeesRef, where('email', '==', auth.currentUser.email.toLowerCase()));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const agentData = snapshot.docs[0].data();
          const docId = snapshot.docs[0].id;
          setAgentId(docId);

          if (agentData.availability) {
            setAvailability(agentData.availability);
          }
        }
      } catch (err) {
        console.error('Error cargando disponibilidad:', err);
        setMessage({ type: 'error', text: 'Error al cargar configuración' });
      } finally {
        setLoading(false);
      }
    };

    loadAvailability();
  }, []);

  const toggleDay = (dayId) => {
    setAvailability(prev => ({
      ...prev,
      [dayId]: {
        ...prev[dayId],
        enabled: !prev[dayId].enabled
      }
    }));
  };

  const updateTime = (dayId, field, value) => {
    setAvailability(prev => ({
      ...prev,
      [dayId]: {
        ...prev[dayId],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    if (!agentId) {
      setMessage({ type: 'error', text: 'No se encontró tu perfil de agente' });
      return;
    }

    // Validar que al menos un día esté habilitado
    const hasEnabledDays = Object.values(availability).some(day => day.enabled);
    if (!hasEnabledDays) {
      setMessage({ type: 'error', text: 'Debes habilitar al menos un día de trabajo' });
      return;
    }

    // Validar horarios
    for (const [dayId, config] of Object.entries(availability)) {
      if (config.enabled && config.start >= config.end) {
        const dayLabel = DAYS_OF_WEEK.find(d => d.id === dayId).label;
        setMessage({ 
          type: 'error', 
          text: `${dayLabel}: La hora de inicio debe ser menor a la hora de fin` 
        });
        return;
      }
    }

    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const agentRef = doc(db, 'employees', agentId);
      await updateDoc(agentRef, {
        availability: availability,
        updatedAt: new Date()
      });

      setMessage({ type: 'success', text: '✅ Disponibilidad actualizada correctamente' });
    } catch (err) {
      console.error('Error guardando disponibilidad:', err);
      setMessage({ type: 'error', text: 'Error al guardar. Intenta de nuevo.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="agent-dark-page">
        <div className="availability-container">
          <div className="loading">
            <div className="spinner" />
            <p>Cargando configuración...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="agent-dark-page">
    <div className="availability-container">
      <div className="availability-header">
        <Clock size={32} />
        <h1>Configurar Disponibilidad</h1>
        <p>Define tus días y horarios de trabajo</p>
      </div>

      {message.text && (
        <div className={`message message-${message.type}`}>
          <AlertCircle size={18} />
          <span>{message.text}</span>
        </div>
      )}

      <div className="availability-grid">
        {DAYS_OF_WEEK.map(day => (
          <div key={day.id} className="day-card">
            <div className="day-header">
              <label className="checkbox-wrapper">
                <input
                  type="checkbox"
                  checked={availability[day.id].enabled}
                  onChange={() => toggleDay(day.id)}
                />
                <span className="day-label">{day.label}</span>
              </label>
            </div>

            {availability[day.id].enabled && (
              <div className="time-inputs">
                <div className="time-group">
                  <label>Inicio</label>
                  <input
                    type="time"
                    value={availability[day.id].start}
                    onChange={(e) => updateTime(day.id, 'start', e.target.value)}
                  />
                </div>

                <div className="time-separator">→</div>

                <div className="time-group">
                  <label>Fin</label>
                  <input
                    type="time"
                    value={availability[day.id].end}
                    onChange={(e) => updateTime(day.id, 'end', e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="availability-actions">
        <button 
          onClick={handleSave} 
          className="btn-save"
          disabled={saving}
        >
          <Save size={18} />
          {saving ? 'Guardando...' : 'Guardar Configuración'}
        </button>
      </div>

      <div className="availability-info">
        <AlertCircle size={16} />
        <p>Esta configuración será usada al momento de asignar citas. Solo se mostrarán los horarios disponibles.</p>
      </div>
    </div>
    </div>
  );
}

export default AgentAvailability;
