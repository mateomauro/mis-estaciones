// Los dos PDF de la semana:
// - Planilla para el cliente (Soledad): lo que se le cobra, con los horarios. Sin nada interno.
// - Pagos y cuentas (uso interno): lo que se le paga a cada empleado, con todas las cuentas para controlar.
import { jsPDF } from 'jspdf'
import { autoTable, type RowInput, type UserOptions } from 'jspdf-autotable'
import type { DiaCalculado, PagoEmpleado, Reparto, ResultadoTrabajo, ResumenSemana, TipoDia } from './calculos.ts'
import { fechaCorta, horas, nombreDia, plata, plataExacta, rangoDeFechas } from './formato.ts'
import type { Trabajo } from './tipos.ts'
import { nombreDelTrabajo, TIPOS } from './tiposDeTrabajo.ts'

export type DatosPlanilla = { titular: string; cliente: string }

type Color = [number, number, number]
const PRIMARIO: Color = [15, 118, 110]
const TEXTO: Color = [19, 78, 74]
const SUAVE: Color = [63, 95, 92]
const FONDO: Color = [240, 253, 250]
const BORDE: Color = [201, 228, 223]
const ACENTO: Color = [194, 65, 12]
const MARGEN = 15

// Las fuentes que trae el PDF no tienen el signo menos tipográfico ni el espacio angosto.
const limpio = (texto: string) => texto.replace(/−/g, '-').replace(/ /g, ' ')
const pesos = (monto: number) => limpio(plata(monto))
const pesosExactos = (monto: number) => limpio(plataExacta(monto))

const finalDe = (doc: jsPDF) => (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY

const estiloTabla: Partial<UserOptions> = {
  theme: 'grid',
  margin: { left: MARGEN, right: MARGEN },
  styles: { fontSize: 10, cellPadding: 1.8, textColor: TEXTO, lineColor: BORDE, lineWidth: 0.2 },
  headStyles: { fillColor: PRIMARIO, textColor: 255, fontStyle: 'bold' },
  footStyles: { fillColor: FONDO, textColor: TEXTO, fontStyle: 'bold' },
  showFoot: 'lastPage',
}

/** Alinea a la derecha las columnas de números (también el encabezado y el total). */
const numerosDesde = (columna: number): Partial<UserOptions> => ({
  didParseCell: (data) => {
    if (data.column.index >= columna) data.cell.styles.halign = 'right'
  },
})

/** Extras de un día, marcando si van al 1,5 o al doble por ser fin de semana o feriado. */
function textoExtras(tipo: TipoDia, r: Reparto) {
  if (tipo === 'sabado' || tipo === 'feriado') return `${horas(r.al50)} (×1,5)`
  if (tipo === 'domingo') return `${horas(r.al100)} (×2)`
  return horas(r.al50)
}

class Documento {
  doc = new jsPDF({ unit: 'mm', format: 'a4' })
  ancho = this.doc.internal.pageSize.getWidth()
  alto = this.doc.internal.pageSize.getHeight()
  derecha = this.ancho - MARGEN
  y = 42

  /** Pasa a otra hoja si no entran `mm` milímetros más. */
  lugarPara(mm: number) {
    if (this.y + mm > this.alto - MARGEN) {
      this.doc.addPage()
      this.y = MARGEN + 5
    }
  }

  encabezado(titulo: string, semana: ResumenSemana, derechaArriba: string, derechaAbajo: string, colorAbajo: Color = SUAVE) {
    const { doc } = this
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.setTextColor(...PRIMARIO)
    doc.text(titulo, MARGEN, 21)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.setTextColor(...TEXTO)
    doc.text(`Semana ${rangoDeFechas(semana.inicio, semana.fin)} de ${semana.fin.slice(0, 4)}`, MARGEN, 28)
    doc.setFont('helvetica', 'bold')
    doc.text(derechaArriba, this.derecha, 21, { align: 'right' })
    doc.setFontSize(10)
    doc.setTextColor(...colorAbajo)
    doc.text(derechaAbajo, this.derecha, 28, { align: 'right' })
    doc.setDrawColor(...PRIMARIO)
    doc.setLineWidth(0.6)
    doc.line(MARGEN, 32, this.derecha, 32)
  }

  titulo(texto: string, derecha?: string, tamaño = 13) {
    const { doc } = this
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(tamaño)
    doc.setTextColor(...TEXTO)
    doc.text(texto, MARGEN, this.y)
    if (derecha) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(...SUAVE)
      doc.text(derecha, this.derecha, this.y, { align: 'right' })
    }
  }

  nota(texto: string) {
    const { doc } = this
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...SUAVE)
    const lineas = doc.splitTextToSize(texto, this.ancho - 2 * MARGEN) as string[]
    doc.text(lineas, MARGEN, this.y)
    this.y += lineas.length * 4
  }

  tabla(opciones: UserOptions) {
    autoTable(this.doc, { ...estiloTabla, startY: this.y, ...opciones })
    this.y = finalDe(this.doc)
  }

  /** Pie de página en todas las hojas. */
  terminar() {
    const { doc } = this
    const paginas = doc.getNumberOfPages()
    const generado = new Date().toLocaleDateString('es-AR')
    for (let i = 1; i <= paginas; i++) {
      doc.setPage(i)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(...SUAVE)
      doc.text(`Generado el ${generado}`, MARGEN, this.alto - 8)
      doc.text(`Página ${i} de ${paginas}`, this.derecha, this.alto - 8, { align: 'right' })
    }
    return doc
  }
}

