export type Empleado = {
  id: string
  nombre: string
  /** Lo que se le cobra al cliente (CR) por un día de este empleado. */
  diaConveniencia: number
  /** Lo que se le paga al empleado por un día. */
  diaPago: number
}

export type Valores = {
  /** Nombre de él o de su empresa, sale en la planilla. */
  titular?: string
  /** A quién se le cobra (sale en las pantallas y en la planilla). */
  cliente?: string
  empleados: Empleado[]
  /** Valor de la hora de él (se usa en el proporcional, cuando trabaja él y en los viajes a medir). */
  horaMia: number
  /** Plus que se cobra por estación terminada. */
  plus: number
  /** Porcentaje de IVA para el resumen semanal. */
  iva: number
}

/** Un horario de un día: de qué hora a qué hora trabajaron. */
export type Tramo = {
  id: string
  /** AAAA-MM-DD */
  fecha: string
  /** HH:MM */
  desde: string
  /** HH:MM. Si es menor que "desde", terminó pasada la medianoche. */
  hasta: string
  feriado: boolean
}

export type Descuento = {
  id: string
  detalle: string
  monto: number
}

/**
 * - estacion: trabajo en una estación de servicio (empleados + su parte + plus).
 * - fabrica: días en fábrica (solo empleados; se cobra como mínimo el día completo).
 * - medicion: viaje de él a medir una estación (sus horas derecho).
 */
export type TipoTrabajo = 'estacion' | 'fabrica' | 'medicion'

export type Trabajo = {
  id: string
  tipo: TipoTrabajo
  nombre: string
  empleadoIds: string[]
  /** Si él trabajó en la estación cobra sus horas derecho, sin proporcional. */
  trabajeYo: boolean
  conPlus: boolean
  tramos: Tramo[]
  descuentos: Descuento[]
  /** Copia de los valores vigentes al crear el trabajo. */
  valores: Valores
  creada: string
}
