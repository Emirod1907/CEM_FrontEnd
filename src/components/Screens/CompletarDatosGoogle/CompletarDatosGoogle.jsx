import React, { useState } from 'react'
import '../../Forms/Forms.css'
import { completeRegistrationRequest } from '../../../services/personasServices'
import { useAuth } from '../../../Contexts/PersonaContextProvider'
import { useNavigate } from 'react-router-dom'

const ROLES_VALIDOS = ['entusiasta', 'organizador', 'dueno_salon', 'proveedor_servicios', 'proveedor_insumos', 'admin']

// Paso posterior al login con Google. Google aporta nombre, apellido y email;
// acá completamos CUIT, celular y fecha de nacimiento (esta última habilita el
// cupón de descuento de cumpleaños).
const CompletarDatosGoogle = () => {

    const { persona, setPersona } = useAuth()
    const navigate = useNavigate()

    const [form, setForm] = useState({ cuit: '', celular: '', fecha_nacimiento: '' })
    const [error, setError] = useState('')
    const [enviando, setEnviando] = useState(false)

    const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setEnviando(true)
        try {
            const res = await completeRegistrationRequest(form)
            // Actualizar el contexto con el CUIT ya cargado para no volver a pedirlo
            setPersona((prev) => ({ ...(prev || {}), cuit: res?.cuit || form.cuit, celular: form.celular, fecha_nacimiento: form.fecha_nacimiento }))
            const tieneRol = persona?.rol && ROLES_VALIDOS.includes(persona.rol)
            navigate(tieneRol ? '/eventos' : '/seleccionar-rol')
        } catch (err) {
            console.error('Error al completar datos:', err)
            setError(err?.response?.data?.message || err?.message || 'No se pudieron guardar los datos. Intentá de nuevo.')
        } finally {
            setEnviando(false)
        }
    }

    return (
        <main className='auth-page'>
            <section className='auth-shell' aria-label='Completar datos'>
                <aside className='auth-brand-panel'>
                    <img src='/dream_events_logo.svg' alt='Dream Events' className='auth-logo' />
                    <p className='auth-brand-copy'>
                        {persona?.user ? `¡Hola ${persona.user}! ` : ''}
                        Casi listo. Necesitamos unos datos más para completar tu cuenta.
                    </p>
                </aside>

                <section className='auth-form-panel'>
                    <div className='auth-form-header'>
                        <h1>Completar datos</h1>
                        <p>Tu nombre y email ya los tomamos de Google. Solo faltan estos:</p>
                    </div>

                    {error && <div className='auth-error' role='alert'>{error}</div>}

                    <form className='auth-form auth-form--grid' onSubmit={handleSubmit}>
                        <div className='auth-field'>
                            <label htmlFor='cuit'>CUIT</label>
                            <input type='text' placeholder='20-12345678-9' maxLength={13} id='cuit' name='cuit' inputMode='numeric' required onChange={handleChange} value={form.cuit} />
                        </div>
                        <div className='auth-field'>
                            <label htmlFor='celular'>Celular</label>
                            <input type='tel' placeholder='2610000000' maxLength={15} id='celular' name='celular' inputMode='tel' required onChange={handleChange} value={form.celular} />
                        </div>
                        <div className='auth-field auth-field--full'>
                            <label htmlFor='fecha_nacimiento'>Fecha de nacimiento</label>
                            <input type='date' id='fecha_nacimiento' name='fecha_nacimiento' required onChange={handleChange} value={form.fecha_nacimiento} />
                        </div>

                        <p className='auth-hint auth-field--full'>
                            🎂 Con tu fecha de nacimiento te enviamos un <strong>cupón de descuento</strong> para organizar tu cumpleaños en Dream Events.
                        </p>

                        <div className='auth-field--full'>
                            <button className='auth-submit' type='submit' disabled={enviando}>
                                {enviando ? 'Guardando…' : 'Continuar'}
                            </button>
                        </div>
                    </form>
                </section>
            </section>
        </main>
    )
}

export default CompletarDatosGoogle
