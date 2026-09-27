import { Plus, Trash2, Users, Wallet } from 'lucide-react'
import { useDatos } from '../datos.tsx'
import { nuevoId, plata } from '../formato.ts'
import type { Empleado } from '../tipos.ts'
import { nombreCliente } from '../tiposDeTrabajo.ts'
import { Aviso, Boton, BotonIcono, CampoNumero, CampoPlata, CampoTexto, Pantalla, Tarjeta } from '../ui.tsx'

const valorHora = (valorDia: number, horasDelDia: number) =>
  valorDia ? `Hora ${plata(valorDia / horasDelDia)}` : 'Falta cargar'

export function PantallaValores() {
  const { valores, guardarValores } = useDatos()
  const cliente = nombreCliente(valores)

  const cambiarEmpleado = (id: string, cambios: Partial<Empleado>) =>
    guardarValores({
      ...valores,
      empleados: valores.empleados.map((e) => (e.id === id ? { ...e, ...cambios } : e)),
    })

  const quitarEmpleado = (empleado: Empleado) => {
    if (!confirm(`¿Quitar a ${empleado.nombre || 'este empleado'}? Lo que ya cargaste no cambia.`)) return
    guardarValores({ ...valores, empleados: valores.empleados.filter((e) => e.id !== empleado.id) })
  }

  const agregarEmpleado = () =>
    guardarValores({
      ...valores,
      empleados: [...valores.empleados, { id: nuevoId(), nombre: '', diaConveniencia: 0, diaPago: 0 }],
    })

  return (
    <Pantalla titulo="Valores y precios" volver>
      <Aviso>Se guarda solo. Lo que ya cargaste sigue con los valores que tenía; lo nuevo usa estos.</Aviso>

      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[20rem_minmax(0,1fr)] lg:items-start lg:gap-6">
        <Tarjeta titulo="Tus valores" icono={Wallet}>
          <CampoTexto
            etiqueta="Tu nombre o empresa (sale en los PDF)"
            valor={valores.titular ?? ''}
            ejemplo="Furniture"
            alCambiar={(titular) => guardarValores({ ...valores, titular })}
          />
          <CampoTexto
            etiqueta="A quién le cobrás"
            valor={valores.cliente ?? ''}
            ejemplo="CR"
            alCambiar={(cliente) => guardarValores({ ...valores, cliente })}
          />
          <CampoPlata
            etiqueta="Tu hora"
            valor={valores.horaMia}
            alCambiar={(horaMia) => guardarValores({ ...valores, horaMia })}
          />
          <CampoPlata
            etiqueta="Plus por estación terminada"
            valor={valores.plus}
            alCambiar={(plus) => guardarValores({ ...valores, plus })}
          />
          <CampoNumero etiqueta="IVA (%)" valor={valores.iva} alCambiar={(iva) => guardarValores({ ...valores, iva })} />
        </Tarjeta>

        <Tarjeta titulo="Empleados" icono={Users}>
          <p className="text-sm text-texto-suave">
            Valor de un día: lo que cobrás a {cliente} (día de 9 h) y lo que le pagás a él (día de 10 h).
          </p>
          {valores.empleados.map((empleado) => (
            <div
              key={empleado.id}
              className="grid grid-cols-2 items-start gap-2 border-t border-borde pt-3 sm:grid-cols-[minmax(0,1fr)_9.5rem_9.5rem_auto]"
            >
              <div className="col-span-2 flex items-end gap-2 sm:col-span-1">
                <div className="min-w-0 flex-1">
                  <CampoTexto
                    etiqueta="Nombre"
                    valor={empleado.nombre}
                    alCambiar={(nombre) => cambiarEmpleado(empleado.id, { nombre })}
                  />
                </div>
                <div className="sm:hidden">
                  <BotonIcono icono={Trash2} etiqueta="Quitar empleado" peligro onClick={() => quitarEmpleado(empleado)} />
                </div>
              </div>
              <CampoPlata
                etiqueta={`Cobrás a ${cliente}`}
                valor={empleado.diaConveniencia}
                alCambiar={(diaConveniencia) => cambiarEmpleado(empleado.id, { diaConveniencia })}
                ayuda={valorHora(empleado.diaConveniencia, 9)}
              />
              <CampoPlata
                etiqueta="Le pagás"
                valor={empleado.diaPago}
                alCambiar={(diaPago) => cambiarEmpleado(empleado.id, { diaPago })}
                ayuda={valorHora(empleado.diaPago, 10)}
              />
              <div className="hidden pt-7 sm:block">
                <BotonIcono icono={Trash2} etiqueta="Quitar empleado" peligro onClick={() => quitarEmpleado(empleado)} />
              </div>
            </div>
          ))}
          <Boton variante="secundario" icono={Plus} onClick={agregarEmpleado}>
            Agregar empleado
          </Boton>
        </Tarjeta>
      </div>
    </Pantalla>
  )
}
