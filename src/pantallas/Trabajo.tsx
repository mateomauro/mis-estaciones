import { CalendarDays, Check, Circle, Plus, RefreshCw, Trash2, UserPlus, Users, Wallet, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import {
  calcularTrabajo,
  diaDeLaSemana,
  empleadosDelTramo,
  inicioDeSemana,
  presenciaMia,
  type DiaCalculado,
  type GrupoProporcional,
  type ResultadoTrabajo,
} from '../calculos.ts'
import { useDatos } from '../datos.tsx'
import { conY, horas, hoy, nombreDia, nuevoId, numero, plata, sumarDias } from '../formato.ts'
import { ir, volver } from '../navegacion.ts'
import type { Descuento, Empleado, Externo, PresenciaMia, Trabajo, Tramo } from '../tipos.ts'
import { nombreCliente, nombreDelTrabajo, TIPOS } from '../tiposDeTrabajo.ts'
import { EstadoGuardado } from './EstadoGuardado.tsx'
import {
  Aviso,
  Boton,
  BotonIcono,
  BotonTexto,
  CampoHora,
  CampoPlata,
  CampoTexto,
  Casilla,
  Destacado,
  estiloCampo,
  Fila,
  Opciones,
  Pantalla,
  Tarjeta,
} from '../ui.tsx'

function detalleDelDia(dia: DiaCalculado, conExtras: boolean) {
  if (dia.tramo.cancelado) return 'Viaje cancelado: medio día a cada uno, vos no cobrás'
  if (dia.minutos === 0) return 'Completá el horario'
  const total = `${horas(dia.minutos)} h`
  if (!conExtras) return total
  if (dia.tipo === 'domingo') return `${total} · domingo, todo al doble`
  if (dia.tipo === 'sabado') return `${total} · sábado, todo al 1,5`
  if (dia.tipo === 'feriado') return `${total} · feriado, todo al 1,5`
  if (dia.relleno > 0) return `${total} · se cobra el día completo`
  if (dia.reparto.al50 === 0) return `${total} · sin extras`
  return `${total} · ${horas(dia.reparto.simples)} simples + ${horas(dia.reparto.al50)} extras`
}

function BotonEmpleado({
  empleado,
  fue,
  chico = false,
  onClick,
}: {
  empleado: Empleado
  fue: boolean
  /** Sin íconos y más angosto, para que entren todos en un renglón dentro de un día. */
  chico?: boolean
  onClick: () => void
}) {
  const Icono = fue ? Check : Circle
  return (
    <button
      type="button"
      aria-pressed={fue}
      onClick={onClick}
      className={`flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border-2 text-base font-semibold transition-colors duration-150 ${
        chico ? 'px-3' : 'px-4'
      } ${fue ? 'border-primario bg-primario text-white' : 'border-campo bg-superficie text-texto-suave'}`}
    >
      {!chico && <Icono className="size-5 shrink-0" aria-hidden />}
      {empleado.nombre || 'Sin nombre'}
    </button>
  )
}

/**
 * Quiénes fueron en ese horario: un renglón con los nombres. Normalmente son los de siempre de la
 * estación; lo excepcional (otra gente, contratados, gente de CR, otro horario, viaje cancelado)
 * queda adentro de "Cambiar".
 */
function GenteDelDia({
  tramo,
  empleados,
  idsDeSiempre,
  sugerencias,
  conVos,
  abiertoAlInicio,
  alCambiar,
  alOtroHorario,
}: {
  tramo: Tramo
  /** Él estuvo en este horario: si no hubo nadie más, es "Solo vos" (por ejemplo, la vuelta de un viaje). */
  conVos: boolean
  empleados: Empleado[]
  idsDeSiempre: string[]
  /** Nombres de gente de afuera que ya se cargó antes, para no escribirlos de nuevo. */
  sugerencias: string[]
  abiertoAlInicio: boolean
  alCambiar: (cambios: Partial<Tramo>) => void
  alOtroHorario: () => void
}) {
  const [abierto, setAbierto] = useState(abiertoAlInicio)
  const [nuevo, setNuevo] = useState<{ nombre: string; origen: Externo['origen'] } | null>(null)
  const ids = tramo.empleadoIds ?? idsDeSiempre
  const externos = tramo.externos ?? []
  const mismos = (a: string[], b: string[]) => a.length === b.length && a.every((i) => b.includes(i))
  const distinto = !mismos(ids, idsDeSiempre)
  const nombres = empleados.filter((e) => ids.includes(e.id)).map((e) => e.nombre || 'Sin nombre')
  const contratados = externos.filter((x) => x.origen === 'contratado').map((x) => x.nombre)
  const deCR = externos.filter((x) => x.origen === 'cr').map((x) => x.nombre)
  const deAfuera = [
    contratados.length > 0 && `${conY(contratados)} (${contratados.length === 1 ? 'contratado' : 'contratados'})`,
    deCR.length > 0 && `${conY(deCR)} (de CR)`,
  ].filter(Boolean)

  const alternar = (id: string) => {
    const nuevos = empleados.map((e) => e.id).filter((i) => (i === id ? !ids.includes(i) : ids.includes(i)))
    alCambiar({ empleadoIds: mismos(nuevos, idsDeSiempre) ? undefined : nuevos })
  }

  const agregar = () => {
    if (!nuevo?.nombre.trim()) return
    alCambiar({ externos: [...externos, { id: nuevoId(), nombre: nuevo.nombre.trim(), origen: nuevo.origen }] })
    setNuevo(null)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <Users className="size-5 shrink-0 text-texto-suave" aria-label="Fueron" />
        <span className="min-w-0 flex-1 text-base">
          {nombres.length === 0 && deAfuera.length === 0 ? (
            conVos ? (
              <span className="font-semibold text-primario-fuerte">Solo vos</span>
            ) : (
              <span className="font-semibold text-aviso-texto">Marcá quiénes fueron</span>
            )
          ) : (
            <>
              {nombres.length > 0 &&
                (distinto ? <span className="font-semibold text-primario-fuerte">{conY(nombres)}</span> : conY(nombres))}
              {deAfuera.length > 0 && (
                <span className="font-semibold text-primario-fuerte">
                  {nombres.length > 0 && ' + '}
                  {deAfuera.join(' + ')}
                </span>
              )}
              {distinto && nombres.length > 0 && deAfuera.length === 0 && <span className="text-texto-suave"> (este día)</span>}
            </>
          )}
        </span>
        <button
          type="button"
          aria-expanded={abierto}
          onClick={() => setAbierto(!abierto)}
          className="-mr-2 min-h-11 shrink-0 cursor-pointer rounded-lg px-2 text-base font-semibold text-primario transition-colors duration-150 active:bg-primario-suave"
        >
          {abierto ? 'Listo' : 'Cambiar'}
        </button>
      </div>
      {abierto && (
        <>
          <div className="flex flex-wrap gap-1.5">
            {empleados.map((empleado) => (
              <BotonEmpleado
                key={empleado.id}
                empleado={empleado}
                fue={ids.includes(empleado.id)}
                chico
                onClick={() => alternar(empleado.id)}
              />
            ))}
          </div>

          {externos.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {externos.map((x) => (
                <button
                  key={x.id}
                  type="button"
                  aria-label={`Sacar a ${x.nombre}`}
                  onClick={() => alCambiar({ externos: externos.filter((y) => y.id !== x.id) })}
                  className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border-2 border-primario bg-primario-suave px-3 text-base font-semibold"
                >
                  {x.nombre} <span className="font-normal text-texto-suave">{x.origen === 'cr' ? 'de CR' : 'contratado'}</span>
                  <X className="size-4 shrink-0" aria-hidden />
                </button>
              ))}
            </div>
          )}

          {nuevo ? (
            <div className="flex flex-col gap-2 rounded-lg bg-fondo p-2">
              <div className="flex items-end gap-2">
                <label className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-sm text-texto-suave">Nombre</span>
                  <input
                    className={estiloCampo}
                    value={nuevo.nombre}
                    list="gente-de-afuera"
                    autoFocus
                    placeholder="Ej: Luciano"
                    onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && agregar()}
                  />
                </label>
                <div className="shrink-0">
                  <Boton onClick={agregar}>Agregar</Boton>
                </div>
              </div>
              <datalist id="gente-de-afuera">
                {sugerencias.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
              <Opciones
                etiqueta="¿Quién lo paga?"
                valor={nuevo.origen}
                opciones={[
                  ['contratado', 'Lo contraté yo'],
                  ['cr', 'Lo mandó CR'],
                ]}
                alCambiar={(origen) => setNuevo({ ...nuevo, origen })}
              />
              <p className="text-sm text-texto-suave">
                {nuevo.origen === 'contratado'
                  ? 'Cuenta para tu proporcional. Lo que le pagás anotalo en Gastos.'
                  : 'Cuenta para tu proporcional. Lo paga CR: sale en la planilla con sus horas, sin plata.'}
              </p>
            </div>
          ) : (
            <BotonTexto icono={UserPlus} onClick={() => setNuevo({ nombre: '', origen: 'contratado' })}>
              Alguien más (contratado o de CR)
            </BotonTexto>
          )}

          <div className="flex flex-wrap gap-x-4">
            {distinto && (
              <BotonTexto icono={RefreshCw} onClick={() => alCambiar({ empleadoIds: undefined })}>
                Los de siempre
              </BotonTexto>
            )}
            <BotonTexto icono={Plus} onClick={alOtroHorario}>
              Otro horario este día
            </BotonTexto>
          </div>
          <Casilla chica marcada={Boolean(tramo.cancelado)} alCambiar={(cancelado) => alCambiar({ cancelado: cancelado || undefined })}>
            Viaje cancelado <span className="text-texto-suave">(medio día a los chicos; vos no cobrás nada)</span>
          </Casilla>
        </>
      )}
    </div>
  )
}

