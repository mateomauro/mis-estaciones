import { Check, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { inicioDeSemana, resumirSemana, semanaDe } from '../calculos.ts'
import { estaVacio, useDatos } from '../datos.tsx'
import { diaYFecha, fechaCorta, hoy, nombreDia, nuevoId, plata, rangoCorto, sumarDias } from '../formato.ts'
import { CATEGORIAS, nombreDelGasto } from '../gastos.ts'
import { ir, volver } from '../navegacion.ts'
import { useAvisar } from '../toast.tsx'
import type { CategoriaGasto, Gasto, Trabajo } from '../tipos.ts'
import { nombreCliente, nombreDelTrabajo } from '../tiposDeTrabajo.ts'
import {
  Aviso,
  Boton,
  BotonTexto,
  CambiarFecha,
  CampoPlata,
  CampoTexto,
  Chip,
  Chips,
  LineaLibro,
  Libro,
  Lista,
  NotaLibro,
  Opciones,
  Pantalla,
  Renglon,
  Semanero,
  Subtitulo,
  Titulo,
} from '../ui.tsx'
import { EstadoGuardado } from './EstadoGuardado.tsx'
import { flechasDeSemana, nombreDeSemana } from './Semana.tsx'

function AvisoSinGastos() {
  return (
    <Aviso tipo="atencion">
      No se pudieron traer los gastos de la nube. Lo que anotes queda guardado en este aparato.
    </Aviso>
  )
}

export function PantallaGastos({ inicio = inicioDeSemana(hoy()) }: { inicio?: string }) {
  const { trabajos, gastos, valores, listo, fallanGastos } = useDatos()
  const semana = resumirSemana(inicio, trabajos, valores.iva, gastos)
  const cliente = nombreCliente(valores)
  const hoyMismo = hoy()
  // Si mira otra semana, el gasto nuevo arranca en esa semana.
  const fechaNueva = inicioDeSemana(hoyMismo) === inicio ? hoyMismo : inicio

  return (
    <Pantalla
      cabecera={
        <Semanero
          titulo="Gastos"
          subtitulo={[nombreDeSemana(inicio), rangoCorto(semana.inicio, semana.fin)].filter(Boolean).join(' · ')}
          {...flechasDeSemana(inicio, '/gastos')}
        />
      }
      solapa="gastos"
    >
      {fallanGastos && <AvisoSinGastos />}
      <div className="mt-4">
        <Boton icono={Plus} onClick={() => ir(`/gasto/nuevo/${fechaNueva}`)}>
          Anotar un gasto
        </Boton>
      </div>

      {!listo ? (
        <Subtitulo className="mt-6">Cargando…</Subtitulo>
      ) : semana.gastos.length === 0 ? (
        <Subtitulo className="mt-6">
          No anotaste gastos en esta semana. Lo que pongas en efectivo (nafta, comida, materiales…) anotalo acá y se lo
          cobrás a {cliente} en la planilla.
        </Subtitulo>
      ) : (
        <>
          <Titulo>
            {semana.gastos.length} {semana.gastos.length === 1 ? 'gasto' : 'gastos'}
          </Titulo>
          <Lista>
            {[...semana.gastos].reverse().map((g) => (
              <Renglon
                key={g.id}
                icono={CATEGORIAS[g.categoria]?.icono}
                titulo={nombreDelGasto(g)}
                detalle={[
                  `${nombreDia(g.fecha)} ${fechaCorta(g.fecha)}`,
                  g.lugar,
                  g.categoria !== 'otro' && g.nota.trim(),
                ]
                  .filter(Boolean)
                  .join(' · ')}
                valor={plata(g.monto)}
                onClick={() => ir(`/gasto/${g.id}`)}
              />
            ))}
          </Lista>
          <div className="mt-3">
            <Libro>
              <LineaLibro etiqueta={<b>Total de la semana</b>} monto={plata(semana.totalGastos)} />
              <NotaLibro>Se lo cobrás a {cliente} en la planilla de esta semana, sin IVA.</NotaLibro>
            </Libro>
          </div>
        </>
      )}
    </Pantalla>
  )
}

/** Estaciones y fábricas para elegir de cuál fue el gasto: las de esa semana. */
function lugaresDeLaSemana(trabajos: Trabajo[], fecha: string): Trabajo[] {
  const semana = inicioDeSemana(fecha)
  return trabajos
    .filter((t) => t.tipo !== 'medicion' && !estaVacio(t))
    .filter((t) => semanaDe(t) === semana || t.tramos.some((x) => inicioDeSemana(x.fecha) === semana))
    .sort((a, b) => nombreDelTrabajo(a).localeCompare(nombreDelTrabajo(b)))
}

function cuando(fecha: string) {
  const hoyMismo = hoy()
  if (fecha === hoyMismo) return `Hoy, ${diaYFecha(fecha)}`
  if (fecha === sumarDias(hoyMismo, -1)) return `Ayer, ${diaYFecha(fecha)}`
  return `${nombreDia(fecha)} ${fechaCorta(fecha)}`
}

/** Anotar o corregir un gasto. Se guarda solo apenas tiene el monto. */
export function PantallaGasto({ id, fecha }: { id?: string; fecha?: string }) {
  const { gastos, listo } = useDatos()
  const existente = id ? gastos.find((g) => g.id === id) : undefined
  if (id && !existente) {
    return (
      <Pantalla titulo={listo ? 'Este gasto ya no está' : 'Cargando…'} volver="Gastos">
        <Subtitulo className="mt-2">{listo ? 'Puede que lo hayas quitado.' : 'Trayendo los datos de la nube.'}</Subtitulo>
      </Pantalla>
    )
  }
  return <FormularioGasto key={id ?? 'nuevo'} existente={existente} fecha={fecha} />
}

function FormularioGasto({ existente, fecha }: { existente?: Gasto; fecha?: string }) {
  const { trabajos, gastos, fallanGastos, guardarGasto, borrarGasto } = useDatos()
  const avisar = useAvisar()
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

  const listoGasto = () => {
    if (borrador.monto > 0 && !borrador.categoria) {
      setFaltaCategoria(true)
      return
    }
    if (borrador.monto > 0 && borrador.categoria) {
      const nombre = nombreDelGasto({ ...borrador, categoria: borrador.categoria })
      avisar({ texto: `${existente ? 'Gasto corregido' : 'Gasto anotado'}: ${nombre} ${plata(borrador.monto)}` })
    }
    volver()
  }

  const quitar = () => {
    const quitado = borrarGasto(borrador.id)
    volver()
    if (quitado) avisar({ texto: `Se quitó el gasto de ${plata(quitado.monto)}`, deshacer: () => guardarGasto(quitado) })
  }

  return (
    <Pantalla
      volver="Gastos"
      titulo={existente ? 'Corregir el gasto' : 'Anotar un gasto'}
      barra={
        <>
          <Boton icono={Check} onClick={listoGasto}>
            Listo
          </Boton>
          <EstadoGuardado enBarra />
        </>
      }
    >
      {fallanGastos && <AvisoSinGastos />}
      <CampoPlata etiqueta="¿Cuánto gastaste?" valor={borrador.monto} enfocar={!existente} alCambiar={(monto) => cambiar({ monto })} />

      <Titulo>¿En qué?</Titulo>
      {faltaCategoria && <Aviso tipo="atencion">Elegí en qué fue el gasto.</Aviso>}
      <div className={faltaCategoria ? 'mt-3' : ''}>
        <Chips>
          {(Object.keys(CATEGORIAS) as CategoriaGasto[]).map((clave) => (
            <Chip
              key={clave}
              activo={borrador.categoria === clave}
              icono={CATEGORIAS[clave].icono}
              onClick={() => cambiar({ categoria: clave })}
            >
              {CATEGORIAS[clave].nombre}
            </Chip>
          ))}
        </Chips>
      </div>
      <CampoTexto
        etiqueta={borrador.categoria === 'otro' ? '¿Qué fue?' : 'Nota (si querés)'}
        valor={borrador.nota}
        ejemplo={borrador.categoria === 'otro' ? 'Ej: estacionamiento' : 'Ej: tornillos para el mueble'}
        alCambiar={(nota) => cambiar({ nota })}
      />

      <Titulo>¿Cuándo?</Titulo>
      <div className="flex min-h-14 items-center justify-between gap-2.5 rounded-[14px] border border-borde bg-superficie pr-2 pl-3.5 font-bold">
        <span>{cuando(borrador.fecha)}</span>
        <CambiarFecha fecha={borrador.fecha} texto="Cambiar" chico={false} alCambiar={(f) => cambiar({ fecha: f })} />
      </div>
      <Subtitulo className="mt-1.5">
        Va en la semana del {rangoCorto(inicioDeSemana(borrador.fecha), sumarDias(inicioDeSemana(borrador.fecha), 6))}.
      </Subtitulo>

      <Titulo>¿De qué estación?</Titulo>
      <Subtitulo className="-mt-1.5 mb-2">Si querés. Si no, queda en la semana.</Subtitulo>
      <Opciones
        etiqueta="¿De qué estación?"
        valor={borrador.trabajoId ?? 'ninguna'}
        alCambiar={(clave) => {
          const trabajo = trabajos.find((t) => t.id === clave)
          cambiar({ trabajoId: trabajo?.id ?? null, lugar: trabajo ? nombreDelTrabajo(trabajo) : '' })
        }}
        opciones={[
          ...lugares.map((t) => ({ clave: t.id, texto: nombreDelTrabajo(t) })),
          { clave: 'ninguna', texto: 'Ninguna en particular' },
        ]}
      />

      {existente && (
        <div className="mt-6">
          <BotonTexto icono={Trash2} tono="peligro" onClick={quitar}>
            Quitar este gasto
          </BotonTexto>
        </div>
      )}
    </Pantalla>
  )
}
