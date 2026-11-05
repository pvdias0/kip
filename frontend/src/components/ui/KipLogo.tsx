import { cn } from '@/lib/utils';

interface KipLogoProps {
    size?: 'sm' | 'md' | 'lg' | 'xl';
    animated?: boolean;
    className?: string;
    showText?: boolean;
    /** false = sem animacao de entrada (usado na landing pre-renderizada). */
    entrance?: boolean;
}

const sizeMap = {
    sm: { icon: 32, text: 'text-lg' },
    md: { icon: 48, text: 'text-2xl' },
    lg: { icon: 64, text: 'text-3xl' },
    xl: { icon: 80, text: 'text-4xl' },
};

export function KipLogo({
    size = 'md',
    animated = true,
    className,
    showText = true,
    entrance = true,
}: KipLogoProps) {
    const { icon: iconSize, text: textSize } = sizeMap[size];

    const LogoIcon = () => (
        <svg
            width={iconSize}
            height={iconSize}
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            {/* Background Circle with Gradient */}
            <defs>
                <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0d9488" />
                    <stop offset="100%" stopColor="#22c55e" />
                </linearGradient>
                <linearGradient id="shineGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                </linearGradient>
            </defs>

            {/* Main Circle */}
            <circle cx="24" cy="24" r="22" fill="url(#logoGradient)" />

            {/* Shine Effect */}
            <ellipse
                cx="18"
                cy="16"
                rx="12"
                ry="8"
                fill="url(#shineGradient)"
                opacity="0.5"
            />

            {/* K Letter - Stylized */}
            <path
                d="M16 14V34M16 24L28 14M16 24L28 34"
                stroke="white"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            {/* Coin/Money Accent */}
            <circle
                cx="34"
                cy="14"
                r="6"
                fill="white"
                opacity="0.9"
            />
            <text
                x="34"
                y="17"
                fontSize="8"
                fontWeight="bold"
                fill="hsl(173, 75%, 35%)"
                textAnchor="middle"
            >
                $
            </text>
        </svg>
    );

    if (!animated) {
        return (
            <div className={cn("flex items-center gap-3", className)}>
                <LogoIcon />
                {showText && (
                    <span className={cn("font-display font-bold tracking-tight", textSize)}>
                        KIP
                    </span>
                )}
            </div>
        );
    }

    // Animacoes em CSS (tailwindcss-animate) em vez de framer-motion, para o logo
    // nao puxar a biblioteca para o bundle principal da landing.
    return (
        <div
            className={cn(
                "flex items-center gap-3",
                entrance && "animate-in fade-in zoom-in-90 duration-500 ease-out",
                className
            )}
        >
            <div className="transition-transform duration-200 ease-out hover:rotate-[5deg] hover:scale-105 active:scale-95 motion-reduce:transform-none">
                <LogoIcon />
            </div>
            {showText && (
                <span
                    className={cn(
                        "font-display font-bold tracking-tight text-primary",
                        entrance && "animate-in fade-in slide-in-from-left-2 delay-200 duration-500 fill-mode-backwards",
                        textSize
                    )}
                >
                    KIP
                </span>
            )}
        </div>
    );
}

export default KipLogo;
