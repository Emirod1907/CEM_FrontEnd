import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../Contexts/PersonaContextProvider'
import { completeProfileRequest } from '../../../services/personasServices'
import { getRedirectByRol } from '../RoleSelectionScreen/RoleSelectionScreen'
import '../../Forms/Forms.css'
import './CompleteProfileScreen.css'

const CATEGORIAS_SERVICIO = [
    { value: 'banquetes',    label: 'Banquetes (Alquiler de Vajillas)' },
    { value: 'catering',     label: 'Catering (Comidas para eventos)' },
    { value: 'dj_proyeccion',label: 'DJ y Proyección de Imágenes' },
    { value: 'disfraces',    label: 'Alquiler de Disfraces' },
    { value: 'banda',        label: 'Banda Musical' },
    { value: 'payasos',      label: 'Payasos y Comediantes' },
    { value: 'inflables',    label: 'Inflables y Juegos' },
    { value: 'souvenirs',    label: 'Souvenirs' },
    { value: 'tortas',       label: 'Preparación de Tortas' },
    { value: 'deco',         label: 'Globos y Carteles para Deco' },
    { value: 'guardarropa',  label: 'Guardarropa' },
    { value: 'seguridad',    label: 'Seguridad' },
]

const CompleteProfileScreen = () => {
    const { persona, setPersona } = useAuth()
    const navigate = useNavigate()
    const rol = persona?.rol

    const [categoriasSeleccionadas, setCategoriasSeleccionadas] = useState([])

    const toggleCategoria = (value) => {
        setCategoriasSeleccionadas(prev =>
            prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
        )
    }
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    const esProveedorServicios = rol === 'proveedor_servicios'
    const esProveedorInsumos   = rol === 'proveedor_insumos'

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        try {
            const datos = {}
            if (esProveedorServicios) {
                if (categoriasSeleccionadas.length === 0) {
                    setError('Seleccioná al menos una categoría de servicio.')
                    setLoading(false)
                    return
                }
                datos.categoria_servicio = categoriasSeleccionadas
            }
            await completeProfileRequest(datos)
            setPersona(prev => ({
                ...prev,
                perfil_completado: true,
                categoria_servicio: datos.categoria_servicio ? JSON.stringify(datos.categoria_servicio) : prev?.categoria_servicio
            }))
            navigate(getRedirectByRol(rol))
        } catch (err) {
            setError('Error al guardar el perfil. Intentá de nuevo.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className='container'>
            <div className='form-container complete-profile-form'>
                <div className='form-title'>
                    <h1>Completá tu perfil</h1>
                    <p className='complete-profile-subtitle'>
                        {esProveedorServicios && 'Seleccioná las categorías de servicios que ofrecés.'}
                        {esProveedorInsumos   && 'Vas a poder cargar tu catálogo de insumos desde tu panel.'}
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className='form-container-form-fields'>

                        {esProveedorServicios && (
                            <div className='form-input'>
                                <label>Categorías de servicio que ofrecés</label>
                                <div className='categoria-tags'>
                                    {CATEGORIAS_SERVICIO.map(cat => (
                                        <button
                                            key={cat.value}
                                            type='button'
                                            className={`categoria-tag${categoriasSeleccionadas.includes(cat.value) ? ' selected' : ''}`}
                                            onClick={() => toggleCategoria(cat.value)}
                                        >
                                            {cat.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {esProveedorInsumos && (
                            <div className='complete-profile-info'>
                                <p>
                                    Tu cuenta como <strong>Proveedor de Insumos</strong> está lista.
                                    Desde tu panel podrás cargar y gestionar tu catálogo de productos
                                    con precios actualizados.
                                </p>
                            </div>
                        )}

                        {error && <p className='complete-profile-error'>{error}</p>}

                        <div className='form-input-button'>
                            <button type='submit' disabled={loading}>
                                {loading ? 'Guardando...' : 'Continuar'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default CompleteProfileScreen
