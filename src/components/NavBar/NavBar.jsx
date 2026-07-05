import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../Contexts/PersonaContextProvider'
import { useCarrito } from '../../Contexts/CarritoContextProvider'
import { FiShoppingCart, FiLogOut } from 'react-icons/fi'
import axios from '../../services/axios'
import { EMAILS_FULL_ACCESS } from '../../config/fullAccessEmails'
import './NavBar.css'

const NavBar = () => {
    const { isAuthenticated, persona, setIsAuthenticated, setPersona } = useAuth()
    const { totalItems, toggleCarrito } = useCarrito()
    const navigate = useNavigate()

    const rol = persona?.rol || null
    const esAdmin = isAuthenticated && rol === 'admin'
    const esFullAccess = isAuthenticated && EMAILS_FULL_ACCESS.includes(persona?.email)

    const cambiarRolBtn = esFullAccess ? (
        <NavLink to='/seleccionar-rol' className={({ isActive }) => isActive ? 'link-seleccionado' : 'link'}>
            Cambiar Rol
        </NavLink>
    ) : null

    // Solo visible para los dos emails de administrador, independientemente del rol activo
    const panelAdminBtn = esFullAccess ? (
        <NavLink to='/admin' className={({ isActive }) => isActive ? 'link-seleccionado' : 'link'}>
            Panel Admin
        </NavLink>
    ) : null

    const handleLogout = async () => {
        try { await axios.post('auth/logout') } catch (_) {}
        setIsAuthenticated(false)
        setPersona(null)
        navigate('/login')
    }

    const link = (to, label) => (
        <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) => isActive ? 'link-seleccionado' : 'link'}
        >
            {label}
        </NavLink>
    )

    const renderLinks = () => {
        if (!isAuthenticated) {
            return (
                <>
                    {link('/eventos', 'Eventos')}
                    {link('/login', 'Iniciar Sesión')}
                </>
            )
        }

        if (esAdmin) {
            return (
                <>
                    {link('/eventos', 'Eventos')}
                    {link('/eventos/new', 'Crear Evento')}
                    {link('/mis-reservas', 'Mis Reservas')}
                    {link('/mis-borradores', 'Borradores')}
                    {link('/salones', 'Salones')}
                    {link('/salones/new', 'Registrar Salón')}
                    {link('/salones/mapa', 'Mapa Salones')}
                    {link('/admin', 'Admin')}
                    {cambiarRolBtn}
                    <button className='link link-logout' onClick={handleLogout} title='Cerrar sesión'>
                        <FiLogOut size={15} /> Salir
                    </button>
                    <button className='carrito-nav-btn' onClick={toggleCarrito} title='Ver carrito'>
                        <FiShoppingCart size={20} />
                        {totalItems > 0 && <span className='carrito-badge'>{totalItems}</span>}
                    </button>
                </>
            )
        }

        switch (rol) {
            case 'entusiasta':
                return (
                    <>
                        {link('/eventos', 'Eventos Públicos')}
                        {panelAdminBtn}
                        {cambiarRolBtn}
                        <button className='link link-logout' onClick={handleLogout} title='Cerrar sesión'>
                            <FiLogOut size={15} /> Salir
                        </button>
                    </>
                )

            case 'organizador':
                return (
                    <>
                        {link('/eventos', 'Mis Eventos')}
                        {link('/eventos/new', 'Crear Evento')}
                        {link('/mis-reservas', 'Mis Reservas')}
                        {link('/mis-borradores', 'Borradores')}
                        {link('/salones', 'Salones')}
                        {link('/salones/mapa', 'Mapa Salones')}
                        {panelAdminBtn}
                        {cambiarRolBtn}
                        <button className='link link-logout' onClick={handleLogout} title='Cerrar sesión'>
                            <FiLogOut size={15} /> Salir
                        </button>
                        <button className='carrito-nav-btn' onClick={toggleCarrito} title='Ver carrito'>
                            <FiShoppingCart size={20} />
                            {totalItems > 0 && <span className='carrito-badge'>{totalItems}</span>}
                        </button>
                    </>
                )

            case 'dueno_salon':
                return (
                    <>
                        {link('/mi-salon', 'Mi Salón')}
                        {link('/salones/mapa', 'Ver Mapa')}
                        {panelAdminBtn}
                        {cambiarRolBtn}
                        <button className='link link-logout' onClick={handleLogout} title='Cerrar sesión'>
                            <FiLogOut size={15} /> Salir
                        </button>
                    </>
                )

            case 'proveedor_servicios':
                return (
                    <>
                        {link('/mis-servicios', 'Mis Servicios')}
                        {panelAdminBtn}
                        {cambiarRolBtn}
                        <button className='link link-logout' onClick={handleLogout} title='Cerrar sesión'>
                            <FiLogOut size={15} /> Salir
                        </button>
                    </>
                )

            case 'proveedor_insumos':
                return (
                    <>
                        {link('/mi-catalogo', 'Mi Catálogo')}
                        {panelAdminBtn}
                        {cambiarRolBtn}
                        <button className='link link-logout' onClick={handleLogout} title='Cerrar sesión'>
                            <FiLogOut size={15} /> Salir
                        </button>
                    </>
                )

            default:
                // Usuario autenticado sin rol asignado aún
                return (
                    <>
                        {panelAdminBtn}
                        {cambiarRolBtn}
                        <button className='link link-logout' onClick={handleLogout} title='Cerrar sesión'>
                            <FiLogOut size={15} /> Salir
                        </button>
                    </>
                )
        }
    }

    return (
        <div className='navbar-container'>
            <header className='app-header'>
                <div className='logo'>
                    <img src="/dream_events_logo.svg" alt="Dream Events" />
                </div>
                <span className='navbar-brand'>Dream Events</span>
                {isAuthenticated && rol && (
                    <span className='navbar-rol-badge'>
                        {LABEL_POR_ROL[rol] || rol}
                    </span>
                )}
                <nav>
                    {renderLinks()}
                </nav>
            </header>
        </div>
    )
}

const LABEL_POR_ROL = {
    entusiasta:           'Entusiasta',
    organizador:          'Organizador',
    dueno_salon:          'Dueño de Salón',
    proveedor_servicios:  'Proveedor de Servicios',
    proveedor_insumos:    'Proveedor de Insumos',
    admin:                'Admin',
    cliente:              'Cliente',
}

export default NavBar
