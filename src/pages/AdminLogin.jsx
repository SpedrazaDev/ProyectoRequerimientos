// src/pages/AdminLogin.jsx
// ACTUALIZADO: Verifica que el agente esté activo antes de permitir acceso
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { LogIn, Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import './AdminLogin.css';

function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Autenticar
      await signInWithEmailAndPassword(auth, email, password);

      // 2. Verificar si es agente
      const employeesRef = collection(db, 'employees');
      const q = query(employeesRef, where('email', '==', email.toLowerCase().trim()));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        // Es agente
        const agentData = snapshot.docs[0].data();
        
        // ← VERIFICAR SI ESTÁ ACTIVO
        if (agentData.status === 'inactivo') {
          await auth.signOut(); // Cerrar sesión inmediatamente
          setError('Tu cuenta ha sido desactivada. Contacta al administrador.');
          setLoading(false);
          return;
        }

        // Si está activo, redirigir
        navigate('/agent');
      } else {
        // Es admin
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

            <div className="password-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="form-control password-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-gold btn-block btn-lg"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="spin" />
                Verificando...
              </>
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
