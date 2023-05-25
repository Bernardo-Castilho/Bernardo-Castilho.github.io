Running Chrome without CORS:
"C:\Program Files\Google\Chrome\Application\chrome.exe" --user-data-dir="C://chrome-dev-disabled-security" --disable-web-security --disable-site-isolation-trials

code: 13
details: []
message: "We were unable to process your request. If the problem persists, please contact us at support@pinecone.io"

* to github
* optimize
* default namespace ()
* make it work!!!!

* clean up code, UI

* query
- deploy

- more sheet comments
- namespace/filter
    use namespaces to combine tables with speed and flexibility (["", "Avel"] or ["", "Genebra"])
    use filters when needed (scenario?)
- add PineconeInfo member to Persona/Form classes (string/json):

    // define pinecone index to use
    .index["gpfy"]
    .project["9be7a5c"]
    .environment["us-west4-gcp-free"]
    .key["1812e423-2285-47c9-9acb-653731fbde0e"]

    // narrow down with namespaces and filters
    .namespaces: [""] default, could also be [ "", "Genebra" ], etc
    .filter: [""] default, could be any pinecone filter expression

- make chats and forms use the PineconeInfo (look at Guilherme's code)

- check Google's dialog flow
    https://cloud.google.com/dialogflow/es/docs/reference/rest/v2-overview