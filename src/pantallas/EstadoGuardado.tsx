import { CloudCheck, CloudOff, CloudUpload, HardDrive, LoaderCircle, TriangleAlert } from 'lucide-react'
import { useDatos } from '../datos.tsx'
import type { EstadoNube } from '../nube/sincronizar.ts'

const ESTADOS: Record<EstadoNube, { icono: typeof CloudCheck; texto: string; atencion?: boolean }> = {
  cargando: { icono: LoaderCircle, texto: 'Conectando con la nube…' },
  guardado: { icono: CloudCheck, texto: 'Todo guardado en la nube' },
  guardando: { icono: CloudUpload, texto: 'Guardando…' },
  'sin-conexion': { icono: CloudOff, texto: 'Sin internet: queda guardado acá y se sube solo cuando vuelva', atencion: true },
  error: { icono: TriangleAlert, texto: 'No se pudo conectar con la nube. Lo que cargues queda en este aparato.', atencion: true },
  'solo-local': { icono: HardDrive, texto: 'Guardado solo en este aparato' },
}

/** Dice si lo cargado ya está a salvo en la nube, para que no haya dudas. */
export function EstadoGuardado() {
  const { estadoNube } = useDatos()
  const { icono: Icono, texto, atencion } = ESTADOS[estadoNube]
  return (
    <p
      role="status"
      className={`flex items-center gap-1.5 text-sm ${atencion ? 'font-medium text-aviso-texto' : 'text-texto-suave'}`}
    >
      <Icono className={`size-4 shrink-0 ${estadoNube === 'cargando' ? 'animate-spin' : ''}`} aria-hidden />
      {texto}
    </p>
  )
}
