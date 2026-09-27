import { sumarDias } from './formato.ts'
import type { Trabajo, Tramo } from './tipos.ts'

/** Reglas que cambian entre lo que se le cobra al cliente (CR) y lo que se le paga a los empleados. */
export type Regla = {
  /** Qué valor del día del empleado se usa. */
  valorDia: 'diaConveniencia' | 'diaPago'
  /** Horas en que se divide el valor del día para sacar el valor de la hora. */
  horasDelDia: number
  /** Horas simples por día de semana; lo que pasa de acá es extra al 50%. */
  horasSimples: number
}

export const REGLA_CONVENIENCIA: Regla = { valorDia: 'diaConveniencia', horasDelDia: 9, horasSimples: 9 }
export const REGLA_PAGO: Regla = { valorDia: 'diaPago', horasDelDia: 10, horasSimples: 10 }

/** Horas de un tramo repartidas según cómo se pagan. Todo en minutos. */
export type Reparto = { simples: number; al50: number; al100: number }

export type TipoDia = 'semana' | 'sabado' | 'domingo' | 'feriado'

export type LineaEmpleado = {
  empleadoId: string
  nombre: string
  valorHora: number
  /** Incluye en las simples lo que se completa en fábrica para llegar al día completo. */
  reparto: Reparto
  /** El mismo reparto, día por día (clave: id del tramo). */
  porTramo: Record<string, Reparto>
  montoSimples: number
  montoAl50: number
  montoAl100: number
  montoExtras: number
  total: number
}

export type DiaCalculado = {
  tramo: Tramo
  minutos: number
  tipo: TipoDia
  /** Reparto del primer empleado (normalmente todos hacen el mismo horario). */
  reparto: Reparto
  /** En fábrica: minutos que se agregan para cobrar el día completo. */
  relleno: number
}

export type MiParte =
  | { tipo: 'proporcional'; horas: number; empleados: number; horasProporcionales: number; monto: number }
  | { tipo: 'horas'; horas: number; monto: number }
  | { tipo: 'nada'; monto: 0 }

export type ResultadoTrabajo = {
  dias: DiaCalculado[]
  totalMinutos: number
  reparto: Reparto
  empleados: LineaEmpleado[]
  totalEmpleados: number
  miParte: MiParte
  plus: number
  descuentos: number
  total: number
}

const MINUTOS_DIA = 24 * 60
const CERO: Reparto = { simples: 0, al50: 0, al100: 0 }

function aMinutos(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm)
  if (!m) return null
  return Number(m[1]) * 60 + Number(m[2])
}

/** Minutos trabajados en un tramo. Si "hasta" es menor que "desde", pasó la medianoche. */
export function minutosDelTramo(t: Tramo): number {
  const desde = aMinutos(t.desde)
  const hasta = aMinutos(t.hasta)
  if (desde === null || hasta === null) return 0
  const dif = hasta - desde
  return dif < 0 ? dif + MINUTOS_DIA : dif
}

/** Día de la semana de una fecha AAAA-MM-DD (0 = domingo). */
export function diaDeLaSemana(fecha: string): number {
  const [a, m, d] = fecha.split('-').map(Number)
  return new Date(a, m - 1, d).getDay()
}

export function tipoDeDia(fecha: string, feriado: boolean): TipoDia {
  const dia = diaDeLaSemana(fecha)
  if (dia === 0) return 'domingo'
  if (feriado) return 'feriado'
  if (dia === 6) return 'sabado'
  return 'semana'
}

/**
 * Reparte un tramo en simples y extras mirando todos los tramos que hizo la
 * misma persona ese día (pueden ser de otras estaciones). Las horas simples se
 * van usando en orden de horario: si a la mañana estuvieron 6,5 h en una
 * estación, a la tarde en la otra solo les quedan 2,5 h simples.
 */
export function repartirTramo(tramo: Tramo, tramosDelDia: Tramo[], regla: Regla): Reparto {
  const minutos = minutosDelTramo(tramo)
  const feriado = tramosDelDia.some((t) => t.feriado) || tramo.feriado
  const tipo = tipoDeDia(tramo.fecha, feriado)
  if (tipo === 'domingo') return { simples: 0, al50: 0, al100: minutos }
  if (tipo === 'sabado' || tipo === 'feriado') return { simples: 0, al50: minutos, al100: 0 }

  const inicio = aMinutos(tramo.desde) ?? 0
  const anteriores = tramosDelDia.filter((t) => {
    if (t.id === tramo.id) return false
    const otroInicio = aMinutos(t.desde) ?? 0
    return otroInicio < inicio || (otroInicio === inicio && t.id < tramo.id)
  })
  const usados = anteriores.reduce((suma, t) => suma + minutosDelTramo(t), 0)
  const simples = Math.min(minutos, Math.max(0, regla.horasSimples * 60 - usados))
  return { simples, al50: minutos - simples, al100: 0 }
}

