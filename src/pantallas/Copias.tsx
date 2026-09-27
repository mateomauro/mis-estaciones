import { ArchiveRestore, Copy, Download, Link, Share2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { linkConClave } from '../clave.ts'
import { descargarCopia, leerCopia } from '../copias.ts'
import { useDatos } from '../datos.tsx'
import { diasCortos } from '../formato.ts'
import type { TrabajoBorrado } from '../nube/sincronizar.ts'
import { nombreDelTrabajo, TIPOS } from '../tiposDeTrabajo.ts'
import { Boton, BotonTexto, Tarjeta } from '../ui.tsx'

function OtroAparato({ clave }: { clave: string }) {
  const [copiado, setCopiado] = useState(false)
  const link = linkConClave(clave)
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 3000)
    } catch {
      prompt('Copiá este link:', link)
    }
  }
  return (
    <Tarjeta titulo="Abrir en otro aparato" icono={Link}>
      <p className="text-base">
        Para usarla en la compu o en otro celular, abrí este link ahí. Es como una llave: no se lo pases a nadie más.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Boton variante="secundario" icono={Copy} onClick={copiar}>
          {copiado ? '¡Copiado!' : 'Copiar link'}
        </Boton>
        {'share' in navigator && (
          <Boton
            variante="secundario"
            icono={Share2}
            onClick={() => navigator.share({ title: 'Mis Estaciones', url: link }).catch(() => {})}
          >
            Mandarlo
          </Boton>
        )}
      </div>
    </Tarjeta>
  )
}

function Borrados() {
  const { leerPapelera, recuperarTrabajo } = useDatos()
  const [borrados, setBorrados] = useState<TrabajoBorrado[] | null>(null)
  const [cargando, setCargando] = useState(false)

  const ver = async () => {
    setCargando(true)
    try {
      setBorrados(await leerPapelera())
    } catch {
      alert('No se pudieron traer los borrados. Probá con internet.')
    } finally {
      setCargando(false)
    }
  }

  const recuperar = (borrado: TrabajoBorrado) => {
    recuperarTrabajo(borrado)
    setBorrados((lista) => lista?.filter((b) => b.id !== borrado.id) ?? null)
  }

  return (
    <Tarjeta titulo="Trabajos borrados" icono={ArchiveRestore}>
      {borrados === null ? (
        <>
          <p className="text-base">Si borraste algo sin querer, lo podés recuperar.</p>
          <BotonTexto icono={ArchiveRestore} onClick={ver}>
            {cargando ? 'Buscando…' : 'Ver trabajos borrados'}
          </BotonTexto>
        </>
      ) : borrados.length === 0 ? (
        <p className="text-base text-texto-suave">No hay trabajos borrados.</p>
      ) : (
        borrados.map((b) => (
          <div key={b.id} className="flex items-center justify-between gap-3 border-t border-borde pt-2">
            <div className="min-w-0">
              <p className="text-base font-semibold">{nombreDelTrabajo(b)}</p>
              <p className="text-sm text-texto-suave">
                {TIPOS[b.tipo].nombre} · {diasCortos(b.tramos.map((t) => t.fecha))} · borrado el{' '}
                {new Date(b.borradoEl).toLocaleDateString('es-AR')}
              </p>
            </div>
            <BotonTexto onClick={() => recuperar(b)}>Recuperar</BotonTexto>
          </div>
        ))
      )}
    </Tarjeta>
  )
}

/** Link para otros aparatos, copias de seguridad y trabajos borrados. */
export function CopiasYAcceso() {
  const { clave, valores, trabajos, estadoNube, cargarCopia } = useDatos()
  const archivo = useRef<HTMLInputElement>(null)

  const cargar = async (lista: FileList | null) => {
    const texto = await lista?.[0]?.text()
    if (archivo.current) archivo.current.value = ''
    if (!texto) return
    const copia = leerCopia(texto)
    if (!copia) {
      alert('Ese archivo no es una copia de Mis Estaciones.')
      return
    }
    const pregunta =
      `La copia tiene ${copia.trabajos.length} trabajos. Se cargan todos y reemplazan a los que ya estén con el mismo ` +
      'nombre y fecha. También se cargan los valores y precios de la copia. ¿Seguir?'
    if (confirm(pregunta)) cargarCopia(copia)
  }

  const enNube = clave && estadoNube !== 'solo-local'

  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-6">
      {enNube && <OtroAparato clave={clave} />}
      <Tarjeta titulo="Copias de seguridad" icono={Download}>
        <p className="text-base">
          {enNube ? 'Todo ya está guardado en la nube. ' : ''}Si querés tener una copia aparte (por ejemplo, en la compu),
          descargala acá. Con ese archivo se puede recuperar todo.
        </p>
        <Boton variante="secundario" icono={Download} onClick={() => descargarCopia({ valores, trabajos })}>
          Descargar copia completa
        </Boton>
        <BotonTexto icono={Upload} onClick={() => archivo.current?.click()}>
          Cargar una copia
        </BotonTexto>
        <input
          ref={archivo}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => cargar(e.target.files)}
        />
      </Tarjeta>
      {enNube && <Borrados />}
    </div>
  )
}
