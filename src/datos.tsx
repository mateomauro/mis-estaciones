import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { semanaDe } from './calculos.ts'
import type { Copia } from './copias.ts'
import { hoy, nuevoId } from './formato.ts'
import { db } from './nube/firebase.ts'
import { Sincronizador, type EstadoNube, type TrabajoBorrado } from './nube/sincronizar.ts'
import type { TipoTrabajo, Trabajo, Valores } from './tipos.ts'

// Donde se guardaba todo antes de la nube. También se usa si la app corre sin nube (en desarrollo).
const CLAVE_LOCAL = 'mis-estaciones-v1'
const CLAVE_YA_PASADO = 'mis-estaciones-v1-pasado-a-la-nube'

type Datos = Copia

const VALORES_INICIALES: Valores = {
  titular: 'Furniture',
  cliente: 'CR',
  empleados: [
    { id: 'emi', nombre: 'Emi', diaConveniencia: 86567, diaPago: 83000 },
    { id: 'nico', nombre: 'Nico', diaConveniencia: 81200, diaPago: 73000 },
    { id: 'naza', nombre: 'Naza', diaConveniencia: 84620, diaPago: 78000 },
    { id: 'tomas', nombre: 'Tomás', diaConveniencia: 80000, diaPago: 70000 },
  ],
  horaMia: 33835,
  plus: 541703,
  iva: 21,
}

const SIN_DATOS: Datos = { valores: VALORES_INICIALES, trabajos: [] }

function leerLocal(): Datos | null {
  try {
    const guardado = localStorage.getItem(CLAVE_LOCAL)
    if (!guardado) return null
    // La primera versión guardaba "estaciones" sin tipo.
    const datos = JSON.parse(guardado) as Partial<Datos> & { estaciones?: Trabajo[] }
    const trabajos = (datos.trabajos ?? datos.estaciones ?? []).map((t) => ({ ...t, tipo: t.tipo ?? 'estacion' }))
    return { valores: datos.valores ?? VALORES_INICIALES, trabajos }
  } catch {
    return null
  }
}

function guardarLocal(datos: Datos) {
  try {
    localStorage.setItem(CLAVE_LOCAL, JSON.stringify(datos))
  } catch {
    // Sin espacio o bloqueado: los datos siguen en memoria mientras la app esté abierta.
  }
}

/** Un trabajo recién creado que nunca se completó. */
const estaVacio = (t: Trabajo) => !t.nombre.trim() && t.tramos.every((tramo) => !tramo.desde && !tramo.hasta)

/**
 * La primera vez que un aparato se conecta a la nube: si tenía cosas cargadas de antes, ofrece subirlas.
 * Si la cuenta es nueva, arranca con los valores de ese aparato.
 */
function pasarDatosViejos(sync: Sincronizador, cuentaExiste: boolean, enLaNube: Trabajo[]) {
  const viejos = leerLocal()
  if (!cuentaExiste) sync.guardarValores(viejos?.valores ?? VALORES_INICIALES)
  if (!viejos) return
  const faltan = viejos.trabajos.filter((t) => !estaVacio(t) && !enLaNube.some((n) => n.id === t.id))
  const pregunta =
    `En este aparato hay ${faltan.length} ${faltan.length === 1 ? 'trabajo cargado' : 'trabajos cargados'} de antes. ` +
    '¿Los pasamos a la nube para verlos también en los otros aparatos?'
  if (faltan.length > 0 && confirm(pregunta)) faltan.forEach((t) => sync.guardarTrabajo(t))
  // Se guarda aparte por las dudas y no se vuelve a preguntar.
  try {
    localStorage.setItem(CLAVE_YA_PASADO, localStorage.getItem(CLAVE_LOCAL) ?? '')
    localStorage.removeItem(CLAVE_LOCAL)
  } catch {
    // Si no se puede, a lo sumo vuelve a preguntar.
  }
}

type ContextoDatos = Datos & {
  /** Ya están los datos (en un aparato nuevo hay que esperar a la nube la primera vez). */
  listo: boolean
  estadoNube: EstadoNube
  clave: string | null
  guardarValores: (valores: Valores) => void
  crearTrabajo: (tipo: TipoTrabajo) => string
  guardarTrabajo: (trabajo: Trabajo) => void
  /** Lo borra dejando una copia en la papelera. */
  borrarTrabajo: (id: string) => void
  limpiarVacios: () => void
  /** Pasa los valores de hoy a todos los trabajos de esa semana. */
  actualizarValoresDeSemana: (inicio: string) => void
  cargarCopia: (copia: Copia) => void
  leerPapelera: () => Promise<TrabajoBorrado[]>
  recuperarTrabajo: (borrado: TrabajoBorrado) => void
}

