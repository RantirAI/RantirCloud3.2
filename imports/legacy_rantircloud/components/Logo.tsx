
import React from 'react';

export const Logo = ({ className = "" }: { className?: string }) => (
  <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <g clipPath="url(#clip0_2992_100)">
      <g filter="url(#filter0_d_2992_100)">
        <path d="M28.2267 4H7.77329C5.68936 4 4 5.79086 4 8V28C4 30.2091 5.68936 32 7.77329 32H28.2267C30.3106 32 32 30.2091 32 28V8C32 5.79086 30.3106 4 28.2267 4Z" fill="#F1F1F1"/>
        <path d="M28.5407 4H7.4593C5.54878 4 4 5.62504 4 7.62963V28.3704C4 30.375 5.54878 32 7.4593 32H28.5407C30.4512 32 32 30.375 32 28.3704V7.62963C32 5.62504 30.4512 4 28.5407 4Z" stroke="#F6F6F6"/>
      </g>
      <path d="M14.0537 11.626L20.628 11.626C21.6704 11.626 22.5791 11.8064 23.3543 12.1672C24.1294 12.5147 24.7307 13.0091 25.1584 13.6506C25.586 14.2921 25.7999 15.0405 25.7999 15.8958C25.7999 16.7377 25.586 17.4794 25.1584 18.1209C24.7307 18.749 24.1294 19.2434 23.3543 19.6043C22.5791 19.9517 21.6704 20.1255 20.628 20.1255H17.7268L15.933 17.8603H20.5478C21.2828 17.8603 21.8441 17.6932 22.2317 17.3591C22.6326 17.0117 22.8331 16.5306 22.8331 15.9158C22.8331 15.2877 22.6393 14.8133 22.2517 14.4926C21.8642 14.1585 21.2962 13.9914 20.5478 13.9914H15.3066L14.0537 11.626ZM22.3119 26.0591L16.5186 18.5619H19.7861L26.4814 26.0591H22.3119Z" fill="#141526"/>
      <path d="M19.5672 14.8042L16.3653 16.4396C15.5374 16.8618 15.0743 17.7713 15.2343 18.6904L15.8344 22.3015L14.199 19.0996C13.7768 18.2718 12.8673 17.8087 11.9482 17.9686L8.33707 18.5687L11.539 16.9333C12.3668 16.5111 12.8299 15.6017 12.67 14.6826L12.0699 11.0714L13.7053 14.2733C14.1275 15.1012 15.0369 15.5643 15.956 15.4043L19.5672 14.8042Z" fill="#141526"/>
    </g>
    <defs>
      <filter id="filter0_d_2992_100" x="1.5" y="3.5" width="33" height="33" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
        <feFlood floodOpacity="0" result="BackgroundImageFix"/>
        <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
        <feOffset dy="2"/>
        <feGaussianBlur stdDeviation="1"/>
        <feComposite in2="hardAlpha" operator="out"/>
        <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.04 0"/>
        <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_2992_100"/>
        <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_2992_100" result="shape"/>
      </filter>
      <clipPath id="clip0_2992_100">
        <rect width="36" height="36" fill="white"/>
      </clipPath>
    </defs>
  </svg>
);
