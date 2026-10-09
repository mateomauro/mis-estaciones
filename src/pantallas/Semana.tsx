import { Download, FileLock2, RefreshCw, Send } from 'lucide-react'
import { useState } from 'react'
import { inicioDeSemana, resumirSemana } from '../calculos.ts'
import { useDatos } from '../datos.tsx'
import { hoy, plata, rangoCorto, sumarDias } from '../formato.ts'
import { nombreDelGasto } from '../gastos.ts'
import { ir, reemplazar } from '../navegacion.ts'
import type { TipoPlanilla } from '../planilla.ts'
import { nombreCliente, nombreDelTrabajo, nombreTitular, TIPOS } from '../tiposDeTrabajo.ts'
import { Aviso, Boton, BotonTexto, Fila, Lista, Pantalla, Plegado, Renglon, Semanero, Subtitulo, Titulo } from '../ui.tsx'
import { LibroCuentas } from './cuentas.tsx'

// Compartir archivos solo anda en celulares y con la app publicada (https).
const puedeCompartir = (() => {
  try {
    return navigator.canShare?.({ files: [new File([''], 'planilla.pdf', { type: 'application/pdf' })] }) ?? false
  } catch {
    return false
  }
})()

/** "Esta semana", "Semana pasada" o nada, para el subtítulo de las semanas. */
export function nombreDeSemana(inicio: string) {
  const esta = inicioDeSemana(hoy())
  if (inicio === esta) return 'Esta semana'
  if (inicio === sumarDias(esta, -7)) return 'Semana pasada'
  return inicio > esta ? 'Semana que viene' : null
}

/** Flechas para ir de semana en semana sin llenar el "atrás" del celular. */
export function flechasDeSemana(inicio: string, ruta: string) {
  const esta = inicioDeSemana(hoy())
  return {
    anterior: () => reemplazar(`${ruta}/${sumarDias(inicio, -7)}`),
    siguiente: inicio < esta ? () => reemplazar(`${ruta}/${sumarDias(inicio, 7)}`) : undefined,
  }
}

