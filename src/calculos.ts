import { sumarDias } from './formato.ts'
import type { Gasto, PresenciaMia, Trabajo, Tramo } from './tipos.ts'

/** Reglas que cambian entre lo que se le cobra al cliente (CR) y lo que se le paga a los empleados. */
export type Regla = {
  /** Qué valor del día del empleado se usa. */
  valorDia: 'diaConveniencia' | 'diaPago'
  /** Horas en que se divide el valor del día para sacar el valor de la hora. */
  horasDelDia: number
  /** Horas simples por día de semana; lo que pasa de acá es extra al 50%. */
  horasSimples: number
  /** Lo distinto en fábrica (en minutos). */
  fabrica: {
    /** Con esto o más en fábrica se completa el día entero (el beneficio de los chicos al pagar). */
    diaCompletoDesde: number | null
    /** Si se pasan del día por esto o menos, no se cuenta como extra. */
    tolerancia: number
  }
}

export const REGLA_CONVENIENCIA: Regla = {
  valorDia: 'diaConveniencia',
  horasDelDia: 9,
  horasSimples: 9,
  fabrica: { diaCompletoDesde: null, tolerancia: 30 },
}
export const REGLA_PAGO: Regla = {
  valorDia: 'diaPago',
  horasDelDia: 10,
  horasSimples: 10,
  fabrica: { diaCompletoDesde: 9 * 60, tolerancia: 0 },
}

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
  /** Minutos que estuvo él ese día en la estación. */
  minutosMios: number
}

/** Horas sin él en las que había `empleados` chicos. El proporcional se hace aparte para cada cantidad. */
export type GrupoProporcional = { empleados: number; horas: number }

export type MiParte =
  | { tipo: 'proporcional'; horas: number; grupos: GrupoProporcional[]; horasProporcionales: number; monto: number }
  | { tipo: 'horas'; horas: number; monto: number }
  /** Fue un rato: sus horas derecho y el proporcional por las horas en que no estuvo. */
  | {
      tipo: 'mixto'
      horasMias: number
      horasSinMi: number
      grupos: GrupoProporcional[]
      horasProporcionales: number
      montoHoras: number
      montoProporcional: number
      monto: number
    }
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
  /** Gente que mandó CR: solo el registro de sus horas (con la regla de CR), sin plata. */
  deCR: PersonaDeCR[]
}

export type PersonaDeCR = { nombre: string; tramo: Tramo; minutos: number; reparto: Reparto }

const MINUTOS_DIA = 24 * 60
const CERO: Reparto = { simples: 0, al50: 0, al100: 0 }

function aMinutos(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm)
  if (!m) return null
  return Number(m[1]) * 60 + Number(m[2])
}

/** Minutos trabajados en un tramo. Si "hasta" es menor que "desde", pasó la medianoche. Un viaje cancelado no tiene horas. */
export function minutosDelTramo(t: Tramo): number {
  if (t.cancelado) return 0
  const desde = aMinutos(t.desde)
  const hasta = aMinutos(t.hasta)
  if (desde === null || hasta === null) return 0
  const dif = hasta - desde
  return dif < 0 ? dif + MINUTOS_DIA : dif
}

/** Desde y hasta en minutos; si termina pasada la medianoche, el final pasa al día siguiente. */
function intervalo(desde: string | undefined, hasta: string | undefined): [number, number] | null {
  const d = aMinutos(desde ?? '')
  const h = aMinutos(hasta ?? '')
  if (d === null || h === null) return null
  return [d, h < d ? h + MINUTOS_DIA : h]
}

const superposicion = (a: [number, number], b: [number, number]) =>
  Math.max(0, Math.min(a[1], b[1]) - Math.max(a[0], b[0]))

/** Lo que queda de `a` sacándole `b`: nada, un pedazo o dos. */
function restar(a: [number, number], b: [number, number]): [number, number][] {
  const partes: [number, number][] = []
  if (b[0] > a[0]) partes.push([a[0], Math.min(a[1], b[0])])
  if (b[1] < a[1]) partes.push([Math.max(a[0], b[1]), a[1]])
  return partes.filter(([desde, hasta]) => hasta > desde)
}

