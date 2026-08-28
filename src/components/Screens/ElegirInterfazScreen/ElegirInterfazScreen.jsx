import React from 'react'
import { useNavigate } from 'react-router-dom'
import { FiGrid, FiMessageSquare, FiArrowRight } from 'react-icons/fi'
import './ElegirInterfazScreen.css'

// Pantalla que se muestra al organizador al iniciar sesión: elige con qué
// experiencia quiere organizar su evento.
const ElegirInterfazScreen = () => {
    const navigate = useNavigate()

    const elegir = (dest) => {
        localStorage.setItem('cem_interfaz_organizador', dest)
        navigate(dest)
    }

    return (
        <div className='ei-page'>
            <div className='ei-header'>
                <h1>¿Cómo querés organizar tu evento?</h1>
                <p>Elegí la experiencia que más te guste. Podés cambiarla cuando quieras.</p>
            </div>

            <div className='ei-opciones'>
                <button className='ei-op' onClick={() => elegir('/salones')}>
                    <div className='ei-op-icono ei-op-icono--clasica'><FiGrid size={30} /></div>
                    <h2>Vista clásica</h2>
                    <p>Explorá los salones, filtrá y armá tu evento paso a paso con el catálogo y los formularios de siempre.</p>
                    <span className='ei-cta'>Usar vista clásica <FiArrowRight size={15} /></span>
                </button>

                <button className='ei-op ei-op--asistente' onClick={() => elegir('/asistente')}>
                    <span className='ei-badge'>Nuevo</span>
                    <div className='ei-op-icono ei-op-icono--asistente'><FiMessageSquare size={30} /></div>
                    <h2>Asistente</h2>
                    <p>Un asistente te va preguntando (tipo de evento, fecha, invitados) y te arma <strong>paquetes listos</strong> — Económica, Estándar, Plus y Premium — para elegir y comprar.</p>
                    <span className='ei-cta'>Usar el asistente <FiArrowRight size={15} /></span>
                </button>
            </div>
        </div>
    )
}

export default ElegirInterfazScreen