const Contexto = createContext<ContextoDatos | null>(null)

export function DatosProvider({ clave, children }: { clave: string | null; children: ReactNode }) {
  const enNube = Boolean(db && clave)
  const [datos, setDatos] = useState<Datos>(() => (enNube ? SIN_DATOS : (leerLocal() ?? SIN_DATOS)))
  const [listo, setListo] = useState(!enNube)
  const [estadoNube, setEstadoNube] = useState<EstadoNube>(enNube ? 'cargando' : 'solo-local')
  // Los cambios se calculan sobre lo último, aunque React todavía no haya vuelto a dibujar.
  const datosRef = useRef(datos)
  const sync = useRef<Sincronizador | null>(null)

  const cambiar = (nuevos: Datos) => {
    datosRef.current = nuevos
    setDatos(nuevos)
  }

  useEffect(() => {
    if (!db || !clave) return
    const poner = (nuevos: Datos) => {
      datosRef.current = nuevos
      setDatos(nuevos)
    }
    const s = new Sincronizador(db, clave, {
      alCambiarValores: (valores) => poner({ ...datosRef.current, valores }),
      alCambiarTrabajos: (trabajos, estaListo) => {
        poner({ ...datosRef.current, trabajos })
        if (estaListo) setListo(true)
      },
      alConectar: (cuentaExiste) => pasarDatosViejos(s, cuentaExiste, datosRef.current.trabajos),
      alCambiarEstado: setEstadoNube,
    })
    sync.current = s
    const parar = s.iniciar()
    // Si la nube tarda mucho, se muestra igual lo que haya.
    const demora = setTimeout(() => setListo(true), 8000)
    return () => {
      clearTimeout(demora)
      parar()
      sync.current = null
    }
  }, [clave])

  useEffect(() => {
    if (!enNube) guardarLocal(datos)
  }, [datos, enNube])

  const guardarTrabajo = (trabajo: Trabajo) => {
    const { trabajos } = datosRef.current
    const existe = trabajos.some((t) => t.id === trabajo.id)
    cambiar({
      ...datosRef.current,
      trabajos: existe ? trabajos.map((t) => (t.id === trabajo.id ? trabajo : t)) : [...trabajos, trabajo],
    })
    sync.current?.guardarTrabajo(trabajo)
  }

  const guardarValores = (valores: Valores) => {
    cambiar({ ...datosRef.current, valores })
    sync.current?.guardarValores(valores)
  }

  const quitar = (aBorrar: Trabajo[], aPapelera: boolean) => {
    if (aBorrar.length === 0) return
    cambiar({ ...datosRef.current, trabajos: datosRef.current.trabajos.filter((t) => !aBorrar.includes(t)) })
    for (const t of aBorrar) sync.current?.borrarTrabajo(t, aPapelera)
  }

  const contexto: ContextoDatos = {
    ...datos,
    listo,
    estadoNube,
    clave,
    guardarValores,
    guardarTrabajo,
    crearTrabajo: (tipo) => {
      const { valores } = datosRef.current
      const nuevo: Trabajo = {
        id: nuevoId(),
        tipo,
        nombre: '',
        empleadoIds: tipo === 'medicion' ? [] : valores.empleados.map((e) => e.id),
        trabajeYo: false,
        conPlus: false,
        tramos: [{ id: nuevoId(), fecha: hoy(), desde: '', hasta: '', feriado: false }],
        descuentos: [],
        valores: structuredClone(valores),
        creada: new Date().toISOString(),
      }
      guardarTrabajo(nuevo)
      return nuevo.id
    },
    borrarTrabajo: (id) => quitar(datosRef.current.trabajos.filter((t) => t.id === id), true),
    limpiarVacios: () => quitar(datosRef.current.trabajos.filter(estaVacio), false),
    actualizarValoresDeSemana: (inicio) => {
      for (const t of datosRef.current.trabajos.filter((t) => semanaDe(t) === inicio)) {
        guardarTrabajo({ ...t, valores: structuredClone(datosRef.current.valores) })
      }
    },
    cargarCopia: (copia) => {
      guardarValores(copia.valores)
      copia.trabajos.forEach(guardarTrabajo)
    },
    leerPapelera: () => sync.current?.leerPapelera() ?? Promise.resolve([]),
    recuperarTrabajo: (borrado) => {
      const trabajo = sync.current?.recuperarTrabajo(borrado)
      if (trabajo) cambiar({ ...datosRef.current, trabajos: [...datosRef.current.trabajos, trabajo] })
    },
  }

  return <Contexto.Provider value={contexto}>{children}</Contexto.Provider>
}

export function useDatos() {
  const contexto = useContext(Contexto)
  if (!contexto) throw new Error('useDatos tiene que usarse dentro de DatosProvider')
  return contexto
}
