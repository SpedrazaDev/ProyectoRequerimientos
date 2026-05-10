// src/components/Calendar.jsx
// Calendario mensual reutilizable
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import './Calendar.css';

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function Calendar({ bookings = [], onDateClick }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const today = new Date();
  const isToday = (day) => {
    return day === today.getDate() &&
           month === today.getMonth() &&
           year === today.getFullYear();
  };

  // Agrupar citas por fecha
  const getBookingsForDate = (dateStr) => {
    return bookings.filter(b => b.date === dateStr);
  };

  const formatDateKey = (day) => {
    const d = new Date(year, month, day);
    return d.toISOString().split('T')[0];
  };

  // Generar días del calendario
  const calendarDays = [];

  // Días del mes anterior
  for (let i = firstDay - 1; i >= 0; i--) {
    calendarDays.push({
      day: daysInPrevMonth - i,
      isCurrentMonth: false,
      isPrevMonth: true,
    });
  }

  // Días del mes actual
  for (let day = 1; day <= daysInMonth; day++) {
    const dateKey = formatDateKey(day);
    const dayBookings = getBookingsForDate(dateKey);

    calendarDays.push({
      day,
      isCurrentMonth: true,
      isToday: isToday(day),
      bookings: dayBookings,
      dateKey,
    });
  }

  // Días del siguiente mes para completar la grilla
  const remainingDays = 42 - calendarDays.length;
  for (let day = 1; day <= remainingDays; day++) {
    calendarDays.push({
      day,
      isCurrentMonth: false,
      isNextMonth: true,
    });
  }

  return (
    <div className="calendar">
      
      {/* Header */}
      <div className="calendar-header">
        <button className="calendar-nav" onClick={prevMonth}>
          <ChevronLeft size={20} />
        </button>
        <h3 className="calendar-title">
          <CalendarIcon size={18} />
          {MONTHS[month]} {year}
        </h3>
        <button className="calendar-nav" onClick={nextMonth}>
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Días de la semana */}
      <div className="calendar-weekdays">
        {DAYS.map(day => (
          <div key={day} className="calendar-weekday">
            {day}
          </div>
        ))}
      </div>

      {/* Grilla de días */}
      <div className="calendar-grid">
        {calendarDays.map((item, index) => (
          <div
            key={index}
            className={`calendar-day ${
              !item.isCurrentMonth ? 'calendar-day--other' : ''
            } ${
              item.isToday ? 'calendar-day--today' : ''
            } ${
              item.bookings && item.bookings.length > 0 ? 'calendar-day--has-bookings' : ''
            }`}
            onClick={() => {
              if (item.isCurrentMonth && onDateClick) {
                onDateClick(item.dateKey, item.bookings || []);
              }
            }}
          >
            <span className="calendar-day-number">{item.day}</span>
            
            {item.bookings && item.bookings.length > 0 && (
              <div className="calendar-day-bookings">
                {item.bookings.slice(0, 3).map((booking, i) => (
                  <div
                    key={i}
                    className={`calendar-booking calendar-booking--${booking.status}`}
                    title={`${booking.time} - ${booking.name}`}
                  >
                    <span className="calendar-booking-time">{booking.time}</span>
                    <span className="calendar-booking-name">{booking.name}</span>
                  </div>
                ))}
                {item.bookings.length > 3 && (
                  <div className="calendar-booking-more">
                    +{item.bookings.length - 3} más
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

    </div>
  );
}

export default Calendar;
