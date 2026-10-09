import {
  CalendarRange,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock,
  History,
  Info,
  Receipt,
  Settings,
  Sun,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { interpretarHora } from './formato.ts'
import { ir, volver as irAtras } from './navegacion.ts'

// ——— Pantalla y barras de abajo ———

export type Solapa = 'hoy' | 'semana' | 'gastos' | 'historial' | 'valores'

const SOLAPAS: { clave: Solapa; ruta: string; icono: LucideIcon; texto: string }[] = [
  { clave: 'hoy', ruta: '/', icono: Sun, texto: 'Hoy' },
  { clave: 'semana', ruta: '/semana', icono: CalendarRange, texto: 'Semana' },
  { clave: 'gastos', ruta: '/gastos', icono: Receipt, texto: 'Gastos' },
  { clave: 'historial', ruta: '/historial', icono: History, texto: 'Historial' },
  { clave: 'valores', ruta: '/valores', icono: Settings, texto: 'Valores' },
]

/** Barra fija abajo con las cinco solapas, siempre en el mismo lugar. */
function Solapas({ activa }: { activa?: Solapa }) {
  return (
    <nav aria-label="Secciones" className="fixed inset-x-0 bottom-0 z-20 border-t border-borde bg-superficie">
      <div className="mx-auto grid max-w-xl grid-cols-5 gap-0.5 px-0.5 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        {SOLAPAS.map(({ clave, ruta, icono: Icono, texto }) => (
          <a
            key={clave}
            href={`#${ruta}`}
            aria-current={clave === activa ? 'page' : undefined}
            onClick={(e) => {
              e.preventDefault()
              ir(ruta)
            }}
            className={`flex min-h-[58px] flex-col items-center justify-center gap-0.5 rounded-xl text-base font-semibold transition-colors duration-150 ${
              clave === activa ? 'bg-primario-suave text-primario-fuerte' : 'text-texto-suave active:bg-fondo'
            }`}
          >
            <Icono className="size-6" aria-hidden />
            {texto}
          </a>
        ))}
      </div>
    </nav>
  )
}

/** Barra fija abajo con el botón principal de la pantalla ("Listo", "Seguir"…). */
function BarraAccion({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-borde bg-superficie">
      <div className="mx-auto flex max-w-xl flex-col gap-1.5 px-4 pt-2.5 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        {children}
      </div>
    </div>
  )
}

export function Pantalla({
  titulo,
  subtitulo,
  volver,
  cabecera,
  solapa,
  barra,
  children,
}: {
  titulo?: string
  subtitulo?: ReactNode
  /** Texto del botón para volver (por ejemplo, el nombre de la estación). */
  volver?: string
  /** Reemplaza al título (por ejemplo, las flechas para cambiar de semana). */
  cabecera?: ReactNode
  /** Muestra las solapas abajo, con esta marcada. */
  solapa?: Solapa | 'ninguna'
  /** Muestra una barra fija abajo con esto (en vez de las solapas). */
  barra?: ReactNode
  children: ReactNode
}) {
  return (
    <>
      <main className={`mx-auto max-w-xl px-4 pt-4 ${solapa || barra ? 'pb-40' : 'pb-12'}`}>
        <header className="flex flex-col">
          {volver && (
            <button
              type="button"
              onClick={irAtras}
              className="-mt-2 -ml-2 flex min-h-12 cursor-pointer items-center gap-1 self-start rounded-lg px-1 text-[1.05rem] font-bold text-primario transition-colors duration-150 active:bg-primario-suave"
            >
              <ChevronLeft className="size-6 shrink-0" aria-hidden />
              <span className="line-clamp-1">{volver}</span>
            </button>
          )}
          {cabecera ?? (
            <>
              {titulo && <h1 className="text-[1.75rem] leading-tight font-semibold">{titulo}</h1>}
              {subtitulo && <div className="mt-1 text-base text-texto-suave">{subtitulo}</div>}
            </>
          )}
        </header>
        {children}
      </main>
      {barra ? <BarraAccion>{barra}</BarraAccion> : solapa && <Solapas activa={solapa === 'ninguna' ? undefined : solapa} />}
    </>
  )
}

