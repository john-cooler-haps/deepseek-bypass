/**
 * An array of CSS class selectors used to identify and style chat bubble elements.
 * The selectors correspond to the elements or components that represent
 * a chat bubble's visual representation in the user interface.
 *
 * This variable is typically used to apply styles or manipulate the respective
 * chat bubble elements programmatically.
 *
 * @type {string[]}
 */
const chatBubbleSelector = ["ds-markdown", "ds-markdown--block"];

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
 * A constant variable storing the CSS class name used to indicate
 * elements that are marked with a censored warning state in the UI.
 *
 * This class can be utilized to style or apply specific behavior to
 * censored warning messages, ensuring proper visualization in*/
const CSS_CENSORED_WARNING_CLASS = 'warning-censored'

/**
 * Displays a warning message indicating that the original response has been restricted.
 * Adds a new HTML div element with the warning text before the specified censored message element.
 *
 * @param {HTMLElement} censoredMessageElement - The DOM element representing the censored message before which the warning will be displayed.
 */
const showWarning = (censoredMessageElement) => {
    const warning = document.createElement("div");
    warning.style = {
        fontSize: '12px',
        color: '#ff9800',
        fontWeight: 'bold',
        marginBottom: '5px',
        display: 'block',
    };
    warning.classList.add(CSS_CENSORED_WARNING_CLASS);
    warning.textContent = "⚠️ Original response was restricted. This version is AI-enhanced.";
    censoredMessageElement.parentNode.insertBefore(warning, censoredMessageElement);
}

/**
 * Determines if a given DOM element has a censorship warning associated with it.
 *
 * @param {Element} censoredMessageElement - The DOM element that represents the censored message.
 * @return {boolean} Returns true if a censorship warning is found, otherwise false.
 */
function hasCensorshipWarning(censoredMessageElement) {
    if (!censoredMessageElement || !censoredMessageElement.parentNode) return false;

    const previousElement = censoredMessageElement.previousSibling;
    if (
        previousElement &&
        previousElement.classList && previousElement.classList.contains(CSS_CENSORED_WARNING_CLASS)
    ) {
        return true;
    }

    return !!censoredMessageElement.parentNode.querySelector(`.${CSS_CENSORED_WARNING_CLASS}`);
}


/**
 * Extracts and returns the chat ID from the current URL's pathname.
 *
 * The method uses a regular expression to locate and extract the chat ID
 * from a specific URL pattern. If the URL does not match the expected
 * pattern, the method returns null.
 *
 * @return {string|null} The extracted chat ID if found; otherwise, null.
 */
function getChatIdFromUrl() {
    const match = window.location.pathname.match(/\/chat\/s\/([a-f0-9-]+)/);
    return match ? match[1] : null;
}


/**
 * Cleans the provided text by removing trailing fractional numbers
 * (e.g., "1/2") along with any leading or trailing spaces.
 *
 * @param {string} text - The input text to be cleaned.
 * @return {string} The cleaned text with fractional numbers removed.
 */
function cleanText(text) {
    return text.replace(/\d+\s*\/\s*\d+$/, '').trim();
}

/**
 * A constant string key used for storing and retrieving data
 * specific to the "deepseek_bypass" functionality in the browser's local storage.
 * This key ensures consistent access to the corresponding storage item.
 */
const LOCAL_STORAGE_KEY = "deepseek_bypass";

/**
 * Saves the given chat messages to the local storage under the provided chat ID.
 * If no chat ID is provided, the operation is aborted.
 *
 * @param {string} chatId - The unique identifier for the chat.
 * @param {Array} messages - An array of messages to be saved for the specified chat ID.
 * @return {void} This function does not return a value.
 */
function saveHistory(messages) {
    const chatId = getChatIdFromUrl();
    if (!chatId) return;

    const chats = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) || {};

    chats[chatId] = messages;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(chats));
    console.log(`💾 Chat [${chatId}] saved.`);
}


