import React, { useEffect, useRef, useState } from 'react'
import {
    getMisPedidosTorta, crearPedidoTorta, updatePedidoTorta, deletePedidoTorta,
} from '../../services/pedidoTortaServices'
import UploadImg from '../../services/uploadimg'
import {
    FiPlus, FiX, FiEdit2, FiTrash2, FiClock, FiCalendar, FiUsers, FiUploadCloud,
    FiArrowLeft, FiChevronRight, FiPhone, FiAlertTriangle, FiImage,
} from 'react-icons/fi'
import './PedidosTortaPanel.css'

// Estados del pedido (feature 4 los hará editables; por ahora solo se muestran)
export const ESTADOS_TORTA = {
    consulta:      { label: 'Consulta',        clase: 'pt-est--consulta' },
    presupuestado: { label: 'Presupuestado',   clase: 'pt-est--presupuestado' },
    sena_pendiente:{ label: 'Falta seña',       clase: 'pt-est--sena' },
    confirmado:    { label: 'Confirmado',       clase: 'pt-est--confirmado' },
    preparando:    { label: 'En preparación',   clase: 'pt-est--preparando' },
    terminado:     { label: 'Terminado',        clase: 'pt-est--terminado' },
    entregado:     { label: 'Entregado',        clase: 'pt-est--entregado' },
    cancelado:     { label: 'Cancelado',        clase: 'pt-est--cancelado' },
}

const FORM_VACIO = {
    cliente_nombre: '', cliente_contacto: '',
    fecha_evento: '', hora_entrega: '', modo_entrega: 'retiro',
    personas: '', porciones: '', sabor: '', rellenos: '', cobertura: '',
    colores: '', tematica: '', pisos: '', detalles_diseno: '', alergias: '',
    fotos_referencia: [],
}