/** Título de una parte de la pantalla. */
export function Titulo({ children, derecha }: { children: ReactNode; derecha?: ReactNode }) {
  return (
    <div className="mt-[26px] mb-2.5 flex items-center justify-between gap-3">
      <h2 className="text-[1.15rem] leading-snug font-semibold">{children}</h2>
      {derecha}
    </div>
  )
}

export function Subtitulo({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`text-base text-texto-suave ${className}`}>{children}</p>
}

/** Flechas para cambiar de semana con el título en el medio. */
export function Semanero({
  titulo,
  subtitulo,
  anterior,
  siguiente,
}: {
  titulo: string
  subtitulo: string
  anterior: () => void
  /** Sin esto, la flecha de la derecha queda apagada (no hay semanas después). */
  siguiente?: () => void
}) {
  const flecha = 'grid size-12 place-items-center rounded-[14px] border-2 bg-superficie transition-colors duration-150'
  return (
    <div className="grid grid-cols-[48px_minmax(0,1fr)_48px] items-center gap-1.5">
      <button
        type="button"
        onClick={anterior}
        aria-label="Semana anterior"
        className={`${flecha} cursor-pointer border-primario text-primario active:bg-primario-suave`}
      >
        <ChevronLeft className="size-6" aria-hidden />
      </button>
      <div className="text-center">
        <h1 className="text-[1.45rem] leading-tight font-semibold">{titulo}</h1>
        <p className="mt-0.5 text-base text-texto-suave">{subtitulo}</p>
      </div>
      <button
        type="button"
        onClick={siguiente}
        disabled={!siguiente}
        aria-label="Semana siguiente"
        className={`${flecha} cursor-pointer border-primario text-primario active:bg-primario-suave disabled:cursor-default disabled:border-borde disabled:text-[#8aa5a0]`}
      >
        <ChevronRight className="size-6" aria-hidden />
      </button>
    </div>
  )
}

// ——— Botones ———

const estilosBoton = {
  primario: 'bg-primario text-white active:bg-primario-fuerte hover:bg-primario-fuerte border-primario',
  secundario: 'bg-superficie text-primario border-primario active:bg-primario-suave hover:bg-primario-suave',
}

export function Boton({
  variante = 'primario',
  icono: Icono,
  onClick,
  deshabilitado = false,
  chico = false,
  children,
}: {
  variante?: keyof typeof estilosBoton
  icono?: LucideIcon
  onClick: () => void
  deshabilitado?: boolean
  /** Del ancho del texto, para acciones dentro de la pantalla ("Cambiar la fecha"). */
  chico?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={deshabilitado}
      className={`flex cursor-pointer items-center justify-center gap-2 rounded-[14px] border-2 font-bold transition-colors duration-150 disabled:cursor-default disabled:border-inactivo disabled:bg-inactivo disabled:text-texto-suave ${
        chico ? 'min-h-12 px-4 text-base' : 'min-h-[54px] w-full px-4 text-[1.1rem]'
      } ${estilosBoton[variante]}`}
    >
      {Icono && <Icono className="size-[22px] shrink-0" aria-hidden />}
      {children}
    </button>
  )
}

