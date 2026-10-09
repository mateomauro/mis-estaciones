import { useEffect, useLayoutEffect, useState } from 'react'
import { guardarClave, leerClave } from './clave.ts'
import { DatosProvider } from './datos.tsx'
import { guardarPosicion, restaurarPosicion, rutaActual } from './navegacion.ts'
import { db } from './nube/firebase.ts'
import { PantallaAumento } from './pantallas/Aumento.tsx'
import { PantallaAyuda } from './pantallas/Ayuda.tsx'
import { PantallaBorrados, PantallaCopias, PantallaOtroAparato } from './pantallas/Copias.tsx'
import { PantallaDia } from './pantallas/Dia.tsx'
import { PantallaGasto, PantallaGastos } from './pantallas/Gastos.tsx'
import { PantallaHistorial } from './pantallas/Historial.tsx'
import { PantallaHoy } from './pantallas/Hoy.tsx'
import { PantallaSemana } from './pantallas/Semana.tsx'
import { PantallaSinClave } from './pantallas/SinClave.tsx'
import { PantallaNuevaEstacion, PantallaTrabajo } from './pantallas/Trabajo.tsx'
import { PantallaValores } from './pantallas/Valores.tsx'
import { AvisosProvider } from './toast.tsx'

function useRuta() {
  const [ruta, setRuta] = useState(rutaActual)
  useEffect(() => {
    const alCambiar = (e: HashChangeEvent) => {
      guardarPosicion(new URL(e.oldURL).hash.replace(/^#/, '') || '/')
      setRuta(rutaActual())
    }
    window.addEventListener('hashchange', alCambiar)
    return () => window.removeEventListener('hashchange', alCambiar)
  }, [])
  useLayoutEffect(() => restaurarPosicion(ruta), [ruta])
  return ruta
}

const FECHA = '(\\d{4}-\\d{2}-\\d{2})'

function Pantallas() {
  const ruta = useRuta()
  const es = (patron: string) => new RegExp(`^${patron}$`).exec(ruta)
  let m: RegExpExecArray | null

  if ((m = es(`/trabajo/([^/]+)/dia/([^/]+)`))) return <PantallaDia key={ruta} trabajoId={m[1]} tramoId={m[2]} />
  if ((m = es(`/trabajo/([^/]+)/nuevo-dia/${FECHA}`))) return <PantallaDia key={ruta} trabajoId={m[1]} fechaNueva={m[2]} />
  // "/estacion/" es la dirección de la primera versión.
  if ((m = es('/(?:trabajo|estacion)/([^/]+)'))) return <PantallaTrabajo id={m[1]} />
  if (ruta === '/nueva-estacion') return <PantallaNuevaEstacion />
  if (ruta === '/semana') return <PantallaSemana />
  if ((m = es(`/semana/${FECHA}`))) return <PantallaSemana inicio={m[1]} />
  if (ruta === '/gastos') return <PantallaGastos />
  if ((m = es(`/gastos/${FECHA}`))) return <PantallaGastos inicio={m[1]} />
  if ((m = es(`/gasto/nuevo/${FECHA}`))) return <PantallaGasto key={ruta} fecha={m[1]} />
  if ((m = es('/gasto/([^/]+)'))) return <PantallaGasto key={ruta} id={m[1]} />
  if (ruta === '/historial') return <PantallaHistorial />
  if (ruta === '/valores') return <PantallaValores />
  if (ruta === '/aumento') return <PantallaAumento />
  if (ruta === '/opciones/aparato') return <PantallaOtroAparato />
  if (ruta === '/opciones/copias') return <PantallaCopias />
  if (ruta === '/opciones/borrados') return <PantallaBorrados />
  if (ruta === '/ayuda') return <PantallaAyuda />
  return <PantallaHoy />
}

export default function App() {
  const [clave, setClave] = useState(leerClave)

  // Con la nube, los datos están bajo la clave del link: sin ella no hay nada que mostrar.
  if (db && !clave) {
    return (
      <PantallaSinClave
        alEntrar={(nueva) => {
          guardarClave(nueva)
          setClave(nueva)
        }}
      />
    )
  }

  return (
    <DatosProvider clave={clave}>
      <AvisosProvider>
        <Pantallas />
      </AvisosProvider>
    </DatosProvider>
  )
}