// ——— Planilla para el cliente ———

function filasDeHoras(dias: DiaCalculado[], conExtras: boolean): RowInput[] {
  return dias.map((dia) => {
    const { tramo } = dia
    const fila = [
      nombreDia(tramo.fecha) + (dia.tipo === 'feriado' ? ' (feriado)' : ''),
      fechaCorta(tramo.fecha),
      `${tramo.desde || '--:--'} a ${tramo.hasta || '--:--'}`,
      horas(dia.minutos) + (dia.relleno > 0 ? ` (se cobra ${horas(dia.minutos + dia.relleno)})` : ''),
    ]
    return conExtras ? [...fila, textoExtras(dia.tipo, dia.reparto)] : fila
  })
}

function importesDelTrabajo(trabajo: Trabajo, resultado: ResultadoTrabajo, titular: string): RowInput[] {
  const filas: RowInput[] = resultado.empleados.map((l) => [
    `${l.nombre}: ${horas(l.reparto.simples)} h simples + ${horas(l.reparto.al50 + l.reparto.al100)} h extras`,
    pesos(l.total),
  ])
  // Su parte va sin su valor hora ni la cuenta.
  const { miParte } = resultado
  if (miParte.tipo === 'proporcional') filas.push([`Proporcional ${titular}`, pesos(miParte.monto)])
  if (miParte.tipo === 'mixto') {
    filas.push([`Horas ${titular}`, pesos(miParte.montoHoras)])
    filas.push([`Proporcional ${titular}`, pesos(miParte.montoProporcional)])
  }
  if (miParte.tipo === 'horas') {
    filas.push([`${trabajo.tipo === 'medicion' ? 'Viaje a medir' : 'Horas'} ${titular}`, pesos(miParte.monto)])
  }
  if (resultado.plus > 0) filas.push(['Plus por estación terminada', pesos(resultado.plus)])
  for (const d of trabajo.descuentos.filter((d) => d.monto)) {
    filas.push([`Descuento${d.detalle.trim() ? `: ${d.detalle.trim()}` : ''}`, `- ${pesos(d.monto)}`])
  }
  return filas
}

