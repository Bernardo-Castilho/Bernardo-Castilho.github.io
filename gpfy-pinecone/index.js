// Google Sheets constants
const SPREADSHEET_ID = "15SwYH-sgiosI6zZltUn7_DXts9AzmQ32DL7UxmiGkgU";
const URL_SHEETS = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`;
const KEY_SHEETS = "AIzaSyBHeqYkqTUwtq69Sqo1imthVVIPaBsflHQ"; // https://console.cloud.google.com/apis/credentials?project=gpfy-377117

// open AI constants
const URL_EMBEDDINGS = "https://api.openai.com/v1/embeddings";
const KEY_OPENAI = "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";

// Pinecone constants
const NDX_PC = "gpfy";
const PRJ_PC = "9be7a5c";
const ENV_PC = "us-west4-gcp-free";
const KEY_PC = "1812e423-2285-47c9-9acb-653731fbde0e";
const URL_PC = `https://${NDX_PC}-${PRJ_PC}.svc.${ENV_PC}.pinecone.io`;
const DIM_PC = 1536;
const TOP_PC = 3;
const THRESHOLD_PC = 0.5; // scores above this seems bad
const METRIC_PC = "euclidean";

// attach event handlers after loading
addEventListener("load", async e => {

    // update button state when sheet selection changes
    getEl("sheets").addEventListener("change", e => enableButtons(true));

    // update button state when query changes
    getEl("query").addEventListener("input", e => enableButtons(true));

    // perform query on enter
    getEl("query").addEventListener("keydown", e => {
        if (e.key === 'Enter') {
            const btn = getEl("btn-query");
            if (!btn.disabled) {
                btn.focus();
                btn.click();
            }
        }
    });

    // open source Sheet
    getEl("btn-open-source-sheet").addEventListener("click", async e => {
        const url = "https://docs.google.com/spreadsheets/d/15SwYH-sgiosI6zZltUn7_DXts9AzmQ32DL7UxmiGkgU/edit#gid=0";
        window.open(url, "_blank");
    });

    // get valid sheets
    getEl("btn-get-valid-sheets").addEventListener("click", async e => {
        const sheetList = getEl("sheets");
        try {
            startWork();
            const sheets = await getValidSheets();
            sheetList.sheets = sheets;
            sheetList.innerHTML = `<options>
                    ${sheets.map(s => `<option selected>${s.title}</option>`)}
                </options>`;
            log(`** Found ${sheets.length} valid sheets: ${sheets.map(s => s.title).join(', ')}`);
        } catch(error) {
            showError(error);
        }
        finally {
            endWork();
        }
    });

    // export selected sheets to json
    getEl("btn-export-json").addEventListener("click", async e => {
        try {
            startWork();
            const sheets = getSelectedSheets();
            await exportSheets(sheets, true);
            log(`** Exported ${sheets.length} valid sheets: ${sheets.map(s => s.title).join(', ')}`);
        } catch(error) {
            showError(error);
        }
        finally {
            endWork();
        }
    });
    
    // show index stats
    getEl("btn-show-stats").addEventListener("click", async e => {
        try {
            startWork();
            await showIndexStats();
        } catch(error) {
            showError(error);
        }
        finally {
            endWork();
        }
    });
        
    // clear index
    getEl("btn-delete-index").addEventListener("click", async e => {
        if (confirm("Are you sure you want to delete this index?")) {
            try {
                startWork();
                await deleteIndex();
            } catch (error) {
                showError(error);
            }
            finally {
                endWork();
            }
        }
    });
        
    // upsert sheets to Pinecone
    getEl("btn-upsert-sheets").addEventListener("click", async e => {
        try {
            startWork();
            const sheets = getSelectedSheets();
            await exportSheets(sheets, false);
            log(`** Upserted ${sheets.length} valid sheets: ${sheets.map(s => s.title).join(', ')}`);
        } catch(error) {
            showError(error);
        }
        finally {
            endWork();
        }
    });

    // query Pinecone
    getEl("btn-query").addEventListener("click", async e => {
        try {
            startWork();
            const sheets = getSelectedSheets();
            const matches = await querySheets(sheets, getEl("query").value);
            log("");
            if (matches.length == 0) {
                log(`Sorry, no good matches found...`);
            } else {
                log(`The best answer for query "${getEl("query").value}" is:`);
                log(`** ${matches[0].metadata.answer}`);
                log(`\nHere is a list of the matches with scores below ${THRESHOLD_PC}:`);
                log(`${JSON.stringify(matches, null, 2)}`);
            }
        } catch(error) {
            showError(error);
        }
        finally {
            endWork();
        }
    });

});

