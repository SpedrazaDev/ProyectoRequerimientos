// src/App.jsx
// COMPLETO: Con rutas de Fase 3
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from './firebase';

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

// Pages - Agent
import AgentDashboard from './pages/AgentDashboard';
import AgentCalendar from './pages/AgentCalendar';
import SalesManagement from './pages/SalesManagement';
import AgentAvailability from './pages/AgentAvailability';
import AgentBlockedDates from './pages/AgentBlockedDates';

// Pages - CRM
import CRM from './pages/CRM';

// Pages - Financial
import FinancialControl from './pages/FinancialControl';
import OpportunitiesReport from './pages/OpportunitiesReport';

import './App.css';

function ProtectedRoute({ children, user }) {
  return user ? children : <Navigate to="/admin/login" replace />;
}

function AdminRoute({ children, user, userRole }) {
  if (!user) return <Navigate to="/admin/login" replace />;
  if (userRole === 'agent') return <Navigate to="/agent" replace />;
  return children;
}

function App() {
  const [user, setUser]         = useState(null);
  const [userRole, setUserRole] = useState(null); // 'admin' | 'agent' | null
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const snap = await getDocs(
            query(collection(db, 'employees'), where('email', '==', currentUser.email.toLowerCase()))
          );
          const isAgent = !snap.empty && snap.docs[0].data().status === 'activo';
          setUserRole(isAgent ? 'agent' : 'admin');
        } catch {
          setUserRole('admin');
        }
      } else {
        setUserRole(null);
      }
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
            !user ? <AdminLogin /> :
            userRole === 'agent' ? <Navigate to="/agent" replace /> :
            <Navigate to="/admin" replace />
          } />

          {/* RUTAS DE ADMIN */}
          <Route path="/admin" element={
            <AdminRoute user={user} userRole={userRole}>
              <AdminDashboard />
            </AdminRoute>
          } />

          <Route path="/admin/properties" element={
            <AdminRoute user={user} userRole={userRole}>
              <PropertyManagement />
            </AdminRoute>
          } />

          <Route path="/admin/bookings" element={
            <AdminRoute user={user} userRole={userRole}>
              <BookingManagement />
            </AdminRoute>
          } />

          <Route path="/admin/employees" element={
            <AdminRoute user={user} userRole={userRole}>
              <EmployeeManagement />
            </AdminRoute>
          } />

          <Route path="/admin/calendar" element={
            <AdminRoute user={user} userRole={userRole}>
              <AdminCalendar />
            </AdminRoute>
          } />

          <Route path="/admin/sales" element={
            <AdminRoute user={user} userRole={userRole}>
              <SalesReport />
            </AdminRoute>
          } />

          {/* FASE 3: Reportes */}
          <Route path="/admin/reports" element={
            <AdminRoute user={user} userRole={userRole}>
              <Reports />
            </AdminRoute>
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

          <Route path="/agent/availability" element={
            <ProtectedRoute user={user}>
              <AgentAvailability />
            </ProtectedRoute>
          } />

          <Route path="/agent/blocked-dates" element={
            <ProtectedRoute user={user}>
              <AgentBlockedDates />
            </ProtectedRoute>
          } />

          {/* RUTAS CRM */}
          <Route path="/admin/crm" element={
            <AdminRoute user={user} userRole={userRole}>
              <CRM />
            </AdminRoute>
          } />

          <Route path="/agent/crm" element={
            <ProtectedRoute user={user}>
              <CRM filterByAgent />
            </ProtectedRoute>
          } />

          {/* RUTAS FINANCIERO */}
          <Route path="/admin/financial" element={
            <AdminRoute user={user} userRole={userRole}>
              <FinancialControl />
            </AdminRoute>
          } />

          <Route path="/admin/opportunities" element={
            <AdminRoute user={user} userRole={userRole}>
              <OpportunitiesReport />
            </AdminRoute>
          } />

          {/* 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
