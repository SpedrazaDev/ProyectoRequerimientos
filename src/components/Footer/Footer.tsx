// filepath: src/components/Footer/Footer.tsx
import { Link } from 'react-router-dom'

export const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-section">
          <h3>BienesRaíces</h3>
          <p>Encuentra tu propiedad ideal</p>
        </div>
        <div className="footer-section">
          <h4>Enlaces</h4>
          <ul>
            <li><Link to="/">Inicio</Link></li>
            <li><Link to="/catalog">Catálogo</Link></li>
          </ul>
        </div>
        <div className="footer-section">
          <h4>Contacto</h4>
          <p>Email: info@bienesraices.com</p>
          <p>Teléfono: +123 456 7890</p>
        </div>
      </div>
      <div className="footer-bottom">
        <p>&copy; 2026 BienesRaíces. Todos los derechos reservados.</p>
      </div>
    </footer>
  )
}