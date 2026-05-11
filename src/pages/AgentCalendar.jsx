// src/pages/AgentCalendar.jsx
// Vista de calendario personal del agente
import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Calendar as CalendarIcon, User, Phone, Mail, MapPin, Clock } from 'lucide-react';
import Calendar from '../components/Calendar';
import './AgentCalendar.css';

function AgentCalendar() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedBookings, setSelectedBookings] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    setLoading(true);
    setError('');
    try {
      const user = auth.currentUser;
      if (!user) {
        setError('Usuario no autenticado');
        return;
      }

      // ← CORREGIDO: Cargar citas asignadas a este agente
      const q = query(
        collection(db, 'bookings'),
        where('status', '==', 'confirmada'),
        where('assignedTo', '==', user.email.toLowerCase())
      );
      
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      console.log('Citas cargadas (agente):', data);

      setBookings(data);
    } catch (err) {
      console.error('Error cargando citas:', err);
      setError('Error al cargar las citas');
    } finally {
      setLoading(false);
    }
  };

  const handleDateClick = (dateKey, dayBookings) => {
    setSelectedDate(dateKey);
    setSelectedBookings(dayBookings);
  };

  const closeSidebar = () => {
    setSelectedDate(null);
    setSelectedBookings([]);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const date = new Date(y, m - 1, d); // local date — avoids UTC midnight shift
      return date.toLocaleDateString('es-CR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Estadísticas
  const stats = {
    today: bookings.filter(b => b.date === new Date().toISOString().split('T')[0]).length,
    thisWeek: bookings.filter(b => {
      const bookingDate = new Date(b.date);
      const today = new Date();
      const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      return bookingDate >= today && bookingDate <= weekFromNow;
    }).length,
    total: bookings.length,
  };

  if (loading) {
    return (
      <div className="agent-calendar-page">
        <div className="agent-calendar-container">
          <div className="loading-inline">
            <div className="spinner-sm" />
            <span>Cargando calendario...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="agent-calendar-page">
      <div className="agent-calendar-container">

        {/* Header */}
        <div className="calendar-page-header">
          <h1 className="dash-title">Mi Calendario</h1>
          <p className="dash-sub">
            {bookings.length} cita{bookings.length !== 1 ? 's' : ''} confirmada{bookings.length !== 1 ? 's' : ''}
          </p>
        </div>

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        {/* Estadísticas */}
        <div className="calendar-stats">
          <div className="stat-card">
            <div className="stat-card__icon">
              <CalendarIcon size={24} />
            </div>
            <div className="stat-card__info">
              <span className="stat-card__label">Hoy</span>
              <span className="stat-card__value">{stats.today}</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card__icon">
              <Clock size={24} />
            </div>
            <div className="stat-card__info">
              <span className="stat-card__label">Esta semana</span>
              <span className="stat-card__value">{stats.thisWeek}</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card__icon">
              <User size={24} />
            </div>
            <div className="stat-card__info">
              <span className="stat-card__label">Total</span>
              <span className="stat-card__value">{stats.total}</span>
            </div>
          </div>
        </div>

        {/* Calendario */}
        <div className="calendar-section">
          <Calendar 
            bookings={bookings} 
            onDateClick={handleDateClick}
          />
        </div>

        {/* Sidebar con detalles */}
        {selectedDate && selectedBookings.length > 0 && (
          <div className="calendar-sidebar-overlay" onClick={closeSidebar}>
            <div className="calendar-sidebar" onClick={(e) => e.stopPropagation()}>
              <div className="sidebar-header">
                <h3>
                  <CalendarIcon size={20} />
                  {formatDate(selectedDate)}
                </h3>
                <button className="sidebar-close" onClick={closeSidebar}>
                  ×
                </button>
              </div>

              <div className="sidebar-bookings">
                {selectedBookings.map(booking => (
                  <div key={booking.id} className="sidebar-booking">
                    <div className="sidebar-booking__time">
                      <Clock size={16} />
                      {booking.time || 'Sin hora'}
                    </div>
                    
                    <div className="sidebar-booking__property">
                      <strong>{booking.propertyTitle}</strong>
                    </div>

                    <div className="sidebar-booking__client">
                      <User size={14} />
                      {booking.name || booking.clientName}
                    </div>

                    <div className="sidebar-booking__contact">
                      {booking.phone && (
                        <a href={`tel:${booking.phone}`}>
                          <Phone size={14} />
                          {booking.phone}
                        </a>
                      )}
                      {booking.email && (
                        <a href={`mailto:${booking.email}`}>
                          <Mail size={14} />
                          {booking.email}
                        </a>
                      )}
                    </div>

                    {booking.message && (
                      <div className="sidebar-booking__message">
                        <strong>Mensaje:</strong>
                        <p>{booking.message}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default AgentCalendar;
