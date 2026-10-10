import { Check, Percent, RefreshCw, X } from 'lucide-react'
import { useState } from 'react'
import { listarSemanas } from '../calculos.ts'
import { useDatos } from '../datos.tsx'
import { plata, rangoDeFechas, sumarDias } from '../formato.ts'
import type { Valores } from '../tipos.ts'
import { nombreCliente } from '../tiposDeTrabajo.ts'
import { Aviso, Boton, BotonTexto, Casilla, estiloCampo, Tarjeta } from '../ui.tsx'

type Grupo = 'tuyos' | 'cliente' | 'pago'
type Item = { clave: string; grupo: Grupo; nombre: string; actual: number }

/** Todos los valores que pueden subir, cada uno con una clave para marcarlo. */
function itemsDe(valores: Valores): Item[] {
  return [
    { clave: 'horaMia', grupo: 'tuyos', nombre: 'Tu hora', actual: valores.horaMia },
    { clave: 'plus', grupo: 'tuyos', nombre: 'Plus por estación', actual: valores.plus },
    ...valores.empleados.map((e) => ({ clave: `cliente:${e.id}`, grupo: 'cliente' as const, nombre: e.nombre || 'Sin nombre', actual: e.diaConveniencia })),
    ...valores.empleados.map((e) => ({ clave: `pago:${e.id}`, grupo: 'pago' as const, nombre: e.nombre || 'Sin nombre', actual: e.diaPago })),
  ]
}

const conAumento = (valor: number, porcentaje: number) => Math.round(valor * (1 + porcentaje / 100))

function aplicar(valores: Valores, marcados: Set<string>, porcentaje: number): Valores {
  const subir = (clave: string, valor: number) => (marcados.has(clave) ? conAumento(valor, porcentaje) : valor)
  return {
    ...valores,
    horaMia: subir('horaMia', valores.horaMia),
    plus: subir('plus', valores.plus),
    empleados: valores.empleados.map((e) => ({
      ...e,
      diaConveniencia: subir(`cliente:${e.id}`, e.diaConveniencia),
      diaPago: subir(`pago:${e.id}`, e.diaPago),
    })),
  }
}