/** Minutos que cubren unos intervalos, sin contar dos veces lo que se pisa. */
function minutosJuntos(intervalos: [number, number][]): number {
  let total = 0
  let hasta = -Infinity
  for (const [d, h] of [...intervalos].sort((a, b) => a[0] - b[0])) {
    if (h <= hasta) continue
    total += h - Math.max(d, hasta)
    hasta = h
  }
  return total
}

/** Su horario "un rato", corrido un día si está anotado del otro lado de la medianoche. */
function ratoMio(tramo: Tramo, estacion: [number, number] | null): [number, number] | null {
  const mio = intervalo(tramo.yoDesde, tramo.yoHasta)
  if (!mio || !estacion) return mio
  const corrido: [number, number] = [mio[0] + MINUTOS_DIA, mio[1] + MINUTOS_DIA]
  return superposicion(corrido, estacion) > superposicion(mio, estacion) ? corrido : mio
}

/**
 * Si él estuvo ese día en la estación. Mientras no contesta "¿Y vos fuiste?" no se suma nada de él.
 * Lo cargado antes de preguntarlo en cada día sigue la casilla "Fui yo también" del trabajo.
 */
export function presenciaMia(trabajo: Trabajo, tramo: Tramo): PresenciaMia {
  if (trabajo.tipo !== 'estacion') return 'no'
  if (tramo.yo) return tramo.yo
  if (tramo.yo === null) return 'no'
  return trabajo.trabajeYo ? 'todo' : 'no'
}

/** Día de una estación en el que todavía no contestó si fue él. */
export const faltaContestar = (trabajo: Trabajo, tramo: Tramo) => trabajo.tipo === 'estacion' && tramo.yo === null

