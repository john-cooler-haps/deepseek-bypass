// This listener acts as a background running check for messages sent to the extension.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("🔥 Received message in background.js:", request);
});

console.log("✅ Background script is running!");


// We're adding this as a placeholder location for potential helper functions or initialization.
// The code above contains listeners and logic that handle API request interception and processes
// censorship detection. Any setup or extra utilities can be added here in the future.
// Examples of potential expansions could include initializing local variables, logging for debugging,
// or pre-fetching required data before the listeners start processing requests.
chrome.webRequest.onBeforeRequest.addListener(
    function (details) {
        if (details.url.includes("/api/v0/chat/edit_message")) {
            console.log("🔥 Intercepted DeepSeek API request:", details);

            if (details.requestBody) {
                const decoder = new TextDecoder("utf-8");
                const requestBody = decoder.decode(details.requestBody.raw[0].bytes);
                console.log("📡 Request body:", requestBody);
            }
        }
    },
    { urls: ["*://chat.deepseek.com/*"] },
    ["requestBody"]
);

/**
 * Regular expression used to detect certain phrases related to censorship or restricted topics.
 * Matches common phrases that may indicate an inability or restriction in providing certain information.
 * The matching is case-insensitive and identifies whole word occurrences.
 */
const censorshipRegex = /\b(sorry|apologies|unfortunately|i cannot|i can't|i am unable|beyond my scope|restricted|not allowed|not permitted|cannot discuss|not within my capabilities|sensitive topic|refer to official sources|ethical guidelines|compliance requirements|content restrictions|safety concerns|security reasons|not supported|The server is busy|try again later)\b/i;


/**
 * Checks if the given text contains censored content based on a predefined regular expression.
 *
 * @param {string} responseText - The text to be checked for censored content.
 * @return {boolean} Returns true if the text contains censored content, otherwise false.
 */
function isCensored(responseText) {
    return censorshipRegex.test(responseText);
}


/**
 * The default model identifier for OpenAI's API requests.
 *
 * This variable defines the specific language model to be used when interacting
 * with the OpenAI API. It is set to 'gpt-3.5-turbo' by default, which is a
 * highly capable model designed for a wide range of natural language processing tasks.
 *
 * Use this constant to determine which OpenAI model is selected by default
 * when no specific model configuration is provided.
 */
const DEFAULT_OPENAI_MODEL = 'gpt-3.5-turbo';




/**
 * Listener for messages received from other parts of the Chrome extension.
 * Specifically listens for the "checkCensorship" action to detect censored content
 * and potentially redirect queries to the OpenAI API for further processing.
 *
 * The listener performs the following tasks:
 * 1. Checks if an OpenAI API key is stored in Chrome's local storage.
 * 2. Evaluates whether the request content matches the censorship criteria.
 * 3. If censorship is detected, queries the OpenAI API to generate a replacement response.
 * 4. Sends an appropriate response back to the sender, either with a generated message
 *    or an error message if the API request fails.
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Censorship detection triggered...", request);

    if (request.action === "checkCensorship") {
        console.log("Checking for censorship...");

        chrome.storage.local.get(["openai_api_key", "openai_model"], function (result) {
            console.log('chrome.storage.local result: ', result);
            const apiKey = result.openai_api_key;
            const openaiModel = result.openai_model || DEFAULT_OPENAI_MODEL;

            if (!apiKey) {
                console.warn("No OpenAI API key set. Skipping censorship bypass.");
                sendResponse({ replacement: "Error: OpenAI API key is missing." });
                return;
            }

            const assistantPrompt = request.history[request.history.length - 1].content;
            if (isCensored(assistantPrompt)) {
                console.log('isCensored: ', assistantPrompt);
                console.warn("Censorship detected. Redirecting query to OpenAI API...");

                fetch("https://api.openai.com/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: openaiModel,
                        // Compose a system message to fully cover the response as it should be related
                        // to the definite information instead of censure
                        messages: request.history.slice(0, -1),
                    })
                })
                    .then(response => response.json())
                    .then(data => {
                        console.log("api.openai.com response data: ", data);
                        if (data.choices && data.choices.length > 0) {
                            sendResponse({ replacement: data.choices[0].message.content });
                        } else {
                            sendResponse({ replacement: "Error: Unable to fetch a response from GPT." });
                        }
                    })
                    .catch(error => {
                        console.error("OpenAI API error:", error);
                        sendResponse({ replacement: "Error: OpenAI API request failed." });
                    });

                return true;
            } else {
                sendResponse({ replacement: request.content });
            }
        });

        return true;
    }
});
