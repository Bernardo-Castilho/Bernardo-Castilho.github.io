addEventListener("load", async e => {

    // when frame loads, hide spinner and listen to replies
    document.getElementById("my-frame").addEventListener("load", e => {

        // turn spinner off
        document.getElementById("spinner").classList.add("d-none");

        // listen to gpt replies
        const doc = e.target.contentWindow.document;
        doc.addEventListener("gptreplied", e => gptReplied(e));
    });

    // embed form into the iframe
    const viewUrl = "https://gpfy.io/Home/ShowForm?formId=44";
    //const viewUrl = "https://localhost:7160/Home/ShowForm?formId=44";
    const bearerToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1laWQiOiIxYWIxNDI1Ni1lZTQ5LTQzNmEtYmNkMS04ZDUyNmY1YTVjNDYiLCJuYmYiOjE2Nzg5MzUwNDMsImV4cCI6MTk5NDI5NTA0MywiaWF0IjoxNjc4OTM1MDQzLCJpc3MiOiJodHRwOi8vZ3BmeTIuY29tIiwiYXVkIjoiaHR0cDovL2dwZnkyYXVkaWVuY2UuY29tIn0.aOh7IsuApJ7KDcBikS3B0LAYqS87HeQDKtCXZ2yUmWQ";
    const localize = [{ sel: ".btn.btn-primary", text: "Gerar Artigo" }];
    const fetchCss = await fetch("./form-styles.css");
    const formCss = await fetchCss.text();
    embedGpfyFrame("my-frame", viewUrl, bearerToken, localize, formCss);
});

// update form after GPT replies
function gptReplied(e) {

    // no more requests, truncate the answer
    const doc = e.target;
    doc.getElementById("btn").disabled = true;
    const reply = doc.getElementById("reply");
    reply.textContent = reply.textContent.substr(0, 400) + "...";
    reply.classList.remove("expose");

    // autosize the iframe to fit the truncated article
    autoSizeIframe("my-frame");

    // show request form
    const form = document.getElementById("request-form");
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
    const form = document.getElementById("request-form");
    form.classList.add("d-none");

    // show message and article
    await getConfirmation("Obrigado por usar GPFY!", "Aproveite o Artigo", true);
    await sleep(600);
    const iframe = document.getElementById("my-frame");
    const doc = iframe.contentWindow.document;
    const reply = doc.getElementById("reply");
    reply.textContent = form.detail.reply;
    reply.classList.add("expose");

    // autosize the iframe to fit the whole article
    autoSizeIframe("my-frame");

    // TODO
    // save user's name and email
}

// auto-size an iframe base on its contents
function autoSizeIframe(iframeId) {
    const iframe = document.getElementById(iframeId);
    const doc = iframe.contentWindow.document;
    iframe.style.height = "";
    iframe.style.width = "";
    requestAnimationFrame(() => {
        if (doc.body.scrollHeight) {
            iframe.style.height = doc.body.scrollHeight + "px";
            iframe.style.width = doc.body.scrollWidth + "px"
        }
    });
}

// embed GPFY form in iframe
function embedGpfyFrame(iframeId, viewUrl, bearerToken, localize, ...customCss) {

    // find frame
    let iframe = document.getElementById(iframeId);
    if (!iframe) {
        throw `Frame "${iframeId}" not found`;
    }
  
    // apply custom styles and localize if requested
    if (customCss.length || (localize && localize.length)) {
      
        // hide the frame until the styles are loaded
        iframe.classList.add("d-none");
        iframe.addEventListener("load", () => {
            let doc = iframe.contentWindow.document;
  
            // apply custom styles
            if (customCss.length) {
                let style = document.createElement("style");
                style.innerHTML = customCss.join("\n");
                doc.head.appendChild(style);
            }
  
            // localize
            if (localize && localize.length) {
                localize.forEach(item => {
                    if (item.sel) {
                        let e = doc.querySelector(item.sel);
                        if (e && (e.tagName == "INPUT" || e.tagName == "TEXTAREA")) {
                            e.value = item.text;
                        } else if (e && "textContent" in e) {
                            e.textContent = item.text;
                        }
                    }
                });
            }
  
            // ready to show the frame
            iframe.classList.remove("d-none");
            autoSizeIframe("my-frame");
        }, {
            once: true, // in case iframe gets re-used
        });
    }
  
    // render frame without authorization
    if (!bearerToken) {
        iframe.setAttribute("src", viewUrl);
        return;
    }
  
    // render frame with authorization
    // note: GPFY tokens will be deducted from the account specified by the *bearerToken*
    let xhr = new XMLHttpRequest();
    xhr.open("GET", viewUrl);
    xhr.setRequestHeader("Authorization", `Bearer ${bearerToken}`);
    xhr.responseType = "blob";
  
    // show the frame when ready
    xhr.onreadystatechange = () => {
        if (xhr.readyState === xhr.DONE && xhr.status === 200) {
            iframe.src = URL.createObjectURL(xhr.response);
        }
    };
    xhr.send();
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
