(() => {
  "use strict";

  const params = new URLSearchParams(window.location.search);

  const requestContext = {
    requestPurpose: params.get("requestPurpose") || "",
    premiseID: params.get("premiseID") || "",
    premiseStreet: params.get("premiseStreet") || "",
    premiseCity: params.get("premiseCity") || "",
    premiseState: params.get("premiseState") || "",
    premiseZip: params.get("premiseZip") || "",
    voiceInteractionID: params.get("voiceInteractionID") || "",
    originatingAgentName:
      params.get("originatingAgentName") ||
      window.__ORIGINATING_AGENT_NAME__ ||
      ""
  };

  const el = {
    purpose: document.getElementById("requestPurpose"),
    premiseSummary: document.getElementById("premiseSummary"),
    voiceInteractionID: document.getElementById("voiceInteractionID"),
    landingStatus: document.getElementById("landingStatus"),
    openChatButton: document.getElementById("openChatButton"),
    chatHelp: document.getElementById("chatHelp")
  };

  let messengerReady = false;
  let started = false;

  el.purpose.textContent = requestContext.requestPurpose || "Not supplied";
  el.voiceInteractionID.textContent =
    requestContext.voiceInteractionID || "Unavailable";

  function formatPremise() {
    if (requestContext.premiseID) {
      return requestContext.premiseID;
    }

    const parts = [
      requestContext.premiseStreet,
      requestContext.premiseCity,
      requestContext.premiseState,
      requestContext.premiseZip
    ].filter(Boolean);

    return parts.join(", ") || "Not supplied";
  }

  el.premiseSummary.textContent = formatPremise();

  function setStatus(message, error = false) {
    el.landingStatus.textContent = message;
    el.landingStatus.classList.toggle("error", error);
  }

  function command(commandName, payload = {}) {
    return new Promise((resolve, reject) => {
      if (typeof window.Genesys !== "function") {
        reject(new Error("Messenger bootstrap is not loaded."));
        return;
      }

      window.Genesys(
        "command",
        commandName,
        payload,
        (result) => resolve(result),
        (error) => reject(error || new Error(`${commandName} failed.`))
      );
    });
  }

  function subscribe(eventName, callback) {
    if (typeof window.Genesys === "function") {
      window.Genesys("subscribe", eventName, callback);
    }
  }

  subscribe("Messenger.ready", () => {
    messengerReady = true;

    // Database.set was queued before the Messenger bootstrap loaded.
    // We can now open Messenger without setting participant data a second time.
    if (!started && el.openChatButton.dataset.autoOpen === "true") {
      startConversation();
    }
  });

  async function startConversation() {
    if (started) {
      await command("Messenger.open");
      return;
    }

    if (!messengerReady) {
      setStatus("Preparing the specialist conversation…");
      return;
    }

    started = true;
    el.openChatButton.disabled = true;
    el.chatHelp.textContent = "Connecting to the New Construction specialist…";

    try {
      await command("Messenger.open");
      setStatus(
        "Specialist conversation is open. Stay with the customer while the request is handled."
      );
      el.chatHelp.textContent =
        "Use the Messenger conversation to communicate with the specialist.";
    } catch (error) {
      console.error(error);
      started = false;
      el.openChatButton.disabled = false;
      setStatus(
        "We could not start the specialist conversation. Use the button below to try again.",
        true
      );
      el.chatHelp.textContent =
        "Check the Messenger deployment configuration and try again.";
    }
  }

  el.openChatButton.addEventListener("click", () => {
    startConversation().catch((error) => {
      console.error(error);
      setStatus("Unable to open Messenger.", true);
    });
  });

  // Helpful for debugging in the demo environment.
  // The values shown here are the same values queued to Messenger in landing.html.
  window.__NEW_CONSTRUCTION_REQUEST__ = requestContext;
})();
