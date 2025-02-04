(function () {

    /**
     * A backup reference to the native XMLHttpRequest constructor provided by the browser.
     * This variable stores the original implementation of XMLHttpRequest before any potential
     * overrides or modifications are applied to it. It can be used to restore or reference
     * the unmodified behavior of XMLHttpRequest when custom logic is applied elsewhere.
     *
     * This variable is typically useful in scenarios where XMLHttpRequest needs to be extended
     * or monkey-patched, but the original behavior needs to be preserved for fallback or debugging.
     *
     * @type {XMLHttpRequest}
     */
    const originalXHR = window.XMLHttpRequest;


    /**
     * The XMLHttpRequest object is used to interact with servers. It provides an easy way to retrieve data from URLs
     * without having to do a full page refresh. This makes it a cornerstone of AJAX (Asynchronous JavaScript and XML).
     *
     * Key Features:
     * - Supports both synchronous and asynchronous requests.
     * - Can retrieve any type of data, including XML, JSON, HTML, and plain text.
     * - Can send data to a server and retrieve a response.
     *
     * Properties:
     * - readyState: Returns the state of the XMLHttpRequest (0: UNSENT, 1: OPENED, 2: HEADERS_RECEIVED, 3: LOADING, 4: DONE).
     * - response: Returns the response received from the server (can be ArrayBuffer, Blob, Document, JSON object, or string).
     * - responseText: Returns the response as a string.
     * - responseType: Defines the type of data expected from the server ('', 'text', 'json', 'document', 'blob', etc.).
     * - responseXML: Returns the server's response as an XML Document object (assuming the response is well-formed XML).
     * - status: Returns the HTTP status code of the response (e.g., 200 for "OK").
     * - statusText: Returns the HTTP status message (e.g., "OK" or "Not Found").
     * - timeout: The time in milliseconds a request can take before being automatically terminated.
     * - withCredentials: Indicates whether or not cross-site Access-Control requests should be made using credentials.
     *
     * Methods:
     * - open(method, url, async, user, password): Initializes a new request or reinitializes an existing one.
     * - send(body): Sends the request to the server, optionally including a request body.
     * - setRequestHeader(name, value): Sets the value of an HTTP request header.
     * - getResponseHeader(header): Returns the string of the requested header from the response.
     * - getAllResponseHeaders(): Returns all the response headers as a string.
     * - abort(): Aborts the request if it has already been sent.
     *
     * Events:
     * - onreadystatechange: Fired whenever the readyState property changes.
     * - onload: Fired when the request is completed successfully.
     * - onerror: Fired when the request fails.
     * - ontimeout: Fired when the request times out.
     * - onprogress: Fired periodically as the downloading progresses.
     * - onabort: Fired when the request has been aborted.
     *
     * Compatibility:
     * - Widely supported in most modern browsers, with some differences in behavior between them.
     * - Works in a variety of environments, including web browsers and some Node.js libraries.
     */
    window.XMLHttpRequest = class extends originalXHR {
        constructor() {
            super();
            this.addEventListener("readystatechange", function () {
                if (this.readyState === 4 && this.responseText.includes('"finish_reason":"content_filter"')) {
                    console.warn("🚨 Censorship detected in XHR response!");
                    window.postMessage({
                        type: "DEEPSEEK_CENSORSHIP",
                        content: this.responseText
                    }, "*");
                }
            });
        }
    };


    /**
     * A reference to the native `fetch` method from the `window` object.
     *
     * This variable holds the original implementation of the `fetch` function,
     * allowing it to be used or restored if the global `fetch` method is overridden or modified.
     *
     * Generally utilized in scenarios where custom wrappers or polyfills are applied,
     * but access to the unaltered `fetch` is still required.
     *
     * @type {Function}
     */
    const originalFetch = window.fetch;


    /**
     * The global `fetch` method is used to make network requests. It provides a
     * modern, promise-based interface to retrieve resources, such as files, API
     * endpoints, or data over HTTP.
     *
     * The `fetch` method initiates the request and returns a Promise that resolves
     * to the `Response` object representing the response to the request. The
     * response may contain the resource data or error details, depending on the
     * outcome of the request.
     *
     * Key Features:
     * - Supports HTTP methods like GET, POST, PUT, DELETE, and more.
     * - Allows custom request headers to be set.
     * - Works with various types of payloads, including JSON, text, and FormData.
     * - Provides streaming responses for large datasets or files.
     *
     * Limitations:
     * - Does not throw an error for HTTP response statuses like 404 or 500. Instead,
     *   you must manually check the `Response.ok` property to handle such cases.
     * - Requires handling of network errors (e.g., DNS failure) via promise rejection.
     *
     * @param {string} input - The resource URL to fetch.
     * @param {Object} [init] - An optional configuration object with settings like
     * request method, headers, body, and other options.
     * @returns {Promise<Response>} A Promise that resolves with the `Response` object
     * once the request is completed.
     *
     * Note: This function is available natively in modern browsers and may require
     * polyfills in older environments.
     */
    window.fetch = async function (...args) {
        const response = await originalFetch(...args);
        const clonedResponse = response.clone();
        try {
            const text = await clonedResponse.text();
            if (text.includes('"finish_reason":"content_filter"')) {
                console.warn("🚨 Censorship detected in Fetch response!");
                window.postMessage({
                    type: "DEEPSEEK_CENSORSHIP",
                    content: text
                }, "*");
            }
        } catch (err) {
            console.error("❌ Fetch response error:", err);
        }
        return response;
    };

    console.log("✅ DeepSeek AJAX & Fetch interception activated!");
})();
