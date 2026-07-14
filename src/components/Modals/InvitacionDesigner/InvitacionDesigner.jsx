import React, { useRef, useState, useMemo } from 'react'
import html2canvas from 'html2canvas'
import FloralDelgadoSVG from './FlowerFrame.svg?raw'
import { FiX, FiDownload, FiRefreshCw } from 'react-icons/fi'
import { EMOJI_TIPO } from '../../../utils/eventoUtils'
import './InvitacionDesigner.css'

// ── Plantillas ────────────────────────────────────────────────────────────────
const TEMPLATES = [
    { id:'festivo',    label:'Festivo',    cardBg:'linear-gradient(135deg,#f59e0b,#ef4444)', textColor:'#ffffff',  subtitleColor:'rgba(255,255,255,0.88)', detailColor:'rgba(255,255,255,0.8)', dividerColor:'rgba(255,255,255,0.4)', decoChar:'🎉', thumbnailBg:'linear-gradient(135deg,#f59e0b,#ef4444)' },
    { id:'elegante',   label:'Elegante',   cardBg:'linear-gradient(160deg,#1e1b4b,#4c1d95)', textColor:'#fef3c7', subtitleColor:'#e9d5ff', detailColor:'#c4b5fd', dividerColor:'rgba(196,181,253,0.4)', decoChar:'✨', thumbnailBg:'linear-gradient(135deg,#1e1b4b,#4c1d95)' },
    { id:'minimalista',label:'Minimalista',cardBg:'#ffffff', textColor:'#111827', subtitleColor:'#4b5563', detailColor:'#6b7280', dividerColor:'#e5e7eb', decoChar:'◆', thumbnailBg:'#f3f4f6', borderTop:'8px solid #6b23d8' },
    { id:'romantico',  label:'Romántico',  cardBg:'linear-gradient(135deg,#fce7f3,#f9a8d4)', textColor:'#831843', subtitleColor:'#9d174d', detailColor:'#be185d', dividerColor:'rgba(159,23,77,0.25)', decoChar:'💕', thumbnailBg:'linear-gradient(135deg,#fce7f3,#f9a8d4)' },
    { id:'natural',    label:'Natural',    cardBg:'linear-gradient(135deg,#d1fae5,#6ee7b7)', textColor:'#064e3b', subtitleColor:'#065f46', detailColor:'#047857', dividerColor:'rgba(6,78,59,0.25)', decoChar:'🌿', thumbnailBg:'linear-gradient(135deg,#d1fae5,#6ee7b7)' },
    { id:'nocturno',   label:'Nocturno',   cardBg:'linear-gradient(160deg,#0f172a,#1e293b)', textColor:'#e2e8f0', subtitleColor:'#94a3b8', detailColor:'#818cf8', dividerColor:'rgba(129,140,248,0.3)', decoChar:'🌙', thumbnailBg:'linear-gradient(135deg,#0f172a,#1e293b)' },
]

// ── Íconos centrales ──────────────────────────────────────────────────────────
const GRUPOS_DECO = [
    { label:'Celebración', emojis:['🎉','🎊','🥳','🎈','🎁','🎆','🥂','🍾'] },
    { label:'Flores',      emojis:['🌸','🌺','🌹','🌻','🌷','💐','🌼','🌿'] },
    { label:'Amor',        emojis:['💕','❤️','💖','💝','💍','🥰','💌','🫶'] },
    { label:'Estrellas',   emojis:['✨','⭐','🌟','💫','🌙','👑','🏆','💎'] },
    { label:'Comida',      emojis:['🎂','🍰','🧁','🫐','🍓','🍫','🍷','🫧'] },
]

// Íconos disponibles para las esquinas de la tarjeta
const ICONOS_ESQUINAS = [
    '🌸','🌺','🌹','🌻','🌷','💐','🌿','🍃',
    '💕','❤️','💖','💝','✨','⭐','🌟','💫',
    '🎉','🎊','🥳','🎁','🎀','🥂','🍾','🎆',
    '🦋','🕊️','🍀','☘️','🌙','💎','👑','🏆',
    '✦','❋','◆','❈','✿','❀','❁','✺',
]

// ── Estilos de marco ──────────────────────────────────────────────────────────
const ESTILOS_MARCO = [
    { id:'ninguno',    label:'Sin marco',  thumbChar:null },
    { id:'fino',       label:'Línea',      thumbChar:null },
    { id:'doble',      label:'Doble',      thumbChar:null },
    { id:'punteado',   label:'Punteado',   thumbChar:null },
    { id:'clasico',    label:'Clásico',    thumbChar:'◆'  },
    { id:'lineal',     label:'Lineal',     thumbChar:'✦'  },
    { id:'stencil',      label:'Stencil',     thumbChar:null },
    { id:'ornamental',   label:'Ornamental',  thumbChar:'❦'  },
    { id:'barroco',      label:'Barroco',     thumbChar:'⚜'  },
    { id:'floraldelgado',label:'Flores Finas', thumbChar:'❀'  },
    { id:'rizos',        label:'Rizos',        thumbChar:'〜' },
    { id:'pergamino',    label:'Pergamino',    thumbChar:'◇'  },
]

const MARCO_COLORES = ['#fbbf24','#ffffff','#f9a8d4','#93c5fd','#6ee7b7','#374151']
const SVG_MARCOS    = ['clasico','lineal']

const getFrameBorder = (estilo, color) => {
    switch (estilo) {
        case 'fino':     return `1.2px solid ${color}`
        case 'doble':    return `1.5px solid ${color}`
        case 'punteado': return `2px dashed ${color}`
        case 'clasico':  return `1.3px solid ${color}`
        case 'lineal':   return `1.1px solid ${color}`
        default:         return 'none'
    }
}

const marcoThumbStyle = (estilo, color) => {
    switch (estilo) {
        case 'ninguno':  return {}
        case 'fino':     return { border:`1.5px solid ${color}` }
        case 'doble':    return { border:`1.5px solid ${color}`, boxShadow:`inset 0 0 0 2px ${color}` }
        case 'punteado': return { border:`1.5px dashed ${color}` }
        default:         return { border:`1.5px solid ${color}` }
    }
}

// ── SVG corner components (top-left orientation) ──────────────────────────────
// Corner point is at SVG coordinate (22,22). viewBox="0 0 44 44"
// Other 3 corners are mirrored via CSS transform.

const CornerClasico = ({ color }) => (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
        <path d="M 22,44 L 22,22 L 44,22" stroke={color} strokeWidth="1.3" strokeLinecap="square"/>
        <path d="M 25,44 L 25,25 L 44,25" stroke={color} strokeWidth="0.65" opacity="0.85"/>
        <path d="M 22,18 L 26,22 L 22,26 L 18,22 Z" fill={color}/>
        <path d="M 22,34 L 24,36 L 22,38 L 20,36 Z" fill={color} opacity="0.55"/>
        <path d="M 34,22 L 36,24 L 38,22 L 36,20 Z" fill={color} opacity="0.55"/>
    </svg>
)