function sumar(a: Reparto, b: Reparto): Reparto {
  return { simples: a.simples + b.simples, al50: a.al50 + b.al50, al100: a.al100 + b.al100 }
}

/** Plata de un reparto de horas. Cada parte se redondea sola para que la cuenta se pueda controlar a mano. */
function montosDe(r: Reparto, valorHora: number) {
  const montoSimples = Math.round((r.simples / 60) * valorHora)
  const montoAl50 = Math.round((r.al50 / 60) * valorHora * 1.5)
  const montoAl100 = Math.round((r.al100 / 60) * valorHora * 2)
  const montoExtras = montoAl50 + montoAl100
  return { montoSimples, montoAl50, montoAl100, montoExtras, total: montoSimples + montoExtras }
}

/** Todos los tramos de esa fecha en los que estuvo el empleado, en cualquier trabajo. */
function tramosDelEmpleadoEnFecha(empleadoId: string, fecha: string, trabajos: Trabajo[]): Tramo[] {
  return trabajos
    .filter((t) => t.tipo !== 'medicion' && t.empleadoIds.includes(empleadoId))
    .flatMap((t) => t.tramos.filter((tramo) => tramo.fecha === fecha))
}

/**
 * Calcula un trabajo. Con la regla del cliente da lo que se le cobra; con
 * la de pago, lo que se le paga a cada empleado.
 * `todos` son todos los trabajos cargados, para combinar los días partidos.
 */
export function calcularTrabajo(trabajo: Trabajo, todos: Trabajo[], regla: Regla = REGLA_CONVENIENCIA): ResultadoTrabajo {
  // El trabajo que se está editando puede ser más nuevo que el guardado en `todos`.
  const trabajos = [trabajo, ...todos.filter((t) => t.id !== trabajo.id)]
  const empleados =
    trabajo.tipo === 'medicion' ? [] : trabajo.valores.empleados.filter((e) => trabajo.empleadoIds.includes(e.id))

  const ordenados = [...trabajo.tramos].sort((a, b) =>
    a.fecha === b.fecha ? a.desde.localeCompare(b.desde) : a.fecha.localeCompare(b.fecha),
  )

  const calcularDia = (empleadoId: string | null, tramo: Tramo) => {
    const delDia = empleadoId
      ? tramosDelEmpleadoEnFecha(empleadoId, tramo.fecha, trabajos)
      : trabajo.tramos.filter((t) => t.fecha === tramo.fecha)
    const reparto = repartirTramo(tramo, delDia, regla)

    // En fábrica se cobra el día completo aunque trabajen menos. Se completa una
    // sola vez por fecha, contando todo lo que trabajó ese día.
    let relleno = 0
    const esPrimeroDelDia = ordenados.find((t) => t.fecha === tramo.fecha)?.id === tramo.id
    const feriado = delDia.some((t) => t.feriado)
    if (trabajo.tipo === 'fabrica' && esPrimeroDelDia && tipoDeDia(tramo.fecha, feriado) === 'semana') {
      const enFabrica = trabajo.tramos.filter((t) => t.fecha === tramo.fecha).reduce((s, t) => s + minutosDelTramo(t), 0)
      const trabajados = delDia.reduce((s, t) => s + minutosDelTramo(t), 0)
      if (enFabrica > 0) relleno = Math.max(0, regla.horasSimples * 60 - trabajados)
    }
    return { reparto, relleno }
  }

  const primerEmpleado = empleados[0]?.id ?? null
  const dias: DiaCalculado[] = ordenados.map((tramo) => ({
    tramo,
    minutos: minutosDelTramo(tramo),
    tipo: tipoDeDia(tramo.fecha, trabajo.tramos.some((t) => t.fecha === tramo.fecha && t.feriado)),
    ...calcularDia(primerEmpleado, tramo),
  }))

  const totalMinutos = dias.reduce((suma, d) => suma + d.minutos, 0)
  const reparto = dias.reduce((suma, d) => sumar(suma, d.reparto), CERO)

  const lineas: LineaEmpleado[] = empleados.map((empleado) => {
    const valorHora = empleado[regla.valorDia] / regla.horasDelDia
    const porTramo: Record<string, Reparto> = {}
    for (const t of ordenados) {
      const { reparto, relleno } = calcularDia(empleado.id, t)
      porTramo[t.id] = { ...reparto, simples: reparto.simples + relleno }
    }
    const r = Object.values(porTramo).reduce(sumar, CERO)
    const montos = montosDe(r, valorHora)
    return { empleadoId: empleado.id, nombre: empleado.nombre, valorHora, reparto: r, porTramo, ...montos }
  })
  const totalEmpleados = lineas.reduce((suma, l) => suma + l.total, 0)

  const horas = totalMinutos / 60
  const horaMia = trabajo.valores.horaMia
  let miParte: MiParte = { tipo: 'nada', monto: 0 }
  if (trabajo.tipo === 'medicion' || (trabajo.tipo === 'estacion' && trabajo.trabajeYo)) {
    miParte = { tipo: 'horas', horas, monto: Math.round(horas * horaMia) }
  } else if (trabajo.tipo === 'estacion' && lineas.length > 0) {
    // Regla de tres inversa: si hubiera ido él, habrían sido una persona más.
    const horasProporcionales = (horas * lineas.length) / (lineas.length + 1)
    miParte = {
      tipo: 'proporcional',
      horas,
      empleados: lineas.length,
      horasProporcionales,
      monto: Math.round(horasProporcionales * horaMia),
    }
  }

  const plus = trabajo.tipo === 'estacion' && trabajo.conPlus ? Math.round(trabajo.valores.plus) : 0
  const descuentos = trabajo.descuentos.reduce((suma, d) => suma + (d.monto || 0), 0)

  return {
    dias,
    totalMinutos,
    reparto,
    empleados: lineas,
    totalEmpleados,
    miParte,
    plus,
    descuentos,
    total: totalEmpleados + miParte.monto + plus - descuentos,
  }
}

