// src/pages/EmployeeManagement.jsx
// ACTUALIZADO: Incluye activar/desactivar agentes
import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '../firebase';
import { Plus, Edit2, Trash2, Users, Mail, UserCheck, X, UserX, ToggleLeft, ToggleRight } from 'lucide-react';
import './EmployeeManagement.css';

const EMPTY_FORM = {
  name: '',
  email: '',
  phone: '',
  password: '',
};

function EmployeeManagement() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => { loadEmployees(); }, []);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'employees'));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setEmployees(data);
    } catch (err) {
      console.error('Error cargando empleados:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInput = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) setFormErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'El nombre es requerido.';
    if (!formData.email.trim()) errs.email = 'El email es requerido.';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errs.email = 'Email no válido.';
    if (!formData.phone.trim()) errs.phone = 'El teléfono es requerido.';
    
    if (!editingId && !formData.password.trim()) {
      errs.password = 'La contraseña es requerida.';
    } else if (!editingId && formData.password.length < 6) {
      errs.password = 'La contraseña debe tener al menos 6 caracteres.';
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const openCreate = () => {
    setFormData(EMPTY_FORM);
    setFormErrors({});
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (employee) => {
    setFormData({
      name: employee.name || '',
      email: employee.email || '',
      phone: employee.phone || '',
      password: '',
    });
    setFormErrors({});
    setEditingId(employee.id);
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormErrors({});
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const dataToSave = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        role: 'agent',
      };

      if (editingId) {
        await updateDoc(doc(db, 'employees', editingId), {
          ...dataToSave,
          updatedAt: serverTimestamp(),
        });
      } else {
        try {
          const userCredential = await createUserWithEmailAndPassword(
            auth,
            formData.email.trim().toLowerCase(),
            formData.password
          );

          await addDoc(collection(db, 'employees'), {
            ...dataToSave,
            uid: userCredential.user.uid,
            status: 'activo', // ← Activo por defecto
            createdAt: serverTimestamp(),
          });

          alert('✓ Agente creado exitosamente.');
        } catch (authErr) {
          if (authErr.code === 'auth/email-already-in-use') {
            setFormErrors({ email: 'Este email ya está registrado.' });
            setSaving(false);
            return;
          }
          throw authErr;
        }
      }

      cancelForm();
      await loadEmployees();
    } catch (err) {
      console.error('Error guardando agente:', err);
      alert('Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteDoc(doc(db, 'employees', deleteId));
      setDeleteId(null);
      await loadEmployees();
      alert('Agente eliminado. La cuenta de Auth debe eliminarse manualmente.');
    } catch (err) {
      console.error('Error eliminando:', err);
      alert('Error al eliminar.');
    }
  };

  // ← NUEVA FUNCIÓN: Activar/Desactivar
  const toggleStatus = async (employee) => {
    const newStatus = employee.status === 'activo' ? 'inactivo' : 'activo';
    try {
      await updateDoc(doc(db, 'employees', employee.id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      await loadEmployees();
    } catch (err) {
      console.error('Error cambiando estado:', err);
      alert('Error al cambiar el estado.');
    }
  };

  const formatDate = (ts) => {
    if (!ts) return '—';
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return new Intl.DateTimeFormat('es-CR', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
  };

  return (
    <div className="admin-page">
      <div className="admin-container">

        <div className="pm-header">
          <div>
            <h1 className="dash-title">Gestión de Agentes</h1>
            <p className="dash-sub">
              {employees.length} agente{employees.length !== 1 ? 's' : ''} registrado{employees.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button className="btn btn-gold" onClick={showForm ? cancelForm : openCreate}>
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? 'Cancelar' : 'Nuevo agente'}
          </button>
        </div>

        {showForm && (
          <div className="pm-form-card">
            <h2 className="pm-form-title">
              {editingId ? <><Edit2 size={20} /> Editar agente</> : <><Users size={20} /> Nuevo agente</>}
            </h2>

            <form onSubmit={handleSave} noValidate>
              <div className="pm-form-grid">
                
                <div className="form-group pm-col-2">
                  <label>Nombre completo *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInput}
                    className={`form-control ${formErrors.name ? 'form-control--error' : ''}`}
                    placeholder="Ej: Ana García Ramírez"
                  />
                  {formErrors.name && <span className="field-error">{formErrors.name}</span>}
                </div>

                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInput}
                    className={`form-control ${formErrors.email ? 'form-control--error' : ''}`}
                    placeholder="ana.garcia@empresa.com"
                    disabled={!!editingId}
                  />
                  {formErrors.email && <span className="field-error">{formErrors.email}</span>}
                  {editingId && <small className="field-hint">El email no puede modificarse</small>}
                </div>

                <div className="form-group">
                  <label>Teléfono *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInput}
                    className={`form-control ${formErrors.phone ? 'form-control--error' : ''}`}
                    placeholder="+506 8888-8888"
                  />
                  {formErrors.phone && <span className="field-error">{formErrors.phone}</span>}
                </div>

                {!editingId && (
                  <div className="form-group">
                    <label>Contraseña *</label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInput}
                      className={`form-control ${formErrors.password ? 'form-control--error' : ''}`}
                      placeholder="Mínimo 6 caracteres"
                      minLength={6}
                    />
                    {formErrors.password && <span className="field-error">{formErrors.password}</span>}
                    <small className="field-hint">Esta contraseña será usada para iniciar sesión</small>
                  </div>
                )}

              </div>

              <div className="pm-form-actions">
                <button type="button" className="btn btn-outline" onClick={cancelForm}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-gold" disabled={saving}>
                  {saving ? '⏳ Guardando...' : (editingId ? '✓ Actualizar' : '✓ Crear agente')}
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div className="loading-inline">
            <div className="spinner-sm" />
            <span>Cargando agentes...</span>
          </div>
        ) : employees.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <Users size={48} strokeWidth={1.5} />
            </div>
            <h3>Sin agentes</h3>
            <p>Agrega tu primer agente de ventas.</p>
          </div>
        ) : (
          <div className="pm-table-wrap">
            <table className="pm-table">
              <thead>
                <tr>
                  <th>Agente</th>
                  <th>Email</th>
                  <th>Teléfono</th>
                  <th>Estado</th>
                  <th>Creado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp.id} style={{ opacity: emp.status === 'inactivo' ? 0.6 : 1 }}>
                    <td>
                      <div className="table-title-cell">
                        {emp.status === 'activo' ? <UserCheck size={16} style={{ color: 'var(--gold)' }} /> : <UserX size={16} style={{ color: '#888' }} />}
                        <strong>{emp.name}</strong>
                      </div>
                    </td>
                    <td>
                      <a href={`mailto:${emp.email}`} className="email-link">
                        <Mail size={14} />
                        {emp.email}
                      </a>
                    </td>
                    <td>{emp.phone}</td>
                    <td>
                      <span className={`status-badge ${emp.status === 'activo' ? 'status-active' : 'status-inactive'}`}>
                        {emp.status === 'activo' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="date-cell">{formatDate(emp.createdAt)}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          className={`btn btn-sm ${emp.status === 'activo' ? 'btn-outline' : 'btn-success'}`}
                          onClick={() => toggleStatus(emp)}
                          title={emp.status === 'activo' ? 'Desactivar' : 'Activar'}
                        >
                          {emp.status === 'activo' ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                          {emp.status === 'activo' ? 'Desactivar' : 'Activar'}
                        </button>
                        <button
                          className="btn btn-sm btn-dark"
                          onClick={() => openEdit(emp)}
                          title="Editar"
                        >
                          <Edit2 size={14} />
                          Editar
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => setDeleteId(emp.id)}
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {deleteId && (
          <div className="modal-overlay" onClick={() => setDeleteId(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal__icon">⚠️</div>
              <h3>¿Eliminar agente?</h3>
              <p>
                Esta acción eliminará el registro del agente.
                <br /><br />
                <strong>Nota:</strong> La cuenta de Auth debe eliminarse manualmente.
              </p>
              <div className="modal__actions">
                <button className="btn btn-outline" onClick={() => setDeleteId(null)}>
                  Cancelar
                </button>
                <button className="btn btn-danger" onClick={handleDelete}>
                  Sí, eliminar
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default EmployeeManagement;
