import React, { useEffect, useState } from 'react'
import BodegaCard from '../../Cards/BodegaCard/BodegaCard'
import TailSpin from 'react-loading-icons/dist/esm/components/tail-spin'
import { getBodegas } from '../../../services/bodegasServices'
//import getBodega from '../../../services/bodegasServices'

const BodegasList = () => {
  const [bodegas, setBodegas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)


  const getBodegasList = async ()=>{
    setLoading(true)
    setTimeout(
      async () => {
    const bodegas_list_response = await getBodegas()
    if(bodegas_list_response){
    setBodegas(bodegas_list_response)
    }
    else{
      setError('Error al obtener eventos')
    }
    setLoading(false)
      },
      2000
    )
  }
  useEffect(
    ()=>{
      getBodegasList()
    },
    []
  )
  
  const bodegas_componente = bodegas.map(
  (bodega)=>{
    return <BodegaCard {...bodega} 
    key={bodega.id}
    />

            }
  )

  let content

  if(loading){
    content= <h1>{<TailSpin/>}</h1>
  }
  else{
    if(error){
      content = <h2>{error}</h2>
    }
    else{
      content =(
        <div className='list-grid'>
                 {bodegas_componente}
        </div>
        )
    }
  }
  return (
    <div>
      {content}
    </div>
  )
}

export default BodegasList