export function crearPlanillaCliente(semana: ResumenSemana, { titular, cliente }: DatosPlanilla): jsPDF {
  const d = new Documento()
  d.encabezado('Liquidación semanal', semana, titular, `Para: ${cliente}`)

  for (const { trabajo, resultado } of semana.cobros) {
    d.lugarPara(45)
    d.titulo(nombreDelTrabajo(trabajo), TIPOS[trabajo.tipo].nombre)
    const personal = resultado.empleados.map((l) => l.nombre)
    if (resultado.dias.some((dia) => dia.minutosMios > 0)) personal.push(titular)
    if (personal.length > 0) {
      d.y += 5
      d.nota(`Personal: ${personal.join(', ')}`)
    } else {
      d.y += 3
    }
    const conExtras = resultado.empleados.length > 0
    const total = [{ content: 'Total', colSpan: 3 }, horas(resultado.totalMinutos)]
    d.tabla({
      head: [conExtras ? ['Día', 'Fecha', 'Horario', 'Horas', 'Extras'] : ['Día', 'Fecha', 'Horario', 'Horas']],
      body: filasDeHoras(resultado.dias, conExtras),
      foot: [conExtras ? [...total, horas(resultado.reparto.al50 + resultado.reparto.al100)] : total],
      ...numerosDesde(3),
    })
    d.y += 3
    d.tabla({
      head: [['Detalle', 'Importe']],
      body: importesDelTrabajo(trabajo, resultado, titular),
      foot: [[`Total ${nombreDelTrabajo(trabajo)}`, pesos(resultado.total)]],
      columnStyles: { 1: { cellWidth: 35 } },
      headStyles: { ...estiloTabla.headStyles, fillColor: SUAVE },
      ...numerosDesde(1),
    })
    d.y += 10
  }

  // Al final, el resumen de la semana con el total.
  d.lugarPara(70)
  d.titulo('Resumen de la semana')
  d.y += 3
  d.tabla({
    head: [['Trabajo', 'Importe']],
    body: [
      ...semana.cobros.map(({ trabajo, resultado }) => [
        `${nombreDelTrabajo(trabajo)} (${TIPOS[trabajo.tipo].nombre.toLowerCase()})`,
        pesos(resultado.total),
      ]),
      [{ content: 'Subtotal', styles: { fontStyle: 'bold' } }, { content: pesos(semana.subtotal), styles: { fontStyle: 'bold' } }],
      [`IVA ${semana.porcentajeIva.toLocaleString('es-AR')}%`, pesos(semana.iva)],
    ],
    foot: [['Total a cobrar con IVA', pesos(semana.totalConIva)]],
    footStyles: { fillColor: PRIMARIO, textColor: 255, fontStyle: 'bold', fontSize: 12 },
    columnStyles: { 1: { cellWidth: 40 } },
    ...numerosDesde(1),
  })
  return d.terminar()
}

// ——— Pagos y cuentas (uso interno) ———

const horasDe = (minutos: number) => `${horas(minutos)} h`
const horasHechas = (r: Reparto) => r.simples + r.al50 + r.al100

