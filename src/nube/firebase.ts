import { initializeApp } from 'firebase/app'
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, type Firestore } from 'firebase/firestore'

// Datos del proyecto de Firebase. No son secretos: lo que protege la información es la clave del link
// (ver firestore.rules). Mientras estén vacíos, la app guarda todo solo en este aparato.
const config = {
  apiKey: 'AIzaSyAjUCxN_isqHyaBscIPqQneh95Uiny90BI',
  authDomain: 'mis-estaciones.firebaseapp.com',
  projectId: 'mis-estaciones',
  storageBucket: 'mis-estaciones.firebasestorage.app',
  messagingSenderId: '193938846825',
  appId: '1:193938846825:web:63549da86fc7cfaf069ef8',
}

// Con la copia local la app abre al toque y funciona sin señal; lo que se carga sin internet se sube solo después.
export const db: Firestore | null = config.projectId
  ? initializeFirestore(initializeApp(config), {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      ignoreUndefinedProperties: true,
    })
  : null
