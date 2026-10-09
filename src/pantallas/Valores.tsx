import { Archive, ArchiveRestore, Check, Percent, Plus, Smartphone, Trash2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { REGLA_CONVENIENCIA, REGLA_PAGO } from '../calculos.ts'
import { useDatos } from '../datos.tsx'
import { nuevoId, plata } from '../formato.ts'
import { ir } from '../navegacion.ts'
import { useAvisar } from '../toast.tsx'
import type { Empleado, Valores } from '../tipos.ts'
import { nombreCliente, nombreTitular } from '../tiposDeTrabajo.ts'
import { Boton, BotonTexto, CampoNumero, CampoPlata, CampoTexto, Lista, Pantalla, Renglon, Subtitulo, Titulo } from '../ui.tsx'

/** Lo que se abre al tocar un renglón: el campo, "Listo" y "Cancelar". */
function Editor({
  alListo,
  alCancelar,
  extra,
  children,
}: {
  alListo: () => void
  alCancelar: () => void
  extra?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="border-b border-borde bg-info px-3.5 pt-px pb-2 last:border-b-0">
      {children}
      <div className="mt-3 flex flex-wrap items-center gap-x-4">
        <Boton chico icono={Check} onClick={alListo}>
          Listo
        </Boton>
        <BotonTexto onClick={alCancelar}>Cancelar</BotonTexto>
      </div>
      {extra}
    </div>
  )
}

type PropsEditar<T> = { valor: T; alGuardar: (valor: T) => void; alCerrar: () => void }

function EditarPlata({ titulo, valor, alGuardar, alCerrar }: PropsEditar<number> & { titulo: string }) {
  const [borrador, setBorrador] = useState(valor)
  const listo = () => {
    alGuardar(borrador)
    alCerrar()
  }
  return (
    <Editor alCancelar={alCerrar} alListo={listo}>
      <CampoPlata etiqueta={titulo} tamaño="mediano" valor={borrador} alCambiar={setBorrador} enfocar />
    </Editor>
  )
}

function EditarTexto({ titulo, valor, ejemplo, alGuardar, alCerrar }: PropsEditar<string> & { titulo: string; ejemplo: string }) {
  const [borrador, setBorrador] = useState(valor)
  const listo = () => {
    alGuardar(borrador.trim())
    alCerrar()
  }
  return (
    <Editor alCancelar={alCerrar} alListo={listo}>
      <CampoTexto etiqueta={titulo} valor={borrador} ejemplo={ejemplo} alCambiar={setBorrador} enfocar />
    </Editor>
  )
}

function EditarIva({ valor, alGuardar, alCerrar }: PropsEditar<number>) {
  const [borrador, setBorrador] = useState(valor)
  const listo = () => {
    alGuardar(borrador)
    alCerrar()
  }
  return (
    <Editor alCancelar={alCerrar} alListo={listo}>
      <CampoNumero etiqueta="IVA" valor={borrador} alCambiar={setBorrador} sufijo="%" />
    </Editor>
  )
}

const valorHora = (valorDia: number, horasDelDia: number) =>
  valorDia ? `La hora sale ${plata(valorDia / horasDelDia)}` : 'Falta cargar'

function EditarEmpleado({
  empleado,
  cliente,
  alGuardar,
  alQuitar,
  alCerrar,
}: {
  empleado: Empleado
  cliente: string
  alGuardar: (e: Empleado) => void
  alQuitar?: () => void
  alCerrar: () => void
}) {
  const [borrador, setBorrador] = useState(empleado)
  const cambiar = (cambios: Partial<Empleado>) => setBorrador({ ...borrador, ...cambios })
  return (
    <Editor
      alCancelar={alCerrar}
      alListo={() => {
        alGuardar({ ...borrador, nombre: borrador.nombre.trim() })
        alCerrar()
      }}
      extra={
        alQuitar && (
          <BotonTexto icono={Trash2} tono="peligro" onClick={alQuitar}>
            Quitar empleado
          </BotonTexto>
        )
      }
    >
      <CampoTexto
        etiqueta="Nombre"
        valor={borrador.nombre}
        ejemplo="Ej: Juan"
        alCambiar={(nombre) => cambiar({ nombre })}
        enfocar={!empleado.nombre}
      />
      <CampoPlata
        etiqueta={`Lo que cobrás a ${cliente} por día (9 h)`}
        tamaño="mediano"
        valor={borrador.diaConveniencia}
        alCambiar={(diaConveniencia) => cambiar({ diaConveniencia })}
        ayuda={valorHora(borrador.diaConveniencia, REGLA_CONVENIENCIA.horasDelDia)}
      />
      <CampoPlata
        etiqueta="Lo que le pagás por día (10 h)"
        tamaño="mediano"
        valor={borrador.diaPago}
        alCambiar={(diaPago) => cambiar({ diaPago })}
        ayuda={valorHora(borrador.diaPago, REGLA_PAGO.horasDelDia)}
      />
    </Editor>
  )
}

export function PantallaValores() {
  const { valores, clave, estadoNube, guardarValores } = useDatos()
  const avisar = useAvisar()
  // Se edita una cosa por vez.
  const [abierto, setAbierto] = useState<string | null>(null)
  const cliente = nombreCliente(valores)
  const cerrar = () => setAbierto(null)
  const enNube = Boolean(clave) && estadoNube !== 'solo-local'

  const guardar = (cambios: Partial<Valores>, que: string) => {
    guardarValores({ ...valores, ...cambios })
    avisar({ texto: `${que}: guardado` })
  }

  const guardarEmpleado = (empleado: Empleado) => {
    const existe = valores.empleados.some((e) => e.id === empleado.id)
    guardar(
      { empleados: existe ? valores.empleados.map((e) => (e.id === empleado.id ? empleado : e)) : [...valores.empleados, empleado] },
      empleado.nombre || 'Empleado',
    )
  }

  const quitarEmpleado = (empleado: Empleado) => {
    const antes = valores.empleados
    guardarValores({ ...valores, empleados: antes.filter((e) => e.id !== empleado.id) })
    cerrar()
    avisar({
      texto: `Se quitó a ${empleado.nombre || 'un empleado'}`,
      deshacer: () => guardarValores({ ...valores, empleados: antes }),
    })
  }

  const precio = (id: 'horaMia' | 'plus', titulo: string) =>
    abierto === id ? (
      <EditarPlata key={id} titulo={titulo} valor={valores[id]} alCerrar={cerrar} alGuardar={(v) => guardar({ [id]: v }, titulo)} />
    ) : (
      <Renglon key={id} titulo={titulo} valor={plata(valores[id])} onClick={() => setAbierto(id)} />
    )

  const dato = (id: 'titular' | 'cliente', titulo: string, valor: string, ejemplo: string, detalle?: string) =>
    abierto === id ? (
      <EditarTexto key={id} titulo={titulo} valor={valores[id] ?? ''} ejemplo={ejemplo} alCerrar={cerrar} alGuardar={(v) => guardar({ [id]: v }, titulo)} />
    ) : (
      <Renglon key={id} titulo={titulo} detalle={detalle} valor={<span className="font-semibold">{valor}</span>} onClick={() => setAbierto(id)} />
    )

  return (
    <Pantalla titulo="Valores" subtitulo="Lo que cambies se usa en lo que cargues de ahora en más." solapa="valores">
      <div className="mt-4">
        <Boton icono={Percent} onClick={() => ir('/aumento')}>
          Aplicar un aumento
        </Boton>
      </div>

      <Titulo>Tus precios</Titulo>
      <Lista>
        {precio('horaMia', 'Tu hora')}
        {precio('plus', 'Plus por estación')}
        {abierto === 'iva' ? (
          <EditarIva valor={valores.iva} alCerrar={cerrar} alGuardar={(iva) => guardar({ iva }, 'IVA')} />
        ) : (
          <Renglon titulo="IVA" valor={`${valores.iva.toLocaleString('es-AR')} %`} onClick={() => setAbierto('iva')} />
        )}
      </Lista>

      <Titulo>Empleados</Titulo>
      <Lista>
        {valores.empleados.map((empleado) =>
          abierto === empleado.id ? (
            <EditarEmpleado
              key={empleado.id}
              empleado={empleado}
              cliente={cliente}
              alCerrar={cerrar}
              alGuardar={guardarEmpleado}
              alQuitar={() => quitarEmpleado(empleado)}
            />
          ) : (
            <Renglon
              key={empleado.id}
              titulo={empleado.nombre || 'Sin nombre'}
              detalle={
                <span className="tabular-nums">
                  Cobrás {plata(empleado.diaConveniencia)} · Pagás {empleado.diaPago ? plata(empleado.diaPago) : 'falta cargar'}
                </span>
              }
              onClick={() => setAbierto(empleado.id)}
            />
          ),
        )}
        {abierto === 'nuevo' && (
          <EditarEmpleado
            empleado={{ id: nuevoId(), nombre: '', diaConveniencia: 0, diaPago: 0 }}
            cliente={cliente}
            alCerrar={cerrar}
            alGuardar={guardarEmpleado}
          />
        )}
      </Lista>
      {abierto !== 'nuevo' && (
        <BotonTexto icono={Plus} onClick={() => setAbierto('nuevo')}>
          Agregar empleado
        </BotonTexto>
      )}
      <Subtitulo className="mt-1">Lo que ya cargaste sigue con los valores que tenía.</Subtitulo>

      <Titulo>Tus datos</Titulo>
      <Lista>
        {dato('titular', 'Tu nombre o empresa', nombreTitular(valores), 'Furniture', 'Sale en los PDF')}
        {dato('cliente', 'A quién le cobrás', cliente, 'CR')}
      </Lista>

      <Titulo>Más opciones</Titulo>
      <Lista>
        {enNube && <Renglon icono={Smartphone} titulo="Abrir en otro aparato" onClick={() => ir('/opciones/aparato')} />}
        <Renglon icono={Archive} titulo="Copias de seguridad" onClick={() => ir('/opciones/copias')} />
        {enNube && <Renglon icono={ArchiveRestore} titulo="Recuperar algo borrado" onClick={() => ir('/opciones/borrados')} />}
      </Lista>
    </Pantalla>
  )
}
