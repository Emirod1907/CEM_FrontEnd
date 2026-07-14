import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
    getMisPedidosTorta, crearPedidoTorta, updatePedidoTorta, deletePedidoTorta, agregarCambioPedido,
} from '../../services/pedidoTortaServices'
import UploadImg from '../../services/uploadimg'
import {
    FiPlus, FiX, FiEdit2, FiTrash2, FiClock, FiCalendar, FiUsers, FiUploadCloud,
    FiArrowLeft, FiChevronRight, FiChevronLeft, FiPhone, FiAlertTriangle, FiImage,
    FiDollarSign, FiRefreshCw, FiLink, FiCheckCircle, FiList,
} from 'react-icons/fi'
import './PedidosTortaPanel.css'

// Estados del pedido (feature 4). El orden refleja el ciclo de vida.
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
const ESTADOS_ORDEN = Object.keys(ESTADOS_TORTA)

const RESULTADO_CAMBIO = {
    aplicado:  { label: 'Aplicado sin costo', clase: 'pt-cambio--ok' },
    con_costo: { label: 'Aplicado con costo extra', clase: 'pt-cambio--costo' },
    rechazado: { label: 'No se pudo hacer', clase: 'pt-cambio--no' },
}

const FORM_VACIO = {
    cliente_nombre: '', cliente_contacto: '',
    fecha_evento: '', hora_entrega: '', modo_entrega: 'retiro',
    personas: '', porciones: '', sabor: '', rellenos: '', cobertura: '',
    colores: '', tematica: '', pisos: '', detalles_diseno: '', alergias: '',
    fotos_referencia: [],
    estado: 'consulta',
    desglose_precio: [],
    sena_monto: '', monto_pagado: '', fecha_limite_pago: '',
    fecha_limite_cambios: '', politica_cancelacion: '', sena_reembolsable: false,
}

