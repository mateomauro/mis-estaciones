import { ChevronLeft, ChevronRight, Info, TriangleAlert, type LucideIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { interpretarHora, plata } from './formato.ts'
import { volver as irAtras } from './navegacion.ts'

export function Pantalla({
  titulo,
  etiqueta,
  volver = false,
  acciones,
  children,
}: {
  titulo: string
  /** Texto chico arriba del título, por ejemplo el tipo de trabajo. */
  etiqueta?: { icono: LucideIcon; texto: string }
  volver?: boolean
  /** Botones al lado del título (en la compu) o debajo (en el celu). */
  acciones?: ReactNode
  children: ReactNode
}) {
  return (
    <main className="min-h-dvh">
      <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 pt-3 pb-12 lg:max-w-5xl lg:px-6">
        <header className="flex flex-col gap-1">
          {volver && (
            <button
              type="button"
              onClick={irAtras}
              className="-ml-2 flex min-h-11 cursor-pointer items-center gap-1 self-start rounded-lg px-2 text-base font-semibold text-primario transition-colors duration-150 active:bg-primario-suave"
            >
              <ChevronLeft className="size-5" aria-hidden />
              Volver
            </button>
          )}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              {etiqueta && (
                <p className="flex items-center gap-1.5 text-base font-medium text-texto-suave">
                  <etiqueta.icono className="size-4" aria-hidden />
                  {etiqueta.texto}
                </p>
              )}
              <h1 className="text-2xl leading-tight font-bold sm:text-3xl">{titulo}</h1>
            </div>
            {acciones && (
              <div className="flex flex-col gap-2 sm:flex-row sm:*:w-auto sm:*:whitespace-nowrap lg:shrink-0">{acciones}</div>
            )}
          </div>
        </header>
        {children}
      </div>
    </main>
  )
}

export function Tarjeta({
  titulo,
  icono: Icono,
  derecha,
  children,
}: {
  titulo?: string
  icono?: LucideIcon
  /** Algo chico a la derecha del título (un total, un botón). */
  derecha?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-3 overflow-hidden rounded-2xl border border-borde bg-superficie p-4 shadow-sm">
      {titulo && (
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            {Icono && <Icono className="size-5 text-primario" aria-hidden />}
            {titulo}
          </h2>
          {derecha}
        </div>
      )}
      {children}
    </section>
  )
}

const estilosBoton = {
  primario: 'min-h-13 bg-primario text-white shadow-sm active:bg-primario-fuerte hover:bg-primario-fuerte text-lg font-semibold',
  secundario:
    'min-h-12 border-2 border-primario bg-superficie text-primario active:bg-primario-suave hover:bg-primario-suave text-base font-semibold',
  peligro: 'min-h-11 border border-peligro/30 bg-superficie text-peligro active:bg-peligro-suave hover:bg-peligro-suave text-base',
}

export function Boton({
  variante = 'primario',
  icono: Icono,
  onClick,
  deshabilitado = false,
  children,
}: {
  variante?: keyof typeof estilosBoton
  icono?: LucideIcon
  onClick: () => void
  deshabilitado?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={deshabilitado}
      className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2 transition-colors duration-150 disabled:cursor-wait disabled:opacity-60 ${estilosBoton[variante]}`}
    >
      {Icono && <Icono className="size-5 shrink-0" aria-hidden />}
      {children}
    </button>
  )
}

/** Botón chico de texto, para acciones secundarias dentro de una tarjeta. */
export function BotonTexto({
  icono: Icono,
  peligro = false,
  onClick,
  children,
}: {
  icono?: LucideIcon
  peligro?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-ml-2 flex min-h-11 cursor-pointer items-center gap-1.5 self-start rounded-lg px-2 text-base font-medium transition-colors duration-150 ${
        peligro ? 'text-peligro active:bg-peligro-suave' : 'text-primario active:bg-primario-suave'
      }`}
    >
      {Icono && <Icono className="size-5" aria-hidden />}
      {children}
    </button>
  )
}

/** Botón que es solo un ícono (siempre con texto para lectores de pantalla). */
export function BotonIcono({
  icono: Icono,
  etiqueta,
  peligro = false,
  onClick,
}: {
  icono: LucideIcon
  etiqueta: string
  peligro?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={etiqueta}
      title={etiqueta}
      className={`flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg transition-colors duration-150 ${
        peligro ? 'text-peligro active:bg-peligro-suave hover:bg-peligro-suave' : 'text-primario active:bg-primario-suave'
      }`}
    >
      <Icono className="size-5" aria-hidden />
    </button>
  )
}

