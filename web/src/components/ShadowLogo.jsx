// Nuevo logo SVG personalizado para Shadow TV Pro
const ShadowLogo = ({ size = 36, className = '' }) => (
    <svg
        className={className}
        width={size * 3.2}
        height={size}
        viewBox="0 0 128 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
    >
        {/* Ícono: Señal de TV + Rayo */}
        <g>
            {/* Pantalla de TV estilizada */}
            <rect x="2" y="8" width="28" height="20" rx="4" fill="none" stroke="#3b82f6" strokeWidth="2.2" />
            <rect x="5" y="11" width="22" height="14" rx="2" fill="#3b82f6" opacity="0.15" />
            {/* Rayo en el centro */}
            <path d="M17 12L13 20h5l-1 8 6-10h-5l1-6z" fill="#3b82f6" />
            {/* Antena izquierda */}
            <line x1="10" y1="8" x2="6" y2="2" stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round" />
            {/* Antena derecha */}
            <line x1="20" y1="8" x2="24" y2="2" stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round" />
        </g>

        {/* Texto SHADOW */}
        <text
            x="36"
            y="18"
            fontFamily="'Inter', 'Arial Black', sans-serif"
            fontWeight="800"
            fontSize="12"
            letterSpacing="1"
            fill="#ffffff"
        >
            SHADOW
        </text>

        {/* Línea separadora */}
        <rect x="36" y="21" width="52" height="1" fill="#3b82f6" opacity="0.6" />

        {/* Texto TV PRO */}
        <text
            x="38"
            y="32"
            fontFamily="'Inter', 'Arial', sans-serif"
            fontWeight="400"
            fontSize="8"
            letterSpacing="3"
            fill="#3b82f6"
        >
            TV PRO
        </text>

        {/* Punto de acento */}
        <circle cx="122" cy="10" r="3" fill="#3b82f6" />
        <circle cx="122" cy="10" r="5" fill="none" stroke="#3b82f6" strokeWidth="1" opacity="0.4" />
    </svg>
);

export default ShadowLogo;
