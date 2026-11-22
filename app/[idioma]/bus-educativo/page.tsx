import type { Metadata } from 'next'
import styles from '@/components/buses/educational-bus/form.module.css'
import { EducationalBusRequestForm } from '@/components/buses/educational-bus/EducationalBusRequestForm'
import { CircuitInfoAccordionGroup } from '@/components/buses/educational-bus/HistoricalCircuitAccordion'
import { PriorityNotice } from '@/components/buses/educational-bus/PriorityNotice'
import { HeroMedia } from '@/components/buses/educational-bus/HeroMedia'
import { AvisoSinTraducir } from '@/components/Ui'
import { alternativas, idiomaActual, textosActuales } from '@/lib/i18n/servidor'
import { educationalBusTemplateLabel, educationalBusTemplatePublicPath } from '@/lib/buses/educational-bus-requests'
import { buildEducationalCircuitSeedRows } from '@/lib/buses/educational-circuits'
import { getActiveEducationalCircuits } from '@/lib/buses/educational-circuits-server'
import { getEducationalSettings } from '@/lib/buses/educational-settings-server'

export async function generateMetadata(): Promise<Metadata> {
  const t = (await textosActuales()).buses.educativo
  return { title: t.titulo, description: t.descripcion, alternates: await alternativas("/bus-educativo") }
}

// El contenido de los circuitos sale del catálogo administrable.
export const dynamic = 'force-dynamic'

interface AccordionItem {
  id: string
  iconName: 'landmark'
  title: string
  summary: string
  paragraphs: string[]
}

async function loadCircuitAccordionItems(): Promise<AccordionItem[]> {
  try {
    const circuits = await getActiveEducationalCircuits()
    if (circuits.length > 0) {
      return circuits.map((circuit) => ({
        id: circuit.slug,
        iconName: 'landmark' as const,
        title: circuit.name.startsWith('Circuito') ? circuit.name : `Circuito ${circuit.name}`,
        summary: circuit.summary,
        paragraphs: circuit.paragraphs,
      }))
    }
  } catch {
    // Migración pendiente: se muestra el contenido de la semilla.
  }

  return buildEducationalCircuitSeedRows()
    .filter((row) => row.active)
    .map((row) => ({
      id: row.slug,
      iconName: 'landmark' as const,
      title: row.name.startsWith('Circuito') ? row.name : `Circuito ${row.name}`,
      summary: row.summary,
      paragraphs: row.paragraphs,
    }))
}

export default async function EducationalBusPage() {
  const [circuitItems, settings, idioma] = await Promise.all([
    loadCircuitAccordionItems(),
    getEducationalSettings(),
    idiomaActual(),
  ])
  const requestsOpen = settings.publicRequestsEnabled
  return (
    <div className={styles.page} data-modulo="buses">
      <div className="contenedor"><AvisoSinTraducir sinTraducir={idioma !== "es"} /></div>


      <section id="inicio" className={styles.hero}>
        <HeroMedia />
        <div className={styles.heroOverlay} />
        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>Turismo educativo municipal</p>
          <h1 className={styles.heroTitle}>Reservá una experiencia educativa por la ciudad</h1>
          <p className={styles.heroLead}>
            Solicitá un turno institucional para recorrer San Miguel de Tucumán en el Bus Turístico Educativo.
          </p>
          <div className={styles.heroActions}>
            {requestsOpen ? (
              <a className={styles.primaryCta} href="#solicitud">
                Solicitar turno
              </a>
            ) : null}
            <a className={styles.secondaryCta} href="#circuitos">
              Ver circuitos
            </a>
            {requestsOpen ? null : (
              <a className={styles.secondaryCta} href={idioma === "es" ? "/bus-turistico" : idioma === "en" ? "/en/tourist-bus" : "/pt/onibus-turistico"}>
                Ir al Bus Turístico
              </a>
            )}
          </div>
        </div>
      </section>

      <div className={styles.assuranceBar}>
        <span>Servicio educativo municipal</span>
        <strong>
          {requestsOpen
            ? 'Turnos sujetos a cupo, prioridad y disponibilidad'
            : 'Las solicitudes online están momentáneamente deshabilitadas'}
        </strong>
      </div>

      <div className={styles.shell}>
        {requestsOpen ? (
          <section id="solicitud" className={styles.layoutSplit}>
            <EducationalBusRequestForm />
            <aside className={styles.sideStack} id="circuitos">
              <section className={styles.sideCard}>
                <p className={styles.sideTitle}>Antes de enviar</p>
                <ul className={styles.infoList}>
                  <li>Elegí una fecha para ver los turnos disponibles.</li>
                  <li>Completá los datos de contacto.</li>
                  <li>Adjuntá la nota modelo en .docx.</li>
                </ul>
                <a href={educationalBusTemplatePublicPath} download className={styles.templateLink} style={{ marginTop: 18 }}>
                  {educationalBusTemplateLabel}
                </a>
              </section>
              <PriorityNotice />
              <CircuitInfoAccordionGroup items={circuitItems} />
              <section className={styles.sideCard}>
                <p className={styles.sideTitle}>Qué sucede después</p>
                <p className={styles.sideText}>La solicitud será evaluada según cupo, prioridad y disponibilidad. El equipo podrá confirmar, pedir información o proponer otra fecha.</p>
                <p className={styles.sideText}>Si necesitás cancelar un turno confirmado, avisá con 48 horas de anticipación a turismo@smt.gob.ar.</p>
              </section>
            </aside>
          </section>
        ) : (
          <section className={styles.layoutSplit} style={{ gridTemplateColumns: '1fr', maxWidth: 720, margin: '0 auto' }}>
            <section className={styles.sideCard} style={{ textAlign: 'center' }}>
              <p className={styles.sideTitle}>Solicitudes momentáneamente deshabilitadas</p>
              <p className={styles.sideText}>
                El formulario de turnos para escuelas e instituciones no está disponible por estos días. Muy pronto vamos
                a volver a recibir solicitudes online.
              </p>
              <p className={styles.sideText}>
                Por consultas o turnos ya confirmados, escribinos a{' '}
                <a href="mailto:turismo@smt.gob.ar" style={{ color: 'var(--c-azul-700)', fontWeight: 700 }}>
                  turismo@smt.gob.ar
                </a>{' '}
                o acercate a la Oficina de Informes Turísticos (Congreso de Tucumán 141).
              </p>
            </section>
            <aside className={styles.sideStack} id="circuitos">
              <CircuitInfoAccordionGroup items={circuitItems} />
            </aside>
          </section>
        )}
      </div>
    </div>
  )
}
