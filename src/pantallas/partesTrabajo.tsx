// Piezas que comparten las pantallas de una estación, una fábrica, un viaje a medir y un día.
import { Check, Circle, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { inicioDeSemana, presenciaMia, semanaDe, type DiaCalculado, type ResultadoTrabajo } from '../calculos.ts'
import { horas, hoy, nuevoId, numero, plata, sumarDias } from '../formato.ts'
import type { Descuento, Empleado, Trabajo, Tramo } from '../tipos.ts'
import { BotonTexto, CampoPlata, CampoTexto, Chip, Chips, Fila, Subtitulo } from '../ui.tsx'

export const tieneHorario = (t: Tramo) => Boolean(t.desde && t.hasta)

export const textoHoras = (minutos: number) => `${horas(minutos)} ${minutos === 60 ? 'hora' : 'horas'}`

/**
 * Día que propone "Cargar otro día": hoy, si todavía no está cargado y es de la semana de la estación.
 * Si no, el día siguiente al último cargado.
 */
export function diaParaCargar(trabajo: Trabajo): string {
  const hoyMismo = hoy()
  const fechas = trabajo.tramos.map((t) => t.fecha).sort()
  if (fechas.length === 0) return hoyMismo
  if (!fechas.includes(hoyMismo) && inicioDeSemana(hoyMismo) === semanaDe(trabajo)) return hoyMismo
  return sumarDias(fechas[fechas.length - 1], 1)
}

/** "10,5 horas · 9 simples + 1,5 extras" */
export function detalleDelDia(dia: DiaCalculado, conExtras: boolean) {
  const total = textoHoras(dia.minutos)
  if (!conExtras) return total
  if (dia.tipo === 'domingo') return `${total} · domingo: todo al doble`
  if (dia.tipo === 'sabado') return `${total} · sábado: todo al 1,5`
  if (dia.tipo === 'feriado') return `${total} · feriado: todo al 1,5`
  if (dia.relleno > 0) return `${total} · se cobra el día completo`
  if (dia.reparto.al50 === 0) return `${total} · sin extras`
  return `${total} · ${horas(dia.reparto.simples)} simples + ${horas(dia.reparto.al50)} extras`
}

/** Lo que se ve de él en el renglón del día. Null si en ese trabajo no se pregunta. */
export function textoPresencia(trabajo: Trabajo, dia: DiaCalculado): string | null {
  if (trabajo.tipo !== 'estacion') return null
  if (dia.tramo.yo === null) return 'falta contestar si fuiste'
  const presencia = presenciaMia(trabajo, dia.tramo)
  if (presencia === 'todo') return 'vos fuiste todo el día'
  if (presencia === 'parte') return `vos fuiste un rato (${horas(dia.minutosMios)} h)`
  return 'vos no fuiste'
}

/** Otros trabajos con los mismos chicos ese día: las horas simples se cuentan sumando todo. */
export function otrosTrabajosDelDia(trabajo: Trabajo, todos: Trabajo[], fecha: string): string[] {
  if (trabajo.tipo === 'medicion') return []
  return todos
    .filter(
      (t) =>
        t.id !== trabajo.id &&
        t.tipo !== 'medicion' &&
        t.empleadoIds.some((i) => trabajo.empleadoIds.includes(i)) &&
        t.tramos.some((x) => x.fecha === fecha && tieneHorario(x)),
    )
    .map((t) => t.nombre.trim() || (t.tipo === 'fabrica' ? 'Fábrica' : 'otra estación'))
}

export function QuienesFueron({
  empleados,
  ids,
  alCambiar,
}: {
  empleados: Empleado[]
  ids: string[]
  alCambiar: (ids: string[]) => void
}) {
  return (
    <Chips>
      {empleados.map((empleado) => {
        const fue = ids.includes(empleado.id)
        return (
          <Chip
            key={empleado.id}
            activo={fue}
            icono={fue ? Check : Circle}
            onClick={() => alCambiar(fue ? ids.filter((i) => i !== empleado.id) : [...ids, empleado.id])}
          >
            {empleado.nombre || 'Sin nombre'}
          </Chip>
        )
      })}
    </Chips>
  )
}

/** Lo que se le cobra al cliente, persona por persona, con las cuentas. */
export function CuentasDelTrabajo({
  trabajo,
  resultado,
  alUsarValoresDeHoy,
}: {
  trabajo: Trabajo
  resultado: ResultadoTrabajo
  alUsarValoresDeHoy: () => void
}) {
  const { miParte } = resultado
  const horaMia = plata(trabajo.valores.horaMia)
  const usados = [
    `Tu hora ${horaMia}`,
    ...(trabajo.tipo === 'medicion'
      ? []
      : trabajo.valores.empleados
          .filter((e) => trabajo.empleadoIds.includes(e.id))
          .map((e) => `${e.nombre} ${plata(e.diaConveniencia)} por día`)),
    ...(trabajo.tipo === 'estacion' ? [`Plus ${plata(trabajo.valores.plus)}`] : []),
  ]

  return (
    <div>
      {resultado.empleados.map((linea) => (
        <Fila
          key={linea.empleadoId}
          etiqueta={linea.nombre}
          valor={plata(linea.total)}
          detalle={`${horas(linea.reparto.simples)} h simples (${plata(linea.montoSimples)}) + ${horas(
            linea.reparto.al50 + linea.reparto.al100,
          )} h extras (${plata(linea.montoExtras)})`}
        />
      ))}

      {miParte.tipo === 'mixto' && (
        <>
          <Fila
            etiqueta="Tus horas"
            valor={plata(miParte.montoHoras)}
            detalle={`${numero(miParte.horasMias)} h que estuviste × ${horaMia}`}
          />
          <Fila
            etiqueta="Tu proporcional"
            valor={plata(miParte.montoProporcional)}
            detalle={`${numero(miParte.horasSinMi)} h sin vos × ${miParte.empleados} ÷ ${miParte.empleados + 1} = ${numero(
              miParte.horasProporcionales,
            )} h × ${horaMia}`}
          />
        </>
      )}
      {miParte.tipo === 'proporcional' && (
        <Fila
          etiqueta="Tu proporcional"
          valor={plata(miParte.monto)}
          detalle={`${numero(miParte.horas)} h × ${miParte.empleados} ÷ ${miParte.empleados + 1} = ${numero(
            miParte.horasProporcionales,
          )} h × ${horaMia}`}
        />
      )}
      {miParte.tipo === 'horas' && (
        <Fila etiqueta="Tus horas" valor={plata(miParte.monto)} detalle={`${numero(miParte.horas)} h × ${horaMia}`} />
      )}
      {resultado.plus > 0 && <Fila etiqueta="Plus por estación terminada" valor={plata(resultado.plus)} />}
      {resultado.descuentos > 0 && <Fila etiqueta="Descuentos" valor={`− ${plata(resultado.descuentos)}`} />}
      <Fila etiqueta="Total sin IVA" valor={plata(resultado.total)} fuerte />

      <Subtitulo className="mt-3">Valores usados: {usados.join(' · ')}.</Subtitulo>
      <BotonTexto icono={RefreshCw} onClick={alUsarValoresDeHoy}>
        Usar los valores de hoy
      </BotonTexto>
    </div>
  )
}

/** Descuentos de un trabajo (por ejemplo, si alguien se fue antes). */
export function Descuentos({
  descuentos,
  alCambiar,
}: {
  descuentos: Descuento[]
  alCambiar: (descuentos: Descuento[]) => void
}) {
  const cambiar = (id: string, cambios: Partial<Descuento>) =>
    alCambiar(descuentos.map((d) => (d.id === id ? { ...d, ...cambios } : d)))
  return (
    <div>
      {descuentos.length === 0 && <Subtitulo className="mt-2">Por ejemplo, si alguien se fue antes.</Subtitulo>}
      {descuentos.map((descuento, i) => (
        <div key={descuento.id} className={i > 0 ? 'mt-3 border-t border-borde' : ''}>
          <CampoTexto
            etiqueta="Motivo"
            valor={descuento.detalle}
            ejemplo="Ej: Nico se fue a las 15"
            alCambiar={(detalle) => cambiar(descuento.id, { detalle })}
          />
          <CampoPlata
            etiqueta="Cuánto se descuenta"
            tamaño="mediano"
            valor={descuento.monto}
            alCambiar={(monto) => cambiar(descuento.id, { monto })}
          />
          <BotonTexto icono={Trash2} tono="peligro" onClick={() => alCambiar(descuentos.filter((d) => d.id !== descuento.id))}>
            Quitar este descuento
          </BotonTexto>
        </div>
      ))}
      <BotonTexto icono={Plus} onClick={() => alCambiar([...descuentos, { id: nuevoId(), detalle: '', monto: 0 }])}>
        Agregar un descuento
      </BotonTexto>
    </div>
  )
}
