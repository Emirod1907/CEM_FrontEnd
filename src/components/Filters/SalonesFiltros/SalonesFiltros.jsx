import React, { useState } from 'react'
import './SalonesFiltros.css'

const parsearJSON = (valor) => {
    if (!valor) return []
    if (Array.isArray(valor)) return valor
    try { return JSON.parse(valor) } catch { return [] }
}

const Seccion = ({ titulo, activos, children }) => {
    const [abierta, setAbierta] = useState(false)
    return (
        <div className='filtros-seccion'>
            <button className='filtros-seccion-header' onClick={() => setAbierta(a => !a)}>
                <span className={`filtros-seccion-chevron ${abierta ? 'abierto' : ''}`}>›</span>
                <span className='filtros-seccion-titulo'>{titulo}</span>
                {activos > 0 && <span className='filtros-seccion-badge'>{activos}</span>}
            </button>
            {abierta && <div className='filtros-seccion-contenido'>{children}</div>}
        </div>
    )
}

const SalonesFiltros = ({ salones, filters, onFiltersChange, cupoFiltro }) => {
    const departamentosUnicos = [...new Set(salones.map(b => b.departamento).filter(Boolean))].sort()
    const localidadesUnicas = [...new Set(salones.map(b => b.localidad).filter(Boolean))].sort()

    const aforoValues = salones.map(b => b.aforo).filter(a => a != null)
    const aforoMinGlobal = aforoValues.length ? Math.min(...aforoValues) : 0
    const aforoMaxGlobal = aforoValues.length ? Math.max(...aforoValues) : 1000

    const serviciosUnicos = [...new Set(
        salones.flatMap(s => parsearJSON(s.servicios_incluidos))
    )].filter(Boolean).sort()

    const tiposEventoUnicos = [...new Set(
        salones.flatMap(s => parsearJSON(s.tipos_evento))
    )].filter(Boolean).sort()

    const tiposSalonUnicos = [...new Set(
        salones.map(s => s.tipo_salon)
    )].filter(Boolean).sort()

    const hayFiltrosActivos =
        filters.departamentos.length > 0 ||
        filters.localidades.length > 0 ||
        filters.aforoMin !== '' ||
        filters.aforoMax !== '' ||
        filters.servicios.length > 0 ||
        filters.tiposEvento.length > 0 ||
        (filters.tiposSalon || []).length > 0

    const toggle = (campo, valor) => {
        const actual = filters[campo] || []
        const updated = actual.includes(valor)
            ? actual.filter(v => v !== valor)
            : [...actual, valor]
        onFiltersChange({ ...filters, [campo]: updated })
    }

    const handleLimpiar = () => {
        onFiltersChange({ departamentos: [], localidades: [], aforoMin: '', aforoMax: '', servicios: [], tiposEvento: [], tiposSalon: [] })
    }

    return (
        <aside className='filtros-aside'>
            <div className='filtros-header'>
                <h2 className='filtros-titulo'>Filtros</h2>
                {hayFiltrosActivos && (
                    <button className='filtros-limpiar-btn' onClick={handleLimpiar}>Limpiar</button>
                )}
            </div>

            <Seccion titulo='Tipo de salón' activos={(filters.tiposSalon || []).length}>
                {tiposSalonUnicos.length === 0
                    ? <p className='filtros-sin-datos'>Sin datos</p>
                    : <ul className='filtros-lista'>
                        {tiposSalonUnicos.map(tipo => (
                            <li key={tipo}>
                                <label className='filtros-checkbox-label'>
                                    <input type='checkbox' checked={(filters.tiposSalon || []).includes(tipo)}
                                        onChange={() => toggle('tiposSalon', tipo)}
                                        className='filtros-checkbox filtros-checkbox--tipo'/>
                                    <span className='filtros-checkbox-texto filtros-tag-tipo'>{tipo}</span>
                                </label>
                            </li>
                        ))}
                    </ul>
                }
            </Seccion>

            <Seccion titulo='Departamento' activos={filters.departamentos.length}>
                {departamentosUnicos.length === 0
                    ? <p className='filtros-sin-datos'>Sin datos</p>
                    : <ul className='filtros-lista'>
                        {departamentosUnicos.map(dep => (
                            <li key={dep}>
                                <label className='filtros-checkbox-label'>
                                    <input type='checkbox' checked={filters.departamentos.includes(dep)}
                                        onChange={() => toggle('departamentos', dep)} className='filtros-checkbox'/>
                                    <span className='filtros-checkbox-texto'>{dep}</span>
                                </label>
                            </li>
                        ))}
                    </ul>
                }
            </Seccion>

            <Seccion titulo='Localidad' activos={filters.localidades.length}>
                {localidadesUnicas.length === 0
                    ? <p className='filtros-sin-datos'>Sin datos</p>
                    : <ul className='filtros-lista'>
                        {localidadesUnicas.map(loc => (
                            <li key={loc}>
                                <label className='filtros-checkbox-label'>
                                    <input type='checkbox' checked={filters.localidades.includes(loc)}
                                        onChange={() => toggle('localidades', loc)} className='filtros-checkbox'/>
                                    <span className='filtros-checkbox-texto'>{loc}</span>
                                </label>
                            </li>
                        ))}
                    </ul>
                }
            </Seccion>

            <Seccion titulo='Aforo' activos={(filters.aforoMin !== '' ? 1 : 0) + (filters.aforoMax !== '' ? 1 : 0)}>
                {cupoFiltro ? (
                    // En el contexto de crear evento, el cupo ya filtra automáticamente
                    <div className='filtros-aforo-cupo-fijo'>
                        <span className='filtros-aforo-cupo-label'>Mínimo requerido</span>
                        <span className='filtros-aforo-cupo-valor'>≥ {cupoFiltro} personas</span>
                        <span className='filtros-aforo-cupo-hint'>Basado en el cupo de tu evento. Solo se muestran salones que lo superan.</span>
                    </div>
                ) : (
                    // Búsqueda libre: filtro por rango de aforo del salón
                    <div className='filtros-aforo'>
                        <div className='filtros-aforo-campo'>
                            <label className='filtros-aforo-label'>Al menos (personas)</label>
                            <input type='number' min={0} placeholder={aforoMinGlobal} value={filters.aforoMin}
                                onChange={e => onFiltersChange({ ...filters, aforoMin: e.target.value })}
                                className='filtros-input-number'/>
                        </div>
                        <div className='filtros-aforo-campo'>
                            <label className='filtros-aforo-label'>Como máximo (personas)</label>
                            <input type='number' min={0} placeholder={aforoMaxGlobal} value={filters.aforoMax}
                                onChange={e => onFiltersChange({ ...filters, aforoMax: e.target.value })}
                                className='filtros-input-number'/>
                        </div>
                    </div>
                )}
            </Seccion>

            <Seccion titulo='Prestaciones incluídas' activos={filters.servicios.length}>
                {serviciosUnicos.length === 0
                    ? <p className='filtros-sin-datos'>Sin datos</p>
                    : <ul className='filtros-lista'>
                        {serviciosUnicos.map(serv => (
                            <li key={serv}>
                                <label className='filtros-checkbox-label'>
                                    <input type='checkbox' checked={filters.servicios.includes(serv)}
                                        onChange={() => toggle('servicios', serv)}
                                        className='filtros-checkbox filtros-checkbox--servicio'/>
                                    <span className='filtros-checkbox-texto filtros-tag-servicio'>{serv}</span>
                                </label>
                            </li>
                        ))}
                    </ul>
                }
            </Seccion>

            <Seccion titulo='Ideal para' activos={filters.tiposEvento.length}>
                {tiposEventoUnicos.length === 0
                    ? <p className='filtros-sin-datos'>Sin datos</p>
                    : <ul className='filtros-lista'>
                        {tiposEventoUnicos.map(tipo => (
                            <li key={tipo}>
                                <label className='filtros-checkbox-label'>
                                    <input type='checkbox' checked={filters.tiposEvento.includes(tipo)}
                                        onChange={() => toggle('tiposEvento', tipo)}
                                        className='filtros-checkbox filtros-checkbox--tipo'/>
                                    <span className='filtros-checkbox-texto filtros-tag-tipo'>{tipo}</span>
                                </label>
                            </li>
                        ))}
                    </ul>
                }
            </Seccion>
        </aside>
    )
}

export default SalonesFiltros
