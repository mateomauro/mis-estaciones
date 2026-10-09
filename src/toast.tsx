import { Check } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

type Mensaje = { id: number; texto: string; deshacer?: () => void }
type Avisar = (mensaje: { texto: string; deshacer?: () => void }) => void

const Contexto = createContext<Avisar>(() => {})

/** Mensaje de unos segundos abajo de todo: "Viernes cargado", "Se quitó el día · Deshacer". */
export function AvisosProvider({ children }: { children: ReactNode }) {
  const [mensaje, setMensaje] = useState<Mensaje | null>(null)

  const avisar = useCallback<Avisar>((nuevo) => setMensaje({ ...nuevo, id: Date.now() }), [])

  useEffect(() => {
    if (!mensaje) return
    // Si se puede deshacer, queda un rato más para que alcance a tocarlo.
    const timer = setTimeout(() => setMensaje(null), mensaje.deshacer ? 8000 : 4000)
    return () => clearTimeout(timer)
  }, [mensaje])

  return (
    <Contexto.Provider value={avisar}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(7.5rem+env(safe-area-inset-bottom))] z-30 px-4"
      >
        {mensaje && (
          <div
            key={mensaje.id}
            className="pointer-events-auto mx-auto flex max-w-xl items-center justify-between gap-3 rounded-[14px] bg-tinta py-1.5 pr-1.5 pl-4 text-base text-white shadow-[0_10px_24px_-10px_rgba(0,0,0,0.5)]"
          >
            <span className="py-2">{mensaje.texto}</span>
            {mensaje.deshacer ? (
              <button
                type="button"
                onClick={() => {
                  mensaje.deshacer?.()
                  setMensaje(null)
                }}
                className="min-h-12 shrink-0 cursor-pointer rounded-xl px-3 font-bold text-[#99f6e4] active:bg-white/10"
              >
                Deshacer
              </button>
            ) : (
              <Check className="mr-2.5 size-5 shrink-0 text-[#99f6e4]" aria-hidden />
            )}
          </div>
        )}
      </div>
    </Contexto.Provider>
  )
}

export const useAvisar = () => useContext(Contexto)
