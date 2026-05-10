// src/components/Navbar.jsx
// CORREGIDO: Muestra enlaces mientras detecta el rol
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { 
  Home, LogOut, LayoutDashboard, Building2, Calendar as CalendarIcon, 
  Users, MessageSquare, DollarSign, Menu, X, TrendingUp, BarChart3
} from 'lucide-react';
import './Navbar.css';

function Navbar({ adminUser }) {
  const user = adminUser;
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Detectar rol del usuario
  useEffect(() => {
    const detectRole = async () => {
      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Verificar si es agente
        const employeesRef = collection(db, 'employees');
        const q = query(employeesRef, where('email', '==', user.email.toLowerCase()));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const agentData = snapshot.docs[0].data();
          if (agentData.status === 'activo') {
            setRole('agent');
          } else {
            setRole(null);
          }
        } else {
          // Si no está en employees, es admin
          setRole('admin');
        }
      } catch (err) {
        console.error('Error detectando rol:', err);
        setRole('admin'); // Default a admin si hay error
      } finally {
        setLoading(false);
      }
    };

    detectRole();
  }, [user]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setRole(null);
      navigate('/admin/login');
    } catch (err) {
      console.error('Error cerrando sesión:', err);
    }
  };

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const closeMenu = () => {
    setMenuOpen(false);
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <nav className="navbar">
      <div className="navbar__container">
        
        <Link to="/" className="navbar__logo" onClick={closeMenu}>
          <Building2 size={24} strokeWidth={2.5} />
          <span>Inmobiliaria<strong>PRO</strong></span>
        </Link>

        <button className="navbar__toggle" onClick={toggleMenu}>
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        <div className={`navbar__menu ${menuOpen ? 'navbar__menu--open' : ''}`}>
          
          {/* Usuario NO logueado */}
          {!user ? (
            <>
              <Link 
                to="/" 
                className={`navbar__link ${isActive('/') ? 'navbar__link--active' : ''}`}
                onClick={closeMenu}
              >
                <Home size={16} />
                Catálogo
              </Link>
              <Link 
                to="/admin/login" 
                className="navbar__link navbar__link--login"
                onClick={closeMenu}
              >
                Iniciar sesión
              </Link>
            </>
          ) : loading ? (
            /* Mientras detecta el rol */
            <div style={{ padding: '0.5rem 1rem', color: 'rgba(255,255,255,0.5)' }}>
              Cargando...
            </div>
          ) : role === 'admin' ? (
            /* Usuario ADMIN */
            <>
              <Link 
                to="/admin" 
                className={`navbar__link ${isActive('/admin') ? 'navbar__link--active' : ''}`}
                onClick={closeMenu}
              >
                <LayoutDashboard size={12} />
                Dashboard
              </Link>
              <Link 
                to="/admin/properties" 
                className={`navbar__link ${isActive('/admin/properties') ? 'navbar__link--active' : ''}`}
                onClick={closeMenu}
              >
                <Building2 size={12} />
                Propiedades
              </Link>
              <Link 
                to="/admin/bookings" 
                className={`navbar__link ${isActive('/admin/bookings') ? 'navbar__link--active' : ''}`}
                onClick={closeMenu}
              >
                <MessageSquare size={12} />
                Citas
              </Link>
              <Link 
                to="/admin/calendar" 
                className={`navbar__link ${isActive('/admin/calendar') ? 'navbar__link--active' : ''}`}
                onClick={closeMenu}
              >
                <CalendarIcon size={12} />
                Calendario
              </Link>
              <Link 
                to="/admin/reports" 
                className={`navbar__link ${isActive('/admin/reports') ? 'navbar__link--active' : ''}`}
                onClick={closeMenu}
              >
                <BarChart3 size={12} />
                Reportes
              </Link>
              <Link 
                  to="/admin/funnel" 
                  className={`navbar__link ${isActive('/admin/funnel') ? 'navbar__link--active' : ''}`}
                  onClick={closeMenu}
                >
                  <TrendingUp size={12} />
                  Embudo de Ventas
                </Link>
              <Link 
                to="/admin/sales" 
                className={`navbar__link ${isActive('/admin/sales') ? 'navbar__link--active' : ''}`}
                onClick={closeMenu}
              >
                <DollarSign size={12} />
                Reporte Ventas
              </Link>
              <Link 
                to="/admin/employees" 
                className={`navbar__link ${isActive('/admin/employees') ? 'navbar__link--active' : ''}`}
                onClick={closeMenu}
              >
                <Users size={12} />
                Agentes
              </Link>
              <button className="navbar__link navbar__link--logout" onClick={handleLogout}>
                <LogOut size={12} />
                Salir
              </button>
            </>
          ) : role === 'agent' ? (
            /* Usuario AGENTE */
            <>
              <Link 
                to="/agent" 
                className={`navbar__link ${isActive('/agent') ? 'navbar__link--active' : ''}`}
                onClick={closeMenu}
              >
                <LayoutDashboard size={12} />
                Mi panel
              </Link>
              <Link 
                to="/agent/bookings" 
                className={`navbar__link ${isActive('/agent/bookings') ? 'navbar__link--active' : ''}`}
                onClick={closeMenu}
              >
                <MessageSquare size={12} />
                Mis citas
              </Link>
              <Link 
                to="/agent/calendar" 
                className={`navbar__link ${isActive('/agent/calendar') ? 'navbar__link--active' : ''}`}
                onClick={closeMenu}
              >
                <CalendarIcon size={12} />
                Mi calendario
              </Link>
              <Link 
                to="/agent/sales" 
                className={`navbar__link ${isActive('/agent/sales') ? 'navbar__link--active' : ''}`}
                onClick={closeMenu}
              >
                <DollarSign size={12} />
                Registrar Venta
              </Link>
              <button className="navbar__link navbar__link--logout" onClick={handleLogout}>
                <LogOut size={12} />
                Salir
              </button>
            </>
          ) : (
            /* Fallback: si role es null después de cargar */
            <>
              <Link 
                to="/" 
                className={`navbar__link ${isActive('/') ? 'navbar__link--active' : ''}`}
                onClick={closeMenu}
              >
                <Home size={16} />
                Catálogo
              </Link>
              <button className="navbar__link navbar__link--logout" onClick={handleLogout}>
                <LogOut size={16} />
                Salir
              </button>
            </>
          )}

        </div>
      </div>
    </nav>
  );
}

export default Navbar;
