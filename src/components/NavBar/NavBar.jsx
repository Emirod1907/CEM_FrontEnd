import React from 'react'
import { Link, NavLink } from 'react-router-dom'
import './NavBar.css'


const NavBar = () => {
  return (
    <div className='container'>
        <header>
            <div className='logo'>
                <img src="public/transparent.svg" alt="" />
            </div>
            <div>
                <h2>Cellar Event Master</h2>
            </div>
            <nav>     
                <NavLink 
                    to={'/eventos/new'}
                    end
                    className={({isActive})=>
                            isActive ? 'link-seleccionado' : 'link'
                        }
                    >Crear evento</NavLink>
                <NavLink 
                    to={'/eventos'}
                    end
                    className={({isActive})=>
                        isActive ? 'link-seleccionado' : 'link'
                    }>Eventos</NavLink>
                {/* <Link to={'/contacto'}>Contacto</Link> */}
                <NavLink 
                    to={'/register'}
                    end
                    className={({isActive})=>
                        isActive ? 'link-seleccionado' : 'link'
                    }>Register
                </NavLink>
                <NavLink 
                    to={'/bodegas/new'}
                    end
                    className={({isActive})=>
                        isActive ? 'link-seleccionado' : 'link'
                    }>Crear Bodega
                </NavLink>
                <NavLink 
                    to={'/login'}
                    end
                    className={({isActive})=>
                        isActive ? 'link-seleccionado' : 'link'
                    }>Login
                </NavLink>
            </nav>
        </header>
    </div>
  )
}

export default NavBar