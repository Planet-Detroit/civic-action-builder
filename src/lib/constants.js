export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
export const API_KEY = import.meta.env.VITE_API_KEY || ''

// Issue to agency mapping for meeting suggestions
export const ISSUE_TO_AGENCY = {
  'energy': ['MPSC'],
  'dte_energy': ['MPSC'],
  'consumers_energy': ['MPSC'],
  'utilities': ['MPSC'],
  'rates': ['MPSC'],
  'data_centers': ['MPSC', 'EGLE'],
  'air_quality': ['EGLE', 'EPA'],
  'drinking_water': ['EGLE', 'EPA', 'GLWA'],
  'water_quality': ['EGLE', 'GLWA'],
  'infrastructure': ['GLWA', 'Detroit City Council'],
  'climate': ['EGLE', 'MPSC'],
  'environmental_justice': ['EGLE', 'EPA', 'Detroit City Council'],
  'detroit': ['Detroit City Council'],
  'local_government': ['Detroit City Council'],
  'housing': ['Detroit City Council'],
  'development': ['Detroit City Council'],
  'public_health': ['Detroit City Council'],
  'public_safety': ['Detroit City Council'],
  'community': ['Detroit City Council'],
  'pfas': ['EGLE', 'EPA'],
  'permitting': ['EGLE'],
}
