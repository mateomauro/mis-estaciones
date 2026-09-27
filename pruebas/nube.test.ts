// Pruebas de lo que se puede probar sin conectarse a la nube.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { extraerClave } from '../src/clave.ts'
import { leerCopia } from '../src/copias.ts'
import { combinar, mismoDato } from '../src/nube/sincronizar.ts'
import type { Trabajo } from '../src/tipos.ts'

const CLAVE = 'ClaveDePruebaParaLosTestsNoSirveParaNada1'

test('La clave se saca del link entero o de la clave sola', () => {
  assert.equal(extraerClave(`https://mis-estaciones.netlify.app/?clave=${CLAVE}`), CLAVE)
  assert.equal(extraerClave(`  https://x.netlify.app/?utm=1&clave=${CLAVE}  `), CLAVE)
  assert.equal(extraerClave(CLAVE), CLAVE)
  assert.equal(extraerClave('https://mis-estaciones.netlify.app/'), null)
  assert.equal(extraerClave('corta123'), null)
})

const trabajo = (id: string, nombre: string) => ({ id, nombre }) as Trabajo

test('Los cambios de este aparato le ganan a lo que llega de la nube hasta que se confirman', () => {
  const remotos = [trabajo('a', 'Magnolia'), trabajo('b', 'Nicaragua')]
  const locales = new Map<string, Trabajo | null>([
    ['a', trabajo('a', 'Magnolia editada')],
    ['b', null],
    ['c', trabajo('c', 'Nueva')],
  ])
  assert.deepEqual(
    combinar(remotos, locales).map((t) => t.nombre),
    ['Magnolia editada', 'Nueva'],
  )
})

test('Se comparan datos sin importar el orden de las claves', () => {
  assert.ok(mismoDato({ a: 1, b: { c: 2, d: [1, 2] } }, { b: { d: [1, 2], c: 2 }, a: 1 }))
  assert.ok(!mismoDato({ a: 1 }, { a: 2 }))
})

test('Solo se aceptan copias de esta app', () => {
  const copia = { app: 'mis-estaciones', version: 1, valores: { empleados: [] }, trabajos: [{ id: 'a', tramos: [] }] }
  assert.equal(leerCopia(JSON.stringify(copia))?.trabajos.length, 1)
  assert.equal(leerCopia(JSON.stringify({ ...copia, app: 'otra' })), null)
  assert.equal(leerCopia('esto no es json'), null)
})