// Stencil: doble corchete redondeado con rizo en los extremos + ornamentos de borde
const StencilFrame = ({ color }) => (
    <svg width="100%" height="100%" viewBox="0 0 100 65" preserveAspectRatio="none" fill="none"
         style={{ position:'absolute', inset:0, pointerEvents:'none', display:'block' }}>
        <rect x="0.5" y="0.5" width="99" height="64" stroke={color} strokeWidth="0.7" vectorEffect="non-scaling-stroke"/>
        {/* TL */}
        <path d="M 0.5,14 L 0.5,4 A 3.5,3.5 0 0,1 4,0.5 L 14,0.5" stroke={color} strokeWidth="1.1" strokeLinecap="round" fill="none" vectorEffect="non-scaling-stroke"/>
        <path d="M 3.5,11 L 3.5,7 A 2.5,2.5 0 0,1 6,4.5 L 11,4.5" stroke={color} strokeWidth="0.5" fill="none" opacity="0.8" vectorEffect="non-scaling-stroke"/>
        <path d="M 11,4.5 C 12.5,4.5 14,5.5 13,7 C 12,8.5 10.5,7.5 11,6.5" stroke={color} strokeWidth="0.55" fill="none" vectorEffect="non-scaling-stroke"/>
        <path d="M 3.5,11 C 3.5,12.5 4.5,14 6,13 C 7.5,12 6.5,10.5 5.5,11" stroke={color} strokeWidth="0.55" fill="none" vectorEffect="non-scaling-stroke"/>
        <path d="M 1.5,3 L 4,0.5 L 6.5,3 L 4,5.5 Z" fill={color} opacity="0.9"/>
        {/* TR */}
        <path d="M 99.5,14 L 99.5,4 A 3.5,3.5 0 0,0 96,0.5 L 86,0.5" stroke={color} strokeWidth="1.1" strokeLinecap="round" fill="none" vectorEffect="non-scaling-stroke"/>
        <path d="M 96.5,11 L 96.5,7 A 2.5,2.5 0 0,0 94,4.5 L 89,4.5" stroke={color} strokeWidth="0.5" fill="none" opacity="0.8" vectorEffect="non-scaling-stroke"/>
        <path d="M 89,4.5 C 87.5,4.5 86,5.5 87,7 C 88,8.5 89.5,7.5 89,6.5" stroke={color} strokeWidth="0.55" fill="none" vectorEffect="non-scaling-stroke"/>
        <path d="M 96.5,11 C 96.5,12.5 95.5,14 94,13 C 92.5,12 93.5,10.5 94.5,11" stroke={color} strokeWidth="0.55" fill="none" vectorEffect="non-scaling-stroke"/>
        <path d="M 98.5,3 L 96,0.5 L 93.5,3 L 96,5.5 Z" fill={color} opacity="0.9"/>
        {/* BL */}
        <path d="M 0.5,51 L 0.5,61 A 3.5,3.5 0 0,0 4,64.5 L 14,64.5" stroke={color} strokeWidth="1.1" strokeLinecap="round" fill="none" vectorEffect="non-scaling-stroke"/>
        <path d="M 3.5,54 L 3.5,58 A 2.5,2.5 0 0,0 6,60.5 L 11,60.5" stroke={color} strokeWidth="0.5" fill="none" opacity="0.8" vectorEffect="non-scaling-stroke"/>
        <path d="M 11,60.5 C 12.5,60.5 14,59.5 13,58 C 12,56.5 10.5,57.5 11,58.5" stroke={color} strokeWidth="0.55" fill="none" vectorEffect="non-scaling-stroke"/>
        <path d="M 3.5,54 C 3.5,52.5 4.5,51 6,52 C 7.5,53 6.5,54.5 5.5,54" stroke={color} strokeWidth="0.55" fill="none" vectorEffect="non-scaling-stroke"/>
        <path d="M 1.5,62 L 4,64.5 L 6.5,62 L 4,59.5 Z" fill={color} opacity="0.9"/>
        {/* BR */}
        <path d="M 99.5,51 L 99.5,61 A 3.5,3.5 0 0,1 96,64.5 L 86,64.5" stroke={color} strokeWidth="1.1" strokeLinecap="round" fill="none" vectorEffect="non-scaling-stroke"/>
        <path d="M 96.5,54 L 96.5,58 A 2.5,2.5 0 0,1 94,60.5 L 89,60.5" stroke={color} strokeWidth="0.5" fill="none" opacity="0.8" vectorEffect="non-scaling-stroke"/>
        <path d="M 89,60.5 C 87.5,60.5 86,59.5 87,58 C 88,56.5 89.5,57.5 89,58.5" stroke={color} strokeWidth="0.55" fill="none" vectorEffect="non-scaling-stroke"/>
        <path d="M 96.5,54 C 96.5,52.5 95.5,51 94,52 C 92.5,53 93.5,54.5 94.5,54" stroke={color} strokeWidth="0.55" fill="none" vectorEffect="non-scaling-stroke"/>
        <path d="M 98.5,62 L 96,64.5 L 93.5,62 L 96,59.5 Z" fill={color} opacity="0.9"/>
        {/* Ornamentos de borde — diamantes pequeños */}
        <path d="M 50,0.5 L 51.3,1.8 L 50,3.1 L 48.7,1.8 Z" fill={color} opacity="0.85"/>
        <path d="M 50,61.4 L 51.3,62.7 L 50,64 L 48.7,62.7 Z" fill={color} opacity="0.85"/>
        <path d="M 0.5,31.2 L 1.8,32.5 L 0.5,33.8 L -0.8,32.5 Z" fill={color} opacity="0.85"/>
        <path d="M 98.2,32.5 L 99.5,31.2 L 100.8,32.5 L 99.5,33.8 Z" fill={color} opacity="0.85"/>
    </svg>
)

