import React, { useState } from 'react'
import '../Forms.css'
import { registerRequest } from '../../../services/personasServices'
import { GOOGLE_AUTH_URL } from '../../../config/api'
import { useAuth } from '../../../Contexts/PersonaContextProvider'
import { useNavigate } from 'react-router-dom'


const Register = () => {

    const { setIsAuthenticated } = useAuth()
    const navigate = useNavigate()

    const fields = {
        NOMBRE: 'nombre',
        APELLIDO: 'apellido',
        EMAIL: 'email',
        USER_PASSWORD: 'user_password',
        CUIT: 'cuit',
        CELULAR: 'celular',
        FECHA_NACIMIENTO: 'fecha_nacimiento',
    }
    const initial_form_state = {
        [fields.NOMBRE]: '',
        [fields.APELLIDO]: '',
        [fields.EMAIL]: '',
        [fields.USER_PASSWORD]: '',
        [fields.CUIT]: '',
        [fields.CELULAR]: '',
        [fields.FECHA_NACIMIENTO]: '',
    }

    const [form_values_state, setFormValuesState] = useState(initial_form_state)
    const [error, setError] = useState('')

    const handleSubmit = async (event) => {
        event.preventDefault()
        setError('')
        const fechaISO = fechaAISO(form_values_state[fields.FECHA_NACIMIENTO])
        if (!fechaISO) {
            setError('Revisá la fecha de nacimiento (dd/mm/aaaa).')
            return
        }
        try {
            const payload = { ...form_values_state, [fields.FECHA_NACIMIENTO]: fechaISO }
            const response = await registerRequest(payload)
            if (response && (response.msg === 'Usuario creado con éxito' || response.message === 'Usuario creado con éxito')) {
                setIsAuthenticated(true)
                navigate('/seleccionar-rol')
                return
            }
        } catch (err) {
            console.error('Error en registro:', err)
            setError(err?.message || 'No se pudo crear la cuenta. Revisá los datos e intentá de nuevo.')
        }
    }

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

    const handleChangeInputValue = (event) => {
        const { name, value } = event.target
        let val = value
        if (name === fields.CUIT) val = formatCuit(value)
        else if (name === fields.FECHA_NACIMIENTO) val = formatFecha(value)
        setFormValuesState(
            (prev_state) => ({ ...prev_state, [name]: val })
        )
    }

    return (
        <main className='auth-page auth-page--register'>
            <section className='auth-shell auth-shell--register' aria-label='Registro Dream Events'>
                <aside className='auth-brand-panel'>
                    <img src='/dream_events_logo.svg' alt='Dream Events' className='auth-logo' />
                    <p className='auth-brand-copy'>
                        Creá tu cuenta para organizar eventos, reservar salones y administrar servicios desde un solo lugar.
                    </p>
                </aside>

                <section className='auth-form-panel'>
                    <div className='auth-form-header'>
                        <h1>Crear cuenta</h1>
                        <p>Completá tus datos para empezar a usar la plataforma.</p>
                    </div>

                    {error && <div className='auth-error' role='alert'>{error}</div>}

                    <form className='auth-form auth-form--grid' onSubmit={handleSubmit}>
                        <div className='auth-field'>
                            <label htmlFor='nombre'>Nombre</label>
                            <input type='text' placeholder='James' maxLength={30} id='nombre' name='nombre' required onChange={handleChangeInputValue} value={form_values_state[fields.NOMBRE]} />
                        </div>
                        <div className='auth-field'>
                            <label htmlFor='apellido'>Apellido</label>
                            <input type='text' placeholder='Bond' maxLength={30} id='apellido' name='apellido' required onChange={handleChangeInputValue} value={form_values_state[fields.APELLIDO]} />
                        </div>
                        <div className='auth-field auth-field--full'>
                            <label htmlFor='email'>Email</label>
                            <input type='email' placeholder='jamesbond@gmail.com' id='email' name='email' required onChange={handleChangeInputValue} value={form_values_state[fields.EMAIL]} />
                        </div>
                        <div className='auth-field'>
                            <label htmlFor='cuit'>CUIT</label>
                            <input type='text' placeholder='20-12345678-9' maxLength={13} id='cuit' name='cuit' inputMode='numeric' required onChange={handleChangeInputValue} value={form_values_state[fields.CUIT]} />
                        </div>
                        <div className='auth-field'>
                            <label htmlFor='celular'>Celular</label>
                            <input type='tel' placeholder='2610000000' maxLength={15} id='celular' name='celular' inputMode='tel' required onChange={handleChangeInputValue} value={form_values_state[fields.CELULAR]} />
                        </div>
                        <div className='auth-field'>
                            <label htmlFor='fecha_nacimiento'>Fecha de nacimiento</label>
                            <input type='text' inputMode='numeric' placeholder='dd/mm/aaaa' maxLength={10} id='fecha_nacimiento' name='fecha_nacimiento' required onChange={handleChangeInputValue} value={form_values_state[fields.FECHA_NACIMIENTO]} />
                        </div>
                        <div className='auth-field'>
                            <label htmlFor='user_password'>Contraseña</label>
                            <input type='password' minLength={8} maxLength={64} id='user_password' name='user_password' required placeholder='Mín. 8, 1 mayúscula y 1 número' onChange={handleChangeInputValue} value={form_values_state[fields.USER_PASSWORD]} />
                        </div>

                        <p className='auth-hint auth-field--full'>
                            🎂 Con tu fecha de nacimiento te enviamos un <strong>cupón de descuento</strong> para organizar tu cumpleaños en Dream Events.
                        </p>

                        <div className='auth-field--full'>
                            <button className='auth-submit' type='submit'>Crear cuenta</button>
                        </div>

                        <div className='form-divider auth-divider auth-field--full'>
                            <span>o</span>
                        </div>

                        <a href={GOOGLE_AUTH_URL} className='btn-google auth-google auth-field--full'>
                            <svg className='google-icon' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'>
                                <path d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z' fill='#4285F4' />
                                <path d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z' fill='#34A853' />
                                <path d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z' fill='#FBBC05' />
                                <path d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z' fill='#EA4335' />
                            </svg>
                            Registrarse con Google
                        </a>
                    </form>
                </section>
            </section>
        </main>
    )
}

export default Register
