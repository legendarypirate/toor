/**
 * Ant Design–style message: top center, slides down from top, compact white card.
 */

const STACK_ID = 'app-message-stack';

function getStack(): HTMLElement {
  let root = document.getElementById(STACK_ID);
  if (!root) {
    root = document.createElement('div');
    root.id = STACK_ID;
    root.className =
      'pointer-events-none fixed inset-x-0 top-0 z-[1010] flex flex-col items-center gap-2 pt-[max(12px,env(safe-area-inset-top))]';
    document.body.appendChild(root);
  }
  return root;
}

function escapeHtml(message: string): string {
  const d = document.createElement('div');
  d.textContent = message;
  return d.innerHTML;
}

export function showAppMessage(
  message: string,
  type: 'success' | 'error' | 'warning' = 'success',
  duration = 3000
): void {
  if (typeof document === 'undefined') return;

  const stack = getStack();

  const row = document.createElement('div');
  row.className = 'pointer-events-none flex w-full justify-center px-4';

  const inner = document.createElement('div');
  inner.setAttribute('role', 'status');
  inner.className = [
    'pointer-events-auto flex max-w-[min(520px,calc(100vw-2rem))] items-start gap-3 rounded-lg border border-[rgba(0,0,0,0.06)] bg-white px-4 py-3 text-sm text-neutral-900',
    'shadow-[0_6px_16px_0_rgba(0,0,0,0.08),0_3px_6px_-4px_rgba(0,0,0,0.12)]',
    'transition-all duration-200 ease-out opacity-0 -translate-y-2',
  ].join(' ');

  const iconShell =
    type === 'success'
      ? 'bg-[#f6ffed] text-[#52c41a]'
      : type === 'error'
        ? 'bg-[#fff2f0] text-[#ff4d4f]'
        : 'bg-[#fffbe6] text-[#faad14]';

  const iconChar = type === 'success' ? '✓' : type === 'error' ? '✕' : '!';

  inner.innerHTML = `<span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${iconShell}">${iconChar}</span><span class="min-w-0 flex-1 break-words font-medium leading-snug">${escapeHtml(message)}</span>`;

  row.appendChild(inner);
  stack.appendChild(row);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      inner.classList.remove('opacity-0', '-translate-y-2');
      inner.classList.add('opacity-100', 'translate-y-0');
    });
  });

  const hide = () => {
    inner.classList.remove('opacity-100', 'translate-y-0');
    inner.classList.add('opacity-0', '-translate-y-2');
    setTimeout(() => {
      row.remove();
      if (stack.childElementCount === 0) {
        stack.remove();
      }
    }, 200);
  };

  window.setTimeout(hide, duration);
}
