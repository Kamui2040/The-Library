(() => {
  "use strict";

  const stage = document.querySelector(".book-stage");
  const spread = document.querySelector("[data-book-spread]");
  const leftPage = document.querySelector("[data-book-page='left']");
  const rightPage = document.querySelector("[data-book-page='right']");
  const previousButton = document.querySelector("[data-page-previous]");
  const nextButton = document.querySelector("[data-page-next]");

  if (!stage || !spread || !leftPage || !rightPage || !previousButton || !nextButton) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const wideSpread = window.matchMedia("(min-width: 981px)");
  let activeTurn = null;
  let turnToken = 0;

  const effectiveSpread = () => (
    !spread.classList.contains("single") &&
    !spread.classList.contains("continuous") &&
    wideSpread.matches
  );

  const stripIds = (node) => {
    if (node.id) node.removeAttribute("id");
    node.querySelectorAll("[id]").forEach((child) => child.removeAttribute("id"));
  };

  const clonePage = (source) => {
    const clone = source.cloneNode(true);
    clone.removeAttribute("data-book-page");
    stripIds(clone);
    clone.classList.add("reader-page-turn-front");
    return clone;
  };

  const clearTurn = () => {
    turnToken += 1;
    if (!activeTurn) return;
    activeTurn.animations.forEach((animation) => animation.cancel());
    activeTurn.layer.remove();
    activeTurn = null;
  };

  const sourceForDirection = (direction) => {
    if (!effectiveSpread()) return leftPage;
    return direction < 0 ? leftPage : rightPage;
  };

  const clipFrames = (side) => side === "right"
    ? [
        "inset(0 0% 0 0)",
        "inset(0 3% 0 0)",
        "inset(0 11% 0 0)",
        "inset(0 28% 0 0)",
        "inset(0 51% 0 0)",
        "inset(0 76% 0 0)",
        "inset(0 94% 0 0)",
        "inset(0 100% 0 0)"
      ]
    : [
        "inset(0 0 0 0%)",
        "inset(0 0 0 3%)",
        "inset(0 0 0 11%)",
        "inset(0 0 0 28%)",
        "inset(0 0 0 51%)",
        "inset(0 0 0 76%)",
        "inset(0 0 0 94%)",
        "inset(0 0 0 100%)"
      ];

  const edgePositions = (side) => side === "right"
    ? ["93%", "90%", "82%", "65%", "42%", "17%", "-1%", "-7%"]
    : ["-7%", "-4%", "4%", "21%", "44%", "69%", "87%", "93%"];

  const playPreparedTurn = (prepared) => {
    if (!prepared.layer.isConnected || prepared.token !== turnToken) return;

    const rotationSign = prepared.direction < 0 ? 1 : -1;
    const clips = clipFrames(prepared.side);
    const positions = edgePositions(prepared.side);
    const duration = 1020;

    const sheetAnimation = prepared.sheet.animate([
      {
        offset: 0,
        transform: "translateZ(0) rotateY(0deg) skewY(0deg) scaleX(1)",
        filter: "drop-shadow(0 0 0 rgba(0,0,0,0))"
      },
      {
        offset: 0.12,
        transform: `translateZ(3px) rotateY(${rotationSign * 3}deg) skewY(${rotationSign * .35}deg) scaleX(.999)`,
        filter: "drop-shadow(0 4px 6px rgba(0,0,0,.06))"
      },
      {
        offset: 0.28,
        transform: `translateZ(10px) rotateY(${rotationSign * 12}deg) skewY(${rotationSign * 1.1}deg) scaleX(.994)`,
        filter: "drop-shadow(0 8px 12px rgba(0,0,0,.11))"
      },
      {
        offset: 0.48,
        transform: `translateZ(20px) rotateY(${rotationSign * 31}deg) skewY(${rotationSign * 1.8}deg) scaleX(.983)`,
        filter: "drop-shadow(0 13px 19px rgba(0,0,0,.17))"
      },
      {
        offset: 0.66,
        transform: `translateZ(25px) rotateY(${rotationSign * 54}deg) skewY(${rotationSign * 1.1}deg) scaleX(.969)`,
        filter: "drop-shadow(0 16px 23px rgba(0,0,0,.2))"
      },
      {
        offset: 0.82,
        transform: `translateZ(17px) rotateY(${rotationSign * 73}deg) skewY(${rotationSign * .4}deg) scaleX(.966)`,
        filter: "drop-shadow(0 11px 16px rgba(0,0,0,.14))"
      },
      {
        offset: 1,
        transform: `translateZ(5px) rotateY(${rotationSign * 88}deg) skewY(0deg) scaleX(.985)`,
        filter: "drop-shadow(0 5px 8px rgba(0,0,0,.07))"
      }
    ], {
      duration,
      easing: "cubic-bezier(.22,.08,.18,1)",
      fill: "forwards"
    });

    const frontAnimation = prepared.front.animate([
      { offset: 0, clipPath: clips[0], filter: "brightness(1)", opacity: 1 },
      { offset: 0.10, clipPath: clips[1], filter: "brightness(1.01)", opacity: 1 },
      { offset: 0.26, clipPath: clips[2], filter: "brightness(1.025)", opacity: 1 },
      { offset: 0.44, clipPath: clips[3], filter: "brightness(1.035)", opacity: 1 },
      { offset: 0.62, clipPath: clips[4], filter: "brightness(.99)", opacity: 1 },
      { offset: 0.78, clipPath: clips[5], filter: "brightness(.94)", opacity: .98 },
      { offset: 0.91, clipPath: clips[6], filter: "brightness(.9)", opacity: .72 },
      { offset: 1, clipPath: clips[7], filter: "brightness(.88)", opacity: 0 }
    ], {
      duration,
      easing: "cubic-bezier(.26,.04,.2,1)",
      fill: "forwards"
    });

    const edgeAnimation = prepared.edge.animate([
      { offset: 0, left: positions[0], transform: "translateZ(2px) scaleX(.28)", opacity: 0, filter: "brightness(1)" },
      { offset: 0.08, left: positions[1], transform: "translateZ(5px) scaleX(.42)", opacity: .44, filter: "brightness(1.03)" },
      { offset: 0.22, left: positions[2], transform: "translateZ(10px) scaleX(.64)", opacity: .78, filter: "brightness(1.06)" },
      { offset: 0.42, left: positions[3], transform: "translateZ(18px) scaleX(.92)", opacity: .94, filter: "brightness(1.08)" },
      { offset: 0.61, left: positions[4], transform: "translateZ(22px) scaleX(1.06)", opacity: .88, filter: "brightness(.98)" },
      { offset: 0.78, left: positions[5], transform: "translateZ(15px) scaleX(.86)", opacity: .68, filter: "brightness(.92)" },
      { offset: 0.91, left: positions[6], transform: "translateZ(8px) scaleX(.52)", opacity: .32, filter: "brightness(.9)" },
      { offset: 1, left: positions[7], transform: "translateZ(2px) scaleX(.3)", opacity: 0, filter: "brightness(.9)" }
    ], {
      duration,
      easing: "cubic-bezier(.2,.08,.18,1)",
      fill: "forwards"
    });

    const animations = [sheetAnimation, frontAnimation, edgeAnimation];
    activeTurn = { layer: prepared.layer, animations };

    Promise.allSettled(animations.map((animation) => animation.finished)).finally(() => {
      if (activeTurn?.layer === prepared.layer) activeTurn = null;
      prepared.layer.remove();
    });

    window.setTimeout(() => {
      if (prepared.layer.isConnected) prepared.layer.remove();
      if (activeTurn?.layer === prepared.layer) activeTurn = null;
    }, duration + 180);
  };

  const prepareTurn = (direction) => {
    if (reducedMotion.matches || spread.classList.contains("continuous")) return;
    if (direction < 0 && previousButton.disabled) return;
    if (direction > 0 && nextButton.disabled) return;

    const source = sourceForDirection(direction);
    if (!source || source.classList.contains("is-empty")) return;

    clearTurn();
    const token = turnToken;
    const sourceRect = source.getBoundingClientRect();
    const spreadRect = spread.getBoundingClientRect();
    const side = direction < 0 ? "left" : "right";

    const layer = document.createElement("div");
    layer.className = "reader-page-turn-layer";
    layer.dataset.turnSide = side;
    layer.setAttribute("aria-hidden", "true");
    Object.assign(layer.style, {
      left: `${sourceRect.left - spreadRect.left}px`,
      top: `${sourceRect.top - spreadRect.top}px`,
      width: `${sourceRect.width}px`,
      height: `${sourceRect.height}px`
    });

    const sheet = document.createElement("div");
    sheet.className = "reader-page-turn-sheet";
    sheet.style.transformOrigin = direction < 0 ? "right center" : "left center";

    const front = clonePage(source);
    const edge = document.createElement("span");
    edge.className = "reader-page-turn-edge";

    sheet.append(front, edge);
    layer.append(sheet);
    spread.append(layer);

    queueMicrotask(() => playPreparedTurn({
      token,
      direction,
      side,
      layer,
      sheet,
      front,
      edge
    }));
  };

  const isInteractiveTarget = (target) => (
    target instanceof Element && Boolean(
      target.closest("button, a, input, select, textarea, summary, label, [contenteditable='true']")
    )
  );

  const directionForPageClick = (event) => {
    if (spread.classList.contains("continuous") || event.button !== 0 || isInteractiveTarget(event.target)) return 0;

    const selection = window.getSelection();
    if (selection && !selection.isCollapsed && selection.toString().trim()) return 0;

    if (effectiveSpread()) {
      if (leftPage.contains(event.target)) return -1;
      if (rightPage.contains(event.target)) return 1;
      return 0;
    }

    const rect = leftPage.getBoundingClientRect();
    if (event.clientY < rect.top || event.clientY > rect.bottom) return 0;
    return event.clientX < rect.left + rect.width / 2 ? -1 : 1;
  };

  stage.addEventListener("click", (event) => {
    const direction = directionForPageClick(event);
    if (direction) prepareTurn(direction);
  }, true);

  previousButton.addEventListener("click", () => prepareTurn(-1), true);
  nextButton.addEventListener("click", () => prepareTurn(1), true);

  document.addEventListener("keydown", (event) => {
    if (spread.classList.contains("continuous") || event.altKey || event.ctrlKey || event.metaKey) return;
    const tag = document.activeElement?.tagName;
    if (["INPUT", "SELECT", "TEXTAREA"].includes(tag)) return;
    if (event.key === "ArrowLeft") prepareTurn(-1);
    if (event.key === "ArrowRight") prepareTurn(1);
  }, true);

  document.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("[data-layout-button], [data-language-select]")) {
      clearTurn();
    }
  }, true);

  window.addEventListener("resize", clearTurn);
  window.addEventListener("library-language-change", clearTurn);
  reducedMotion.addEventListener("change", clearTurn);
})();
