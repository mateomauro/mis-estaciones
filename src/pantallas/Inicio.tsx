import { CalendarRange, Factory, FileText, History, Plus, Ruler, Settings } from 'lucide-react'
import { useEffect } from 'react'
import { inicioDeSemana, listarSemanas, resumirSemana, type ResumenSemana } from '../calculos.ts'
import { useDatos } from '../datos.tsx'
import { diasCortos, fechaLarga, hoy, plata, rangoDeFechas } from '../formato.ts'
import { ir } from '../navegacion.ts'
import type { TipoTrabajo } from '../tipos.ts'
import { nombreDelTrabajo, TIPOS } from '../tiposDeTrabajo.ts'
import { Boton, BotonTexto, FilaEnlace, Tarjeta } from '../ui.tsx'
import { EstadoGuardado } from './EstadoGuardado.tsx'

function ComoSeUsa({ abierto }: { abierto: boolean }) {
  return (
    <details open={abierto} className="rounded-2xl border border-borde bg-superficie px-4 py-3">
      <summary className="min-h-7 cursor-pointer text-base font-semibold">¿Cómo se usa?</summary>
      <ol className="mt-2 flex list-decimal flex-col gap-2 pl-5 text-base">
        <li>
          <strong>Cada día</strong>, cuando los chicos te pasan el horario, abrí la estación y tocá “Agregar día”. El
          primer día la creás con “Nueva estación”.
        </li>
        <li>
          Si esa semana <strong>terminaron la estación</strong>, marcá el plus.
        </li>
        <li>
          <strong>A fin de semana</strong> abrí el resumen: ahí está la planilla PDF para Soledad, lo que le pagás a cada
          uno y tu ganancia.
        </li>
      </ol>
      <p className="mt-2 text-sm text-texto-suave">Todo se guarda solo. Si preferís, podés cargar toda la semana junta al final.</p>
    </details>
  )
}

function SemanaAbierta({ semana, esEsta }: { semana: ResumenSemana; esEsta: boolean }) {
  return (
    <Tarjeta
      titulo={esEsta ? 'Esta semana' : `Semana ${rangoDeFechas(semana.inicio, semana.fin)}`}
      icono={CalendarRange}
      derecha={esEsta && <span className="text-sm text-texto-suave">{rangoDeFechas(semana.inicio, semana.fin)}</span>}
    >
      <div className="-mx-4 border-y border-borde">
        {semana.cobros.map(({ trabajo, resultado }) => (
          <FilaEnlace
            key={trabajo.id}
            icono={TIPOS[trabajo.tipo].icono}
            titulo={nombreDelTrabajo(trabajo)}
            detalle={`${TIPOS[trabajo.tipo].nombre} · ${diasCortos(trabajo.tramos.map((t) => t.fecha))}`}
            valor={plata(resultado.total)}
            onClick={() => ir(`/trabajo/${trabajo.id}`)}
          />
        ))}
      </div>
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-base">Total con IVA</span>
        <span className="font-titulo text-2xl font-bold tabular-nums">{plata(semana.totalConIva)}</span>
      </div>
      <Boton variante="secundario" icono={FileText} onClick={() => ir(`/semana/${semana.inicio}`)}>
        Resumen, pagos y planilla
      </Boton>
    </Tarjeta>
  )
}

export function Inicio() {
  const { trabajos, valores, listo, crearTrabajo, limpiarVacios } = useDatos()

  // Si abrió un trabajo nuevo y volvió sin cargar nada, no lo dejamos en la lista.
  // oxlint-disable-next-line react-hooks/exhaustive-deps -- solo al entrar a la pantalla
  useEffect(limpiarVacios, [])

  const nuevo = (tipo: TipoTrabajo) => ir(`/trabajo/${crearTrabajo(tipo)}`)
  const [ultima, ...anteriores] = listarSemanas(trabajos).map((inicio) => resumirSemana(inicio, trabajos, valores.iva))
  const estaSemana = inicioDeSemana(hoy())

  return (
    <main className="min-h-dvh">
      {/* En el celu: botones, semanas, ayuda. En la compu: botones y ayuda a la izquierda, semanas a la derecha. */}
      <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 pt-5 pb-12 lg:grid lg:max-w-5xl lg:grid-cols-[22rem_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:items-start lg:gap-x-8 lg:px-6">
        <div className="flex flex-col gap-4 lg:col-start-1 lg:row-start-1">
          <header>
            <p className="text-base text-texto-suave">{fechaLarga(new Date())}</p>
            <h1 className="text-2xl font-bold sm:text-3xl">Mis estaciones</h1>
            <div className="mt-1">
              <EstadoGuardado />
            </div>
          </header>
          <Boton icono={Plus} onClick={() => nuevo('estacion')}>
            Nueva estación
          </Boton>
          <div className="grid grid-cols-2 gap-2">
            <Boton variante="secundario" icono={Factory} onClick={() => nuevo('fabrica')}>
              Día de fábrica
            </Boton>
            <Boton variante="secundario" icono={Ruler} onClick={() => nuevo('medicion')}>
              Viaje a medir
            </Boton>
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          {!listo ? (
            <p className="rounded-2xl border border-borde bg-superficie p-5 text-base text-texto-suave">Cargando tus datos…</p>
          ) : ultima ? (
            <SemanaAbierta semana={ultima} esEsta={ultima.inicio === estaSemana} />
          ) : (
            <p className="rounded-2xl border-2 border-dashed border-campo p-5 text-base text-texto-suave">
              Todavía no cargaste nada. Tocá “Nueva estación” para empezar.
            </p>
          )}

          {anteriores.length > 0 && (
            <Tarjeta titulo="Semanas anteriores" icono={CalendarRange}>
              <div className="-mx-4 -mb-4 border-t border-borde">
                {anteriores.slice(0, 6).map((semana) => (
                  <FilaEnlace
                    key={semana.inicio}
                    titulo={`Semana ${rangoDeFechas(semana.inicio, semana.fin)}`}
                    detalle={semana.cobros.map((c) => nombreDelTrabajo(c.trabajo)).join(', ')}
                    valor={plata(semana.totalConIva)}
                    onClick={() => ir(`/semana/${semana.inicio}`)}
                  />
                ))}
                <div className="border-t border-borde px-4 py-1">
                  <BotonTexto icono={History} onClick={() => ir('/historial')}>
                    Ver todo el historial
                  </BotonTexto>
                </div>
              </div>
            </Tarjeta>
          )}
        </div>

        <div className="flex flex-col gap-4 lg:col-start-1 lg:row-start-2">
          <ComoSeUsa abierto={listo && !ultima} />
          <div className="flex flex-col">
            <BotonTexto icono={History} onClick={() => ir('/historial')}>
              Historial y totales por mes
            </BotonTexto>
            <BotonTexto icono={Settings} onClick={() => ir('/valores')}>
              Valores y precios
            </BotonTexto>
          </div>
        </div>
      </div>
    </main>
  )
}
