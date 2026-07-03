import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import { actualizarServiciosReserva, getReservaDetalle } from '../services/reservaServices'
import { precioUnitarioConDescuento } from '../utils/preciosUtils'
import { useAuth } from './PersonaContextProvider'

const CarritoContext = createContext()

export const useCarrito = () => {
    const context = useContext(CarritoContext)
    if (!context)
        throw new Error('useCarrito debe usarse dentro de CarritoContextProvider')
    return context
}

const STORAGE_KEY = 'cem_carrito'
const STORAGE_KEY_ORG = 'cem_carrito_organizador'

const CarritoContextProvider = ({ children }) => {
    // --- Carrito cliente (entradas a eventos) ---
    const [items, setItems] = useState(() => {
        try {
            const guardado = localStorage.getItem(STORAGE_KEY)
            return guardado ? JSON.parse(guardado) : []
        } catch {
            return []
        }
    })

    // --- Carrito organizador (reserva de salón + servicios) ---
    const [reservaOrganizador, setReservaOrganizador] = useState(() => {
        try {
            const guardado = localStorage.getItem(STORAGE_KEY_ORG)
            if (!guardado) return null
            const parsed = JSON.parse(guardado)
            return parsed?.reserva || null
        } catch {
            return null
        }
    })
    const [serviciosCarrito, setServiciosCarrito] = useState(() => {
        try {
            const guardado = localStorage.getItem(STORAGE_KEY_ORG)
            if (!guardado) return []
            const parsed = JSON.parse(guardado)
            return parsed?.servicios || []
        } catch {
            return []
        }
    })

    const [precioEntrada, setPrecioEntrada] = useState(() => {
        try {
            const guardado = localStorage.getItem(STORAGE_KEY_ORG)
            if (!guardado) return ''
            const parsed = JSON.parse(guardado)
            return parsed?.precioEntrada ?? ''
        } catch {
            return ''
        }
    })

    // Cantidad de invitados para cálculo de servicios por persona
    const [numInvitados, setNumInvitados] = useState(() => {
        try {
            const guardado = localStorage.getItem(STORAGE_KEY_ORG)
            if (!guardado) return ''
            const parsed = JSON.parse(guardado)
            return parsed?.numInvitados ?? ''
        } catch {
            return ''
        }
    })

    const { isAuthenticated } = useAuth()

    const [isCartOpen, setIsCartOpen] = useState(false)

    // Cache en memoria: { [id_reserva]: servicios[] }
    // Se actualiza cada vez que el usuario modifica el carrito, sin necesidad de ir al backend.
    const serviciosCacheRef = useRef({})

    // Actualizar cache cuando cambia el carrito
    useEffect(() => {
        if (reservaOrganizador?.id_reserva) {
            serviciosCacheRef.current[reservaOrganizador.id_reserva] = serviciosCarrito
        }
    }, [serviciosCarrito, reservaOrganizador?.id_reserva])

    // Persistir carrito cliente
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    }, [items])

    // Persistir carrito organizador en localStorage
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY_ORG, JSON.stringify({
            reserva: reservaOrganizador,
            servicios: serviciosCarrito,
            precioEntrada,
            numInvitados
        }))
    }, [reservaOrganizador, serviciosCarrito, precioEntrada, numInvitados])

    // Sincronizar servicios y numInvitados con la reserva en el backend cuando cambian
    const syncTimeoutRef = useRef(null)
    useEffect(() => {
        if (!reservaOrganizador?.id_reserva || !isAuthenticated) return
        clearTimeout(syncTimeoutRef.current)
        syncTimeoutRef.current = setTimeout(() => {
            actualizarServiciosReserva(
                reservaOrganizador.id_reserva,
                serviciosCarrito,
                numInvitados || null
            )
        }, 800)
        return () => clearTimeout(syncTimeoutRef.current)
    }, [serviciosCarrito, numInvitados, reservaOrganizador?.id_reserva, isAuthenticated])

    // Sincronizar el monto del alquiler con el backend al montar / cambiar de reserva.
    // El carrito guarda un snapshot en localStorage que puede quedar desactualizado si
    // el precio se recalculó (feriado/finde/% del salón). Refresca monto y comisión.
    useEffect(() => {
        const id = reservaOrganizador?.id_reserva
        if (!id || !isAuthenticated) return
        let activo = true
        getReservaDetalle(id).then(data => {
            const r = data?.reserva
            if (!activo || !r) return
            const nuevoMonto = Number(r.monto_alquiler)
            const nuevaComision = Number(r.comision_cliente_porcentaje) || 0
            setReservaOrganizador(prev => {
                if (!prev || prev.id_reserva !== id) return prev
                if (Number(prev.monto_alquiler) === nuevoMonto &&
                    Number(prev.comision_cliente_porcentaje ?? 0) === nuevaComision) return prev
                return { ...prev, monto_alquiler: nuevoMonto, comision_cliente_porcentaje: nuevaComision }
            })
        }).catch(() => {})
        return () => { activo = false }
    }, [reservaOrganizador?.id_reserva, isAuthenticated])

    // --- Carrito cliente: totales ---
    const totalItems = items.reduce((acc, item) => acc + item.cantidad, 0)
    const totalPrecio = items.reduce((acc, item) => acc + item.precio * item.cantidad, 0)

    // --- Carrito organizador: totales ---
    // Para servicios por persona se usa numInvitados (con fallback al cupo del evento)
    const cupoReserva = Number(reservaOrganizador?.datos_evento?.cupo) || 0
    const invitadosEfectivos = Number(numInvitados) > 0 ? Number(numInvitados) : cupoReserva

    const totalServiciosOrg = serviciosCarrito.reduce((acc, s) => {
        let multiplicador = 1
        if (s.tipo_precio === 'por_persona') {
            // El ítem puede tener su propia cantidad de personas (ej: comida para 30),
            // si no, cae al total de invitados del evento.
            const personasItem = Number(s.personas) > 0 ? Number(s.personas) : invitadosEfectivos
            multiplicador = personasItem > 0 ? personasItem : 1
        }
        else if (s.tipo_precio === 'por_hora')   multiplicador = Number(s.horas)  > 0 ? Number(s.horas)  : 1
        else if (s.tipo_precio === 'por_turno')  multiplicador = Number(s.turnos) > 0 ? Number(s.turnos) : 1
        // Aplica descuento por cantidad (productos) según las unidades del ítem
        return acc + precioUnitarioConDescuento(s) * s.cantidad * multiplicador
    }, 0)

    const montoAlquiler = reservaOrganizador ? Number(reservaOrganizador.monto_alquiler) : 0
    // factorComision viene de la reserva (comision_cliente_porcentaje del contrato del dueño)
    // El mismo factor que aplica pago.controller.ts al crear la preferencia de MP
    const comisionClientePct = reservaOrganizador?.comision_cliente_porcentaje ?? 0
    const factorComisionOrg = 1 + Number(comisionClientePct) / 100
    const montoAlquilerConComision = +(montoAlquiler * factorComisionOrg).toFixed(2)
    const totalOrganizador = +((montoAlquiler + totalServiciosOrg) * factorComisionOrg).toFixed(2)
    const montoSena = +(totalOrganizador * 0.30).toFixed(2)

    // --- Métodos carrito cliente ---
    const agregarItem = (evento) => {
        setItems((prev) => {
            const existente = prev.find((i) => i.id_evento === evento.id_evento)
            if (existente) {
                return prev.map((i) =>
                    i.id_evento === evento.id_evento
                        ? { ...i, cantidad: i.cantidad + 1 }
                        : i
                )
            }
            return [
                ...prev,
                {
                    id_evento: evento.id_evento,
                    nombre: evento.nombre,
                    descripcion: evento.descripcion,
                    precio: Number(evento.precio),
                    imagen: evento.imagen,
                    cantidad: 1,
                },
            ]
        })
    }

    const quitarItem = (id_evento) => {
        setItems((prev) => prev.filter((i) => i.id_evento !== id_evento))
    }

    const actualizarCantidad = (id_evento, cantidad) => {
        if (cantidad <= 0) {
            quitarItem(id_evento)
            return
        }
        setItems((prev) =>
            prev.map((i) => (i.id_evento === id_evento ? { ...i, cantidad } : i))
        )
    }

    const vaciarCarrito = () => setItems([])

    // --- Métodos carrito organizador ---
    const agregarReservaOrganizador = (reserva, abrirCarrito = true) => {
        const esMismaReserva = reservaOrganizador?.id_reserva === reserva?.id_reserva
        setReservaOrganizador(reserva)
        if (!esMismaReserva) {
            // 1. Buscar en el cache en memoria (refleja cambios hechos en esta sesión)
            const cached = serviciosCacheRef.current[reserva?.id_reserva]
            // 2. Fallback: servicios guardados en el backend (datos_evento.servicios)
            const serviciosGuardados = Array.isArray(reserva?.datos_evento?.servicios)
                ? reserva.datos_evento.servicios
                : []
            setServiciosCarrito(
                cached && cached.length > 0 ? cached : serviciosGuardados
            )
            // Pre-cargar precio de entrada si el organizador lo ingresó en el form
            const precioForm = reserva?.datos_evento?.cobrar_entrada && Number(reserva?.datos_evento?.precio) > 0
                ? String(reserva.datos_evento.precio)
                : ''
            setPrecioEntrada(precioForm)
            const cupo = Number(reserva?.datos_evento?.cupo)
            setNumInvitados(cupo > 0 ? String(cupo) : '')
        }
        if (abrirCarrito) setIsCartOpen(true)
    }

    const agregarServicioAdicional = (servicio) => {
        setServiciosCarrito((prev) => {
            const existente = prev.find((s) => s.id_servicio === servicio.id_servicio)
            if (existente) {
                return prev.map((s) =>
                    s.id_servicio === servicio.id_servicio
                        ? { ...s, cantidad: s.cantidad + 1 }
                        : s
                )
            }
            return [
                ...prev,
                {
                    id_servicio: servicio.id_servicio,
                    nombre: servicio.nombre,
                    descripcion: servicio.descripcion,
                    precio: Number(servicio.precio),
                    categoria: servicio.categoria,
                    tipo_precio: servicio.tipo_precio || 'fijo',
                    tipo_item: servicio.tipo_item || 'producto',
                    imagen: servicio.imagen || null,
                    cantidad: 1,
                    horas:       servicio.tipo_precio === 'por_hora'  ? (Number(servicio.horas)  || 1) : null,
                    turnos:      servicio.tipo_precio === 'por_turno' ? (Number(servicio.turnos) || 1) : null,
                    // personas: cantidad propia para ítems por persona (comida/viandas); null = usa el total de invitados
                    personas:    servicio.tipo_precio === 'por_persona' ? (Number(servicio.personas) || null) : null,
                    hora_inicio: servicio.hora_inicio || null,
                },
            ]
        })
    }

    // Actualiza horas o turnos de un servicio ya en el carrito
    const actualizarUnidadesServicio = (id_servicio, campo, valor) => {
        const num = Math.max(1, Number(valor) || 1)
        setServiciosCarrito((prev) =>
            prev.map((s) => s.id_servicio === id_servicio ? { ...s, [campo]: num } : s)
        )
    }

    // Actualiza la cantidad de personas de un ítem por persona (null = todos los invitados)
    const actualizarPersonasServicio = (id_servicio, personas) => {
        const num = personas == null ? null : Math.max(1, Number(personas) || 1)
        setServiciosCarrito((prev) =>
            prev.map((s) => s.id_servicio === id_servicio ? { ...s, personas: num } : s)
        )
    }

    // Reemplaza todos los ítems de un tipo ('servicio' | 'producto') con una lista nueva.
    // Los ítems de los otros tipos se conservan. Permite que el picker maneje la lista
    // completa (cantidad, personas, hora de entrega, horas, turnos) sin diffs parciales.
    const reemplazarServiciosPorTipo = (tipo, lista) => {
        const norm = (lista || []).map((s) => ({
            id_servicio: s.id_servicio,
            nombre: s.nombre,
            descripcion: s.descripcion,
            precio: Number(s.precio),
            categoria: s.categoria,
            tipo_precio: s.tipo_precio || 'fijo',
            tipo_item: s.tipo_item || 'producto',
            imagen: s.imagen || null,
            cantidad: Math.max(1, Number(s.cantidad) || 1),
            horas:    s.tipo_precio === 'por_hora'    ? (Number(s.horas)  || 1) : null,
            turnos:   s.tipo_precio === 'por_turno'   ? (Number(s.turnos) || 1) : null,
            personas: s.tipo_precio === 'por_persona' ? (Number(s.personas) || null) : null,
            hora_inicio: s.hora_inicio || null,
            hora_manual: !!s.hora_manual,
            descuento_cantidad_min: s.descuento_cantidad_min ?? null,
            descuento_porcentaje:   s.descuento_porcentaje ?? null,
        }))
        setServiciosCarrito((prev) => [
            ...prev.filter((s) => (s.tipo_item || 'producto') !== tipo),
            ...norm,
        ])
    }

    const quitarServicioAdicional = (id_servicio) => {
        setServiciosCarrito((prev) => prev.filter((s) => s.id_servicio !== id_servicio))
    }

    const actualizarCantidadServicio = (id_servicio, cantidad) => {
        if (cantidad <= 0) {
            quitarServicioAdicional(id_servicio)
            return
        }
        setServiciosCarrito((prev) =>
            prev.map((s) => (s.id_servicio === id_servicio ? { ...s, cantidad } : s))
        )
    }

    const vaciarCarritoOrganizador = () => {
        setReservaOrganizador(null)
        setServiciosCarrito([])
        setPrecioEntrada('')
        setNumInvitados('')
    }

    const toggleCarrito = () => setIsCartOpen((prev) => !prev)

    return (
        <CarritoContext.Provider
            value={{
                // Carrito cliente
                items,
                totalItems,
                totalPrecio,
                agregarItem,
                quitarItem,
                actualizarCantidad,
                vaciarCarrito,
                // Carrito organizador
                reservaOrganizador,
                serviciosCarrito,
                totalOrganizador,
                montoAlquiler,
                montoAlquilerConComision,
                montoSena,
                agregarReservaOrganizador,
                setReservaOrganizador,
                agregarServicioAdicional,
                quitarServicioAdicional,
                actualizarCantidadServicio,
                actualizarUnidadesServicio,
                actualizarPersonasServicio,
                reemplazarServiciosPorTipo,
                vaciarCarritoOrganizador,
                precioEntrada,
                setPrecioEntrada,
                numInvitados,
                setNumInvitados,
                invitadosEfectivos,
                // Compartido
                isCartOpen,
                toggleCarrito,
                setIsCartOpen,
            }}
        >
            {children}
        </CarritoContext.Provider>
    )
}

export default CarritoContextProvider
