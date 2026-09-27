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
    // Sin almacenamiento: habrá que abrir el link cada vez.
  }
}

/** La clave de este aparato. Si vino en el link se guarda y se saca de la dirección, así no queda a la vista. */
export function leerClave(): string | null {
  const url = new URL(window.location.href)
  const delLink = extraerClave(url.searchParams.get('clave') ?? '')
  if (delLink) {
    guardarClave(delLink)
    url.searchParams.delete('clave')
    window.history.replaceState(null, '', url.pathname + url.search + url.hash)
    return delLink
  }
  try {
    return localStorage.getItem(CLAVE)
  } catch {
    return null
  }
}

export const linkConClave = (clave: string) => `${window.location.origin}/?clave=${clave}`
