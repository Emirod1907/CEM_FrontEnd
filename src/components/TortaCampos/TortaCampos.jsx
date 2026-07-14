import React, { useRef, useState } from 'react'
import UploadImg from '../../services/uploadimg'
import { FiUploadCloud, FiX, FiAlertTriangle } from 'react-icons/fi'
import './TortaCampos.css'

// Requisitos de una torta que el organizador completa al pedirla (o el
// pastelero al cargar un pedido manual). Viaja dentro del ítem del servicio
// como `detalle_torta`, así se ve en el detalle de la reserva de ambos lados.
export const TORTA_VACIO = {
    modo_entrega: 'retiro', hora_entrega: '',
    personas: '', porciones: '', pisos: '',
    sabor: '', rellenos: '', cobertura: '',
    colores: '', tematica: '', detalles_diseno: '', alergias: '',
    fotos_referencia: [],
}

// ¿El detalle tiene algún dato cargado? (para decidir si mostrarlo)
export const tieneDatosTorta = (d) => {
    if (!d) return false
    return ['sabor', 'rellenos', 'cobertura', 'colores', 'tematica', 'detalles_diseno',
        'alergias', 'porciones', 'pisos', 'hora_entrega'].some(k => d[k]) ||
        (Array.isArray(d.fotos_referencia) && d.fotos_referencia.length > 0)
}

// ── Formulario editable ──
export const TortaCamposForm = ({ value, onChange, cupo }) => {
    const v = { ...TORTA_VACIO, ...(value || {}) }
    const [subiendo, setSubiendo] = useState(false)
    const fileRef = useRef(null)
    const set = (campo, val) => onChange({ ...v, [campo]: val })

    const subirFotos = async (files) => {
        if (!files?.length) return
        setSubiendo(true)
        try {
            const urls = []
            for (const f of files) { const u = await UploadImg(f); if (u) urls.push(u) }
            onChange({ ...v, fotos_referencia: [...(v.fotos_referencia || []), ...urls] })
        } finally {
            setSubiendo(false)
            if (fileRef.current) fileRef.current.value = ''
        }
    }
    const quitarFoto = (url) => onChange({ ...v, fotos_referencia: (v.fotos_referencia || []).filter(u => u !== url) })

    return (
        <div className='tc-form'>
            <div className='tc-row'>
                <label className='tc-field'><span>Modo</span>
                    <select value={v.modo_entrega} onChange={e => set('modo_entrega', e.target.value)}>
                        <option value='retiro'>Retira el cliente</option>
                        <option value='entrega'>Entrega a domicilio</option>
                    </select></label>
                <label className='tc-field'><span>Horario de entrega / retiro</span>
                    <input type='time' value={v.hora_entrega} onChange={e => set('hora_entrega', e.target.value)}/></label>
            </div>
            <div className='tc-row'>
                <label className='tc-field'><span>Para cuántas personas</span>
                    <input type='number' min='0' value={v.personas} onChange={e => set('personas', e.target.value)}
                        placeholder={cupo ? `Ej: ${cupo}` : 'Ej: 30'}/></label>
                <label className='tc-field'><span>Porciones</span>
                    <input type='number' min='0' value={v.porciones} onChange={e => set('porciones', e.target.value)} placeholder='Ej: 30'/></label>
                <label className='tc-field'><span>Pisos</span>
                    <input type='number' min='1' value={v.pisos} onChange={e => set('pisos', e.target.value)} placeholder='Ej: 2'/></label>
            </div>
            <div className='tc-row'>
                <label className='tc-field'><span>Sabor</span>
                    <input value={v.sabor} onChange={e => set('sabor', e.target.value)} placeholder='Ej: Chocolate'/></label>
                <label className='tc-field'><span>Rellenos</span>
                    <input value={v.rellenos} onChange={e => set('rellenos', e.target.value)} placeholder='Ej: Dulce de leche y frutillas'/></label>
                <label className='tc-field'><span>Cobertura</span>
                    <input value={v.cobertura} onChange={e => set('cobertura', e.target.value)} placeholder='Ej: Fondant / crema'/></label>
            </div>
            <div className='tc-row'>
                <label className='tc-field'><span>Colores</span>
                    <input value={v.colores} onChange={e => set('colores', e.target.value)} placeholder='Ej: Rosa y dorado'/></label>
                <label className='tc-field'><span>Temática</span>
                    <input value={v.tematica} onChange={e => set('tematica', e.target.value)} placeholder='Ej: Toy Story'/></label>
            </div>
            <label className='tc-field tc-field--full'><span>Detalles del diseño</span>
                <textarea rows={2} value={v.detalles_diseno} onChange={e => set('detalles_diseno', e.target.value)}
                    placeholder='Figuras, adornos, mensaje en la torta, forma, etc.'/></label>
            <label className='tc-field tc-field--full'><span>Alergias / pedidos especiales</span>
                <textarea rows={2} value={v.alergias} onChange={e => set('alergias', e.target.value)}
                    placeholder='Ej: sin gluten, sin azúcar, sin frutos secos...'/></label>

            <div className='tc-field tc-field--full'>
                <span>Fotos de referencia</span>
                <div className='tc-fotos'>
                    {(v.fotos_referencia || []).map((u, i) => (
                        <div key={i} className='tc-foto-thumb'><img src={u} alt={`ref ${i+1}`}/>
                            <button type='button' onClick={() => quitarFoto(u)}><FiX size={13}/></button></div>
                    ))}
                    <button type='button' className='tc-foto-add' onClick={() => fileRef.current?.click()} disabled={subiendo}>
                        <FiUploadCloud size={18}/><span>{subiendo ? 'Subiendo...' : 'Agregar'}</span>
                    </button>
                    <input ref={fileRef} type='file' accept='image/*' multiple hidden onChange={e => subirFotos(Array.from(e.target.files || []))}/>
                </div>
            </div>
        </div>
    )
}

