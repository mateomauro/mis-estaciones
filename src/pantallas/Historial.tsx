import { ChevronDown, Search } from 'lucide-react'
import { useState } from 'react'
import { calcularTrabajo, listarSemanas, resumirSemana, type ResumenSemana } from '../calculos.ts'
import { useDatos } from '../datos.tsx'
import { diasCortos, hoy, plata, rangoCorto } from '../formato.ts'
import { ir } from '../navegacion.ts'
import { nombreCliente, nombreDelTrabajo, TIPOS } from '../tiposDeTrabajo.ts'
import { CampoTexto, Lista, Pantalla, Renglon, Subtitulo, Titulo } from '../ui.tsx'
import { LibroCuentas } from './cuentas.tsx'

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const sinAcentos = (texto: string) => texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

const CAMPOS = ['subtotal', 'totalConIva', 'totalGastos', 'totalACobrar', 'totalPagos', 'ganancia'] as const
type Totales = Record<(typeof CAMPOS)[number], number>

function totalesDe(semanas: ResumenSemana[]): Totales {
  return Object.fromEntries(CAMPOS.map((c) => [c, semanas.reduce((s, semana) => s + semana[c], 0)])) as Totales
}

const cuantasSemanas = (n: number) => `${n} ${n === 1 ? 'semana' : 'semanas'}`

export function PantallaHistorial() {
  const { trabajos, gastos, valores, listo } = useDatos()
  const [añoElegido, setAñoElegido] = useState<string | null>(null)
  const [mesAbierto, setMesAbierto] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const cliente = nombreCliente(valores)

  const semanas = listarSemanas(trabajos, gastos).map((inicio) => resumirSemana(inicio, trabajos, valores.iva, gastos))
  const años = [...new Set(semanas.map((s) => s.inicio.slice(0, 4)))]
  const año = añoElegido ?? años[0] ?? hoy().slice(0, 4)
  const delAño = semanas.filter((s) => s.inicio.startsWith(año))
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

  return (
    <Pantalla titulo="Historial" solapa="historial">
      {!listo ? (
        <Subtitulo className="mt-4">Cargando…</Subtitulo>
      ) : (
        <>
          {años.length > 1 && (
            <div className="mt-3.5 flex flex-wrap gap-2.5" role="group" aria-label="Año">
              {años.map((a) => (
                <button
                  key={a}
                  type="button"
                  aria-pressed={a === año}
                  onClick={() => {
                    setAñoElegido(a)
                    setMesAbierto(null)
                  }}
                  className={`min-h-12 cursor-pointer rounded-full border-2 px-5 font-bold transition-colors duration-150 ${
                    a === año ? 'border-primario bg-primario text-white' : 'border-campo bg-superficie text-texto'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          )}

          <Titulo>Todo {año}</Titulo>
          {delAño.length === 0 ? (
            <Subtitulo>Todavía no hay nada cargado en {año}.</Subtitulo>
          ) : (
            <LibroCuentas totales={totalesDe(delAño)} cliente={cliente} pasado />
          )}

          {meses.length > 0 && (
            <>
              <Titulo>Mes por mes</Titulo>
              <Lista>
                {meses.map(({ mes, semanas: delMes }) => {
                  const abierto = mesAbierto === mes
                  const totales = totalesDe(delMes)
                  return (
                    <div key={mes} className="border-b border-borde last:border-b-0">
                      <button
                        type="button"
                        aria-expanded={abierto}
                        onClick={() => setMesAbierto(abierto ? null : mes)}
                        className="flex min-h-[60px] w-full cursor-pointer items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors duration-150 hover:bg-fondo active:bg-fondo"
                      >
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="text-[1.05rem] font-bold">{MESES[Number(mes) - 1]}</span>
                          <span className="text-base text-texto-suave">{cuantasSemanas(delMes.length)}</span>
                        </span>
                        <span className="shrink-0 font-bold text-ganancia tabular-nums">{plata(totales.ganancia)}</span>
                        <ChevronDown
                          className={`size-[22px] shrink-0 text-texto-suave transition-transform duration-150 ${abierto ? 'rotate-180' : ''}`}
                          aria-hidden
                        />
                      </button>
                      {abierto && (
                        <div className="bg-info px-3.5 pt-1 pb-3.5">
                          <LibroCuentas totales={totales} cliente={cliente} pasado />
                          <div className="mt-3">
                            <Lista>
                              {delMes.map((semana) => (
                                <Renglon
                                  key={semana.inicio}
                                  titulo={`Semana ${rangoCorto(semana.inicio, semana.fin)}`}
                                  detalle={[
                                    semana.cobros.length > 0 && `${semana.cobros.length} ${semana.cobros.length === 1 ? 'trabajo' : 'trabajos'}`,
                                    semana.gastos.length > 0 && `${semana.gastos.length} ${semana.gastos.length === 1 ? 'gasto' : 'gastos'}`,
                                  ]
                                    .filter(Boolean)
                                    .join(' · ')}
                                  valor={plata(semana.ganancia)}
                                  colorValor="ganancia"
                                  onClick={() => ir(`/semana/${semana.inicio}`)}
                                />
                              ))}
                            </Lista>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </Lista>
              <Subtitulo className="mt-1.5">Lo que te quedó cada mes. Tocá uno para ver sus semanas.</Subtitulo>
            </>
          )}

          <Titulo>Buscar una estación</Titulo>
          <div className="-mt-[18px]">
            <CampoTexto valor={busqueda} alCambiar={setBusqueda} ejemplo="Ej: Magnolia" icono={Search} />
          </div>
          {texto.length >= 2 && encontrados.length === 0 && <Subtitulo className="mt-3">No hay ninguna con ese nombre.</Subtitulo>}
          {encontrados.length > 0 && (
            <div className="mt-3">
              <Lista>
                {encontrados.map((t) => (
                  <Renglon
                    key={t.id}
                    titulo={nombreDelTrabajo(t)}
                    detalle={`${TIPOS[t.tipo].nombre} · ${diasCortos(t.tramos.map((x) => x.fecha))} ${t.tramos[0]?.fecha.slice(0, 4) ?? ''}`}
                    valor={plata(calcularTrabajo(t, trabajos).total)}
                    onClick={() => ir(`/trabajo/${t.id}`)}
                  />
                ))}
              </Lista>
            </div>
          )}
        </>
      )}
    </Pantalla>
  )
}