function FilaDia({
  dia,
  conExtras,
  presencia,
  otrosTrabajos,
  gente,
  alCambiar,
  alQuitar,
}: {
  dia: DiaCalculado
  conExtras: boolean
  /** Si fue él a la estación: cómo estuvo ese día. Sin valor, no se pregunta. */
  presencia: PresenciaMia | null
  otrosTrabajos: string[]
  /** Quiénes fueron en este horario (no se muestra en los viajes a medir). */
  gente?: ReactNode
  alCambiar: (cambios: Partial<Tramo>) => void
  alQuitar: () => void
}) {
  const { tramo } = dia
  const numeroDia = diaDeLaSemana(tramo.fecha)
  const pasaMedianoche = tramo.desde && tramo.hasta && tramo.hasta < tramo.desde
  return (
    <div className="flex flex-col gap-2 border-t border-borde pt-3">
      <div className="flex items-center gap-2">
        <label htmlFor={`fecha-${tramo.id}`} className="w-24 shrink-0 text-base font-semibold">
          {nombreDia(tramo.fecha)}
        </label>
        <input
          id={`fecha-${tramo.id}`}
          type="date"
          className={`${estiloCampo} min-w-0 flex-1`}
          value={tramo.fecha}
          onChange={(e) => e.target.value && alCambiar({ fecha: e.target.value })}
        />
      </div>
      {!tramo.cancelado && (
        <div className="grid grid-cols-2 gap-2">
          <CampoHora etiqueta="Desde" valor={tramo.desde} alCambiar={(desde) => alCambiar({ desde })} />
          <CampoHora etiqueta="Hasta" valor={tramo.hasta} alCambiar={(hasta) => alCambiar({ hasta })} />
        </div>
      )}
      {gente}
      {presencia && !tramo.cancelado && (
        <div className="flex flex-col gap-2 rounded-lg bg-fondo p-2">
          <span className="text-sm font-semibold">¿Y vos ese día?</span>
          <Opciones
            etiqueta="¿Y vos ese día?"
            valor={presencia}
            opciones={[
              ['no', 'No fui'],
              ['todo', 'Todo el día'],
              ['parte', 'Un rato'],
            ]}
            alCambiar={(yo) => alCambiar({ yo })}
          />
          {presencia === 'parte' && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <CampoHora etiqueta="Llegaste" valor={tramo.yoDesde ?? ''} alCambiar={(yoDesde) => alCambiar({ yoDesde })} />
                <CampoHora etiqueta="Te fuiste" valor={tramo.yoHasta ?? ''} alCambiar={(yoHasta) => alCambiar({ yoHasta })} />
              </div>
              <p className={`text-sm ${dia.minutosMios > 0 ? 'text-texto-suave' : 'text-aviso-texto'}`}>
                {dia.minutosMios > 0 ? `Estuviste ${horas(dia.minutosMios)} h` : 'Cargá a qué hora llegaste y te fuiste'}
              </p>
            </>
          )}
        </div>
      )}
      <div className="flex items-center gap-2">
        <span className={`min-w-0 flex-1 text-base font-semibold ${dia.minutos === 0 && !tramo.cancelado ? 'text-aviso-texto' : ''}`}>
          {detalleDelDia(dia, conExtras)}
        </span>
        {numeroDia >= 1 && numeroDia <= 5 && !tramo.cancelado && (
          <Casilla chica marcada={tramo.feriado} alCambiar={(feriado) => alCambiar({ feriado })}>
            Feriado
          </Casilla>
        )}
        <BotonIcono icono={Trash2} etiqueta="Quitar este día" peligro onClick={alQuitar} />
      </div>
      {dia.minutos > 18 * 60 && (
        <Aviso tipo="atencion">Son más de 18 horas en el día. Revisá si las horas están bien.</Aviso>
      )}
      {pasaMedianoche && dia.minutos <= 18 * 60 && (
        <p className="text-sm text-texto-suave">Terminó pasada la medianoche: cuenta para este día.</p>
      )}
      {otrosTrabajos.length > 0 && (
        <Aviso tipo="atencion">
          Ese día también estuvieron en {conY(otrosTrabajos)}: las horas simples se cuentan sumando todo el día.
        </Aviso>
      )}
    </div>
  )
}

