import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { semanaDe } from './calculos.ts'
import { hoy, nuevoId } from './formato.ts'
import type { TipoTrabajo, Trabajo, Valores } from './tipos.ts'

// Por ahora todo se guarda en el navegador. Más adelante esto se pasa a la nube.
const CLAVE = 'mis-estaciones-v1'

type Datos = { valores: Valores; trabajos: Trabajo[] }

const VALORES_INICIALES: Valores = {
  titular: 'Furniture',
  cliente: 'CR',
  empleados: [
    { id: 'emi', nombre: 'Emi', diaConveniencia: 86567, diaPago: 83000 },
    { id: 'nico', nombre: 'Nico', diaConveniencia: 81200, diaPago: 0 },
    { id: 'naza', nombre: 'Naza', diaConveniencia: 84620, diaPago: 0 },
    { id: 'tomas', nombre: 'Tomás', diaConveniencia: 80000, diaPago: 0 },
  ],
  horaMia: 33835,
  plus: 541703,
  iva: 21,
}

function cargar(): Datos {
  try {
    const guardado = localStorage.getItem(CLAVE)
    if (guardado) {
      // La primera versión guardaba "estaciones" sin tipo.
      const datos = JSON.parse(guardado) as Partial<Datos> & { estaciones?: Trabajo[] }
      const trabajos = (datos.trabajos ?? datos.estaciones ?? []).map((t) => ({ ...t, tipo: t.tipo ?? 'estacion' }))
      return { valores: datos.valores ?? VALORES_INICIALES, trabajos }
    }
  } catch {
    // Si no se puede leer arrancamos con los valores iniciales.
  }
  return { valores: VALORES_INICIALES, trabajos: [] }
}

/** Un trabajo recién creado que nunca se completó. */
const estaVacio = (t: Trabajo) => !t.nombre.trim() && t.tramos.every((tramo) => !tramo.desde && !tramo.hasta)

type ContextoDatos = Datos & {
  guardarValores: (valores: Valores) => void
  crearTrabajo: (tipo: TipoTrabajo) => string
  guardarTrabajo: (trabajo: Trabajo) => void
  borrarTrabajo: (id: string) => void
  limpiarVacios: () => void
  /** Pasa los valores de hoy a todos los trabajos de esa semana. */
  actualizarValoresDeSemana: (inicio: string) => void
}

const Contexto = createContext<ContextoDatos | null>(null)

export function DatosProvider({ children }: { children: ReactNode }) {
  const [datos, setDatos] = useState<Datos>(cargar)

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE, JSON.stringify(datos))
    } catch {
      // Sin espacio o bloqueado: los datos siguen en memoria mientras la app esté abierta.
    }
  }, [datos])

  const crearTrabajo = (tipo: TipoTrabajo) => {
    const id = nuevoId()
    setDatos((d) => {
      const nuevo: Trabajo = {
        id,
        tipo,
        nombre: '',
        empleadoIds: tipo === 'medicion' ? [] : d.valores.empleados.map((e) => e.id),
        trabajeYo: false,
        conPlus: false,
        tramos: [{ id: nuevoId(), fecha: hoy(), desde: '', hasta: '', feriado: false }],
        descuentos: [],
        valores: structuredClone(d.valores),
        creada: new Date().toISOString(),
      }
      return { ...d, trabajos: [...d.trabajos, nuevo] }
    })
    return id
  }

  const contexto: ContextoDatos = {
    ...datos,
    guardarValores: (valores) => setDatos((d) => ({ ...d, valores })),
    crearTrabajo,
    guardarTrabajo: (trabajo) =>
      setDatos((d) => ({ ...d, trabajos: d.trabajos.map((t) => (t.id === trabajo.id ? trabajo : t)) })),
    borrarTrabajo: (id) => setDatos((d) => ({ ...d, trabajos: d.trabajos.filter((t) => t.id !== id) })),
    limpiarVacios: () =>
      setDatos((d) => (d.trabajos.some(estaVacio) ? { ...d, trabajos: d.trabajos.filter((t) => !estaVacio(t)) } : d)),
    actualizarValoresDeSemana: (inicio) =>
      setDatos((d) => ({
        ...d,
        trabajos: d.trabajos.map((t) => (semanaDe(t) === inicio ? { ...t, valores: structuredClone(d.valores) } : t)),
      })),
  }

  return <Contexto.Provider value={contexto}>{children}</Contexto.Provider>
}

export function useDatos() {
  const contexto = useContext(Contexto)
  if (!contexto) throw new Error('useDatos tiene que usarse dentro de DatosProvider')
  return contexto
}
