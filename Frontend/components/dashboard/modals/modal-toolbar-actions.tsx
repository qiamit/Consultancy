"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

function cloneActionNodes(nodes: ReactNode[], keyPrefix: string): ReactNode[] {
  return nodes.map((node, index) => {
    if (!isValidElement(node)) return node;
    return cloneElement(node, {
      key: `${keyPrefix}-${String(node.key ?? index)}`,
    });
  });
}

function readNodeText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(readNodeText).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return readNodeText(node.props.children);
  }
  return "";
}

function isSaveButton(child: ReactElement<{ children?: ReactNode }>): boolean {
  const label = readNodeText(child.props.children).trim();
  return /^saving/i.test(label) || /^save\b/i.test(label);
}

function isElementType(child: ReactElement, tag: string) {
  return typeof child.type === "string" && child.type === tag;
}

type SaveButtonProps = {
  children?: ReactNode;
  onClick?: (
    event: ReactMouseEvent<HTMLButtonElement>,
  ) => void | boolean | Promise<void | boolean>;
};

type ModalToolbarActionsProps = {
  children: ReactNode;
  onClose: () => void;
  /** Optional label for the action menu trigger */
  menuLabel?: string;
};

/**
 * Document-modal action cluster: Save stays on the bar.
 * Every other action (Import, Print, downloads, settings, QE Assistant, …)
 * lives in an Action dropdown on all tabs. Very narrow screens use a
 * hamburger trigger. Menu is portaled so it is not clipped.
 * Close always runs Save first (when a Save button exists), then closes —
 * return `false` from Save to keep the modal open (e.g. validation failed).
 */
export function ModalToolbarActions({
  children,
  onClose,
  menuLabel = "Action",
}: ModalToolbarActionsProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [iconOnly, setIconOnly] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);

  const childList = Children.toArray(children);
  const statusNodes: ReactNode[] = [];
  const alwaysNodes: ReactNode[] = [];
  const actionNodes: ReactNode[] = [];

  for (const child of childList) {
    if (!isValidElement(child)) {
      statusNodes.push(child);
      continue;
    }
    if (isElementType(child, "input")) {
      alwaysNodes.push(child);
      continue;
    }
    if (isElementType(child, "button")) {
      actionNodes.push(child);
      continue;
    }
    // Anchors (e.g. Maps link) stay with the Action menu
    if (isElementType(child, "a")) {
      actionNodes.push(child);
      continue;
    }
    statusNodes.push(child);
  }

  const saveNodes = actionNodes.filter(
    (node) => isValidElement<{ children?: ReactNode }>(node) && isSaveButton(node),
  );
  const menuActionNodes = actionNodes.filter(
    (node) =>
      !(isValidElement<{ children?: ReactNode }>(node) && isSaveButton(node)),
  );

  const recompute = useCallback(() => {
    const host = hostRef.current;
    const bar = host?.parentElement;
    if (!bar) return;
    setIconOnly(bar.clientWidth < 420);
  }, []);

  const updateMenuPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + 4,
      right: Math.max(8, window.innerWidth - rect.right),
    });
  }, []);

  useLayoutEffect(() => {
    recompute();
    const host = hostRef.current;
    const bar = host?.parentElement;
    if (!host || !bar) return;
    const ro = new ResizeObserver(() => recompute());
    ro.observe(bar);
    ro.observe(host);
    return () => ro.disconnect();
  }, [recompute, children]);

  useLayoutEffect(() => {
    if (!menuOpen) {
      setMenuPos(null);
      return;
    }
    updateMenuPosition();
  }, [menuOpen, updateMenuPosition, iconOnly]);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) {
        return;
      }
      setMenuOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    function onReposition() {
      updateMenuPosition();
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [menuOpen, updateMenuPosition]);

  const menuPanel =
    menuOpen && menuPos && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            role="menu"
            className="fixed z-[1000] max-h-[min(70vh,28rem)] w-max min-w-[12.5rem] overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 p-1.5 shadow-2xl"
            style={{ top: menuPos.top, right: menuPos.right }}
            onClick={(event) => {
              if ((event.target as HTMLElement).closest("button, a")) {
                setMenuOpen(false);
              }
            }}
          >
            <div className="flex flex-col gap-1 [&_a]:block [&_a]:w-full [&_button]:w-full [&_button]:justify-start">
              {cloneActionNodes(menuActionNodes, "menu")}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={hostRef} className="flex min-w-0 shrink-0 items-center gap-2 sm:ml-auto">
      {statusNodes.length > 0 ? (
        <div data-toolbar-status className="flex shrink-0 items-center gap-2">
          {statusNodes}
        </div>
      ) : null}

      {alwaysNodes}

      {saveNodes.length > 0 ? (
        <div className="flex shrink-0 items-center gap-2">
          {cloneActionNodes(saveNodes, "pinned-save")}
        </div>
      ) : null}

      {menuActionNodes.length > 0 ? (
        <div className="relative">
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className={`shrink-0 rounded-lg border border-zinc-600 bg-zinc-800 text-xs font-semibold text-zinc-100 hover:bg-zinc-700 ${
              iconOnly ? "p-1.5" : "whitespace-nowrap px-3 py-1.5"
            }`}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label={menuLabel}
            title={menuLabel}
          >
            {iconOnly ? (
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            ) : (
              <>
                {menuLabel}
                <span className="ml-1 inline-block text-[10px] opacity-70" aria-hidden>
                  ▾
                </span>
              </>
            )}
          </button>
          {menuPanel}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => {
          void (async () => {
            const saveNode = saveNodes.find((node): node is ReactElement<SaveButtonProps> => {
              if (!isValidElement(node)) return false;
              return isSaveButton(node as ReactElement<{ children?: ReactNode }>);
            });
            if (saveNode?.props.onClick) {
              const result = await Promise.resolve(
                saveNode.props.onClick({
                  preventDefault() {},
                  stopPropagation() {},
                } as ReactMouseEvent<HTMLButtonElement>),
              );
              if (result === false) return;
            }
            onClose();
          })();
        }}
        className="shrink-0 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white"
        aria-label="Save & Close"
        title="Save & Close"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