function detalleDelEmpleado(d: Documento, pago: PagoEmpleado, cliente: string) {
  d.lugarPara(60)
  const valores = pago.cobros[0]?.trabajo.valores.empleados.find((e) => e.id === pago.empleadoId)
  d.titulo(
    pago.nombre,
    valores ? `Día ${cliente} ${pesos(valores.diaConveniencia)} · Día pago ${pesos(valores.diaPago)}` : undefined,
  )
  d.y += 3

  // Día por día, con las dos cuentas lado a lado.
  const hayRelleno = pago.dias.some((dia) => horasHechas(dia.cobro) > dia.minutos)
  const suma = (clave: 'cobro' | 'pago', campo: keyof Reparto) => pago.dias.reduce((s, dia) => s + dia[clave][campo], 0)
  d.tabla({
    head: [
      [
        { content: '', colSpan: 5, styles: { fillColor: [255, 255, 255] } },
        { content: `Cobro a ${cliente} (extra desde la hora 9)`, colSpan: 2, styles: { halign: 'center' } },
        { content: 'Pago (extra desde la hora 10)', colSpan: 2, styles: { halign: 'center', fillColor: ACENTO } },
      ],
      ['Día', 'Fecha', 'Trabajo', 'Horario', 'Horas', 'Simples', 'Extras', 'Simples', 'Extras'],
    ],
    body: pago.dias.map((dia) => [
      nombreDia(dia.tramo.fecha).slice(0, 3) + (dia.tipo === 'feriado' ? ' (fer.)' : ''),
      fechaCorta(dia.tramo.fecha),
      nombreDelTrabajo(dia.trabajo),
      `${dia.tramo.desde} a ${dia.tramo.hasta}`,
      horas(dia.minutos) + (horasHechas(dia.cobro) > dia.minutos ? ' *' : ''),
      horas(dia.cobro.simples),
      textoExtras(dia.tipo, dia.cobro),
      horas(dia.pago.simples),
      textoExtras(dia.tipo, dia.pago),
    ]),
    foot: [
      [
        { content: 'Total', colSpan: 4 },
        horas(pago.dias.reduce((s, dia) => s + dia.minutos, 0)),
        horas(suma('cobro', 'simples')),
        horas(suma('cobro', 'al50') + suma('cobro', 'al100')),
        horas(suma('pago', 'simples')),
        horas(suma('pago', 'al50') + suma('pago', 'al100')),
      ],
    ],
    styles: { ...estiloTabla.styles, fontSize: 8.5, cellPadding: 1.4 },
    ...numerosDesde(4),
  })
  if (hayRelleno) {
    d.y += 4
    d.nota('* Día de fábrica: se completa el día entero (9 h para cobrar, 10 h para pagar) aunque hayan trabajado menos.')
  }
  d.y += 3

  // Las cuentas, una por renglón, para poder hacerlas con la calculadora.
  const cuentas: RowInput[] = []
  const renglon = (concepto: string, minutos: number, valorHora: number, factor: number, monto: number) => {
    if (minutos > 0) cuentas.push([concepto, `${horasDe(minutos)} × ${pesosExactos(valorHora * factor)}`, pesos(monto)])
  }
  for (const { trabajo, linea } of pago.cobros) {
    const nombre = nombreDelTrabajo(trabajo)
    renglon(`${nombre}: simples`, linea.reparto.simples, linea.valorHora, 1, linea.montoSimples)
    renglon(`${nombre}: extras al 50%`, linea.reparto.al50, linea.valorHora, 1.5, linea.montoAl50)
    renglon(`${nombre}: extras al doble`, linea.reparto.al100, linea.valorHora, 2, linea.montoAl100)
  }
  cuentas.push([
    { content: `Lo que cobrás a ${cliente} por ${pago.nombre}`, colSpan: 2, styles: { fontStyle: 'bold', fillColor: FONDO } },
    { content: pesos(pago.cobrado), styles: { fontStyle: 'bold', fillColor: FONDO } },
  ])
  for (const g of pago.grupos) {
    const aclaracion = pago.grupos.length > 1 ? ` (día a ${pesos(g.valorDia)})` : ''
    renglon(`Pago: simples${aclaracion}`, g.reparto.simples, g.valorHora, 1, g.montoSimples)
    renglon(`Pago: extras al 50%${aclaracion}`, g.reparto.al50, g.valorHora, 1.5, g.montoAl50)
    renglon(`Pago: extras al doble${aclaracion}`, g.reparto.al100, g.valorHora, 2, g.montoAl100)
  }
  const pagar = `Lo que le pagás a ${pago.nombre}` + (pago.faltaValor ? ' (falta cargar su valor por día)' : '')
  cuentas.push([
    { content: pagar, colSpan: 2, styles: { fontStyle: 'bold', fillColor: ACENTO, textColor: 255 } },
    { content: pesos(pago.total), styles: { fontStyle: 'bold', fillColor: ACENTO, textColor: 255 } },
  ])
  d.tabla({
    head: [['Concepto', 'Cuenta', 'Importe']],
    body: cuentas,
    foot: [[{ content: 'Diferencia (pulmón)', colSpan: 2 }, pesos(pago.cobrado - pago.total)]],
    headStyles: { ...estiloTabla.headStyles, fillColor: SUAVE },
    columnStyles: { 1: { cellWidth: 55 }, 2: { cellWidth: 32 } },
    ...numerosDesde(2),
  })
  d.y += 12
}