export const estiloCampo =
  'w-full min-h-12 rounded-lg border-2 border-campo bg-superficie px-3 text-lg text-texto outline-none transition-colors duration-150 focus:border-primario focus:ring-4 focus:ring-primario/20'

export function CampoTexto({
  etiqueta,
  valor,
  alCambiar,
  ejemplo,
}: {
  etiqueta: string
  valor: string
  alCambiar: (valor: string) => void
  ejemplo?: string
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-base font-semibold">{etiqueta}</span>
      <input className={estiloCampo} value={valor} placeholder={ejemplo} onChange={(e) => alCambiar(e.target.value)} />
    </label>
  )
}

/** Campo para montos en pesos: muestra los puntos de miles mientras se escribe. */
export function CampoPlata({
  etiqueta,
  valor,
  alCambiar,
  ayuda,
}: {
  etiqueta: string
  valor: number
  alCambiar: (valor: number) => void
  ayuda?: string
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-base font-semibold">{etiqueta}</span>
      <div className="flex min-h-12 items-center rounded-lg border-2 border-campo bg-superficie transition-colors duration-150 focus-within:border-primario focus-within:ring-4 focus-within:ring-primario/20">
        <span className="pl-3 text-lg text-texto-suave" aria-hidden>
          $
        </span>
        <input
          inputMode="numeric"
          className="w-full min-w-0 bg-transparent px-2 py-2 text-lg tabular-nums outline-none"
          value={valor ? valor.toLocaleString('es-AR') : ''}
          placeholder="0"
          onChange={(e) => alCambiar(Number(e.target.value.replace(/\D/g, '')) || 0)}
        />
      </div>
      {ayuda && <span className="text-sm text-texto-suave">{ayuda}</span>}
    </label>
  )
}

/**
 * Campo de hora que se escribe con el teclado numérico, sin reloj ni "a. m./p. m.".
 * Entiende "730", "7.30", "7,30" o "7:30" y siempre muestra 24 h ("20:15").
 */
export function CampoHora({
  etiqueta,
  valor,
  alCambiar,
}: {
  etiqueta: string
  valor: string
  alCambiar: (hhmm: string) => void
}) {
  const [texto, setTexto] = useState<string | null>(null)
  const escribiendo = texto !== null
  const invalido = escribiendo && texto.trim() !== '' && !interpretarHora(texto)
  return (
    <label className="flex min-w-0 flex-col gap-0.5">
      <span className="text-sm text-texto-suave">{etiqueta}</span>
      <input
        inputMode="decimal"
        enterKeyHint="next"
        autoComplete="off"
        placeholder="Ej: 7:30"
        aria-invalid={invalido}
        className={`${estiloCampo} tabular-nums ${invalido ? 'border-peligro focus:border-peligro' : ''}`}
        value={texto ?? valor}
        onFocus={(e) => {
          setTexto(valor)
          e.target.select()
        }}
        onChange={(e) => {
          setTexto(e.target.value)
          // Se actualiza mientras escribe, así ve las horas del día al toque.
          const hora = e.target.value.trim() ? interpretarHora(e.target.value) : ''
          if (hora !== null) alCambiar(hora)
        }}
        onBlur={() => {
          if (!invalido) setTexto(null)
        }}
      />
      {invalido && <span className="text-sm text-peligro">Escribila así: 7:30 o 730</span>}
    </label>
  )
}

/** Campo para números con decimales (acepta coma). */
export function CampoNumero({
  etiqueta,
  valor,
  alCambiar,
}: {
  etiqueta: string
  valor: number
  alCambiar: (valor: number) => void
}) {
  const [texto, setTexto] = useState(String(valor).replace('.', ','))
  return (
    <label className="flex flex-col gap-1">
      <span className="text-base font-semibold">{etiqueta}</span>
      <input
        inputMode="decimal"
        className={estiloCampo}
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value)
          const n = Number(e.target.value.replace(',', '.'))
          if (!Number.isNaN(n)) alCambiar(n)
        }}
      />
    </label>
  )
}

