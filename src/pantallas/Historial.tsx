import { CalendarRange, Search, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import { calcularTrabajo, listarSemanas, resumirSemana, type ResumenSemana } from '../calculos.ts'
import { useDatos } from '../datos.tsx'
import { diasCortos, hoy, plata, rangoDeFechas } from '../formato.ts'
import { ir } from '../navegacion.ts'
import { nombreCliente, nombreDelTrabajo, TIPOS } from '../tiposDeTrabajo.ts'
import { CampoTexto, Destacado, Fila, FilaEnlace, Pantalla, Tarjeta } from '../ui.tsx'

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const sinAcentos = (texto: string) => texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

type Totales = { subtotal: number; totalConIva: number; totalPagos: number; ganancia: number }

function totalesDe(semanas: ResumenSemana[]): Totales {
  const sumar = (campo: keyof Totales) => semanas.reduce((s, semana) => s + semana[campo], 0)
  return { subtotal: sumar('subtotal'), totalConIva: sumar('totalConIva'), totalPagos: sumar('totalPagos'), ganancia: sumar('ganancia') }
}

function FilasDeTotales({ totales, cliente }: { totales: Totales; cliente: string }) {
  return (
    <>
      <Fila etiqueta={`Cobraste a ${cliente} (sin IVA)`} valor={plata(totales.subtotal)} />
      <Fila etiqueta="Con IVA" valor={plata(totales.totalConIva)} />
      <Fila etiqueta="Pago a empleados" valor={`− ${plata(totales.totalPagos)}`} />
    </>
  )
}

export function PantallaHistorial() {
  const { trabajos, valores, listo } = useDatos()
  const [añoElegido, setAñoElegido] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const cliente = nombreCliente(valores)

  const semanas = listarSemanas(trabajos).map((inicio) => resumirSemana(inicio, trabajos, valores.iva))
  const años = [...new Set(semanas.map((s) => s.inicio.slice(0, 4)))]
  const año = añoElegido ?? años[0] ?? hoy().slice(0, 4)
  const delAño = semanas.filter((s) => s.inicio.startsWith(año))
  const totalesAño = totalesDe(delAño)
  // Cada semana cuenta en el mes de su lunes. Los meses van del más nuevo al más viejo.
  const meses = [...new Set(delAño.map((s) => s.inicio.slice(5, 7)))].map((mes) => ({
    mes,
    semanas: delAño.filter((s) => s.inicio.slice(5, 7) === mes),
  }))

  const texto = sinAcentos(busqueda.trim())
  const encontrados =
    texto.length < 2
      ? []
      : trabajos
          .filter((t) => sinAcentos(nombreDelTrabajo(t)).includes(texto))
          .sort((a, b) => (b.tramos[0]?.fecha ?? '').localeCompare(a.tramos[0]?.fecha ?? ''))
          .slice(0, 30)

  if (!listo) {
    return (
      <Pantalla titulo="Historial" volver>
        <p className="text-base text-texto-suave">Cargando…</p>
      </Pantalla>
    )
  }

  return (
    <Pantalla titulo="Historial" volver>
      {años.length > 1 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Año">
          {años.map((a) => (
            <button
              key={a}
              type="button"
              aria-pressed={a === año}
              onClick={() => setAñoElegido(a)}
              className={`min-h-11 cursor-pointer rounded-full border-2 px-5 text-base font-semibold transition-colors duration-150 ${
                a === año ? 'border-primario bg-primario text-white' : 'border-campo bg-superficie text-texto'
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
        <div className="flex flex-col gap-4">
          <Tarjeta titulo={`Año ${año}`} icono={TrendingUp}>
            {delAño.length === 0 ? (
              <p className="text-base text-texto-suave">Todavía no hay nada cargado en {año}.</p>
            ) : (
              <>
                <FilasDeTotales totales={totalesAño} cliente={cliente} />
                <Destacado etiqueta="Te quedó" monto={totalesAño.ganancia} color="acento" />
                <p className="text-sm text-texto-suave">
                  {delAño.length} {delAño.length === 1 ? 'semana' : 'semanas'} ·{' '}
                  {delAño.reduce((s, semana) => s + semana.cobros.length, 0)} trabajos
                </p>
              </>
            )}
          </Tarjeta>

          <Tarjeta titulo="Buscar una estación" icono={Search}>
            <CampoTexto etiqueta="Nombre" valor={busqueda} alCambiar={setBusqueda} ejemplo="Ej: Magnolia" />
            {texto.length >= 2 && encontrados.length === 0 && (
              <p className="text-base text-texto-suave">No hay ninguna con ese nombre.</p>
            )}
            {encontrados.length > 0 && (
              <div className="-mx-4 -mb-4 border-t border-borde">
                {encontrados.map((t) => (
                  <FilaEnlace
                    key={t.id}
                    icono={TIPOS[t.tipo].icono}
                    titulo={nombreDelTrabajo(t)}
                    detalle={`${TIPOS[t.tipo].nombre} · ${diasCortos(t.tramos.map((x) => x.fecha))} ${t.tramos[0]?.fecha.slice(0, 4) ?? ''}`}
                    valor={plata(calcularTrabajo(t, trabajos).total)}
                    onClick={() => ir(`/trabajo/${t.id}`)}
                  />
                ))}
              </div>
            )}
          </Tarjeta>
        </div>

        {meses.length > 0 && (
          <Tarjeta titulo="Mes por mes" icono={CalendarRange}>
            <p className="-mt-1 text-sm text-texto-suave">Cada semana cuenta en el mes en que empieza. Tocá un mes para ver el detalle.</p>
            {meses.map(({ mes, semanas: delMes }) => {
              const totales = totalesDe(delMes)
              return (
                <details key={mes} className="group border-t border-borde pt-2">
                  <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 text-base">
                    <span className="font-semibold">{MESES[Number(mes) - 1]}</span>
                    <span className="text-sm text-texto-suave">
                      te quedó <strong className="text-base text-texto tabular-nums">{plata(totales.ganancia)}</strong>
                    </span>
                  </summary>
                  <div className="flex flex-col gap-1 pb-2">
                    <FilasDeTotales totales={totales} cliente={cliente} />
                    <div className="-mx-4 mt-2 border-t border-borde">
                      {delMes.map((semana) => (
                        <FilaEnlace
                          key={semana.inicio}
                          titulo={`Semana ${rangoDeFechas(semana.inicio, semana.fin)}`}
                          detalle={semana.cobros.map((c) => nombreDelTrabajo(c.trabajo)).join(', ')}
                          valor={plata(semana.totalConIva)}
                          onClick={() => ir(`/semana/${semana.inicio}`)}
                        />
                      ))}
                    </div>
                  </div>
                </details>
              )
            })}
          </Tarjeta>
        )}
      </div>
    </Pantalla>
  )
}
