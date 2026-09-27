import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  writeBatch,
  type Firestore,
  type FirestoreError,
} from 'firebase/firestore'
import type { Trabajo, Valores } from '../tipos.ts'

export type EstadoNube = 'cargando' | 'guardado' | 'guardando' | 'sin-conexion' | 'error' | 'solo-local'

export type Avisos = {
  alCambiarValores: (valores: Valores) => void
  alCambiarTrabajos: (trabajos: Trabajo[], listo: boolean) => void
  /** La primera vez que responde la nube: dice si la cuenta ya tenía datos. */
  alConectar: (cuentaExiste: boolean) => void
  alCambiarEstado: (estado: EstadoNube) => void
}

export type TrabajoBorrado = Trabajo & { borradoEl: string }

/** Tiempo sin cambios antes de subir: así no se sube una vez por cada tecla. */
const ESPERA_MS = 700

const estable = (v: unknown) =>
  JSON.stringify(v, (_k, x) =>
    x && typeof x === 'object' && !Array.isArray(x)
      ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => (a < b ? -1 : 1)))
      : x,
  )

/** Firestore no respeta el orden de las claves, así que se compara sin mirarlo. */
export const mismoDato = (a: unknown, b: unknown) => estable(a) === estable(b)

/** Lo que llegó de la nube, con los cambios de este aparato que todavía no se confirmaron (null = borrado). */
export function combinar(remotos: Trabajo[], locales: Map<string, Trabajo | null>): Trabajo[] {
  const resultado = remotos.filter((t) => !locales.has(t.id))
  for (const t of locales.values()) if (t) resultado.push(t)
  return resultado
}

export class Sincronizador {
  private locales = new Map<string, Trabajo | null>()
  private valoresLocales: Valores | null = null
  private esperas = new Map<string, { timer: ReturnType<typeof setTimeout>; subir: () => Promise<void> }>()
  private remotos: Trabajo[] = []
  private subiendoRemoto = false
  private conectado = { cuenta: undefined as boolean | undefined, trabajos: false, avisado: false }
  private huboError = false
  private readonly db: Firestore
  private readonly clave: string
  private readonly avisos: Avisos

  constructor(db: Firestore, clave: string, avisos: Avisos) {
    this.db = db
    this.clave = clave
    this.avisos = avisos
  }

  private get cuenta() {
    return doc(this.db, 'cuentas', this.clave)
  }

  private coleccion(nombre: 'trabajos' | 'papelera') {
    return collection(this.cuenta, nombre)
  }

  iniciar() {
    const alFallar = (error: FirestoreError) => {
      console.error('Nube:', error)
      this.huboError = true
      this.actualizarEstado()
    }
    const pararCuenta = onSnapshot(
      this.cuenta,
      (snap) => {
        const remotos = snap.data()?.valores as Valores | undefined
        if (this.valoresLocales && remotos && mismoDato(remotos, this.valoresLocales) && !this.esperas.has('valores')) {
          this.valoresLocales = null
        }
        const valores = this.valoresLocales ?? remotos
        if (valores) this.avisos.alCambiarValores(valores)
        if (!snap.metadata.fromCache && this.conectado.cuenta === undefined) {
          this.conectado.cuenta = snap.exists()
          this.avisarConexion()
        }
      },
      alFallar,
    )
    const pararTrabajos = onSnapshot(
      this.coleccion('trabajos'),
      { includeMetadataChanges: true },
      (snap) => {
        this.huboError = false
        this.remotos = snap.docs.map((d) => d.data() as Trabajo)
        this.subiendoRemoto = snap.metadata.hasPendingWrites
        // Los cambios de este aparato que ya se ven en la nube quedan confirmados.
        for (const [id, local] of this.locales) {
          if (this.esperas.has(id)) continue
          const remoto = this.remotos.find((t) => t.id === id)
          if (local === null ? !remoto : remoto && mismoDato(remoto, local)) this.locales.delete(id)
        }
        // En un aparato nuevo la copia local está vacía: se espera a la nube antes de mostrar "no hay nada".
        const listo = !snap.metadata.fromCache || snap.docs.length > 0 || !navigator.onLine
        this.avisos.alCambiarTrabajos(combinar(this.remotos, this.locales), listo)
        if (!snap.metadata.fromCache && !this.conectado.trabajos) {
          this.conectado.trabajos = true
          this.avisarConexion()
        }
        this.actualizarEstado()
      },
      alFallar,
    )

    const alCambiarConexion = () => this.actualizarEstado()
    const alOcultar = () => {
      if (document.visibilityState === 'hidden') this.subirYa()
    }
    window.addEventListener('online', alCambiarConexion)
    window.addEventListener('offline', alCambiarConexion)
    document.addEventListener('visibilitychange', alOcultar)
    this.actualizarEstado()

    return () => {
      this.subirYa()
      pararCuenta()
      pararTrabajos()
      window.removeEventListener('online', alCambiarConexion)
      window.removeEventListener('offline', alCambiarConexion)
      document.removeEventListener('visibilitychange', alOcultar)
    }
  }

