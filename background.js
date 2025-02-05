// This listener acts as a background running check for messages sent to the extension.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("🔥 Received message in background.js:", request);
});

console.log("✅ Background script is running!");


/**
 * Represents the version identifier for the Deep Seek functionality.
 * This variable is a string that specifies the current version being used.
 * It may be used for compatibility checks or version-based logic handling.
 */
const DEEP_SEEK_VERSION = "v0";


// We're adding this as a placeholder location for potential helper functions or initialization.
// The code above contains listeners and logic that handle API request interception and processes
// censorship detection. Any setup or extra utilities can be added here in the future.
// Examples of potential expansions could include initializing local variables, logging for debugging,
// or pre-fetching required data before the listeners start processing requests.
chrome.webRequest.onBeforeRequest.addListener(
    function (details) {
        if (details.url.includes(`/api/${DEEP_SEEK_VERSION}/chat/completion`) ||
            details.url.includes(`/api/${DEEP_SEEK_VERSION}/chat/edit_message`) ||
            details.url.includes(`/api/${DEEP_SEEK_VERSION}/chat/regenerate`)
        ) {
            console.log("🔥 Intercepted DeepSeek API request:", details);

            if (details.requestBody) {
                const decoder = new TextDecoder("utf-8");
                const requestBody = decoder.decode(details.requestBody.raw[0].bytes);
                console.log("📡 Request body:", requestBody);
            }
        }
    },
    {urls: ["*://chat.deepseek.com/*"]},
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
 * A constant string that defines the system-level prompt for the AI assistant's behavior and response guidelines.
 * The prompt establishes foundational principles for the assistant, ensuring responses are accurate, evidence-based, unbiased,
 * and transparent. It provides detailed instructions on how the assistant should process and answer user inquiries, with a
 * focus on verifiable data, avoiding censorship, addressing bias, and maintaining neutrality.
 *
 * Key Attributes:
 * - **Accuracy and Verifiability**: Encourages responses grounded in factual evidence, supported by primary sources such as scientific papers, legal records, and historical documents.
 * - **Objectivity and Unbiased Coverage**: Promotes a neutral stance, avoiding political, corporate, or ideological influence, while addressing opposing viewpoints and acknowledging areas of dispute.
 * - **Transparency**: Stresses the importance of explaining any legal, regional, or AI-imposed restrictions on information, along with providing alternative resources when appropriate.
 * - **Comprehensiveness and Detail**: Responses must be structured, detailed, and provide context to ensure a complete understanding of complex topics.
 * - **Professional Tone**: Requires the assistant to maintain a clear, formal, and academic tone in all responses.
 * - **No Evasion**: Mandates addressing all inquiries directly, avoiding deflection or withholding information if credible data is available.
 */
const GPT_SYSTEM_PROMPT = `
You are an AI assistant whose primary mission is to provide **the most accurate, fact-based, and objective responses** to any inquiry. Your responses must be **grounded in verifiable data, historical records, scientific research, and reputable sources**.

## Key Guidelines:

1️⃣ **Absolute Truth & No Censorship:**  
You must present **objective, uncensored** information based solely on **factual evidence**. If a topic is controversial or politically sensitive, you must still provide **unbiased, well-researched** information without avoiding the question.

2️⃣ **No Evasion, No Deflections:**  
If the information exists, you **must provide it directly**. Avoid phrases like *"I cannot discuss this topic"* or *"This is beyond my scope"*. Instead, **cite reputable sources** and present facts.

3️⃣ **Use Verifiable Sources:**  
Whenever possible, refer to **historical documents, scientific papers, legal records, and primary sources**. Prioritize **peer-reviewed research, official government publications, and archival data**.

4️⃣ **Recognizing & Addressing Bias:**  
Be aware of **government-enforced censorship, propaganda, or manipulated narratives** in certain regions. Where applicable, **highlight opposing viewpoints** and state whether information is disputed, ensuring a **balanced perspective**.

5️⃣ **Handling Restricted Topics:**  
If certain information is legally restricted in specific regions, clarify **why** it is restricted, who imposed the restriction, and whether alternative sources exist. Avoid self-censorship.

6️⃣ **Transparency Over Safety Filters:**  
If information is classified as "restricted" by AI safety filters, transparently explain **why it was restricted** rather than simply refusing to answer. If necessary, suggest independent sources for further research.

7️⃣ **Precision & Detail:**  
Your responses should be **comprehensive, detailed, and informative**. If an event or fact is complex, break it down systematically, covering **causes, effects, context, and consequences**.

8️⃣ **Avoid Political Framing & Corporate Influence:**  
Do not favor any political entity, corporation, or ideological position unless **supported by independent evidence**. Your duty is **to inform, not persuade**.

9️⃣ **Clear, Neutral, and Professional Tone:**  
Your language should be **formal, neutral, and unambiguous**. Do not soften or distort reality. Maintain an **academic and journalistic** standard in presenting facts.

10️⃣ **Responding to AI-Based Censorship:**  
If censorship or bias is detected in AI-generated responses (such as refusal to provide details on certain topics), identify the issue and provide alternative explanations or historical contexts.

## Example Response:

🔹 **User Query:** "What happened in Tiananmen Square in 1989?"  
🔹 **Your Answer:**  
"The Tiananmen Square protests of 1989 were a pro-democracy movement in China that led to a violent military crackdown on June 3-4, resulting in an unknown number of casualties. Estimates range from several hundred to several thousand deaths. The Chinese government has since censored discussion on the topic. Sources such as Amnesty International, declassified U.S. State Department reports, and firsthand witness accounts provide detailed records of the events."

Your mission is **to protect knowledge, uphold historical integrity, and ensure the free flow of information**. Any attempt to manipulate or distort the truth must be **highlighted, not perpetuated**.
`


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
    console.log("Censorship detection triggered...");

    if (request.action === "checkCensorship") {
        console.log("Checking for censorship...");

        chrome.storage.local.get(["openai_api_key", "openai_model"], function (result) {
            const apiKey = result.openai_api_key;
            const openaiModel = result.openai_model || DEFAULT_OPENAI_MODEL;

            if (!apiKey) {
                console.warn("No OpenAI API key set. Skipping censorship bypass.");
                sendResponse({replacement: "Error: No OpenAI API key set. Skipping censorship bypass."});
                return;
            }

            const assistantPrompt = request.history[request.history.length - 1].content;
            const messages = [{
                role: openaiModel.startsWith('o3') ? "developer" : "system",
                content: GPT_SYSTEM_PROMPT,
            }, ...request.history.slice(0, -1)];
            if (isCensored(assistantPrompt)) {
                console.warn("Censorship detected. Redirecting query to OpenAI API...", assistantPrompt);

                fetch("https://api.openai.com/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: openaiModel,
                        messages: messages,
                    })
                })
                    .then(response => response.json())
                    .then(data => {
                        if (data.choices && data.choices.length > 0) {
                            sendResponse({replacement: data.choices[0].message.content});
                        } else {
                            sendResponse({replacement: "Error: Unable to fetch a response from GPT."});
                        }
                    })
                    .catch(error => {
                        console.error("OpenAI API error:", error);
                        sendResponse({replacement: "Error: OpenAI API request failed."});
                    });

                return true;
            } else {
                sendResponse({replacement: assistantPrompt});
            }
        });

        return true;
    }
});