/** Sube por un porcentaje los valores que se elijan, mostrando antes cómo quedan. */
export function Aumento() {
  const { valores, trabajos, guardarValores, actualizarValoresDeSemana } = useDatos()
  const [abierto, setAbierto] = useState(false)
  const [texto, setTexto] = useState('')
  const [marcados, setMarcados] = useState<Set<string>>(new Set())
  const [aplicado, setAplicado] = useState<{ cantidad: number; porcentaje: number } | null>(null)
  const [semanasActualizadas, setSemanasActualizadas] = useState<string[]>([])

  const cliente = nombreCliente(valores)
  const items = itemsDe(valores)
  const porcentaje = Number(texto.replace(',', '.').replace('%', '').trim())
  const porcentajeValido = texto.trim() !== '' && Number.isFinite(porcentaje) && porcentaje !== 0 && Math.abs(porcentaje) <= 100

  const grupos: { grupo: Grupo; titulo: string }[] = [
    { grupo: 'tuyos', titulo: 'Tus valores' },
    { grupo: 'cliente', titulo: `Lo que cobrás a ${cliente} por día` },
    { grupo: 'pago', titulo: 'Lo que les pagás por día' },
  ]

  const alternar = (clave: string, marcar: boolean) =>
    setMarcados((anterior) => {
      const nuevos = new Set(anterior)
      if (marcar) nuevos.add(clave)
      else nuevos.delete(clave)
      return nuevos
    })

  const alternarGrupo = (grupo: Grupo, marcar: boolean) =>
    setMarcados((anterior) => {
      const nuevos = new Set(anterior)
      for (const item of items.filter((i) => i.grupo === grupo)) {
        if (marcar) nuevos.add(item.clave)
        else nuevos.delete(item.clave)
      }
      return nuevos
    })

  const confirmar = () => {
    if (!porcentajeValido || marcados.size === 0) return
    const cuantos = `${marcados.size} ${marcados.size === 1 ? 'valor' : 'valores'}`
    if (!confirm(`¿Subir un ${porcentaje.toLocaleString('es-AR')}% ${cuantos}?`)) return
    guardarValores(aplicar(valores, marcados, porcentaje))
    setAplicado({ cantidad: marcados.size, porcentaje })
    setSemanasActualizadas([])
    setMarcados(new Set())
    setTexto('')
    setAbierto(false)
  }

  const cerrar = () => {
    setAbierto(false)
    setMarcados(new Set())
    setTexto('')
  }

  // Las dos últimas semanas cargadas: si el aumento llegó tarde, se pueden pasar los valores nuevos sin recargar nada.
  const semanasRecientes = listarSemanas(trabajos).slice(0, 2)
  const actualizarSemana = (inicio: string) => {
    if (!confirm(`¿Usar los valores nuevos en todo lo cargado la semana ${rangoDeFechas(inicio, sumarDias(inicio, 6))}?`)) return
    actualizarValoresDeSemana(inicio)
    setSemanasActualizadas((lista) => [...lista, inicio])
  }

  if (!abierto) {
    return (
      <div className="flex flex-col gap-3">
        <Boton variante="secundario" icono={Percent} onClick={() => { setAbierto(true); setAplicado(null) }}>
          Aplicar un aumento
        </Boton>
        {aplicado && (
          <Tarjeta titulo="Aumento aplicado" icono={Check}>
            <p className="text-base">
              Subieron {aplicado.cantidad} {aplicado.cantidad === 1 ? 'valor' : 'valores'} un {aplicado.porcentaje.toLocaleString('es-AR')}%.
              Lo que cargues de ahora en más ya usa los valores nuevos.
            </p>
            {semanasRecientes.length > 0 && (
              <>
                <p className="text-base">Si el aumento ya corría para algo que cargaste antes, pasáselo acá sin volver a cargar:</p>
                {semanasRecientes.map((inicio) =>
                  semanasActualizadas.includes(inicio) ? (
                    <p key={inicio} className="flex items-center gap-1.5 text-base text-primario">
                      <Check className="size-5" aria-hidden /> Semana {rangoDeFechas(inicio, sumarDias(inicio, 6))} actualizada
                    </p>
                  ) : (
                    <BotonTexto key={inicio} icono={RefreshCw} onClick={() => actualizarSemana(inicio)}>
                      Usarlos en la semana {rangoDeFechas(inicio, sumarDias(inicio, 6))}
                    </BotonTexto>
                  ),
                )}
              </>
            )}
          </Tarjeta>
        )}
      </div>
    )
  }

  return (
    <Tarjeta titulo="Aplicar un aumento" icono={Percent}>
      <label className="flex flex-col gap-1">
        <span className="text-base font-semibold">1. ¿Cuánto aumentó?</span>
        <div className="flex items-center gap-2">
          <input
            inputMode="decimal"
            className={`${estiloCampo} max-w-32 tabular-nums`}
            value={texto}
            placeholder="Ej: 4"
            onChange={(e) => setTexto(e.target.value)}
          />
          <span className="text-xl font-semibold">%</span>
        </div>
        {texto.trim() !== '' && !porcentajeValido && (
          <span className="text-sm text-peligro">Escribí solo el número, por ejemplo 4 o 3,5</span>
        )}
      </label>

      <div className="flex flex-col gap-1">
        <span className="text-base font-semibold">2. ¿Qué sube?</span>
        <span className="text-sm text-texto-suave">Marcá solo lo que aumentó. Al lado ves cómo queda.</span>
      </div>

      {grupos.map(({ grupo, titulo }) => {
        const delGrupo = items.filter((i) => i.grupo === grupo)
        if (delGrupo.length === 0) return null
        const todos = delGrupo.every((i) => marcados.has(i.clave))
        return (
          <div key={grupo} className="flex flex-col gap-1 border-t border-borde pt-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-base font-semibold">{titulo}</span>
              <BotonTexto onClick={() => alternarGrupo(grupo, !todos)}>{todos ? 'Desmarcar todos' : 'Marcar todos'}</BotonTexto>
            </div>
            {delGrupo.map((item) => {
              const marcado = marcados.has(item.clave)
              return (
                <div key={item.clave} className="flex flex-wrap items-center justify-between gap-x-3">
                  <Casilla chica marcada={marcado} alCambiar={(m) => alternar(item.clave, m)}>
                    {item.nombre}
                  </Casilla>
                  <span className="text-base tabular-nums">
                    {plata(item.actual)}
                    {marcado && porcentajeValido && (
                      <>
                        {' → '}
                        <strong className="text-primario">{plata(conAumento(item.actual, porcentaje))}</strong>
                      </>
                    )}
                  </span>
                </div>
              )
            })}
          </div>
        )
      })}

      {marcados.size > 0 && !porcentajeValido && <Aviso tipo="atencion">Falta poner cuánto aumentó.</Aviso>}
      <Boton icono={Check} onClick={confirmar} deshabilitado={!porcentajeValido || marcados.size === 0}>
        3. Aplicar aumento
      </Boton>
      <div className="flex justify-center">
        <BotonTexto icono={X} onClick={cerrar}>
          Cancelar
        </BotonTexto>
      </div>
    </Tarjeta>
  )
}
