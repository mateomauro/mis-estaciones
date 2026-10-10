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
  /**
   * Si él fue ese día: no fue, todo el día o un rato (de yoDesde a yoHasta).
   * null = todavía no contestó (no se suma nada de él). Sin el dato = cargado antes del
   * cambio: sigue la casilla "trabajeYo" del trabajo.
   */
  yo?: PresenciaMia | null
  yoDesde?: string
  yoHasta?: string
  /**
   * Quiénes trabajaron en este horario, si no fueron los de siempre de la estación.
   * Sin el dato, son los del trabajo (`empleadoIds`).
   */
  empleadoIds?: string[]
  /** Gente que no es de él: contratados por ese día (los paga él y van como gasto) o mandados por CR. */
  externos?: Externo[]
  /** Viaje cancelado: a los empleados se les cobra y se les paga medio día; él no cobra nada. */
  cancelado?: boolean
}

/**
 * Alguien que trabajó en un horario sin ser empleado de él. No suma plata en la estación
 * (al contratado lo paga él y lo anota como gasto; al de CR lo paga CR), pero cuenta para su proporcional.
 */
export type Externo = {
  id: string
  nombre: string
  origen: 'contratado' | 'cr'
}

export type PresenciaMia = 'no' | 'todo' | 'parte'

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
  /** Solo para lo cargado antes de preguntar "¿Y vos fuiste?" en cada día. */
  trabajeYo: boolean
  /** Terminada: suma el plus. */
  conPlus: boolean
  /** Ya terminaron ahí (con o sin plus): deja de aparecer en "¿Dónde estuvieron hoy?". */
  cerrada?: boolean
  tramos: Tramo[]
  descuentos: Descuento[]
  /** Copia de los valores vigentes al crear el trabajo. */
  valores: Valores
  creada: string
}

export type CategoriaGasto = 'nafta' | 'comida' | 'materiales' | 'herramientas' | 'peaje' | 'personal' | 'otro'

/** Lo que él pone en efectivo y después le cobra a CR (sin IVA). */
export type Gasto = {
  id: string
  /** AAAA-MM-DD: con la fecha se sabe de qué semana es. */
  fecha: string
  monto: number
  categoria: CategoriaGasto
  nota: string
  /** De qué estación fue, si la eligió. */
  trabajoId: string | null
  /** El nombre de esa estación, por si después se borra. */
  lugar: string
  creado: string
}