// Ornamental: volutas en S con flores de borde
const OrnamentalFrame = ({ color }) => (
    <svg width="100%" height="100%" viewBox="0 0 100 65" preserveAspectRatio="none" fill="none"
         style={{ position:'absolute', inset:0, pointerEvents:'none', display:'block' }}>
        <rect x="0.5" y="0.5" width="99" height="64" stroke={color} strokeWidth="0.65" vectorEffect="non-scaling-stroke"/>
        {/* TL voluta S */}
        <path d="M 0.5,11 C 0.5,7 0.5,3 4,0.5 C 7,0.5 11,0.5 11,0.5" stroke={color} strokeWidth="0.7" fill="none" vectorEffect="non-scaling-stroke"/>
        <path d="M 9,0.5 C 9,2.5 7,4 5.5,3.5 C 4,3 3,4.5 4,6.5 C 5,8 6.5,7.5 6,6 C 5.5,4.5 3.5,5 4,6.5" stroke={color} strokeWidth="0.6" fill="none" opacity="0.88" vectorEffect="non-scaling-stroke"/>
        <path d="M 0.5,9 C 2.5,9 4,7 3.5,5.5 C 3,4 4.5,3 6.5,4 C 8,5 7.5,6.5 6,6 C 4.5,5.5 5,3.5 6.5,4" stroke={color} strokeWidth="0.6" fill="none" opacity="0.88" vectorEffect="non-scaling-stroke"/>
        <circle cx="3.5" cy="3.5" r="1" fill={color} opacity="0.92"/>
        {/* TR voluta S */}
        <path d="M 99.5,11 C 99.5,7 99.5,3 96,0.5 C 93,0.5 89,0.5 89,0.5" stroke={color} strokeWidth="0.7" fill="none" vectorEffect="non-scaling-stroke"/>
        <path d="M 91,0.5 C 91,2.5 93,4 94.5,3.5 C 96,3 97,4.5 96,6.5 C 95,8 93.5,7.5 94,6 C 94.5,4.5 96.5,5 96,6.5" stroke={color} strokeWidth="0.6" fill="none" opacity="0.88" vectorEffect="non-scaling-stroke"/>
        <path d="M 99.5,9 C 97.5,9 96,7 96.5,5.5 C 97,4 95.5,3 93.5,4 C 92,5 92.5,6.5 94,6 C 95.5,5.5 95,3.5 93.5,4" stroke={color} strokeWidth="0.6" fill="none" opacity="0.88" vectorEffect="non-scaling-stroke"/>
        <circle cx="96.5" cy="3.5" r="1" fill={color} opacity="0.92"/>
        {/* BL voluta S */}
        <path d="M 0.5,54 C 0.5,58 0.5,62 4,64.5 C 7,64.5 11,64.5 11,64.5" stroke={color} strokeWidth="0.7" fill="none" vectorEffect="non-scaling-stroke"/>
        <path d="M 9,64.5 C 9,62.5 7,61 5.5,61.5 C 4,62 3,60.5 4,58.5 C 5,57 6.5,57.5 6,59 C 5.5,60.5 3.5,60 4,58.5" stroke={color} strokeWidth="0.6" fill="none" opacity="0.88" vectorEffect="non-scaling-stroke"/>
        <path d="M 0.5,56 C 2.5,56 4,58 3.5,59.5 C 3,61 4.5,62 6.5,61 C 8,60 7.5,58.5 6,59 C 4.5,59.5 5,61.5 6.5,61" stroke={color} strokeWidth="0.6" fill="none" opacity="0.88" vectorEffect="non-scaling-stroke"/>
        <circle cx="3.5" cy="61.5" r="1" fill={color} opacity="0.92"/>
        {/* BR voluta S */}
        <path d="M 99.5,54 C 99.5,58 99.5,62 96,64.5 C 93,64.5 89,64.5 89,64.5" stroke={color} strokeWidth="0.7" fill="none" vectorEffect="non-scaling-stroke"/>
        <path d="M 91,64.5 C 91,62.5 93,61 94.5,61.5 C 96,62 97,60.5 96,58.5 C 95,57 93.5,57.5 94,59 C 94.5,60.5 96.5,60 96,58.5" stroke={color} strokeWidth="0.6" fill="none" opacity="0.88" vectorEffect="non-scaling-stroke"/>
        <path d="M 99.5,56 C 97.5,56 96,58 96.5,59.5 C 97,61 95.5,62 93.5,61 C 92,60 92.5,58.5 94,59 C 95.5,59.5 95,61.5 93.5,61" stroke={color} strokeWidth="0.6" fill="none" opacity="0.88" vectorEffect="non-scaling-stroke"/>
        <circle cx="96.5" cy="61.5" r="1" fill={color} opacity="0.92"/>
        {/* Top center — diamante pequeño */}
        <path d="M 50,0.5 L 51.5,2 L 50,3.5 L 48.5,2 Z" fill={color} opacity="0.85"/>
        {/* Bottom center — diamante pequeño */}
        <path d="M 50,61 L 51.5,62.5 L 50,64 L 48.5,62.5 Z" fill={color} opacity="0.85"/>
        {/* Left center */}
        <path d="M 0.5,32.5 L 4,32.5" stroke={color} strokeWidth="0.5" vectorEffect="non-scaling-stroke"/>
        <path d="M 4,32.5 C 5,30.5 7,29.5 7.5,31.5 C 8,33.5 6,34.5 4,32.5 Z" fill={color} opacity="0.65"/>
        <path d="M 4,32.5 C 5,34.5 7,35.5 7.5,33.5 C 8,31.5 6,30.5 4,32.5 Z" fill={color} opacity="0.65"/>
        {/* Right center */}
        <path d="M 99.5,32.5 L 96,32.5" stroke={color} strokeWidth="0.5" vectorEffect="non-scaling-stroke"/>
        <path d="M 96,32.5 C 95,30.5 93,29.5 92.5,31.5 C 92,33.5 94,34.5 96,32.5 Z" fill={color} opacity="0.65"/>
        <path d="M 96,32.5 C 95,34.5 93,35.5 92.5,33.5 C 92,31.5 94,30.5 96,32.5 Z" fill={color} opacity="0.65"/>
    </svg>
)