const fmt = (n) => Number(n || 0).toLocaleString('es-AR')
const fmtFecha = (f) => f
    ? new Date(String(f).slice(0, 10) + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—'
const fmtFechaHora = (f) => f ? new Date(f).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'
const totalDesglose = (d) => (d || []).reduce((a, c) => a + (Number(c?.monto) || 0), 0)

const PedidosTortaPanel = () => {
    const [pedidos, setPedidos]     = useState([])
    const [cargando, setCargando]   = useState(true)
    const [vista, setVista]         = useState('lista') // 'lista' | 'calendario' | 'form' | 'detalle'
    const [form, setForm]           = useState(FORM_VACIO)
    const [editandoId, setEditandoId] = useState(null)
    const [seleccionado, setSeleccionado] = useState(null)
    const [guardando, setGuardando] = useState(false)
    const [subiendoFoto, setSubiendoFoto] = useState(false)
    const [error, setError]         = useState(null)
    const [confirmDelete, setConfirmDelete] = useState(null)
    const [nuevoCambio, setNuevoCambio] = useState({ descripcion: '', costo_extra: '', resultado: 'aplicado' })
    const [linkCopiado, setLinkCopiado] = useState(false)
    const hoy = new Date()
    const [calMes, setCalMes] = useState(hoy.getMonth())
    const [calAnio, setCalAnio] = useState(hoy.getFullYear())
    const fileRef = useRef(null)

    const cargar = () => {
        setCargando(true)
        getMisPedidosTorta().then(p => { setPedidos(p); setCargando(false) })
    }
    useEffect(() => { cargar() }, [])

    // Si estamos en detalle, mantener el seleccionado sincronizado con la lista recargada
    const refrescarSeleccion = (lista, id) => {
        const p = lista.find(x => x.id_pedido === id)
        if (p) setSeleccionado(p)
    }

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
            estado: p.estado || 'consulta',
            desglose_precio: Array.isArray(p.desglose_precio) ? p.desglose_precio : [],
            sena_monto: p.sena_monto ?? '', monto_pagado: p.monto_pagado ?? '',
            fecha_limite_pago: p.fecha_limite_pago ? String(p.fecha_limite_pago).slice(0, 10) : '',
            fecha_limite_cambios: p.fecha_limite_cambios ? String(p.fecha_limite_cambios).slice(0, 10) : '',
            politica_cancelacion: p.politica_cancelacion || '', sena_reembolsable: !!p.sena_reembolsable,
        })
        setEditandoId(p.id_pedido); setError(null); setVista('form')
    }

    const subirFotos = async (files) => {
        if (!files?.length) return
        setSubiendoFoto(true)
        try {
            const urls = []
            for (const file of files) { const url = await UploadImg(file); if (url) urls.push(url) }
            setForm(prev => ({ ...prev, fotos_referencia: [...prev.fotos_referencia, ...urls] }))
        } finally {
            setSubiendoFoto(false)
            if (fileRef.current) fileRef.current.value = ''
        }
    }
    const quitarFoto = (url) => setForm(prev => ({ ...prev, fotos_referencia: prev.fotos_referencia.filter(u => u !== url) }))

    // Componentes del precio (feature 8)
    const addDesglose = () => setForm(prev => ({ ...prev, desglose_precio: [...prev.desglose_precio, { concepto: '', monto: '' }] }))
    const setDesglose = (i, campo, val) => setForm(prev => ({
        ...prev, desglose_precio: prev.desglose_precio.map((c, idx) => idx === i ? { ...c, [campo]: val } : c),
    }))
    const quitarDesglose = (i) => setForm(prev => ({ ...prev, desglose_precio: prev.desglose_precio.filter((_, idx) => idx !== i) }))

    const guardar = async () => {
        if (!form.cliente_nombre.trim()) { setError('El nombre del cliente es obligatorio.'); return }
        setGuardando(true); setError(null)
        try {
            const desglose = form.desglose_precio
                .filter(c => c.concepto?.trim() || Number(c.monto) > 0)
                .map(c => ({ concepto: c.concepto?.trim() || 'Ítem', monto: Number(c.monto) || 0 }))
            const payload = {
                ...form,
                personas: form.personas === '' ? null : Number(form.personas),
                porciones: form.porciones === '' ? null : Number(form.porciones),
                pisos: form.pisos === '' ? null : Number(form.pisos),
                desglose_precio: desglose,
                precio_total: totalDesglose(desglose),
                sena_monto: form.sena_monto === '' ? 0 : Number(form.sena_monto),
                monto_pagado: form.monto_pagado === '' ? 0 : Number(form.monto_pagado),
            }
            const p = editandoId ? await updatePedidoTorta(editandoId, payload) : await crearPedidoTorta(payload)
            const lista = await getMisPedidosTorta(); setPedidos(lista)
            if (editandoId) { refrescarSeleccion(lista, editandoId); setVista('detalle') }
            else setVista('lista')
        } catch (e) {
            setError('No se pudo guardar el pedido. Intentá de nuevo.')
        } finally {
            setGuardando(false)
        }
    }

    const eliminar = async (id) => {
        await deletePedidoTorta(id)
        setConfirmDelete(null); setSeleccionado(null); setVista('lista'); cargar()
    }

    // Cambio de estado rápido desde el detalle (feature 4)
    const cambiarEstado = async (p, estado) => {
        await updatePedidoTorta(p.id_pedido, { estado })
        const lista = await getMisPedidosTorta(); setPedidos(lista); refrescarSeleccion(lista, p.id_pedido)
    }

    // Registrar cambio de último momento (feature 5)
    const registrarCambio = async (p) => {
        if (!nuevoCambio.descripcion.trim()) return
        await agregarCambioPedido(p.id_pedido, {
            descripcion: nuevoCambio.descripcion.trim(),
            costo_extra: Number(nuevoCambio.costo_extra) || 0,
            resultado: nuevoCambio.resultado,
        })
        setNuevoCambio({ descripcion: '', costo_extra: '', resultado: 'aplicado' })
        const lista = await getMisPedidosTorta(); setPedidos(lista); refrescarSeleccion(lista, p.id_pedido)
    }

    const copiarLink = (link) => {
        if (!link) return
        navigator.clipboard?.writeText(link)
        setLinkCopiado(true); setTimeout(() => setLinkCopiado(false), 1800)
    }

    const totalForm = totalDesglose(form.desglose_precio)

    // ══════════════ LISTA / CALENDARIO ══════════════
    if (vista === 'lista' || vista === 'calendario') {
        return (
            <div className='pt-panel'>
                <div className='pt-head'>
                    <div>
                        <h3>Pedidos de torta</h3>
                        <p className='pt-sub'>Toda la info de cada encargo en un solo lugar.</p>
                    </div>
                    <div className='pt-head-acciones'>
                        <div className='pt-toggle'>
                            <button className={vista === 'lista' ? 'active' : ''} onClick={() => setVista('lista')}><FiList size={14}/> Lista</button>
                            <button className={vista === 'calendario' ? 'active' : ''} onClick={() => setVista('calendario')}><FiCalendar size={14}/> Calendario</button>
                        </div>
                        <button className='pt-btn pt-btn--primary' onClick={abrirNuevo}><FiPlus size={16}/> Nuevo pedido</button>
                    </div>
                </div>

                {cargando ? <p className='pt-loading'>Cargando...</p>
                    : vista === 'calendario' ? <Calendario pedidos={pedidos} mes={calMes} anio={calAnio}
                        onMes={(m, a) => { setCalMes(m); setCalAnio(a) }}
                        onPedido={(p) => { setSeleccionado(p); setVista('detalle') }} />
                    : pedidos.length === 0 ? (
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
                                                {Number(p.precio_total) > 0 && <span><FiDollarSign size={12}/> ${fmt(p.precio_total)}</span>}
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

    // ══════════════ DETALLE ══════════════
    if (vista === 'detalle' && seleccionado) {
        const p = seleccionado
        const est = ESTADOS_TORTA[p.estado] || ESTADOS_TORTA.consulta
        const saldo = Math.max(0, (Number(p.precio_total) || 0) - (Number(p.monto_pagado) || 0))
        const Campo = ({ label, valor }) => valor ? (
            <div className='pt-campo'><span className='pt-campo-lbl'>{label}</span><span className='pt-campo-val'>{valor}</span></div>
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

                {/* Estado — cambio rápido (feature 4) */}
                <div className='pt-bloque-card'>
                    <span className='pt-campo-lbl'>Estado del pedido</span>
                    <div className='pt-estados-row'>
                        {ESTADOS_ORDEN.map(e => (
                            <button key={e} className={`pt-est-chip ${p.estado === e ? 'activo ' + ESTADOS_TORTA[e].clase : ''}`}
                                onClick={() => cambiarEstado(p, e)}>{ESTADOS_TORTA[e].label}</button>
                        ))}
                    </div>
                </div>

                {/* Link para el cliente (features 10 y 11) */}
                <div className='pt-bloque-card'>
                    <div className='pt-link-row'>
                        <div>
                            <span className='pt-campo-lbl'>Link para el cliente</span>
                            <p className='pt-link-url'>{p.link_publico}</p>
                        </div>
                        <button className='pt-btn pt-btn--ghost' onClick={() => copiarLink(p.link_publico)}>
                            <FiLink size={14}/> {linkCopiado ? '¡Copiado!' : 'Copiar link'}
                        </button>
                    </div>
                    {p.confirmado_cliente
                        ? <p className='pt-confirmado-ok'><FiCheckCircle size={14}/> El cliente confirmó el pedido el {fmtFechaHora(p.confirmado_cliente_fecha)}</p>
                        : <p className='pt-confirmado-no'>El cliente todavía no confirmó el resumen.</p>}
                </div>

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
                    <div className='pt-bloque'><span className='pt-campo-lbl'>Detalles del diseño</span>
                        <p className='pt-bloque-txt'>{p.detalles_diseno}</p></div>
                )}
                {p.alergias && (
                    <div className='pt-alerta'><FiAlertTriangle size={16}/>
                        <div><strong>Alergias / pedidos especiales</strong><p>{p.alergias}</p></div></div>
                )}

                {/* Pago (feature 3) */}
                <div className='pt-bloque-card'>
                    <span className='pt-campo-lbl'><FiDollarSign size={13}/> Pago</span>
                    {p.desglose_precio?.length > 0 && (
                        <ul className='pt-desglose-lista'>
                            {p.desglose_precio.map((c, i) => (
                                <li key={i}><span>{c.concepto}</span><span>${fmt(c.monto)}</span></li>
                            ))}
                        </ul>
                    )}
                    <div className='pt-pago-grid'>
                        <div className='pt-pago-item'><span>Total</span><strong>${fmt(p.precio_total)}</strong></div>
                        <div className='pt-pago-item'><span>Seña acordada</span><strong>${fmt(p.sena_monto)}</strong></div>
                        <div className='pt-pago-item'><span>Pagado</span><strong className='pt-verde'>${fmt(p.monto_pagado)}</strong></div>
                        <div className='pt-pago-item'><span>Saldo</span><strong className={saldo > 0 ? 'pt-naranja' : 'pt-verde'}>${fmt(saldo)}</strong></div>
                    </div>
                    {p.fecha_limite_pago && <p className='pt-nota-pago'>Debe terminar de abonar antes del <strong>{fmtFecha(p.fecha_limite_pago)}</strong>.</p>}
                </div>

                {/* Cancelación / cambios (feature 6) */}
                {(p.fecha_limite_cambios || p.politica_cancelacion) && (
                    <div className='pt-bloque-card'>
                        <span className='pt-campo-lbl'>Cancelación y cambios</span>
                        {p.fecha_limite_cambios && <p className='pt-bloque-txt'>Se puede cancelar o modificar hasta el <strong>{fmtFecha(p.fecha_limite_cambios)}</strong>.</p>}
                        <p className='pt-bloque-txt'>Seña {p.sena_reembolsable ? 'reembolsable' : 'no reembolsable'} en caso de cancelación.</p>
                        {p.politica_cancelacion && <p className='pt-bloque-txt'>{p.politica_cancelacion}</p>}
                    </div>
                )}

                {/* Log de cambios de último momento (feature 5) */}
                <div className='pt-bloque-card'>
                    <span className='pt-campo-lbl'><FiRefreshCw size={13}/> Cambios de último momento</span>
                    <div className='pt-cambio-form'>
                        <input placeholder='Ej: cambió de Toy Story a Cars' value={nuevoCambio.descripcion}
                            onChange={e => setNuevoCambio(v => ({ ...v, descripcion: e.target.value }))} />
                        <input type='number' min='0' placeholder='Costo extra' value={nuevoCambio.costo_extra}
                            onChange={e => setNuevoCambio(v => ({ ...v, costo_extra: e.target.value }))} className='pt-cambio-costo' />
                        <select value={nuevoCambio.resultado} onChange={e => setNuevoCambio(v => ({ ...v, resultado: e.target.value }))}>
                            <option value='aplicado'>Sin costo</option>
                            <option value='con_costo'>Con costo extra</option>
                            <option value='rechazado'>No se pudo</option>
                        </select>
                        <button className='pt-btn pt-btn--ghost' onClick={() => registrarCambio(p)}><FiPlus size={14}/> Registrar</button>
                    </div>
                    {p.cambios_log?.length > 0 && (
                        <ul className='pt-cambios-lista'>
                            {p.cambios_log.map((c, i) => {
                                const r = RESULTADO_CAMBIO[c.resultado] || RESULTADO_CAMBIO.aplicado
                                return (
                                    <li key={i}>
                                        <div><span className='pt-cambio-fecha'>{fmtFechaHora(c.fecha)}</span>
                                            <span className={`pt-cambio-badge ${r.clase}`}>{r.label}</span></div>
                                        <p>{c.descripcion}{Number(c.costo_extra) > 0 && <strong> · +${fmt(c.costo_extra)}</strong>}</p>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </div>

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

    // ══════════════ FORMULARIO ══════════════
    return (
        <div className='pt-panel'>
            <div className='pt-form-head'>
                <button className='pt-btn pt-btn--ghost' onClick={() => setVista(editandoId ? 'detalle' : 'lista')}><FiArrowLeft size={16}/> Volver</button>
                <h3>{editandoId ? 'Editar pedido' : 'Nuevo pedido de torta'}</h3>
            </div>

            <div className='pt-form'>
                <fieldset className='pt-fieldset'>
                    <legend>Cliente</legend>
                    <div className='pt-row'>
                        <label className='pt-field pt-field--full'><span>Nombre del cliente *</span>
                            <input value={form.cliente_nombre} onChange={e => set('cliente_nombre', e.target.value)} placeholder='Ej: María González'/></label>
                        <label className='pt-field pt-field--full'><span>Contacto (teléfono / WhatsApp / email)</span>
                            <input value={form.cliente_contacto} onChange={e => set('cliente_contacto', e.target.value)} placeholder='Ej: 261 555-1234'/></label>
                    </div>
                </fieldset>

                <fieldset className='pt-fieldset'>
                    <legend>Entrega</legend>
                    <div className='pt-row'>
                        <label className='pt-field'><span>Fecha del evento</span>
                            <input type='date' value={form.fecha_evento} onChange={e => set('fecha_evento', e.target.value)}/></label>
                        <label className='pt-field'><span>Horario de entrega / retiro</span>
                            <input type='time' value={form.hora_entrega} onChange={e => set('hora_entrega', e.target.value)}/></label>
                        <label className='pt-field'><span>Modo</span>
                            <select value={form.modo_entrega} onChange={e => set('modo_entrega', e.target.value)}>
                                <option value='retiro'>Retira el cliente</option>
                                <option value='entrega'>Entrega a domicilio</option>
                            </select></label>
                        <label className='pt-field'><span>Estado</span>
                            <select value={form.estado} onChange={e => set('estado', e.target.value)}>
                                {ESTADOS_ORDEN.map(e => <option key={e} value={e}>{ESTADOS_TORTA[e].label}</option>)}
                            </select></label>
                    </div>
                </fieldset>

                <fieldset className='pt-fieldset'>
                    <legend>La torta</legend>
                    <div className='pt-row'>
                        <label className='pt-field'><span>Para cuántas personas</span>
                            <input type='number' min='0' value={form.personas} onChange={e => set('personas', e.target.value)} placeholder='Ej: 30'/></label>
                        <label className='pt-field'><span>Cantidad de porciones</span>
                            <input type='number' min='0' value={form.porciones} onChange={e => set('porciones', e.target.value)} placeholder='Ej: 30'/></label>
                        <label className='pt-field'><span>Cantidad de pisos</span>
                            <input type='number' min='1' value={form.pisos} onChange={e => set('pisos', e.target.value)} placeholder='Ej: 2'/></label>
                    </div>
                    <div className='pt-row'>
                        <label className='pt-field'><span>Sabor</span>
                            <input value={form.sabor} onChange={e => set('sabor', e.target.value)} placeholder='Ej: Chocolate'/></label>
                        <label className='pt-field'><span>Rellenos</span>
                            <input value={form.rellenos} onChange={e => set('rellenos', e.target.value)} placeholder='Ej: Dulce de leche y frutillas'/></label>
                        <label className='pt-field'><span>Cobertura</span>
                            <input value={form.cobertura} onChange={e => set('cobertura', e.target.value)} placeholder='Ej: Fondant / crema'/></label>
                    </div>
                </fieldset>

                <fieldset className='pt-fieldset'>
                    <legend>Diseño</legend>
                    <div className='pt-row'>
                        <label className='pt-field'><span>Colores</span>
                            <input value={form.colores} onChange={e => set('colores', e.target.value)} placeholder='Ej: Rosa y dorado'/></label>
                        <label className='pt-field'><span>Temática</span>
                            <input value={form.tematica} onChange={e => set('tematica', e.target.value)} placeholder='Ej: Toy Story'/></label>
                    </div>
                    <label className='pt-field pt-field--full'><span>Detalles del diseño</span>
                        <textarea rows={3} value={form.detalles_diseno} onChange={e => set('detalles_diseno', e.target.value)}
                            placeholder='Figuras, adornos, mensaje en la torta, forma, etc.'/></label>
                </fieldset>

                <fieldset className='pt-fieldset'>
                    <legend>Alergias y pedidos especiales</legend>
                    <label className='pt-field pt-field--full'><span>Alergias, intolerancias o restricciones</span>
                        <textarea rows={2} value={form.alergias} onChange={e => set('alergias', e.target.value)}
                            placeholder='Ej: sin gluten, sin azúcar, sin frutos secos...'/></label>
                </fieldset>

                {/* Precio por componentes (feature 8) */}
                <fieldset className='pt-fieldset'>
                    <legend>Precio (por componentes)</legend>
                    <p className='pt-hint'>Armá el precio según lo que lleva: base, diseño, pisos, figuras, urgencia, etc.</p>
                    {form.desglose_precio.map((c, i) => (
                        <div key={i} className='pt-desglose-row'>
                            <input placeholder='Concepto (ej: Base 30 porciones)' value={c.concepto}
                                onChange={e => setDesglose(i, 'concepto', e.target.value)} />
                            <input type='number' min='0' placeholder='Monto' value={c.monto}
                                onChange={e => setDesglose(i, 'monto', e.target.value)} className='pt-desglose-monto' />
                            <button type='button' className='pt-desglose-del' onClick={() => quitarDesglose(i)}><FiX size={15}/></button>
                        </div>
                    ))}
                    <button type='button' className='pt-btn pt-btn--ghost pt-btn--sm' onClick={addDesglose}><FiPlus size={14}/> Agregar concepto</button>
                    <div className='pt-total-form'><span>Total</span><strong>${fmt(totalForm)}</strong></div>
                </fieldset>

                {/* Pago (feature 3) */}
                <fieldset className='pt-fieldset'>
                    <legend>Seña y pago</legend>
                    <div className='pt-row'>
                        <label className='pt-field'><span>Seña acordada</span>
                            <input type='number' min='0' value={form.sena_monto} onChange={e => set('sena_monto', e.target.value)} placeholder='Ej: 10000'/></label>
                        <label className='pt-field'><span>Monto pagado hasta ahora</span>
                            <input type='number' min='0' value={form.monto_pagado} onChange={e => set('monto_pagado', e.target.value)} placeholder='Ej: 10000'/></label>
                        <label className='pt-field'><span>Fecha límite para terminar de pagar</span>
                            <input type='date' value={form.fecha_limite_pago} onChange={e => set('fecha_limite_pago', e.target.value)}/></label>
                    </div>
                    <p className='pt-hint'>El pedido queda realmente confirmado cuando el cliente paga la seña — recordá pasar el estado a <strong>Confirmado</strong>.</p>
                </fieldset>

                {/* Cancelación (feature 6) */}
                <fieldset className='pt-fieldset'>
                    <legend>Cancelación y cambios</legend>
                    <div className='pt-row'>
                        <label className='pt-field'><span>Se puede cancelar / modificar hasta</span>
                            <input type='date' value={form.fecha_limite_cambios} onChange={e => set('fecha_limite_cambios', e.target.value)}/></label>
                        <label className='pt-field pt-field--check'>
                            <input type='checkbox' checked={form.sena_reembolsable} onChange={e => set('sena_reembolsable', e.target.checked)}/>
                            <span>La seña es reembolsable si se cancela a tiempo</span></label>
                    </div>
                    <label className='pt-field pt-field--full'><span>Política de cancelación (qué pasa con la seña, materiales, etc.)</span>
                        <textarea rows={2} value={form.politica_cancelacion} onChange={e => set('politica_cancelacion', e.target.value)}
                            placeholder='Ej: La seña cubre materiales ya comprados y no se reintegra dentro de los 5 días previos al evento.'/></label>
                </fieldset>

                <fieldset className='pt-fieldset'>
                    <legend>Fotos de referencia</legend>
                    <div className='pt-fotos-edit'>
                        {form.fotos_referencia.map((u, i) => (
                            <div key={i} className='pt-foto-thumb'><img src={u} alt={`ref ${i+1}`}/>
                                <button type='button' onClick={() => quitarFoto(u)}><FiX size={13}/></button></div>
                        ))}
                        <button type='button' className='pt-foto-add' onClick={() => fileRef.current?.click()} disabled={subiendoFoto}>
                            <FiUploadCloud size={20}/><span>{subiendoFoto ? 'Subiendo...' : 'Agregar fotos'}</span>
                        </button>
                        <input ref={fileRef} type='file' accept='image/*' multiple hidden onChange={e => subirFotos(Array.from(e.target.files || []))}/>
                    </div>
                </fieldset>

                {error && <p className='pt-error'>{error}</p>}
                <div className='pt-form-acciones'>
                    <button className='pt-btn pt-btn--ghost' onClick={() => setVista(editandoId ? 'detalle' : 'lista')}>Cancelar</button>
                    <button className='pt-btn pt-btn--primary' onClick={guardar} disabled={guardando || subiendoFoto}>
                        {guardando ? 'Guardando...' : editandoId ? 'Guardar cambios' : 'Crear pedido'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── Calendario mensual con la cantidad de pedidos por día (feature 9) ──
const Calendario = ({ pedidos, mes, anio, onMes, onPedido }) => {
    const porDia = useMemo(() => {
        const m = {}
        for (const p of pedidos) {
            if (!p.fecha_evento) continue
            const k = String(p.fecha_evento).slice(0, 10)
            ;(m[k] = m[k] || []).push(p)
        }
        return m
    }, [pedidos])

    const primerDia = new Date(anio, mes, 1)
    const offset = (primerDia.getDay() + 6) % 7 // lunes = 0
    const diasEnMes = new Date(anio, mes + 1, 0).getDate()
    const nombreMes = primerDia.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
    const celdas = []
    for (let i = 0; i < offset; i++) celdas.push(null)
    for (let d = 1; d <= diasEnMes; d++) celdas.push(d)

    const irMes = (delta) => {
        let nm = mes + delta, na = anio
        if (nm < 0) { nm = 11; na-- } else if (nm > 11) { nm = 0; na++ }
        onMes(nm, na)
    }
    const hoyStr = new Date().toISOString().slice(0, 10)

    return (
        <div className='pt-cal'>
            <div className='pt-cal-head'>
                <button className='pt-btn pt-btn--ghost pt-btn--sm' onClick={() => irMes(-1)}><FiChevronLeft size={16}/></button>
                <strong>{nombreMes}</strong>
                <button className='pt-btn pt-btn--ghost pt-btn--sm' onClick={() => irMes(1)}><FiChevronRight size={16}/></button>
            </div>
            <div className='pt-cal-grid pt-cal-dow'>
                {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d => <span key={d}>{d}</span>)}
            </div>
            <div className='pt-cal-grid'>
                {celdas.map((d, i) => {
                    if (!d) return <div key={i} className='pt-cal-cell pt-cal-cell--empty' />
                    const k = `${anio}-${String(mes+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
                    const items = porDia[k] || []
                    return (
                        <div key={i} className={`pt-cal-cell ${k === hoyStr ? 'pt-cal-cell--hoy' : ''} ${items.length ? 'pt-cal-cell--con' : ''}`}>
                            <span className='pt-cal-num'>{d}</span>
                            {items.length > 0 && (
                                <div className='pt-cal-items'>
                                    {items.slice(0, 3).map(p => (
                                        <button key={p.id_pedido} className='pt-cal-pill' title={p.cliente_nombre} onClick={() => onPedido(p)}>
                                            🎂 {p.cliente_nombre}
                                        </button>
                                    ))}
                                    {items.length > 3 && <span className='pt-cal-mas'>+{items.length - 3} más</span>}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default PedidosTortaPanel
