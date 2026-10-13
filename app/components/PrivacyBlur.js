'use client';

import { useEffect, useRef } from 'react';
import { usePrivacy } from '../../lib/privacy';

// Frosted glass over everything below the header, with a clear spotlight that follows the pointer.
export default function PrivacyBlur() {
  const { blur } = usePrivacy();
  const ref = useRef(null);

  useEffect(() => {
    if (!blur) return;
    const el = ref.current;
    const place = () => {
      const header = document.querySelector('.site-header');
      el.style.top = `${Math.max(0, header ? header.getBoundingClientRect().bottom : 0)}px`;
    };
    const move = (e) => {
      const top = el.getBoundingClientRect().top;
      el.style.setProperty('--x', `${e.clientX}px`);
      el.style.setProperty('--y', `${e.clientY - top}px`);
    };
    const hide = () => el.style.setProperty('--x', '-999px');
    place();
    hide();
    window.addEventListener('scroll', place, { passive: true });
    window.addEventListener('resize', place);
    window.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerleave', hide);
    return () => {
      window.removeEventListener('scroll', place);
      window.removeEventListener('resize', place);
      window.removeEventListener('pointermove', move);
      document.removeEventListener('pointerleave', hide);
    };
  }, [blur]);

  if (!blur) return null;
  return <div ref={ref} className="privacy-blur" aria-hidden="true" />;
}
