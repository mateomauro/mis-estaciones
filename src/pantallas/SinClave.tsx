import { KeyRound } from 'lucide-react'
import { useState } from 'react'
import { extraerClave } from '../clave.ts'
import { Boton, CampoTexto, Pantalla, Tarjeta } from '../ui.tsx'

/** Se ve solo si se abre la app sin el link (por ejemplo, desde otro aparato por primera vez). */
export function PantallaSinClave({ alEntrar }: { alEntrar: (clave: string) => void }) {
  const [texto, setTexto] = useState('')
  const [error, setError] = useState(false)

  const entrar = () => {
    const clave = extraerClave(texto)
    if (clave) alEntrar(clave)
    else setError(true)
  }

  return (
    <Pantalla titulo="Mis estaciones">
      <Tarjeta titulo="Abrí la app con tu link" icono={KeyRound}>
        <p className="text-base">
          Para ver tus datos, abrí el link que te mandaron por WhatsApp. Si ya lo tenés copiado, pegalo acá abajo.
        </p>
        <CampoTexto
          etiqueta="Link"
          valor={texto}
          ejemplo="https://…?clave=…"
          alCambiar={(t) => {
            setTexto(t)
            setError(false)
          }}
        />
        {error && <p className="text-base text-peligro">Ese link no sirve. Copialo entero y probá de nuevo.</p>}
        <Boton onClick={entrar}>Entrar</Boton>
      </Tarjeta>
    </Pantalla>
  )
}
