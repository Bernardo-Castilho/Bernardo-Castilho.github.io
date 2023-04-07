// define constants
const urlGpfy = "https://gpfy.io";
//const urlGpfy = "https://localhost:7160";
const iframeId = "gpfy-frame";

// autosize an iFrame based on its contents
async function gpfyAutoSizeIframe(iframeId) {
    const gpfy = await import(`${rootUrl}/js/gpfy.js`); // import gpfy module
    gpfy.autoSizeIframe(iframeId); // auto-size the frame
}

// embed view in iframe after loading
addEventListener("load", async e => {

    // apply iframeId
    const iframe = document.querySelector("iframe");
    iframe.id = iframeId;

    // embed form in iframe
    import(`${urlGpfy}/js/gpfy.js`).then(async gpfy => {
        const css = await (await fetch("./customize/styles.css")).text();
        const loc = await (await fetch("./customize/localize.json")).json();
        gpfy.embedViewInIframe(iframeId, `${urlGpfy}/Home/ShowForm?formId=44`, null, css, loc);
    });

    // when frame loads, hide spinner and listen to replies
    iframe.addEventListener("load", e => {

        // turn spinner off
        getEl("spinner").classList.add("d-none");

        // listen to gpt replies
        const doc = e.target.contentWindow.document;
        doc.addEventListener("gptreplied", e => gptReplied(e));

    });
});

// update form after GPT replies
function gptReplied(e) {

    // no more requests, truncate the answer
    const doc = e.target;
    const btnAsk = getEl("btn-ask", doc);
    btnAsk.disabled = true;
    btnAsk.classList.add("d-none");
    const reply = getEl("reply", doc);
    reply.textContent = reply.textContent.substr(0, 400) + "...";
    reply.classList.remove("expose");

    // autosize the iframe to fit the truncated article
    gpfyAutoSizeIframe(iframeId);

    // show request form
    const form = getEl("request-form");
    form.classList.remove("d-none");
    form.focus();
    form.scrollIntoView();
    form.addEventListener("submit", e => submitRequestForm(e), {
        once: true // in case form gets re-used
    });

    // save request/reply on the request form
    form.detail = e.detail;
}

// when submitting the request form, show the article
async function submitRequestForm(e) {

    // don't submit
    e.preventDefault();

    // hide request form
    const form = getEl("request-form");
    form.classList.add("d-none");

    // show article
    await sleep(600);
    const doc = iframe.contentWindow.document;
    const reply = getEl("reply", doc);
    reply.textContent = form.detail.reply;
    reply.classList.add("expose");

    // autosize the iframe to fit the whole article
    gpfyAutoSizeIframe(iframeId);

    // save user's name and email
    const saveUrl = `${rootUrl}/api/v1/adduser`;
    const data = {
        name: getEl("nome").value,
        email: getEl("email").value,
        phoneNumber: getEl("tel").value,
        cnpj: getEl("cnpj").value,
        article: reply.textContent
    };
    const response = await fetch(saveUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data), // body data type must match "Content-Type" header
    });

    // done!
    await getConfirmation("Obrigado por usar GPFY!", "Aproveite o Artigo", true);
}

// show a confirmation dialog
function getConfirmation(msg = "Yes or No?", hdr = "Confirm", okOnly = false) {
    let dlg = document.createElement("dialog");
    dlg.classList.add("card", "p-0", "confirm-submit");
    dlg.innerHTML = `
        <div class="card-body bg-light shadow">
            <h5 class="card-title">
                ${hdr}
            </h5>
            <p class="card-text">
                ${msg}
            </p>
            <div class="d-grid gap-2 d-md-flex justify-content-md-end">
                <button class="btn btn-primary px-8" autofocus value="true">OK</button>
                ${!okOnly ? `<button class="btn btn-secondary">Cancel</button>` : ""}
            </div>
        </div>`;
    dlg.addEventListener("click", e => {
        if (e.target instanceof HTMLButtonElement) {
            dlg.returnValue = e.target.value;
            dlg.close();
            dlg.remove();
        }
    });
    document.body.appendChild(dlg);
    dlg.showModal();
    trapFocus(dlg);
    return new Promise(resolve => {
        dlg.addEventListener("close", _ => {
            requestAnimationFrame(_ => resolve(dlg.returnValue ? true : false));
        });
    });
}

// https://hidde.blog/using-javascript-to-trap-focus-in-an-element/
function trapFocus(e) {
    let focusEls = e.querySelectorAll(
        "button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href]:not([disabled])"
    );
    let firstFocusEl = focusEls[0];
    let lastFocusEl = focusEls[focusEls.length - 1];
    let KEYCODE_TAB = 9;
    e.addEventListener("keydown", e => {
        if (e.key !== "Tab" && e.keyCode !== KEYCODE_TAB) {
            return;
        }
        if (e.shiftKey) { // shift + tab
            if (document.activeElement === firstFocusEl) {
                lastFocusEl.focus();
                e.preventDefault();
            }
        } else { // tab
            if (document.activeElement === lastFocusEl) {
                firstFocusEl.focus();
                e.preventDefault();
            }
        }
    });
}

// delays execution for a few ms
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// gets an element by id
function getEl(id, doc = document) {
    return doc.getElementById(id);
}
