(() => {
  "use strict";

  const el = {
    purpose: document.getElementById("purpose"),
    premiseID: document.getElementById("premiseID"),
    street: document.getElementById("street"),
    city: document.getElementById("city"),
    state: document.getElementById("state"),
    zip: document.getElementById("zip"),
    startButton: document.getElementById("startButton"),
    status: document.getElementById("status")
  };

  // Mock values representing the Start Service context that would exist in production.
  const demoContext = {
    originatingAgentName: "Demo Start Service Agent",
    voiceInteractionID: "DEMO-VOICE-001"
  };

  function setStatus(message, isError = false) {
    el.status.textContent = message;
    el.status.classList.toggle("error", isError);
  }

  function premiseValue() {
    const premiseID = el.premiseID.value.trim();
    if (premiseID) return premiseID;

    return [
      el.street.value.trim(),
      el.city.value.trim(),
      el.state.value.trim(),
      el.zip.value.trim()
    ].filter(Boolean).join(", ");
  }

  function context() {
    return {
      requestPurpose: el.purpose.value,
      premiseID: premiseValue(),
      voiceInteractionID: demoContext.voiceInteractionID,
      originatingAgentName: demoContext.originatingAgentName
    };
  }

  function validateContext(value) {
    if (!value.requestPurpose) {
      return "Choose a request purpose.";
    }
    if (!value.premiseID) {
      return "Provide a premise ID or address.";
    }
    return "";
  }

  function setParticipantData(value) {
    // Queue participant data before Messenger opens. This matches the
    // landing-page data contract used by the inbound Architect flow.
    window.Genesys("command", "Database.set", {
      messaging: {
        customAttributes: {
          requestPurpose: value.requestPurpose,
          premiseID: value.premiseID,
          voiceInteractionID: value.voiceInteractionID,
          originatingAgentName: value.originatingAgentName
        }
      }
    });
  }

  async function openMessenger() {
    // Messenger is bootstrapped by the page-level snippet above.
    // Wait briefly for the command queue/bootstrap to become available.
    for (let attempt = 0; attempt < 50; attempt += 1) {
      if (typeof window.Genesys === "function") break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (typeof window.Genesys !== "function") {
      throw new Error("Genesys Messenger bootstrap is unavailable.");
    }

    await new Promise((resolve, reject) => {
      try {
        window.Genesys("command", "Messenger.open", {}, () => resolve());
      } catch (error) {
        reject(error);
      }
    });
  }

  el.startButton.addEventListener("click", async () => {
    setStatus("");

    const value = context();
    const validationError = validateContext(value);

    if (validationError) {
      setStatus(validationError, true);
      return;
    }

    el.startButton.disabled = true;
    el.startButton.textContent = "Starting interaction…";

    try {
      setParticipantData(value);
      await openMessenger();

      setStatus("Specialist interaction started. Continue in Genesys Cloud.");
    } catch (error) {
      console.error(error);
      setStatus("Unable to start the specialist interaction. Check the Messenger deployment and browser console.", true);
      el.startButton.disabled = false;
      el.startButton.textContent = "Start Specialist Interaction";
    }
  });

  window.__SPECIALIST_DEMO_CONTEXT__ = demoContext;
})();
