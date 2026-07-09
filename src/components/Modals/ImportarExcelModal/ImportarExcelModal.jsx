import React, { useRef, useState } from 'react'
import { descargarPlantillaExcel, getPlantillaExcelBlob, previewImportarExcel, confirmarImportarExcel } from '../../../services/servicioServices'
import { subirPlantillaADrive } from '../../../services/googleDrive'
import { FiX, FiDownload, FiUploadCloud, FiCheckCircle, FiAlertTriangle, FiFileText, FiEdit } from 'react-icons/fi'
import './ImportarExcelModal.css'

const ImportarExcelModal = ({ onClose, onImportado }) => {
    const [archivo, setArchivo] = useState(null)
    const [preview, setPreview] = useState(null)   // { filas_validas, filas_invalidas, ... }
    const [cargando, setCargando] = useState(false)
    const [importando, setImportando] = useState(false)
    const [error, setError] = useState('')
    const [resultado, setResultado] = useState(null) // { creados, errores }
    const [subiendoDrive, setSubiendoDrive] = useState(false)
    const inputRef = useRef(null)

    const elegirArchivo = async (e) => {
        const f = e.target.files?.[0]
        if (!f) return
        setArchivo(f)
        setPreview(null)
        setResultado(null)
        setError('')
        setCargando(true)
        try {
            const data = await previewImportarExcel(f)
            setPreview(data)
        } catch (err) {
            setError(err?.response?.data?.message || 'No se pudo leer el archivo. Verificá que sea un .xlsx válido.')
        } finally {
            setCargando(false)
        }
    }

    const importar = async () => {
        if (!archivo) return
        setImportando(true)
        setError('')
        try {
            const data = await confirmarImportarExcel(archivo)
            setResultado(data)
            onImportado?.()
        } catch (err) {
            setError(err?.response?.data?.message || 'No se pudieron importar los productos.')
        } finally {
            setImportando(false)
        }
    }

    const descargar = async () => {
        try { await descargarPlantillaExcel() }
        catch { setError('No se pudo descargar la plantilla.') }
    }

    const editarEnDrive = async () => {
        setSubiendoDrive(true)
        setError('')
        try {
            const blob = await getPlantillaExcelBlob()
            const link = await subirPlantillaADrive(blob)
            window.open(link, '_blank', 'noopener')
        } catch (err) {
            setError(err?.message || 'No se pudo abrir la plantilla en Google Drive.')
        } finally {
            setSubiendoDrive(false)
        }
    }

    const validas = preview?.filas_validas || []
    const invalidas = preview?.filas_invalidas || []

    return (
        <div className="imx-overlay" onClick={onClose}>
            <div className="imx-modal" onClick={(e) => e.stopPropagation()}>
                <div className="imx-header">
                    <h2><FiFileText size={20} /> Importar productos desde Excel</h2>
                    <button className="imx-cerrar" onClick={onClose}><FiX size={20} /></button>
                </div>

                <div className="imx-body">
                    {/* Resultado final */}
                    {resultado ? (
                        <div className="imx-resultado">
                            <FiCheckCircle size={48} className="imx-ok-icon" />
                            <h3>¡Se importaron {resultado.creados} producto(s)!</h3>
                            {resultado.errores?.length > 0 && (
                                <p className="imx-hint">
                                    {resultado.errores.length} fila(s) se omitieron por errores.
                                </p>
                            )}
                            <p className="imx-hint">Ahora podés agregarles una foto desde la tienda.</p>
                            <button className="imx-btn imx-btn-primary" onClick={onClose}>Listo</button>
                        </div>
                    ) : (
                        <>
                            {/* Paso 1: plantilla */}
                            <div className="imx-paso">
                                <span className="imx-paso-num">1</span>
                                <div className="imx-paso-body">
                                    <strong>Descargá la plantilla de ejemplo</strong>
                                    <p className="imx-hint">Columnas: producto, marca, presentación, precio, categoría, cantidad mínima y % de descuento.</p>
                                    <div className="imx-plantilla-btns">
                                        <button className="imx-btn imx-btn-outline" onClick={descargar}>
                                            <FiDownload size={15} /> Descargar plantilla
                                        </button>
                                        <button className="imx-btn imx-btn-outline imx-btn-drive" onClick={editarEnDrive} disabled={subiendoDrive}>
                                            <FiEdit size={15} /> {subiendoDrive ? 'Abriendo…' : 'Editar en Google Drive'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Paso 2: subir */}
                            <div className="imx-paso">
                                <span className="imx-paso-num">2</span>
                                <div className="imx-paso-body">
                                    <strong>Subí tu archivo completado</strong>
                                    <p className="imx-hint">Formato .xlsx o .xls (máx. 5 MB).</p>
                                    <input
                                        ref={inputRef}
                                        type="file"
                                        accept=".xlsx,.xls"
                                        onChange={elegirArchivo}
                                        style={{ display: 'none' }}
                                    />
                                    <button className="imx-btn imx-btn-outline" onClick={() => inputRef.current?.click()}>
                                        <FiUploadCloud size={15} /> {archivo ? archivo.name : 'Elegir archivo'}
                                    </button>
                                </div>
                            </div>

                            {error && <div className="imx-error"><FiAlertTriangle size={15} /> {error}</div>}
                            {cargando && <p className="imx-hint imx-cargando">Leyendo archivo…</p>}

                            {/* Preview */}
                            {preview && (
                                <div className="imx-preview">
                                    <div className="imx-preview-resumen">
                                        <span className="imx-badge imx-badge-ok">{validas.length} válido(s)</span>
                                        {invalidas.length > 0 && (
                                            <span className="imx-badge imx-badge-err">{invalidas.length} con error</span>
                                        )}
                                        {preview.comision_aplicada > 0 && (
                                            <span className="imx-hint">Comisión aplicada al público: {preview.comision_aplicada}%</span>
                                        )}
                                    </div>

                                    {validas.length > 0 && (
                                        <div className="imx-tabla-wrap">
                                            <table className="imx-tabla">
                                                <thead>
                                                    <tr>
                                                        <th>Producto</th>
                                                        <th>Marca</th>
                                                        <th>Precio</th>
                                                        <th>Categoría</th>
                                                        <th>Descuento</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {validas.map((f, i) => (
                                                        <tr key={i}>
                                                            <td>
                                                                <strong>{f.nombre}</strong>
                                                                {f.descripcion && <div className="imx-desc">{f.descripcion}</div>}
                                                            </td>
                                                            <td>{f.marca || '—'}</td>
                                                            <td>${Number(f.precio_base).toLocaleString('es-AR')}</td>
                                                            <td>{f.categoria}</td>
                                                            <td>
                                                                {f.descuento_cantidad_min
                                                                    ? `${f.descuento_porcentaje}% desde ${f.descuento_cantidad_min} u`
                                                                    : '—'}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    {invalidas.length > 0 && (
                                        <div className="imx-errores">
                                            <strong>Filas con error (se omitirán):</strong>
                                            <ul>
                                                {invalidas.map((e, i) => (
                                                    <li key={i}>Fila {e.fila}: {e.error}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {validas.length > 0 && (
                                        <button className="imx-btn imx-btn-primary imx-importar" onClick={importar} disabled={importando}>
                                            {importando ? 'Importando…' : `Importar ${validas.length} producto(s)`}
                                        </button>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

export default ImportarExcelModal
