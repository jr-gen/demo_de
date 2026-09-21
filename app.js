(() => {
  "use strict";

  const params = new URLSearchParams(window.location.search);

  // Demo context is exposed here so a future launching application can replace
  // these values. The interaction ID can also be passed as ?interactionId=...
  const context = {
    customerName: "Jane Smith",
    accountNumber: "ACCT-104872",
    serviceAddress: "1200 Congress Ave, Austin, TX 78701",
    interactionId: params.get("interactionId") || "INT-DEMO-1001"
  };

  const $ = (id) => {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Missing element: ${id}`);
    return el;
  };

  function setStatus(message, isError = false) {
    const el = $("status");
    el.textContent = message;
    el.classList.toggle("error", isError);
  }

  function renderContext() {
    $("customerName").textContent = context.customerName;
    $("accountNumber").textContent = context.accountNumber;
    $("serviceAddress").textContent = context.serviceAddress;
    $("interactionId").textContent = context.interactionId;
  }

  function setMessengerContext(purpose, onSuccess) {
    if (typeof window.Genesys !== "function") {
      throw new Error("Messenger is not loaded. Paste the Messenger Deployment snippet into index.html.");
    }

    // Important: write the custom attributes first; open Messenger only after
    // Database.set succeeds.
    window.Genesys(
      "command",
      "Database.set",
      {
        messaging: {
          customAttributes: {
            customerName: context.customerName,
            accountNumber: context.accountNumber,
            serviceAddress: context.serviceAddress,
            requestReason: purpose,
            interactionId: context.interactionId
          }
        }
      },
      () => {
        setStatus("Context captured. Opening Messenger…");
        onSuccess();
      },
      (error) => {
        console.error("Genesys Database.set failed:", error);
        $("requestReason").disabled = false;
        setStatus("The support conversation could not be initialized. Please try again.", true);
      }
    );
  }

  function startSupport() {
    const select = $("requestReason");
    const purpose = select.value;
    if (!purpose) return;

    select.disabled = true;
    setStatus("Preparing your support conversation…");

    try {
      setMessengerContext(purpose, () => {
        window.Genesys("command", "Messenger.open");
      });
    } catch (error) {
      console.error(error);
      select.disabled = false;
      setStatus(error.message || "Unable to start support.", true);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderContext();
    $("requestReason").addEventListener("change", startSupport);
  });
})();
