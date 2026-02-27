/**
 * Injects scoped CSS animations into AI Wall design previews.
 * Buttons get hover/pulse effects, sections get entrance animations,
 * and interactive elements feel alive.
 */
export function AIWallAnimatedStyles({ scopeId }: { scopeId: string }) {
  return (
    <style>{`
      /* === Entrance animations for sections === */
      #${scopeId} > div > div {
        animation: aiwall-section-enter 0.6s ease-out both;
      }
      #${scopeId} > div > div:nth-child(1) { animation-delay: 0s; }
      #${scopeId} > div > div:nth-child(2) { animation-delay: 0.12s; }
      #${scopeId} > div > div:nth-child(3) { animation-delay: 0.24s; }
      #${scopeId} > div > div:nth-child(4) { animation-delay: 0.36s; }
      #${scopeId} > div > div:nth-child(5) { animation-delay: 0.48s; }
      #${scopeId} > div > div:nth-child(6) { animation-delay: 0.6s; }

      @keyframes aiwall-section-enter {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      /* === Button animations === */
      #${scopeId} button,
      #${scopeId} [role="button"],
      #${scopeId} a[class*="btn"],
      #${scopeId} a[class*="button"] {
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        position: relative;
        overflow: hidden;
      }

      #${scopeId} button:hover,
      #${scopeId} [role="button"]:hover {
        transform: translateY(-2px) scale(1.03) !important;
        box-shadow: 0 8px 25px -5px rgba(0,0,0,0.3) !important;
        filter: brightness(1.1);
      }

      #${scopeId} button:active,
      #${scopeId} [role="button"]:active {
        transform: translateY(0) scale(0.98) !important;
        transition-duration: 0.1s !important;
      }

      /* Subtle shimmer on buttons */
      #${scopeId} button::after,
      #${scopeId} [role="button"]::after {
        content: '';
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: linear-gradient(
          45deg,
          transparent 30%,
          rgba(255,255,255,0.08) 50%,
          transparent 70%
        );
        animation: aiwall-btn-shimmer 4s ease-in-out infinite;
        pointer-events: none;
      }

      @keyframes aiwall-btn-shimmer {
        0%, 100% { transform: translateX(-100%) rotate(0deg); }
        50% { transform: translateX(100%) rotate(0deg); }
      }

      /* === Image hover effects === */
      #${scopeId} img {
        transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), 
                    filter 0.5s ease !important;
      }

      #${scopeId} img:hover {
        transform: scale(1.04) !important;
      }

      /* === Card hover effects === */
      #${scopeId} [class*="card"],
      #${scopeId} [class*="Card"] {
        transition: transform 0.3s ease, box-shadow 0.3s ease !important;
      }

      #${scopeId} [class*="card"]:hover,
      #${scopeId} [class*="Card"]:hover {
        transform: translateY(-4px) !important;
        box-shadow: 0 12px 40px -8px rgba(0,0,0,0.2) !important;
      }

      /* === Heading subtle animation === */
      #${scopeId} h1, #${scopeId} h2 {
        animation: aiwall-heading-reveal 0.8s ease-out both;
      }

      @keyframes aiwall-heading-reveal {
        from {
          opacity: 0;
          transform: translateY(15px);
          filter: blur(4px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
          filter: blur(0);
        }
      }

      /* === Link hover underline animation === */
      #${scopeId} a {
        transition: color 0.2s ease !important;
      }

      /* === Smooth scrollbar for preview === */
      #${scopeId} {
        scroll-behavior: smooth;
      }

      /* === Badge / pill pulse === */
      #${scopeId} [class*="badge"],
      #${scopeId} [class*="Badge"],
      #${scopeId} [class*="pill"],
      #${scopeId} [class*="tag"] {
        animation: aiwall-badge-pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
      }

      @keyframes aiwall-badge-pop {
        from {
          opacity: 0;
          transform: scale(0.8);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }
    `}</style>
  );
}
