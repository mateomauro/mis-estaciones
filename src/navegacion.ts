// Las pantallas se eligen con el # de la dirección, así el botón "atrás" del celular funciona.

let navegoDentro = false
let haciaAdelante = false
const posiciones = new Map<string, number>()

export const rutaActual = () => window.location.hash.replace(/^#/, '') || '/'

export const ir = (ruta: string) => {
  navegoDentro = true
  haciaAdelante = true
  window.location.hash = ruta
}

/** Cambia de pantalla sin dejar la actual en el "atrás" (por ejemplo, después de crear una estación). */
export const reemplazar = (ruta: string) => {
  haciaAdelante = true
  window.location.replace(`#${ruta}`)
}

/** Vuelve a la pantalla anterior; si se abrió la app directo en esta pantalla, va al inicio. */
export const volver = () => {
  if (navegoDentro) window.history.back()
  else ir('/')
}

/** Antes de cambiar de pantalla: guarda hasta dónde estaba bajando en la pantalla que deja. */
export const guardarPosicion = (ruta: string) => posiciones.set(ruta, window.scrollY)

/** Al entrar a una pantalla: arriba de todo si es nueva, o donde estaba si volvió. */
export const restaurarPosicion = (ruta: string) => {
  window.scrollTo(0, haciaAdelante ? 0 : (posiciones.get(ruta) ?? 0))
  haciaAdelante = false
}
