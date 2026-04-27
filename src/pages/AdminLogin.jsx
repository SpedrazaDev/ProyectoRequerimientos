// src/pages/AdminLogin.jsx
// ─────────────────────────────────────────────────────────────────────
//  Página de inicio de sesión para administradores.
//  Usa Firebase Authentication con email y contraseña.
// ─────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import './AdminLogin.css';

function AdminLogin() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validación básica
    if (!email.trim() || !password.trim()) {
      setError('Por favor completa todos los campos.');
      return;
    }

    setLoading(true);
    try {
      // Intentar autenticar con Firebase
      await signInWithEmailAndPassword(auth, email.trim(), password);
      navigate('/admin'); // Redirigir al dashboard
    } catch (err) {
      // Mensajes de error en español según el código de Firebase
      const errorMessages = {
        'auth/user-not-found':     'No existe una cuenta con este correo.',
        'auth/wrong-password':     'Contraseña incorrecta.',
        'auth/invalid-email':      'Formato de correo no válido.',
        'auth/too-many-requests':  'Demasiados intentos. Espera unos minutos.',
        'auth/invalid-credential': 'Email o contraseña incorrectos.',
      };
      setError(errorMessages[err.code] || 'Error al iniciar sesión. Intenta de nuevo.');
      console.error('Auth error:', err.code);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-split">

        {/* ── Panel izquierdo: imagen/branding ── */}
        <div className="login-brand">
          <div className="login-brand__overlay" />
          <div className="login-brand__content">
            <div className="login-brand__logo">⬡</div>
            <h1>Inmobiliaria<span>PRO</span></h1>
            <p>Panel de Administración</p>
            <div className="login-brand__divider" />
            <ul className="login-brand__features">
              <li>✓ Gestión de propiedades</li>
              <li>✓ Administración de citas</li>
              <li>✓ Estadísticas en tiempo real</li>
            </ul>
          </div>
        </div>

        {/* ── Panel derecho: formulario ── */}
        <div className="login-form-panel">
          <div className="login-form-wrap">
            <div className="login-header">
              <h2>Bienvenido</h2>
              <p>Ingresa tus credenciales para acceder al panel</p>
            </div>

            {/* Error global */}
            {error && (
              <div className="alert alert-error">
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              {/* Campo Email */}
              <div className="form-group">
                <label htmlFor="email">Correo electrónico</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-control"
                  placeholder="admin@inmobiliaria.com"
                  autoComplete="email"
                  required
                />
              </div>

              {/* Campo Contraseña */}
              <div className="form-group">
                <label htmlFor="password">Contraseña</label>
                <div className="password-wrap">
                  <input
                    id="password"
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-control"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="pass-toggle"
                    onClick={() => setShowPass(!showPass)}
                    aria-label="Mostrar contraseña"
                  >
                    {showPass ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-gold btn-block btn-lg"
                disabled={loading}
              >
                {loading ? '⏳ Verificando...' : '🔐 Iniciar sesión'}
              </button>
            </form>

            <div className="login-hint">
              <p>
                <strong>💡 Primera vez:</strong> Crea un usuario en<br />
                Firebase Console → Authentication → Usuarios
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminLogin;
