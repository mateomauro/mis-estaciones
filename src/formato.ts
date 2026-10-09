const pesos = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

export const plata = (monto: number) => pesos.format(Math.round(monto))

export const numero = (n: number) => n.toLocaleString('es-AR', { maximumFractionDigits: 2 })

/** Minutos a horas con coma: 870 → "14,5". */
export const horas = (minutos: number) => numero(minutos / 60)

function aFecha(fecha: string) {
  const [a, m, d] = fecha.split('-').map(Number)
  return new Date(a, m - 1, d)
}

function aTexto(fecha: Date) {
  const m = String(fecha.getMonth() + 1).padStart(2, '0')
  const d = String(fecha.getDate()).padStart(2, '0')
  return `${fecha.getFullYear()}-${m}-${d}`
}

const mayuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1)

/** "2026-09-08" → "Martes" */
export const nombreDia = (fecha: string) =>
  mayuscula(aFecha(fecha).toLocaleDateString('es-AR', { weekday: 'long' }))

/** "2026-09-08" → "8/9" */
export const fechaCorta = (fecha: string) => {
  const f = aFecha(fecha)
  return `${f.getDate()}/${f.getMonth() + 1}`
}

export const fechaLarga = (fecha: Date) =>
  mayuscula(fecha.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }))

/** "2026-10-09" → "Viernes 9 de octubre" */
export const fechaConDia = (fecha: string) => {
  const f = aFecha(fecha)
  return `${nombreDia(fecha)} ${f.getDate()} de ${MESES[f.getMonth()]}`
}

/** "2026-10-09" → "viernes 9/10" */
export const diaYFecha = (fecha: string) => `${nombreDia(fecha).toLowerCase()} ${fechaCorta(fecha)}`

/** "2026-10-05", "2026-10-11" → "5 al 11/10"; "2026-09-28", "2026-10-04" → "28/9 al 4/10" */
export const rangoCorto = (desde: string, hasta: string) => {
  const a = aFecha(desde)
  const b = aFecha(hasta)
  return a.getMonth() === b.getMonth() ? `${a.getDate()} al ${fechaCorta(hasta)}` : `${fechaCorta(desde)} al ${fechaCorta(hasta)}`
}

/** ["Emi", "Nico", "Naza"] → "Emi, Nico y Naza" */
export const conY = (nombres: string[]) =>
  nombres.length <= 1 ? (nombres[0] ?? '') : `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1)}`

export const hoy = () => aTexto(new Date())

export const sumarDias = (fecha: string, dias: number) => {
  const f = aFecha(fecha)
  f.setDate(f.getDate() + dias)
  return aTexto(f)
}

// crypto.randomUUID no existe cuando se abre por la red local (http), por eso un id casero.
export const nuevoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

/** "2026-09-07", "2026-09-13" → "del 7 al 13 de septiembre" (o "del 28 de septiembre al 4 de octubre"). */
export const rangoDeFechas = (desde: string, hasta: string) => {
  const a = aFecha(desde)
  const b = aFecha(hasta)
  return a.getMonth() === b.getMonth()
    ? `del ${a.getDate()} al ${b.getDate()} de ${MESES[b.getMonth()]}`
    : `del ${a.getDate()} de ${MESES[a.getMonth()]} al ${b.getDate()} de ${MESES[b.getMonth()]}`
}

/** Fechas de los días de un trabajo: "7/9", "7/9 al 11/9". */
export const diasCortos = (fechas: string[]) => {
  const orden = [...fechas].sort()
  if (orden.length === 0) return 'Sin días cargados'
  const primera = orden[0]
  const ultima = orden[orden.length - 1]
  return primera === ultima ? fechaCorta(primera) : `${fechaCorta(primera)} al ${fechaCorta(ultima)}`
}

/** Plata con centavos si los tiene, para mostrar el valor de la hora en las cuentas: "$ 9.618,56". */
export const plataExacta = (monto: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(monto)

/**
 * Entiende la hora como la escriba: "730", "7.30", "7,30", "7:30" o "7 30" → "07:30";
 * "20" → "20:00"; "2015" → "20:15"; "0.15" → "00:15". Devuelve null si no es una hora.
 */
export function interpretarHora(texto: string): string | null {
  const t = texto.trim().replace(/\s*h(s|oras?)?$/i, '')
  let h: number
  let m: number
  const conSeparador = /^(\d{1,2})\s*[:.,h ]\s*(\d{1,2})$/i.exec(t)
  if (conSeparador) {
    h = Number(conSeparador[1])
    // "7.3" es 7:30, como se escribe a mano.
    m = conSeparador[2].length === 1 ? Number(conSeparador[2]) * 10 : Number(conSeparador[2])
  } else if (/^\d{1,4}$/.test(t)) {
    h = Number(t.length <= 2 ? t : t.slice(0, -2))
    m = t.length <= 2 ? 0 : Number(t.slice(-2))
  } else {
    return null
  }
  if (h === 24 && m === 0) h = 0
  if (h > 23 || m > 59) return null
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