// Barroco: volutas elaboradas multi-curva + cresta central
const BarrocoFrame = ({ color }) => (
    <svg width="100%" height="100%" viewBox="0 0 100 65" preserveAspectRatio="none" fill="none"
         style={{ position:'absolute', inset:0, pointerEvents:'none', display:'block' }}>
        <rect x="0.5" y="0.5" width="99" height="64" stroke={color} strokeWidth="0.7" vectorEffect="non-scaling-stroke"/>
        {/* TL */}
        <path d="M 0.5,12 C 0.5,8 0.5,4 4.5,0.5 C 7,0.5 12,0.5 12,0.5" stroke={color} strokeWidth="0.75" fill="none" vectorEffect="non-scaling-stroke"/>
        <path d="M 10,0.5 C 10,3 8,4.5 6,3.5 C 4,2.5 3,4.5 4,6.5 C 5,8.5 7,8 6.5,6.5 C 6,5 4.5,5.5 5,7" stroke={color} strokeWidth="0.65" fill="none" opacity="0.9" vectorEffect="non-scaling-stroke"/>
        <path d="M 0.5,10 C 3,10 4.5,8 3.5,6 C 2.5,4 4.5,3 6.5,4 C 8.5,5 8,7 6.5,6.5 C 5,6 5.5,4.5 7,5" stroke={color} strokeWidth="0.65" fill="none" opacity="0.9" vectorEffect="non-scaling-stroke"/>
        <path d="M 3,0.5 C 3,2 5,2.5 5,1.5 C 5,0.8 3.8,0.5 3,0.5" stroke={color} strokeWidth="0.45" fill="none" opacity="0.65" vectorEffect="non-scaling-stroke"/>
        <path d="M 0.5,3 C 2,3 2.5,5 1.5,5 C 0.8,5 0.5,3.8 0.5,3" stroke={color} strokeWidth="0.45" fill="none" opacity="0.65" vectorEffect="non-scaling-stroke"/>
        <path d="M 3.5,3.5 C 2.5,5 3,7 5.5,5.8 C 8,4.5 6.5,2 3.5,3.5 Z" fill={color} opacity="0.42"/>
        <circle cx="3.5" cy="3.5" r="1" fill={color} opacity="0.95"/>
        {/* TR */}
        <path d="M 99.5,12 C 99.5,8 99.5,4 95.5,0.5 C 93,0.5 88,0.5 88,0.5" stroke={color} strokeWidth="0.75" fill="none" vectorEffect="non-scaling-stroke"/>
        <path d="M 90,0.5 C 90,3 92,4.5 94,3.5 C 96,2.5 97,4.5 96,6.5 C 95,8.5 93,8 93.5,6.5 C 94,5 95.5,5.5 95,7" stroke={color} strokeWidth="0.65" fill="none" opacity="0.9" vectorEffect="non-scaling-stroke"/>
        <path d="M 99.5,10 C 97,10 95.5,8 96.5,6 C 97.5,4 95.5,3 93.5,4 C 91.5,5 92,7 93.5,6.5 C 95,6 94.5,4.5 93,5" stroke={color} strokeWidth="0.65" fill="none" opacity="0.9" vectorEffect="non-scaling-stroke"/>
        <path d="M 97,0.5 C 97,2 95,2.5 95,1.5 C 95,0.8 96.2,0.5 97,0.5" stroke={color} strokeWidth="0.45" fill="none" opacity="0.65" vectorEffect="non-scaling-stroke"/>
        <path d="M 99.5,3 C 98,3 97.5,5 98.5,5 C 99.2,5 99.5,3.8 99.5,3" stroke={color} strokeWidth="0.45" fill="none" opacity="0.65" vectorEffect="non-scaling-stroke"/>
        <path d="M 96.5,3.5 C 97.5,5 97,7 94.5,5.8 C 92,4.5 93.5,2 96.5,3.5 Z" fill={color} opacity="0.42"/>
        <circle cx="96.5" cy="3.5" r="1" fill={color} opacity="0.95"/>
        {/* BL */}
        <path d="M 0.5,53 C 0.5,57 0.5,61 4.5,64.5 C 7,64.5 12,64.5 12,64.5" stroke={color} strokeWidth="0.75" fill="none" vectorEffect="non-scaling-stroke"/>
        <path d="M 10,64.5 C 10,62 8,60.5 6,61.5 C 4,62.5 3,60.5 4,58.5 C 5,56.5 7,57 6.5,58.5 C 6,60 4.5,59.5 5,58" stroke={color} strokeWidth="0.65" fill="none" opacity="0.9" vectorEffect="non-scaling-stroke"/>
        <path d="M 0.5,55 C 3,55 4.5,57 3.5,59 C 2.5,61 4.5,62 6.5,61 C 8.5,60 8,58 6.5,58.5 C 5,59 5.5,60.5 7,60" stroke={color} strokeWidth="0.65" fill="none" opacity="0.9" vectorEffect="non-scaling-stroke"/>
        <path d="M 3,64.5 C 3,63 5,62.5 5,63.5 C 5,64.2 3.8,64.5 3,64.5" stroke={color} strokeWidth="0.45" fill="none" opacity="0.65" vectorEffect="non-scaling-stroke"/>
        <path d="M 0.5,62 C 2,62 2.5,60 1.5,60 C 0.8,60 0.5,61.2 0.5,62" stroke={color} strokeWidth="0.45" fill="none" opacity="0.65" vectorEffect="non-scaling-stroke"/>
        <path d="M 3.5,61.5 C 2.5,60 3,58 5.5,59.2 C 8,60.5 6.5,63 3.5,61.5 Z" fill={color} opacity="0.42"/>
        <circle cx="3.5" cy="61.5" r="1" fill={color} opacity="0.95"/>
        {/* BR */}
        <path d="M 99.5,53 C 99.5,57 99.5,61 95.5,64.5 C 93,64.5 88,64.5 88,64.5" stroke={color} strokeWidth="0.75" fill="none" vectorEffect="non-scaling-stroke"/>
        <path d="M 90,64.5 C 90,62 92,60.5 94,61.5 C 96,62.5 97,60.5 96,58.5 C 95,56.5 93,57 93.5,58.5 C 94,60 95.5,59.5 95,58" stroke={color} strokeWidth="0.65" fill="none" opacity="0.9" vectorEffect="non-scaling-stroke"/>
        <path d="M 99.5,55 C 97,55 95.5,57 96.5,59 C 97.5,61 95.5,62 93.5,61 C 91.5,60 92,58 93.5,58.5 C 95,59 94.5,60.5 93,60" stroke={color} strokeWidth="0.65" fill="none" opacity="0.9" vectorEffect="non-scaling-stroke"/>
        <path d="M 97,64.5 C 97,63 95,62.5 95,63.5 C 95,64.2 96.2,64.5 97,64.5" stroke={color} strokeWidth="0.45" fill="none" opacity="0.65" vectorEffect="non-scaling-stroke"/>
        <path d="M 99.5,62 C 98,62 97.5,60 98.5,60 C 99.2,60 99.5,61.2 99.5,62" stroke={color} strokeWidth="0.45" fill="none" opacity="0.65" vectorEffect="non-scaling-stroke"/>
        <path d="M 96.5,61.5 C 97.5,60 97,58 94.5,59.2 C 92,60.5 93.5,63 96.5,61.5 Z" fill={color} opacity="0.42"/>
        <circle cx="96.5" cy="61.5" r="1" fill={color} opacity="0.95"/>
        {/* Top center — diamante + alas pequeñas */}
        <path d="M 50,0.5 C 47,0.5 45.5,0.5 45.5,0.5" stroke={color} strokeWidth="0.5" fill="none" opacity="0.7" vectorEffect="non-scaling-stroke"/>
        <path d="M 50,0.5 C 53,0.5 54.5,0.5 54.5,0.5" stroke={color} strokeWidth="0.5" fill="none" opacity="0.7" vectorEffect="non-scaling-stroke"/>
        <path d="M 50,0.5 L 51.5,2 L 50,3.5 L 48.5,2 Z" fill={color} opacity="0.9"/>
        {/* Bottom center — diamante + alas pequeñas */}
        <path d="M 50,64.5 C 47,64.5 45.5,64.5 45.5,64.5" stroke={color} strokeWidth="0.5" fill="none" opacity="0.7" vectorEffect="non-scaling-stroke"/>
        <path d="M 50,64.5 C 53,64.5 54.5,64.5 54.5,64.5" stroke={color} strokeWidth="0.5" fill="none" opacity="0.7" vectorEffect="non-scaling-stroke"/>
        <path d="M 50,61 L 51.5,62.5 L 50,64 L 48.5,62.5 Z" fill={color} opacity="0.9"/>
        {/* Left/Right scrolls laterales */}
        <path d="M 0.5,32.5 C 4.5,32.5 5,28.5 3.5,28 C 1.5,27.5 0.5,29 0.5,32.5 C 0.5,36 1.5,37.5 3.5,37 C 5,36.5 4.5,32.5 0.5,32.5" stroke={color} strokeWidth="0.5" fill="none" opacity="0.75" vectorEffect="non-scaling-stroke"/>
        <path d="M 99.5,32.5 C 95.5,32.5 95,28.5 96.5,28 C 98.5,27.5 99.5,29 99.5,32.5 C 99.5,36 98.5,37.5 96.5,37 C 95,36.5 95.5,32.5 99.5,32.5" stroke={color} strokeWidth="0.5" fill="none" opacity="0.75" vectorEffect="non-scaling-stroke"/>
    </svg>
)

