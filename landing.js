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

  let databaseReady = false;
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

  function subscribeOnce(eventName, callback) {
    if (typeof window.Genesys !== "function") {
      return;
    }

    window.Genesys("subscribe", eventName, callback);
  }

  subscribeOnce("Database.ready", () => {
    databaseReady = true;
    if (!started) startConversationIfReady();
  });

  subscribeOnce("Messenger.ready", () => {
    messengerReady = true;
    if (!started) startConversationIfReady();
  });

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

  async function waitFor(getter, label, timeoutMs = 15000) {
    if (getter()) return;

    await new Promise((resolve, reject) => {
      const eventName = `__nc_${label}`;
      const handler = () => {
        window.removeEventListener(eventName, handler);
        resolve();
      };

      window.addEventListener(eventName, handler, { once: true });
      window.setTimeout(() => {
        window.removeEventListener(eventName, handler);
        reject(new Error(`Timed out waiting for ${label}.`));
      }, timeoutMs);
    });
  }

  async function setParticipantData() {
    await waitFor(() => databaseReady, "database-ready");

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

  async function startConversationIfReady() {
    if (started) return;
    if (typeof window.Genesys !== "function") return;
    if (!databaseReady || !messengerReady) return;

    started = true;
    el.openChatButton.disabled = true;
    el.chatHelp.textContent = "Connecting to the New Construction specialist…";

    try {
      await setParticipantData();
      await command("Messenger.open");
      setStatus("Specialist conversation is open. Stay with the customer while the request is handled.");
      el.chatHelp.textContent = "Use the Messenger conversation below/right to communicate with the specialist.";
      // Re-open is harmless if Messenger is already open; the user can use the
      // standard Messenger widget to continue the interaction.
    } catch (error) {
      console.error(error);
      started = false;
      el.openChatButton.disabled = false;
      setStatus("We could not start the specialist conversation. Use the button below to try again.", true);
      el.chatHelp.textContent = "Check the Messenger deployment configuration and try again.";
    }
  }

  el.openChatButton.addEventListener("click", async () => {
    if (started) {
      await command("Messenger.open");
      return;
    }

    try {
      await startConversationIfReady();
    } catch (error) {
      console.error(error);
      setStatus("Unable to open Messenger.", true);
    }
  });

  // Helpful for debugging in the demo environment.
  window.__NEW_CONSTRUCTION_REQUEST__ = requestContext;
})();
