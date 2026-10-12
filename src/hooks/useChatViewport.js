import { useLayoutEffect, useRef } from 'react';

// Mobile keyboards resize the visual viewport even when 100dvh stays unchanged.
export function useChatViewport(active) {
  const shell = useRef(null);
  useLayoutEffect(() => {
    if (!active || !shell.current) return;
    const node = shell.current;
    const viewport = window.visualViewport;
    let frame;
    const update = () => {
      // Let the browser retain normal magnification and panning during pinch zoom.
      if (viewport && viewport.scale !== 1) return;
      const height = viewport?.height ?? window.innerHeight;
      node.style.setProperty('--chat-viewport-height', `${height}px`);
      node.style.setProperty('--chat-viewport-top', `${viewport?.offsetTop ?? 0}px`);
      node.dataset.compact = String(height <= 500);
      node.dataset.keyboard = String(document.activeElement?.matches('textarea, input') && window.innerHeight - height > 100);
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(update); };
    document.documentElement.classList.add('finn-viewport');
    window.scrollTo(0, 0);
    update();
    viewport?.addEventListener('resize', schedule);
    viewport?.addEventListener('scroll', schedule);
    window.addEventListener('resize', schedule);
    document.addEventListener('focusin', schedule);
    document.addEventListener('focusout', schedule);
    return () => {
      cancelAnimationFrame(frame);
      viewport?.removeEventListener('resize', schedule);
      viewport?.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      document.removeEventListener('focusin', schedule);
      document.removeEventListener('focusout', schedule);
      document.documentElement.classList.remove('finn-viewport');
      node.style.removeProperty('--chat-viewport-height');
      node.style.removeProperty('--chat-viewport-top');
      delete node.dataset.compact;
      delete node.dataset.keyboard;
    };
  }, [active]);
  return shell;
}
