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
    content = <div className='list-state list-state--loading'><TailSpin stroke='#ffffff'/> <span>Cargando eventos...</span></div>
  }
  else{
    if(error){
      content = <div className='list-state list-state--error'>{error}</div>
    }
    else{
      content = (
        <div className='list-grid'>
                 {events}
        </div>)
    }
  }
  return (
    <section className='eventos-list-page' id='event-list'>
      <div className='list-toolbar'>
        <div>
          <p className='list-kicker'>Dream Events</p>
          <h1 className='list-title'>Eventos disponibles</h1>
        </div>
        <button
          onClick={() => startTour(eventListTour)}
          className='tutorial-btn'
        >
          🎓 Iniciar tutorial
        </button>
      </div>
      {content}
      <CompareBar tipo='eventos' />
    </section>
  )
}

export default EventosList