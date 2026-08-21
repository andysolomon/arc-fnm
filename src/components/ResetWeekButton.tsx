import { useEffect, useId, useRef, useState } from 'react';

import { trapTabInside } from '../a11y/dialogFocus.ts';
import { useWeek } from '../state/weekContext.ts';

export function ResetWeekButton({
  className,
  title = 'Restore the seeded week baseline',
}: {
  readonly className?: string;
  readonly title?: string;
}) {
  const { state, dispatch } = useWeek();
  const [open, setOpen] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const bodyId = useId();
  const saved = state.week.lessons.length > 0;

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const requestReset = () => {
    if (!saved) {
      dispatch({ type: 'reset-week' });
      return;
    }
    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        title={title}
        onClick={requestReset}
        className={className}
      >
        Reset week
      </button>
      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div
            aria-hidden="true"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/28"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={bodyId}
            onKeyDown={trapTabInside}
            className="edge-raised relative z-10 w-full max-w-[420px] rounded-xl bg-white p-4"
          >
            <h2
              id={titleId}
              className="m-0 text-[15px] font-semibold tracking-[-0.3px]"
            >
              Reset discards saved lessons
            </h2>
            <p
              id={bodyId}
              className="text-ink-muted mt-2 mb-0 text-[12.5px] leading-[1.55] text-pretty"
            >
              {state.week.lessons.length === 1
                ? 'One saved lesson rides to the next opponent board. Reset restores the seeded week and throws that lesson away.'
                : `${state.week.lessons.length} saved lessons ride to the next opponent board. Reset restores the seeded week and throws them away.`}
            </p>
            <div className="mt-3.5 flex flex-wrap justify-end gap-2">
              <button
                ref={cancelRef}
                type="button"
                onClick={() => setOpen(false)}
                className="edge text-ink-muted hover:text-ink h-[34px] cursor-pointer rounded-md border-0 bg-white px-[15px] font-sans text-[13px] font-medium"
              >
                Keep the week
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  dispatch({ type: 'reset-week' });
                }}
                className="bg-danger h-[34px] cursor-pointer rounded-md border-0 px-[15px] font-sans text-[13px] font-medium text-white"
              >
                Reset anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