//#region ** utilities

function getEl(id) {
    return document.getElementById(id);
}

function startWork() {
    enableButtons(false);
    log("");
    showError("");
    document.documentElement.classList.add("working");
}

function endWork() {
    enableButtons(true);
    document.documentElement.classList.remove("working");
}

// enable/disable all buttons on the page
function enableButtons(enable) {
    document
        .querySelectorAll("button")
        .forEach(btn => btn.disabled = !enable);
    
    // export and query buttons should be enabled only if and at least one sheet is selected
    if (getSelectedSheets().length == 0) {
        getEl("btn-export-json").disabled = true;
        getEl("btn-upsert-sheets").disabled = true;
        getEl("btn-query").disabled = true;
    }

    // query button should be enabled only if we have a query
    if (getEl("query").value.length == 0) {
        getEl("btn-query").disabled = true;
    }
}

// gets a vector with all selected sheets
function getSelectedSheets() {
    const
        sheetList = getEl("sheets"),
        sheets = sheetList.sheets,
        selectedOptions = Array.from(sheetList.querySelectorAll("option:checked")),
        selectedSheets = selectedOptions.map(o => sheets[o.index]);
    return selectedSheets;
}

// log a message on the main page
function log(msg, replaceLastLine) {
    const logEl = getEl("log")
    if (!msg) {
        logEl.innerText = "";
        return;
    }
    if (replaceLastLine) {
        const text = logEl.innerText;
        const lastLineIndex = text.lastIndexOf("\n");
        if (lastLineIndex > -1) {
            logEl.textContent = text.substring(0, lastLineIndex);
        }
    }
    if (logEl.textContent) {
        msg = "\n" + msg;
    }
    logEl.textContent += msg;
    if (msg) {
        console.log(msg);
    }
}

// show error on the main page
function showError(error) {
    document.getElementById("error").textContent = error;
    if (error) {
        log("");
        console.error(error);
    }
}

// gets the namespace for a sheet (anything enclosed in parentheses is the default: "")
function getNamespace(title) {
    return title.startsWith("(") && title.endsWith(")")
        ? "" // default namespace
        : title;
}

// download data object as json file
function downloadAsJson(object, fileName) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(object, null, 2)], { type: "text/plain" }));
    a.setAttribute("download", fileName);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// wait for n ms (e.g. await delay(100))
async function delay(ms) {
    return new Promise(res => setTimeout(res, ms));
}

//#endregion
//#region ** sheet methods