// ── Vista de solo lectura (detalle de reserva) ──
export const TortaDetalleView = ({ detalle, compacto = false }) => {
    if (!tieneDatosTorta(detalle)) return null
    const d = detalle
    const Item = ({ label, valor }) => valor ? (
        <div className='tc-dato'><span>{label}</span><strong>{valor}</strong></div>
    ) : null
    return (
        <div className={`tc-view ${compacto ? 'tc-view--compacto' : ''}`}>
            <div className='tc-view-titulo'>🎂 Detalles de la torta</div>
            <div className='tc-view-grid'>
                <Item label='Modo' valor={d.modo_entrega === 'entrega' ? 'Entrega a domicilio' : d.modo_entrega === 'retiro' ? 'Retira el cliente' : null} />
                <Item label='Horario' valor={d.hora_entrega} />
                <Item label='Personas' valor={d.personas ? `${d.personas}` : null} />
                <Item label='Porciones' valor={d.porciones ? `${d.porciones}` : null} />
                <Item label='Pisos' valor={d.pisos ? `${d.pisos}` : null} />
                <Item label='Sabor' valor={d.sabor} />
                <Item label='Rellenos' valor={d.rellenos} />
                <Item label='Cobertura' valor={d.cobertura} />
                <Item label='Colores' valor={d.colores} />
                <Item label='Temática' valor={d.tematica} />
            </div>
            {d.detalles_diseno && <p className='tc-view-txt'><b>Diseño:</b> {d.detalles_diseno}</p>}
            {d.alergias && (
                <div className='tc-view-alerta'><FiAlertTriangle size={14}/>
                    <span><b>Alergias / especiales:</b> {d.alergias}</span></div>
            )}
            {(d.fotos_referencia?.length > 0) && (
                <div className='tc-view-fotos'>
                    {d.fotos_referencia.map((u, i) => (
                        <a key={i} href={u} target='_blank' rel='noreferrer'><img src={u} alt={`ref ${i+1}`}/></a>
                    ))}
                </div>
            )}
        </div>
    )
}