/** Botón de texto, para acciones que se usan menos. */
export function BotonTexto({
  icono: Icono,
  tono = 'primario',
  onClick,
  children,
}: {
  icono?: LucideIcon
  tono?: 'primario' | 'peligro' | 'suave'
  onClick: () => void
  children: ReactNode
}) {
  const color = {
    primario: 'text-primario active:bg-primario-suave',
    peligro: 'text-peligro active:bg-peligro-suave',
    suave: 'text-texto-suave active:bg-fondo',
  }[tono]
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-ml-1 inline-flex min-h-12 cursor-pointer items-center gap-1.5 self-start rounded-lg px-1 text-left text-[1.02rem] font-bold transition-colors duration-150 ${color}`}
    >
      {Icono && <Icono className="size-5 shrink-0" aria-hidden />}
      {children}
    </button>
  )
}

// ——— Cuentas y listas ———

/** Una cuenta que cierra: cobrás, pagás, te queda. */
export function Libro({ children }: { children: ReactNode }) {
  return <div className="rounded-[18px] border border-borde bg-superficie px-4 py-1.5">{children}</div>
}

export function LineaLibro({ etiqueta, monto, queda = false }: { etiqueta: ReactNode; monto: string; queda?: boolean }) {
  return (
    <div
      className={`flex items-baseline justify-between gap-3 border-b border-borde py-2.5 text-[1.05rem] last:border-b-0 ${
        queda ? 'font-bold text-ganancia' : ''
      }`}
    >
      <span>{etiqueta}</span>
      <span className={`shrink-0 tabular-nums ${queda ? 'font-titulo text-[1.55rem]' : ''}`}>{monto}</span>
    </div>
  )
}

export function NotaLibro({ children }: { children: ReactNode }) {
  return <p className="pt-0.5 pb-2.5 text-base text-texto-suave">{children}</p>
}

export function Lista({ children }: { children: ReactNode }) {
  return <div className="overflow-hidden rounded-[18px] border border-borde bg-superficie">{children}</div>
}

/** Renglón de una lista. Con `onClick` se puede tocar y lleva una flecha. */
export function Renglon({
  icono: Icono,
  titulo,
  detalle,
  valor,
  colorValor,
  falta = false,
  accion,
  onClick,
}: {
  icono?: LucideIcon
  titulo: ReactNode
  detalle?: ReactNode
  valor?: ReactNode
  colorValor?: 'ganancia'
  /** Resalta el renglón: falta cargar algo. */
  falta?: boolean
  /** En vez de la flecha, un botón que dice qué hace ("Cargar"). */
  accion?: string
  onClick?: () => void
}) {
  const contenido = (
    <>
      {Icono && <Icono className="size-[22px] shrink-0 text-primario" aria-hidden />}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[1.05rem] leading-snug font-bold">{titulo}</span>
        {detalle && (
          <span className={`text-base ${falta ? 'font-semibold text-aviso-texto' : 'text-texto-suave'}`}>{detalle}</span>
        )}
      </span>
      {valor !== undefined && (
        <span className={`shrink-0 font-bold whitespace-nowrap tabular-nums ${colorValor === 'ganancia' ? 'text-ganancia' : ''}`}>
          {valor}
        </span>
      )}
      {accion ? (
        <span className="grid min-h-12 shrink-0 place-items-center rounded-xl bg-primario px-4 text-base font-bold text-white">
          {accion}
        </span>
      ) : (
        onClick && <ChevronRight className="size-[22px] shrink-0 text-texto-suave" aria-hidden />
      )}
    </>
  )
  const estilo = `flex min-h-[60px] w-full items-center gap-2.5 border-b border-borde px-3.5 py-2.5 text-left last:border-b-0 ${
    falta ? 'bg-aviso' : ''
  }`
  if (!onClick) return <div className={estilo}>{contenido}</div>
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${estilo} cursor-pointer transition-colors duration-150 ${falta ? 'active:bg-[#ffedd5]' : 'hover:bg-fondo active:bg-fondo'}`}
    >
      {contenido}
    </button>
  )
}

/** Algo que se usa poco: plegado, se abre con un toque. */
export function Plegado({
  titulo,
  derecha,
  abierto,
  children,
}: {
  titulo: ReactNode
  /** Algo a la derecha del título, antes de la flecha (por ejemplo, un total). */
  derecha?: ReactNode
  abierto?: boolean
  children: ReactNode
}) {
  return (
    <details open={abierto} className="group mt-2.5 rounded-[14px] border border-borde bg-superficie">
      <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-2.5 rounded-[14px] px-3.5 font-bold transition-colors duration-150 active:bg-fondo">
        <span>{titulo}</span>
        <span className="flex items-center gap-1.5 tabular-nums">
          {derecha}
          <ChevronDown className="flecha-plegado size-[22px] shrink-0 text-texto-suave transition-transform duration-150" aria-hidden />
        </span>
      </summary>
      <div className="border-t border-borde px-3.5 pt-1 pb-3.5">{children}</div>
    </details>
  )
}

