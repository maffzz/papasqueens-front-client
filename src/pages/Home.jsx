import { useNavigate } from 'react-router-dom'
import { useState } from 'react'

export default function Home() {
  const nav = useNavigate()
  const [hoveredCat, setHoveredCat] = useState(null)
  const [hoveredInsta, setHoveredInsta] = useState(null)

  const categorias = [
    { title: 'Combos familiares', desc: 'Para compartir con toda la familia.', badge: 'Nuevo' },
    { title: 'Alitas & Boneless', desc: 'Crocantes y llenas de sabor.', badge: 'Clásico' },
    { title: 'Papas & acompañantes', desc: 'La base perfecta para cualquier antojo.', badge: 'Favorito' },
    { title: 'Bebidas & postres', desc: 'Completa tu combo como se debe.', badge: 'Dulce final' }
  ]

  const locales = [
    {
      title: 'SEDE BARRANCO (UTEC)',
      address: 'Jr. Medrano Silva 165, Barranco, Lima, Perú',
      phone: '+51 922 972 069',
      schedule: 'Lunes a Domingo\n11:00 — 22:00',
      mapsUrl: 'https://www.google.com/maps?q=Universidad+de+Ingenier%C3%ADa+y+Tecnolog%C3%ADa+UTEC'
    },
    {
      title: 'SEDE PURUCHUCO',
      address: 'Av. Prolongación Javier Prado Este 6860, Ate, Perú',
      phone: '+51 922 972 069',
      schedule: 'Lunes a Domingo\n11:00 — 22:00',
      mapsUrl: 'https://www.google.com/maps?q=Av.+Prolongaci%C3%B3n+Javier+Prado+Este+6860,+Ate,+Per%C3%BA'
    },
    {
      title: 'SEDE VILLA MARÍA',
      address: 'Av. 1 de Mayo, Villa María del Triunfo, Perú',
      phone: '+51 922 972 069',
      schedule: 'Lunes a Domingo\n11:00 — 22:00',
      mapsUrl: 'https://www.google.com/maps?q=Villa+Mar%C3%ADa+del+Triunfo,+Per%C3%BA'
    },
    {
      title: 'SEDE JIRÓN',
      address: 'Jirón de la Unión 1077, Lima, Perú',
      phone: '+51 922 972 069',
      schedule: 'Lunes a Domingo\n11:00 — 22:00',
      mapsUrl: 'https://www.google.com/maps?q=Jir%C3%B3n+de+la+Uni%C3%B3n+1077,+Lima,+Per%C3%BA'
    }
  ]

  return (
    <main style={{ background: '#f8fafc', minHeight: '100vh' }}>
      {/* HERO DE BIENVENIDA */}
      <section style={{
        background: 'linear-gradient(135deg, #03592e 0%, #0f766e 40%, #facc15 100%)',
        color: '#fff',
        padding: '4rem 1.5rem 3rem',
      }}>
        <div className="container" style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '2.5rem', alignItems: 'center' }}>
          <div>
            <p style={{ letterSpacing: '.12em', textTransform: 'uppercase', fontWeight: 600, marginBottom: '.5rem' }}>BIENVENIDO A</p>
            <h1 className="appTitle" style={{ fontSize: '40px', marginBottom: '.5rem' }}>Papas Queen&apos;s Delivery</h1>
            <p style={{ fontSize: '16px', maxWidth: '520px', lineHeight: 1.7 }}>
              Pide tus combos favoritos, papas crocantes y alitas recién salidas de la cocina.
              Elige tu sede más cercana y disfruta sin salir de casa.
            </p>
            <div style={{ marginTop: '1.75rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button
                className="btn primary"
                style={{ padding: '.9rem 1.8rem', fontSize: '16px' }}
                onClick={() => nav('/menu')}
              >
                Ver menú y ordenar
              </button>
              <button
                className="btn"
                style={{ padding: '.9rem 1.8rem', fontSize: '16px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.4)' }}
                onClick={() => {
                  const el = document.getElementById('pq-locales');
                  if (el) el.scrollIntoView({ behavior: 'smooth' })
                }}
              >
                Ver locales
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ background: '#fff', borderRadius: '1rem', padding: '1rem', color: '#0f172a', boxShadow: '0 18px 45px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#16a34a' }}>SÚPER COMBOS</div>
              <div style={{ fontSize: '18px', fontWeight: 700 }}>Para 2, 4 o más personas</div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>Arma tu combo con papas, alitas, bebidas y salsas.</div>
              <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '.25rem' }}>
                Desde <span style={{ color: '#b91c1c', fontSize: '18px' }}>S/ 34.90</span>
              </div>
              {/* Imagen de ejemplo desde el bucket de menú */}
              <div style={{ borderRadius: '.75rem', overflow: 'hidden', marginTop: '.25rem' }}>
                <img
                  src="https://papasqueens-menu-image.s3.amazonaws.com/combo-express-1-persona.jpg"
                  alt="Combo Papas Queen's"
                  style={{ width: '100%', height: '140px', objectFit: 'cover', display: 'block' }}
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr', gap: '1rem' }}>
              <div style={{ background: '#f97316', borderRadius: '1rem', padding: '.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fff' }}>
                <div>
                  <div style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '.08em' }}>PROMO DEL DÍA</div>
                  <div style={{ fontSize: '16px', fontWeight: 700 }}>Alitas + papas + bebida</div>
                  <div style={{ fontSize: '12px' }}>Solo por hoy</div>
                </div>
                <div style={{ fontSize: '40px' }}>🍗</div>
              </div>
              <div style={{ background: '#fff', borderRadius: '1rem', padding: '.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#0f172a' }}>
                <div>
                  <div style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '.08em', color: '#16a34a' }}>DELIVERY</div>
                  <div style={{ fontSize: '16px', fontWeight: 700 }}>Cobertura por zonas</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>Elige tu sede según tu distrito.</div>
                </div>
                <div style={{ fontSize: '40px' }}>🛵</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECCIÓN DE CATEGORÍAS / COMBOS */}
      <section style={{ padding: '3rem 1.5rem 1rem', background: '#f8fafc' }}>
        <div className="container" style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <header style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <h2 className="appTitle" style={{ color: '#03592e', marginBottom: '.5rem' }}>Elige cómo quieres disfrutar</h2>
            <p style={{ color: '#64748b', fontSize: '14px' }}>Explora nuestras categorías y luego entra al menú completo para ver todos los productos.</p>
          </header>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: '1rem' }}>
            {categorias.map(cat => (
              <button
                key={cat.title}
                className="card"
                style={{
                  textAlign: 'left',
                  cursor: 'pointer',
                  borderTop: '4px solid #16a34a',
                  transform: hoveredCat === cat.title ? 'scale(1.03)' : 'scale(1)',
                  transition: 'transform 0.18s ease-out'
                }}
                onMouseEnter={() => setHoveredCat(cat.title)}
                onMouseLeave={() => setHoveredCat(null)}
                onClick={() => nav('/menu')}
              >
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#16a34a', marginBottom: '.35rem' }}>{cat.badge}</div>
                <div style={{ fontWeight: 700, marginBottom: '.35rem' }}>{cat.title}</div>
                <div style={{ fontSize: '13px', color: '#64748b' }}>{cat.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* FRANJA DE LOCALES */}
      <section id="pq-locales" style={{ padding: '3rem 1.5rem', background: '#fff', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
        <div className="container" style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h2 className="appTitle" style={{ color: '#03592e', marginBottom: '.5rem' }}>ENCUÉNTRANOS EN NUESTROS LOCALES</h2>
            <p style={{ color: '#64748b', fontSize: '14px' }}>Visítanos y disfruta del auténtico sabor de Papas Queen&apos;s.</p>
          </header>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: '1.25rem' }}>
            {locales.map(loc => (
              <div key={loc.title} className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '.35rem' }}>
                <div style={{ fontWeight: 700, color: '#03592e', marginBottom: '.25rem' }}>{loc.title}</div>
                <div style={{ fontSize: '13px', color: '#64748b' }}>{loc.address}</div>
                <div style={{ fontSize: '13px', color: '#0f172a', marginTop: '.25rem' }}>📞 {loc.phone}</div>
                <div style={{ fontSize: '13px', color: '#64748b', whiteSpace: 'pre-line' }}>🕒 {loc.schedule}</div>
                <button
                  className="btn primary"
                  style={{ marginTop: '.75rem', width: '100%' }}
                  onClick={() => window.open(loc.mapsUrl, '_blank')}
                >
                  Ver en Google Maps
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FRANJA INSTAGRAM / SOCIAL */}
      <section style={{ padding: '3rem 1.5rem 4rem', background: '#f8fafc' }}>
        <div className="container" style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <header style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <h2 className="appTitle" style={{ color: '#03592e', marginBottom: '.25rem' }}>SÍGUENOS EN INSTAGRAM</h2>
            <p style={{ color: '#16a34a', fontWeight: 600 }}>@papasqueensoficial</p>
          </header>
          <div className="grid" style={{ gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
            {[
              'https://papasqueens-menu-image.s3.amazonaws.com/alitas-x-10-und.jpg',
              'https://papasqueens-menu-image.s3.amazonaws.com/combo-express-1-persona.jpg',
              'https://papasqueens-menu-image.s3.amazonaws.com/burger-clasica.jpg',
              'https://papasqueens-menu-image.s3.amazonaws.com/salchiqueens-especial-premium.jpg',
            ].map((src, idx) => (
              <div
                key={idx}
                className="card"
                style={{
                  padding: 0,
                  overflow: 'hidden',
                  borderRadius: '.75rem',
                  height: '180px',
                  background: '#111827',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: hoveredInsta === idx ? 'scale(1.03)' : 'scale(1)',
                  transition: 'transform 0.18s ease-out'
                }}
                onMouseEnter={() => setHoveredInsta(idx)}
                onMouseLeave={() => setHoveredInsta(null)}
              >
                <img
                  src={src}
                  alt="Papas Queen's Instagram"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center' }}>
            <a
              href="https://www.instagram.com/papasqueensoficial"
              target="_blank"
              rel="noreferrer"
              className="btn primary"
              style={{ padding: '.8rem 2.4rem', fontSize: '15px' }}
            >
              Ver más en Instagram
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
