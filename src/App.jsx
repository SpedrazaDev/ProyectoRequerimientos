// src/App.jsx
// ─────────────────────────────────────────────────────────────────────
//  Componente raíz: define todas las rutas de la aplicación.
//  • Rutas públicas:  /           → Catálogo (clientes)
//                     /property/:id → Detalle de propiedad
//  • Rutas admin:     /admin/login → Login
//                     /admin       → Dashboard
//                     /admin/properties → CRUD propiedades
//                     /admin/bookings   → Gestión de citas
// ─────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';

// Componentes reutilizables
import Navbar from "./components/NavBar";  

// Páginas de clientes
import ClientHome from "./pages/ClientHome";
import PropertyDetail from "./components/PropertyDetail";

// Páginas de administración
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import PropertyManagement from "./pages/PropertyManagement";
import BookingManagement  from "./pages/BookingManagement";

import './App.css';

// ─── Componente que protege las rutas del admin ───
// Si no hay usuario logueado, redirige al login
function ProtectedRoute({ adminUser, children }) {
  if (!adminUser) {
    return <Navigate to="/admin/login" replace />;
  }
  return children;
}

// ─── Componente principal de la aplicación ───
function App() {
  const [adminUser, setAdminUser] = useState(null);    // usuario admin logueado
  const [authLoading, setAuthLoading] = useState(true); // cargando estado de auth

  // Escuchar cambios en la autenticación de Firebase
  // Este efecto se ejecuta una sola vez cuando carga la app
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAdminUser(user);     // null si no hay sesión, objeto si está logueado
      setAuthLoading(false);  // ya terminó de verificar
    });

    // Limpieza: dejar de escuchar cuando el componente se desmonta
    return () => unsubscribe();
  }, []);

  // Mientras Firebase verifica la sesión, mostramos pantalla de carga
  if (authLoading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Iniciando aplicación...</p>
      </div>
    );
  }

  return (
    <Router>
      {/* Navbar aparece en todas las páginas */}
      <Navbar adminUser={adminUser} />

      {/* Contenedor principal de las vistas */}
      <main>
        <Routes>
          {/* ─── RUTAS PÚBLICAS (clientes) ─── */}
          <Route path="/"              element={<ClientHome />} />
          <Route path="/property/:id"  element={<PropertyDetail />} />

          {/* ─── RUTA DE LOGIN ADMIN ─── */}
          {/* Si ya está logueado, redirige al dashboard */}
          <Route
            path="/admin/login"
            element={adminUser ? <Navigate to="/admin" replace /> : <AdminLogin />}
          />

          {/* ─── RUTAS PROTEGIDAS DE ADMIN ─── */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminUser={adminUser}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/properties"
            element={
              <ProtectedRoute adminUser={adminUser}>
                <PropertyManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/bookings"
            element={
              <ProtectedRoute adminUser={adminUser}>
                <BookingManagement />
              </ProtectedRoute>
            }
          />

          {/* Cualquier ruta desconocida → inicio */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </Router>
  );
}

export default App;
