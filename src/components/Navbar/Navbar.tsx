// filepath: src/components/Navbar/Navbar.tsx
import { Link } from 'react-router-dom'

export const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          BienesRaíces
        </Link>
        <ul className="navbar-menu">
          <li><Link to="/">Inicio</Link></li>
          <li><Link to="/catalog">Catálogo</Link></li>
          <li><Link to="/catalog?type=sale">Venta</Link></li>
          <li><Link to="/catalog?type=rent">Alquiler</Link></li>
        </ul>
      </div>
    </nav>
  )
}