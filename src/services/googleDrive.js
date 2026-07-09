// Sube un archivo a Google Drive convirtiéndolo a Google Sheets, usando Google
// Identity Services (mismo patrón que la importación de contactos de invitaciones).

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

// Carga el script de GIS una sola vez
const loadGIS = (() => {
    let p = null
    return () => {
        if (!p) p = new Promise((resolve) => {
            if (window.google?.accounts?.oauth2) { resolve(); return }
            const s = document.createElement('script')
            s.src = 'https://accounts.google.com/gsi/client'
            s.async = true
            s.onload = resolve
            document.head.appendChild(s)
        })
        return p
    }
})()

// Pide un access_token con el scope indicado (popup de consentimiento de Google)
const getToken = (scope) => new Promise((resolve, reject) => {
    if (!GOOGLE_CLIENT_ID) { reject(new Error('Falta VITE_GOOGLE_CLIENT_ID')); return }
    const client = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope,
        callback: (r) => r.error ? reject(new Error(r.error_description || r.error)) : resolve(r.access_token),
    })
    client.requestAccessToken({ prompt: '' })
})

// Sube el blob (xlsx) a Drive convirtiéndolo a Google Sheets. Devuelve el link para editar.
export async function subirPlantillaADrive(blob, nombre = 'Plantilla de productos - Dream Events') {
    await loadGIS()
    const token = await getToken('https://www.googleapis.com/auth/drive.file')

    const metadata = { name: nombre, mimeType: 'application/vnd.google-apps.spreadsheet' }
    const form = new FormData()
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
    form.append('file', blob)

    const res = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
        { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form }
    )
    if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || 'No se pudo subir a Google Drive')
    }
    const data = await res.json()
    return data.webViewLink || `https://docs.google.com/spreadsheets/d/${data.id}/edit`
}