/** Lunes de la semana de una fecha AAAA-MM-DD. */
export function inicioDeSemana(fecha: string): string {
  return sumarDias(fecha, -((diaDeLaSemana(fecha) + 6) % 7))
}

/** Semana a la que pertenece un trabajo: la de su primer día. */
export function semanaDe(trabajo: Trabajo): string {
  const primera = trabajo.tramos.map((t) => t.fecha).sort()[0]
  return inicioDeSemana(primera ?? trabajo.creada.slice(0, 10))
}

/** Lunes de cada semana con trabajos, de la más nueva a la más vieja. */
export function listarSemanas(todos: Trabajo[]): string[] {
  return [...new Set(todos.map(semanaDe))].sort().reverse()
}

/** Un día de un empleado, con cómo sale para cobrar (desde la hora 9) y para pagar (desde la hora 10). */
export type DiaEmpleado = {
  trabajo: Trabajo
  tramo: Tramo
  minutos: number
  tipo: TipoDia
  cobro: Reparto
  pago: Reparto
}

/** Horas pagadas a un mismo valor. Si cambió el valor a mitad de semana hay más de un grupo. */
export type GrupoPago = {
  valorDia: number
  valorHora: number
  reparto: Reparto
  montoSimples: number
  montoAl50: number
  montoAl100: number
  total: number
}

export type PagoEmpleado = {
  empleadoId: string
  nombre: string
  reparto: Reparto
  grupos: GrupoPago[]
  montoSimples: number
  montoExtras: number
  total: number
  /** Lo que se le cobra al cliente por este empleado en la semana. */
  cobrado: number
  cobros: { trabajo: Trabajo; linea: LineaEmpleado }[]
  dias: DiaEmpleado[]
  /** No tiene cargado lo que se le paga por día en algún trabajo de la semana. */
  faltaValor: boolean
}

export type ResumenSemana = {
  inicio: string
  fin: string
  cobros: { trabajo: Trabajo; resultado: ResultadoTrabajo }[]
  subtotal: number
  porcentajeIva: number
  iva: number
  totalConIva: number
  pagos: PagoEmpleado[]
  totalPagos: number
  /** Desglose de la ganancia (suman `ganancia`). */
  tuParte: number
  plus: number
  diferenciaEmpleados: number
  descuentos: number
  ganancia: number
}