const CornerLineal = ({ color }) => (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
        <path d="M 22,44 L 22,22 L 44,22" stroke={color} strokeWidth="1.1" strokeLinecap="round"/>
        <path d="M 25,44 L 25,25 L 44,25" stroke={color} strokeWidth="0.55" opacity="0.7"/>
        <path d="M 22,14 L 24,20 L 30,22 L 24,24 L 22,30 L 20,24 L 14,22 L 20,20 Z" fill={color}/>
        <path d="M 22,36 L 23.5,38 L 22,40 L 20.5,38 Z" fill={color} opacity="0.6"/>
        <path d="M 36,22 L 38,23.5 L 40,22 L 38,20.5 Z" fill={color} opacity="0.6"/>
    </svg>
)

const FloralDelgadoFrame = ({ color }) => {
    const svgHtml = useMemo(() => {
        let s = FloralDelgadoSVG
            .replace(/<\?xml[^?]*\?>/i, '')
            .replace(/<!DOCTYPE[^>]*>/i, '')
            .replace(
                /<svg\b([^>]*)>/i,
                (_, attrs) => {
                    const clean = attrs
                        .replace(/\s+width="[^"]*"/g, '')
                        .replace(/\s+height="[^"]*"/g, '')
                        .replace(/\s+fill="[^"]*"/g, '')
                        .replace(/\s+preserveAspectRatio="[^"]*"/g, '')
                    return `<svg${clean} width="100%" height="100%" fill="${color}" preserveAspectRatio="xMidYMid meet" style="position:absolute;inset:0;display:block;pointer-events:none;">`
                }
            )
        s = s.replace(/fill="#000000"/gi, `fill="${color}"`)
        s = s.replace(/stroke="#000000"/gi, `stroke="${color}"`)
        return s
    }, [color])
    return (
        <div style={{ position:'absolute', inset:0, pointerEvents:'none' }}
             dangerouslySetInnerHTML={{ __html: svgHtml }}/>
    )
}

// Rizos: líneas rectas con scrolls de espiral en esquinas
const RizosFrame = ({ color }) => (
    <svg width="100%" height="100%" viewBox="0 0 100 65" preserveAspectRatio="none" fill="none"
         style={{ position:'absolute', inset:0, pointerEvents:'none', display:'block' }}>
        <path d="M 14,1.5 L 86,1.5"   stroke={color} strokeWidth="0.75" strokeLinecap="round" vectorEffect="non-scaling-stroke"/>
        <path d="M 14,63.5 L 86,63.5" stroke={color} strokeWidth="0.75" strokeLinecap="round" vectorEffect="non-scaling-stroke"/>
        <path d="M 1.5,14 L 1.5,51"   stroke={color} strokeWidth="0.75" strokeLinecap="round" vectorEffect="non-scaling-stroke"/>
        <path d="M 98.5,14 L 98.5,51" stroke={color} strokeWidth="0.75" strokeLinecap="round" vectorEffect="non-scaling-stroke"/>
        {/* TL scroll */}
        <path d="M 14,1.5 C 9,1 4,1.5 2.5,5 C 1,8.5 2.5,13 6.5,12 C 10.5,11 10,7.5 7.5,7 C 5,6.5 4.5,9.5 6.5,10"
              stroke={color} strokeWidth="0.75" strokeLinecap="round"/>
        <path d="M 1.5,14 C 1,11 1.5,7.5 2.5,5" stroke={color} strokeWidth="0.75" strokeLinecap="round"/>
        {/* TR scroll */}
        <path d="M 86,1.5 C 91,1 96,1.5 97.5,5 C 99,8.5 97.5,13 93.5,12 C 89.5,11 90,7.5 92.5,7 C 95,6.5 95.5,9.5 93.5,10"
              stroke={color} strokeWidth="0.75" strokeLinecap="round"/>
        <path d="M 98.5,14 C 99,11 98.5,7.5 97.5,5" stroke={color} strokeWidth="0.75" strokeLinecap="round"/>
        {/* BL scroll */}
        <path d="M 14,63.5 C 9,64 4,63.5 2.5,60 C 1,56.5 2.5,52 6.5,53 C 10.5,54 10,57.5 7.5,58 C 5,58.5 4.5,55.5 6.5,55"
              stroke={color} strokeWidth="0.75" strokeLinecap="round"/>
        <path d="M 1.5,51 C 1,54 1.5,57.5 2.5,60" stroke={color} strokeWidth="0.75" strokeLinecap="round"/>
        {/* BR scroll */}
        <path d="M 86,63.5 C 91,64 96,63.5 97.5,60 C 99,56.5 97.5,52 93.5,53 C 89.5,54 90,57.5 92.5,58 C 95,58.5 95.5,55.5 93.5,55"
              stroke={color} strokeWidth="0.75" strokeLinecap="round"/>
        <path d="M 98.5,51 C 99,54 98.5,57.5 97.5,60" stroke={color} strokeWidth="0.75" strokeLinecap="round"/>
        {/* Centros */}
        <circle cx="50"   cy="1.5"  r="1.4" stroke={color} strokeWidth="0.5"/>
        <circle cx="50"   cy="63.5" r="1.4" stroke={color} strokeWidth="0.5"/>
        <circle cx="1.5"  cy="32.5" r="1.4" stroke={color} strokeWidth="0.5"/>
        <circle cx="98.5" cy="32.5" r="1.4" stroke={color} strokeWidth="0.5"/>
    </svg>
)

