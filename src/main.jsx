import { createRoot } from 'react-dom/client'
import './global.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import NavBar from './components/NavBar/NavBar.jsx'
import PersonaContextProvider from './Contexts/PersonaContextProvider.jsx'


createRoot(document.getElementById('root')).render(
    <BrowserRouter>
        <PersonaContextProvider>
            <NavBar/>
            <div className='main-container'>
                <App />
            </div>
        </PersonaContextProvider>
    </BrowserRouter>
    ,
)