const fmtFecha = (f) => f
    ? new Date(f + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—'

const PedidosTortaPanel = () => {
    const [pedidos, setPedidos]     = useState([])
    const [cargando, setCargando]   = useState(true)
    const [vista, setVista]         = useState('lista') // 'lista' | 'form' | 'detalle'
    const [form, setForm]           = useState(FORM_VACIO)
    const [editandoId, setEditandoId] = useState(null)
    const [seleccionado, setSeleccionado] = useState(null)
    const [guardando, setGuardando] = useState(false)
    const [subiendoFoto, setSubiendoFoto] = useState(false)
    const [error, setError]         = useState(null)
    const [confirmDelete, setConfirmDelete] = useState(null)
    const fileRef = useRef(null)

    const cargar = () => {
        setCargando(true)
        getMisPedidosTorta().then(p => { setPedidos(p); setCargando(false) })
    }
    useEffect(() => { cargar() }, [])

    const set = (campo, valor) => setForm(prev => ({ ...prev, [campo]: valor }))

    const abrirNuevo = () => { setForm(FORM_VACIO); setEditandoId(null); setError(null); setVista('form') }
    const abrirEditar = (p) => {
        setForm({
            cliente_nombre: p.cliente_nombre || '', cliente_contacto: p.cliente_contacto || '',
            fecha_evento: p.fecha_evento ? String(p.fecha_evento).slice(0, 10) : '',
            hora_entrega: p.hora_entrega || '', modo_entrega: p.modo_entrega || 'retiro',
            personas: p.personas ?? '', porciones: p.porciones ?? '', sabor: p.sabor || '',
            rellenos: p.rellenos || '', cobertura: p.cobertura || '', colores: p.colores || '',
            tematica: p.tematica || '', pisos: p.pisos ?? '', detalles_diseno: p.detalles_diseno || '',
            alergias: p.alergias || '', fotos_referencia: p.fotos_referencia || [],
        })
        setEditandoId(p.id_pedido); setError(null); setVista('form')
    }

    const subirFotos = async (files) => {
        if (!files?.length) return
        setSubiendoFoto(true)
        try {
            const urls = []
            for (const file of files) {
                const url = await UploadImg(file)
                if (url) urls.push(url)
            }
            setForm(prev => ({ ...prev, fotos_referencia: [...prev.fotos_referencia, ...urls] }))
        } finally {
            setSubiendoFoto(false)
            if (fileRef.current) fileRef.current.value = ''
        }
    }
    const quitarFoto = (url) => setForm(prev => ({ ...prev, fotos_referencia: prev.fotos_referencia.filter(u => u !== url) }))

    const guardar = async () => {
        if (!form.cliente_nombre.trim()) { setError('El nombre del cliente es obligatorio.'); return }
        setGuardando(true); setError(null)
        try {
            const payload = {
                ...form,
                personas: form.personas === '' ? null : Number(form.personas),
                porciones: form.porciones === '' ? null : Number(form.porciones),
                pisos: form.pisos === '' ? null : Number(form.pisos),
            }
            if (editandoId) await updatePedidoTorta(editandoId, payload)
            else await crearPedidoTorta(payload)
            cargar()
            setVista('lista')
        } catch (e) {
            setError('No se pudo guardar el pedido. Intentá de nuevo.')
        } finally {
            setGuardando(false)
        }
    }

    const eliminar = async (id) => {
        await deletePedidoTorta(id)
        setConfirmDelete(null)
        setSeleccionado(null)
        setVista('lista')
        cargar()
    }

    // ── Lista ──
    if (vista === 'lista') {
        return (
            <div className='pt-panel'>
                <div className='pt-head'>
                    <div>
                        <h3>Pedidos de torta</h3>
                        <p className='pt-sub'>Toda la info de cada encargo en un solo lugar.</p>
                    </div>
                    <button className='pt-btn pt-btn--primary' onClick={abrirNuevo}><FiPlus size={16}/> Nuevo pedido</button>
                </div>

                {cargando ? (
                    <p className='pt-loading'>Cargando...</p>
                ) : pedidos.length === 0 ? (
                    <div className='pt-vacio'>
                        <FiImage size={40}/>
                        <p>Todavía no cargaste ningún pedido.</p>
                        <button className='pt-btn pt-btn--primary' onClick={abrirNuevo}><FiPlus size={16}/> Cargar el primero</button>
                    </div>
                ) : (
                    <div className='pt-lista'>
                        {pedidos.map(p => {
                            const est = ESTADOS_TORTA[p.estado] || ESTADOS_TORTA.consulta
                            return (
                                <button key={p.id_pedido} className='pt-card' onClick={() => { setSeleccionado(p); setVista('detalle') }}>
                                    {p.fotos_referencia?.[0]
                                        ? <img src={p.fotos_referencia[0]} alt='' className='pt-card-img'/>
                                        : <div className='pt-card-img pt-card-img--vacia'>🎂</div>}
                                    <div className='pt-card-body'>
                                        <div className='pt-card-top'>
                                            <strong>{p.cliente_nombre}</strong>
                                            <span className={`pt-est ${est.clase}`}>{est.label}</span>
                                        </div>
                                        <div className='pt-card-meta'>
                                            <span><FiCalendar size={12}/> {fmtFecha(p.fecha_evento)}</span>
                                            {p.hora_entrega && <span><FiClock size={12}/> {p.hora_entrega}</span>}
                                            {p.porciones ? <span><FiUsers size={12}/> {p.porciones} porc.</span> : null}
                                        </div>
                                        {(p.sabor || p.tematica) && (
                                            <span className='pt-card-desc'>{[p.tematica, p.sabor].filter(Boolean).join(' · ')}</span>
                                        )}
                                    </div>
                                    <FiChevronRight size={18} className='pt-card-arrow'/>
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>
        )
    }

    // ── Detalle ──
    if (vista === 'detalle' && seleccionado) {
        const p = seleccionado
        const est = ESTADOS_TORTA[p.estado] || ESTADOS_TORTA.consulta
        const Campo = ({ label, valor }) => valor ? (
            <div className='pt-campo'>
                <span className='pt-campo-lbl'>{label}</span>
                <span className='pt-campo-val'>{valor}</span>
            </div>
        ) : null
        return (
            <div className='pt-panel'>
                <div className='pt-detalle-head'>
                    <button className='pt-btn pt-btn--ghost' onClick={() => setVista('lista')}><FiArrowLeft size={16}/> Volver</button>
                    <div className='pt-detalle-acciones'>
                        <button className='pt-btn pt-btn--ghost' onClick={() => abrirEditar(p)}><FiEdit2 size={15}/> Editar</button>
                        <button className='pt-btn pt-btn--danger' onClick={() => setConfirmDelete(p.id_pedido)}><FiTrash2 size={15}/> Eliminar</button>
                    </div>
                </div>

                <div className='pt-detalle-titulo'>
                    <h3>{p.cliente_nombre}</h3>
                    <span className={`pt-est ${est.clase}`}>{est.label}</span>
                </div>
                {p.cliente_contacto && <p className='pt-contacto'><FiPhone size={13}/> {p.cliente_contacto}</p>}

                {p.fotos_referencia?.length > 0 && (
                    <div className='pt-fotos'>
                        {p.fotos_referencia.map((u, i) => (
                            <a key={i} href={u} target='_blank' rel='noreferrer'><img src={u} alt={`ref ${i+1}`}/></a>
                        ))}
                    </div>
                )}

                <div className='pt-detalle-grid'>
                    <Campo label='Fecha del evento' valor={fmtFecha(p.fecha_evento)} />
                    <Campo label={p.modo_entrega === 'entrega' ? 'Horario de entrega' : 'Horario de retiro'} valor={p.hora_entrega} />
                    <Campo label='Modo' valor={p.modo_entrega === 'entrega' ? 'Entrega a domicilio' : 'Retira el cliente'} />
                    <Campo label='Para cuántas personas' valor={p.personas ? `${p.personas} personas` : null} />
                    <Campo label='Porciones' valor={p.porciones ? `${p.porciones} porciones` : null} />
                    <Campo label='Pisos' valor={p.pisos ? `${p.pisos}` : null} />
                    <Campo label='Sabor' valor={p.sabor} />
                    <Campo label='Rellenos' valor={p.rellenos} />
                    <Campo label='Cobertura' valor={p.cobertura} />
                    <Campo label='Colores' valor={p.colores} />
                    <Campo label='Temática' valor={p.tematica} />
                </div>

                {p.detalles_diseno && (
                    <div className='pt-bloque'>
                        <span className='pt-campo-lbl'>Detalles del diseño</span>
                        <p className='pt-bloque-txt'>{p.detalles_diseno}</p>
                    </div>
                )}
                {p.alergias && (
                    <div className='pt-alerta'>
                        <FiAlertTriangle size={16}/>
                        <div>
                            <strong>Alergias / pedidos especiales</strong>
                            <p>{p.alergias}</p>
                        </div>
                    </div>
                )}

                {confirmDelete === p.id_pedido && (
                    <div className='pt-confirm'>
                        <span>¿Seguro que querés eliminar este pedido?</span>
                        <div>
                            <button className='pt-btn pt-btn--ghost' onClick={() => setConfirmDelete(null)}>Cancelar</button>
                            <button className='pt-btn pt-btn--danger' onClick={() => eliminar(p.id_pedido)}>Sí, eliminar</button>
                        </div>
                    </div>
                )}
            </div>
        )
    }

    // ── Formulario ──
    return (
        <div className='pt-panel'>
            <div className='pt-form-head'>
                <button className='pt-btn pt-btn--ghost' onClick={() => setVista('lista')}><FiArrowLeft size={16}/> Volver</button>
                <h3>{editandoId ? 'Editar pedido' : 'Nuevo pedido de torta'}</h3>
            </div>

            <div className='pt-form'>
                <fieldset className='pt-fieldset'>
                    <legend>Cliente</legend>
                    <div className='pt-row'>
                        <label className='pt-field pt-field--full'>
                            <span>Nombre del cliente *</span>
                            <input value={form.cliente_nombre} onChange={e => set('cliente_nombre', e.target.value)} placeholder='Ej: María González'/>
                        </label>
                        <label className='pt-field pt-field--full'>
                            <span>Contacto (teléfono / WhatsApp / email)</span>
                            <input value={form.cliente_contacto} onChange={e => set('cliente_contacto', e.target.value)} placeholder='Ej: 261 555-1234'/>
                        </label>
                    </div>
                </fieldset>

                <fieldset className='pt-fieldset'>
                    <legend>Entrega</legend>
                    <div className='pt-row'>
                        <label className='pt-field'>
                            <span>Fecha del evento</span>
                            <input type='date' value={form.fecha_evento} onChange={e => set('fecha_evento', e.target.value)}/>
                        </label>
                        <label className='pt-field'>
                            <span>Horario de entrega / retiro</span>
                            <input type='time' value={form.hora_entrega} onChange={e => set('hora_entrega', e.target.value)}/>
                        </label>
                        <label className='pt-field'>
                            <span>Modo</span>
                            <select value={form.modo_entrega} onChange={e => set('modo_entrega', e.target.value)}>
                                <option value='retiro'>Retira el cliente</option>
                                <option value='entrega'>Entrega a domicilio</option>
                            </select>
                        </label>
                    </div>
                </fieldset>

                <fieldset className='pt-fieldset'>
                    <legend>La torta</legend>
                    <div className='pt-row'>
                        <label className='pt-field'>
                            <span>Para cuántas personas</span>
                            <input type='number' min='0' value={form.personas} onChange={e => set('personas', e.target.value)} placeholder='Ej: 30'/>
                        </label>
                        <label className='pt-field'>
                            <span>Cantidad de porciones</span>
                            <input type='number' min='0' value={form.porciones} onChange={e => set('porciones', e.target.value)} placeholder='Ej: 30'/>
                        </label>
                        <label className='pt-field'>
                            <span>Cantidad de pisos</span>
                            <input type='number' min='1' value={form.pisos} onChange={e => set('pisos', e.target.value)} placeholder='Ej: 2'/>
                        </label>
                    </div>
                    <div className='pt-row'>
                        <label className='pt-field'>
                            <span>Sabor</span>
                            <input value={form.sabor} onChange={e => set('sabor', e.target.value)} placeholder='Ej: Chocolate'/>
                        </label>
                        <label className='pt-field'>
                            <span>Rellenos</span>
                            <input value={form.rellenos} onChange={e => set('rellenos', e.target.value)} placeholder='Ej: Dulce de leche y frutillas'/>
                        </label>
                        <label className='pt-field'>
                            <span>Cobertura</span>
                            <input value={form.cobertura} onChange={e => set('cobertura', e.target.value)} placeholder='Ej: Fondant / crema'/>
                        </label>
                    </div>
                </fieldset>

                <fieldset className='pt-fieldset'>
                    <legend>Diseño</legend>
                    <div className='pt-row'>
                        <label className='pt-field'>
                            <span>Colores</span>
                            <input value={form.colores} onChange={e => set('colores', e.target.value)} placeholder='Ej: Rosa y dorado'/>
                        </label>
                        <label className='pt-field'>
                            <span>Temática</span>
                            <input value={form.tematica} onChange={e => set('tematica', e.target.value)} placeholder='Ej: Toy Story'/>
                        </label>
                    </div>
                    <label className='pt-field pt-field--full'>
                        <span>Detalles del diseño</span>
                        <textarea rows={3} value={form.detalles_diseno} onChange={e => set('detalles_diseno', e.target.value)}
                            placeholder='Figuras, adornos, mensaje en la torta, forma, etc.'/>
                    </label>
                </fieldset>

                <fieldset className='pt-fieldset'>
                    <legend>Alergias y pedidos especiales</legend>
                    <label className='pt-field pt-field--full'>
                        <span>Alergias, intolerancias o restricciones</span>
                        <textarea rows={2} value={form.alergias} onChange={e => set('alergias', e.target.value)}
                            placeholder='Ej: sin gluten, sin azúcar, sin frutos secos...'/>
                    </label>
                </fieldset>

                <fieldset className='pt-fieldset'>
                    <legend>Fotos de referencia</legend>
                    <div className='pt-fotos-edit'>
                        {form.fotos_referencia.map((u, i) => (
                            <div key={i} className='pt-foto-thumb'>
                                <img src={u} alt={`ref ${i+1}`}/>
                                <button type='button' onClick={() => quitarFoto(u)}><FiX size={13}/></button>
                            </div>
                        ))}
                        <button type='button' className='pt-foto-add' onClick={() => fileRef.current?.click()} disabled={subiendoFoto}>
                            <FiUploadCloud size={20}/>
                            <span>{subiendoFoto ? 'Subiendo...' : 'Agregar fotos'}</span>
                        </button>
                        <input ref={fileRef} type='file' accept='image/*' multiple hidden
                            onChange={e => subirFotos(Array.from(e.target.files || []))}/>
                    </div>
                </fieldset>

                {error && <p className='pt-error'>{error}</p>}

                <div className='pt-form-acciones'>
                    <button className='pt-btn pt-btn--ghost' onClick={() => setVista('lista')}>Cancelar</button>
                    <button className='pt-btn pt-btn--primary' onClick={guardar} disabled={guardando || subiendoFoto}>
                        {guardando ? 'Guardando...' : editandoId ? 'Guardar cambios' : 'Crear pedido'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default PedidosTortaPanel
