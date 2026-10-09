import { useDatos } from '../datos.tsx'
import { nombreCliente } from '../tiposDeTrabajo.ts'
import { Pantalla, Titulo } from '../ui.tsx'

const pasos = (cliente: string): { titulo: string; texto: string }[] => [
  {
    titulo: 'Cada día',
    texto:
      'En Hoy tocá la estación donde estuvieron y cargá a qué hora entraron y salieron los chicos, y si fuiste vos. Si empiezan en otra, tocá “Empezar otra estación”.',
  },
  {
    titulo: 'El lunes',
    texto: 'La estación que sigue de la semana pasada aparece con “Seguir esta semana”: así cada semana tiene su cuenta.',
  },
  {
    titulo: 'Cuando terminan una estación',
    texto: 'Entrá a la estación y en “¿Terminaron acá?” marcá si se terminó (suma el plus) o si era una reparación.',
  },
  {
    titulo: 'Lo que ponés en efectivo',
    texto: `Anotalo en Gastos (nafta, comida, materiales…). Se lo cobrás a ${cliente} en la planilla, sin IVA.`,
  },
  {
    titulo: 'A fin de semana',
    texto: 'En Semana está la planilla para Soledad, lo que le pagás a cada uno y lo que te queda.',
  },
]

export function PantallaAyuda() {
  const { valores } = useDatos()
  return (
    <Pantalla volver="Hoy" titulo="¿Cómo se usa?" subtitulo="Todo se guarda solo. Si preferís, podés cargar toda la semana junta al final.">
      {pasos(nombreCliente(valores)).map((paso, i) => (
        <section key={paso.titulo}>
          <Titulo>
            {i + 1}. {paso.titulo}
          </Titulo>
          <p className="text-[1.05rem]">{paso.texto}</p>
        </section>
      ))}
    </Pantalla>
  )
}