/** Renglón de una cuenta dentro de un plegado. */
export function Fila({
  etiqueta,
  valor,
  detalle,
  fuerte = false,
}: {
  etiqueta: ReactNode
  valor: ReactNode
  detalle?: ReactNode
  fuerte?: boolean
}) {
  return (
    <div className="border-b border-borde py-2.5 last:border-b-0">
      <div className={`flex items-baseline justify-between gap-3 ${fuerte ? 'text-[1.1rem] font-bold' : 'text-[1.05rem]'}`}>
        <span className={fuerte ? '' : 'font-semibold'}>{etiqueta}</span>
        <span className="shrink-0 tabular-nums">{valor}</span>
      </div>
      {detalle && <p className="text-base text-texto-suave">{detalle}</p>}
    </div>
  )
}

// ——— Avisos ———

/** "info" solo explica algo (gris verdoso). "atencion" es algo para revisar (naranja). */
export function Aviso({
  tipo = 'info',
  icono,
  children,
}: {
  tipo?: 'info' | 'atencion'
  icono?: LucideIcon
  children: ReactNode
}) {
  const Icono = icono ?? (tipo === 'atencion' ? TriangleAlert : Info)
  return (
    <div
      className={`mt-3 flex gap-2.5 rounded-[14px] border px-3.5 py-3 text-base ${
        tipo === 'atencion' ? 'border-aviso-borde bg-aviso font-semibold text-aviso-texto' : 'border-borde bg-info text-texto'
      }`}
    >
      <Icono className={`mt-0.5 size-5 shrink-0 ${tipo === 'atencion' ? '' : 'text-primario'}`} aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  )
}

/** El resultado al instante: horas del día, lo que se cobra… */
export function Resultado({ children }: { children: ReactNode }) {
  return (
    <div className="mt-3.5 flex items-center gap-2 rounded-[14px] bg-primario-suave px-3.5 py-3 text-[1.08rem] font-bold" aria-live="polite">
      <Clock className="size-[22px] shrink-0 text-primario" aria-hidden />
      <span>{children}</span>
    </div>
  )
}

export function FaltaContestar({ children = 'Falta contestar' }: { children?: ReactNode }) {
  return (
    <p className="-mt-1 mb-2 flex items-center gap-1.5 text-base font-bold text-aviso-texto">
      <CircleAlert className="size-[18px] shrink-0" aria-hidden />
      {children}
    </p>
  )
}

// ——— Para elegir ———

/** Una sola opción entre pocas, en renglones grandes. La elegida puede abrir algo adentro. */
export function Opciones<T extends string>({
  etiqueta,
  opciones,
  valor,
  alCambiar,
}: {
  etiqueta: string
  opciones: { clave: T; texto: string; aclaracion?: string; adentro?: ReactNode }[]
  valor: T | null
  alCambiar: (valor: T) => void
}) {
  return (
    <div role="radiogroup" aria-label={etiqueta} className="grid gap-2.5">
      {opciones.map(({ clave, texto, aclaracion, adentro }) => {
        const elegida = valor === clave
        return (
          <div
            key={clave}
            className={`rounded-[14px] border-2 transition-colors duration-150 ${
              elegida ? 'border-primario bg-primario-suave' : 'border-campo bg-superficie'
            }`}
          >
            <button
              type="button"
              role="radio"
              aria-checked={elegida}
              onClick={() => alCambiar(clave)}
              className="flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-xl px-4 py-2 text-left text-[1.1rem] font-bold"
            >
              <span
                className={`grid size-6 shrink-0 place-items-center rounded-full border-2 ${
                  elegida ? 'border-primario bg-primario text-white' : 'border-campo'
                }`}
              >
                {elegida && <Check className="size-4" strokeWidth={3} aria-hidden />}
              </span>
              <span>
                {texto}
                {aclaracion && <span className="text-base font-normal text-texto-suave"> · {aclaracion}</span>}
              </span>
            </button>
            {elegida && adentro && <div className="px-4 pb-3">{adentro}</div>}
          </div>
        )
      })}
    </div>
  )
}

