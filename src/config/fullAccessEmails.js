// Emails con acceso completo a todas las secciones (super administradores).
// Además de los base, se pueden sumar desde la variable de entorno VITE_FULL_ACCESS_EMAILS
// (separados por coma) para probar todos los roles con el propio mail sin tocar el código.
const BASE = ['emi.electro2012@gmail.com', 'emi.rodri1907guez@gmail.com']

const desdeEnv = (import.meta.env.VITE_FULL_ACCESS_EMAILS || '')
    .split(',')
    .map(e => e.trim())
    .filter(Boolean)

export const EMAILS_FULL_ACCESS = [...new Set([...BASE, ...desdeEnv])]
