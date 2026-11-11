"use client";

// Shared-element morph between a job row and its job page, using the browser's View Transitions API directly.
// A job's logo mark and title keep their identity across the navigation: they are named on the row you clicked and on
// the page you land on, and the browser animates between the two positions. Unsupported browsers and reduced motion
// fall back to a normal navigation.

export const MORPH_ATTR = "data-morph"; // on <html> while a morph runs; the generic page fade steps aside
export const MORPH_JOB_ATTR = "data-morph-job"; // the job whose row must be named when navigating back to the list
const MARK = "job-mark";
const TITLE = "job-title";

type Router = { push: (href: string) => void };

export const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
export const supportsMorph = () => typeof document !== "undefined" && "startViewTransition" in document && !prefersReducedMotion();

const setName = (el: Element | null | undefined, name: string) => {
  if (el instanceof HTMLElement) el.style.viewTransitionName = name;
};
function clearNames() {
  document.querySelectorAll<HTMLElement>("[data-vt-mark], [data-vt-title]").forEach((el) => {
    el.style.viewTransitionName = "";
  });
}

/** Resolves once the app has navigated to `pathname` and painted the destination (or after a safety timeout).
 *  Timers, not requestAnimationFrame: a stalled frame loop must never leave a view transition (and so rendering) hanging. */
function arrived(pathname: string, ready: () => boolean): Promise<void> {
  return new Promise((resolve) => {
    const start = performance.now();
    const tick = () => {
      if ((location.pathname === pathname && ready()) || performance.now() - start > 2500) setTimeout(resolve, 50);
      else setTimeout(tick, 16);
    };
    tick();
  });
}

function run(router: Router, href: string, ready: () => boolean) {
  document.documentElement.setAttribute(MORPH_ATTR, "1");
  const pathname = new URL(href, location.href).pathname;
  const transition = (document as Document & { startViewTransition: (cb: () => Promise<void>) => { finished: Promise<void> } }).startViewTransition(() => {
    router.push(href);
    return arrived(pathname, ready);
  });
  const done = () => {
    clearNames();
    document.documentElement.removeAttribute(MORPH_ATTR);
    document.documentElement.removeAttribute(MORPH_JOB_ATTR);
  };
  transition.finished.then(done, done);
}

/** Click handler for a job row link. Returns true if it took over the navigation. */
export function morphToJob(e: React.MouseEvent<HTMLElement>, router: Router, href: string): boolean {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || !supportsMorph()) return false;
  const row = e.currentTarget.closest("li") ?? e.currentTarget;
  setName(row.querySelector("[data-vt-mark]"), MARK);
  setName(row.querySelector("[data-vt-title]"), TITLE);
  e.preventDefault();
  run(router, href, () => document.querySelector("[data-job-page]") !== null);
  return true;
}

/** Back from a job page to the list: the page's mark and title are already named; the row is named when it renders. */
export function morphToList(e: React.MouseEvent<HTMLElement>, router: Router, jobId: string): boolean {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || !supportsMorph()) return false;
  document.documentElement.setAttribute(MORPH_JOB_ATTR, jobId);
  e.preventDefault();
  run(router, "/jobs", () => document.querySelector(`[data-job-row="${CSS.escape(jobId)}"]`) !== null);
  return true;
}

export const VT_NAMES = { MARK, TITLE };
