// src/firebase.js
// ─────────────────────────────────────────────────────────────────────
//  Configuración de Firebase para InmobiliariaPRO
//
//  PASOS PARA OBTENER TUS CREDENCIALES:
//  1. Ve a https://console.firebase.google.com
//  2. Crea un proyecto nuevo (ej: "inmobiliaria-pro")
//  3. En el menú lateral → Configuración del proyecto → General
//  4. Baja hasta "Tus apps" → Agrega una app → Web (</>)
//  5. Copia el objeto firebaseConfig que aparece
//  6. Pégalo aquí reemplazando los valores de abajo
//
//  SERVICIOS QUE DEBES HABILITAR EN FIREBASE CONSOLE:
//  • Firestore Database → Crear base de datos → Modo prueba
//  • Authentication → Comenzar → Correo/Contraseña (Habilitar)
// ─────────────────────────────────────────────────────────────────────

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// 🔑 REEMPLAZA CON TUS CREDENCIALES REALES DE FIREBASE
const firebaseConfig = {
  apiKey:            "AIzaSyDhdBZqwdwOKQw_L8bQX9QxnNMb_exqvco",
  authDomain:        "proyecto-requerimientos-c60f0.firebaseapp.com",
  projectId:         "proyecto-requerimientos-c60f0",
  storageBucket:     "proyecto-requerimientos-c60f0.firebasestorage.app",
  messagingSenderId: "388021542929",
  appId:             "1:388021542929:web:29ef8e66f12bbf525811b0",
};

// ─── Inicializar Firebase ───
const app = initializeApp(firebaseConfig);

// ─── Exportar servicios que usaremos en la app ───
export const db      = getFirestore(app);   // Base de datos
export const auth    = getAuth(app);        // Autenticación
export const storage = getStorage(app);     // Almacenamiento de imágenes

export default app;
