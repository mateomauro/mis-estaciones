import { CalendarRange, Check, Plus, Receipt, Trash2, type LucideIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { inicioDeSemana, resumirSemana, semanaDe } from '../calculos.ts'
import { estaVacio, useDatos } from '../datos.tsx'
import { fechaCorta, hoy, nombreDia, nuevoId, plata, rangoDeFechas, sumarDias } from '../formato.ts'
import { CATEGORIAS, nombreDelGasto } from '../gastos.ts'
import { ir, volver } from '../navegacion.ts'
import type { CategoriaGasto, Gasto, Trabajo } from '../tipos.ts'
import { nombreCliente, nombreDelTrabajo } from '../tiposDeTrabajo.ts'
import { Aviso, Boton, BotonTexto, CampoPlata, CampoTexto, estiloCampo, FilaEnlace, Pantalla, Tarjeta } from '../ui.tsx'
import { EstadoGuardado } from './EstadoGuardado.tsx'

function AvisoSinGastos() {
  return (
    <Aviso tipo="atencion">No se pudieron traer los gastos de la nube. Lo que anotes queda guardado en este aparato.</Aviso>
  )
}

/** Fecha con la que arranca un gasto nuevo: hoy, o el lunes si se está mirando otra semana. */
export const fechaParaGasto = (inicio: string) => (inicioDeSemana(hoy()) === inicio ? hoy() : inicio)

export function PantallaGastos({ inicio = inicioDeSemana(hoy()) }: { inicio?: string }) {
  const { trabajos, gastos, valores, listo, fallanGastos } = useDatos()
  const semana = resumirSemana(inicio, trabajos, valores.iva, gastos)
  const cliente = nombreCliente(valores)

  return (
    <Pantalla
      titulo="Gastos en efectivo"
      etiqueta={{ icono: CalendarRange, texto: `Semana ${rangoDeFechas(semana.inicio, semana.fin)}` }}
      volver
      acciones={
        <Boton icono={Plus} onClick={() => ir(`/gasto/nuevo/${fechaParaGasto(inicio)}`)}>
          Anotar un gasto
        </Boton>
      }
    >
      {fallanGastos && <AvisoSinGastos />}
      <Tarjeta
        titulo="Gastos de la semana"
        icono={Receipt}
        derecha={<span className="text-lg font-bold tabular-nums">{plata(semana.totalGastos)}</span>}
      >
        {!listo ? (
          <p className="text-base text-texto-suave">Cargando…</p>
        ) : semana.gastos.length === 0 ? (
          <p className="text-base text-texto-suave">Esta semana no anotaste gastos.</p>
        ) : (
          <div className="-mx-4 border-y border-borde">
            {semana.gastos.map((g) => (
              <FilaEnlace
                key={g.id}
                icono={CATEGORIAS[g.categoria]?.icono}
                titulo={nombreDelGasto(g)}
                detalle={[`${nombreDia(g.fecha)} ${fechaCorta(g.fecha)}`, g.lugar, g.categoria !== 'otro' && g.nota.trim()]
                  .filter(Boolean)
                  .join(' · ')}
                valor={plata(g.monto)}
                onClick={() => ir(`/gasto/${g.id}`)}
              />
            ))}
          </div>
        )}
        <p className="text-sm text-texto-suave">Se los cobrás a {cliente} en la planilla de esta semana, sin IVA.</p>
      </Tarjeta>
    </Pantalla>
  )
}

/** Estaciones y fábricas de la semana del gasto, para elegir de cuál fue. */
function lugaresDeLaSemana(trabajos: Trabajo[], fecha: string): Trabajo[] {
  const semana = inicioDeSemana(fecha)
  return trabajos
    .filter((t) => t.tipo !== 'medicion' && !estaVacio(t))
    .filter((t) => semanaDe(t) === semana || t.tramos.some((x) => inicioDeSemana(x.fecha) === semana))
    .sort((a, b) => nombreDelTrabajo(a).localeCompare(nombreDelTrabajo(b)))
}

function Pastilla({
  activa,
  icono: Icono,
  onClick,
  children,
}: {
  activa: boolean
  icono?: LucideIcon
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={activa}
      onClick={onClick}
      className={`flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border-2 px-4 text-base font-semibold transition-colors duration-150 ${
        activa ? 'border-primario bg-primario text-white' : 'border-campo bg-superficie text-texto'
      }`}
    >
      {Icono && <Icono className="size-5 shrink-0" aria-hidden />}
      {children}
    </button>
  )
}

/** Anotar o corregir un gasto. Se guarda solo apenas tiene el monto. */
export function PantallaGasto({ id, fecha }: { id?: string; fecha?: string }) {
  const { gastos, listo } = useDatos()
  const existente = id ? gastos.find((g) => g.id === id) : undefined
  if (id && !existente) {
    return (
      <Pantalla titulo={listo ? 'Este gasto ya no está' : 'Cargando…'} volver>
        <p className="text-base text-texto-suave">{listo ? 'Puede que lo hayas quitado.' : 'Trayendo los datos de la nube.'}</p>
      </Pantalla>
    )
  }
  return <FormularioGasto key={id ?? 'nuevo'} existente={existente} fecha={fecha} />
}

function FormularioGasto({ existente, fecha }: { existente?: Gasto; fecha?: string }) {
  const { trabajos, gastos, fallanGastos, guardarGasto, borrarGasto } = useDatos()
  // Mientras no elige en qué fue, queda sin categoría (se guarda como "Otro" por las dudas).
  const [borrador, setBorrador] = useState<Omit<Gasto, 'categoria'> & { categoria: CategoriaGasto | null }>(
    () =>
      existente ?? {
        id: nuevoId(),
        fecha: fecha ?? hoy(),
        monto: 0,
        categoria: null,
        nota: '',
        trabajoId: null,
        lugar: '',
        creado: new Date().toISOString(),
      },
  )
  const [faltaCategoria, setFaltaCategoria] = useState(false)

  const cambiar = (cambios: Partial<typeof borrador>) => {
    const nuevo = { ...borrador, ...cambios }
    setBorrador(nuevo)
    if (cambios.categoria) setFaltaCategoria(false)
    if (nuevo.monto > 0) guardarGasto({ ...nuevo, categoria: nuevo.categoria ?? 'otro' })
    // Sin monto no hay gasto: si ya estaba guardado, se quita.
    else if (gastos.some((g) => g.id === nuevo.id)) borrarGasto(nuevo.id)
  }

  const lugares = lugaresDeLaSemana(trabajos, borrador.fecha)
  const elegido = trabajos.find((t) => t.id === borrador.trabajoId)
  if (elegido && !lugares.includes(elegido)) lugares.unshift(elegido)
  const semana = inicioDeSemana(borrador.fecha)

  const listoGasto = () => {
    if (borrador.monto > 0 && !borrador.categoria) {
      setFaltaCategoria(true)
      return
    }
    volver()
  }

  const quitar = () => {
    if (!confirm(`¿Quitar el gasto de ${plata(borrador.monto)}?`)) return
    borrarGasto(borrador.id)
    volver()
  }

  const elegirLugar = (trabajo: Trabajo | null) =>
    cambiar({ trabajoId: trabajo?.id ?? null, lugar: trabajo ? nombreDelTrabajo(trabajo) : '' })

  return (
    <Pantalla titulo={existente ? 'Corregir el gasto' : 'Anotar un gasto'} etiqueta={{ icono: Receipt, texto: 'Gasto en efectivo' }} volver>
      {fallanGastos && <AvisoSinGastos />}
      <Tarjeta>
        <CampoPlata etiqueta="¿Cuánto gastaste?" valor={borrador.monto} alCambiar={(monto) => cambiar({ monto })} />

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-base font-semibold">¿En qué?</legend>
          {faltaCategoria && <Aviso tipo="atencion">Elegí en qué fue el gasto.</Aviso>}
          <div className="flex flex-wrap gap-2">
            {(Object.keys(CATEGORIAS) as CategoriaGasto[]).map((clave) => (
              <Pastilla
                key={clave}
                activa={borrador.categoria === clave}
                icono={CATEGORIAS[clave].icono}
                onClick={() => cambiar({ categoria: clave })}
              >
                {CATEGORIAS[clave].nombre}
              </Pastilla>
            ))}
          </div>
        </fieldset>

        <CampoTexto
          etiqueta={borrador.categoria === 'otro' ? '¿Qué fue?' : 'Nota (si querés)'}
          valor={borrador.nota}
          ejemplo={borrador.categoria === 'otro' ? 'Ej: estacionamiento' : 'Ej: tornillos para el mueble'}
          alCambiar={(nota) => cambiar({ nota })}
        />

        <label className="flex flex-col gap-1">
          <span className="text-base font-semibold">¿Cuándo?</span>
          <input
            type="date"
            className={estiloCampo}
            value={borrador.fecha}
            onChange={(e) => e.target.value && cambiar({ fecha: e.target.value })}
          />
          <span className="text-sm text-texto-suave">Va en la semana {rangoDeFechas(semana, sumarDias(semana, 6))}.</span>
        </label>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-base font-semibold">
            ¿De qué estación? <span className="font-normal text-texto-suave">(si querés)</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {lugares.map((t) => (
              <Pastilla key={t.id} activa={borrador.trabajoId === t.id} onClick={() => elegirLugar(t)}>
                {nombreDelTrabajo(t)}
              </Pastilla>
            ))}
            <Pastilla activa={!borrador.trabajoId} onClick={() => elegirLugar(null)}>
              Ninguna en particular
            </Pastilla>
          </div>
        </fieldset>
      </Tarjeta>

      <Boton icono={Check} onClick={listoGasto}>
        Listo
      </Boton>
      <div className="-mt-2 flex justify-center">
        <EstadoGuardado />
      </div>
      {existente && (
        <div className="flex justify-center">
          <BotonTexto icono={Trash2} peligro onClick={quitar}>
            Quitar este gasto
          </BotonTexto>
        </div>
      )}
    </Pantalla>
  )
}
