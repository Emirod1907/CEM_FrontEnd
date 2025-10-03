import React, { useState } from 'react'



const BuyButton = () => {
    const [comprado, setComprado] = useState(false)

    const Comprar = (event)=>{
        event.preventDefault()
        setComprado(true)
        alert('Entrada comprada con éxito!')
    }
  return (
    <div><button 
            onClick={Comprar} 
            disabled={comprado}>
        {comprado ? 'Entrada Comprada' : 'Comprar Entrada'}
        </button></div>
  )
}

export default BuyButton