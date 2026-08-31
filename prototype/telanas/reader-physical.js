(() => {
  "use strict";

  const spread = document.querySelector("[data-book-spread]");
  const stage = document.querySelector(".book-stage");
  const leftPage = document.querySelector("[data-book-page='left']");
  const rightPage = document.querySelector("[data-book-page='right']");
  const previousButton = document.querySelector("[data-page-previous]");
  const nextButton = document.querySelector("[data-page-next]");
  const positionLabel = document.querySelector("[data-reader-position]");

  if (!spread || !stage || !leftPage || !rightPage || !previousButton || !nextButton || !positionLabel) return;

  const presentationStorageKey = "library-reader-presentation-v1";
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const wideSpread = window.matchMedia("(min-width: 981px)");

  const effectiveSpread = () => (
    !spread.classList.contains("single") && !spread.classList.contains("continuous") && wideSpread.matches
  );

  const transitionMode = () => {
    if (reducedMotion.matches) return "none";
    try {
      const saved = JSON.parse(localStorage.getItem(presentationStorageKey) || "null");
      return ["page-turn", "fade", "none"].includes(saved?.transition) ? saved.transition : "page-turn";
    } catch {
      return "page-turn";
    }
  };

  const stackDepth = (pageCount) => {
    if (pageCount <= 0) return 0;
    return Math.min(11, 1.5 + Math.log2(pageCount + 1) * 2.15);
  };

  const setStack = (side, pageCount) => {
    const depth = stackDepth(pageCount);
    spread.style.setProperty(`--reader-${side}-stack-depth`, `${depth.toFixed(2)}px`);
    spread.style.setProperty(`--reader-${side}-stack-drop`, `${(depth * 0.58).toFixed(2)}px`);
    spread.style.setProperty(`--reader-${side}-stack-opacity`, pageCount > 0 ? "0.88" : "0");
  };

  const updatePageStacks = () => {
    if (spread.classList.contains("continuous")) {
      setStack("left", 0);
      setStack("right", 0);
      return;
    }

    const text = positionLabel.textContent || "";
    const pageText = text.split("·").pop() || text;
    const numbers = (pageText.match(/\d+/g) || []).map(Number);

    let firstVisible;
    let lastVisible;
    let total;

    if (numbers.length >= 3) {
      [firstVisible, lastVisible, total] = numbers.slice(-3);
    } else if (numbers.length === 2) {
      [firstVisible, total] = numbers;
      lastVisible = firstVisible;
    } else {
      setStack("left", 0);
      setStack("right", 0);
      return;
    }

    setStack("left", Math.max(0, firstVisible - 1));
    setStack("right", Math.max(0, total - lastVisible));
  };

  const clearPaperTurns = () => {
    document.querySelectorAll(".reader-paper-turn-overlay").forEach((node) => node.remove());
  };

  const preparePaperTurn = (direction) => {
    if (transitionMode() !== "page-turn" || spread.classList.contains("continuous")) return;

    const source = effectiveSpread() ? (direction < 0 ? leftPage : rightPage) : leftPage;
    if (!source || source.classList.contains("is-empty")) return;

    clearPaperTurns();

    const overlay = source.cloneNode(true);
    overlay.classList.add("reader-paper-turn-overlay");
    overlay.dataset.turnDirection = direction < 0 ? "backward" : "forward";
    overlay.setAttribute("aria-hidden", "true");
    overlay.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));

    const curl = document.createElement("span");
    curl.className = "reader-paper-curl";
    overlay.append(curl);

    const spreadRect = spread.getBoundingClientRect();
    const sourceRect = source.getBoundingClientRect();
    Object.assign(overlay.style, {
      left: `${sourceRect.left - spreadRect.left}px`,
      top: `${sourceRect.top - spreadRect.top}px`,
      width: `${sourceRect.width}px`,
      height: `${sourceRect.height}px`,
      transformOrigin: direction < 0 ? "right center" : "left center"
    });
    spread.append(overlay);

    const sign = direction < 0 ? 1 : -1;
    const outerRadius = direction < 0 ? "18px 2px 2px 18px" : "2px 18px 18px 2px";

    requestAnimationFrame(() => {
      const animation = overlay.animate([
        {
          offset: 0,
          transform: "perspective(1900px) translateZ(0) rotateY(0deg) skewY(0deg) scaleX(1)",
          filter: "brightness(1)",
          opacity: 1,
          borderRadius: "2px",
          boxShadow: "0 0 0 rgba(0,0,0,0)"
        },
        {
          offset: 0.16,
          transform: `perspective(1900px) translateZ(7px) rotateY(${sign * 13}deg) skewY(${sign * 0.7}deg) scaleX(.992)`,
          filter: "brightness(1.03)",
          opacity: 1,
          borderRadius: outerRadius,
          boxShadow: `${sign * -5}px 8px 16px rgba(0,0,0,.12)`
        },
        {
          offset: 0.38,
          transform: `perspective(1900px) translateZ(20px) rotateY(${sign * 55}deg) skewY(${sign * 2.4}deg) scaleX(.955)`,
          filter: "brightness(1.08)",
          opacity: 0.99,
          borderRadius: outerRadius,
          boxShadow: `${sign * -15}px 18px 30px rgba(0,0,0,.25)`
        },
        {
          offset: 0.57,
          transform: `perspective(1900px) translateZ(28px) rotateY(${sign * 96}deg) skewY(${sign * -1.9}deg) scaleX(.925)`,
          filter: "brightness(.9)",
          opacity: 0.96,
          borderRadius: outerRadius,
          boxShadow: `${sign * -23}px 22px 38px rgba(0,0,0,.32)`
        },
        {
          offset: 0.78,
          transform: `perspective(1900px) translateZ(15px) rotateY(${sign * 142}deg) skewY(${sign * -0.9}deg) scaleX(.963)`,
          filter: "brightness(.82)",
          opacity: 0.72,
          borderRadius: outerRadius,
          boxShadow: `${sign * -10}px 12px 24px rgba(0,0,0,.2)`
        },
        {
          offset: 1,
          transform: `perspective(1900px) translateZ(0) rotateY(${sign * 178}deg) skewY(0deg) scaleX(.995)`,
          filter: "brightness(.78)",
          opacity: 0.04,
          borderRadius: "2px",
          boxShadow: "0 4px 10px rgba(0,0,0,.05)"
        }
      ], {
        duration: 940,
        easing: "cubic-bezier(.24,.05,.16,1)",
        fill: "forwards"
      });

      curl.animate([
        { offset: 0, transform: "translateX(0)", opacity: 0 },
        { offset: 0.18, transform: `translateX(${sign * -8}%)`, opacity: 0.22 },
        { offset: 0.48, transform: `translateX(${sign * -65}%)`, opacity: 0.68 },
        { offset: 0.7, transform: `translateX(${sign * -118}%)`, opacity: 0.48 },
        { offset: 1, transform: `translateX(${sign * -170}%)`, opacity: 0 }
      ], {
        duration: 940,
        easing: "cubic-bezier(.2,.2,.2,1)",
        fill: "forwards"
      });

      animation.finished.catch(() => undefined).finally(() => overlay.remove());
      window.setTimeout(() => overlay.remove(), 1080);
    });
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
    if (direction < 0 && !previousButton.disabled) preparePaperTurn(-1);
    if (direction > 0 && !nextButton.disabled) preparePaperTurn(1);
  }, true);

  previousButton.addEventListener("click", () => {
    if (!previousButton.disabled) preparePaperTurn(-1);
  }, true);

  nextButton.addEventListener("click", () => {
    if (!nextButton.disabled) preparePaperTurn(1);
  }, true);

  document.addEventListener("keydown", (event) => {
    if (spread.classList.contains("continuous") || event.altKey || event.ctrlKey || event.metaKey) return;
    const tag = document.activeElement?.tagName;
    if (["INPUT", "SELECT", "TEXTAREA"].includes(tag)) return;
    if (event.key === "ArrowLeft" && !previousButton.disabled) preparePaperTurn(-1);
    if (event.key === "ArrowRight" && !nextButton.disabled) preparePaperTurn(1);
  }, true);

  new MutationObserver(updatePageStacks).observe(positionLabel, {
    childList: true,
    characterData: true,
    subtree: true
  });

  new MutationObserver(updatePageStacks).observe(spread, {
    attributes: true,
    attributeFilter: ["class"]
  });

  reducedMotion.addEventListener("change", clearPaperTurns);
  updatePageStacks();
})();