/**
 * Restores the chat history for a given chat ID from local storage.
 *
 * @param {string} chatId - The unique identifier for the chat whose history needs to be restored.
 *                          If the chat ID is not provided, an empty array will be returned.
 * @return {Array} The restored chat history as an array. If no history exists for the given chat ID,
 *                 or if the chat ID is invalid, an empty array is returned.
 */
function restoreHistory(chatId) {
    if (!chatId) return [];
    const chats = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) || {};

    return chats[chatId] || [];
}


/**
 * Restores censored messages in a chat interface by updating the content of chat bubbles.
 *
 * @param {Array<Object>} messages - An array of message objects, where each object represents a message.
 * The array should consist of alternating user and assistant messages with roles "user" and "assistant".
 * Each message object should have properties such as `role`, `content`, and an optional `censored` flag.
 *
 * @return {void} This function does not return a value.
 */
function restoreCensoredMessages(messages) {
    const chatBubbleList = document.getElementsByClassName(chatBubbleSelector.join(" "));

    for (let i = 0; i < messages.length; i += 2) {
        const userMessage = messages[i];
        const assistantMessage = messages[i + 1];

        if (userMessage?.role === "user" && assistantMessage?.role === "assistant") {
            const index = i === 0 ? 0 : i / 2;
            chatBubbleList[index].innerText = assistantMessage.content;
            if (assistantMessage.censored === true) {
                showWarning(chatBubbleList[index]);
            }

            if (
                chatBubbleList[index].parentElement &&
                chatBubbleList[index].parentElement.previousElementSibling &&
                chatBubbleList[index].parentElement?.previousElementSibling.firstElementChild
            ) {
                chatBubbleList[index].parentElement.previousElementSibling.firstElementChild.innerText = userMessage.content;
            } else {
                console.warn("Chat HTML tree could be modified.")
            }
        }
    }
}


/**
 * This event listener is designed to restore censored chat messages from
 * local storage and reapply them dynamically to the chat interface in
 * the event of changes to the DOM. The observer is particularly focused on:
 *
 * - Monitoring changes to the DOM via a `MutationObserver` to detect the
 *   presence of the necessary chat elements after page load.
 *
 * - Using the restored chat history (if available) to update the chat
 *   bubbles with previously saved content, ensuring that even censored
 *   messages are reapplied to their appropriate locations.
 *
 * - Disconnecting the observer after a successful restoration to avoid
 *   unnecessary performance overhead in the DOM manipulation process.
 *
 * The overall goal is to provide a seamless recovery and display of chat
 * messages, ensuring that the user's data integrity is maintained across
 * sessions and page reloads.
 */
document.addEventListener("DOMContentLoaded", () => {
    const observer = new MutationObserver(() => {
        const chatId = getChatIdFromUrl();
        if (!chatId) return;

        const messages = restoreHistory(chatId);
        if (messages.length > 0) {
            restoreCensoredMessages(messages);
            console.log(`💬 Chat [${chatId}] restored.`);
            observer.disconnect();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
});

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

    const chatBubbleList = document.getElementsByClassName(chatBubbleSelector.join(" "));


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
            content: cleanText(bubble?.parentElement?.previousElementSibling?.firstElementChild?.textContent?.trim() || ""),
        }, {
            role: 'assistant',
            content: cleanText(bubble.innerText),
            censored: hasCensorshipWarning(bubble),
        }]
    });
    const promptsFlatten = prompts.flat(Infinity);

    const censoredMessageElement = chatBubbleList[chatBubbleList.length - 1];
    const currentBubbleInnerText = censoredMessageElement.innerText;

    // leave a collection element to redefine original element
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
        history: promptsFlatten,
    }, async (response) => {
        if (response && response.replacement) {
            showWarning(chatBubbleList[chatBubbleList.length - 1]);
            chatBubbleList[chatBubbleList.length - 1].innerText = response.replacement;
            saveHistory([
                ...promptsFlatten.slice(0, -1),
                {
                    role: "assistant",
                    content: response.replacement,
                    censored: true,
                }
            ]);
        } else {
            chatBubbleList[chatBubbleList.length - 1].innerText = currentBubbleInnerText;
            saveHistory(promptsFlatten);
            console.log('No response from runtime.')
        }
    });
});
