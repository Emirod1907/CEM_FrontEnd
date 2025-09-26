import React, { useEffect, useState } from 'react'
import BodegaCard from '../../Cards/BodegaCard/BodegaCard'
import TailSpin from 'react-loading-icons/dist/esm/components/tail-spin'
import { getBodegas } from '../../../services/bodegasServices'
//import getBodega from '../../../services/bodegasServices'
import '../Lists.css'

const BodegasList = ({searchTerm, onSelectBodega}) => {
  const [bodegas, setBodegas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [filteredBodegas, setFilteredBodegas] = useState([])

useEffect(() => {
        const fetchBodegas = async () => {
            setLoading(true)
            try {
                console.log('📡 Obteniendo bodegas del backend...')
                const bodegasData = await getBodegas() // ✅ FINALMENTE se ejecuta getBodegas
                console.log('✅ Bodegas obtenidas:', bodegasData)
                
                if (bodegasData && Array.isArray(bodegasData)) {
                    setBodegas(bodegasData)
                    setFilteredBodegas(bodegasData)
                } else {
                    setError('No se pudieron cargar las bodegas')
                }
            } catch (err) {
                console.error('❌ Error al obtener bodegas:', err)
                setError('Error al cargar las bodegas: ' + err.message)
            } finally {
                setLoading(false)
            }
        }

        fetchBodegas()
    }, [])


    useEffect(() => {
        if (searchTerm) {
            const filtered = bodegas.filter(bodega =>
                bodega.nombre.toLowerCase().includes(searchTerm.toLowerCase())
            )
            setFilteredBodegas(filtered)
        } else {
            setFilteredBodegas(bodegas)
        }
    }, [searchTerm, bodegas])
  
  const bodegas_componente = filteredBodegas.map(
  (bodega)=>{
    return <BodegaCard {...bodega} 
    key={bodega.id_bodega}
    onSelect={onSelectBodega}
    />

            }
  )

  let content

  if(loading){
    content= <h1>{<TailSpin/>} Cargando Bodegas...</h1>
  }
  else if(error){
      content = <h2>{error}</h2>
    }
    else if (filteredBodegas.length === 0) {
        content = <div className="no-results">
            {searchTerm ? 'No se encontraron bodegas con ese nombre' : 'No hay bodegas disponibles'}
        </div>}
    else{
      content =(
        <div className='list-grid'>
                 {bodegas_componente}
        </div>
        )
  }
  return (
    <div>
      {content}
    </div>
  )
}

export default BodegasList