/** "5 h × 2 ÷ 3 + 6 h × 4 ÷ 5": el proporcional de cada horario con sus chicos. */
const cuentaProporcional = (grupos: GrupoProporcional[]) =>
  grupos.map((g) => `${numero(g.horas)} h × ${g.empleados} ÷ ${g.empleados + 1}`).join(' + ')

function Resultado({
  trabajo,
  resultado,
  cambiar,
}: {
  trabajo: Trabajo
  resultado: ResultadoTrabajo
  cambiar: (cambios: Partial<Trabajo>) => void
}) {
  const { reparto, miParte } = resultado
  const horaMia = plata(trabajo.valores.horaMia)
  const cambiarDescuento = (descuentoId: string, cambios: Partial<Descuento>) =>
    cambiar({ descuentos: trabajo.descuentos.map((d) => (d.id === descuentoId ? { ...d, ...cambios } : d)) })

  return (
    <Tarjeta titulo={`Cobro a ${nombreCliente(trabajo.valores)}`} icono={Wallet}>
      <p className="text-base text-texto-suave">
        {horas(resultado.totalMinutos)} h trabajadas
        {resultado.empleados.length > 0 && ` · ${horas(reparto.al50 + reparto.al100)} h extras`}
        {reparto.al100 > 0 && ` (${horas(reparto.al100)} al doble)`}
      </p>

      {resultado.empleados.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-borde pt-3">
          {resultado.empleados.map((linea) => (
            <div key={linea.empleadoId}>
              <Fila etiqueta={<span className="font-semibold">{linea.nombre}</span>} valor={plata(linea.total)} />
              <p className="text-sm text-texto-suave">
                {plata(linea.montoSimples)} simples + {plata(linea.montoExtras)} extras
              </p>
            </div>
          ))}
          <Fila etiqueta="Total empleados" valor={plata(resultado.totalEmpleados)} fuerte />
        </div>
      )}

      {miParte.tipo === 'mixto' && (
        <div className="flex flex-col gap-2 border-t border-borde pt-3">
          <div>
            <Fila etiqueta={<span className="font-semibold">Tus horas</span>} valor={plata(miParte.montoHoras)} />
            <p className="text-sm text-texto-suave">
              {numero(miParte.horasMias)} h que estuviste × {horaMia}
            </p>
          </div>
          <div>
            <Fila etiqueta={<span className="font-semibold">Tu proporcional</span>} valor={plata(miParte.montoProporcional)} />
            <p className="text-sm text-texto-suave">
              Sin vos: {cuentaProporcional(miParte.grupos)} = {numero(miParte.horasProporcionales)} h × {horaMia}
            </p>
          </div>
          <Fila etiqueta="Tu parte" valor={plata(miParte.monto)} fuerte />
        </div>
      )}

      {(miParte.tipo === 'horas' || miParte.tipo === 'proporcional') && (
        <div className="border-t border-borde pt-3">
          <Fila
            etiqueta={<span className="font-semibold">{miParte.tipo === 'proporcional' ? 'Tu proporcional' : 'Tus horas'}</span>}
            valor={plata(miParte.monto)}
          />
          <p className="text-sm text-texto-suave">
            {miParte.tipo === 'proporcional'
              ? `${cuentaProporcional(miParte.grupos)} = ${numero(miParte.horasProporcionales)} h × ${horaMia}`
              : `${numero(miParte.horas)} h × ${horaMia}`}
          </p>
        </div>
      )}

      {trabajo.tipo === 'estacion' && (
        <div className="flex flex-col gap-2 border-t border-borde pt-3">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-base font-semibold">Plus por estación</span>
            <span className={`text-base tabular-nums ${resultado.plus > 0 ? 'font-semibold' : 'text-texto-suave'}`}>
              {plata(resultado.plus)}
            </span>
          </div>
          <Opciones
            etiqueta="Plus por estación"
            valor={!trabajo.conPlus ? 'no' : trabajo.medioPlus ? 'medio' : 'completo'}
            opciones={[
              ['no', 'Sin plus'],
              ['medio', 'Medio plus'],
              ['completo', 'Plus completo'],
            ]}
            alCambiar={(plus) => cambiar({ conPlus: plus !== 'no', medioPlus: plus === 'medio' })}
          />
        </div>
      )}

      {trabajo.tipo !== 'medicion' && (
        <div className="flex flex-col gap-2 border-t border-borde pt-2">
          {trabajo.descuentos.map((descuento) => (
            <div key={descuento.id} className="grid grid-cols-[minmax(0,1fr)_7.5rem_auto] items-end gap-2">
              <CampoTexto
                etiqueta="Descuento"
                valor={descuento.detalle}
                alCambiar={(detalle) => cambiarDescuento(descuento.id, { detalle })}
                ejemplo="Motivo"
              />
              <CampoPlata
                etiqueta="Monto"
                valor={descuento.monto}
                alCambiar={(monto) => cambiarDescuento(descuento.id, { monto })}
              />
              <BotonIcono
                icono={Trash2}
                etiqueta="Quitar descuento"
                peligro
                onClick={() => cambiar({ descuentos: trabajo.descuentos.filter((d) => d.id !== descuento.id) })}
              />
            </div>
          ))}
          <BotonTexto
            icono={Plus}
            onClick={() => cambiar({ descuentos: [...trabajo.descuentos, { id: nuevoId(), detalle: '', monto: 0 }] })}
          >
            Agregar descuento (si alguien se fue antes)
          </BotonTexto>
        </div>
      )}

      <Destacado etiqueta="Total a cobrar" monto={resultado.total} />
      <p className="-mt-1 text-sm text-texto-suave">Sin IVA. El IVA se suma en el resumen de la semana.</p>
    </Tarjeta>
  )
}

