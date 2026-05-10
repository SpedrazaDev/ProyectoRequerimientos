// src/App.jsx
// COMPLETO: Con rutas de Fase 3
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';

// Components
import Navbar from './components/Navbar';

// Pages - Public
import ClientHome from './pages/ClientHome';
import PropertyDetail from './components/PropertyDetail';

// Pages - Auth
import AdminLogin from './pages/AdminLogin';

// Pages - Admin
import AdminDashboard from './pages/AdminDashboard';
import PropertyManagement from './pages/PropertyManagement';
import BookingManagement from './pages/BookingManagement';
import EmployeeManagement from './pages/EmployeeManagement';
import AdminCalendar from './pages/AdminCalendar';
import SalesReport from './pages/SalesReport';
import Reports from './pages/Reports';
import SalesFunnel from './pages/SalesFunnel';

// Pages - Agent
import AgentDashboard from './pages/AgentDashboard';
import AgentCalendar from './pages/AgentCalendar';
import SalesManagement from './pages/SalesManagement';

import './App.css';

function ProtectedRoute({ children, user }) {
  return user ? children : <Navigate to="/admin/login" replace />;
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'var(--dark)',
        color: 'var(--white)',
      }}>
        <div className="loading-inline">
          <div className="spinner-sm" />
          <span>Cargando aplicación...</span>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="app">
        <Navbar adminUser={user} />
        
        <Routes>
          {/* RUTAS PÚBLICAS */}
          <Route path="/" element={<ClientHome />} />
          <Route path="/property/:id" element={<PropertyDetail />} />

          {/* LOGIN UNIVERSAL */}
          <Route path="/admin/login" element={
            user ? <Navigate to="/admin" replace /> : <AdminLogin />
          } />

          {/* RUTAS DE ADMIN */}
          <Route path="/admin" element={
            <ProtectedRoute user={user}>
              <AdminDashboard />
            </ProtectedRoute>
          } />

          <Route path="/admin/properties" element={
            <ProtectedRoute user={user}>
              <PropertyManagement />
            </ProtectedRoute>
          } />

          <Route path="/admin/bookings" element={
            <ProtectedRoute user={user}>
              <BookingManagement />
            </ProtectedRoute>
          } />

          <Route path="/admin/employees" element={
            <ProtectedRoute user={user}>
              <EmployeeManagement />
            </ProtectedRoute>
          } />

          <Route path="/admin/calendar" element={
            <ProtectedRoute user={user}>
              <AdminCalendar />
            </ProtectedRoute>
          } />

          <Route path="/admin/sales" element={
            <ProtectedRoute user={user}>
              <SalesReport />
            </ProtectedRoute>
          } />

          {/* FASE 3: Reportes y Embudo */}
          <Route path="/admin/reports" element={
            <ProtectedRoute user={user}>
              <Reports />
            </ProtectedRoute>
          } />

          <Route path="/admin/funnel" element={
            <ProtectedRoute user={user}>
              <SalesFunnel />
            </ProtectedRoute>
          } />

          {/* RUTAS DE AGENTE */}
          <Route path="/agent" element={
            <ProtectedRoute user={user}>
              <AgentDashboard />
            </ProtectedRoute>
          } />

          <Route path="/agent/bookings" element={
            <ProtectedRoute user={user}>
              <BookingManagement />
            </ProtectedRoute>
          } />

          <Route path="/agent/calendar" element={
            <ProtectedRoute user={user}>
              <AgentCalendar />
            </ProtectedRoute>
          } />

          <Route path="/agent/sales" element={
            <ProtectedRoute user={user}>
              <SalesManagement />
            </ProtectedRoute>
          } />

          {/* 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