// Pergamino: doble línea con scrolls en esquinas y diamantes al centro
const PergaminoFrame = ({ color }) => (
    <svg width="100%" height="100%" viewBox="0 0 100 65" preserveAspectRatio="none" fill="none"
         style={{ position:'absolute', inset:0, pointerEvents:'none', display:'block' }}>
        {/* Bordes exteriores (con gap en esquinas) */}
        <path d="M 13,0.5 L 87,0.5"   stroke={color} strokeWidth="0.7" strokeLinecap="round" vectorEffect="non-scaling-stroke"/>
        <path d="M 13,64.5 L 87,64.5" stroke={color} strokeWidth="0.7" strokeLinecap="round" vectorEffect="non-scaling-stroke"/>
        <path d="M 0.5,13 L 0.5,52"   stroke={color} strokeWidth="0.7" strokeLinecap="round" vectorEffect="non-scaling-stroke"/>
        <path d="M 99.5,13 L 99.5,52" stroke={color} strokeWidth="0.7" strokeLinecap="round" vectorEffect="non-scaling-stroke"/>
        {/* Bordes interiores */}
        <path d="M 15,3.5 L 85,3.5"   stroke={color} strokeWidth="0.35" opacity="0.75" strokeLinecap="round" vectorEffect="non-scaling-stroke"/>
        <path d="M 15,61.5 L 85,61.5" stroke={color} strokeWidth="0.35" opacity="0.75" strokeLinecap="round" vectorEffect="non-scaling-stroke"/>
        <path d="M 3.5,15 L 3.5,50"   stroke={color} strokeWidth="0.35" opacity="0.75" strokeLinecap="round" vectorEffect="non-scaling-stroke"/>
        <path d="M 96.5,15 L 96.5,50" stroke={color} strokeWidth="0.35" opacity="0.75" strokeLinecap="round" vectorEffect="non-scaling-stroke"/>
        {/* TL scroll */}
        <path d="M 13,0.5 C 8,0 3,1 1.5,5 C 0,9 1.5,13.5 5.5,12.5 C 9.5,11.5 9,8 7,7.5 C 5,7 4.5,9.5 6,10"
              stroke={color} strokeWidth="0.7" strokeLinecap="round"/>
        <path d="M 0.5,13 C 0,10 0.5,6.5 1.5,5" stroke={color} strokeWidth="0.7" strokeLinecap="round"/>
        {/* TR scroll */}
        <path d="M 87,0.5 C 92,0 97,1 98.5,5 C 100,9 98.5,13.5 94.5,12.5 C 90.5,11.5 91,8 93,7.5 C 95,7 95.5,9.5 94,10"
              stroke={color} strokeWidth="0.7" strokeLinecap="round"/>
        <path d="M 99.5,13 C 100,10 99.5,6.5 98.5,5" stroke={color} strokeWidth="0.7" strokeLinecap="round"/>
        {/* BL scroll */}
        <path d="M 13,64.5 C 8,65 3,64 1.5,60 C 0,56 1.5,51.5 5.5,52.5 C 9.5,53.5 9,57 7,57.5 C 5,58 4.5,55.5 6,55"
              stroke={color} strokeWidth="0.7" strokeLinecap="round"/>
        <path d="M 0.5,52 C 0,55 0.5,58.5 1.5,60" stroke={color} strokeWidth="0.7" strokeLinecap="round"/>
        {/* BR scroll */}
        <path d="M 87,64.5 C 92,65 97,64 98.5,60 C 100,56 98.5,51.5 94.5,52.5 C 90.5,53.5 91,57 93,57.5 C 95,58 95.5,55.5 94,55"
              stroke={color} strokeWidth="0.7" strokeLinecap="round"/>
        <path d="M 99.5,52 C 100,55 99.5,58.5 98.5,60" stroke={color} strokeWidth="0.7" strokeLinecap="round"/>
        {/* Diamantes centrales */}
        <path d="M 50,0.5 L 51.8,2.3 L 50,4.1 L 48.2,2.3 Z" fill={color} opacity="0.85"/>
        <path d="M 50,60.9 L 51.8,62.7 L 50,64.5 L 48.2,62.7 Z" fill={color} opacity="0.85"/>
        <path d="M 0.5,30.7 L 2.3,32.5 L 0.5,34.3 L -1.3,32.5 Z" fill={color} opacity="0.85"/>
        <path d="M 97.7,32.5 L 99.5,30.7 L 101.3,32.5 L 99.5,34.3 Z" fill={color} opacity="0.85"/>
    </svg>
)

const CORNER_SVG_MAP = { clasico:CornerClasico, lineal:CornerLineal }
const FULL_FRAME_MAP  = { stencil:StencilFrame, ornamental:OrnamentalFrame, barroco:BarrocoFrame, floraldelgado:FloralDelgadoFrame, rizos:RizosFrame, pergamino:PergaminoFrame }

// ── Inner frame ───────────────────────────────────────────────────────────────
const CORNER_TRANSFORMS = [
    { style:{ top:-22, left:-22    }, tf:'none'          },
    { style:{ top:-22, right:-22   }, tf:'scaleX(-1)'    },
    { style:{ bottom:-22, left:-22 }, tf:'scaleY(-1)'    },
    { style:{ bottom:-22, right:-22}, tf:'scale(-1,-1)'  },
]

const InnerFrame = ({ marco }) => {
    if (marco.estilo === 'ninguno') return null
    const c           = marco.color
    const isFullFrame = FULL_FRAME_MAP[marco.estilo] != null
    const isCornerSvg = CORNER_SVG_MAP[marco.estilo] != null
    const FullComp    = FULL_FRAME_MAP[marco.estilo]
    const SvgComp     = CORNER_SVG_MAP[marco.estilo]
    const inset       = isFullFrame ? '16px' : (isCornerSvg ? '22px' : '16px')

    return (
        <div className='ivd-frame' style={{ border:getFrameBorder(marco.estilo, c), inset }}>
            {marco.estilo === 'doble' && (
                <span className='ivd-frame-inner' style={{ borderColor:c }}/>
            )}
            {isFullFrame && <FullComp color={c}/>}
            {isCornerSvg && CORNER_TRANSFORMS.map((cp, i) => (
                <span key={i} style={{ position:'absolute', lineHeight:0, display:'block', pointerEvents:'none', transform:cp.tf, ...cp.style }}>
                    <SvgComp color={c}/>
                </span>
            ))}
        </div>
    )
}

// ── Tarjeta ───────────────────────────────────────────────────────────────────
const CORNER_POS_STYLE = {
    tl: { top:30, left:30 },
    tr: { top:30, right:30 },
    bl: { bottom:26, left:30 },
    br: { bottom:26, right:30 },
}

const TarjetaCard = React.forwardRef(({ tpl, textos, emojiTipo, marco, decoSelec, cornerIcons, portada, onPortadaMove }, ref) => {
    const decoActual = decoSelec || emojiTipo || tpl.decoChar
    const noMarco    = marco.estilo === 'ninguno'
    const dragRef    = useRef(null)

    const onDown = (e) => {
        if (!onPortadaMove) return
        const p = e.touches ? e.touches[0] : e
        dragRef.current = { sx:p.clientX, sy:p.clientY, ox:portada.x, oy:portada.y }
    }
    const onMove = (e) => {
        if (!dragRef.current) return
        const p = e.touches ? e.touches[0] : e
        onPortadaMove(dragRef.current.ox + (p.clientX - dragRef.current.sx), dragRef.current.oy + (p.clientY - dragRef.current.sy))
    }
    const onUp = () => { dragRef.current = null }

    return (
        <div
            ref={ref}
            className='ivd-card'
            style={{
                background: tpl.cardBg,
                color:      tpl.textColor,
                borderTop:  noMarco ? (tpl.borderTop || 'none') : 'none',
            }}
        >
            {/* Portada: marco de recorte con imagen transformable (zoom + arrastre) */}
            {portada && (
                <div
                    className='ivd-card-portada'
                    style={{ width: Math.round(190 * portada.size), height: Math.round(150 * portada.size) }}
                    onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
                    onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
                >
                    <img
                        src={portada.src} alt='' crossOrigin='anonymous' draggable={false}
                        className='ivd-card-portada-img'
                        style={{ transform:`translate(-50%,-50%) translate(${portada.x}px,${portada.y}px) scale(${portada.zoom})` }}
                    />
                </div>
            )}

            <InnerFrame marco={marco}/>

            {/* Íconos en las 4 esquinas de la tarjeta */}
            {Object.entries(cornerIcons).map(([pos, icon]) => icon ? (
                <span
                    key={pos}
                    className='ivd-card-corner-icon'
                    style={{ ...CORNER_POS_STYLE[pos] }}
                >
                    {icon}
                </span>
            ) : null)}

            <div className='ivd-card-deco' style={{ color:tpl.textColor }}>{decoActual}</div>

            <h1 className='ivd-card-titulo' style={{ color:tpl.textColor }}>
                {textos.titulo || 'Nombre del evento'}
            </h1>

            {textos.subtitulo && (
                <p className='ivd-card-subtitulo' style={{ color:tpl.subtitleColor }}>{textos.subtitulo}</p>
            )}

            <div className='ivd-card-divider' style={{ background:tpl.dividerColor }}/>

            <div className='ivd-card-detalles' style={{ color:tpl.detailColor }}>
                {textos.fecha   && <span><span className='ivd-icon'>📅</span>{textos.fecha}</span>}
                {textos.lugar   && <span><span className='ivd-icon'>📍</span>{textos.lugar}</span>}
                {textos.horario && <span><span className='ivd-icon'>🕐</span>{textos.horario}</span>}
            </div>

            {textos.mensaje && (
                <p className='ivd-card-mensaje' style={{ color:tpl.subtitleColor }}>{textos.mensaje}</p>
            )}

            <div className='ivd-card-footer' style={{ color:tpl.detailColor }}>
                {decoActual} {decoActual} {decoActual}
            </div>
        </div>
    )
})
TarjetaCard.displayName = 'TarjetaCard'