export function resumirSemana(inicio: string, todos: Trabajo[], porcentajeIva: number): ResumenSemana {
  const trabajos = todos
    .filter((t) => semanaDe(t) === inicio)
    .sort((a, b) => (a.tramos[0]?.fecha ?? '').localeCompare(b.tramos[0]?.fecha ?? '') || a.creada.localeCompare(b.creada))
  const cobros = trabajos.map((trabajo) => ({ trabajo, resultado: calcularTrabajo(trabajo, todos) }))
  const sumarCobros = (dato: (r: ResultadoTrabajo) => number) => cobros.reduce((s, c) => s + dato(c.resultado), 0)

  const subtotal = sumarCobros((r) => r.total)
  const iva = Math.round((subtotal * porcentajeIva) / 100)

  // A los chicos se les paga por semana: se suman las horas de toda la semana y recién ahí se hace la cuenta.
  const pagos = new Map<string, PagoEmpleado>()
  for (const { trabajo, resultado: cobro } of cobros) {
    const pago = calcularTrabajo(trabajo, todos, REGLA_PAGO)
    for (const lineaPago of pago.empleados) {
      const lineaCobro = cobro.empleados.find((l) => l.empleadoId === lineaPago.empleadoId)!
      const valorDia = trabajo.valores.empleados.find((e) => e.id === lineaPago.empleadoId)?.diaPago ?? 0
      const p: PagoEmpleado = pagos.get(lineaPago.empleadoId) ?? {
        empleadoId: lineaPago.empleadoId,
        nombre: lineaPago.nombre,
        reparto: CERO,
        grupos: [],
        montoSimples: 0,
        montoExtras: 0,
        total: 0,
        cobrado: 0,
        cobros: [],
        dias: [],
        faltaValor: false,
      }
      p.nombre = lineaPago.nombre
      p.faltaValor ||= !valorDia
      p.cobros.push({ trabajo, linea: lineaCobro })
      p.cobrado += lineaCobro.total
      for (const dia of cobro.dias) {
        p.dias.push({
          trabajo,
          tramo: dia.tramo,
          minutos: dia.minutos,
          tipo: dia.tipo,
          cobro: lineaCobro.porTramo[dia.tramo.id],
          pago: lineaPago.porTramo[dia.tramo.id],
        })
      }
      let grupo = p.grupos.find((g) => g.valorDia === valorDia)
      if (!grupo) {
        grupo = { valorDia, valorHora: valorDia / REGLA_PAGO.horasDelDia, reparto: CERO, montoSimples: 0, montoAl50: 0, montoAl100: 0, total: 0 }
        p.grupos.push(grupo)
      }
      grupo.reparto = sumar(grupo.reparto, lineaPago.reparto)
      pagos.set(p.empleadoId, p)
    }
  }
  const listaPagos = [...pagos.values()].map((p) => {
    const grupos = p.grupos.map((g) => ({ ...g, ...montosDe(g.reparto, g.valorHora) }))
    const dias = [...p.dias].sort((a, b) =>
      a.tramo.fecha === b.tramo.fecha ? a.tramo.desde.localeCompare(b.tramo.desde) : a.tramo.fecha.localeCompare(b.tramo.fecha),
    )
    return {
      ...p,
      grupos,
      dias,
      reparto: grupos.reduce((r, g) => sumar(r, g.reparto), CERO),
      montoSimples: grupos.reduce((s, g) => s + g.montoSimples, 0),
      montoExtras: grupos.reduce((s, g) => s + g.montoAl50 + g.montoAl100, 0),
      total: grupos.reduce((s, g) => s + g.total, 0),
    }
  })
  const totalPagos = listaPagos.reduce((s, p) => s + p.total, 0)
  const cobradoEmpleados = sumarCobros((r) => r.totalEmpleados)

  return {
    inicio,
    fin: sumarDias(inicio, 6),
    cobros,
    subtotal,
    porcentajeIva,
    iva,
    totalConIva: subtotal + iva,
    pagos: listaPagos,
    totalPagos,
    tuParte: sumarCobros((r) => r.miParte.monto),
    plus: sumarCobros((r) => r.plus),
    diferenciaEmpleados: cobradoEmpleados - totalPagos,
    descuentos: sumarCobros((r) => r.descuentos),
    ganancia: subtotal - totalPagos,
  }
}
