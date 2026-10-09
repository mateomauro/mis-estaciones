import { LogIn } from 'lucide-react'
import { useState } from 'react'
import { extraerClave } from '../clave.ts'
import { Aviso, Boton, CampoTexto, Pantalla } from '../ui.tsx'

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
    <Pantalla titulo="Mis Estaciones" subtitulo="Abrí la app con tu link">
      <p className="mt-4 text-[1.05rem]">
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
      {error && <Aviso tipo="atencion">Ese link no sirve. Copialo entero y probá de nuevo.</Aviso>}
      <div className="mt-4">
        <Boton icono={LogIn} onClick={entrar}>
          Entrar
        </Boton>
      </div>
    </Pantalla>
  )
}
