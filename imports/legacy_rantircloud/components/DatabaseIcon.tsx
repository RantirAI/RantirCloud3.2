
interface DatabaseIconProps {
  color: string;
  className?: string;
}

export function DatabaseIcon({ color, className = "w-7 h-7" }: DatabaseIconProps) {
  return (
    <div 
      className={`rounded-lg flex items-center justify-center ${className}`}
      style={{ backgroundColor: `${color}1A` }} // 10% opacity background
    >
      <svg width="18" height="18" viewBox="0 0 29 29" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g filter="url(#filter0_di_537_2709)">
          <path 
            d="M2 8.99999C2 4.58171 5.58172 1 10 1H19.4489C23.8672 1 27.4489 4.58172 27.4489 9V18.4489C27.4489 22.8672 23.8672 26.4489 19.4489 26.4489H9.99999C5.58171 26.4489 2 22.8672 2 18.4489V8.99999Z" 
            fill={`${color}1A`} 
            shapeRendering="crispEdges"
          />
          <path 
            d="M10 1.18164H19.4492C23.7668 1.18181 27.2666 4.68241 27.2666 9V18.4492C27.2664 22.7667 23.7667 26.2664 19.4492 26.2666H10C5.68241 26.2666 2.18182 22.7668 2.18164 18.4492V9C2.18164 4.6823 5.6823 1.18164 10 1.18164Z" 
            stroke="currentColor" 
            strokeOpacity="0.16" 
            strokeWidth="0.364232" 
            shapeRendering="crispEdges"
          />
          <path 
            d="M14.7248 11.0594C18.0365 11.0594 20.7211 10.1645 20.7211 9.06065C20.7211 7.95677 18.0365 7.06189 14.7248 7.06189C11.4131 7.06189 8.72852 7.95677 8.72852 9.06065C8.72852 10.1645 11.4131 11.0594 14.7248 11.0594Z" 
            stroke="currentColor" 
            strokeWidth="1.2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
          <path 
            d="M8.72852 9.06067V18.3882C8.72852 18.9183 9.36027 19.4267 10.4848 19.8016C11.6093 20.1764 13.1345 20.387 14.7248 20.387C16.3151 20.387 17.8403 20.1764 18.9648 19.8016C20.0893 19.4267 20.7211 18.9183 20.7211 18.3882V9.06067" 
            stroke="currentColor" 
            strokeWidth="1.2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
          <path 
            d="M8.72852 13.7244C8.72852 14.2545 9.36027 14.7629 10.4848 15.1377C11.6093 15.5125 13.1345 15.7231 14.7248 15.7231C16.3151 15.7231 17.8403 15.5125 18.9648 15.1377C20.0893 14.7629 20.7211 14.2545 20.7211 13.7244" 
            stroke="currentColor" 
            strokeWidth="1.2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </g>
        <defs>
          <filter id="filter0_di_537_2709" x="0.907304" y="0.635768" width="27.6346" height="27.6342" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
            <feFlood floodOpacity="0" result="BackgroundImageFix"/>
            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
            <feMorphology radius="0.364232" operator="erode" in="SourceAlpha" result="effect1_dropShadow_537_2709"/>
            <feOffset dy="0.728464"/>
            <feGaussianBlur stdDeviation="0.728464"/>
            <feComposite in2="hardAlpha" operator="out"/>
            <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.08 0"/>
            <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_537_2709"/>
            <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_537_2709" result="shape"/>
            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
            <feOffset dy="-0.364232"/>
            <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
            <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.12 0"/>
            <feBlend mode="normal" in2="shape" result="effect2_innerShadow_537_2709"/>
          </filter>
        </defs>
      </svg>
    </div>
  );
}
