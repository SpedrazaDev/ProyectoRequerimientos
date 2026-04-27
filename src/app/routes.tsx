// filepath: src/app/routes.tsx
import { createBrowserRouter } from 'react-router-dom'
import { Home } from '../pages/Home'
import { Catalog } from '../pages/Catalog'
import { PropertyDetail } from '../pages/PropertyDetail'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />
  },
  {
    path: '/catalog',
    element: <Catalog />
  },
  {
    path: '/property/:id',
    element: <PropertyDetail />
  }
])