(() => {
  "use strict";

  const spread = document.querySelector("[data-book-spread]");
  const leftPage = document.querySelector("[data-book-page='left']");
  const rightPage = document.querySelector("[data-book-page='right']");
  const previousButton = document.querySelector("[data-page-previous]");
  const nextButton = document.querySelector("[data-page-next]");

  if (!spread || !leftPage || !rightPage || !previousButton || !nextButton) return;

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
    const turn = activeTurn;
    activeTurn = null;
    turn.animations.forEach((animation) => animation.cancel());
    try {
      turn.rollback();
    } finally {
      spread.classList.remove("is-page-turning");
      turn.layer.remove();
    }
  };

  const finishTurn = (prepared) => {
    if (prepared.token !== turnToken || activeTurn?.layer !== prepared.layer) return;
    activeTurn = null;
    try {
      prepared.commit();
    } finally {
      spread.classList.remove("is-page-turning");
      prepared.layer.remove();
    }
  };

  const sourceForDirection = (direction) => {
    if (!effectiveSpread()) return leftPage;
    return direction < 0 ? leftPage : rightPage;
  };

  const playPreparedTurn = (prepared) => {
    if (!prepared.layer.isConnected || prepared.token !== turnToken || activeTurn?.layer !== prepared.layer) return;

    const directionSign = prepared.direction < 0 ? 1 : -1;
    const duration = 1020;

    const sheetAnimation = prepared.sheet.animate([
      {
        offset: 0,
        transform: "translateZ(0) rotateY(0deg) skewY(0deg) scaleX(1)",
        filter: "drop-shadow(0 0 0 rgba(0,0,0,0))"
      },
      {
        offset: 0.12,
        transform: `translateZ(4px) rotateY(${directionSign * 5}deg) skewY(${directionSign * .5}deg) scaleX(.999)`,
        filter: "drop-shadow(0 4px 6px rgba(0,0,0,.06))"
      },
      {
        offset: 0.28,
        transform: `translateZ(12px) rotateY(${directionSign * 20}deg) skewY(${directionSign * 1.1}deg) scaleX(.994)`,
        filter: "drop-shadow(0 8px 12px rgba(0,0,0,.11))"
      },
      {
        offset: 0.47,
        transform: `translateZ(24px) rotateY(${directionSign * 54}deg) skewY(${directionSign * 1.5}deg) scaleX(.986)`,
        filter: "drop-shadow(0 14px 20px rgba(0,0,0,.18))"
      },
      {
        offset: 0.63,
        transform: `translateZ(32px) rotateY(${directionSign * 92}deg) skewY(${directionSign * .7}deg) scaleX(.98)`,
        filter: "drop-shadow(0 17px 24px rgba(0,0,0,.21))"
      },
      {
        offset: 0.79,
        transform: `translateZ(23px) rotateY(${directionSign * 130}deg) skewY(${directionSign * -.45}deg) scaleX(.987)`,
        filter: "drop-shadow(0 12px 17px rgba(0,0,0,.15))"
      },
      {
        offset: 0.92,
        transform: `translateZ(10px) rotateY(${directionSign * 160}deg) skewY(${directionSign * -.2}deg) scaleX(.996)`,
        filter: "drop-shadow(0 6px 9px rgba(0,0,0,.08))"
      },
      {
        offset: 1,
        transform: `translateZ(0) rotateY(${directionSign * 180}deg) skewY(0deg) scaleX(1)`,
        filter: "drop-shadow(0 0 0 rgba(0,0,0,0))"
      }
    ], {
      duration,
      easing: "cubic-bezier(.22,.08,.18,1)",
      fill: "forwards"
    });

    const frontAnimation = prepared.front.animate([
      { offset: 0, filter: "brightness(1)" },
      { offset: 0.25, filter: "brightness(1.025)" },
      { offset: 0.52, filter: "brightness(.99)" },
      { offset: 0.68, filter: "brightness(.9)" },
      { offset: 1, filter: "brightness(.88)" }
    ], {
      duration,
      easing: "ease-out",
      fill: "forwards"
    });

    const backAnimation = prepared.back.animate([
      { offset: 0, filter: "brightness(.8)" },
      { offset: 0.55, filter: "brightness(.84)" },
      { offset: 0.72, filter: "brightness(.91)" },
      { offset: 0.9, filter: "brightness(.98)" },
      { offset: 1, filter: "brightness(1)" }
    ], {
      duration,
      easing: "ease-out",
      fill: "forwards"
    });

    const edgeAnimation = prepared.edge.animate([
      { offset: 0, transform: "translateZ(2px) rotateY(0deg) scaleX(.22)", opacity: 0, filter: "brightness(1)" },
      { offset: 0.08, transform: `translateZ(5px) rotateY(${directionSign * 8}deg) scaleX(.42)`, opacity: .42, filter: "brightness(1.03)" },
      { offset: 0.22, transform: `translateZ(10px) rotateY(${directionSign * 16}deg) scaleX(.68)`, opacity: .76, filter: "brightness(1.06)" },
      { offset: 0.43, transform: `translateZ(18px) rotateY(${directionSign * 24}deg) scaleX(.94)`, opacity: .94, filter: "brightness(1.08)" },
      { offset: 0.62, transform: `translateZ(22px) rotateY(${directionSign * 18}deg) scaleX(1.06)`, opacity: .9, filter: "brightness(.98)" },
      { offset: 0.79, transform: `translateZ(15px) rotateY(${directionSign * 10}deg) scaleX(.82)`, opacity: .64, filter: "brightness(.93)" },
      { offset: 0.93, transform: `translateZ(7px) rotateY(${directionSign * 4}deg) scaleX(.46)`, opacity: .28, filter: "brightness(.91)" },
      { offset: 1, transform: "translateZ(2px) rotateY(0deg) scaleX(.24)", opacity: 0, filter: "brightness(.91)" }
    ], {
      duration,
      easing: "cubic-bezier(.2,.08,.18,1)",
      fill: "forwards"
    });

    const animations = [sheetAnimation, frontAnimation, backAnimation, edgeAnimation];
    activeTurn.animations = animations;

    Promise.all(animations.map((animation) => animation.finished))
      .then(() => finishTurn(prepared))
      .catch(() => {});

    window.setTimeout(() => {
      finishTurn(prepared);
    }, duration + 180);
  };

  const prepareTurn = ({ direction, prepare, rollback, commit }) => {
    if (reducedMotion.matches || spread.classList.contains("continuous")) return false;
    if (direction < 0 && previousButton.disabled) return false;
    if (direction > 0 && nextButton.disabled) return false;

    const source = sourceForDirection(direction);
    if (!source || source.classList.contains("is-empty")) return false;
    if (typeof source.animate !== "function") return false;

    const token = ++turnToken;
    const sourceRect = source.getBoundingClientRect();
    const spreadRect = spread.getBoundingClientRect();
    const side = direction < 0 ? "left" : "right";

    const front = clonePage(source);
    let layer;
    let sheet;
    let back;
    let edge;

    try {
      back = prepare();
      if (!(back instanceof Element)) throw new TypeError("Page-turn reverse must be an element");
      back.removeAttribute("data-book-page");
      stripIds(back);
      back.classList.add("reader-page-turn-back");

      layer = document.createElement("div");
      layer.className = "reader-page-turn-layer";
      layer.dataset.turnSide = side;
      layer.setAttribute("aria-hidden", "true");
      Object.assign(layer.style, {
        left: `${sourceRect.left - spreadRect.left}px`,
        top: `${sourceRect.top - spreadRect.top}px`,
        width: `${sourceRect.width}px`,
        height: `${sourceRect.height}px`
      });

      sheet = document.createElement("div");
      sheet.className = "reader-page-turn-sheet";
      sheet.style.transformOrigin = direction < 0 ? "right center" : "left center";

      edge = document.createElement("span");
      edge.className = "reader-page-turn-edge";

      sheet.append(front, back, edge);
      layer.append(sheet);
      spread.append(layer);
      spread.classList.add("is-page-turning");
    } catch {
      layer?.remove();
      spread.classList.remove("is-page-turning");
      rollback();
      return false;
    }

    activeTurn = { layer, animations: [], rollback };

    queueMicrotask(() => {
      try {
        playPreparedTurn({
          token,
          direction,
          commit,
          layer,
          sheet,
          front,
          back,
          edge
        });
      } catch {
        finishTurn({ token, commit, layer });
      }
    });
    return true;
  };

  document.addEventListener("reader-page-turn-request", (event) => {
    const detail = event.detail || {};
    const valid = [-1, 1].includes(detail.direction) &&
      [detail.prepare, detail.rollback, detail.commit].every((callback) => typeof callback === "function");
    if (!valid) return;
    if (activeTurn || prepareTurn(detail)) event.preventDefault();
  });

  document.addEventListener("reader-page-turn-cancel", clearTurn);
  window.addEventListener("resize", clearTurn);
  wideSpread.addEventListener("change", clearTurn);
  reducedMotion.addEventListener("change", clearTurn);
})();
