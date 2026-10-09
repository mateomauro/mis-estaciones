import { CloudCheck, CloudOff, CloudUpload, HardDrive, LoaderCircle, TriangleAlert } from 'lucide-react'
import { useDatos } from '../datos.tsx'
import type { EstadoNube } from '../nube/sincronizar.ts'

const ESTADOS: Record<EstadoNube, { icono: typeof CloudCheck; texto: string; atencion?: boolean }> = {
  cargando: { icono: LoaderCircle, texto: 'Conectando con la nube…' },
  guardado: { icono: CloudCheck, texto: 'Todo guardado' },
  guardando: { icono: CloudUpload, texto: 'Guardando…' },
  'sin-conexion': { icono: CloudOff, texto: 'Sin internet: queda guardado acá y se sube solo cuando vuelva', atencion: true },
  error: { icono: TriangleAlert, texto: 'No se pudo conectar con la nube. Lo que cargues queda en este aparato.', atencion: true },
  'solo-local': { icono: HardDrive, texto: 'Guardado solo en este aparato' },
}

/**
 * Dice si lo cargado ya está a salvo, para que no haya dudas.
 * En la barra de abajo de las pantallas de carga, mientras todo anda bien, explica que se guarda solo.
 */
export function EstadoGuardado({ enBarra = false }: { enBarra?: boolean }) {
  const { estadoNube } = useDatos()
  const normal = estadoNube === 'guardado' || estadoNube === 'guardando'
  const { icono: Icono, texto, atencion } =
    enBarra && normal ? { icono: CloudCheck, texto: 'Se guarda solo mientras escribís', atencion: false } : ESTADOS[estadoNube]
  return (
    <p
      role="status"
      className={`flex items-center gap-1.5 text-base ${enBarra ? 'justify-center text-center' : ''} ${
        atencion ? 'font-semibold text-aviso-texto' : 'text-texto-suave'
      }`}
    >
      <Icono
        className={`size-[18px] shrink-0 ${estadoNube === 'cargando' ? 'animate-spin' : ''} ${atencion ? '' : 'text-primario'}`}
        aria-hidden
      />
      {texto}
    </p>
  )
}
