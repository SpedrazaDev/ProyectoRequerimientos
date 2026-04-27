// filepath: src/features/properties/services/propertyService.ts
import { 
  collection, 
  getDocs, 
  addDoc, 
  doc, 
  getDoc, 
  query, 
  where,
  orderBy 
} from 'firebase/firestore'
import { db } from '../../../firebase/firestore'
import { Property, PropertyFilter } from '../types/property'

const propertiesRef = collection(db, 'properties')

export const getProperties = async (filter?: PropertyFilter): Promise<Property[]> => {
  let q = query(propertiesRef, orderBy('createdAt', 'desc'))
  
  if (filter && (filter.type || filter.propertyType || filter.location)) {
    const constraints: any[] = []
    if (filter.type) constraints.push(where('type', '==', filter.type))
    if (filter.propertyType) constraints.push(where('propertyType', '==', filter.propertyType))
    if (filter.location) constraints.push(where('location', '==', filter.location))
    
    q = query(propertiesRef, ...constraints, orderBy('createdAt', 'desc'))
  }
  
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Property))
}

export const getPropertyById = async (id: string): Promise<Property | null> => {
  const docRef = doc(db, 'properties', id)
  const snapshot = await getDoc(docRef)
  
  if (!snapshot.exists()) return null
  
  return {
    id: snapshot.id,
    ...snapshot.data()
  } as Property
}

export const addProperty = async (property: Omit<Property, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const now = new Date()
  const docRef = await addDoc(propertiesRef, {
    ...property,
    createdAt: now,
    updatedAt: now
  })
  return docRef.id
}

export const getFeaturedProperties = async (): Promise<Property[]> => {
  const q = query(
    propertiesRef, 
    where('status', '==', 'available'),
    orderBy('createdAt', 'desc')
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.slice(0, 6).map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Property))
}