// ── Selector de esquina activa ────────────────────────────────────────────────
const CORNER_LABELS = { tl:'↖ Arriba-Izq', tr:'↗ Arriba-Der', bl:'↙ Abajo-Izq', br:'↘ Abajo-Der' }
const CORNER_KEYS   = ['tl','tr','bl','br']

const CornerMapBtn = ({ pos, icon, active, onClick }) => (
    <button
        type='button'
        className={`ivd-corner-map-btn ${active ? 'ivd-corner-map-btn--active' : ''} ivd-corner-map-btn--${pos}`}
        onClick={onClick}
        title={CORNER_LABELS[pos]}
    >
        {icon || <span className='ivd-corner-map-plus'>+</span>}
    </button>
)

// ── Modal principal ───────────────────────────────────────────────────────────
const InvitacionDesigner = ({
    nombreEvento='', tipoEvento='', fecha='', lugar='', descripcion='',
    horaInicio='', horaFin='', imagenPortada='',
    onFile, onClose,
}) => {
    const horarioInicial = horaInicio ? `${horaInicio} hs` : ''

    // portada: null | { src, zoom, x, y, size }  (zoom=escala imagen, size=escala del marco)
    const [portada,     setPortada]     = useState(imagenPortada ? { src:imagenPortada, zoom:1, x:0, y:0, size:1 } : null)
    const portadaRef = useRef()
    const setPortadaProp = (k, v) => setPortada(p => p ? { ...p, [k]: Number(v) } : p)
    const [tplId,       setTplId]       = useState('festivo')
    const [exportando,  setExportando]  = useState(false)
    const [textos,      setTextos]      = useState({ titulo:nombreEvento, subtitulo:'', fecha, lugar, horario:horarioInicial, mensaje:descripcion })
    const [marco,       setMarco]       = useState({ estilo:'ninguno', color:'#fbbf24' })
    const [decoSelec,   setDecoSelec]   = useState(null)
    const [grupoActivo, setGrupoActivo] = useState(() => {
        if (!tipoEvento) return 0
        if (tipoEvento==='boda'||tipoEvento==='aniversario') return 2
        if (tipoEvento==='natural') return 1
        return 0
    })
    const [cornerIcons,  setCornerIcons]  = useState({ tl:null, tr:null, bl:null, br:null })
    const [cornerActivo, setCornerActivo] = useState('tl')

    const cardRef = useRef()

    const tpl       = TEMPLATES.find(t => t.id === tplId) || TEMPLATES[0]
    const emojiTipo = EMOJI_TIPO[tipoEvento] || ''
    const set = (k, v) => setTextos(p => ({ ...p, [k]:v }))
    const setCornerIcon = (icon) =>
        setCornerIcons(p => ({ ...p, [cornerActivo]: p[cornerActivo]===icon ? null : icon }))

    // Foto de portada: se lee como dataURL para que html2canvas la incruste sin CORS
    const handlePortadaFile = (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = () => setPortada({ src: reader.result, zoom:1, x:0, y:0, size:1 })
        reader.readAsDataURL(file)
        e.target.value = ''
    }

    const handleExportar = async () => {
        if (!cardRef.current) return
        setExportando(true)
        try {
            const canvas = await html2canvas(cardRef.current, { scale:2, useCORS:true, backgroundColor:null, logging:false })
            canvas.toBlob(blob => {
                if (!blob) return
                onFile(new File([blob], 'invitacion.png', { type:'image/png' }))
                onClose()
            }, 'image/png')
        } catch (err) {
            console.error('Error exportando tarjeta:', err)
            alert('No se pudo exportar. Intentá de nuevo.')
        } finally {
            setExportando(false)
        }
    }

    return (
        <div className='ivd-overlay' onClick={onClose}>
            <div className='ivd-modal' onClick={e => e.stopPropagation()}>

                <div className='ivd-header'>
                    <div>
                        <h2>Diseñar tarjeta de invitación</h2>
                        <span className='ivd-header-sub'>{emojiTipo && `${emojiTipo} `}Personalizá plantilla, íconos, marco y texto</span>
                    </div>
                    <button className='ivd-cerrar' onClick={onClose}><FiX size={20}/></button>
                </div>

                <div className='ivd-layout'>
                    <aside className='ivd-sidebar'>

                        {/* 0. Foto de portada (cover) */}
                        <div className='ivd-section'>
                            <p className='ivd-section-label'>Foto de portada</p>
                            {portada ? (
                                <div className='ivd-portada-preview'>
                                    <img src={portada.src} alt='portada'/>
                                    <div className='ivd-portada-controls'>
                                        <label className='ivd-portada-slider'>
                                            <span>🔍 Zoom</span>
                                            <input type='range' min='1' max='3' step='0.02'
                                                value={portada.zoom} onChange={e => setPortadaProp('zoom', e.target.value)}/>
                                        </label>
                                        <label className='ivd-portada-slider'>
                                            <span>📐 Tamaño</span>
                                            <input type='range' min='0.6' max='1.8' step='0.02'
                                                value={portada.size} onChange={e => setPortadaProp('size', e.target.value)}/>
                                        </label>
                                    </div>
                                    <div className='ivd-portada-acciones'>
                                        <button type='button' onClick={() => setPortada(p => ({ ...p, zoom:1, x:0, y:0, size:1 }))}>Centrar</button>
                                        <button type='button' onClick={() => portadaRef.current?.click()}>Cambiar</button>
                                        <button type='button' className='ivd-portada-quitar' onClick={() => setPortada(null)}>Quitar</button>
                                    </div>
                                </div>
                            ) : (
                                <button type='button' className='ivd-portada-add' onClick={() => portadaRef.current?.click()}>
                                    📷 Subir foto de portada
                                </button>
                            )}
                            <input ref={portadaRef} type='file' accept='image/*' hidden onChange={handlePortadaFile}/>
                            <p className='ivd-portada-hint'>Arrastrá la imagen en la vista previa para recortarla. Ajustá zoom y tamaño con las barras.</p>
                        </div>

                        {/* 1. Plantilla */}
                        <div className='ivd-section'>
                            <p className='ivd-section-label'>Plantilla</p>
                            <div className='ivd-templates-grid'>
                                {TEMPLATES.map(t => (
                                    <button key={t.id} type='button'
                                        className={`ivd-tpl-thumb ${tplId===t.id?'ivd-tpl-thumb--active':''}`}
                                        onClick={() => setTplId(t.id)} title={t.label}>
                                        <span className='ivd-tpl-thumb-bg' style={{ background:t.thumbnailBg }}/>
                                        <span className='ivd-tpl-thumb-label'>{t.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 2. Ícono central */}
                        <div className='ivd-section'>
                            <p className='ivd-section-label'>Ícono central</p>
                            <div className='ivd-deco-tabs'>
                                {GRUPOS_DECO.map((g,i) => (
                                    <button key={g.label} type='button'
                                        className={`ivd-deco-tab ${grupoActivo===i?'ivd-deco-tab--active':''}`}
                                        onClick={() => setGrupoActivo(i)} title={g.label}>
                                        {g.emojis[0]}
                                    </button>
                                ))}
                            </div>
                            <div className='ivd-deco-grid'>
                                {GRUPOS_DECO[grupoActivo].emojis.map(emoji => (
                                    <button key={emoji} type='button'
                                        className={`ivd-deco-btn ${decoSelec===emoji?'ivd-deco-btn--active':''}`}
                                        onClick={() => setDecoSelec(d => d===emoji?null:emoji)}>
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                            {decoSelec && (
                                <button type='button' className='ivd-deco-reset' onClick={() => setDecoSelec(null)}>
                                    Usar ícono de la plantilla
                                </button>
                            )}
                        </div>

                        {/* 3. Íconos en esquinas */}
                        <div className='ivd-section'>
                            <p className='ivd-section-label'>Íconos en esquinas</p>
                            {/* Mini mapa de la tarjeta con los 4 botones de esquina */}
                            <div className='ivd-corners-map'>
                                {CORNER_KEYS.map(pos => (
                                    <CornerMapBtn
                                        key={pos} pos={pos}
                                        icon={cornerIcons[pos]}
                                        active={cornerActivo===pos}
                                        onClick={() => setCornerActivo(pos)}
                                    />
                                ))}
                                <div className='ivd-corners-map-label'>{CORNER_LABELS[cornerActivo]}</div>
                            </div>
                            {/* Grilla de íconos para la esquina activa */}
                            <div className='ivd-corner-icon-grid'>
                                {ICONOS_ESQUINAS.map(ch => (
                                    <button key={ch} type='button'
                                        className={`ivd-corner-btn ${cornerIcons[cornerActivo]===ch?'ivd-corner-btn--active':''}`}
                                        onClick={() => setCornerIcon(ch)}>
                                        {ch}
                                    </button>
                                ))}
                            </div>
                            {cornerIcons[cornerActivo] && (
                                <button type='button' className='ivd-deco-reset'
                                    onClick={() => setCornerIcons(p => ({ ...p, [cornerActivo]:null }))}>
                                    Quitar de esta esquina
                                </button>
                            )}
                        </div>

                        {/* 4. Marco */}
                        <div className='ivd-section'>
                            <p className='ivd-section-label'>Marco interior</p>
                            <div className='ivd-marco-grid'>
                                {ESTILOS_MARCO.map(e => (
                                    <button key={e.id} type='button'
                                        className={`ivd-marco-btn ${marco.estilo===e.id?'ivd-marco-btn--active':''}`}
                                        onClick={() => setMarco(m => ({ ...m, estilo:e.id }))} title={e.label}>
                                        <span className='ivd-marco-thumb'>
                                            <span className='ivd-marco-thumb-inner' style={marcoThumbStyle(e.id, marco.color)}/>
                                            {e.thumbChar && (
                                                <span className='ivd-marco-thumb-char' style={{ color:marco.color }}>{e.thumbChar}</span>
                                            )}
                                        </span>
                                        <span className='ivd-marco-label'>{e.label}</span>
                                    </button>
                                ))}
                            </div>
                            {marco.estilo !== 'ninguno' && (
                                <div className='ivd-marco-colores'>
                                    {MARCO_COLORES.map(c => (
                                        <button key={c} type='button'
                                            className={`ivd-color-swatch ${marco.color===c?'ivd-color-swatch--active':''}`}
                                            style={{ background:c }}
                                            onClick={() => setMarco(m => ({ ...m, color:c }))}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 5. Textos */}
                        <div className='ivd-section'>
                            <p className='ivd-section-label'>Textos</p>
                            <div className='ivd-campos'>
                                {[
                                    { key:'titulo',    label:'Título',    ph:'Nombre del evento',            max:60,  type:'input'    },
                                    { key:'subtitulo', label:'Subtítulo', ph:'Ej: ¡Te invitamos a celebrar!', max:80,  type:'input'    },
                                    { key:'fecha',     label:'Fecha',     ph:'Ej: Sábado 14 de junio, 2025',  max:50,  type:'input'    },
                                    { key:'lugar',     label:'Lugar',     ph:'Nombre del salón o dirección',  max:60,  type:'input'    },
                                    { key:'horario',   label:'Horario',   ph:'Ej: 20:00 hs',                  max:30,  type:'input'    },
                                    { key:'mensaje',   label:'Mensaje',   ph:'Texto de invitación...',        max:200, type:'textarea'  },
                                ].map(f => (
                                    <label key={f.key} className='ivd-campo'>
                                        <span>{f.label}</span>
                                        {f.type==='textarea'
                                            ? <textarea placeholder={f.ph} value={textos[f.key]} onChange={e => set(f.key, e.target.value)} rows={3} maxLength={f.max}/>
                                            : <input type='text' placeholder={f.ph} value={textos[f.key]} onChange={e => set(f.key, e.target.value)} maxLength={f.max}/>
                                        }
                                    </label>
                                ))}
                            </div>
                        </div>
                    </aside>

                    <main className='ivd-preview-area'>
                        <p className='ivd-section-label'>Vista previa</p>
                        <div className='ivd-preview-wrap'>
                            <TarjetaCard
                                ref={cardRef} tpl={tpl} textos={textos}
                                emojiTipo={emojiTipo} marco={marco}
                                decoSelec={decoSelec} cornerIcons={cornerIcons}
                                portada={portada}
                                onPortadaMove={(x, y) => setPortada(p => p ? { ...p, x, y } : p)}
                            />
                        </div>
                        <div className='ivd-acciones'>
                            <button type='button' className='ivd-btn-reset'
                                onClick={() => setTextos({ titulo:nombreEvento, subtitulo:'', fecha, lugar, horario:horarioInicial, mensaje:descripcion })}>
                                <FiRefreshCw size={13}/> Restablecer
                            </button>
                            <button type='button' className='ivd-btn-exportar' onClick={handleExportar} disabled={exportando}>
                                {exportando
                                    ? <><span className='ivd-spinner'/> Generando…</>
                                    : <><FiDownload size={15}/> Usar esta tarjeta</>
                                }
                            </button>
                        </div>
                    </main>
                </div>
            </div>
        </div>
    )
}

export default InvitacionDesigner