// gets a list of valid sheets
async function getValidSheets() {

    // get the sheet names
    log("Getting Sheet info...")
    let response = await fetch(`${URL_SHEETS}?&fields=sheets.properties&key=${KEY_SHEETS}`);
    if (!response.ok) {
        throw "Failed to get the sheets";
    }
    let json = await response.json();
    const sheets = json.sheets;
    if (!sheets) {
        throw "Failed to get the sheets";
    }

    // list of valid sheets
    const validSheets = [];

    // loop through the sheets and check each one
    log("Saving sheets...")
    for (let i = 0; i < sheets.length; i++) {
        let sheet = sheets[i].properties;
        let valid = await checkSheet(sheet);
        if (valid) {
            validSheets.push(sheet);
        }
    }

    // done
    return validSheets;
}
async function checkSheet(sheet) {

    // get all the data at once (columns A:D: id, question, answer, filter)
    log(`Loading data for Sheet [${sheet.title}]...`);
    let response = await fetch(`${URL_SHEETS}/values/'${sheet.title}'!A1:D?key=${KEY_SHEETS}`);
    if (!response.ok) {
        log(`** Skipping sheet [${sheet.title}] (no data?)`);
        return false;
    }
    let json = await response.json();
    let values = json.values;

    // check it has the columns we want in the right positions
    if (!values || !values[0].join(",").startsWith("id,question,answer,filter")) {
        log(`** Skipping sheet [${sheet.title}] (doesn't have [id,question,answer,filter] headers)`);
        return false;
    }

    // check id uniqueness
    const ids = new Set();

    // loop through the rows, check each one, calculate embeddings for the question
    for (let row = 1; row < values.length; row++) {
        log(`Checking [${sheet.title}] row ${row}/${values.length}...`, row > 1);

        // get column values for this row
        let cols = values[row];

        // unique id
        const id = cols[0];
        if (id == null) {
            log(`Missing id for row ${row} on sheet [${sheet.title}].`);
            return false;
        }
        if (ids.has(id)) {
            log(`Duplicate id for row ${row} on sheet [${sheet.title}].`);
            return false;
        }
        ids.add(id);

        // question and answer
        const question = cols[1];
        const answer = cols[2];
        if (!question || !answer) {
            log(`Missing question/answer for row ${row} on sheet [${sheet.title}].`);
            return false;
        }
    }

    // row is ok
    return true;
}

//#endregion
//#region ** Pinecone methods

// show index statistics
async function showIndexStats() {

    // verify Pinecone key
    log("Checking Pinecode key...");
    let response = await fetch(`https://controller.${ENV_PC}.pinecone.io/actions/whoami`, {
        headers: {
            "Content-Type": "application/json",
            "Api-Key": KEY_PC
        }
    });
    if (!response.ok) {
        throw "Pinecone key was refused.";
    }
    let json = await response.json();
    if (json.project_name != PRJ_PC) {
        throw "Project Name not recognized.";
    }

    // get index stats
    log("Getting index stats...");
    try {
        response = await fetch(`https://${NDX_PC}-${PRJ_PC}.svc.${ENV_PC}.pinecone.io/describe_index_stats`, {
            headers: {
                "Content-Type": "text/plain",
                "Api-Key": KEY_PC
            }
        });
    } catch {
        throw "Index not found (could be empty).";
    }
    if (!response.ok) {
        throw "Index not found (could be empty).";
    }
    json = await response.json();
        
    // done: show index stats and enable buttons
    log(`\n\n// ${NDX_PC} index stats\n${JSON.stringify(json, null, 2)}`);
}

// clear index
async function deleteIndex() {

    // clear the index
    log("Clearing old index...")
    response = await fetch(`https://controller.${ENV_PC}.pinecone.io/databases/${NDX_PC}`, {
        method: "DELETE",
        headers: {
            "Api-Key": KEY_PC
        }
    });
    //if (!response.ok) { // ignore errors here...
    //    throw "Failed to clear the index";
    //}

    // create a fresh index
    log("Creating fresh index...")
    response = await fetch(`https://controller.${ENV_PC}.pinecone.io/databases`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Api-Key": KEY_PC
        },
        body: JSON.stringify({
            name: NDX_PC,
            dimension: DIM_PC,
            metric: METRIC_PC
        })
    });
    if (!response.ok) {
        throw "Failed to create the index";
    }

    // done
    log("Index clear.");
}

