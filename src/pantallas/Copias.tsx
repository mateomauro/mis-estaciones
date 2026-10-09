import { ArchiveRestore, Copy, Download, Share2, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { linkConClave } from '../clave.ts'
import { descargarCopia, leerCopia } from '../copias.ts'
import { useDatos } from '../datos.tsx'
import { diasCortos } from '../formato.ts'
import type { TrabajoBorrado } from '../nube/sincronizar.ts'
import { useAvisar } from '../toast.tsx'
import { nombreDelTrabajo, TIPOS } from '../tiposDeTrabajo.ts'
import { Boton, BotonTexto, Lista, Pantalla, Renglon, Subtitulo } from '../ui.tsx'

const texto = 'mt-3 text-[1.05rem]'

export function PantallaOtroAparato() {
  const { clave } = useDatos()
  const [copiado, setCopiado] = useState(false)
  if (!clave) {
    return (
      <Pantalla volver="Valores" titulo="Abrir en otro aparato">
        <p className={texto}>En este aparato la app guarda solo acá, sin la nube.</p>
      </Pantalla>
    )
  }
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
    <Pantalla volver="Valores" titulo="Abrir en otro aparato">
      <p className={texto}>
        Para usarla en la compu o en otro celular, abrí este link ahí. Es como una llave: no se lo pases a nadie más.
      </p>
      <div className="mt-4 flex flex-col gap-2.5">
        <Boton icono={Copy} onClick={copiar}>
          {copiado ? '¡Copiado!' : 'Copiar el link'}
        </Boton>
        {'share' in navigator && (
          <Boton variante="secundario" icono={Share2} onClick={() => navigator.share({ title: 'Mis Estaciones', url: link }).catch(() => {})}>
            Mandarlo
          </Boton>
        )}
      </div>
    </Pantalla>
  )
}

export function PantallaCopias() {
  const { clave, valores, trabajos, gastos, estadoNube, cargarCopia } = useDatos()
  const avisar = useAvisar()
  const archivo = useRef<HTMLInputElement>(null)
  const enNube = clave && estadoNube !== 'solo-local'

  const cargar = async (lista: FileList | null) => {
    const contenido = await lista?.[0]?.text()
    if (archivo.current) archivo.current.value = ''
    if (!contenido) return
    const copia = leerCopia(contenido)
    if (!copia) {
      alert('Ese archivo no es una copia de Mis Estaciones.')
      return
    }
    const pregunta =
      `La copia tiene ${copia.trabajos.length} trabajos${copia.gastos.length ? ` y ${copia.gastos.length} gastos` : ''}. ` +
      'Se cargan todos y reemplazan a los que ya estén con el mismo ' +
      'nombre y fecha. También se cargan los valores y precios de la copia. ¿Seguir?'
    if (!confirm(pregunta)) return
    cargarCopia(copia)
    avisar({ texto: 'Copia cargada' })
  }

  return (
    <Pantalla volver="Valores" titulo="Copias de seguridad">
      <p className={texto}>
        {enNube ? 'Todo ya está guardado en la nube. ' : ''}Si querés tener una copia aparte (por ejemplo, en la compu),
        descargala acá. Con ese archivo se puede recuperar todo.
      </p>
      <div className="mt-4">
        <Boton icono={Download} onClick={() => descargarCopia({ valores, trabajos, gastos })}>
          Descargar copia completa
        </Boton>
      </div>
      <div className="mt-2">
        <BotonTexto icono={Upload} onClick={() => archivo.current?.click()}>
          Cargar una copia
        </BotonTexto>
      </div>
      <input ref={archivo} type="file" accept="application/json,.json" className="hidden" onChange={(e) => cargar(e.target.files)} />
    </Pantalla>
  )
}

export function PantallaBorrados() {
  const { leerPapelera, recuperarTrabajo } = useDatos()
  const avisar = useAvisar()
  const [borrados, setBorrados] = useState<TrabajoBorrado[] | null>(null)
  const [error, setError] = useState(false)

  // oxlint-disable-next-line react-hooks/exhaustive-deps -- solo al entrar a la pantalla
  useEffect(() => {
    leerPapelera()
      .then(setBorrados)
      .catch(() => setError(true))
  }, [])

  const recuperar = (borrado: TrabajoBorrado) => {
    recuperarTrabajo(borrado)
    setBorrados((lista) => lista?.filter((b) => b.id !== borrado.id) ?? null)
    avisar({ texto: `${nombreDelTrabajo(borrado)} recuperado` })
  }

  return (
    <Pantalla volver="Valores" titulo="Recuperar algo borrado">
      <p className={texto}>Si borraste una estación sin querer, la recuperás acá con todos sus días.</p>
      <div className="mt-4">
        {error ? (
          <Subtitulo>No se pudieron traer los borrados. Probá con internet.</Subtitulo>
        ) : borrados === null ? (
          <Subtitulo>Buscando…</Subtitulo>
        ) : borrados.length === 0 ? (
          <Subtitulo>No hay nada borrado.</Subtitulo>
        ) : (
          <Lista>
            {borrados.map((b) => (
              <Renglon
                key={b.id}
                icono={ArchiveRestore}
                titulo={nombreDelTrabajo(b)}
                detalle={`${TIPOS[b.tipo].nombre} · ${diasCortos(b.tramos.map((t) => t.fecha))} · borrado el ${new Date(
                  b.borradoEl,
                ).toLocaleDateString('es-AR')}`}
                accion="Recuperar"
                onClick={() => recuperar(b)}
              />
            ))}
          </Lista>
        )}
      </div>
    </Pantalla>
  )
}
