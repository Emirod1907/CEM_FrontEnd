/**
 * CanvaModal — integración con Canva Design Button SDK.
 *
 * Flujo:
 *  1. El usuario abre este modal.
 *  2. Hacemos clic en "Abrir editor de Canva".
 *  3. El SDK de Canva abre un popup controlado (no una pestaña nueva).
 *  4. El usuario diseña y publica desde el popup de Canva.
 *  5. El SDK dispara onDesignPublish({ exportUrl }) y llamamos a onUrl(exportUrl).
 *
 * Requiere:
 *   VITE_CANVA_API_KEY en el .env del frontend
 *
 * Props:
 *   tipoEvento   string   — para elegir dimensiones/tipo sugerido
 *   nombreEvento string
 *   onUrl        fn(url)  — imagen publicada en Canva (URL directa)
 *   onFile       fn(File) — fallback: el usuario sube un archivo local
 *   onClose      fn()
 */
import React, { useEffect, useRef, useState } from 'react'
import { FiX, FiUpload, FiImage, FiAlertCircle } from 'react-icons/fi'
import { EMOJI_TIPO } from '../../../utils/eventoUtils'
import './CanvaModal.css'

const CANVA_SDK_SRC = 'https://sdk.canva.com/designbutton/v2/api.js'
const CANVA_API_KEY = import.meta.env.VITE_CANVA_API_KEY || ''

// Tipos de diseño sugeridos según el evento
const DESIGN_TYPE_MAP = {
    'cumpleaños':             'Poster',
    'boda':                   'Poster',
    'quince años':            'Poster',
    'aniversario':            'Poster',
    'graduación':             'Poster',
    'baby shower':            'Poster',
    'bautismo':               'Poster',
    'primera comunión':       'Poster',
    'despedida de soltero/a': 'Poster',
    'corporativo':            'Presentation',
    'reunión':                'Poster',
    'fiesta temática':        'Poster',
    'otro':                   'Poster',
}