/** Botones para elegir una sola opción entre pocas (por ejemplo "No fui / Todo el día / Un rato"). */
export function Opciones<T extends string>({
  etiqueta,
  opciones,
  valor,
  alCambiar,
}: {
  etiqueta: string
  opciones: [T, string][]
  valor: T
  alCambiar: (valor: T) => void
}) {
  return (
    <div role="radiogroup" aria-label={etiqueta} className="grid grid-flow-col auto-cols-fr gap-2">
      {opciones.map(([clave, texto]) => (
        <button
          key={clave}
          type="button"
          role="radio"
          aria-checked={valor === clave}
          onClick={() => alCambiar(clave)}
          className={`min-h-11 cursor-pointer rounded-lg border-2 px-2 text-base font-semibold transition-colors duration-150 ${
            valor === clave ? 'border-primario bg-primario text-white' : 'border-campo bg-superficie text-texto'
          }`}
        >
          {texto}
        </button>
      ))}
    </div>
  )
}

export function Casilla({
  marcada,
  alCambiar,
  chica = false,
  children,
}: {
  marcada: boolean
  alCambiar: (marcada: boolean) => void
  /** Sin recuadro, para ponerla en línea con otras cosas. */
  chica?: boolean
  children: ReactNode
}) {
  return (
    <label
      className={`flex min-h-11 cursor-pointer items-center gap-3 transition-colors duration-150 ${
        chica
          ? 'rounded-lg px-1 text-base'
          : `rounded-xl border-2 px-3 py-2 text-base ${marcada ? 'border-primario bg-primario-suave' : 'border-campo bg-superficie'}`
      }`}
    >
      <input
        type="checkbox"
        className="size-6 shrink-0 cursor-pointer accent-primario"
        checked={marcada}
        onChange={(e) => alCambiar(e.target.checked)}
      />
      <span>{children}</span>
    </label>
  )
}

export function Fila({ etiqueta, valor, fuerte = false }: { etiqueta: ReactNode; valor: ReactNode; fuerte?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 ${fuerte ? 'text-lg font-bold' : 'text-base'}`}>
      <span>{etiqueta}</span>
      <span className="shrink-0 tabular-nums">{valor}</span>
    </div>
  )
}

/** Nota con ícono. "atencion" para algo que hay que revisar; "info" para explicar algo. */
export function Aviso({ tipo = 'info', children }: { tipo?: 'info' | 'atencion'; children: ReactNode }) {
  const Icono = tipo === 'atencion' ? TriangleAlert : Info
  return (
    <div
      className={`flex gap-2 rounded-lg border px-3 py-2 text-sm ${
        tipo === 'atencion' ? 'border-aviso-borde bg-aviso text-aviso-texto' : 'border-borde bg-fondo text-texto'
      }`}
    >
      <Icono className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  )
}

/** Recuadro con un monto destacado: el total a cobrar, la ganancia, etc. */
export function Destacado({
  etiqueta,
  monto,
  color = 'primario',
}: {
  etiqueta: string
  monto: number
  color?: 'primario' | 'acento'
}) {
  return (
    <div
      className={`flex flex-wrap items-baseline justify-between gap-x-4 rounded-xl px-4 py-3 text-white ${
        color === 'acento' ? 'bg-acento' : 'bg-primario'
      }`}
    >
      <span className="text-base">{etiqueta}</span>
      <span className="font-titulo text-3xl font-bold tabular-nums">{plata(monto)}</span>
    </div>
  )
}

/** Fila de una lista que abre otra pantalla. */
export function FilaEnlace({
  icono: Icono,
  titulo,
  detalle,
  valor,
  onClick,
}: {
  icono?: LucideIcon
  titulo: string
  detalle: string
  valor: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-14 w-full cursor-pointer items-center gap-3 border-b border-borde px-4 py-2 text-left transition-colors duration-150 last:border-b-0 hover:bg-fondo active:bg-fondo"
    >
      {Icono && (
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primario-suave text-primario">
          <Icono className="size-5" aria-hidden />
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-base leading-snug font-semibold">{titulo}</span>
        <span className="text-sm text-texto-suave">{detalle}</span>
      </span>
      <span className="shrink-0 text-base font-semibold tabular-nums">{valor}</span>
      <ChevronRight className="size-5 shrink-0 text-texto-suave" aria-hidden />
    </button>
  )
}
