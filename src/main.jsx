import { createRoot } from 'react-dom/client'
import './global.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import NavBar from './components/NavBar/NavBar.jsx'
import ProgresoEvento from './components/ProgresoEvento/ProgresoEvento.jsx'
import ContratoGuard from './components/ContratoGuard/ContratoGuard.jsx'
import PersonaContextProvider from './Contexts/PersonaContextProvider.jsx'
import CarritoContextProvider from './Contexts/CarritoContextProvider.jsx'
import CarritoDrawer from './components/Carrito/CarritoDrawer.jsx'
import CompareContextProvider from './Contexts/CompareContextProvider.jsx'
import ComparacionModal from './components/Modals/ComparacionModal/ComparacionModal.jsx'


createRoot(document.getElementById('root')).render(
    <BrowserRouter>
        <PersonaContextProvider>
            <CarritoContextProvider>
                <CompareContextProvider>
                    <NavBar/>
                    <ProgresoEvento/>
                    <ContratoGuard/>
                    <CarritoDrawer/>
                    <ComparacionModal/>
                    <div className='main-container'>
                        <App />
                    </div>
                </CompareContextProvider>
            </CarritoContextProvider>
        </PersonaContextProvider>
    </BrowserRouter>
    ,
)
