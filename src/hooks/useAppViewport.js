import { useLayoutEffect, useRef } from 'react';
import { containViewportGestures } from '../lib/viewport-gestures.js';

export function useAppViewport(active, fixedChat, route) {
  const shell = useRef(null);
  useLayoutEffect(() => {
    if (!active || !shell.current) return;
    const node = shell.current;
    const root = document.documentElement;
    const viewport = window.visualViewport;
    const restingHeights = new Map();
    let frame, focusFrame, locked = false, keyboard = false, savedScroll = 0;
    const revealInput = () => {
      if (fixedChat || !keyboard) return;
      const input = document.activeElement;
      const main = node.querySelector('main');
      if (!main?.contains(input)) return;
      const field = input.getBoundingClientRect(), area = main.getBoundingClientRect();
      if (field.height > area.height - 24) main.scrollTop += field.top - area.top - 12;
      else if (field.bottom > area.bottom - 12) main.scrollTop += field.bottom - area.bottom + 12;
      else if (field.top < area.top + 12) main.scrollTop += field.top - area.top - 12;
    };
    const update = () => {
      // Preserve native pinch zoom and its panning.
      if (viewport && viewport.scale !== 1) return;
      const height = viewport?.height ?? window.innerHeight;
      const width = window.innerWidth;
      const focused = document.activeElement?.matches('textarea, input:not([type=checkbox]):not([type=radio]):not([type=range]), [contenteditable=true]');
      const restingHeight = Math.max(restingHeights.get(width) || 0, window.innerHeight);
      const nextKeyboard = Boolean(focused && restingHeight - height > 100);
      if (!nextKeyboard) restingHeights.set(width, height);
      keyboard = nextKeyboard;
      const nextLocked = fixedChat || keyboard;
      // Safari can retain an old keyboard offset briefly after dismissal.
      const top = keyboard ? viewport?.offsetTop ?? 0 : 0;
      const restoreScroll = node.querySelector('main')?.scrollTop ?? savedScroll;
      if (nextLocked && !locked) savedScroll = window.scrollY;
      node.style.setProperty('--app-viewport-height', `${height}px`);
      node.style.setProperty('--app-viewport-top', `${top}px`);
      root.style.setProperty('--app-viewport-height', `${height}px`);
      root.style.setProperty('--app-viewport-top', `${top}px`);
      node.dataset.viewportLocked = String(nextLocked);
      node.dataset.keyboard = String(keyboard);
      node.dataset.compact = String(nextLocked && height <= 500);
      if (nextLocked && !locked) {
        root.classList.add('app-viewport');
        // Preserve the form's reading position when moving scroll into main.
        if (!fixedChat) {
          const main = node.querySelector('main');
          if (main) main.scrollTop = savedScroll;
        }
        window.scrollTo(0, 0);
      }
      if (!nextLocked && locked) {
        root.classList.remove('app-viewport');
        window.scrollTo(0, restoreScroll);
      }
      locked = nextLocked;
      cancelAnimationFrame(focusFrame);
      focusFrame = requestAnimationFrame(revealInput);
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(update); };
    const resetScroll = () => {
      if (locked && (!viewport || viewport.scale === 1) && window.scrollY) window.scrollTo(0, 0);
      schedule();
    };
    update();
    const releaseGestures = containViewportGestures(() => locked, () => keyboard);
    viewport?.addEventListener('resize', schedule);
    viewport?.addEventListener('scroll', schedule);
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', resetScroll);
    document.addEventListener('focusin', schedule);
    document.addEventListener('focusout', schedule);
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(focusFrame);
      releaseGestures();
      viewport?.removeEventListener('resize', schedule);
      viewport?.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', resetScroll);
      document.removeEventListener('focusin', schedule);
      document.removeEventListener('focusout', schedule);
      root.classList.remove('app-viewport');
      for (const el of [node, root]) {
        el.style.removeProperty('--app-viewport-height');
        el.style.removeProperty('--app-viewport-top');
      }
      delete node.dataset.viewportLocked;
      delete node.dataset.compact;
      delete node.dataset.keyboard;
    };
  }, [active, fixedChat, route]);
  return shell;
}
