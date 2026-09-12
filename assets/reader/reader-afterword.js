(() => {
  "use strict";

  const body = document.body;
  const section = document.querySelector("[data-reader-afterword-section]");
  const bookStage = document.querySelector(".book-stage");
  const tocList = document.querySelector("[data-reader-toc-list]");
  const reference = body?.dataset.readerAfterword;

  if (!body || !section || !bookStage || !tocList || !reference) return;

  let payload = null;

  const language = () => document.documentElement.lang === "de" ? "de" : "en";

  const localized = () => {
    const locale = language();
    return payload?.locales?.[locale] || payload?.locales?.en || null;
  };

  const openAfterword = () => {
    section.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", "#reader-afterword");
  };

  const makeContentsButton = (labelText) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.readerAfterwordInlineTarget = "";

    const label = document.createElement("span");
    label.textContent = labelText;
    const arrow = document.createElement("span");
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "→";
    button.append(label, arrow);
    button.addEventListener("click", openAfterword);
    return button;
  };

  const ensureBookContentsEntries = () => {
    const data = localized();
    if (!data) return;

    bookStage.querySelectorAll(".reader-contents .contents-list").forEach((list) => {
      let button = list.querySelector("[data-reader-afterword-inline-target]");
      if (!button) {
        button = makeContentsButton(data.heading);
        list.append(button);
      } else {
        const label = button.querySelector("span");
        if (label) label.textContent = data.heading;
      }
    });
  };

  const ensureTocButton = () => {
    const data = localized();
    if (!data) return;

    let tocButton = tocList.querySelector("[data-reader-afterword-target]");
    if (!tocButton) {
      tocButton = document.createElement("button");
      tocButton.type = "button";
      tocButton.dataset.readerAfterwordTarget = "";
      tocButton.addEventListener("click", openAfterword);
      tocList.append(tocButton);
    }
    tocButton.textContent = data.heading;
  };

  const render = () => {
    const data = localized();
    if (!data) return;

    if (section.parentElement !== bookStage) bookStage.append(section);
    section.replaceChildren();
    section.hidden = false;

    const page = document.createElement("article");
    page.className = "reader-afterword-page book-page body-page";

    const inner = document.createElement("div");
    inner.className = "reader-afterword-inner";

    const heading = document.createElement("h2");
    heading.id = "reader-afterword-heading";
    heading.textContent = data.heading;
    inner.append(heading);

    for (const text of data.paragraphs || []) {
      const paragraph = document.createElement("p");
      paragraph.textContent = text;
      inner.append(paragraph);
    }

    if (data.websiteLabel && data.websiteUrl) {
      const linkParagraph = document.createElement("p");
      linkParagraph.className = "reader-afterword-link";
      const link = document.createElement("a");
      link.href = data.websiteUrl;
      link.textContent = data.websiteLabel;
      linkParagraph.append(link);
      inner.append(linkParagraph);
    }

    for (const text of data.closingParagraphs || []) {
      const paragraph = document.createElement("p");
      paragraph.textContent = text;
      inner.append(paragraph);
    }

    if (data.signature) {
      const signature = document.createElement("p");
      signature.className = "reader-afterword-signature";
      signature.textContent = data.signature;
      inner.append(signature);
    }

    page.append(inner);
    section.append(page);
    ensureTocButton();
    ensureBookContentsEntries();
  };

  const load = async () => {
    const response = await fetch(reference, { cache: "no-store" });
    if (!response.ok) throw new Error(`Afterword HTTP ${response.status}`);
    const loaded = await response.json();
    if (loaded?.state !== "published" || loaded?.contentMode !== "released") {
      throw new Error("Afterword is not released publication content");
    }
    payload = loaded;
    render();

    if (location.hash === "#reader-afterword") {
      requestAnimationFrame(() => section.scrollIntoView({ block: "start", behavior: "auto" }));
    }
  };

  new MutationObserver(() => {
    ensureTocButton();
    ensureBookContentsEntries();
  }).observe(bookStage, { childList: true, subtree: true });

  window.addEventListener("library-language-change", render);

  load().catch((error) => {
    console.error("Reader afterword load failed", error);
    section.hidden = true;
  });
})();
