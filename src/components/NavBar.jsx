// src/components/Navbar.jsx
// ─────────────────────────────────────────────────────────────────────
//  Navbar elegante que:
//  • Cambia de fondo al hacer scroll (transparente → oscuro)
//  • Muestra menú de admin cuando hay sesión activa
//  • Tiene botón de hamburguesa para móvil
// ─────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import './Navbar.css';

function Navbar({ adminUser }) {
  const [scrolled,      setScrolled]      = useState(false); // barra con fondo
  const [mobileOpen,    setMobileOpen]    = useState(false); // menú móvil
  const [logoutLoading, setLogoutLoading] = useState(false);

  const location = useLocation();
  const navigate  = useNavigate();

  // Detectar scroll para cambiar el estilo del navbar
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Cerrar el menú móvil cuando cambia la ruta
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Cerrar sesión del administrador
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

  // Verificar si una ruta está activa para resaltarla
  const isActive = (path) => location.pathname === path;

  return (
    <nav className={`navbar ${scrolled ? 'navbar--scrolled' : ''}`}>
      <div className="navbar__container">

        {/* ── Logo ── */}
        <Link to="/" className="navbar__logo">
          <span className="logo-icon">⬡</span>
          <span className="logo-text">
            Inmobiliaria<span className="logo-accent">PRO</span>
          </span>
        </Link>

        {/* ── Menú Desktop ── */}
        <div className="navbar__menu">
          <Link
            to="/"
            className={`navbar__link ${isActive('/') ? 'navbar__link--active' : ''}`}
          >
            Catálogo
          </Link>

          {adminUser ? (
            /* Si hay admin logueado, mostrar menú de administración */
            <>
              <Link
                to="/admin"
                className={`navbar__link ${isActive('/admin') ? 'navbar__link--active' : ''}`}
              >
                Dashboard
              </Link>
              <Link
                to="/admin/properties"
                className={`navbar__link ${isActive('/admin/properties') ? 'navbar__link--active' : ''}`}
              >
                Propiedades
              </Link>
              <Link
                to="/admin/bookings"
                className={`navbar__link ${isActive('/admin/bookings') ? 'navbar__link--active' : ''}`}
              >
                Citas
              </Link>
              <div className="navbar__divider" />
              <span className="navbar__user">
                {adminUser.email}
              </span>
              <button
                className="navbar__logout"
                onClick={handleLogout}
                disabled={logoutLoading}
              >
                {logoutLoading ? 'Saliendo...' : 'Cerrar sesión'}
              </button>
            </>
          ) : (
            /* Si no hay admin, mostrar botón de acceso */
            <Link to="/admin/login" className="navbar__admin-btn">
              Admin
            </Link>
          )}
        </div>

        {/* ── Botón hamburguesa para móvil ── */}
        <button
          className={`navbar__hamburger ${mobileOpen ? 'open' : ''}`}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Abrir menú"
        >
          <span /><span /><span />
        </button>
      </div>

      {/* ── Menú Móvil ── */}
      <div className={`navbar__mobile ${mobileOpen ? 'navbar__mobile--open' : ''}`}>
        <Link to="/" className="mobile-link">🏠 Catálogo</Link>

        {adminUser ? (
          <>
            <Link to="/admin"             className="mobile-link">📊 Dashboard</Link>
            <Link to="/admin/properties"  className="mobile-link">🏢 Propiedades</Link>
            <Link to="/admin/bookings"    className="mobile-link">📅 Citas</Link>
            <div className="mobile-divider" />
            <button className="mobile-link mobile-logout" onClick={handleLogout}>
              🚪 Cerrar sesión
            </button>
          </>
        ) : (
          <Link to="/admin/login" className="mobile-link">🔐 Admin</Link>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