export function PantallaSemana({ inicio = inicioDeSemana(hoy()) }: { inicio?: string }) {
  const { trabajos, gastos, valores, listo, actualizarValoresDeSemana } = useDatos()
  const [generando, setGenerando] = useState<TipoPlanilla | null>(null)
  const semana = resumirSemana(inicio, trabajos, valores.iva, gastos)
  const cliente = nombreCliente(valores)
  const cantidad = `${semana.cobros.length} ${semana.cobros.length === 1 ? 'trabajo' : 'trabajos'}`
  const cabecera = (
    <Semanero
      titulo={rangoCorto(semana.inicio, semana.fin)}
      subtitulo={[nombreDeSemana(inicio), cantidad].filter(Boolean).join(' · ')}
      {...flechasDeSemana(inicio, '/semana')}
    />
  )

  if (semana.cobros.length === 0 && semana.gastos.length === 0) {
    return (
      <Pantalla cabecera={cabecera} solapa="semana">
        <Subtitulo className="mt-6 text-center">{listo ? 'No hay nada cargado en esta semana.' : 'Cargando…'}</Subtitulo>
      </Pantalla>
    )
  }

  const planilla = async (tipo: TipoPlanilla, compartir = false) => {
    setGenerando(tipo)
    try {
      // La librería del PDF es pesada: se carga recién cuando hace falta.
      const pdf = await import('../planilla.ts')
      const datos = { titular: nombreTitular(valores), cliente }
      if (compartir) await pdf.compartirPlanilla(tipo, semana, datos)
      else pdf.descargarPlanilla(tipo, semana, datos)
    } catch (error) {
      // Cerrar el menú de compartir sin elegir nada no es un error.
      if (!(error instanceof DOMException && error.name === 'AbortError')) alert('No se pudo armar el PDF. Probá de nuevo.')
    } finally {
      setGenerando(null)
    }
  }

  const actualizar = () => {
    if (!confirm('¿Usar los valores y precios de hoy en todos los trabajos de esta semana?')) return
    actualizarValoresDeSemana(inicio)
  }

  const faltanValores = semana.pagos.filter((p) => p.faltaValor)
  const categorias = [...new Set(semana.gastos.map((g) => nombreDelGasto(g).toLowerCase()))]

  return (
    <Pantalla cabecera={cabecera} solapa="semana">
      <Titulo>Cuentas de la semana</Titulo>
      <LibroCuentas totales={semana} cliente={cliente} />
      <Plegado titulo="¿De dónde sale lo que te queda?">
        <Fila etiqueta="Tu parte" valor={plata(semana.tuParte)} detalle="Tu proporcional, tus horas y los viajes a medir." />
        {semana.plus > 0 && <Fila etiqueta="Plus" valor={plata(semana.plus)} />}
        <Fila
          etiqueta="Pulmón de los empleados"
          valor={plata(semana.diferenciaEmpleados)}
          detalle={`Lo que cobrás a ${cliente} por ellos menos lo que les pagás. Para aguinaldos y vacaciones.`}
        />
        {semana.descuentos > 0 && <Fila etiqueta="Descuentos" valor={`− ${plata(semana.descuentos)}`} />}
        <Fila etiqueta="Te queda" valor={plata(semana.ganancia)} fuerte />
      </Plegado>

      {semana.cobros.length > 0 && (
        <div className="mt-4">
          {puedeCompartir ? (
            <>
              <Boton icono={Send} onClick={() => planilla('cliente', true)} deshabilitado={generando !== null}>
                {generando === 'cliente' ? 'Armando la planilla…' : 'Mandar planilla a Soledad'}
              </Boton>
              <BotonTexto icono={Download} onClick={() => planilla('cliente')}>
                Guardar el PDF en el celu
              </BotonTexto>
            </>
          ) : (
            <Boton icono={Download} onClick={() => planilla('cliente')} deshabilitado={generando !== null}>
              {generando === 'cliente' ? 'Armando la planilla…' : 'Descargar planilla para Soledad'}
            </Boton>
          )}
        </div>
      )}

      <Titulo>Trabajos</Titulo>
      <Lista>
        {semana.cobros.map(({ trabajo, resultado }) => (
          <Renglon
            key={trabajo.id}
            titulo={nombreDelTrabajo(trabajo)}
            detalle={TIPOS[trabajo.tipo].nombre}
            valor={plata(resultado.total)}
            onClick={() => ir(`/trabajo/${trabajo.id}`)}
          />
        ))}
        {semana.gastos.length > 0 && (
          <Renglon
            titulo="Gastos"
            detalle={`${semana.gastos.length} ${semana.gastos.length === 1 ? 'gasto' : 'gastos'} · ${categorias.join(', ')}`}
            valor={plata(semana.totalGastos)}
            onClick={() => ir(`/gastos/${inicio}`)}
          />
        )}
      </Lista>

      {semana.pagos.length > 0 && (
        <>
          <Titulo>Pago a empleados</Titulo>
          {faltanValores.length > 0 && (
            <Aviso tipo="atencion">
              Falta cargar cuánto le pagás por día a {faltanValores.map((p) => p.nombre).join(', ')}. Cargalo en Valores y
              después tocá “Usar los valores de hoy”, acá abajo.
            </Aviso>
          )}
          <div className={faltanValores.length > 0 ? 'mt-3' : ''}>
            <Lista>
              {semana.pagos.map((pago) => (
                <Renglon key={pago.empleadoId} titulo={pago.nombre} valor={plata(pago.total)} />
              ))}
            </Lista>
          </div>
          <div className="mt-3">
            <Boton variante="secundario" icono={FileLock2} onClick={() => planilla('pagos')} deshabilitado={generando !== null}>
              {generando === 'pagos' ? 'Armando…' : 'Ver las cuentas de pagos'}
            </Boton>
          </div>
          <Subtitulo className="mt-1.5">Es solo para vos: no se le manda a {cliente}.</Subtitulo>
        </>
      )}

      {semana.cobros.length > 0 && (
        <Aviso icono={RefreshCw}>
          ¿Cambiaste precios después de cargar esta semana?
          <div className="-mb-2">
            <BotonTexto onClick={actualizar}>Usar los valores de hoy</BotonTexto>
          </div>
        </Aviso>
      )}
    </Pantalla>
  )
}
