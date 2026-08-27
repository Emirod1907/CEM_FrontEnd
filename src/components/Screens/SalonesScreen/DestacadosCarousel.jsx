import React, { useEffect, useRef } from 'react'
import { FiStar, FiChevronLeft, FiChevronRight } from 'react-icons/fi'

const precioDe = (s) => Number(s.precio_publico ?? s.precio_alquiler) || 0

// Carrusel de salones destacados: cards chicas (nombre + precio + descuento),
// auto-deslizante y secuencial (una card a la vez), con pausa al pasar el mouse.
const DestacadosCarousel = ({ salones, onVer }) => {
    const trackRef = useRef(null)

    const desplazar = (dir) => {
        const track = trackRef.current
        if (!track) return
        const card = track.querySelector('.sal-dest-card')
        const step = card ? card.offsetWidth + 12 : 180
        track.scrollBy({ left: dir * step, behavior: 'smooth' })
    }

    useEffect(() => {
        const track = trackRef.current
        if (!track || salones.length <= 1) return
        let pausado = false
        const enter = () => { pausado = true }
        const leave = () => { pausado = false }
        track.addEventListener('mouseenter', enter)
        track.addEventListener('mouseleave', leave)

        const id = setInterval(() => {
            if (pausado) return
            const card = track.querySelector('.sal-dest-card')
            const step = card ? card.offsetWidth + 12 : 180
            const max = track.scrollWidth - track.clientWidth
            if (track.scrollLeft >= max - 6) track.scrollTo({ left: 0, behavior: 'smooth' })
            else track.scrollBy({ left: step, behavior: 'smooth' })
        }, 2600)

        return () => {
            clearInterval(id)
            track.removeEventListener('mouseenter', enter)
            track.removeEventListener('mouseleave', leave)
        }
    }, [salones.length])

    if (salones.length === 0) return null

    return (
        <section className='sal-destacados'>
            <div className='sal-destacados-head'>
                <h3><FiStar size={15} /> Salones destacados</h3>
                <div className='sal-destacados-nav'>
                    <button onClick={() => desplazar(-1)} aria-label='Anterior'><FiChevronLeft size={18} /></button>
                    <button onClick={() => desplazar(1)} aria-label='Siguiente'><FiChevronRight size={18} /></button>
                </div>
            </div>

            <div className='sal-dest-track' ref={trackRef}>
                {salones.map(s => (
                    <button className='sal-dest-card' key={s.id_bodega} onClick={() => onVer(s)} title={s.nombre}>
                        {s.imagen && <img src={s.imagen} alt={s.nombre} className='sal-dest-img' loading='lazy' />}
                        <div className='sal-dest-body'>
                            <span className='sal-dest-nombre'>{s.nombre}</span>
                            <div className='sal-dest-precio-row'>
                                <span className='sal-dest-precio'>${precioDe(s).toLocaleString('es-AR')}</span>
                                {Number(s.descuento) > 0 && <span className='sal-dest-desc'>-{Number(s.descuento)}%</span>}
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </section>
    )
}

export default DestacadosCarousel