/** Minutos que estuvo él y cuántos de esos coinciden con el horario de la estación. */
function minutosMios(trabajo: Trabajo, tramo: Tramo): { mios: number; enComun: number } {
  const presencia = presenciaMia(trabajo, tramo)
  const total = minutosDelTramo(tramo)
  if (presencia === 'todo') return { mios: total, enComun: total }
  if (presencia === 'no') return { mios: 0, enComun: 0 }
  const mio = intervalo(tramo.yoDesde, tramo.yoHasta)
  const estacion = intervalo(tramo.desde, tramo.hasta)
  if (!mio) return { mios: 0, enComun: 0 }
  const enComun = estacion
    ? Math.max(superposicion(mio, estacion), superposicion([mio[0] + MINUTOS_DIA, mio[1] + MINUTOS_DIA], estacion))
    : 0
  return { mios: mio[1] - mio[0], enComun: Math.min(enComun, total) }
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

/** Quiénes trabajaron en ese horario: los que se marcaron ese día o, si no se cambió, los de siempre del trabajo. */
export const empleadosDelTramo = (trabajo: Trabajo, tramo: Tramo): string[] =>
  trabajo.tipo === 'medicion' ? [] : (tramo.empleadoIds ?? trabajo.empleadoIds)

/** Todos los tramos de esa fecha en los que estuvo el empleado, en cualquier trabajo. */
function tramosDelEmpleadoEnFecha(empleadoId: string, fecha: string, trabajos: Trabajo[]): Tramo[] {
  return trabajos.flatMap((t) =>
    t.tramos.filter((tramo) => tramo.fecha === fecha && empleadosDelTramo(t, tramo).includes(empleadoId)),
  )
}

/**
 * Calcula un trabajo. Con la regla del cliente da lo que se le cobra; con
 * la de pago, lo que se le paga a cada empleado.
 * `todos` son todos los trabajos cargados, para combinar los días partidos.
 */
export function calcularTrabajo(trabajo: Trabajo, todos: Trabajo[], regla: Regla = REGLA_CONVENIENCIA): ResultadoTrabajo {
  // El trabajo que se está editando puede ser más nuevo que el guardado en `todos`.
  const trabajos = [trabajo, ...todos.filter((t) => t.id !== trabajo.id)]
  // Un horario todavía sin cargar va al final de su día (por ejemplo, el "otro horario" recién agregado).
  const ordenados = [...trabajo.tramos].sort((a, b) =>
    a.fecha === b.fecha ? (a.desde || '99').localeCompare(b.desde || '99') : a.fecha.localeCompare(b.fecha),
  )
  const estuvo = (empleadoId: string, tramo: Tramo) => empleadosDelTramo(trabajo, tramo).includes(empleadoId)
  // Los que fueron algún día (si todavía no hay días cargados, los de siempre).
  const idsQueFueron = new Set(ordenados.length > 0 ? ordenados.flatMap((t) => empleadosDelTramo(trabajo, t)) : trabajo.empleadoIds)
  const empleados = trabajo.tipo === 'medicion' ? [] : trabajo.valores.empleados.filter((e) => idsQueFueron.has(e.id))

  const calcularDia = (empleadoId: string | null, tramo: Tramo) => {
    // Viaje cancelado: se cobra y se paga medio día (4,5 h a CR, 5 h al pagar), sin extras.
    if (tramo.cancelado) return { reparto: CERO, relleno: (regla.horasDelDia * 60) / 2 }
    const delDia = (
      empleadoId ? tramosDelEmpleadoEnFecha(empleadoId, tramo.fecha, trabajos) : trabajo.tramos.filter((t) => t.fecha === tramo.fecha)
    ).filter((t) => !t.cancelado)
    let reparto = repartirTramo(tramo, delDia, regla)

    // En fábrica se cuenta por hora, como afuera, con dos diferencias de un día de semana:
    // - al pagar, si hicieron 9 h o más en fábrica, se les paga el día completo (su beneficio);
    // - a CR, si se pasan de las 9 h por media hora o menos, se cobran 9 h justas.
    let relleno = 0
    const feriado = delDia.some((t) => t.feriado)
    if (trabajo.tipo === 'fabrica' && tipoDeDia(tramo.fecha, feriado) === 'semana') {
      // Los horarios de este trabajo ese día en los que estuvo (todos, si no se mira a nadie en particular).
      const propios = ordenados.filter((t) => t.fecha === tramo.fecha && (!empleadoId || estuvo(empleadoId, t)))
      const enFabrica = propios.reduce((s, t) => s + minutosDelTramo(t), 0)
      const trabajados = delDia.reduce((s, t) => s + minutosDelTramo(t), 0)
      const { diaCompletoDesde, tolerancia } = regla.fabrica
      // Se completa una sola vez por fecha, en el primer horario del día.
      if (propios[0]?.id === tramo.id && diaCompletoDesde !== null && enFabrica >= diaCompletoDesde) {
        relleno = Math.max(0, regla.horasSimples * 60 - trabajados)
      }
      if (trabajados > regla.horasSimples * 60 && trabajados <= regla.horasSimples * 60 + tolerancia) {
        reparto = { ...reparto, al50: 0 }
      }
    }
    return { reparto, relleno }
  }

  const dias: DiaCalculado[] = ordenados.map((tramo) => ({
    tramo,
    minutos: minutosDelTramo(tramo),
    tipo: tipoDeDia(tramo.fecha, trabajo.tramos.some((t) => t.fecha === tramo.fecha && t.feriado)),
    // Se muestra el reparto del primero que fue en ese horario (normalmente todos hacen lo mismo).
    ...calcularDia(empleados.find((e) => estuvo(e.id, tramo))?.id ?? null, tramo),
    minutosMios: minutosMios(trabajo, tramo).mios,
  }))

  const totalMinutos = dias.reduce((suma, d) => suma + d.minutos, 0)
  const reparto = dias.reduce((suma, d) => sumar(suma, d.reparto), CERO)

  const lineas: LineaEmpleado[] = empleados.map((empleado) => {
    const valorHora = empleado[regla.valorDia] / regla.horasDelDia
    const porTramo: Record<string, Reparto> = {}
    for (const t of ordenados.filter((x) => estuvo(empleado.id, x))) {
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
  if (trabajo.tipo === 'medicion') {
    miParte = { tipo: 'horas', horas, monto: Math.round(horas * horaMia) }
  } else if (trabajo.tipo === 'estacion') {
    // Mientras él está cobra sus horas derecho (sin extras). Mientras no está, la regla de tres
    // inversa: si hubiera ido, habrían sido una persona más. Si en un horario había otra cantidad
    // de chicos (2 a la mañana, 4 a la tarde), cada horario se cuenta con los suyos.
    // Si dos horarios se pisan (Naza se sumó a la noche), en ese rato se suman los de los dos.
    let mios = 0
    const sinMiPorCantidad = new Map<number, number>()
    for (const fecha of new Set(ordenados.map((t) => t.fecha))) {
      const delDia = ordenados.filter((t) => t.fecha === fecha && !t.cancelado)
      const susRatos: [number, number][] = []
      const sinMi: { desde: number; hasta: number; cantidad: number }[] = []
      for (const tramo of delDia) {
        const estacion = intervalo(tramo.desde, tramo.hasta)
        const presencia = presenciaMia(trabajo, tramo)
        const rato = presencia === 'parte' ? ratoMio(tramo, estacion) : null
        if (presencia === 'todo' && estacion) susRatos.push(estacion)
        if (presencia === 'parte' && rato) susRatos.push(intervalo(tramo.yoDesde, tramo.yoHasta)!)
        // Los contratados y los que mandó CR también cuentan como una persona más.
        const cantidad = empleados.filter((e) => estuvo(e.id, tramo)).length + (tramo.externos?.length ?? 0)
        if (!estacion || cantidad === 0 || presencia === 'todo') continue
        const libres = presencia === 'parte' && rato ? restar(estacion, rato) : [estacion]
        for (const [desde, hasta] of libres) sinMi.push({ desde, hasta, cantidad })
      }
      mios += minutosJuntos(susRatos)
      const cortes = [...new Set(sinMi.flatMap((p) => [p.desde, p.hasta]))].sort((a, b) => a - b)
      for (let i = 0; i < cortes.length - 1; i++) {
        const [desde, hasta] = [cortes[i], cortes[i + 1]]
        const cantidad = sinMi.filter((p) => p.desde <= desde && p.hasta >= hasta).reduce((s, p) => s + p.cantidad, 0)
        if (cantidad > 0) sinMiPorCantidad.set(cantidad, (sinMiPorCantidad.get(cantidad) ?? 0) + hasta - desde)
      }
    }
    const grupos = [...sinMiPorCantidad]
      .map(([empleados, minutos]) => ({ empleados, horas: minutos / 60 }))
      .filter((g) => g.horas > 0)
    const horasMias = mios / 60
    const horasSinMi = grupos.reduce((s, g) => s + g.horas, 0)
    const horasProporcionales = grupos.reduce((s, g) => s + (g.horas * g.empleados) / (g.empleados + 1), 0)
    if (horasMias > 0 && horasProporcionales > 0) {
      const montoHoras = Math.round(horasMias * horaMia)
      const montoProporcional = Math.round(horasProporcionales * horaMia)
      miParte = {
        tipo: 'mixto',
        horasMias,
        horasSinMi,
        grupos,
        horasProporcionales,
        montoHoras,
        montoProporcional,
        monto: montoHoras + montoProporcional,
      }
    } else if (horasMias > 0) {
      miParte = { tipo: 'horas', horas: horasMias, monto: Math.round(horasMias * horaMia) }
    } else if (horasProporcionales > 0) {
      miParte = {
        tipo: 'proporcional',
        horas: horasSinMi,
        grupos,
        horasProporcionales,
        monto: Math.round(horasProporcionales * horaMia),
      }
    }
  }

  const plus = trabajo.tipo === 'estacion' && trabajo.conPlus ? Math.round(trabajo.valores.plus) : 0
  const descuentos = trabajo.descuentos.reduce((suma, d) => suma + (d.monto || 0), 0)

  // La gente de CR: sus horas con la regla de CR, sumando los horarios de esa persona ese día en este trabajo.
  const deCR = ordenados.flatMap((tramo) =>
    (tramo.externos ?? [])
      .filter((x) => x.origen === 'cr')
      .map((x) => {
        const suyos = ordenados.filter((t) => t.fecha === tramo.fecha && t.externos?.some((y) => y.origen === 'cr' && y.nombre === x.nombre))
        return { nombre: x.nombre, tramo, minutos: minutosDelTramo(tramo), reparto: repartirTramo(tramo, suyos, REGLA_CONVENIENCIA) }
      }),
  )

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
    deCR,
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

/** Lunes de cada semana con trabajos o gastos, de la más nueva a la más vieja. */
export function listarSemanas(todos: Trabajo[], gastos: Gasto[] = []): string[] {
  return [...new Set([...todos.map(semanaDe), ...gastos.map((g) => inicioDeSemana(g.fecha))])].sort().reverse()
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
  /** Gastos de la semana: se le cobran a CR aparte, sin IVA. */
  gastos: Gasto[]
  totalGastos: number
  /** Trabajos con IVA + gastos: lo que CR le paga en total. */
  totalACobrar: number
  pagos: PagoEmpleado[]
  totalPagos: number
  /** Desglose de la ganancia (suman `ganancia`). Los gastos no cuentan: los pone él y se los devuelven. */
  tuParte: number
  plus: number
  diferenciaEmpleados: number
  descuentos: number
  ganancia: number
}

export function resumirSemana(inicio: string, todos: Trabajo[], porcentajeIva: number, todosLosGastos: Gasto[] = []): ResumenSemana {
  const fin = sumarDias(inicio, 6)
  const trabajos = todos
    .filter((t) => semanaDe(t) === inicio)
    .sort((a, b) => (a.tramos[0]?.fecha ?? '').localeCompare(b.tramos[0]?.fecha ?? '') || a.creada.localeCompare(b.creada))
  // Los días partidos solo pueden combinarse con trabajos de la misma semana: así no se recorre todo el historial.
  const cercanos = todos.filter((t) => trabajos.includes(t) || t.tramos.some((x) => x.fecha >= inicio && x.fecha <= fin))
  const cobros = trabajos.map((trabajo) => ({ trabajo, resultado: calcularTrabajo(trabajo, cercanos) }))
  const sumarCobros = (dato: (r: ResultadoTrabajo) => number) => cobros.reduce((s, c) => s + dato(c.resultado), 0)

  const subtotal = sumarCobros((r) => r.total)
  const gastos = todosLosGastos
    .filter((g) => inicioDeSemana(g.fecha) === inicio)
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.creado.localeCompare(b.creado))
  const totalGastos = gastos.reduce((s, g) => s + (g.monto || 0), 0)
  const iva = Math.round((subtotal * porcentajeIva) / 100)

  // A los chicos se les paga por semana: se suman las horas de toda la semana y recién ahí se hace la cuenta.
  const pagos = new Map<string, PagoEmpleado>()
  for (const { trabajo, resultado: cobro } of cobros) {
    const pago = calcularTrabajo(trabajo, cercanos, REGLA_PAGO)
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
        // Solo los horarios en los que estuvo ese empleado.
        if (!lineaCobro.porTramo[dia.tramo.id]) continue
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
    fin,
    cobros,
    subtotal,
    porcentajeIva,
    iva,
    totalConIva: subtotal + iva,
    gastos,
    totalGastos,
    totalACobrar: subtotal + iva + totalGastos,
    pagos: listaPagos,
    totalPagos,
    tuParte: sumarCobros((r) => r.miParte.monto),
    plus: sumarCobros((r) => r.plus),
    diferenciaEmpleados: cobradoEmpleados - totalPagos,
    descuentos: sumarCobros((r) => r.descuentos),
    ganancia: subtotal - totalPagos,
  }
}
