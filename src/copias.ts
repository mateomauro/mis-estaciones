// Copia completa en un archivo, para tener guardada aparte o para recuperar todo si hiciera falta.
import { hoy } from './formato.ts'
import type { Gasto, Trabajo, Valores } from './tipos.ts'

export type Copia = { valores: Valores; trabajos: Trabajo[]; gastos: Gasto[] }

export function descargarCopia(copia: Copia) {
  const contenido = JSON.stringify({ app: 'mis-estaciones', version: 1, fecha: new Date().toISOString(), ...copia }, null, 2)
  const enlace = document.createElement('a')
  enlace.href = URL.createObjectURL(new Blob([contenido], { type: 'application/json' }))
  enlace.download = `Copia Mis Estaciones ${hoy()}.json`
  enlace.click()
  setTimeout(() => URL.revokeObjectURL(enlace.href), 1000)
}

/** Lee un archivo de copia. Devuelve null si no es una copia de esta app. */
export function leerCopia(texto: string): Copia | null {
  try {
    const datos = JSON.parse(texto) as Partial<Copia> & { app?: string }
    if (datos.app !== 'mis-estaciones' || !datos.valores || !Array.isArray(datos.valores.empleados)) return null
    if (!Array.isArray(datos.trabajos) || datos.trabajos.some((t) => !t.id || !Array.isArray(t.tramos))) return null
    // Las copias de antes de los gastos no los tienen.
    const gastos = Array.isArray(datos.gastos) ? datos.gastos.filter((g) => g.id && g.fecha) : []
    return { valores: datos.valores, trabajos: datos.trabajos, gastos }
  } catch {
    return null
  }
}
