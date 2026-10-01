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

  async function waitForGenesys(timeoutMs = 15000) {
    const startedAt = Date.now();

    while (typeof window.Genesys !== "function") {
      if (Date.now() - startedAt >= timeoutMs) {
        throw new Error("Timed out waiting for Messenger bootstrap.");
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  async function setParticipantData() {
    const premiseValue =
      requestContext.premiseID ||
      [
        requestContext.premiseStreet,
        requestContext.premiseCity,
        requestContext.premiseState,
        requestContext.premiseZip
      ].filter(Boolean).join(", ");

    await command("Database.set", {
      messaging: {
        customAttributes: {
          requestPurpose: requestContext.requestPurpose,
          premiseID: premiseValue,
          voiceInteractionID: requestContext.voiceInteractionID,
          originatingAgentName: requestContext.originatingAgentName
        }
      }
    });
  }

  // Auto-start is intentionally disabled. Messenger opens only after the
  // user explicitly clicks the button.
  el.openChatButton.addEventListener("click", async () => {
    if (started) {
      await command("Messenger.open");
      return;
    }

    el.openChatButton.disabled = true;
    setStatus("Preparing the specialist conversation…");
    el.chatHelp.textContent = "Preparing request context…";

    try {
      await waitForGenesys();
      await setParticipantData();

      await command("Messenger.open");

      started = true;
      setStatus(
        "Specialist conversation is open. Stay with the customer while the request is handled."
      );
      el.chatHelp.textContent =
        "Use the Messenger conversation to communicate with the specialist.";
    } catch (error) {
      console.error("Unable to start Messenger:", error);
      el.openChatButton.disabled = false;
      setStatus(
        "We could not start the specialist conversation. Use the button below to try again.",
        true
      );
      el.chatHelp.textContent =
        "Check the Messenger deployment configuration and try again.";
    }
  });

  window.__NEW_CONSTRUCTION_REQUEST__ = requestContext;
})();
