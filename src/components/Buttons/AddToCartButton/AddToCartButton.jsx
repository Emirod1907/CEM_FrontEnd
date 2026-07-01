import React, { useState } from 'react'
import { useCarrito } from '../../../Contexts/CarritoContextProvider'
import { FiShoppingCart, FiCheck } from 'react-icons/fi'
import './AddToCartButton.css'

const AddToCartButton = ({ evento }) => {
    const { agregarItem, setIsCartOpen } = useCarrito()
    const [agregado, setAgregado] = useState(false)

    const handleClick = () => {
        agregarItem(evento)
        setAgregado(true)
        setTimeout(() => setAgregado(false), 1500)
        setIsCartOpen(true)
    }

    return (
        <button
            className={`add-to-cart-btn ${agregado ? 'agregado' : ''}`}
            onClick={handleClick}
        >
            {agregado ? (
                <>
                    <FiCheck size={16} />
                    Agregado
                </>
            ) : (
                <>
                    <FiShoppingCart size={16} />
                    Agregar al carrito
                </>
            )}
        </button>
    )
}

export default AddToCartButton
