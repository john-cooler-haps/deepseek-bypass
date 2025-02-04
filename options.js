// This script allows the user to save an OpenAI API key into Chrome's local storage
// and automatically loads it into an input field when the page is opened.
document.getElementById("saveKey").addEventListener("click", function () {
    let apiKey = document.getElementById("apiKey").value;
    let model = document.getElementById("model").value;
    chrome.storage.local.set({ openai_api_key: apiKey }, function () {});
    chrome.storage.local.set({ openai_model: model }, function () {});
        alert("OpenAI settings saved successfully.");
});


/**
 * The default identifier for the OpenAI model used in the application.
 *
 * This variable specifies the model name to be used as the default model
 * for OpenAI API interactions. By default, it is set to 'gpt-3.5-turbo',
 * which indicates the version of the language model.
 *
 * Modify this variable if a different model is intended to be used as the default.
 */
const DEFAULT_OPENAI_MODEL = 'gpt-3.5-turbo';

// Loads the saved API key and OpenAI model when the page is opened
chrome.storage.local.get(["openai_api_key", "openai_model"], function (result) {
    document.getElementById("apiKey").value = result.openai_api_key || "";
    document.getElementById("model").value = result.openai_model || DEFAULT_OPENAI_MODEL;
});