const CanvaModal = ({ tipoEvento, nombreEvento, onFile, onUrl, onClose }) => {
    const [fase, setFase]         = useState('init') // init | cargando | listo | abriendo | error | sinkey
    const [errorMsg, setErrorMsg] = useState('')
    const [dragOver, setDragOver] = useState(false)
    const [preview, setPreview]   = useState(null)
    const [archivoNombre, setArchivoNombre] = useState('')
    const apiRef  = useRef(null)
    const fileRef = useRef()

    const tipo  = tipoEvento || 'otro'
    const emoji = EMOJI_TIPO[tipo] || '✨'

    // ── Cargar e inicializar SDK ──────────────────────────────────────────────
    useEffect(() => {
        if (!CANVA_API_KEY) {
            setFase('sinkey')
            return
        }
        // Si el SDK ya está cargado (por otro componente u otra apertura del modal)
        if (window.Canva?.DesignButton) {
            inicializarSdk()
            return
        }
        // Cargar el script
        setFase('cargando')
        const script = document.createElement('script')
        script.src   = CANVA_SDK_SRC
        script.async = true
        script.onload = inicializarSdk
        script.onerror = () => {
            setErrorMsg('No se pudo cargar el SDK de Canva. Verificá tu conexión.')
            setFase('error')
        }
        document.head.appendChild(script)
        // No eliminamos el script al desmontar: el SDK es global y reutilizable
    }, [])

    const inicializarSdk = async () => {
        try {
            setFase('cargando')
            const api = await window.Canva.DesignButton.initialize({ apiKey: CANVA_API_KEY })
            apiRef.current = api
            setFase('listo')
        } catch (err) {
            setErrorMsg(`Error al inicializar Canva: ${err.message || err}`)
            setFase('error')
        }
    }

    // ── Abrir editor de Canva ─────────────────────────────────────────────────
    const handleAbrirCanva = () => {
        if (!apiRef.current || fase !== 'listo') return
        setFase('abriendo')

        apiRef.current.createDesign({
            design: { type: DESIGN_TYPE_MAP[tipo] || 'Poster' },
            onDesignPublish: ({ exportUrl }) => {
                onUrl(exportUrl)
                setFase('listo')
                onClose()
            },
            onDesignClose: () => {
                // El usuario cerró el popup de Canva sin publicar
                setFase('listo')
            },
        })
    }

    // ── Fallback: subir archivo local ─────────────────────────────────────────
    const procesarArchivo = (file) => {
        if (!file || !file.type.startsWith('image/')) return
        setArchivoNombre(file.name)
        const reader = new FileReader()
        reader.onload = (e) => setPreview(e.target.result)
        reader.readAsDataURL(file)
        onFile(file)
    }

    const handleDrop = (e) => {
        e.preventDefault()
        setDragOver(false)
        procesarArchivo(e.dataTransfer.files[0])
    }

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className='cnv-overlay' onClick={onClose}>
            <div className='cnv-modal' onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className='cnv-header'>
                    <div className='cnv-header-left'>
                        <img
                            src='https://static.canva.com/web/images/12487a1e0770d29351bd4ce4f87ec8fe.svg'
                            alt='Canva'
                            className='cnv-logo'
                            onError={e => { e.target.style.display = 'none' }}
                        />
                        <div>
                            <h2>Diseñar con Canva</h2>
                            <span className='cnv-header-hint'>
                                {emoji} Plantillas para <strong>{tipo}</strong>
                                {nombreEvento && ` · "${nombreEvento}"`}
                            </span>
                        </div>
                    </div>
                    <button className='cnv-cerrar' onClick={onClose}><FiX size={20}/></button>
                </div>

                <div className='cnv-body'>

                    {/* Sin API key configurada */}
                    {fase === 'sinkey' && (
                        <div className='cnv-aviso cnv-aviso--warn'>
                            <FiAlertCircle size={20}/>
                            <div>
                                <strong>API key de Canva no configurada</strong>
                                <p>
                                    Para usar el editor integrado, agregá{' '}
                                    <code>VITE_CANVA_API_KEY=tu_clave</code> al archivo{' '}
                                    <code>.env</code> del frontend y reiniciá el servidor.
                                    Podés obtener tu clave en{' '}
                                    <a href='https://www.canva.com/developers/' target='_blank' rel='noopener noreferrer'>
                                        canva.com/developers
                                    </a>.
                                </p>
                                <p>Mientras tanto, subí tu imagen desde Canva usando el área de abajo.</p>
                            </div>
                        </div>
                    )}

                    {/* Error de SDK */}
                    {fase === 'error' && (
                        <div className='cnv-aviso cnv-aviso--error'>
                            <FiAlertCircle size={20}/>
                            <div>
                                <strong>No se pudo conectar con Canva</strong>
                                <p>{errorMsg}</p>
                            </div>
                        </div>
                    )}

                    {/* Cargando SDK */}
                    {fase === 'cargando' && (
                        <div className='cnv-loading'>
                            <div className='cnv-spinner'/>
                            <span>Conectando con Canva…</span>
                        </div>
                    )}

                    {/* SDK listo — botón principal */}
                    {(fase === 'listo' || fase === 'abriendo') && (
                        <div className='cnv-sdk-bloque'>
                            <p className='cnv-sdk-desc'>
                                El editor de Canva se abrirá en un popup. Diseñá tu imagen,
                                luego hacé clic en <strong>"Publicar"</strong> dentro de Canva
                                y la imagen volverá automáticamente al formulario.
                            </p>
                            <button
                                type='button'
                                className={`cnv-btn-sdk ${fase === 'abriendo' ? 'cnv-btn-sdk--loading' : ''}`}
                                onClick={handleAbrirCanva}
                                disabled={fase === 'abriendo'}
                            >
                                {fase === 'abriendo' ? (
                                    <><div className='cnv-spinner cnv-spinner--sm'/> Editor abierto…</>
                                ) : (
                                    <>
                                        <svg width='18' height='18' viewBox='0 0 24 24' fill='currentColor'>
                                            <path d='M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 21.6C6.703 21.6 2.4 17.297 2.4 12S6.703 2.4 12 2.4 21.6 6.703 21.6 12 17.297 21.6 12 21.6z'/>
                                            <path d='M14.4 7.2a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 0 1 0-4.8zm-4.8 4.8a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 0 1 0-4.8z'/>
                                        </svg>
                                        Abrir editor de Canva
                                        <span className='cnv-btn-sdk-badge'>popup controlado</span>
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Divisor siempre visible */}
                    <div className='cnv-divider'>
                        <span>o subí una imagen desde tu dispositivo</span>
                    </div>

                    {/* Dropzone fallback */}
                    <div
                        className={`cnv-dropzone ${dragOver ? 'cnv-dropzone--over' : ''} ${preview ? 'cnv-dropzone--tiene-imagen' : ''}`}
                        onClick={() => fileRef.current?.click()}
                        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                    >
                        <input
                            ref={fileRef}
                            type='file'
                            accept='image/*'
                            className='cnv-file-hidden'
                            onChange={e => procesarArchivo(e.target.files[0])}
                        />
                        {preview ? (
                            <div className='cnv-preview'>
                                <img src={preview} alt='preview'/>
                                <div className='cnv-preview-overlay'>
                                    <FiImage size={24}/>
                                    <span>{archivoNombre}</span>
                                    <span className='cnv-preview-cambiar'>Hacé clic para cambiar</span>
                                </div>
                            </div>
                        ) : (
                            <div className='cnv-dropzone-placeholder'>
                                <FiUpload size={32}/>
                                <p>Arrastrá tu imagen o hacé clic</p>
                                <span>PNG, JPG, WEBP — máx. 5 MB</span>
                            </div>
                        )}
                    </div>

                    {/* Confirmar imagen subida */}
                    {preview && (
                        <button type='button' className='cnv-btn-confirmar' onClick={onClose}>
                            Usar esta imagen
                        </button>
                    )}

                </div>
            </div>
        </div>
    )
}

export default CanvaModal
