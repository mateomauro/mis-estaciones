import { CalendarDays, Check, Circle, Plus, RefreshCw, Trash2, Wallet } from 'lucide-react'
import { calcularTrabajo, diaDeLaSemana, inicioDeSemana, type DiaCalculado, type ResultadoTrabajo } from '../calculos.ts'
import { useDatos } from '../datos.tsx'
import { horas, hoy, nombreDia, nuevoId, numero, plata, sumarDias } from '../formato.ts'
import { ir, volver } from '../navegacion.ts'
import type { Descuento, Trabajo, Tramo } from '../tipos.ts'
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
  Pantalla,
  Tarjeta,
} from '../ui.tsx'

function detalleDelDia(dia: DiaCalculado, conExtras: boolean) {
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

function FilaDia({
  dia,
  conExtras,
  otrosTrabajos,
  alCambiar,
  alQuitar,
}: {
  dia: DiaCalculado
  conExtras: boolean
  otrosTrabajos: string[]
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
      <div className="grid grid-cols-2 gap-2">
        <CampoHora etiqueta="Desde" valor={tramo.desde} alCambiar={(desde) => alCambiar({ desde })} />
        <CampoHora etiqueta="Hasta" valor={tramo.hasta} alCambiar={(hasta) => alCambiar({ hasta })} />
      </div>
      <div className="flex items-center gap-2">
        <span className={`min-w-0 flex-1 text-base font-semibold ${dia.minutos === 0 ? 'text-aviso-texto' : ''}`}>
          {detalleDelDia(dia, conExtras)}
        </span>
        {numeroDia >= 1 && numeroDia <= 5 && (
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
          Ese día también estuvieron en {otrosTrabajos.join(' y ')}: las horas simples se cuentan sumando todo el día.
        </Aviso>
      )}
    </div>
  )
}

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

      {miParte.tipo !== 'nada' && (
        <div className="border-t border-borde pt-3">
          <Fila
            etiqueta={<span className="font-semibold">{miParte.tipo === 'proporcional' ? 'Tu proporcional' : 'Tus horas'}</span>}
            valor={plata(miParte.monto)}
          />
          <p className="text-sm text-texto-suave">
            {miParte.tipo === 'proporcional'
              ? `${numero(miParte.horas)} h × ${miParte.empleados} ÷ ${miParte.empleados + 1} = ${numero(miParte.horasProporcionales)} h × ${horaMia}`
              : `${numero(miParte.horas)} h × ${horaMia}`}
          </p>
        </div>
      )}

      {trabajo.tipo === 'estacion' && (
        <div className="flex flex-wrap items-center justify-between gap-x-3 border-t border-borde pt-2">
          <Casilla chica marcada={trabajo.conPlus} alCambiar={(conPlus) => cambiar({ conPlus })}>
            Estación terminada: plus
          </Casilla>
          <span className={`text-base tabular-nums ${trabajo.conPlus ? '' : 'text-texto-suave line-through'}`}>
            {plata(trabajo.valores.plus)}
          </span>
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

  const cambiarTramo = (tramoId: string, cambios: Partial<Tramo>) =>
    cambiar({ tramos: trabajo.tramos.map((t) => (t.id === tramoId ? { ...t, ...cambios } : t)) })

  const agregarDia = () => {
    // El día nuevo arranca con el mismo horario que el último, al día siguiente.
    const ultimo = resultado.dias.at(-1)?.tramo
    const nuevo: Tramo = ultimo
      ? { ...ultimo, id: nuevoId(), fecha: sumarDias(ultimo.fecha, 1), feriado: false }
      : { id: nuevoId(), fecha: hoy(), desde: '', hasta: '', feriado: false }
    cambiar({ tramos: [...trabajo.tramos, nuevo] })
  }

  const alternarEmpleado = (empleadoId: string) =>
    cambiar({
      empleadoIds: trabajo.empleadoIds.includes(empleadoId)
        ? trabajo.empleadoIds.filter((i) => i !== empleadoId)
        : [...trabajo.empleadoIds, empleadoId],
    })

  const otrosTrabajosDelDia = (tramo: Tramo) =>
    conEmpleados
      ? trabajos
          .filter(
            (t) =>
              t.id !== trabajo.id &&
              t.tipo !== 'medicion' &&
              t.empleadoIds.some((i) => trabajo.empleadoIds.includes(i)) &&
              t.tramos.some((x) => x.fecha === tramo.fecha),
          )
          .map(nombreDelTrabajo)
      : []

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
                <legend className="mb-1 text-base font-semibold">¿Quiénes fueron?</legend>
                <div className="flex flex-wrap gap-2">
                  {trabajo.valores.empleados.map((empleado) => {
                    const fue = trabajo.empleadoIds.includes(empleado.id)
                    const Icono = fue ? Check : Circle
                    return (
                      <button
                        key={empleado.id}
                        type="button"
                        aria-pressed={fue}
                        onClick={() => alternarEmpleado(empleado.id)}
                        className={`flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border-2 px-4 text-base font-semibold transition-colors duration-150 ${
                          fue ? 'border-primario bg-primario text-white' : 'border-campo bg-superficie text-texto-suave'
                        }`}
                      >
                        <Icono className="size-5 shrink-0" aria-hidden />
                        {empleado.nombre || 'Sin nombre'}
                      </button>
                    )
                  })}
                </div>
                {trabajo.tipo === 'estacion' && (
                  <Casilla chica marcada={trabajo.trabajeYo} alCambiar={(trabajeYo) => cambiar({ trabajeYo })}>
                    Trabajé yo también <span className="text-texto-suave">(cobro mis horas, sin proporcional)</span>
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
              <Aviso>Si trabajan menos de 9 horas en fábrica, se cobra igual el día completo.</Aviso>
            )}
            {resultado.dias.map((dia) => (
              <FilaDia
                key={dia.tramo.id}
                dia={dia}
                conExtras={resultado.empleados.length > 0}
                otrosTrabajos={otrosTrabajosDelDia(dia.tramo)}
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
