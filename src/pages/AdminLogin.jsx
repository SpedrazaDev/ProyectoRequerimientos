// src/pages/AdminLogin.jsx
// ─────────────────────────────────────────────────────────────────────
//  Página de inicio de sesión para administradores.
//  Usa Firebase Authentication con email y contraseña.
// ─────────────────────────────────────────────────────────────────────
// src/pages/AdminLogin.jsx
// LOGIN UNIVERSAL - Detecta automáticamente si es admin o agente
// src/pages/AdminLogin.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { LogIn, Mail, Lock } from 'lucide-react';
import './AdminLogin.css';

function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Autenticar en Firebase
      await signInWithEmailAndPassword(auth, email, password);

      // 2. Verificar si es agente
      const employeesRef = collection(db, 'employees');
      const q = query(employeesRef, where('email', '==', email.toLowerCase().trim()));
      const snapshot = await getDocs(q);

      // 3. Redirigir según el rol
      if (!snapshot.empty) {
        navigate('/agent');
      } else {
        navigate('/admin');
      }

    } catch (err) {
      console.error('Error:', err);
      
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setError('Credenciales incorrectas.');
      } else if (err.code === 'auth/user-not-found') {
        setError('Usuario no encontrado.');
      } else {
        setError('Error al iniciar sesión.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        
        <div className="login-header">
          <div className="login-icon">
            <LogIn size={32} strokeWidth={2.5} />
          </div>
          <h1>Iniciar Sesión</h1>
          <p>Panel de administración</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          
          {error && (
            <div className="alert alert-error">
              ⚠️ {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">
              <Mail size={14} />
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              className="form-control"
              placeholder="admin@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">
              <Lock size={14} />
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-gold btn-block btn-lg"
            disabled={loading}
          >
            {loading ? (
              <>⏳ Verificando...</>
            ) : (
              <>
                <LogIn size={16} />
                Iniciar sesión
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          <p className="help-text">
            El sistema detectará tu rol automáticamente.
          </p>
        </div>

      </div>
    </div>
  );
}

export default AdminLogin;