/** Botones grandes de a dos que se prenden y apagan (quiénes fueron, en qué se gastó). */
export function Chips({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-2.5">{children}</div>
}

export function Chip({
  activo,
  icono: Icono,
  onClick,
  children,
}: {
  activo: boolean
  icono?: LucideIcon
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={activo}
      onClick={onClick}
      className={`flex min-h-[54px] min-w-0 cursor-pointer items-center justify-center gap-2 rounded-[14px] border-2 px-2 text-[1.1rem] font-bold transition-colors duration-150 ${
        activo ? 'border-primario bg-primario text-white' : 'border-campo bg-superficie text-texto active:bg-primario-suave'
      }`}
    >
      {Icono && <Icono className="size-[22px] shrink-0" aria-hidden />}
      <span className="truncate">{children}</span>
    </button>
  )
}

export function Casilla({
  marcada,
  alCambiar,
  titulo,
  aclaracion,
}: {
  marcada: boolean
  alCambiar: (marcada: boolean) => void
  titulo: string
  aclaracion?: string
}) {
  return (
    <label
      className={`mt-3 flex min-h-12 cursor-pointer items-start gap-3 rounded-[14px] border-2 px-3.5 py-3 transition-colors duration-150 ${
        marcada ? 'border-primario bg-primario-suave' : 'border-campo bg-superficie'
      }`}
    >
      <input
        type="checkbox"
        className="mt-0.5 size-[26px] shrink-0 cursor-pointer accent-primario"
        checked={marcada}
        onChange={(e) => alCambiar(e.target.checked)}
      />
      <span>
        <span className="block font-bold">{titulo}</span>
        {aclaracion && <span className="block text-base text-texto-suave">{aclaracion}</span>}
      </span>
    </label>
  )
}

// ——— Campos ———

export const estiloCampo =
  'w-full rounded-[14px] border-2 border-campo bg-superficie px-4 text-texto outline-none transition-colors duration-150 placeholder:font-sans placeholder:text-[1.15rem] placeholder:font-normal placeholder:text-[#56716e] focus:border-primario focus:ring-4 focus:ring-primario/20'

/** Tamaños de los campos: los números van grandes, el texto un poco menos. */
const tamaños = {
  grande: 'min-h-[62px] font-titulo text-[1.6rem] font-semibold',
  mediano: 'min-h-14 font-titulo text-[1.35rem] font-semibold',
  texto: 'min-h-14 text-[1.25rem] font-semibold',
}

function Etiqueta({ children, chica = false }: { children: ReactNode; chica?: boolean }) {
  return <span className={`mb-1.5 block font-bold text-texto ${chica ? 'text-base' : 'text-[1.08rem]'}`}>{children}</span>
}

export function CampoTexto({
  etiqueta,
  valor,
  alCambiar,
  ejemplo,
  enfocar = false,
  icono: Icono,
}: {
  etiqueta?: string
  valor: string
  alCambiar: (valor: string) => void
  ejemplo?: string
  enfocar?: boolean
  icono?: LucideIcon
}) {
  return (
    <label className="mt-[18px] block">
      {etiqueta && <Etiqueta>{etiqueta}</Etiqueta>}
      <span className="relative block">
        {Icono && (
          <Icono className="pointer-events-none absolute top-1/2 left-4 size-[22px] -translate-y-1/2 text-texto-suave" aria-hidden />
        )}
        <input
          className={`${estiloCampo} ${tamaños.texto} ${Icono ? 'pl-12' : ''}`}
          value={valor}
          placeholder={ejemplo}
          autoFocus={enfocar}
          aria-label={etiqueta ? undefined : ejemplo}
          onChange={(e) => alCambiar(e.target.value)}
        />
      </span>
    </label>
  )
}

/** Campo para montos en pesos: muestra los puntos de miles mientras se escribe. */
export function CampoPlata({
  etiqueta,
  valor,
  alCambiar,
  ayuda,
  enfocar = false,
  tamaño = 'grande',
}: {
  etiqueta: string
  valor: number
  alCambiar: (valor: number) => void
  ayuda?: string
  enfocar?: boolean
  tamaño?: 'grande' | 'mediano'
}) {
  return (
    <label className="mt-[18px] block">
      <Etiqueta chica={tamaño === 'mediano'}>{etiqueta}</Etiqueta>
      <span className="relative block">
        <span
          className={`pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 font-titulo font-semibold text-texto-suave ${
            tamaño === 'grande' ? 'text-[1.6rem]' : 'text-[1.35rem]'
          }`}
          aria-hidden
        >
          $
        </span>
        <input
          inputMode="numeric"
          autoComplete="off"
          autoFocus={enfocar}
          className={`${estiloCampo} ${tamaños[tamaño]} pl-10 tabular-nums`}
          value={valor ? valor.toLocaleString('es-AR') : ''}
          placeholder="0"
          onChange={(e) => alCambiar(Number(e.target.value.replace(/\D/g, '')) || 0)}
        />
      </span>
      {ayuda && <span className="mt-1 block text-base text-texto-suave">{ayuda}</span>}
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
  tamaño = 'grande',
}: {
  etiqueta: string
  valor: string
  alCambiar: (hhmm: string) => void
  tamaño?: 'grande' | 'mediano'
}) {
  const [texto, setTexto] = useState<string | null>(null)
  const escribiendo = texto !== null
  const invalido = escribiendo && texto.trim() !== '' && !interpretarHora(texto)
  return (
    <label className="mt-[18px] block min-w-0">
      <Etiqueta chica={tamaño === 'mediano'}>{etiqueta}</Etiqueta>
      <input
        inputMode="decimal"
        enterKeyHint="next"
        autoComplete="off"
        placeholder="Ej: 7:30"
        aria-invalid={invalido}
        className={`${estiloCampo} ${tamaños[tamaño]} tabular-nums ${invalido ? 'border-peligro focus:border-peligro' : ''}`}
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
      {invalido && <span className="mt-1 block text-base font-semibold text-peligro">Escribila así: 7:30 o 730</span>}
    </label>
  )
}

/** Campo para números con decimales (acepta coma). */
export function CampoNumero({
  etiqueta,
  valor,
  alCambiar,
  sufijo,
}: {
  etiqueta: string
  valor: number
  alCambiar: (valor: number) => void
  sufijo?: string
}) {
  const [texto, setTexto] = useState(String(valor).replace('.', ','))
  return (
    <label className="mt-[18px] block">
      <Etiqueta chica>{etiqueta}</Etiqueta>
      <span className="flex items-center gap-2.5">
        <input
          inputMode="decimal"
          className={`${estiloCampo} ${tamaños.mediano} max-w-36 tabular-nums`}
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value)
            const n = Number(e.target.value.replace(',', '.'))
            if (!Number.isNaN(n)) alCambiar(n)
          }}
        />
        {sufijo && <span className="font-titulo text-[1.4rem] font-semibold">{sufijo}</span>}
      </span>
    </label>
  )
}