// query one or more sheets
async function querySheets(sheets, query) {

    // get embedding vector for the query
    log(`Getting query vector...`);
    let response = await fetch(URL_EMBEDDINGS, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${KEY_OPENAI}`
        },
        body: JSON.stringify({
            input: query,
            model: "text-embedding-ada-002"
        })
    });
    if (!response.ok) {
        throw `Failed to get embedding vector.`;
    }

    // get embedding value
    json = await response.json();
    const data = json.data;
    if (!data || !data[0] || !data[0].embedding) {
        throw `Failed to get embedding vector.`;
    }
    const embedding = data[0].embedding;
    if (embedding.length != DIM_PC) {
        throw `Wrong vector length (is ${embedding.length}, should be ${DIM_PC}).`;
    }

    // search for the vector in all selected sheets (namespaces)
    let matches = [];
    for (let i = 0; i < sheets.length; i++) {
        log(`Querying sheet [${sheets[i].title}]...`);
        const sheetMatches = await querySheet(sheets[i], embedding);
        if (sheetMatches) {
            matches.push(...sheetMatches);
        }
    }

    // filter and sort matches by score
    matches = matches.filter(m => m.score < THRESHOLD_PC);
    matches.sort((a, b) => a.score - b.score);

    // return matches
    return matches;
}
async function querySheet(sheet, vector) {

    // get the namespace
    const namespace = getNamespace(sheet.title);

    // perform the query
    let response = await fetch(`https://${NDX_PC}-${PRJ_PC}.svc.${ENV_PC}.pinecone.io/query`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Api-Key": KEY_PC
        },
        body: JSON.stringify({
            namespace: namespace,
            topK: TOP_PC,
            //filter: see https://www.pinecone.io/docs/metadata-filtering/.,
            includeValues: false,
            includeMetadata: true,
            vector: vector
        })
    });
    if (!response.ok) {
        return null;
    }

    // add namespace to the matches
    let json = await response.json();
    const matches = json.matches;
    matches.forEach(m => m.namespace = namespace);

    // return the matches we got
    return matches;
}

//#endregion

//#region ** export methods (json/Pinecone)

// export one or more sheets to json files or upsert to Pinecone
async function exportSheets(sheets, json) {
    for (let i = 0; i < sheets.length; i++) {
        await exportSheet(sheets[i], json);
    }
}

// export or upsert one sheet to a json file or to Pinecone
async function exportSheet(sheet, exportToJson) {

    // get the data
    log(`Loading data for Sheet [${sheet.title}]...`);
    let response = await fetch(`${URL_SHEETS}/values/'${sheet.title}'!A1:D?key=${KEY_SHEETS}`);
    if (!response.ok) {
        log(`** Skipping sheet [${sheet.title}] (no data?)`);
        return false;
    }
    let json = await response.json();
    let values = json.values;

    // build vector collection
    let vectors = [];
    for (let row = 1; row < values.length; row++) {
        let cols = values[row];
            
        // get cell values for this row
        let id = cols[0];
        let question = cols[1];
        let answer = cols[2];
        let filter = cols[3];

        // calculate embeddings based on question field
        log(`Calculating embeddings for [${sheet.title}] row ${row}/${values.length}...`, row > 1);
        response = await fetch(URL_EMBEDDINGS, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${KEY_OPENAI}`
            },
            body: JSON.stringify({
                input: question,
                model: "text-embedding-ada-002"
            })
        });
        if (!response.ok) {
            return `Error calculating embeddings for row ${row} on sheet [${sheet.title}]`;
        }
    
        // get embedding value
        json = await response.json();
        const data = json.data;
        if (!data || !data[0] || !data[0].embedding) {
            return `Failed to get embeddings for row ${row} on sheet [${sheet.title}]`;
        }
        const embedding = data[0].embedding;
    
        // check embedding vector length
        if (embedding.length != DIM_PC) {
            return `Embedding has wrong length (is ${embedding.length}, should be ${DIM_PC})`;
        }
                
        // save index entry
        const vector = {
            id: id,
            values: embedding,
            metadata: {
                question: question,
                answer: answer,
                filter: filter
            }
        }
        vectors.push(vector);
    }

    // export or upsert sheet
    if (exportToJson) {

        // export sheet as json
        log(`Saving [${sheet.title}] as json...`);
        const body = {
            vectors: vectors,
            namespace: getNamespace(sheet.title)
        };
        downloadAsJson(body, sheet.title + '.json');
    } else {

        // upsert sheet to Pinecone
        log(`Upserting [${sheet.title}] to Pinecone...`);
        response = await fetch(`https://${NDX_PC}-${PRJ_PC}.svc.${ENV_PC}.pinecone.io/vectors/upsert`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Api-Key": KEY_PC
            },
            body: JSON.stringify({
                vectors: vectors,
                namespace: getNamespace(sheet.title)
            })
        });
        if (!response.ok) {
            throw `Failed to upsert [${sheet.title}]`;
        }
    }
}

//#endregion