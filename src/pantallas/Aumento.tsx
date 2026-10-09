import { Check, CheckCircle2, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { listarSemanas } from '../calculos.ts'
import { useDatos } from '../datos.tsx'
import { plata, rangoDeFechas, sumarDias } from '../formato.ts'
import { volver } from '../navegacion.ts'
import { useAvisar } from '../toast.tsx'
import type { Valores } from '../tipos.ts'
import { nombreCliente } from '../tiposDeTrabajo.ts'
import { Aviso, Boton, BotonTexto, estiloCampo, Pantalla, Subtitulo, Titulo } from '../ui.tsx'

type Grupo = 'tuyos' | 'cliente' | 'pago'
type Item = { clave: string; grupo: Grupo; nombre: string; actual: number }

/** Todos los valores que pueden subir, cada uno con una clave para marcarlo. */
function itemsDe(valores: Valores): Item[] {
  return [
    { clave: 'horaMia', grupo: 'tuyos', nombre: 'Tu hora', actual: valores.horaMia },
    { clave: 'plus', grupo: 'tuyos', nombre: 'Plus', actual: valores.plus },
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

const cuantos = (n: number) => `${n} ${n === 1 ? 'valor' : 'valores'}`

/** Sube por un porcentaje los valores que se elijan, mostrando antes cómo quedan. */
export function PantallaAumento() {
  const { valores, trabajos, guardarValores, actualizarValoresDeSemana } = useDatos()
  const avisar = useAvisar()
  const [texto, setTexto] = useState('')
  const [marcados, setMarcados] = useState<Set<string>>(new Set())
  const [aplicado, setAplicado] = useState<{ cantidad: number; porcentaje: number } | null>(null)
  const [semanasActualizadas, setSemanasActualizadas] = useState<string[]>([])

  const cliente = nombreCliente(valores)
  const items = itemsDe(valores)
  const porcentaje = Number(texto.replace(',', '.').replace('%', '').trim())
  const porcentajeValido = texto.trim() !== '' && Number.isFinite(porcentaje) && porcentaje !== 0 && Math.abs(porcentaje) <= 100
  const textoPorcentaje = `${porcentaje.toLocaleString('es-AR')} %`

  const grupos: { grupo: Grupo; titulo: string }[] = [
    { grupo: 'tuyos', titulo: 'Tus precios' },
    { grupo: 'cliente', titulo: `Lo que cobrás a ${cliente} por día` },
    { grupo: 'pago', titulo: 'Lo que les pagás por día' },
  ]

  const alternar = (claves: string[], marcar: boolean) =>
    setMarcados((anterior) => {
      const nuevos = new Set(anterior)
      for (const clave of claves) {
        if (marcar) nuevos.add(clave)
        else nuevos.delete(clave)
      }
      return nuevos
    })

  const confirmar = () => {
    if (!porcentajeValido || marcados.size === 0) return
    const antes = valores
    guardarValores(aplicar(valores, marcados, porcentaje))
    avisar({
      texto: `Subieron ${cuantos(marcados.size)} un ${textoPorcentaje}`,
      deshacer: () => {
        guardarValores(antes)
        setAplicado(null)
      },
    })
    setAplicado({ cantidad: marcados.size, porcentaje })
    setSemanasActualizadas([])
    setMarcados(new Set())
    setTexto('')
    window.scrollTo(0, 0)
  }

  // Las dos últimas semanas cargadas: si el aumento llegó tarde, se pueden pasar los valores nuevos sin recargar nada.
  const semanasRecientes = listarSemanas(trabajos).slice(0, 2)
  const actualizarSemana = (inicio: string) => {
    actualizarValoresDeSemana(inicio)
    setSemanasActualizadas((lista) => [...lista, inicio])
  }

  // El botón dice exactamente qué va a hacer, o qué falta.
  const textoBoton = !porcentajeValido
    ? texto.trim()
      ? 'Escribí solo el número, por ejemplo 4'
      : 'Falta poner cuánto aumentó'
    : marcados.size === 0
      ? 'Marcá qué sube'
      : `Subir ${cuantos(marcados.size)} un ${textoPorcentaje}`

  return (
    <Pantalla
      volver="Valores"
      titulo="Aplicar un aumento"
      barra={
        aplicado && marcados.size === 0 && !texto ? (
          <Boton icono={Check} onClick={volver}>
            Listo
          </Boton>
        ) : (
          <Boton icono={Check} onClick={confirmar} deshabilitado={!porcentajeValido || marcados.size === 0}>
            {textoBoton}
          </Boton>
        )
      }
    >
      {aplicado && (
        <>
          <Aviso icono={CheckCircle2}>
            <b>
              Listo: subieron {cuantos(aplicado.cantidad)} un {aplicado.porcentaje.toLocaleString('es-AR')} %.
            </b>{' '}
            Lo que cargues de ahora en más ya los usa.
          </Aviso>
          {semanasRecientes.length > 0 && (
            <>
              <Subtitulo className="mt-3">Si el aumento ya corría para algo que cargaste antes, pasáselo sin volver a cargar:</Subtitulo>
              <div className="mt-2 flex flex-col gap-2.5">
                {semanasRecientes.map((inicio) =>
                  semanasActualizadas.includes(inicio) ? (
                    <p key={inicio} className="flex min-h-12 items-center gap-1.5 font-bold text-primario">
                      <Check className="size-5" aria-hidden /> Semana {rangoDeFechas(inicio, sumarDias(inicio, 6))} actualizada
                    </p>
                  ) : (
                    <Boton key={inicio} variante="secundario" icono={RefreshCw} onClick={() => actualizarSemana(inicio)}>
                      Usarlos también en la semana {rangoDeFechas(inicio, sumarDias(inicio, 6))}
                    </Boton>
                  ),
                )}
              </div>
            </>
          )}
          <Titulo>¿Otro aumento?</Titulo>
        </>
      )}

      <label className="mt-[18px] block">
        <span className="mb-1.5 block text-[1.08rem] font-bold">¿Cuánto aumentó?</span>
        <span className="flex items-center gap-2.5">
          <input
            inputMode="decimal"
            className={`${estiloCampo} min-h-[62px] max-w-36 font-titulo text-[1.6rem] font-semibold tabular-nums`}
            value={texto}
            placeholder="Ej: 4"
            onChange={(e) => setTexto(e.target.value)}
          />
          <span className="font-titulo text-[1.6rem] font-bold">%</span>
        </span>
      </label>

      <Titulo>¿Qué sube?</Titulo>
      <Subtitulo className="-mt-1.5">Marcá solo lo que aumentó. Al lado ves cómo queda.</Subtitulo>

      {grupos.map(({ grupo, titulo }) => {
        const delGrupo = items.filter((i) => i.grupo === grupo)
        if (delGrupo.length === 0) return null
        const todos = delGrupo.every((i) => marcados.has(i.clave))
        return (
          <section key={grupo} className="mt-[18px]">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[1.05rem] font-semibold">{titulo}</h3>
              <span className="shrink-0 whitespace-nowrap">
                <BotonTexto onClick={() => alternar(delGrupo.map((i) => i.clave), !todos)}>{todos ? 'Desmarcar' : 'Marcar todos'}</BotonTexto>
              </span>
            </div>
            {delGrupo.map((item) => {
              const marcado = marcados.has(item.clave)
              return (
                <label
                  key={item.clave}
                  className="flex min-h-[52px] cursor-pointer items-center justify-between gap-2.5 border-b border-borde"
                >
                  <span className="flex items-center gap-2.5 font-semibold">
                    <input
                      type="checkbox"
                      className="size-[26px] shrink-0 cursor-pointer accent-primario"
                      checked={marcado}
                      onChange={(e) => alternar([item.clave], e.target.checked)}
                    />
                    {item.nombre}
                  </span>
                  <span className="text-right text-base tabular-nums">
                    {plata(item.actual)}
                    {marcado && porcentajeValido && (
                      <>
                        {' → '}
                        <b className="text-primario-fuerte">{plata(conAumento(item.actual, porcentaje))}</b>
                      </>
                    )}
                  </span>
                </label>
              )
            })}
          </section>
        )
      })}
    </Pantalla>
  )
}
