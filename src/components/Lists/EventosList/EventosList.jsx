import React, { useEffect, useState } from 'react'
import EventoCard from '../../Cards/EventoCard/EventoCard'
import getEvents from '../../../services/eventosServices'
import TailSpin from 'react-loading-icons/dist/esm/components/tail-spin'
import '../Lists.css'

const EventosList = () => {
  const [eventos, setEventos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const getEventList = async ()=>{
    setLoading(true)
    setTimeout(
      async () => {
    const eventos_list_response = await getEvents()
    if(eventos_list_response){
    setEventos(eventos_list_response)
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
      getEventList()
    },
    []
  )

  const events = eventos.map(
  (evento)=>{
    return <EventoCard {...evento} key={evento.id_evento}/>
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
      content = (
        <div className='list-grid'>
                 {events}
        </div>)
    }
  }
  return (
    <div>
      {content}
    </div>
  )
}

export default EventosList