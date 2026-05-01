// src/App.jsx
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
import AdminLogin from './pages/AdminLogin'; // ← LOGIN UNIVERSAL

// Pages - Admin
import AdminDashboard from './pages/AdminDashboard';
import PropertyManagement from './pages/PropertyManagement';
import BookingManagement from './pages/BookingManagement';
import EmployeeManagement from './pages/EmployeeManagement';

// Pages - Agent
import AgentDashboard from './pages/AgentDashboard';

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
          {/* ── RUTAS PÚBLICAS ── */}
          <Route path="/" element={<ClientHome />} />
          <Route path="/property/:id" element={<PropertyDetail />} />

          {/* ── LOGIN UNIVERSAL (detecta si es admin o agente) ── */}
          <Route path="/admin/login" element={
            user ? <Navigate to="/admin" replace /> : <AdminLogin />
          } />

          {/* ── RUTAS DE ADMIN ── */}
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

          {/* ── RUTAS DE AGENTE ── */}
          <Route path="/agent" element={
            <ProtectedRoute user={user}>
              <AgentDashboard />
            </ProtectedRoute>
          } />

          {/* ── 404 ── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
