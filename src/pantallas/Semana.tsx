import { FileDown, FileSpreadsheet, HandCoins, PiggyBank, Receipt, RefreshCw, Share2 } from 'lucide-react'
import { useState } from 'react'
import { resumirSemana } from '../calculos.ts'
import { useDatos } from '../datos.tsx'
import { horas, plata, rangoDeFechas } from '../formato.ts'
import { ir } from '../navegacion.ts'
import type { TipoPlanilla } from '../planilla.ts'
import { nombreCliente, nombreDelTrabajo, nombreTitular, TIPOS } from '../tiposDeTrabajo.ts'
import { Aviso, Boton, BotonTexto, Destacado, Fila, FilaEnlace, Pantalla, Tarjeta } from '../ui.tsx'

// Compartir archivos solo anda en celulares y con la app publicada (https).
const puedeCompartir = (() => {
  try {
    return navigator.canShare?.({ files: [new File([''], 'planilla.pdf', { type: 'application/pdf' })] }) ?? false
  } catch {
    return false
  }
})()

export function PantallaSemana({ inicio }: { inicio: string }) {
  const { trabajos, valores, listo, actualizarValoresDeSemana } = useDatos()
  const [generando, setGenerando] = useState<TipoPlanilla | null>(null)
  const semana = resumirSemana(inicio, trabajos, valores.iva)
  const cliente = nombreCliente(valores)
  const titulo = `Semana ${rangoDeFechas(semana.inicio, semana.fin)}`

  if (semana.cobros.length === 0) {
    return (
      <Pantalla titulo={titulo} volver>
        <p className="text-base">{listo ? 'No hay nada cargado en esta semana.' : 'Cargando…'}</p>
      </Pantalla>
    )
  }

  const planilla = async (tipo: TipoPlanilla, compartir = false) => {
    setGenerando(tipo)
    try {
      // La librería del PDF es pesada: se carga recién cuando hace falta.
      const pdf = await import('../planilla.ts')
      const datos = { titular: nombreTitular(valores), cliente }
      if (compartir) await pdf.compartirPlanilla(tipo, semana, datos)
      else pdf.descargarPlanilla(tipo, semana, datos)
    } catch (error) {
      // Cerrar el menú de compartir sin elegir nada no es un error.
      if (!(error instanceof DOMException && error.name === 'AbortError')) alert('No se pudo armar el PDF. Probá de nuevo.')
    } finally {
      setGenerando(null)
    }
  }

  const faltanValores = semana.pagos.filter((p) => p.faltaValor)

  const actualizar = () => {
    if (!confirm('¿Usar los valores y precios de hoy en todos los trabajos de esta semana?')) return
    actualizarValoresDeSemana(inicio)
  }

  return (
    <Pantalla
      titulo={titulo}
      volver
      acciones={
        <>
          <Boton icono={FileDown} onClick={() => planilla('cliente')} deshabilitado={generando !== null}>
            {generando === 'cliente' ? 'Armando…' : `PDF para ${cliente} (Soledad)`}
          </Boton>
          {puedeCompartir && (
            <Boton
              variante="secundario"
              icono={Share2}
              onClick={() => planilla('cliente', true)}
              deshabilitado={generando !== null}
            >
              Compartir
            </Boton>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
        <Tarjeta titulo={`Cobro a ${cliente}`} icono={Receipt}>
          <div className="-mx-4 border-y border-borde">
            {semana.cobros.map(({ trabajo, resultado }) => (
              <FilaEnlace
                key={trabajo.id}
                icono={TIPOS[trabajo.tipo].icono}
                titulo={nombreDelTrabajo(trabajo)}
                detalle={`${TIPOS[trabajo.tipo].nombre} · ${horas(resultado.totalMinutos)} h`}
                valor={plata(resultado.total)}
                onClick={() => ir(`/trabajo/${trabajo.id}`)}
              />
            ))}
          </div>
          <Fila etiqueta="Subtotal" valor={plata(semana.subtotal)} />
          <Fila etiqueta={`IVA ${semana.porcentajeIva.toLocaleString('es-AR')}%`} valor={plata(semana.iva)} />
          <Destacado etiqueta="Total con IVA" monto={semana.totalConIva} />
        </Tarjeta>

        <div className="flex flex-col gap-4">
          <Tarjeta
            titulo="Lo que les pagás a los chicos"
            icono={HandCoins}
            derecha={<span className="text-lg font-bold tabular-nums">{plata(semana.totalPagos)}</span>}
          >
            <p className="-mt-1 text-sm text-texto-suave">
              Día de 10 h: extra desde la hora 10. A {cliente} se le cobra con día de 9 h.
            </p>
            {semana.pagos.length === 0 ? (
              <p className="text-base text-texto-suave">Esta semana no hay empleados para pagar.</p>
            ) : (
              <>
                {faltanValores.length > 0 && (
                  <Aviso tipo="atencion">
                    Falta cargar cuánto le pagás por día a {faltanValores.map((p) => p.nombre).join(', ')}. Cargalo en
                    “Valores y precios” y después tocá “Usar valores de hoy” acá abajo.
                  </Aviso>
                )}
                {semana.pagos.map((pago) => (
                  <div key={pago.empleadoId}>
                    <Fila etiqueta={<span className="font-semibold">{pago.nombre}</span>} valor={plata(pago.total)} />
                    <p className="text-sm text-texto-suave">
                      {horas(pago.reparto.simples)} h simples + {horas(pago.reparto.al50 + pago.reparto.al100)} h extras ·
                      a {cliente} le cobrás {plata(pago.cobrado)}
                    </p>
                  </div>
                ))}
                <Boton
                  variante="secundario"
                  icono={FileSpreadsheet}
                  onClick={() => planilla('pagos')}
                  deshabilitado={generando !== null}
                >
                  {generando === 'pagos' ? 'Armando…' : 'PDF de pagos con las cuentas'}
                </Boton>
              </>
            )}
          </Tarjeta>

          <Tarjeta titulo="Tu ganancia" icono={PiggyBank}>
            <Fila etiqueta="Cobrás (sin IVA)" valor={plata(semana.subtotal)} />
            <Fila etiqueta="Pagás a los chicos" valor={`− ${plata(semana.totalPagos)}`} />
            <Destacado etiqueta="Te queda" monto={semana.ganancia} color="acento" />
            <details className="text-base">
              <summary className="min-h-7 cursor-pointer font-semibold text-primario">¿De dónde sale?</summary>
              <div className="mt-2 flex flex-col gap-1">
                <Fila etiqueta="Tu parte" valor={plata(semana.tuParte)} />
                {semana.plus > 0 && <Fila etiqueta="Plus" valor={plata(semana.plus)} />}
                <Fila etiqueta="Pulmón empleados" valor={plata(semana.diferenciaEmpleados)} />
                {semana.descuentos > 0 && <Fila etiqueta="Descuentos" valor={`− ${plata(semana.descuentos)}`} />}
                <p className="mt-1 text-sm text-texto-suave">
                  Tu parte es el proporcional, tus horas y los viajes a medir. El pulmón es la diferencia entre lo que
                  cobrás y lo que pagás por los empleados, para aguinaldos y vacaciones.
                </p>
              </div>
            </details>
          </Tarjeta>

          <div className="flex flex-col">
            <p className="text-sm text-texto-suave">¿Cambiaste precios después de cargar esta semana?</p>
            <BotonTexto icono={RefreshCw} onClick={actualizar}>
              Usar valores de hoy en toda la semana
            </BotonTexto>
          </div>
        </div>
      </div>
    </Pantalla>
  )
}