/** Botón "Cambiar la fecha" que abre el calendario del celular. */
export function CambiarFecha({
  fecha,
  alCambiar,
  texto = 'Cambiar la fecha',
  chico = true,
}: {
  fecha: string
  alCambiar: (fecha: string) => void
  texto?: string
  chico?: boolean
}) {
  return (
    <label
      className={`relative inline-flex min-h-12 cursor-pointer items-center gap-2 overflow-hidden font-bold text-primario transition-colors duration-150 focus-within:ring-4 focus-within:ring-primario/20 ${
        chico
          ? 'rounded-[14px] border-2 border-primario bg-superficie px-4 text-base active:bg-primario-suave'
          : 'rounded-lg px-1 text-[1.02rem] active:bg-primario-suave'
      }`}
    >
      <CalendarRange className="size-5 shrink-0" aria-hidden />
      {texto}
      {/* El campo de fecha ocupa todo el botón, invisible: al tocarlo abre el calendario. */}
      <input
        type="date"
        aria-label={texto}
        className="absolute inset-0 cursor-pointer opacity-0"
        value={fecha}
        onClick={(e) => {
          try {
            e.currentTarget.showPicker()
          } catch {
            // Algunos navegadores lo abren solos al tocar.
          }
        }}
        onChange={(e) => e.target.value && alCambiar(e.target.value)}
      />
    </label>
  )
}
