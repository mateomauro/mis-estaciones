// Pruebas con las estaciones reales de las hojas de papel (semana del 7 al 13 de septiembre).
// La app hace la cuenta exacta y él redondea en el camino, así que se permiten unos pesos de diferencia.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  calcularTrabajo,
  inicioDeSemana,
  listarSemanas,
  minutosDelTramo,
  REGLA_PAGO,
  resumirSemana,
} from '../src/calculos.ts'
import type { Trabajo, Tramo, Valores } from '../src/tipos.ts'

const valores: Valores = {
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

let n = 0
const tramo = (fecha: string, desde: string, hasta: string, feriado = false): Tramo => ({
  id: `t${String(++n).padStart(3, '0')}`,
  fecha,
  desde,
  hasta,
  feriado,
})

const trabajo = (datos: Partial<Trabajo>): Trabajo => ({
  id: `e${++n}`,
  tipo: 'estacion',
  nombre: '',
  empleadoIds: ['emi', 'nico', 'naza', 'tomas'],
  trabajeYo: false,
  conPlus: false,
  tramos: [],
  descuentos: [],
  valores,
  creada: '2026-09-07T10:00:00Z',
  ...datos,
})

const horas = (minutos: number) => minutos / 60
const cerca = (real: number, esperado: number, margen: number) =>
  assert.ok(Math.abs(real - esperado) <= margen, `${real} no está cerca de ${esperado} (±${margen})`)

const magnolia = trabajo({
  nombre: 'Opessa Magnolia',
  conPlus: true,
  tramos: [tramo('2026-09-07', '05:45', '20:15'), tramo('2026-09-08', '07:30', '14:00')],
})

const nicaragua = trabajo({
  nombre: 'Opessa Nicaragua',
  tramos: [
    tramo('2026-09-08', '14:00', '20:30'),
    tramo('2026-09-09', '07:30', '20:20'),
    tramo('2026-09-10', '07:30', '20:20'),
    tramo('2026-09-11', '07:30', '00:15'),
  ],
})

const shell = trabajo({
  nombre: 'Shell Las Palmeras',
  empleadoIds: [],
  trabajeYo: true,
  conPlus: true,
  tramos: [
    tramo('2026-09-08', '06:00', '21:00'),
    tramo('2026-09-09', '07:00', '21:00'),
    tramo('2026-09-10', '07:00', '20:10'),
    tramo('2026-09-11', '05:00', '14:00'),
  ],
})

const semana = [magnolia, nicaragua, shell]

test('Opessa Magnolia: 21 h, 5,5 extras y proporcional de 16,8 h', () => {
  const r = calcularTrabajo(magnolia, semana)
  assert.equal(horas(r.totalMinutos), 21)
  assert.equal(horas(r.reparto.al50), 5.5)
  assert.equal(r.miParte.tipo, 'proporcional')
  if (r.miParte.tipo === 'proporcional') assert.equal(r.miParte.horasProporcionales, 16.8)
  assert.equal(r.miParte.monto, 568428)
  assert.equal(r.plus, 541703)
  cerca(r.totalEmpleados, 876383, 1000)
  cerca(r.total, 1986514, 1000)
})

test('Opessa Nicaragua: el martes combina con Magnolia (2,5 simples + 4 extras)', () => {
  const r = calcularTrabajo(nicaragua, semana)
  const martes = r.dias[0]
  assert.equal(horas(martes.reparto.simples), 2.5)
  assert.equal(horas(martes.reparto.al50), 4)
  cerca(horas(r.totalMinutos), 48.91, 0.01)
  cerca(horas(r.reparto.al50), 19.41, 0.01)
  cerca(r.miParte.monto, 1323895, 200)
  const nico = r.empleados.find((e) => e.nombre === 'Nico')!
  const tomas = r.empleados.find((e) => e.nombre === 'Tomás')!
  cerca(nico.total, 529011, 1000)
  cerca(tomas.total, 521193, 1000)
  assert.equal(r.plus, 0)
})

test('Shell Las Palmeras: trabaja él con gente de fábrica, horas derecho sin proporcional', () => {
  const r = calcularTrabajo(shell, semana)
  assert.equal(r.totalEmpleados, 0)
  assert.equal(r.miParte.tipo, 'horas')
  cerca(r.miParte.monto, 1731336, 200)
  cerca(r.total, 2273039, 200)
})

test('Si él trabaja con sus empleados: los empleados se cobran normal y él sus horas', () => {
  const e = trabajo({ empleadoIds: ['emi'], trabajeYo: true, tramos: [tramo('2026-09-14', '07:00', '19:00')] })
  const r = calcularTrabajo(e, [e])
  assert.equal(horas(r.empleados[0].reparto.simples), 9)
  assert.equal(horas(r.empleados[0].reparto.al50), 3)
  assert.equal(r.miParte.monto, 12 * 33835)
})

test('Sábado y feriado van todo al 1,5; domingo todo al 2', () => {
  const e = trabajo({
    empleadoIds: ['emi'],
    tramos: [
      tramo('2026-09-12', '06:00', '14:00'),
      tramo('2026-09-13', '07:00', '20:00'),
      tramo('2026-09-14', '07:00', '20:00', true),
    ],
  })
  const r = calcularTrabajo(e, [e])
  const [sabado, domingo, feriado] = r.dias
  assert.deepEqual(sabado.reparto, { simples: 0, al50: 8 * 60, al100: 0 })
  assert.deepEqual(domingo.reparto, { simples: 0, al50: 0, al100: 13 * 60 })
  assert.deepEqual(feriado.reparto, { simples: 0, al50: 13 * 60, al100: 0 })
  const hora = 86567 / 9
  assert.equal(r.empleados[0].montoExtras, Math.round(21 * hora * 1.5) + Math.round(13 * hora * 2))
})

test('Turno que pasa la medianoche cuenta entero para el día que empezó', () => {
  assert.equal(minutosDelTramo(tramo('2026-09-11', '07:30', '00:15')), 16.75 * 60)
})

test('Descuentos se restan del total', () => {
  const e = trabajo({
    tramos: [tramo('2026-09-14', '07:00', '16:00')],
    descuentos: [{ id: 'd', detalle: 'Se fue antes', monto: 10000 }],
  })
  const r = calcularTrabajo(e, [e])
  assert.equal(r.total, r.totalEmpleados + r.miParte.monto - 10000)
})

test('Fábrica: con menos de 9 h se cobra por hora, sin proporcional ni plus', () => {
  const f = trabajo({ tipo: 'fabrica', empleadoIds: ['emi'], conPlus: true, tramos: [tramo('2026-09-14', '07:00', '14:00')] })
  const r = calcularTrabajo(f, [f])
  assert.equal(r.dias[0].relleno, 0)
  assert.equal(r.empleados[0].total, Math.round((7 * 86567) / 9))
  assert.equal(r.miParte.monto, 0)
  assert.equal(r.plus, 0)
  assert.equal(r.total, r.empleados[0].total)
})

test('Fábrica: los ejemplos del papá (día a CR $83.200, pago $70.000)', () => {
  const tomas = { ...valores, empleados: [{ id: 'tomas', nombre: 'Tomás', diaConveniencia: 83200, diaPago: 70000 }] }
  const dia = (hasta: string) => {
    const f = trabajo({ tipo: 'fabrica', empleadoIds: ['tomas'], valores: tomas, tramos: [tramo('2026-09-14', '06:00', hasta)] })
    return [calcularTrabajo(f, [f]).total, calcularTrabajo(f, [f], REGLA_PAGO).total]
  }
  assert.deepEqual(dia('13:00'), [64711, 49000]) // 7 h
  assert.deepEqual(dia('15:00'), [83200, 70000]) // 9 h
  assert.deepEqual(dia('15:30'), [83200, 70000]) // 9,5 h: la media hora de más no se cobra
  assert.deepEqual(dia('16:00'), [97067, 70000]) // 10 h: 1 extra a CR
  assert.deepEqual(dia('18:00'), [124800, 91000]) // 12 h: 3 extras a CR, 2 al pagar
})

test('Fábrica: también hacen extras, y el sábado no se completa el día', () => {
  const f = trabajo({
    tipo: 'fabrica',
    empleadoIds: ['emi'],
    tramos: [tramo('2026-09-14', '07:00', '17:00'), tramo('2026-09-19', '07:00', '12:00')],
  })
  const r = calcularTrabajo(f, [f])
  assert.deepEqual(r.empleados[0].reparto, { simples: 9 * 60, al50: (1 + 5) * 60, al100: 0 })
})

test('Fábrica: si ese día también fueron a una estación, no se completa de más', () => {
  const f = trabajo({ tipo: 'fabrica', empleadoIds: ['emi'], tramos: [tramo('2026-09-14', '07:00', '11:00')] })
  const e = trabajo({ empleadoIds: ['emi'], tramos: [tramo('2026-09-14', '12:00', '17:00')] })
  assert.equal(calcularTrabajo(f, [f, e]).dias[0].relleno, 0)
  assert.equal(horas(calcularTrabajo(e, [f, e]).empleados[0].reparto.simples), 5)
})

test('Fábrica en el pago: con 9 h o más se paga el día completo de 10 h; con menos, por hora', () => {
  const f = trabajo({ tipo: 'fabrica', empleadoIds: ['emi'], tramos: [tramo('2026-09-14', '07:00', '14:00')] })
  assert.equal(calcularTrabajo(f, [f], REGLA_PAGO).empleados[0].total, 7 * 8300)
  const completo = trabajo({ tipo: 'fabrica', empleadoIds: ['emi'], tramos: [tramo('2026-09-14', '06:00', '15:00')] })
  assert.equal(calcularTrabajo(completo, [completo], REGLA_PAGO).empleados[0].total, 83000)
})

test('Viaje a medir: sus horas derecho y no cuenta para los empleados', () => {
  const m = trabajo({ tipo: 'medicion', tramos: [tramo('2026-09-14', '07:00', '21:00')] })
  const e = trabajo({ empleadoIds: ['emi'], tramos: [tramo('2026-09-14', '07:00', '16:00')] })
  const r = calcularTrabajo(m, [m, e])
  assert.equal(r.empleados.length, 0)
  assert.equal(r.total, 14 * 33835)
  assert.equal(horas(calcularTrabajo(e, [m, e]).empleados[0].reparto.simples), 9)
})

test('Pago a empleados: hora = día / 10 y extras después de 10 h, combinando estaciones', () => {
  const resumen = resumirSemana('2026-09-07', semana, 21)
  const emi = resumen.pagos.find((p) => p.empleadoId === 'emi')!
  // Magnolia: 16,5 simples + 4,5 extras. Nicaragua: 33,5 simples + 15,42 extras (el martes suma 13 h).
  assert.equal(horas(emi.reparto.simples), 50)
  cerca(horas(emi.reparto.al50), 4.5 + 15.4167, 0.001)
  // Se paga sobre el total de la semana: 50 h simples y 1195 minutos de extras.
  assert.equal(emi.total, Math.round(50 * 8300) + Math.round((1195 / 60) * 8300 * 1.5))
  // Detalle día por día con las dos cuentas: el martes en Nicaragua (13 h en el día) es extra desde la hora 9
  // para cobrar y desde la hora 10 para pagar.
  const martesNicaragua = emi.dias.find((d) => d.trabajo.id === nicaragua.id && d.tramo.fecha === '2026-09-08')!
  assert.deepEqual(martesNicaragua.cobro, { simples: 150, al50: 240, al100: 0 })
  assert.deepEqual(martesNicaragua.pago, { simples: 210, al50: 180, al100: 0 })
  assert.equal(emi.dias.length, 6)
  assert.equal(emi.cobrado, emi.cobros.reduce((s, c) => s + c.linea.total, 0))
  assert.equal(emi.faltaValor, false)
  assert.equal(resumen.pagos.find((p) => p.empleadoId === 'nico')!.faltaValor, true)
})

test('Resumen semanal: suma las estaciones, agrega IVA y la ganancia cierra', () => {
  const r = resumirSemana('2026-09-07', semana, 21)
  assert.equal(r.fin, '2026-09-13')
  assert.equal(r.cobros.length, 3)
  const suma = r.cobros.reduce((s, c) => s + c.resultado.total, 0)
  assert.equal(r.subtotal, suma)
  assert.equal(r.iva, Math.round(suma * 0.21))
  assert.equal(r.totalConIva, suma + r.iva)
  assert.equal(r.ganancia, r.subtotal - r.totalPagos)
  assert.equal(r.tuParte + r.plus + r.diferenciaEmpleados - r.descuentos, r.ganancia)
})

test('Semanas: de lunes a domingo, la más nueva primero', () => {
  assert.equal(inicioDeSemana('2026-09-13'), '2026-09-07')
  assert.equal(inicioDeSemana('2026-09-07'), '2026-09-07')
  assert.equal(inicioDeSemana('2026-09-12'), '2026-09-07')
  const otra = trabajo({ tramos: [tramo('2026-09-15', '07:00', '16:00')] })
  assert.deepEqual(listarSemanas([...semana, otra]), ['2026-09-14', '2026-09-07'])
})

test('La hora se entiende como la escriba', async () => {
  const { interpretarHora } = await import('../src/formato.ts')
  const casos: [string, string | null][] = [
    ['730', '07:30'],
    ['7.30', '07:30'],
    ['7,30', '07:30'],
    ['7:30', '07:30'],
    ['7 30', '07:30'],
    ['7.3', '07:30'],
    ['7', '07:00'],
    ['20', '20:00'],
    ['2015', '20:15'],
    ['20.15', '20:15'],
    ['0.15', '00:15'],
    ['015', '00:15'],
    ['24', '00:00'],
    ['7hs', '07:00'],
    ['25', null],
    ['7.75', null],
    ['hola', null],
    ['', null],
  ]
  for (const [texto, esperado] of casos) assert.equal(interpretarHora(texto), esperado, texto)
})

test('Él fue un rato: sus horas derecho + proporcional por las horas en que no estuvo', () => {
  // Estación Test: 3 empleados de 8 a 18 (10 h) y él de 10 a 13 (3 h).
  const e = trabajo({
    empleadoIds: ['emi', 'nico', 'naza'],
    trabajeYo: true,
    tramos: [{ ...tramo('2026-10-05', '08:00', '18:00'), yo: 'parte', yoDesde: '10:00', yoHasta: '13:00' }],
  })
  const r = calcularTrabajo(e, [e])
  assert.equal(r.miParte.tipo, 'mixto')
  if (r.miParte.tipo !== 'mixto') return
  assert.equal(r.miParte.horasMias, 3)
  assert.equal(r.miParte.horasSinMi, 7)
  assert.equal(r.miParte.horasProporcionales, 5.25)
  assert.equal(r.miParte.montoHoras, 3 * 33835)
  assert.equal(r.miParte.montoProporcional, Math.round(5.25 * 33835))
  assert.equal(r.miParte.monto, 279139)
  // A los empleados no les cambia nada.
  assert.equal(horas(r.empleados[0].reparto.simples), 9)
  assert.equal(horas(r.empleados[0].reparto.al50), 1)
  assert.equal(r.dias[0].minutosMios, 3 * 60)
})

test('Él: un día entero, otro no fue y otro un rato fuera del horario de los chicos', () => {
  const e = trabajo({
    empleadoIds: ['emi', 'nico', 'naza'],
    trabajeYo: true,
    tramos: [
      { ...tramo('2026-10-05', '08:00', '18:00'), yo: 'todo' },
      { ...tramo('2026-10-06', '08:00', '18:00'), yo: 'no' },
      // Llegó antes que los chicos: de 7 a 13 son 6 h suyas, 5 h en común con ellos.
      { ...tramo('2026-10-07', '08:00', '18:00'), yo: 'parte', yoDesde: '07:00', yoHasta: '13:00' },
    ],
  })
  const r = calcularTrabajo(e, [e])
  if (r.miParte.tipo !== 'mixto') throw new Error(r.miParte.tipo)
  assert.equal(r.miParte.horasMias, 10 + 0 + 6)
  assert.equal(r.miParte.horasSinMi, 0 + 10 + 5)
})

test('Si marcó que fue pero ningún día estuvo, cobra el proporcional como siempre', () => {
  const e = trabajo({ trabajeYo: true, tramos: [{ ...tramo('2026-10-05', '08:00', '18:00'), yo: 'no' }] })
  const r = calcularTrabajo(e, [e])
  assert.equal(r.miParte.tipo, 'proporcional')
  assert.equal(r.miParte.monto, Math.round(((10 * 4) / 5) * 33835))
})

test('"¿Y vos fuiste?" se pregunta en cada día: sin contestar no suma nada de él', () => {
  const e = trabajo({
    empleadoIds: ['emi', 'nico', 'naza'],
    trabajeYo: false,
    tramos: [
      { ...tramo('2026-10-12', '08:00', '18:00'), yo: 'todo' },
      { ...tramo('2026-10-13', '08:00', '18:00'), yo: null },
    ],
  })
  const r = calcularTrabajo(e, [e])
  // Ya no hace falta la casilla "Fui yo también": el lunes contestó "Todo el día".
  if (r.miParte.tipo !== 'mixto') throw new Error(r.miParte.tipo)
  assert.equal(r.miParte.horasMias, 10)
  // El martes sin contestar cuenta como que no fue (proporcional por esas horas).
  assert.equal(r.miParte.horasSinMi, 10)
})

test('Lo cargado antes del cambio sigue la casilla "Fui yo también"', () => {
  const viejo = trabajo({ trabajeYo: true, tramos: [tramo('2026-10-12', '08:00', '18:00')] })
  assert.equal(calcularTrabajo(viejo, [viejo]).miParte.tipo, 'horas')
  const viejoSinEl = trabajo({ trabajeYo: false, tramos: [tramo('2026-10-12', '08:00', '18:00')] })
  assert.equal(calcularTrabajo(viejoSinEl, [viejoSinEl]).miParte.tipo, 'proporcional')
})

test('Gastos: se le cobran a CR sin IVA y no cambian lo que le queda', () => {
  const gasto = (id: string, fecha: string, monto: number) =>
    ({ id, fecha, monto, categoria: 'nafta', nota: '', trabajoId: null, lugar: '', creado: fecha }) as const
  const gastos = [gasto('g1', '2026-09-11', 40000), gasto('g2', '2026-09-13', 22000), gasto('g3', '2026-09-14', 9999)]
  const sin = resumirSemana('2026-09-07', semana, 21)
  const con = resumirSemana('2026-09-07', semana, 21, gastos)
  assert.equal(con.gastos.length, 2)
  assert.equal(con.totalGastos, 62000)
  assert.equal(con.iva, sin.iva)
  assert.equal(con.totalACobrar, sin.totalConIva + 62000)
  assert.equal(con.ganancia, sin.ganancia)
  assert.deepEqual(listarSemanas([], gastos), ['2026-09-14', '2026-09-07'])
})

// ——— Otra gente según el día ———

const lineaDe = (r: ReturnType<typeof calcularTrabajo>, id: string) => r.empleados.find((l) => l.empleadoId === id)!

test('Otra gente según el día: a cada uno solo lo suyo y el proporcional con los de cada día', () => {
  const t = trabajo({
    tramos: [
      tramo('2026-09-14', '08:00', '17:00'),
      { ...tramo('2026-09-15', '08:00', '17:00'), empleadoIds: ['emi', 'nico'] },
    ],
  })
  const r = calcularTrabajo(t, [t])
  assert.equal(r.empleados.length, 4)
  assert.equal(lineaDe(r, 'emi').reparto.simples, 18 * 60)
  assert.equal(lineaDe(r, 'naza').reparto.simples, 9 * 60)
  // 9 h × 4 ÷ 5 + 9 h × 2 ÷ 3 = 7,2 + 6 = 13,2 h
  assert.equal(r.miParte.tipo, 'proporcional')
  if (r.miParte.tipo !== 'proporcional') return
  assert.deepEqual(r.miParte.grupos, [
    { empleados: 4, horas: 9 },
    { empleados: 2, horas: 9 },
  ])
  cerca(r.miParte.horasProporcionales, 13.2, 1e-9)
  assert.equal(r.miParte.monto, Math.round(13.2 * valores.horaMia))
})

test('Mismo día en dos horarios: 2 a la mañana y 4 a la tarde, cada horario con los suyos', () => {
  const t = trabajo({
    tramos: [
      { ...tramo('2026-09-16', '07:00', '12:00'), empleadoIds: ['emi', 'nico'] },
      tramo('2026-09-16', '12:00', '18:00'),
    ],
  })
  const r = calcularTrabajo(t, [t])
  // Emi hizo 11 h en el día: 9 simples + 2 extras. Naza fue solo a la tarde: 6 simples.
  assert.deepEqual(lineaDe(r, 'emi').reparto, { simples: 9 * 60, al50: 2 * 60, al100: 0 })
  assert.deepEqual(lineaDe(r, 'naza').reparto, { simples: 6 * 60, al50: 0, al100: 0 })
  if (r.miParte.tipo !== 'proporcional') return assert.fail('tenía que ser proporcional')
  cerca(r.miParte.horasProporcionales, (5 * 2) / 3 + (6 * 4) / 5, 1e-9)
})

test('Pago semanal: a cada uno solo se le cuentan los horarios en los que estuvo', () => {
  const t = trabajo({
    tramos: [tramo('2026-09-14', '08:00', '17:00'), { ...tramo('2026-09-15', '08:00', '17:00'), empleadoIds: ['emi'] }],
  })
  const semana = resumirSemana('2026-09-14', [t], 21)
  const pago = (id: string) => semana.pagos.find((p) => p.empleadoId === id)!
  assert.equal(pago('emi').dias.length, 2)
  assert.equal(pago('nico').dias.length, 1)
  assert.equal(pago('emi').reparto.simples, 18 * 60)
})

test('Fábrica en dos horarios: a cada uno se le cuenta lo que hizo él', () => {
  const t = trabajo({
    tipo: 'fabrica',
    tramos: [{ ...tramo('2026-09-17', '06:00', '12:00'), empleadoIds: ['emi', 'nico'] }, tramo('2026-09-17', '12:00', '15:30')],
  })
  const pago = calcularTrabajo(t, [t], REGLA_PAGO)
  // Emi hizo el día entero (9,5 h): se le paga el día completo. Naza solo la tarde (3,5 h): por hora.
  assert.equal(lineaDe(pago, 'emi').reparto.simples, 10 * 60)
  assert.equal(lineaDe(pago, 'naza').reparto.simples, 3.5 * 60)
  const cobro = calcularTrabajo(t, [t])
  assert.deepEqual(lineaDe(cobro, 'emi').reparto, { simples: 9 * 60, al50: 0, al100: 0 })
  assert.equal(cobro.miParte.tipo, 'nada')
})

// ——— Gente de afuera y viaje cancelado ———

test('Contratados: cuentan para el proporcional pero no suman plata en la estación', () => {
  const t = trabajo({
    tramos: [
      {
        ...tramo('2026-09-16', '08:00', '17:00'),
        empleadoIds: ['tomas'],
        externos: [
          { id: 'x1', nombre: 'Luciano', origen: 'contratado' },
          { id: 'x2', nombre: 'Juan', origen: 'contratado' },
        ],
      },
    ],
  })
  const r = calcularTrabajo(t, [t])
  assert.deepEqual(
    r.empleados.map((l) => l.nombre),
    ['Tomás'],
  )
  if (r.miParte.tipo !== 'proporcional') return assert.fail('tenía que ser proporcional')
  // 9 h × 3 ÷ 4: Tomás + los dos contratados.
  assert.deepEqual(r.miParte.grupos, [{ empleados: 3, horas: 9 }])
  assert.equal(r.total, lineaDe(r, 'tomas').total + Math.round(((9 * 3) / 4) * valores.horaMia))
})

test('Viaje cancelado: medio día a CR (4,5 h) y medio día de pago (5 h); él no cobra nada', () => {
  const t = trabajo({
    trabajeYo: true,
    tramos: [{ ...tramo('2026-09-14', '', ''), empleadoIds: ['emi'], cancelado: true, yo: 'todo' }],
  })
  const cobro = calcularTrabajo(t, [t])
  assert.equal(lineaDe(cobro, 'emi').reparto.simples, 4.5 * 60)
  assert.equal(lineaDe(cobro, 'emi').total, Math.round(86567 / 2))
  assert.equal(cobro.miParte.monto, 0)
  assert.equal(cobro.totalMinutos, 0)
  const pago = calcularTrabajo(t, [t], REGLA_PAGO)
  assert.equal(lineaDe(pago, 'emi').reparto.simples, 5 * 60)
  assert.equal(lineaDe(pago, 'emi').total, Math.round(83000 / 2))
})

test('Viaje cancelado: no le gasta horas simples a otro horario de ese día', () => {
  const t = trabajo({
    tramos: [
      { ...tramo('2026-09-14', '', ''), empleadoIds: ['emi'], cancelado: true },
      { ...tramo('2026-09-14', '08:00', '17:00'), empleadoIds: ['emi'] },
    ],
  })
  const r = calcularTrabajo(t, [t])
  assert.deepEqual(lineaDe(r, 'emi').reparto, { simples: 4.5 * 60 + 9 * 60, al50: 0, al100: 0 })
})

test('Gente de CR: queda el registro de sus horas con la regla de CR, sin plata', () => {
  const t = trabajo({
    tramos: [{ ...tramo('2026-09-16', '07:00', '18:00'), externos: [{ id: 'x1', nombre: 'Pedro', origen: 'cr' }] }],
  })
  const r = calcularTrabajo(t, [t])
  assert.equal(r.deCR.length, 1)
  assert.equal(r.deCR[0].nombre, 'Pedro')
  assert.deepEqual(r.deCR[0].reparto, { simples: 9 * 60, al50: 2 * 60, al100: 0 })
  assert.ok(!r.empleados.some((l) => l.nombre === 'Pedro'))
  if (r.miParte.tipo !== 'proporcional') return assert.fail('tenía que ser proporcional')
  assert.deepEqual(r.miParte.grupos, [{ empleados: 5, horas: 11 }])
})

test('Horarios que se pisan: en ese rato se suman los de los dos (3 todo el día, Naza se suma a la noche)', () => {
  const t = trabajo({
    tramos: [
      { ...tramo('2026-09-18', '07:30', '22:40'), empleadoIds: ['emi', 'nico', 'tomas'] },
      { ...tramo('2026-09-18', '20:00', '22:40'), empleadoIds: ['naza'] },
    ],
  })
  const r = calcularTrabajo(t, [t])
  if (r.miParte.tipo !== 'proporcional') return assert.fail('tenía que ser proporcional')
  // 12,5 h con 3 chicos y 2 h 40 min con 4.
  assert.deepEqual(r.miParte.grupos, [
    { empleados: 3, horas: 12.5 },
    { empleados: 4, horas: 160 / 60 },
  ])
})

test('Mientras él viaja, los chicos en la estación sin él suman su proporcional', () => {
  const t = trabajo({
    trabajeYo: true,
    tramos: [
      { ...tramo('2026-09-15', '07:20', '10:00'), yo: 'no' },
      { ...tramo('2026-09-15', '05:00', '20:15'), empleadoIds: ['emi'], yo: 'todo' },
    ],
  })
  const r = calcularTrabajo(t, [t])
  if (r.miParte.tipo !== 'mixto') return assert.fail('tenía que ser mixto')
  assert.equal(r.miParte.horasMias, 15.25)
  assert.deepEqual(r.miParte.grupos, [{ empleados: 4, horas: 160 / 60 }])
})

test('Sus horas no se cuentan dos veces si anotó dos horarios que se pisan', () => {
  const t = trabajo({
    trabajeYo: true,
    tramos: [
      { ...tramo('2026-09-15', '08:00', '14:00'), yo: 'todo' },
      { ...tramo('2026-09-15', '12:00', '18:00'), empleadoIds: ['emi'], yo: 'todo' },
    ],
  })
  const r = calcularTrabajo(t, [t])
  assert.equal(r.miParte.tipo, 'horas')
  if (r.miParte.tipo === 'horas') assert.equal(r.miParte.horas, 10)
})

test('Medio plus: suma la mitad justa del plus; sin el dato nuevo, el plus va entero como antes', () => {
  const tramos = [tramo('2026-09-14', '08:00', '17:00')]
  const completo = calcularTrabajo(trabajo({ conPlus: true, tramos }), [])
  const viejo = calcularTrabajo(trabajo({ conPlus: true, medioPlus: false, tramos }), [])
  const medio = calcularTrabajo(trabajo({ conPlus: true, medioPlus: true, tramos }), [])
  const sinPlus = calcularTrabajo(trabajo({ conPlus: false, medioPlus: true, tramos }), [])
  assert.equal(completo.plus, 541703)
  assert.equal(viejo.plus, 541703)
  assert.equal(medio.plus, Math.round(541703 / 2))
  assert.equal(sinPlus.plus, 0)
  assert.equal(medio.total, completo.total - completo.plus + medio.plus)
})
