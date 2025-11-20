import { useMemo } from 'react'

export default function Locales() {
  const locales = useMemo(() => ([
    {
      id: 'barranco',
      title: 'SEDE BARRANCO (UTEC)',
      district: 'Barranco',
      address: 'Jr. Medrano Silva 165, Barranco, Lima, Perú',
      phone: '+51 922 972 069',
      schedule: 'Lunes a Domingo\n11:00 — 22:00',
      mapsUrl: 'https://www.google.com/maps?q=Universidad+de+Ingenier%C3%ADa+y+Tecnolog%C3%ADa+UTEC'
    },
    {
      id: 'puruchuco',
      title: 'SEDE PURUCHUCO',
      district: 'Ate',
      address: 'Av. Prolongación Javier Prado Este 6860, Ate, Perú',
      phone: '+51 922 972 069',
      schedule: 'Lunes a Domingo\n11:00 — 22:00',
      mapsUrl: 'https://www.google.com/maps?q=Av.+Prolongaci%C3%B3n+Javier+Prado+Este+6860,+Ate,+Per%C3%BA'
    },
    {
      id: 'villa-maria',
      title: 'SEDE VILLA MARÍA',
      district: 'Villa María del Triunfo',
      address: 'Av. 1 de Mayo, Villa María del Triunfo, Perú',
      phone: '+51 922 972 069',
      schedule: 'Lunes a Domingo\n11:00 — 22:00',
      mapsUrl: 'https://www.google.com/maps?q=Villa+Mar%C3%ADa+del+Triunfo,+Per%C3%BA'
    },
    {
      id: 'jiron',
      title: 'SEDE JIRÓN',
      district: 'Centro de Lima',
      address: 'Jirón de la Unión 1077, Lima, Perú',
      phone: '+51 922 972 069',
      schedule: 'Lunes a Domingo\n11:00 — 22:00',
      mapsUrl: 'https://www.google.com/maps?q=Jir%C3%B3n+de+la+Uni%C3%B3n+1077,+Lima,+Per%C3%BA'
    }
  ]), [])

  return (
    <main style={{ background: '#f8fafc', minHeight: '100vh' }}>
      <section style={{ padding: '3rem 1.5rem 1.5rem', background: '#03592e', color: '#fff' }}>
        <div className="container" style={{ maxWidth: '960px', margin: '0 auto' }}>
          <h1 className="appTitle" style={{ fontSize: '32px', marginBottom: '.5rem' }}>Nuestros locales</h1>
          <p style={{ maxWidth: '620px', fontSize: '14px', lineHeight: 1.7 }}>
            Elige la sede Papas Queen&apos;s más cercana, revisa el horario de atención y abre la ruta en Google Maps para venir en persona o verificar la cobertura de delivery.
          </p>
        </div>
      </section>

      <section style={{ padding: '2rem 1.5rem 3rem' }}>
        <div className="container" style={{ maxWidth: '960px', margin: '0 auto' }}>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1.25rem' }}>
            {locales.map(loc => (
              <article key={loc.id} className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
                <header>
                  <h2 className="appTitle" style={{ fontSize: '18px', marginBottom: '.15rem', color: '#03592e' }}>{loc.title}</h2>
                  <p style={{ fontSize: '12px', color: '#16a34a', textTransform: 'uppercase' }}>{loc.district}</p>
                </header>
                <p style={{ fontSize: '13px', color: '#475569' }}>{loc.address}</p>
                <p style={{ fontSize: '13px', color: '#0f172a', marginTop: '.25rem' }}>📞 {loc.phone}</p>
                <p style={{ fontSize: '13px', color: '#64748b', whiteSpace: 'pre-line' }}>🕒 {loc.schedule}</p>
                <button
                  className="btn primary"
                  style={{ marginTop: '.75rem', width: '100%' }}
                  onClick={() => window.open(loc.mapsUrl, '_blank')}
                >
                  Ver ruta en Google Maps
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
