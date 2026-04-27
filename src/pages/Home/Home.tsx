// filepath: src/pages/Home/Home.tsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PropertyCard } from '../../components/PropertyCard'
import { getFeaturedProperties } from '../../features/properties/services/propertyService'
import { Property } from '../../features/properties/types/property'

export const Home = () => {
  const [featuredProperties, setFeaturedProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadProperties = async () => {
      try {
        const properties = await getFeaturedProperties()
        setFeaturedProperties(properties)
      } catch (error) {
        console.error('Error loading properties:', error)
      } finally {
        setLoading(false)
      }
    }
    loadProperties()
  }, [])

  return (
    <div className="home-page">
      <section className="hero">
        <div className="hero-content">
          <h1>Encuentra tu propiedad ideal</h1>
          <p>Las mejores casas, apartamentos y terrenos en un solo lugar</p>
          <Link to="/catalog" className="btn-primary">
            Ver Catálogo
          </Link>
        </div>
      </section>

      <section className="featured-section">
        <h2>Propiedades Destacadas</h2>
        {loading ? (
          <p>Cargando...</p>
        ) : featuredProperties.length > 0 ? (
          <div className="properties-grid">
            {featuredProperties.map(property => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        ) : (
          <p>No hay propiedades disponibles</p>
        )}
        <div className="section-cta">
          <Link to="/catalog" className="btn-secondary">
            Ver todas las propiedades
          </Link>
        </div>
      </section>

      <section className="categories-section">
        <h2>Explora por tipo</h2>
        <div className="categories-grid">
          <Link to="/catalog?propertyType=house" className="category-card">
            <h3>Casas</h3>
            <p>Encuentra casas amplias y cómodas</p>
          </Link>
          <Link to="/catalog?propertyType=apartment" className="category-card">
            <h3>Apartamentos</h3>
            <p>Departamentos en zonas ideales</p>
          </Link>
          <Link to="/catalog?propertyType=land" className="category-card">
            <h3>Terrenos</h3>
            <p>Lotes para construir tu sueño</p>
          </Link>
          <Link to="/catalog?propertyType=commercial" className="category-card">
            <h3>Comercial</h3>
            <p>Locales y oficinas comerciales</p>
          </Link>
        </div>
      </section>
    </div>
  )
}