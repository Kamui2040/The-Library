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

  const cloneFace = (source, faceClass) => {
    const clone = source.cloneNode(true);
    clone.removeAttribute("data-book-page");
    stripIds(clone);
    clone.classList.add("reader-page-turn-face", faceClass);
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

  const destinationForDirection = (direction) => {
    if (!effectiveSpread()) return leftPage;
    return direction < 0 ? rightPage : leftPage;
  };

  const nearestCorner = (source, clientY) => {
    if (!Number.isFinite(clientY)) return "bottom";
    const rect = source.getBoundingClientRect();
    return Math.abs(clientY - rect.top) < Math.abs(rect.bottom - clientY) ? "top" : "bottom";
  };

  const clipFrames = (side, corner) => {
    if (side === "right" && corner === "bottom") {
      return [
        "polygon(0 0, 100% 0, 100% 100%, 100% 100%, 0 100%)",
        "polygon(0 0, 100% 0, 100% 90%, 90% 100%, 0 100%)",
        "polygon(0 0, 100% 0, 100% 68%, 68% 100%, 0 100%)",
        "polygon(0 0, 100% 0, 100% 42%, 42% 100%, 0 100%)"
      ];
    }

    if (side === "right") {
      return [
        "polygon(0 0, 100% 0, 100% 0, 100% 100%, 0 100%)",
        "polygon(0 0, 90% 0, 100% 10%, 100% 100%, 0 100%)",
        "polygon(0 0, 68% 0, 100% 32%, 100% 100%, 0 100%)",
        "polygon(0 0, 42% 0, 100% 58%, 100% 100%, 0 100%)"
      ];
    }

    if (corner === "bottom") {
      return [
        "polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 100%)",
        "polygon(0 0, 100% 0, 100% 100%, 10% 100%, 0 90%)",
        "polygon(0 0, 100% 0, 100% 100%, 32% 100%, 0 68%)",
        "polygon(0 0, 100% 0, 100% 100%, 58% 100%, 0 42%)"
      ];
    }

    return [
      "polygon(0 0, 0 0, 100% 0, 100% 100%, 0 100%)",
      "polygon(0 10%, 10% 0, 100% 0, 100% 100%, 0 100%)",
      "polygon(0 32%, 32% 0, 100% 0, 100% 100%, 0 100%)",
      "polygon(0 58%, 58% 0, 100% 0, 100% 100%, 0 100%)"
    ];
  };

  const playPreparedTurn = (prepared) => {
    if (!prepared.layer.isConnected || prepared.token !== turnToken) return;

    const destination = destinationForDirection(prepared.direction);
    if (destination && !destination.classList.contains("is-empty")) {
      const destinationClone = destination.cloneNode(true);
      destinationClone.removeAttribute("data-book-page");
      stripIds(destinationClone);
      prepared.back.className = destinationClone.className;
      prepared.back.classList.add("reader-page-turn-face", "reader-page-turn-back");
      prepared.back.replaceChildren(...[...destinationClone.childNodes].map((node) => node.cloneNode(true)));
    }

    const rotationSign = prepared.direction < 0 ? 1 : -1;
    const cornerSign = prepared.corner === "bottom" ? 1 : -1;
    const bendSign = rotationSign * cornerSign;
    const clips = clipFrames(prepared.side, prepared.corner);
    const duration = 1120;

    const sheetAnimation = prepared.sheet.animate([
      {
        offset: 0,
        transform: "translateZ(0) rotateY(0deg) rotateZ(0deg) skewY(0deg) scaleX(1)",
        filter: "drop-shadow(0 0 0 rgba(0,0,0,0))"
      },
      {
        offset: 0.12,
        transform: `translateZ(4px) rotateY(${rotationSign * 4}deg) rotateZ(${bendSign * 0.45}deg) skewY(${bendSign * 0.7}deg) scaleX(.998)`,
        filter: "drop-shadow(0 5px 7px rgba(0,0,0,.08))"
      },
      {
        offset: 0.30,
        transform: `translateZ(16px) rotateY(${rotationSign * 26}deg) rotateZ(${bendSign * 1.1}deg) skewY(${bendSign * 2.4}deg) scaleX(.982)`,
        filter: "drop-shadow(0 10px 14px rgba(0,0,0,.16))"
      },
      {
        offset: 0.50,
        transform: `translateZ(34px) rotateY(${rotationSign * 68}deg) rotateZ(${bendSign * 0.4}deg) skewY(${bendSign * 4.5}deg) scaleX(.945)`,
        filter: "drop-shadow(0 17px 24px rgba(0,0,0,.25))"
      },
      {
        offset: 0.64,
        transform: `translateZ(38px) rotateY(${rotationSign * 104}deg) rotateZ(${bendSign * -0.7}deg) skewY(${bendSign * -3.2}deg) scaleX(.93)`,
        filter: "drop-shadow(0 20px 28px rgba(0,0,0,.27))"
      },
      {
        offset: 0.80,
        transform: `translateZ(18px) rotateY(${rotationSign * 145}deg) rotateZ(${bendSign * -0.35}deg) skewY(${bendSign * -1.2}deg) scaleX(.97)`,
        filter: "drop-shadow(0 10px 16px rgba(0,0,0,.16))"
      },
      {
        offset: 1,
        transform: `translateZ(0) rotateY(${rotationSign * 180}deg) rotateZ(0deg) skewY(0deg) scaleX(1)`,
        filter: "drop-shadow(0 0 0 rgba(0,0,0,0))"
      }
    ], {
      duration,
      easing: "cubic-bezier(.22,.08,.2,1)",
      fill: "forwards"
    });

    const frontAnimation = prepared.front.animate([
      { offset: 0, clipPath: clips[0], filter: "brightness(1)" },
      { offset: 0.10, clipPath: clips[1], filter: "brightness(1.015)" },
      { offset: 0.27, clipPath: clips[2], filter: "brightness(1.045)" },
      { offset: 0.48, clipPath: clips[3], filter: "brightness(.96)" },
      { offset: 1, clipPath: clips[3], filter: "brightness(.88)" }
    ], {
      duration,
      easing: "cubic-bezier(.3,.02,.22,1)",
      fill: "forwards"
    });

    const backAnimation = prepared.back.animate([
      { offset: 0, filter: "brightness(.78)" },
      { offset: 0.52, filter: "brightness(.84)" },
      { offset: 0.72, filter: "brightness(.96)" },
      { offset: 1, filter: "brightness(1)" }
    ], {
      duration,
      easing: "ease-out",
      fill: "forwards"
    });

    const foldAnimation = prepared.fold.animate([
      { offset: 0, opacity: 0, transform: "translateZ(2px) scale(.06) rotateZ(0deg)" },
      { offset: 0.08, opacity: 0.42, transform: `translateZ(4px) scale(.2) rotateZ(${bendSign * 4}deg)` },
      { offset: 0.24, opacity: 0.9, transform: `translateZ(10px) scale(.62) rotateZ(${bendSign * 11}deg)` },
      { offset: 0.45, opacity: 0.94, transform: `translateZ(18px) scale(1.12) rotateZ(${bendSign * 18}deg)` },
      { offset: 0.62, opacity: 0.36, transform: `translateZ(13px) scale(1.36) rotateZ(${bendSign * 10}deg)` },
      { offset: 0.76, opacity: 0, transform: `translateZ(6px) scale(1.5) rotateZ(${bendSign * 4}deg)` },
      { offset: 1, opacity: 0, transform: "translateZ(0) scale(1.5) rotateZ(0deg)" }
    ], {
      duration,
      easing: "cubic-bezier(.18,.14,.2,1)",
      fill: "forwards"
    });

    const creaseTravel = prepared.side === "right" ? -150 : 150;
    const creaseAnimation = prepared.crease.animate([
      { offset: 0, opacity: 0, transform: "translateX(0) rotate(0deg) scaleX(.4)" },
      { offset: 0.12, opacity: 0.28, transform: `translateX(${creaseTravel * 0.08}%) rotate(${bendSign * 4}deg) scaleX(.65)` },
      { offset: 0.36, opacity: 0.72, transform: `translateX(${creaseTravel * 0.48}%) rotate(${bendSign * 10}deg) scaleX(1)` },
      { offset: 0.57, opacity: 0.56, transform: `translateX(${creaseTravel * 0.9}%) rotate(${bendSign * 7}deg) scaleX(1.2)` },
      { offset: 0.72, opacity: 0, transform: `translateX(${creaseTravel}%) rotate(${bendSign * 3}deg) scaleX(1.3)` },
      { offset: 1, opacity: 0, transform: `translateX(${creaseTravel}%) rotate(0deg) scaleX(1.3)` }
    ], {
      duration,
      easing: "ease-out",
      fill: "forwards"
    });

    const animations = [sheetAnimation, frontAnimation, backAnimation, foldAnimation, creaseAnimation];
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

  const prepareTurn = (direction, clientY = Number.NaN) => {
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
    const corner = nearestCorner(source, clientY);

    const layer = document.createElement("div");
    layer.className = "reader-page-turn-layer";
    layer.dataset.turnSide = side;
    layer.dataset.turnCorner = corner;
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

    const front = cloneFace(source, "reader-page-turn-front");
    const back = document.createElement("article");
    back.className = "book-page reader-page-turn-face reader-page-turn-back";

    const fold = document.createElement("span");
    fold.className = "reader-page-turn-fold";
    const crease = document.createElement("span");
    crease.className = "reader-page-turn-crease";

    sheet.append(front, back, fold, crease);
    layer.append(sheet);
    spread.append(layer);

    queueMicrotask(() => playPreparedTurn({
      token,
      direction,
      side,
      corner,
      layer,
      sheet,
      front,
      back,
      fold,
      crease
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
    if (direction) prepareTurn(direction, event.clientY);
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