export function PantallaTrabajo({ id }: { id: string }) {
  const { trabajos, valores, listo, guardarTrabajo, borrarTrabajo } = useDatos()
  const trabajo = trabajos.find((t) => t.id === id)
  // El horario recién agregado abre la gente, para marcar quiénes fueron en ese horario.
  const [recienAgregado, setRecienAgregado] = useState<string | null>(null)

  if (!trabajo && !listo) {
    return (
      <Pantalla titulo="Cargando…" volver>
        <p className="text-base text-texto-suave">Trayendo los datos de la nube.</p>
      </Pantalla>
    )
  }

  if (!trabajo) {
    return (
      <Pantalla titulo="No se encontró" volver>
        <p className="text-lg">Este trabajo ya no existe. Puede que lo hayas borrado.</p>
      </Pantalla>
    )
  }

  const tipo = TIPOS[trabajo.tipo]
  const conEmpleados = trabajo.tipo !== 'medicion'
  const resultado = calcularTrabajo(trabajo, trabajos)
  const cambiar = (cambios: Partial<Trabajo>) => guardarTrabajo({ ...trabajo, ...cambios })

  // Lo cargado con la pantalla de cada día guarda si fue en el día mismo, sin la casilla del trabajo.
  const fuiYo = trabajo.trabajeYo || trabajo.tramos.some((t) => t.yo === 'todo' || t.yo === 'parte')
  // Al marcarla, los días sin contestar quedan en "todo el día" (como siempre); al desmarcarla, ningún día cuenta.
  const marcarFuiYo = (marcada: boolean) =>
    cambiar({
      trabajeYo: marcada,
      tramos: trabajo.tramos.map(({ yo, ...tramo }) => (marcada && yo ? { ...tramo, yo } : tramo)),
    })

  const cambiarTramo = (tramoId: string, cambios: Partial<Tramo>) =>
    cambiar({ tramos: trabajo.tramos.map((t) => (t.id === tramoId ? { ...t, ...cambios } : t)) })

  // Gente de afuera cargada en cualquier trabajo, para sugerir el nombre.
  const sugerencias = [...new Set(trabajos.flatMap((t) => t.tramos.flatMap((x) => x.externos ?? []).map((x) => x.nombre)))].sort()

  const otroHorario = (de: Tramo) => {
    // Arranca con los de siempre que todavía no están en otro horario ese día.
    const yaEstan = trabajo.tramos.filter((t) => t.fecha === de.fecha).flatMap((t) => empleadosDelTramo(trabajo, t))
    const faltan = trabajo.empleadoIds.filter((i) => !yaEstan.includes(i))
    const nuevo: Tramo = {
      id: nuevoId(),
      fecha: de.fecha,
      desde: '',
      hasta: '',
      feriado: de.feriado,
      empleadoIds: faltan,
      ...(fuiYo ? { yo: 'todo' as const } : {}),
    }
    setRecienAgregado(nuevo.id)
    cambiar({ tramos: [...trabajo.tramos, nuevo] })
  }

  const agregarDia = () => {
    // El día nuevo arranca al día siguiente del último, con el horario vacío para cargarlo de cero.
    const ultimo = resultado.dias.at(-1)?.tramo
    const vacio = { id: nuevoId(), desde: '', hasta: '', feriado: false, ...(fuiYo ? { yo: 'todo' as const } : {}) }
    const nuevo: Tramo = { ...vacio, fecha: ultimo ? sumarDias(ultimo.fecha, 1) : hoy() }
    cambiar({ tramos: [...trabajo.tramos, nuevo] })
  }

  const alternarEmpleado = (empleadoId: string) =>
    cambiar({
      empleadoIds: trabajo.empleadoIds.includes(empleadoId)
        ? trabajo.empleadoIds.filter((i) => i !== empleadoId)
        : [...trabajo.empleadoIds, empleadoId],
    })

  const otrosTrabajosDelDia = (tramo: Tramo) => {
    const ids = empleadosDelTramo(trabajo, tramo)
    return trabajos
      .filter(
        (t) =>
          t.id !== trabajo.id &&
          t.tramos.some((x) => x.fecha === tramo.fecha && empleadosDelTramo(t, x).some((i) => ids.includes(i))),
      )
      .map(nombreDelTrabajo)
  }

  const borrar = () => {
    const aviso = `¿Borrar “${nombreDelTrabajo(trabajo)}”? Si te equivocás, lo recuperás en Valores y precios → Trabajos borrados.`
    if (!confirm(aviso)) return
    borrarTrabajo(trabajo.id)
    ir('/')
  }

  const actualizarValores = () => {
    if (!confirm('¿Usar los valores y precios de hoy en este trabajo?')) return
    cambiar({ valores: structuredClone(valores) })
  }

  return (
    <Pantalla titulo={trabajo.nombre.trim() || tipo.nuevo} etiqueta={{ icono: tipo.icono, texto: tipo.nombre }} volver>
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:gap-6">
        <div className="flex flex-col gap-4">
          <Tarjeta>
            <CampoTexto
              etiqueta={tipo.campoNombre}
              valor={trabajo.nombre}
              alCambiar={(nombre) => cambiar({ nombre })}
              ejemplo={tipo.ejemplo}
            />
            {conEmpleados && (
              <fieldset className="flex flex-col gap-2">
                <legend className="mb-1 text-base font-semibold">
                  ¿Quiénes fueron?{' '}
                  <span className="font-normal text-texto-suave">(si un día fueron otros, lo cambiás en ese día)</span>
                </legend>
                <div className="flex flex-wrap gap-2">
                  {trabajo.valores.empleados.map((empleado) => (
                    <BotonEmpleado
                      key={empleado.id}
                      empleado={empleado}
                      fue={trabajo.empleadoIds.includes(empleado.id)}
                      onClick={() => alternarEmpleado(empleado.id)}
                    />
                  ))}
                </div>
                {trabajo.tipo === 'estacion' && (
                  <Casilla chica marcada={fuiYo} alCambiar={marcarFuiYo}>
                    Fui yo también <span className="text-texto-suave">(en cada día marcás si estuviste todo el día o un rato)</span>
                  </Casilla>
                )}
              </fieldset>
            )}
          </Tarjeta>

          <Tarjeta
            titulo="Días y horarios"
            icono={CalendarDays}
            derecha={<span className="text-sm text-texto-suave">{trabajo.tramos.length} días</span>}
          >
            {trabajo.tipo === 'fabrica' && (
              <Aviso>
                En fábrica se cuenta por hora. Si hacen 9 h o más, a los chicos se les paga el día completo. A CR, si se
                pasan de 9 h por media hora o menos, se cobran 9 h.
              </Aviso>
            )}
            {resultado.dias.map((dia) => (
              <FilaDia
                key={dia.tramo.id}
                dia={dia}
                conExtras={resultado.empleados.length > 0}
                presencia={trabajo.tipo === 'estacion' && fuiYo ? presenciaMia(trabajo, dia.tramo) : null}
                otrosTrabajos={otrosTrabajosDelDia(dia.tramo)}
                gente={
                  conEmpleados && (
                    <GenteDelDia
                      tramo={dia.tramo}
                      empleados={trabajo.valores.empleados}
                      idsDeSiempre={trabajo.empleadoIds}
                      sugerencias={sugerencias}
                      conVos={trabajo.tipo === 'estacion' && fuiYo && presenciaMia(trabajo, dia.tramo) !== 'no'}
                      abiertoAlInicio={dia.tramo.id === recienAgregado}
                      alCambiar={(cambios) => cambiarTramo(dia.tramo.id, cambios)}
                      alOtroHorario={() => otroHorario(dia.tramo)}
                    />
                  )
                }
                alCambiar={(cambios) => cambiarTramo(dia.tramo.id, cambios)}
                alQuitar={() => cambiar({ tramos: trabajo.tramos.filter((t) => t.id !== dia.tramo.id) })}
              />
            ))}
            {new Set(trabajo.tramos.map((t) => inicioDeSemana(t.fecha))).size > 1 && (
              <Aviso tipo="atencion">
                Hay días de dos semanas distintas. Conviene cargar un trabajo por semana, así el resumen de cada semana da
                bien.
              </Aviso>
            )}
            <Boton variante="secundario" icono={Plus} onClick={agregarDia}>
              Agregar día
            </Boton>
          </Tarjeta>
        </div>

        <div className="flex flex-col gap-4">
          <Resultado trabajo={trabajo} resultado={resultado} cambiar={cambiar} />

          <details className="rounded-2xl border border-borde bg-superficie px-4 py-3 text-base">
            <summary className="min-h-7 cursor-pointer font-semibold">Valores usados</summary>
            <div className="mt-2 flex flex-col gap-1">
              {conEmpleados &&
                trabajo.valores.empleados.map((e) => (
                  <Fila key={e.id} etiqueta={`Día de ${e.nombre}`} valor={plata(e.diaConveniencia)} />
                ))}
              <Fila etiqueta="Tu hora" valor={plata(trabajo.valores.horaMia)} />
              {trabajo.tipo === 'estacion' && <Fila etiqueta="Plus" valor={plata(trabajo.valores.plus)} />}
              <BotonTexto icono={RefreshCw} onClick={actualizarValores}>
                Usar los valores de hoy
              </BotonTexto>
            </div>
          </details>

          <Boton icono={Check} onClick={volver}>
            Listo
          </Boton>
          <div className="-mt-2 flex justify-center">
            <EstadoGuardado />
          </div>
          <div className="flex justify-center">
            <BotonTexto icono={Trash2} peligro onClick={borrar}>
              Borrar este trabajo
            </BotonTexto>
          </div>
        </div>
      </div>
    </Pantalla>
  )
}
