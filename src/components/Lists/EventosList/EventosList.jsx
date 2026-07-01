import React, { useEffect, useState } from 'react'
import EventoCard from '../../Cards/EventoCard/EventoCard'
import getEvents from '../../../services/eventosServices'
import TailSpin from 'react-loading-icons/dist/esm/components/tail-spin'
import CompareBar from '../../CompareBar/CompareBar'
import '../Lists.css'
import { useTour } from '../../../hooks/useTour'


const EventosList = () => {
  
  const [eventos, setEventos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const { startTour } = useTour();

  const eventListTour = [
    {
      element: '#event-list',
      popover: {
        title: 'Lista de Eventos',
        description: 'Aquí verás todos tus eventos creados.',
        side: "bottom",
        align: 'start'
      }
    },
    {
      element: 'a[href="/eventos/new"]',
      popover: {
        title: 'Crear Evento',
        description: 'Haz clic aquí para crear un nuevo evento. Para utilizar esta función debes haberte logueado previamente',
        side: "bottom",
        align: 'start'
      }
    },
    {
      element: 'a[href="/salones/new"]',
      popover: {
        title: 'Crear Salón',
        description: 'Haz clic aquí para crear un nuevo salón. Para ello debes estar logueado',
        side: "bottom",
        align: 'start'
      }
    },    
    {
      element: 'a[href="/login"]',
      popover: {
        title: 'Login',
        description: 'Haz clic aquí para Iniciar sesión. Para iniciar sesión, debes haberte registrado previamente',
        side: "bottom", 
        align: 'start'
      }
    },
        {
      element: 'a[href="/register"]',
      popover: {
        title: 'Registrate',
        description: 'Haz clic aquí para registrarte.',
        side: "bottom", 
        align: 'start'
      }
    }
  ];


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
      <button
        onClick={() => startTour(eventListTour)}
        style={{
          background: '#007bff',
          color: 'white',
          border: 'none',
          padding: '10px 15px',
          borderRadius: '5px',
          cursor: 'pointer',
          margin: '80px 20px 20px 20px'
        }}
      >
        🎓 Iniciar Tutorial
      </button>
      {content}
      <CompareBar tipo='eventos' />
    </div>
  )
}

export default EventosList