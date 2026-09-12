(() => {
  "use strict";

  const body = document.body;
  const section = document.querySelector("[data-reader-afterword-section]");
  const tocList = document.querySelector("[data-reader-toc-list]");
  const reference = body?.dataset.readerAfterword;

  if (!body || !section || !tocList || !reference) return;

  let payload = null;

  const language = () => document.documentElement.lang === "de" ? "de" : "en";

  const localized = () => {
    const locale = language();
    return payload?.locales?.[locale] || payload?.locales?.en || null;
  };

  const ensureTocButton = () => {
    const data = localized();
    if (!data) return;

    let tocButton = tocList.querySelector("[data-reader-afterword-target]");
    if (!tocButton) {
      tocButton = document.createElement("button");
      tocButton.type = "button";
      tocButton.dataset.readerAfterwordTarget = "";
      tocButton.addEventListener("click", () => {
        section.scrollIntoView({ behavior: "smooth", block: "start" });
        history.replaceState(null, "", "#reader-afterword");
      });
      tocList.append(tocButton);
    }
    tocButton.textContent = data.heading;
  };

  const render = () => {
    const data = localized();
    if (!data) return;

    section.replaceChildren();
    section.hidden = false;

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

    section.append(inner);
    ensureTocButton();
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
  };

  new MutationObserver(() => ensureTocButton()).observe(tocList, { childList: true });
  window.addEventListener("library-language-change", render);

  load().catch(() => {
    section.hidden = true;
  });
})();
