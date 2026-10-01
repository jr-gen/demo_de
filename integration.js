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
        message:
          "You must provide a premise ID or address before requesting specialist assistance."
      };
    }

    if (anyAddress && !completeAddress) {
      return {
        valid: false,
        message:
          "Please complete the premise address (street, city, state, and ZIP)."
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

    if (context.voiceInteractionID) {
      url.searchParams.set(
        "voiceInteractionID",
        context.voiceInteractionID
      );
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
      url.searchParams.set(
        "premiseStreet",
        premise.address.premiseStreet
      );
      url.searchParams.set(
        "premiseCity",
        premise.address.premiseCity
      );
      url.searchParams.set(
        "premiseState",
        premise.address.premiseState
      );
      url.searchParams.set(
        "premiseZip",
        premise.address.premiseZip
      );
    }

    if (context.originatingAgentName) {
      url.searchParams.set(
        "originatingAgentName",
        context.originatingAgentName
      );
    }

    return url;
  }

  function prepareLaunch(event, requestPurpose) {
    const validation = validatePremise();

    if (!validation.valid) {
      event.preventDefault();
      showStatus(validation.message, true);

      if (validation.message.startsWith("You must")) {
        el.premiseID.focus();
      } else if (validation.message.startsWith("Please complete")) {
        el.street.focus();
      }

      return;
    }

    const url = buildLandingUrl(requestPurpose, validation);

    // Use a normal user-initiated hyperlink with target="_blank".
    // This avoids window.open(), so the page does not implement its own
    // popup logic or display a "allow pop-ups" warning.
    event.currentTarget.href = url.href;

    showStatus("Opening the specialist request…", false);
  }

  el.naicsButton.addEventListener("click", (event) => {
    prepareLaunch(event, "NAICS Removal");
  });

  el.inspectionButton.addEventListener("click", (event) => {
    prepareLaunch(event, "Inspection Obligation");
  });

  window.__NEW_CONSTRUCTION_CONTEXT__ = context;
})();
