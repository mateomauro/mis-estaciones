import { CalendarRange, Check, Plus, Receipt, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { inicioDeSemana, resumirSemana } from '../calculos.ts'
import { useDatos } from '../datos.tsx'
import { fechaCorta, hoy, nombreDia, nuevoId, plata, rangoDeFechas, sumarDias } from '../formato.ts'
import { CATEGORIAS, nombreDelGasto } from '../gastos.ts'
import { ir, volver } from '../navegacion.ts'
import type { Gasto } from '../tipos.ts'
import { nombreCliente } from '../tiposDeTrabajo.ts'
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
  const { gastos, fallanGastos, guardarGasto, borrarGasto } = useDatos()
  const [borrador, setBorrador] = useState<Gasto>(
    () =>
      existente ?? {
        id: nuevoId(),
        fecha: fecha ?? hoy(),
        monto: 0,
        categoria: 'otro',
        nota: '',
        trabajoId: null,
        lugar: '',
        creado: new Date().toISOString(),
      },
  )

  const cambiar = (cambios: Partial<Gasto>) => {
    const nuevo = { ...borrador, ...cambios }
    setBorrador(nuevo)
    if (nuevo.monto > 0) guardarGasto(nuevo)
    // Sin monto no hay gasto: si ya estaba guardado, se quita.
    else if (gastos.some((g) => g.id === nuevo.id)) borrarGasto(nuevo.id)
  }

  const semana = inicioDeSemana(borrador.fecha)
  // Los primeros gastos se anotaban eligiendo con botones: se ve en qué fue y la nota aparte.
  const conBoton = borrador.categoria !== 'otro'

  const quitar = () => {
    if (!confirm(`¿Quitar el gasto de ${plata(borrador.monto)}?`)) return
    borrarGasto(borrador.id)
    volver()
  }

  return (
    <Pantalla titulo={existente ? 'Corregir el gasto' : 'Anotar un gasto'} etiqueta={{ icono: Receipt, texto: 'Gasto en efectivo' }} volver>
      {fallanGastos && <AvisoSinGastos />}
      <Tarjeta>
        <CampoPlata etiqueta="¿Cuánto gastaste?" valor={borrador.monto} alCambiar={(monto) => cambiar({ monto })} />
        {conBoton && <p className="text-base">En qué: {nombreDelGasto(borrador)}</p>}
        <CampoTexto
          etiqueta={conBoton ? 'Nota (si querés)' : '¿Qué fue?'}
          valor={borrador.nota}
          ejemplo="Ej: nafta, almuerzo, Luciano"
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
      </Tarjeta>

      <Boton icono={Check} onClick={volver}>
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
