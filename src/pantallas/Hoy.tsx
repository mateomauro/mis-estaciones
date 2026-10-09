import { ArrowRight, Check, ChevronRight, CircleHelp, Factory, Plus, Receipt, Ruler, Send, type LucideIcon } from 'lucide-react'
import { useEffect } from 'react'
import { diaDeLaSemana, faltaContestar, inicioDeSemana, resumirSemana, semanaDe } from '../calculos.ts'
import { estaVacio, useDatos } from '../datos.tsx'
import { diaYFecha, fechaConDia, hoy, nombreDia, rangoCorto, sumarDias } from '../formato.ts'
import { ir } from '../navegacion.ts'
import type { TipoTrabajo, Trabajo } from '../tipos.ts'
import { nombreCliente, nombreDelTrabajo, TIPOS } from '../tiposDeTrabajo.ts'
import { Boton, BotonTexto, Pantalla, Subtitulo, Titulo } from '../ui.tsx'
import { LibroCuentas } from './cuentas.tsx'
import { EstadoGuardado } from './EstadoGuardado.tsx'
import { tieneHorario } from './partesTrabajo.tsx'

const sinAcentos = (texto: string) => texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()

/** Ya terminaron ahí. Lo cargado antes de "¿Terminaron acá?" se da por terminado si tenía el plus. */
export const estaCerrada = (t: Trabajo) => t.cerrada ?? t.conPlus

/** El último día cargado; si todavía no tiene días, cuándo se creó. */
const ultimaFecha = (t: Trabajo) =>
  t.tramos.length > 0 ? t.tramos.map((x) => x.fecha).sort()[t.tramos.length - 1] : t.creada.slice(0, 10)

/**
 * Estaciones y fábricas en las que están trabajando: con algo cargado en los últimos 14 días
 * y que todavía no se dieron por terminadas. Si una siguió en otra semana, queda solo la más nueva.
 */
export function trabajosEnCurso(trabajos: Trabajo[]): Trabajo[] {
  const desde = sumarDias(hoy(), -14)
  const porNombre = new Map<string, Trabajo>()
  for (const t of trabajos) {
    if (t.tipo === 'medicion' || estaCerrada(t) || estaVacio(t) || ultimaFecha(t) < desde) continue
    const clave = `${t.tipo}:${sinAcentos(nombreDelTrabajo(t))}`
    const otro = porNombre.get(clave)
    const masNuevo = !otro || semanaDe(t) > semanaDe(otro) || (semanaDe(t) === semanaDe(otro) && t.creada > otro.creada)
    if (masNuevo) porNombre.set(clave, t)
  }
  return [...porNombre.values()].sort((a, b) => ultimaFecha(b).localeCompare(ultimaFecha(a)))
}

