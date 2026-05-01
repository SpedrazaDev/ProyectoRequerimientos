// src/components/Navbar.jsx
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { Home, LayoutDashboard, Building2, Calendar, Users, LogOut, Menu, X } from 'lucide-react';
import './Navbar.css';

function Navbar({ adminUser }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
    setLogoutLoading(false);
  };

  const isActive = (path) => location.pathname === path;
  
  // Detectar si está en rutas de admin o agente
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isAgentRoute = location.pathname.startsWith('/agent');

  return (
    <nav className="navbar">
      <div className="navbar__container">

        {/* Logo */}
        <Link to="/" className="navbar__logo">
          <span className="logo-icon">⬡</span>
          <span className="logo-text">
            Inmobiliaria<span className="logo-accent">PRO</span>
          </span>
        </Link>

        {/* Menú Desktop */}
        <div className="navbar__menu">
          <Link
            to="/"
            className={`navbar__link ${isActive('/') ? 'navbar__link--active' : ''}`}
          >
            <Home size={16} />
            Catálogo
          </Link>

          {adminUser ? (
            <>
              {/* Enlaces de admin (solo si está en rutas /admin/*) */}
              {isAdminRoute && (
                <>
                  <Link
                    to="/admin"
                    className={`navbar__link ${isActive('/admin') ? 'navbar__link--active' : ''}`}
                  >
                    <LayoutDashboard size={16} />
                    Dashboard
                  </Link>
                  <Link
                    to="/admin/properties"
                    className={`navbar__link ${isActive('/admin/properties') ? 'navbar__link--active' : ''}`}
                  >
                    <Building2 size={16} />
                    Propiedades
                  </Link>
                  <Link
                    to="/admin/bookings"
                    className={`navbar__link ${isActive('/admin/bookings') ? 'navbar__link--active' : ''}`}
                  >
                    <Calendar size={16} />
                    Citas
                  </Link>
                  <Link
                    to="/admin/employees"
                    className={`navbar__link ${isActive('/admin/employees') ? 'navbar__link--active' : ''}`}
                  >
                    <Users size={16} />
                    Agentes
                  </Link>
                </>
              )}

              {/* Enlaces de agente (solo si está en rutas /agent/*) */}
              {isAgentRoute && (
                <Link
                  to="/agent"
                  className={`navbar__link ${isActive('/agent') ? 'navbar__link--active' : ''}`}
                >
                  <LayoutDashboard size={16} />
                  Dashboard
                </Link>
              )}

              <div className="navbar__divider" />
              <span className="navbar__user">
                {adminUser.email}
              </span>
              <button
                className="navbar__logout"
                onClick={handleLogout}
                disabled={logoutLoading}
              >
                <LogOut size={14} />
                {logoutLoading ? 'Saliendo...' : 'Cerrar sesión'}
              </button>
            </>
          ) : (
            <Link to="/admin/login" className="navbar__admin-btn">
              Iniciar sesión
            </Link>
          )}
        </div>

        {/* Hamburguesa */}
        <button
          className={`navbar__hamburger ${mobileOpen ? 'open' : ''}`}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Abrir menú"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Menú Móvil */}
      <div className={`navbar__mobile ${mobileOpen ? 'navbar__mobile--open' : ''}`}>
        <Link to="/" className="mobile-link">
          <Home size={18} /> Catálogo
        </Link>

        {adminUser ? (
          <>
            {isAdminRoute && (
              <>
                <Link to="/admin" className="mobile-link">
                  <LayoutDashboard size={18} /> Dashboard
                </Link>
                <Link to="/admin/properties" className="mobile-link">
                  <Building2 size={18} /> Propiedades
                </Link>
                <Link to="/admin/bookings" className="mobile-link">
                  <Calendar size={18} /> Citas
                </Link>
                <Link to="/admin/employees" className="mobile-link">
                  <Users size={18} /> Agentes
                </Link>
              </>
            )}

            {isAgentRoute && (
              <Link to="/agent" className="mobile-link">
                <LayoutDashboard size={18} /> Dashboard
              </Link>
            )}

            <div className="mobile-divider" />
            <button className="mobile-link mobile-logout" onClick={handleLogout}>
              <LogOut size={18} /> Cerrar sesión
            </button>
          </>
        ) : (
          <Link to="/admin/login" className="mobile-link">Iniciar sesión</Link>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
