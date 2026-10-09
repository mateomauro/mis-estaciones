import { plata } from '../formato.ts'
import { LineaLibro, Libro, NotaLibro } from '../ui.tsx'

type Totales = { subtotal: number; totalConIva: number; totalGastos: number; totalACobrar: number; totalPagos: number; ganancia: number }

/**
 * La cuenta que cierra, igual en Hoy, Semana e Historial: cobrás (con los gastos que te devuelven),
 * pagás, gastos y te queda. El IVA va abajo, aparte.
 */
export function LibroCuentas({ totales, cliente, pasado = false }: { totales: Totales; cliente: string; pasado?: boolean }) {
  const { subtotal, totalConIva, totalGastos, totalACobrar, totalPagos, ganancia } = totales
  const conIva =
    totalGastos > 0
      ? `Sin IVA. Con IVA, el total ${pasado ? 'fue' : 'a cobrar es'} ${plata(totalACobrar)} (los gastos no llevan IVA).`
      : `Sin IVA. Con IVA ${pasado ? 'facturaste' : 'le facturás'} ${plata(totalConIva)}.`
  return (
    <Libro>
      <LineaLibro etiqueta={`${pasado ? 'Cobraste' : 'Cobrás'} a ${cliente}`} monto={plata(subtotal + totalGastos)} />
      <LineaLibro etiqueta={`${pasado ? 'Pagaste' : 'Pagás'} a empleados`} monto={`− ${plata(totalPagos)}`} />
      {totalGastos > 0 && <LineaLibro etiqueta="Gastos que pusiste" monto={`− ${plata(totalGastos)}`} />}
      <LineaLibro etiqueta={pasado ? 'Te quedó' : 'Te queda'} monto={plata(ganancia)} queda />
      <NotaLibro>{conIva}</NotaLibro>
    </Libro>
  )
}
