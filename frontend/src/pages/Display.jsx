import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../api/axios'

function Display() {
  const [searchParams] = useSearchParams()
  const displayId = searchParams.get('display') || '1'

  useEffect(() => {
    const beat = () => {
      api.post(`/screens/${displayId}/ping`).catch(console.error)
    }
    beat()
    const interval = setInterval(beat, 15000)
    return () => clearInterval(interval)
  }, [displayId])

  return (
    <div>
      <h1>Menu Board</h1>
      <p>Affichage du menu digital</p>
    </div>
  )
}

export default Display
