import { ArrowRight, Check, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { calcularTrabajo, inicioDeSemana, semanaDe } from '../calculos.ts'
import { useDatos } from '../datos.tsx'
import { conY, fechaConDia, fechaCorta, horas, hoy, nombreDia, nuevoId, plata, rangoDeFechas, sumarDias } from '../formato.ts'
import { ir, reemplazar, volver } from '../navegacion.ts'
import { useAvisar } from '../toast.tsx'
import type { Trabajo, Tramo } from '../tipos.ts'
import { nombreCliente, nombreDelTrabajo, TIPOS } from '../tiposDeTrabajo.ts'
import {
  Aviso,
  Boton,
  BotonTexto,
  CambiarFecha,
  CampoHora,
  CampoTexto,
  Lista,
  Opciones,
  Pantalla,
  Plegado,
  Renglon,
  Resultado,
  Subtitulo,
  Titulo,
} from '../ui.tsx'
import { EstadoGuardado } from './EstadoGuardado.tsx'
import {
  CuentasDelTrabajo,
  Descuentos,
  diaParaCargar,
  QuienesFueron,
  textoHoras,
  textoPresencia,
  tieneHorario,
} from './partesTrabajo.tsx'

type Fin = 'no' | 'terminada' | 'reparacion'

/** Lo que dice "¿Terminaron acá?". Lo cargado antes de la pregunta se toma por el plus. */
function finDe(t: Trabajo): Fin {
  const cerrada = t.cerrada ?? t.conPlus
  if (!cerrada) return 'no'
  return t.conPlus ? 'terminada' : 'reparacion'
}

function useBorrar(trabajo: Trabajo, que: string) {
  const { borrarTrabajo, recuperarTrabajo } = useDatos()
  const avisar = useAvisar()
  return () => {
    const nombre = nombreDelTrabajo(trabajo)
    if (!confirm(`¿Borrar ${que} “${nombre}” con todos sus días?`)) return
    borrarTrabajo(trabajo.id)
    volver()
    avisar({
      texto: `Se borró ${nombre}`,
      deshacer: () => recuperarTrabajo({ ...trabajo, borradoEl: new Date().toISOString() }),
    })
  }
}

function useUsarValoresDeHoy(trabajo: Trabajo) {
  const { valores, guardarTrabajo } = useDatos()
  return () => {
    if (!confirm('¿Usar los valores y precios de hoy en este trabajo?')) return
    guardarTrabajo({ ...trabajo, valores: structuredClone(valores) })
  }
}

// ——— Estación y fábrica ———

function PantallaEstacion({ trabajo }: { trabajo: Trabajo }) {
  const { trabajos, guardarTrabajo } = useDatos()
  const usarValoresDeHoy = useUsarValoresDeHoy(trabajo)
  const esEstacion = trabajo.tipo === 'estacion'
  const borrar = useBorrar(trabajo, esEstacion ? 'la estación' : 'la fábrica')
  const resultado = calcularTrabajo(trabajo, trabajos)
  const cambiar = (cambios: Partial<Trabajo>) => guardarTrabajo({ ...trabajo, ...cambios })
  const cliente = nombreCliente(trabajo.valores)
  const semana = semanaDe(trabajo)
  const fueron = trabajo.valores.empleados.filter((e) => trabajo.empleadoIds.includes(e.id)).map((e) => e.nombre)
  const conExtras = resultado.empleados.length > 0
  const fin = finDe(trabajo)

  return (
    <Pantalla
      volver="Volver"
      titulo={nombreDelTrabajo(trabajo)}
      subtitulo={`${esEstacion ? '' : 'Fábrica · '}Semana ${rangoDeFechas(semana, sumarDias(semana, 6))} · ${
        fueron.length > 0 ? `fueron ${conY(fueron)}` : 'sin empleados'
      }`}
      solapa="ninguna"
    >
      <Titulo>Días</Titulo>
      {resultado.dias.length === 0 ? (
        <Subtitulo>Todavía no cargaste ningún día.</Subtitulo>
      ) : (
        <Lista>
          {resultado.dias.map((dia) => {
            const { tramo } = dia
            const titulo = `${nombreDia(tramo.fecha)} ${fechaCorta(tramo.fecha)}`
            const abrir = () => ir(`/trabajo/${trabajo.id}/dia/${tramo.id}`)
            if (!tieneHorario(tramo)) {
              return <Renglon key={tramo.id} titulo={titulo} detalle="Falta cargar el horario" falta accion="Cargar" onClick={abrir} />
            }
            const yo = textoPresencia(trabajo, dia)
            const partes = [`${tramo.desde} a ${tramo.hasta}`, `${horas(dia.minutos)} h`]
            if (dia.tipo === 'feriado') partes.push('feriado')
            if (yo) partes.push(yo)
            return (
              <Renglon
                key={tramo.id}
                titulo={titulo}
                detalle={<span className="tabular-nums">{partes.join(' · ')}</span>}
                falta={tramo.yo === null && esEstacion}
                onClick={abrir}
              />
            )
          })}
        </Lista>
      )}
      <div className="mt-3">
        <Boton variante="secundario" icono={Plus} onClick={() => ir(`/trabajo/${trabajo.id}/nuevo-dia/${diaParaCargar(trabajo)}`)}>
          Cargar otro día
        </Boton>
      </div>
      {new Set(trabajo.tramos.map((t) => inicioDeSemana(t.fecha))).size > 1 && (
        <Aviso tipo="atencion">
          Hay días de dos semanas distintas. Conviene cargar cada semana aparte (con “Seguir esta semana”, desde Hoy), así
          la cuenta de cada semana da bien.
        </Aviso>
      )}

      <Titulo>Cobro a {cliente}</Titulo>
      <Plegado titulo="Total sin IVA" derecha={plata(resultado.total)}>
        <CuentasDelTrabajo trabajo={trabajo} resultado={resultado} alUsarValoresDeHoy={usarValoresDeHoy} />
      </Plegado>
      <Subtitulo className="mt-1.5">Tocá para ver las cuentas de cada uno.</Subtitulo>
      {!conExtras && fueron.length === 0 && trabajo.tipo === 'fabrica' && (
        <Aviso tipo="atencion">Marcá quiénes fueron en “Datos de la fábrica”.</Aviso>
      )}

      {esEstacion && (
        <>
          <Titulo>¿Terminaron acá?</Titulo>
          <Opciones<Fin>
            etiqueta="¿Terminaron acá?"
            valor={fin}
            alCambiar={(nuevo) => cambiar({ cerrada: nuevo !== 'no', conPlus: nuevo === 'terminada' })}
            opciones={[
              { clave: 'no', texto: 'Todavía no' },
              { clave: 'terminada', texto: 'Sí, terminada', aclaracion: `suma el plus de ${plata(trabajo.valores.plus)}` },
              { clave: 'reparacion', texto: 'Sí, era una reparación', aclaracion: 'sin plus' },
            ]}
          />
        </>
      )}

      <div className="mt-4">
        <Plegado titulo="Descuentos" derecha={resultado.descuentos > 0 ? `− ${plata(resultado.descuentos)}` : undefined}>
          <Descuentos descuentos={trabajo.descuentos} alCambiar={(descuentos) => cambiar({ descuentos })} />
        </Plegado>
        <Plegado titulo={esEstacion ? 'Datos de la estación' : 'Datos de la fábrica'}>
          <CampoTexto
            etiqueta={TIPOS[trabajo.tipo].campoNombre}
            valor={trabajo.nombre}
            ejemplo={TIPOS[trabajo.tipo].ejemplo}
            alCambiar={(nombre) => cambiar({ nombre })}
          />
          <p className="mt-[18px] mb-1.5 text-[1.08rem] font-bold">¿Quiénes fueron?</p>
          <QuienesFueron
            empleados={trabajo.valores.empleados}
            ids={trabajo.empleadoIds}
            alCambiar={(empleadoIds) => cambiar({ empleadoIds })}
          />
        </Plegado>
      </div>

      <div className="mt-3">
        <BotonTexto icono={Trash2} tono="suave" onClick={borrar}>
          {esEstacion ? 'Borrar esta estación' : 'Borrar esta fábrica'}
        </BotonTexto>
      </div>
    </Pantalla>
  )
}

// ——— Viaje a medir ———

function PantallaViaje({ trabajo }: { trabajo: Trabajo }) {
  const { trabajos, guardarTrabajo } = useDatos()
  const avisar = useAvisar()
  const usarValoresDeHoy = useUsarValoresDeHoy(trabajo)
  const borrar = useBorrar(trabajo, 'el viaje a medir')
  const resultado = calcularTrabajo(trabajo, trabajos)
  const cambiar = (cambios: Partial<Trabajo>) => guardarTrabajo({ ...trabajo, ...cambios })
  const cambiarTramo = (id: string, cambios: Partial<Tramo>) =>
    cambiar({ tramos: trabajo.tramos.map((t) => (t.id === id ? { ...t, ...cambios } : t)) })
  const horaMia = trabajo.valores.horaMia
  const varios = resultado.dias.length > 1

  const otroDia = () => {
    const ultimo = resultado.dias.at(-1)?.tramo.fecha
    const fecha = ultimo ? sumarDias(ultimo, 1) : hoy()
    cambiar({ tramos: [...trabajo.tramos, { id: nuevoId(), fecha, desde: '', hasta: '', feriado: false }] })
  }

  const listo = () => {
    if (resultado.totalMinutos > 0) avisar({ texto: `Viaje a medir cargado: ${plata(resultado.total)}` })
    volver()
  }

  return (
    <Pantalla
      volver="Volver"
      titulo="Viaje a medir"
      subtitulo={varios ? undefined : resultado.dias[0] && fechaConDia(resultado.dias[0].tramo.fecha)}
      barra={
        <>
          <Boton icono={Check} onClick={listo}>
            Listo
          </Boton>
          <EstadoGuardado enBarra />
        </>
      }
    >
      {!varios && resultado.dias[0] && (
        <div className="mt-2">
          <CambiarFecha fecha={resultado.dias[0].tramo.fecha} alCambiar={(fecha) => cambiarTramo(resultado.dias[0].tramo.id, { fecha })} />
        </div>
      )}
      <CampoTexto
        etiqueta="¿A qué estación fuiste?"
        valor={trabajo.nombre}
        ejemplo={TIPOS.medicion.ejemplo}
        alCambiar={(nombre) => cambiar({ nombre })}
      />

      {resultado.dias.map((dia) => (
        <section key={dia.tramo.id} className={varios ? 'mt-6 border-t border-borde pt-1' : ''}>
          {varios && (
            <>
              <Titulo>{fechaConDia(dia.tramo.fecha)}</Titulo>
              <CambiarFecha fecha={dia.tramo.fecha} alCambiar={(fecha) => cambiarTramo(dia.tramo.id, { fecha })} />
            </>
          )}
          <CampoHora
            etiqueta="¿A qué hora saliste?"
            valor={dia.tramo.desde}
            alCambiar={(desde) => cambiarTramo(dia.tramo.id, { desde })}
          />
          <CampoHora
            etiqueta="¿A qué hora volviste?"
            valor={dia.tramo.hasta}
            alCambiar={(hasta) => cambiarTramo(dia.tramo.id, { hasta })}
          />
          {dia.minutos > 0 && (
            <Resultado>
              {textoHoras(dia.minutos)} × tu hora = {plata(Math.round((dia.minutos / 60) * horaMia))}
            </Resultado>
          )}
          {varios && (
            <BotonTexto
              icono={Trash2}
              tono="peligro"
              onClick={() => cambiar({ tramos: trabajo.tramos.filter((t) => t.id !== dia.tramo.id) })}
            >
              Quitar este día
            </BotonTexto>
          )}
        </section>
      ))}

      <div className="mt-3">
        <BotonTexto icono={Plus} onClick={otroDia}>
          Otro día de este viaje
        </BotonTexto>
      </div>

      <Titulo>Cobro a {nombreCliente(trabajo.valores)}</Titulo>
      <Plegado titulo="Total sin IVA" derecha={plata(resultado.total)}>
        <CuentasDelTrabajo trabajo={trabajo} resultado={resultado} alUsarValoresDeHoy={usarValoresDeHoy} />
      </Plegado>

      <div className="mt-3">
        <BotonTexto icono={Trash2} tono="suave" onClick={borrar}>
          Borrar este viaje
        </BotonTexto>
      </div>
    </Pantalla>
  )
}

export function PantallaTrabajo({ id }: { id: string }) {
  const { trabajos, listo } = useDatos()
  const trabajo = trabajos.find((t) => t.id === id)

  if (!trabajo) {
    return (
      <Pantalla titulo={listo ? 'No se encontró' : 'Cargando…'} volver="Volver">
        <Subtitulo className="mt-2">
          {listo ? 'Este trabajo ya no existe. Puede que lo hayas borrado.' : 'Trayendo los datos de la nube.'}
        </Subtitulo>
      </Pantalla>
    )
  }
  return trabajo.tipo === 'medicion' ? <PantallaViaje trabajo={trabajo} /> : <PantallaEstacion trabajo={trabajo} />
}

// ——— Empezar una estación ———

export function PantallaNuevaEstacion() {
  const { valores, crearTrabajo } = useDatos()
  const [nombre, setNombre] = useState('')
  const [ids, setIds] = useState(() => valores.empleados.map((e) => e.id))
  const [falta, setFalta] = useState(false)

  const seguir = () => {
    if (!nombre.trim()) {
      setFalta(true)
      return
    }
    const id = crearTrabajo('estacion', { nombre: nombre.trim(), empleadoIds: ids })
    // Al volver del primer día queda en la estación, no en esta pantalla.
    reemplazar(`/trabajo/${id}`)
    ir(`/trabajo/${id}/nuevo-dia/${hoy()}`)
  }

  return (
    <Pantalla
      volver="Hoy"
      titulo="Estación nueva"
      barra={
        <Boton icono={ArrowRight} onClick={seguir}>
          Seguir: cargar el primer día
        </Boton>
      }
    >
      <CampoTexto
        etiqueta="¿Cómo se llama?"
        valor={nombre}
        ejemplo={TIPOS.estacion.ejemplo}
        enfocar
        alCambiar={(texto) => {
          setNombre(texto)
          setFalta(false)
        }}
      />
      {falta && <Aviso tipo="atencion">Escribí cómo se llama la estación.</Aviso>}
      <Titulo>¿Quiénes fueron?</Titulo>
      <QuienesFueron empleados={valores.empleados} ids={ids} alCambiar={setIds} />
      <Subtitulo className="mt-2">Tocá para sacar o poner a alguien.</Subtitulo>
    </Pantalla>
  )
}