export function crearPlanillaPagos(semana: ResumenSemana, { titular, cliente }: DatosPlanilla): jsPDF {
  const d = new Documento()
  d.encabezado('Pagos y cuentas', semana, titular, 'USO INTERNO: no mandar al cliente', ACENTO)

  d.titulo('Resumen de pagos')
  d.y += 3
  d.tabla({
    head: [['Empleado', `Cobrás a ${cliente}`, 'Le pagás', 'Diferencia']],
    body: semana.pagos.map((p) => [p.nombre, pesos(p.cobrado), pesos(p.total), pesos(p.cobrado - p.total)]),
    foot: [
      [
        'Total',
        pesos(semana.pagos.reduce((s, p) => s + p.cobrado, 0)),
        pesos(semana.totalPagos),
        pesos(semana.diferenciaEmpleados),
      ],
    ],
    ...numerosDesde(1),
  })
  d.y += 4
  d.nota(
    `Cobrás a ${cliente}: día de 9 h, extra desde la hora 9. Le pagás: día de 10 h, extra desde la hora 10. ` +
      'Sábado y feriado todo al 1,5; domingo todo al doble. La diferencia es el pulmón para aguinaldos y vacaciones.',
  )
  d.y += 6

  d.lugarPara(50)
  d.titulo('Tu semana')
  d.y += 3
  d.tabla({
    head: [['Concepto', 'Importe']],
    body: [
      [`Cobrás a ${cliente} (sin IVA)`, pesos(semana.subtotal)],
      ['Pagás a los empleados', `- ${pesos(semana.totalPagos)}`],
    ],
    foot: [['Te queda', pesos(semana.ganancia)]],
    footStyles: { fillColor: ACENTO, textColor: 255, fontStyle: 'bold', fontSize: 12 },
    columnStyles: { 1: { cellWidth: 40 } },
    ...numerosDesde(1),
  })
  d.y += 4
  const desglose = [`tu parte ${pesos(semana.tuParte)}`]
  if (semana.plus) desglose.push(`plus ${pesos(semana.plus)}`)
  desglose.push(`pulmón ${pesos(semana.diferenciaEmpleados)}`)
  const menos = semana.descuentos ? ` - descuentos ${pesos(semana.descuentos)}` : ''
  d.nota(`De dónde sale: ${desglose.join(' + ')}${menos}.`)
  d.y += 10

  d.lugarPara(20)
  d.titulo('DETALLE POR EMPLEADO', undefined, 11)
  d.y += 8
  for (const pago of semana.pagos) detalleDelEmpleado(d, pago, cliente)
  return d.terminar()
}

// ——— Descargar o compartir ———

export type TipoPlanilla = 'cliente' | 'pagos'

function armar(tipo: TipoPlanilla, semana: ResumenSemana, datos: DatosPlanilla) {
  const rango = rangoDeFechas(semana.inicio, semana.fin)
  return tipo === 'cliente'
    ? { doc: crearPlanillaCliente(semana, datos), nombre: `Planilla ${datos.cliente} semana ${rango}.pdf` }
    : { doc: crearPlanillaPagos(semana, datos), nombre: `Pagos y cuentas semana ${rango}.pdf` }
}

export function descargarPlanilla(tipo: TipoPlanilla, semana: ResumenSemana, datos: DatosPlanilla) {
  const { doc, nombre } = armar(tipo, semana, datos)
  doc.save(nombre)
}

/** Abre el menú de compartir del celular (WhatsApp, mail, etc.) con el PDF. */
export async function compartirPlanilla(tipo: TipoPlanilla, semana: ResumenSemana, datos: DatosPlanilla) {
  const { doc, nombre } = armar(tipo, semana, datos)
  const archivo = new File([doc.output('blob')], nombre, { type: 'application/pdf' })
  await navigator.share({ files: [archivo], title: nombre })
}
