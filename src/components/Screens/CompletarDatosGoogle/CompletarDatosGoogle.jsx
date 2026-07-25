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

    // Formatea el CUIT argentino como XX-XXXXXXXX-X mientras se tipea.
    const formatCuit = (value) => {
        const d = value.replace(/\D/g, '').slice(0, 11)
        let out = d.slice(0, 2)
        if (d.length > 2) out += '-' + d.slice(2, 10)
        if (d.length > 10) out += '-' + d.slice(10, 11)
        return out
    }

    // Máscara dd/mm/aaaa mientras se tipea la fecha.
    const formatFecha = (value) => {
        const d = value.replace(/\D/g, '').slice(0, 8)
        let out = d.slice(0, 2)
        if (d.length > 2) out += '/' + d.slice(2, 4)
        if (d.length > 4) out += '/' + d.slice(4, 8)
        return out
    }

    // Convierte dd/mm/aaaa -> yyyy-mm-dd (ISO). Devuelve '' si no es una fecha real.
    const fechaAISO = (s) => {
        const m = (s || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
        if (!m) return ''
        const [, dd, mm, yyyy] = m
        const iso = `${yyyy}-${mm}-${dd}`
        const dt = new Date(iso + 'T00:00:00')
        if (isNaN(dt.getTime()) || dt.getMonth() + 1 !== Number(mm) || dt.getDate() !== Number(dd)) return ''
        return iso
    }

    const handleChange = (e) => {
        const { name, value } = e.target
        let val = value
        if (name === 'cuit') val = formatCuit(value)
        else if (name === 'fecha_nacimiento') val = formatFecha(value)
        setForm((prev) => ({ ...prev, [name]: val }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        const fechaISO = fechaAISO(form.fecha_nacimiento)
        if (!fechaISO) {
            setError('Revisá la fecha de nacimiento (dd/mm/aaaa).')
            return
        }
        setEnviando(true)
        try {
            const payload = { ...form, fecha_nacimiento: fechaISO }
            const res = await completeRegistrationRequest(payload)
            // Actualizar el contexto con el CUIT ya cargado para no volver a pedirlo
            setPersona((prev) => ({ ...(prev || {}), cuit: res?.cuit || form.cuit, celular: form.celular, fecha_nacimiento: fechaISO }))
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
                            <input type='text' inputMode='numeric' placeholder='dd/mm/aaaa' maxLength={10} id='fecha_nacimiento' name='fecha_nacimiento' required onChange={handleChange} value={form.fecha_nacimiento} />
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
