import { Ellipsis, Fuel, Package, Ticket, Utensils, Wrench, type LucideIcon } from 'lucide-react'
import type { CategoriaGasto, Gasto } from './tipos.ts'

export const CATEGORIAS: Record<CategoriaGasto, { icono: LucideIcon; nombre: string }> = {
  nafta: { icono: Fuel, nombre: 'Nafta' },
  comida: { icono: Utensils, nombre: 'Comida' },
  materiales: { icono: Package, nombre: 'Materiales' },
  herramientas: { icono: Wrench, nombre: 'Herramientas' },
  peaje: { icono: Ticket, nombre: 'Peaje' },
  otro: { icono: Ellipsis, nombre: 'Otro' },
}

/** "Nafta", o lo que escribió si eligió "Otro" ("Estacionamiento"). */
export function nombreDelGasto(g: Gasto) {
  const nota = g.nota.trim()
  if (g.categoria === 'otro' && nota) return nota.charAt(0).toUpperCase() + nota.slice(1)
  return CATEGORIAS[g.categoria]?.nombre ?? 'Gasto'
}
