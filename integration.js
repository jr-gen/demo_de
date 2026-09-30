(() => {
  "use strict";

  const params = new URLSearchParams(window.location.search);

  const context = {
    voiceInteractionID:
      params.get("conversationId") ||
      params.get("gcConversationId") ||
      "",
    gcHostOrigin: params.get("gcHostOrigin") || "",
    gcTargetEnv: params.get("gcTargetEnv") || "",
    originatingAgentName:
      params.get("originatingAgentName") ||
      window.__ORIGINATING_AGENT_NAME__ ||
      ""
  };

  const landingUrl =
    params.get("landingUrl") ||
    new URL("landing.html", window.location.href).href;

  const el = {
    form: document.getElementById("requestForm"),
    premiseID: document.getElementById("premiseID"),
    street: document.getElementById("street"),
    city: document.getElementById("city"),
    state: document.getElementById("state"),
    zip: document.getElementById("zip"),
    status: document.getElementById("statusMessage"),
    voiceInteractionID: document.getElementById("voiceInteractionID"),
    naicsButton: document.getElementById("naicsButton"),
    inspectionButton: document.getElementById("inspectionButton")
  };

  el.voiceInteractionID.textContent =
    context.voiceInteractionID || "Unavailable";

  function showStatus(message, isError = true) {
    el.status.textContent = message;
    el.status.classList.toggle("error", isError);
    el.status.classList.toggle("success", !isError);
  }

  function getAddress() {
    return {
      premiseStreet: el.street.value.trim(),
      premiseCity: el.city.value.trim(),
      premiseState: el.state.value.trim(),
      premiseZip: el.zip.value.trim()
    };
  }

  function validatePremise() {
    const premiseID = el.premiseID.value.trim();
    const address = getAddress();
    const addressValues = Object.values(address);
    const anyAddress = addressValues.some(Boolean);
    const completeAddress = addressValues.every(Boolean);

    if (premiseID && anyAddress) {
      return {
        valid: false,
        message: "Provide either a premise ID or address, not both."
      };
    }

    if (!premiseID && !anyAddress) {
      return {
        valid: false,
        message: "You must provide a premise ID or address before requesting specialist assistance."
      };
    }

    if (anyAddress && !completeAddress) {
      return {
        valid: false,
        message: "Please complete the premise address (street, city, state, and ZIP)."
      };
    }

    return {
      valid: true,
      premiseID,
      address
    };
  }

  function buildLandingUrl(requestPurpose, premise) {
    const url = new URL(landingUrl);

    // Preserve Genesys context supplied by the Interaction Widget.
    if (context.voiceInteractionID) {
      url.searchParams.set("voiceInteractionID", context.voiceInteractionID);
    }
    if (context.gcHostOrigin) {
      url.searchParams.set("gcHostOrigin", context.gcHostOrigin);
    }
    if (context.gcTargetEnv) {
      url.searchParams.set("gcTargetEnv", context.gcTargetEnv);
    }

    url.searchParams.set("requestPurpose", requestPurpose);

    if (premise.premiseID) {
      url.searchParams.set("premiseID", premise.premiseID);
    } else {
      url.searchParams.set("premiseStreet", premise.address.premiseStreet);
      url.searchParams.set("premiseCity", premise.address.premiseCity);
      url.searchParams.set("premiseState", premise.address.premiseState);
      url.searchParams.set("premiseZip", premise.address.premiseZip);
    }

    // Demo-only bridge; the landing page does not ask the agent to type a name.
    if (context.originatingAgentName) {
      url.searchParams.set("originatingAgentName", context.originatingAgentName);
    }

    return url;
  }

  function launch(requestPurpose) {
    const validation = validatePremise();
    if (!validation.valid) {
      showStatus(validation.message, true);
      if (validation.message.startsWith("You must")) {
        el.premiseID.focus();
      }
      return;
    }

    showStatus("Opening the specialist request…", false);

    const url = buildLandingUrl(requestPurpose, validation);

    // This call is made directly from the button click so browsers are less
    // likely to treat it as an unsolicited popup.
    const popup = window.open(
      url.href,
      "_blank",
      "noopener,noreferrer"
    );

    if (!popup) {
      showStatus("The specialist request page could not be opened. Allow pop-ups for this site and try again.", true);
      return;
    }

    showStatus("Specialist request opened in a new browser tab.", false);
  }

  el.naicsButton.addEventListener("click", () => {
    launch("NAICS Removal");
  });

  el.inspectionButton.addEventListener("click", () => {
    launch("Inspection Obligation");
  });

  // Expose read-only context for demo troubleshooting.
  window.__NEW_CONSTRUCTION_CONTEXT__ = context;
})();
