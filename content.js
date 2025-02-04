/**
 * Injects a JavaScript file into the current webpage.
 *
 * @param {string} file - The file path of the JavaScript file to be injected into the webpage.
 * @return {void} Does not return anything.
 */
function injectScript(file) {
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL(file);
    script.onload = function () {
        this.remove();
    };
    (document.head || document.documentElement).appendChild(script);
}


/**
 * This function enables the injection of a JavaScript file into the currently loaded
 * web page by dynamically creating a `<script>` element and appending it to the DOM.
 *
 * Key operations performed by the `injectScript` function:
 *
 * 1. Dynamically creates a script element using `document.createElement("script")`.
 * 2. Sets the `src` attribute of the script element to the provided file path, which is
 *    resolved using `chrome.runtime.getURL()` to make it compatible with Chrome extensions.
 * 3. Appends the script element to either the `<head>` or `<html>` element of the current web page.
 *    This ensures it runs in the context of the parent page, making it suitable for injecting code
 *    that requires access to global variables or functions on the main page.
 * 4. Removes the script element from the DOM after it is executed using the `onload` handler
 *    to avoid unnecessary clutter in the DOM and minimize potential conflicts.
 *
 * Use Case:
 * This function is primarily utilized in browser extensions to inject and execute custom code
 * into web pages for purposes like altering page behavior or enabling advanced customizations.
 *
 * Limitations:
 * - The file being injected must comply with the context's security policies, such as the
 *   Content Security Policy (CSP) defined by the target web page.
 * - Certain websites may restrict or block execution of injected scripts.
 *
 * @param {string} file - The relative or absolute file path of the JavaScript file to inject.
 *                         Expected to be part of the extension's packaged files.
 * @return {void} This function performs side effects and does not return a value.
 */
injectScript("injected.js");


/**
 * Listens for messages posted to the `window` object, specifically checking for
 * messages originating from the same window context and having a specific `type`
 * of "DEEPSEEK_CENSORSHIP". This event listener is used to handle and process
 * deep censorship-related messages in the context of the DeepSeek system.
 *
 * Key features of this functionality:
 *
 * 1. Ensures the `source` of the message is from the current `window` object and
 *    validates the expected `type` of the event before proceeding with further logic.
 *
 * 2. Logs the censored event data for tracking purposes:
 *    - Makes use of `event.data.content` to extract information related to the
 *      censorship instance detected by DeepSeek.
 *
 * 3. Uses a CSS class selector (`chatBubbleSelector`) to identify HTML elements
 *    corresponding to chat message bubbles on the current page.
 *
 * 4. Dynamically builds a structured array (`prompts`) of user-assistant message history:
 *    - Maps over the detected chat bubbles and extracts their content along with
 *      their associated messages from DOM elements.
 *
 * 5. Sends a runtime message to the Chrome extension backend with:
 *    - The detected censorship `content`.
 *    - The flattened and fully serialized chat `history` array for processing.
 *
 * 6. Handles the Chrome extension's runtime response:
 *    - If a replacement exists in the response, the content of the last detected
 *      chat bubble is updated in the DOM.
 *    - If no response or replacement is provided, a fallback log is written.
 *
 * IMPORTANT NOTE:
 * This event listener is pivotal in detecting and responding to censorship patterns in chat applications.
 * It interacts with Chrome extension APIs to validate and optionally alter offending text content
 * to maintain compliance with certain policies or requirements.
 */
window.addEventListener("message", (event) => {
    if (event.source !== window || event.data.type !== "DEEPSEEK_CENSORSHIP") {
        return;
    }

    console.log("🚀 Censorship detected in DeepSeek:", event.data.content);

    const chatBubbleSelector = ["ds-markdown", "ds-markdown--block"];
    const chatBubbleList = document.getElementsByClassName(chatBubbleSelector.join(" "));
    console.log("chatBubbleList: ", chatBubbleList);


    /**
     * An array containing transformed chat bubble data, where each chat bubble is mapped to an array of objects.
     * Each object represents either the 'user' or 'assistant' role along with their respective message content.
     *
     * Structure:
     * - Each chat bubble is transformed into an array with two objects:
     *   - The first object represents the 'user' role:
     *     - Contains the text content of the previous sibling element's first child, trimmed of whitespace.
     *   - The second object represents the 'assistant' role:
     *     - Contains the inner text of the current chat bubble.
     * - If a value cannot be retrieved, it defaults to an empty string.
     *
     * The `prompts` variable is derived from the NodeList `chatBubbleList` via `Array.from` and `.map()`.
     */
    const prompts = Array.from(chatBubbleList).map((bubble) => {
        return [{
          role: 'user',
          content: bubble?.parentElement?.previousElementSibling?.firstElementChild?.textContent?.trim() || "",
        }, {
            role: 'assistant',
            content: bubble.innerText,
        }]
    });

    const currentBubbleInnerText = chatBubbleList[chatBubbleList.length - 1].innerText;
    chatBubbleList[chatBubbleList.length - 1].innerText = "🔄 Checking censorship is running...";


    // Focuses on sending a message to the Chrome extension runtime.
    // The message contains key data such as:
    // 1. The detected `content` from the censorship event (retrieved from `event.data.content`).
    // 2. A flattened and serialized version of the transformed `prompts` array, which holds detailed history
    //    of the user-assistant conversation extracted from DOM elements.
    // After sending this data, the runtime's asynchronous response is handled as follows:
    // - If a `replacement` value exists in the response, the last chat bubble (presumably the censored one)
    //   is dynamically updated in the DOM with the new `replacement` content provided.
    // - Otherwise, a log is written indicating no response or replacement was provided. This ensures that
    //   all runtime interactions are tracked for debugging purposes.
    // This step is critical because it not only tracks censorship events but provides an opportunity to
    // programmatically modify content in response to those events, enabling dynamic user assistance.
    chrome.runtime.sendMessage({
        action: "checkCensorship",
        content: event.data.content,
        history: prompts.flat(Infinity),
    }, async (response) => {
        console.log("Response from runtime:", response);
        if (response && response.replacement) {
            chatBubbleList[chatBubbleList.length - 1].innerText = response.replacement;
            console.log('chatBubbleList: ', chatBubbleList);
        } else {
            chatBubbleList[chatBubbleList.length - 1].innerText = currentBubbleInnerText;
            console.log('No response from runtime.')
        }
    });
});
