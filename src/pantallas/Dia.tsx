import { Check, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { calcularTrabajo, diaDeLaSemana, inicioDeSemana, presenciaMia, semanaDe } from '../calculos.ts'
import { useDatos } from '../datos.tsx'
import { conY, diaYFecha, fechaConDia, horas, nuevoId, rangoDeFechas, sumarDias } from '../formato.ts'
import { volver } from '../navegacion.ts'
import { useAvisar } from '../toast.tsx'
import type { PresenciaMia, Tramo } from '../tipos.ts'
import { nombreDelTrabajo } from '../tiposDeTrabajo.ts'
import {
  Aviso,
  Boton,
  BotonTexto,
  CambiarFecha,
  CampoHora,
  Casilla,
  FaltaContestar,
  Opciones,
  Pantalla,
  Resultado,
  Subtitulo,
  Titulo,
} from '../ui.tsx'
import { EstadoGuardado } from './EstadoGuardado.tsx'
import { detalleDelDia, otrosTrabajosDelDia, QuienesFueron, textoHoras, tieneHorario } from './partesTrabajo.tsx'

/** "07:30" y "01:00" → "de 7:30 a la 1:00 de la madrugada" */
function horarioEnPalabras(desde: string, hasta: string) {
  const sinCero = (h: string) => h.replace(/^0(\d)/, '$1')
  const madrugada = hasta < desde && hasta < '06:00'
  return `de ${sinCero(desde)} a ${hasta.startsWith('01:') ? 'la' : 'las'} ${sinCero(hasta)}${madrugada ? ' de la madrugada' : ''}`
}

/**
 * Cargar o corregir un día de una estación o de una fábrica: el horario de los chicos, si fue feriado
 * y si fue él. Se guarda solo mientras escribe.
 */
export function PantallaDia({ trabajoId, tramoId, fechaNueva }: { trabajoId: string; tramoId?: string; fechaNueva?: string }) {
  const { trabajos, listo, guardarTrabajo, actualizarTrabajo } = useDatos()
  const avisar = useAvisar()
  // Un día nuevo recién se guarda cuando escribe algo: así no quedan días vacíos si vuelve sin cargar.
  const [id] = useState(() => tramoId ?? nuevoId())
  const trabajo = trabajos.find((t) => t.id === trabajoId)

  if (!trabajo) {
    return (
      <Pantalla titulo={listo ? 'No se encontró' : 'Cargando…'} volver="Volver">
        <Subtitulo className="mt-2">{listo ? 'Este trabajo ya no existe. Puede que lo hayas borrado.' : 'Trayendo los datos de la nube.'}</Subtitulo>
      </Pantalla>
    )
  }

  const nombre = nombreDelTrabajo(trabajo)
  const guardado = trabajo.tramos.find((t) => t.id === id)
  if (!guardado && !fechaNueva) {
    return (
      <Pantalla titulo="Este día ya no está" volver={nombre}>
        <Subtitulo className="mt-2">Puede que lo hayas quitado.</Subtitulo>
      </Pantalla>
    )
  }

  const esEstacion = trabajo.tipo === 'estacion'
  const tramo: Tramo = guardado ?? {
    id,
    fecha: fechaNueva!,
    desde: '',
    hasta: '',
    feriado: false,
    // En una estación arranca sin contestar "¿Y vos fuiste?".
    ...(esEstacion ? { yo: null } : {}),
  }
  const conTramo = { ...trabajo, tramos: guardado ? trabajo.tramos : [...trabajo.tramos, tramo] }
  const resultado = calcularTrabajo(conTramo, trabajos)
  const dia = resultado.dias.find((d) => d.tramo.id === id)!
  const conEmpleados = trabajo.empleadoIds.length > 0

  const cambiar = (cambios: Partial<Tramo>) => {
    const nuevo = { ...tramo, ...cambios }
    guardarTrabajo({
      ...trabajo,
      tramos: guardado ? trabajo.tramos.map((t) => (t.id === id ? nuevo : t)) : [...trabajo.tramos, nuevo],
    })
  }

  const semana = inicioDeSemana(tramo.fecha)
  const otraSemana = trabajo.tramos.some((t) => t.id !== id) && semana !== semanaDe(trabajo)
  const otros = otrosTrabajosDelDia(trabajo, trabajos, tramo.fecha)
  const pasaMedianoche = tieneHorario(tramo) && tramo.hasta < tramo.desde
  const deSemana = diaDeLaSemana(tramo.fecha) >= 1 && diaDeLaSemana(tramo.fecha) <= 5
  const presencia: PresenciaMia | null = tramo.yo === null ? null : presenciaMia(trabajo, tramo)

  const listoDia = () => {
    if (tieneHorario(tramo)) {
      const falta = esEstacion && tramo.yo === null ? '. Falta contestar si fuiste' : ''
      avisar({ texto: `${diaYFecha(tramo.fecha)} cargado en ${nombre}${falta}`.replace(/^./, (c) => c.toUpperCase()) })
    }
    volver()
  }

  const quitar = () => {
    actualizarTrabajo(trabajo.id, (t) => ({ ...t, tramos: t.tramos.filter((x) => x.id !== id) }))
    volver()
    avisar({
      texto: `Se quitó el ${diaYFecha(tramo.fecha)}`,
      deshacer: () => actualizarTrabajo(trabajo.id, (t) => ({ ...t, tramos: [...t.tramos, tramo] })),
    })
  }

  return (
    <Pantalla
      volver={nombre}
      titulo={fechaConDia(tramo.fecha)}
      subtitulo={`${guardado && tieneHorario(guardado) ? 'Corrigiendo · ' : ''}Semana ${rangoDeFechas(semana, sumarDias(semana, 6))}`}
      barra={
        <>
          <Boton icono={Check} onClick={listoDia}>
            Listo
          </Boton>
          <EstadoGuardado enBarra />
        </>
      }
    >
      <div className="mt-2">
        <CambiarFecha fecha={tramo.fecha} alCambiar={(fecha) => cambiar({ fecha })} />
      </div>
      {otraSemana && (
        <Aviso tipo="atencion">
          Este día es de otra semana que el resto de {nombre}. Para que la cuenta de cada semana dé bien, conviene cargarlo
          con “Seguir esta semana”, desde Hoy.
        </Aviso>
      )}

      {trabajo.tipo === 'fabrica' && (
        <>
          <Titulo>¿Quiénes fueron?</Titulo>
          <QuienesFueron
            empleados={trabajo.valores.empleados}
            ids={trabajo.empleadoIds}
            alCambiar={(empleadoIds) => guardarTrabajo({ ...trabajo, empleadoIds })}
          />
        </>
      )}

      <CampoHora etiqueta="¿A qué hora entraron los chicos?" valor={tramo.desde} alCambiar={(desde) => cambiar({ desde })} />
      <CampoHora etiqueta="¿A qué hora salieron?" valor={tramo.hasta} alCambiar={(hasta) => cambiar({ hasta })} />
      {dia.minutos > 0 && <Resultado>{detalleDelDia(dia, conEmpleados)}</Resultado>}

      {dia.minutos > 18 * 60 ? (
        <Aviso tipo="atencion">
          Son {horas(dia.minutos)} horas: {horarioEnPalabras(tramo.desde, tramo.hasta)}. ¿Está bien?
        </Aviso>
      ) : (
        pasaMedianoche && (
          <Aviso tipo="atencion">
            Terminaron pasada la medianoche ({horarioEnPalabras(tramo.desde, tramo.hasta)}): cuenta para el{' '}
            {diaYFecha(tramo.fecha)}.
          </Aviso>
        )
      )}
      {otros.length > 0 && (
        <Aviso>
          Ese día también estuvieron en <b>{conY(otros)}</b>. Las 9 horas simples se cuentan sumando todo el día.
        </Aviso>
      )}
      {trabajo.tipo === 'fabrica' && (
        <Aviso>Si trabajan menos de 9 horas en fábrica, se cobra igual el día completo.</Aviso>
      )}

      {deSemana && conEmpleados && (
        <Casilla
          marcada={tramo.feriado}
          alCambiar={(feriado) => cambiar({ feriado })}
          titulo="Fue feriado para los chicos"
          aclaracion={esEstacion ? 'Sus horas van todas al 1,5. Las tuyas no cambian.' : 'Sus horas van todas al 1,5.'}
        />
      )}

      {esEstacion && (
        <>
          <Titulo>¿Y vos fuiste?</Titulo>
          {presencia === null && <FaltaContestar />}
          <Opciones
            etiqueta="¿Y vos fuiste?"
            valor={presencia}
            alCambiar={(yo) => cambiar({ yo })}
            opciones={[
              { clave: 'no', texto: 'No fui' },
              { clave: 'todo', texto: 'Todo el día' },
              {
                clave: 'parte',
                texto: 'Un rato',
                aclaracion: presencia === 'parte' ? undefined : 'te pregunta a qué hora',
                adentro: (
                  <>
                    <div className="-mt-3 grid grid-cols-2 gap-2.5">
                      <CampoHora
                        etiqueta="Llegaste"
                        tamaño="mediano"
                        valor={tramo.yoDesde ?? ''}
                        alCambiar={(yoDesde) => cambiar({ yoDesde })}
                      />
                      <CampoHora
                        etiqueta="Te fuiste"
                        tamaño="mediano"
                        valor={tramo.yoHasta ?? ''}
                        alCambiar={(yoHasta) => cambiar({ yoHasta })}
                      />
                    </div>
                    <p
                      className={`mt-2 text-base ${dia.minutosMios > 0 ? 'text-texto-suave' : 'font-semibold text-aviso-texto'}`}
                    >
                      {dia.minutosMios > 0 ? `Estuviste ${textoHoras(dia.minutosMios)}` : 'Cargá a qué hora llegaste y te fuiste'}
                    </p>
                  </>
                ),
              },
            ]}
          />
        </>
      )}

      {guardado && (
        <div className="mt-6">
          <BotonTexto icono={Trash2} tono="peligro" onClick={quitar}>
            Quitar este día
          </BotonTexto>
        </div>
      )}
    </Pantalla>
  )
}
