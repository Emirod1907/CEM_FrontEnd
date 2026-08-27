import React, { useEffect, useRef, useState } from 'react'
import { FiStar, FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import { tienePreciosEspeciales } from '../../../utils/preciosUtils'

const precioDe = (s) => Number(s.precio_publico ?? s.precio_alquiler) || 0

// Carrusel de salones destacados: cards chicas (nombre + precio + descuento),
// auto-deslizante y secuencial. Los puntitos = posiciones REALES de scroll
// (no una por card), así todos se usan y el activo avanza con la secuencia.
const DestacadosCarousel = ({ salones, onVer }) => {
    const trackRef = useRef(null)
    const [activo, setActivo] = useState(0)
    const [dots, setDots] = useState(1)

    const pasoCard = () => {
        const track = trackRef.current
        const card = track?.querySelector('.sal-dest-card')
        return card ? card.offsetWidth + 12 : 180
    }

    // Cantidad de puntitos = cantidad de posiciones de inicio alcanzables
    const recomputar = () => {
        const track = trackRef.current
        if (!track) return
        const paso = pasoCard()
        const maxScroll = track.scrollWidth - track.clientWidth
        const n = maxScroll <= 4 ? 1 : Math.round(maxScroll / paso) + 1
        setDots(n)
        setActivo(Math.min(Math.round(track.scrollLeft / paso), Math.max(0, n - 1)))
    }

    const irA = (i) => {
        const track = trackRef.current
        if (track) track.scrollTo({ left: i * pasoCard(), behavior: 'smooth' })
    }

    const desplazar = (dir) => {
        const track = trackRef.current
        if (track) track.scrollBy({ left: dir * pasoCard(), behavior: 'smooth' })
    }

    const onScroll = () => {
        const track = trackRef.current
        if (!track) return
        setActivo(Math.min(Math.round(track.scrollLeft / pasoCard()), Math.max(0, dots - 1)))
    }

    // Recalcular puntitos al montar, al cambiar los salones, al reajustar layout
    useEffect(() => {
        recomputar()
        const onResize = () => recomputar()
        window.addEventListener('resize', onResize)
        const t = setTimeout(recomputar, 400) // tras cargar imágenes
        return () => { window.removeEventListener('resize', onResize); clearTimeout(t) }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [salones.length])

    // Auto-slide secuencial (pausa al pasar el mouse)
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
            const max = track.scrollWidth - track.clientWidth
            if (track.scrollLeft >= max - 6) track.scrollTo({ left: 0, behavior: 'smooth' })
            else track.scrollBy({ left: pasoCard(), behavior: 'smooth' })
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

            <div className='sal-dest-track' ref={trackRef} onScroll={onScroll}>
                {salones.map(s => (
                    <button className='sal-dest-card' key={s.id_bodega} onClick={() => onVer(s)} title={s.nombre}>
                        {s.imagen && <img src={s.imagen} alt={s.nombre} className='sal-dest-img' loading='lazy' />}
                        <div className='sal-dest-body'>
                            <span className='sal-dest-nombre'>
                                {s.nombre}
                                {tienePreciosEspeciales(s.precios_config) && <span className='sal-dest-oferta'>Oferta</span>}
                            </span>
                            <div className='sal-dest-precio-row'>
                                <span className='sal-dest-precio'>${precioDe(s).toLocaleString('es-AR')}</span>
                                {Number(s.descuento) > 0 && <span className='sal-dest-desc'>-{Number(s.descuento)}%</span>}
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            {dots > 1 && (
                <div className='sal-dest-dots'>
                    {Array.from({ length: dots }).map((_, i) => (
                        <button
                            key={i}
                            className={`sal-dest-dot ${i === activo ? 'activo' : ''}`}
                            onClick={() => irA(i)}
                            aria-label={`Posición ${i + 1}`}
                        />
                    ))}
                </div>
            )}
        </section>
    )
}

export default DestacadosCarousel