function BotonGrande({
  icono: Icono,
  nombre,
  detalle,
  accion,
  hecho = false,
  onClick,
}: {
  icono: LucideIcon
  nombre: string
  detalle: string
  accion?: string
  /** Ya está hecho: se ve más tranquilo. */
  hecho?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full cursor-pointer overflow-hidden rounded-[18px] border-2 bg-superficie text-left transition-colors duration-150 active:bg-fondo ${
        hecho || !accion ? 'border-borde' : 'border-primario'
      }`}
    >
      <span className="flex items-center gap-3 px-3.5 pt-3.5 pb-3">
        <span className="grid size-[46px] shrink-0 place-items-center rounded-full bg-primario-suave text-primario">
          <Icono className="size-6" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block font-titulo text-[1.2rem] leading-snug font-semibold">{nombre}</span>
          <span className="block text-base text-texto-suave">{detalle}</span>
        </span>
      </span>
      {accion && (
        <span
          className={`flex items-center justify-between gap-2 px-4 py-3.5 text-[1.12rem] font-bold ${
            hecho ? 'bg-primario-suave text-texto' : 'bg-primario text-white'
          }`}
        >
          <span>{accion}</span>
          {hecho ? <ChevronRight className="size-6 shrink-0" aria-hidden /> : <ArrowRight className="size-6 shrink-0" aria-hidden />}
        </span>
      )}
    </button>
  )
}

/** El botón de cada estación en curso: ya dice qué día va a cargar. */
function EnCurso({ trabajo, alSeguir }: { trabajo: Trabajo; alSeguir: (t: Trabajo) => void }) {
  const hoyMismo = hoy()
  const nombre = nombreDelTrabajo(trabajo)
  const deHoy = trabajo.tramos.find((t) => t.fecha === hoyMismo)

  // Ya cargó hoy: no lo empuja a cargar de nuevo.
  if (deHoy && tieneHorario(deHoy)) {
    return (
      <BotonGrande
        icono={Check}
        nombre={nombre}
        detalle={`${nombreDia(hoyMismo)} ya cargado · ${deHoy.desde} a ${deHoy.hasta}`}
        accion="Ver o corregir"
        hecho
        onClick={() => ir(`/trabajo/${trabajo.id}/dia/${deHoy.id}`)}
      />
    )
  }

  // Viene de una semana anterior: "Seguir esta semana" arma la de esta semana.
  const semana = semanaDe(trabajo)
  const estaSemana = inicioDeSemana(hoyMismo)
  if (semana < estaSemana && !trabajo.tramos.some((t) => t.fecha >= estaSemana)) {
    const pasada = semana === sumarDias(estaSemana, -7)
    return (
      <BotonGrande
        icono={TIPOS[trabajo.tipo].icono}
        nombre={nombre}
        detalle={pasada ? 'Viene de la semana pasada' : `Viene de la semana del ${rangoCorto(semana, sumarDias(semana, 6))}`}
        accion={`Seguir esta semana: ${diaYFecha(hoyMismo)}`}
        onClick={() => alSeguir(trabajo)}
      />
    )
  }

  const cargados = trabajo.tramos.filter(tieneHorario).map((t) => t.fecha).sort()
  const faltan = trabajo.tramos.filter((t) => !tieneHorario(t) && t.fecha !== hoyMismo).map((t) => t.fecha).sort()
  const partes = [cargados.length > 0 ? `Cargado hasta el ${diaYFecha(cargados[cargados.length - 1])}` : 'Todavía sin días cargados']
  if (faltan.length > 0) partes.push(`falta el ${diaYFecha(faltan[0])}`)
  else if (trabajo.tramos.some((t) => tieneHorario(t) && faltaContestar(trabajo, t))) partes.push('falta contestar si fuiste')

  return (
    <BotonGrande
      icono={TIPOS[trabajo.tipo].icono}
      nombre={nombre}
      detalle={partes.join(' · ')}
      accion={`Cargar ${diaYFecha(hoyMismo)}`}
      onClick={() => ir(deHoy ? `/trabajo/${trabajo.id}/dia/${deHoy.id}` : `/trabajo/${trabajo.id}/nuevo-dia/${hoyMismo}`)}
    />
  )
}

export function PantallaHoy() {
  const { trabajos, gastos, valores, listo, crearTrabajo, limpiarVacios } = useDatos()

  // Si abrió un trabajo nuevo y volvió sin cargar nada, no lo dejamos en la lista.
  useEffect(() => {
    if (listo) limpiarVacios()
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- al entrar, cuando ya están los datos
  }, [listo])

  const hoyMismo = hoy()
  const estaSemana = inicioDeSemana(hoyMismo)
  const semanaPasada = sumarDias(estaSemana, -7)
  const cliente = nombreCliente(valores)
  const enCurso = trabajosEnCurso(trabajos)
  const semana = resumirSemana(estaSemana, trabajos, valores.iva, gastos)
  // El lunes y el martes recuerda mandar la planilla de la semana pasada.
  const recordarCierre = [1, 2].includes(diaDeLaSemana(hoyMismo)) && trabajos.some((t) => semanaDe(t) === semanaPasada)

  const empezar = (tipo: TipoTrabajo) => {
    if (tipo === 'estacion') return ir('/nueva-estacion')
    const id = crearTrabajo(tipo)
    ir(tipo === 'medicion' ? `/trabajo/${id}` : `/trabajo/${id}/nuevo-dia/${hoyMismo}`)
  }

  const seguir = (anterior: Trabajo) => {
    const id = crearTrabajo(anterior.tipo, { nombre: anterior.nombre, empleadoIds: anterior.empleadoIds })
    ir(`/trabajo/${id}/nuevo-dia/${hoyMismo}`)
  }

  return (
    <Pantalla titulo={fechaConDia(hoyMismo)} solapa="hoy">
      <div className="flex flex-wrap items-center justify-between gap-x-3">
        <EstadoGuardado />
        <BotonTexto icono={CircleHelp} onClick={() => ir('/ayuda')}>
          Ayuda
        </BotonTexto>
      </div>

      {!listo ? (
        <p className="mt-6 rounded-[18px] border border-borde bg-superficie p-5 text-base text-texto-suave">
          Cargando tus datos…
        </p>
      ) : (
        <>
          {recordarCierre && (
            <div className="mt-4">
              <BotonGrande
                icono={Send}
                nombre="Cerrar la semana pasada"
                detalle="Mandar la planilla a Soledad"
                onClick={() => ir(`/semana/${semanaPasada}`)}
              />
            </div>
          )}

          <Titulo>¿Dónde estuvieron hoy?</Titulo>
          {enCurso.length > 0 ? (
            <div className="flex flex-col gap-3">
              {enCurso.map((t) => (
                <EnCurso key={t.id} trabajo={t} alSeguir={seguir} />
              ))}
            </div>
          ) : (
            <Boton icono={Plus} onClick={() => empezar('estacion')}>
              Empezar una estación
            </Boton>
          )}

          <div className="mt-[18px]">
            {enCurso.length > 0 && (
              <>
                <Subtitulo className="mb-2">¿Fueron a otro lugar?</Subtitulo>
                <Boton variante="secundario" icono={Plus} onClick={() => empezar('estacion')}>
                  Empezar otra estación
                </Boton>
              </>
            )}
            <div className="mt-1 flex flex-wrap gap-x-5">
              <BotonTexto icono={Factory} onClick={() => empezar('fabrica')}>
                Día de fábrica
              </BotonTexto>
              <BotonTexto icono={Ruler} onClick={() => empezar('medicion')}>
                Viaje a medir
              </BotonTexto>
            </div>
            <div className="mt-1.5">
              <Boton variante="secundario" icono={Receipt} onClick={() => ir(`/gasto/nuevo/${hoyMismo}`)}>
                Anotar un gasto
              </Boton>
            </div>
          </div>

          <Titulo>Esta semana</Titulo>
          {semana.cobros.length === 0 && semana.gastos.length === 0 ? (
            <Subtitulo>
              Todavía no cargaste nada de esta semana ({rangoCorto(semana.inicio, semana.fin)}).
            </Subtitulo>
          ) : (
            <>
              <LibroCuentas totales={semana} cliente={cliente} />
              <BotonTexto onClick={() => ir('/semana')}>
                Ver la semana <ChevronRight className="size-5" aria-hidden />
              </BotonTexto>
            </>
          )}
        </>
      )}
    </Pantalla>
  )
}
