import { Factory, Fuel, Ruler, type LucideIcon } from 'lucide-react'
import type { TipoTrabajo, Trabajo, Valores } from './tipos.ts'

export const TIPOS: Record<
  TipoTrabajo,
  { icono: LucideIcon; nombre: string; nuevo: string; campoNombre: string; ejemplo: string }
> = {
  estacion: {
    icono: Fuel,
    nombre: 'Estación',
    nuevo: 'Nueva estación',
    campoNombre: 'Nombre de la estación',
    ejemplo: 'Ej: Opessa Magnolia',
  },
  fabrica: {
    icono: Factory,
    nombre: 'Fábrica',
    nuevo: 'Día de fábrica',
    campoNombre: 'Detalle (si querés)',
    ejemplo: 'Ej: Armado de muebles',
  },
  medicion: {
    icono: Ruler,
    nombre: 'Viaje a medir',
    nuevo: 'Viaje a medir',
    campoNombre: 'Estación que fuiste a medir',
    ejemplo: 'Ej: YPF Ruta 8',
  },
}

export const nombreCliente = (v: Valores) => v.cliente?.trim() || 'CR'
export const nombreTitular = (v: Valores) => v.titular?.trim() || 'Furniture'

export const nombreDelTrabajo = (t: Trabajo) =>
  t.nombre.trim() || (t.tipo === 'fabrica' ? 'Fábrica' : t.tipo === 'medicion' ? 'Viaje a medir' : 'Sin nombre')
