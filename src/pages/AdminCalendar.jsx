// src/pages/AdminCalendar.jsx
// Vista de calendario global para admin
import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Calendar as CalendarIcon, User, Phone, Mail, MapPin, Clock, Filter } from 'lucide-react';
import Calendar from '../components/Calendar';
import './AdminCalendar.css';

function AdminCalendar() {
  const [allBookings, setAllBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedBookings, setSelectedBookings] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterBookings();
  }, [selectedAgent, allBookings]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      // Cargar todas las citas confirmadas
      const q = query(
        collection(db, 'bookings'),
        where('status', '==', 'confirmada')
      );
      
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      console.log('Citas cargadas (admin):', data);

      setAllBookings(data);

      // ← CORREGIDO: Cargar agentes de la colección employees
      const employeesSnap = await getDocs(collection(db, 'employees'));
      const employeesData = employeesSnap.docs.map(d => ({
        email: d.data().email,
        name: d.data().name,
      }));
      setAgents(employeesData);

    } catch (err) {
      console.error('Error cargando datos:', err);
      setError('Error al cargar el calendario');
    } finally {
      setLoading(false);
    }
  };

  const filterBookings = () => {
    if (selectedAgent === 'all') {
      setFilteredBookings(allBookings);
    } else {
      // Filtrar por agente asignado
      setFilteredBookings(allBookings.filter(b => b.assignedTo === selectedAgent));
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
    today: filteredBookings.filter(b => b.date === new Date().toISOString().split('T')[0]).length,
    thisWeek: filteredBookings.filter(b => {
      const bookingDate = new Date(b.date);
      const today = new Date();
      const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      return bookingDate >= today && bookingDate <= weekFromNow;
    }).length,
    total: filteredBookings.length,
  };

  if (loading) {
    return (
      <div className="admin-calendar-page">
        <div className="admin-calendar-container">
          <div className="loading-inline">
            <div className="spinner-sm" />
            <span>Cargando calendario...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-calendar-page">
      <div className="admin-calendar-container">

        {/* Header */}
        <div className="calendar-page-header">
          <div>
            <h1 className="dash-title">Calendario Global</h1>
            <p className="dash-sub">
              {filteredBookings.length} cita{filteredBookings.length !== 1 ? 's' : ''} confirmada{filteredBookings.length !== 1 ? 's' : ''}
              {selectedAgent !== 'all' && ' para este agente'}
            </p>
          </div>

          {/* Filtro de agentes */}
          {agents.length > 0 && (
            <div className="agent-filter">
              <label htmlFor="agent-select">
                <Filter size={16} />
                Filtrar por agente:
              </label>
              <select
                id="agent-select"
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                className="agent-select"
              >
                <option value="all">Todos los agentes</option>
                {agents.map(agent => (
                  <option key={agent.email} value={agent.email}>
                    {agent.name}
                  </option>
                ))}
              </select>
            </div>
          )}
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
            bookings={filteredBookings} 
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

export default AdminCalendar;