  private avisarConexion() {
    if (this.conectado.avisado || this.conectado.cuenta === undefined || !this.conectado.trabajos) return
    this.conectado.avisado = true
    this.avisos.alConectar(this.conectado.cuenta)
  }

  private actualizarEstado() {
    const { alCambiarEstado } = this.avisos
    if (!navigator.onLine) alCambiarEstado('sin-conexion')
    else if (this.huboError) alCambiarEstado('error')
    else if (!this.conectado.trabajos) alCambiarEstado('cargando')
    else if (this.esperas.size > 0 || this.subiendoRemoto) alCambiarEstado('guardando')
    else alCambiarEstado('guardado')
  }

  private programar(clave: string, subir: () => Promise<void>) {
    const anterior = this.esperas.get(clave)
    if (anterior) clearTimeout(anterior.timer)
    const timer = setTimeout(() => this.subir(clave), ESPERA_MS)
    this.esperas.set(clave, { timer, subir })
    this.actualizarEstado()
  }

  private subir(clave: string) {
    const espera = this.esperas.get(clave)
    if (!espera) return
    clearTimeout(espera.timer)
    this.esperas.delete(clave)
    // Sin señal la promesa queda esperando, pero el cambio ya está guardado en el aparato.
    espera.subir().catch((error) => {
      console.error('Nube:', error)
      this.huboError = true
    })
    this.actualizarEstado()
  }

  /** Sube ya lo que esté esperando (por ejemplo, cuando se cierra la app). */
  subirYa() {
    for (const clave of [...this.esperas.keys()]) this.subir(clave)
  }

  guardarTrabajo(trabajo: Trabajo) {
    this.locales.set(trabajo.id, trabajo)
    this.programar(trabajo.id, () => {
      const ultimo = this.locales.get(trabajo.id)
      return ultimo ? setDoc(doc(this.coleccion('trabajos'), trabajo.id), ultimo) : Promise.resolve()
    })
  }

  guardarValores(valores: Valores) {
    this.valoresLocales = valores
    this.programar('valores', () => setDoc(this.cuenta, { valores: this.valoresLocales }, { merge: true }))
  }

  /** Borra un trabajo. Si `aPapelera`, queda una copia para poder recuperarlo. */
  borrarTrabajo(trabajo: Trabajo, aPapelera: boolean) {
    const espera = this.esperas.get(trabajo.id)
    if (espera) clearTimeout(espera.timer)
    this.esperas.delete(trabajo.id)
    this.locales.set(trabajo.id, null)
    const lote = writeBatch(this.db)
    if (aPapelera) {
      const borrado: TrabajoBorrado = { ...trabajo, borradoEl: new Date().toISOString() }
      lote.set(doc(this.coleccion('papelera'), trabajo.id), borrado)
    }
    lote.delete(doc(this.coleccion('trabajos'), trabajo.id))
    lote.commit().catch((error) => console.error('Nube:', error))
    this.actualizarEstado()
  }

  async leerPapelera(): Promise<TrabajoBorrado[]> {
    const snap = await getDocs(this.coleccion('papelera'))
    return snap.docs.map((d) => d.data() as TrabajoBorrado).sort((a, b) => b.borradoEl.localeCompare(a.borradoEl))
  }

  recuperarTrabajo(borrado: TrabajoBorrado) {
    const { borradoEl: _, ...trabajo } = borrado
    this.locales.set(trabajo.id, trabajo)
    const lote = writeBatch(this.db)
    lote.set(doc(this.coleccion('trabajos'), trabajo.id), trabajo)
    lote.delete(doc(this.coleccion('papelera'), trabajo.id))
    lote.commit().catch((error) => console.error('Nube:', error))
    return trabajo
  }
}
