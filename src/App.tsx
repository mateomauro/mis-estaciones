import { useEffect, useLayoutEffect, useState } from 'react'
import { DatosProvider } from './datos.tsx'
import { guardarPosicion, restaurarPosicion, rutaActual } from './navegacion.ts'
import { Inicio } from './pantallas/Inicio.tsx'
import { PantallaSemana } from './pantallas/Semana.tsx'
import { PantallaTrabajo } from './pantallas/Trabajo.tsx'
import { PantallaValores } from './pantallas/Valores.tsx'

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

function Pantallas() {
  const ruta = useRuta()
  // "/estacion/" es la dirección de la primera versión.
  const trabajo = /^\/(?:trabajo|estacion)\/(.+)$/.exec(ruta)
  if (trabajo) return <PantallaTrabajo id={trabajo[1]} />
  const semana = /^\/semana\/(\d{4}-\d{2}-\d{2})$/.exec(ruta)
  if (semana) return <PantallaSemana inicio={semana[1]} />
  if (ruta === '/valores') return <PantallaValores />
  return <Inicio />
}

export default function App() {
  return (
    <DatosProvider>
      <Pantallas />
    </DatosProvider>
  )
}
