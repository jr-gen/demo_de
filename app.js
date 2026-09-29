(() => {
  "use strict";

  const els = {
    requestView: document.getElementById("requestView"),
    messengerView: document.getElementById("messengerView"),
    requestForm: document.getElementById("requestForm"),
    purpose: document.getElementById("purpose"),
    premiseID: document.getElementById("premiseID"),
    submitButton: document.getElementById("submitButton"),
    statusMessage: document.getElementById("statusMessage"),
    agentName: document.getElementById("agentName"),
    voiceInteractionID: document.getElementById("voiceInteractionID")
  };

  const params = new URLSearchParams(window.location.search);

  // Interaction Widget context supplied by Genesys Cloud.
  const interactionContext = {
    conversationId: params.get("conversationId") || "",
    gcHostOrigin: params.get("gcHostOrigin") || "",
    gcTargetEnv: params.get("gcTargetEnv") || ""
  };

  // This is intentionally a placeholder until the Genesys Cloud current-user
  // lookup is wired in. For demo testing, an optional query-string value can
  // populate the display without adding an agent input field:
  // ?originatingAgentName=Jared%20Robertson
  const originatingAgentName =
    params.get("originatingAgentName") ||
    window.__ORIGINATING_AGENT_NAME__ ||
    "";

  els.agentName.textContent = originatingAgentName || "—";
  els.voiceInteractionID.textContent = interactionContext.conversationId || "—";

  function setStatus(message, isError = false) {
    els.statusMessage.textContent = message;
    els.statusMessage.classList.toggle("error", isError);
  }

  function buildRequestContext() {
    return {
      requestPurpose: els.purpose.value,
      premiseID: els.premiseID.value.trim(),
      voiceInteractionID: interactionContext.conversationId,
      originatingAgentName
    };
  }

  /*
   * Messenger integration hook.
   *
   * Replace the implementation below with the Messenger SDK calls used by
   * your existing working deployment. The form and page lifecycle do not
   * otherwise need to change.
   *
   * Expected outcome:
   *   1. Set the four values as Web Messaging participant/custom attributes.
   *   2. Start/open Messenger.
   *   3. Show the Messenger UI in this iframe.
   */
  async function openMessengerWithContext(context) {
    // Examples of the values available to your Messenger implementation:
    // context.requestPurpose
    // context.premiseID
    // context.voiceInteractionID
    // context.originatingAgentName

    /*
     * Keep your existing Messenger bootstrap/deployment code in this page.
     *
     * Once that code is loaded, wire the exact current Messenger SDK calls
     * here. This function intentionally does not invent or hard-code SDK
     * commands that may differ between your current deployment/configuration.
     */

    if (typeof window.openMessengerWithContextOverride === "function") {
      await window.openMessengerWithContextOverride(context);
      return;
    }

    // Temporary development behavior: reveal the Messenger area so the
    // existing embedded Messenger can occupy the iframe.
    // Replace this with the actual SDK call when the deployment code is wired.
    els.requestView.hidden = true;
    els.messengerView.hidden = false;
  }

  els.requestForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus("");

    if (!els.purpose.value) {
      setStatus("Choose a purpose.", true);
      els.purpose.focus();
      return;
    }

    if (!els.premiseID.value.trim()) {
      setStatus("Enter a premise code or address.", true);
      els.premiseID.focus();
      return;
    }

    if (!interactionContext.conversationId) {
      setStatus("The current voice interaction ID is unavailable.", true);
      return;
    }

    const context = buildRequestContext();

    els.submitButton.disabled = true;
    els.submitButton.textContent = "Starting request…";

    try {
      await openMessengerWithContext(context);
    } catch (error) {
      console.error("Unable to start Messenger:", error);
      setStatus("Unable to start the specialist request. Please try again.", true);
      els.submitButton.disabled = false;
      els.submitButton.textContent = "Request Specialist Assistance";
    }
  });

  // Expose the resolved context for development/testing.
  // Remove or restrict this in production if you do not want it available.
  window.__NEW_CONSTRUCTION_CONTEXT__ = interactionContext;
})();
