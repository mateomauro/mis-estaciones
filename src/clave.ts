// La clave del link es la llave de los datos: quien la tiene puede verlos y cambiarlos.

const CLAVE = 'mis-estaciones-clave'

/** Saca la clave de un link pegado ("…?clave=XXXX") o de la clave sola. */
export function extraerClave(texto: string): string | null {
  const t = texto.trim()
  const clave = /[?&#]clave=([A-Za-z0-9]+)/.exec(t)?.[1] ?? t
  return /^[A-Za-z0-9]{32,}$/.test(clave) ? clave : null
}

export function guardarClave(clave: string) {
  try {
    localStorage.setItem(CLAVE, clave)
  } catch {
    // Sin almacenamiento: igual queda en la dirección.
  }
  ponerEnLaDireccion(clave)
}

/**
 * La clave queda siempre en la dirección: así, si se guarda la página, se comparte o se agrega
 * el ícono al inicio del celular, lo guardado ya la lleva y nunca vuelve a pedirla.
 */
function ponerEnLaDireccion(clave: string) {
  const url = new URL(window.location.href)
  if (url.searchParams.get('clave') === clave) return
  url.searchParams.set('clave', clave)
  window.history.replaceState(null, '', url.pathname + url.search + url.hash)
}

/** La clave de este aparato: la del link o la que ya había guardada. */
export function leerClave(): string | null {
  const delLink = extraerClave(new URL(window.location.href).searchParams.get('clave') ?? '')
  let guardada: string | null = null
  try {
    guardada = localStorage.getItem(CLAVE)
  } catch {
    // Sin almacenamiento: se usa la del link.
  }
  const clave = delLink ?? guardada
  if (clave) guardarClave(clave)
  return clave
}

export const linkConClave = (clave: string) => `${window.location.origin}/?clave=${clave}`
