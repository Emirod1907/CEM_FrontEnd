import React, { useEffect, useRef, useState } from 'react'
import { createPolotnoApp } from 'polotno'
import 'polotno/polotno.blueprint.css'
import { FiX, FiDownload } from 'react-icons/fi'
import './PolotnoDesigner.css'

const POLOTNO_KEY = import.meta.env.VITE_POLOTNO_KEY || 'nFA5H9elEytDyPyvKL7T'

const PRESETS = [
    { label: 'Portada evento',     w: 1200, h: 630  },
    { label: 'Story vertical',     w: 1080, h: 1920 },
    { label: 'Post cuadrado',      w: 1080, h: 1080 },
    { label: 'Tarjeta invitación', w: 1050, h: 750  },
]

const PolotnoDesigner = ({ onFile, onClose }) => {
    const containerRef            = useRef(null)
    const appRef                  = useRef(null)
    const [preset, setPreset]     = useState(0)
    const [listo, setListo]       = useState(false)
    const [exportando, setExportando] = useState(false)

    useEffect(() => {
        // containerRef.current debe estar vacío — React NO debe renderizar
        // nada dentro de él. Polotno crea su propio ReactDOM.createRoot ahí.
        if (!containerRef.current) return

        let app
        try {
            app = createPolotnoApp({
                container:  containerRef.current,
                key:        POLOTNO_KEY,
                showCredit: true,
            })
            appRef.current = app
        } catch (err) {
            console.error('Error iniciando Polotno:', err)
            return
        }

        // Dar tiempo a que Polotno termine de pintar antes de mostrar el editor
        const t = setTimeout(() => {
            try {
                const { w, h } = PRESETS[0]
                app.store.activePage?.set({ width: w, height: h })
            } catch {}
            setListo(true)
        }, 600)

        return () => {
            clearTimeout(t)
            try { app.destroy() } catch {}
        }
    }, [])

    const handlePreset = (idx) => {
        setPreset(idx)
        const { w, h } = PRESETS[idx]
        try { appRef.current?.store?.activePage?.set({ width: w, height: h }) } catch {}
    }

    const handleExportar = async () => {
        const store = appRef.current?.store
        if (!store) return
        setExportando(true)
        try {
            const dataUrl = await store.toDataURL({ mimeType: 'image/png', pixelRatio: 2 })
            const res  = await fetch(dataUrl)
            const blob = await res.blob()
            const file = new File([blob], 'portada-evento.png', { type: 'image/png' })
            onFile(file)
            onClose()
        } catch (err) {
            console.error('Error exportando:', err)
            alert('No se pudo exportar. Intentá de nuevo.')
        } finally {
            setExportando(false)
        }
    }

    return (
        <div className='pld-overlay'>
            <div className='pld-modal'>

                {/* ── Barra superior ── */}
                <div className='pld-topbar'>
                    <div className='pld-topbar-left'>
                        <span className='pld-topbar-title'>🎨 Diseñador de imagen</span>
                        <div className='pld-presets'>
                            {PRESETS.map((p, i) => (
                                <button
                                    key={i}
                                    type='button'
                                    className={`pld-preset-btn ${preset === i ? 'pld-preset-btn--active' : ''}`}
                                    onClick={() => handlePreset(i)}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className='pld-topbar-right'>
                        <button
                            type='button'
                            className='pld-btn-usar'
                            onClick={handleExportar}
                            disabled={exportando || !listo}
                        >
                            {exportando
                                ? <><span className='pld-spinner'/> Exportando…</>
                                : <><FiDownload size={15}/> Usar esta imagen</>
                            }
                        </button>
                        <button type='button' className='pld-btn-cerrar' onClick={onClose}>
                            <FiX size={20}/>
                        </button>
                    </div>
                </div>

                {/* ── Área del editor ── */}
                <div className='pld-editor-area'>
                    {/*
                      * Este div es el container de Polotno.
                      * NO debe tener hijos React — Polotno lo gestiona solo.
                      * Siempre renderizado (aunque oculto) para que tenga dimensiones.
                      */}
                    <div
                        ref={containerRef}
                        className='pld-editor-wrap'
                        style={{ visibility: listo ? 'visible' : 'hidden' }}
                    />

                    {/* Loading overlay encima — es un sibling, no un hijo del container */}
                    {!listo && (
                        <div className='pld-loading-overlay'>
                            <span className='pld-spinner pld-spinner--lg'/>
                            <p>Cargando editor de diseño…</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    )
}

export default PolotnoDesigner
