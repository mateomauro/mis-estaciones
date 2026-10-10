import { Fuel, Package, Receipt, Ticket, Users, Utensils, Wrench, type LucideIcon } from 'lucide-react'
import type { CategoriaGasto, Gasto } from './tipos.ts'

export const CATEGORIAS: Record<CategoriaGasto, { icono: LucideIcon; nombre: string }> = {
  nafta: { icono: Fuel, nombre: 'Nafta' },
  comida: { icono: Utensils, nombre: 'Comida' },
  materiales: { icono: Package, nombre: 'Materiales' },
  herramientas: { icono: Wrench, nombre: 'Herramientas' },
  peaje: { icono: Ticket, nombre: 'Peaje' },
  personal: { icono: Users, nombre: 'Personal contratado' },
  otro: { icono: Receipt, nombre: 'Otro' },
}

/** Lo que escribió ("Nafta", "Estacionamiento"). Los primeros gastos se anotaban con botones ("Nafta", "Peaje"). */
export function nombreDelGasto(g: Gasto) {
  const nota = g.nota.trim()
  if (g.categoria === 'otro') return nota ? nota.charAt(0).toUpperCase() + nota.slice(1) : 'Gasto'
  return CATEGORIAS[g.categoria]?.nombre ?? 'Gasto'
}
