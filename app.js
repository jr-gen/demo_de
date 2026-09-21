(() => {
  "use strict";

  const params = new URLSearchParams(window.location.search);
  const initialContext = {
    customerName: "Jane Smith",
    accountNumber: "ACCT-104872",
    serviceAddress: "1200 Congress Ave, Austin, TX 78701",
    interactionId: params.get("interactionId") || "INT-DEMO-1001"
  };

  function $(id) {
    const element = document.getElementById(id);
    if (!element) throw new Error(`Missing element: ${id}`);
    return element;
  }

  function setStatus(message, isError = false) {
    const status = $("status");
    status.textContent = message;
    status.classList.toggle("error", isError);
  }

  function renderContext() {
    $("customerName").textContent = initialContext.customerName;
    $("accountNumber").textContent = initialContext.accountNumber;
    $("serviceAddress").textContent = initialContext.serviceAddress;
    $("interactionId").textContent = initialContext.interactionId;
  }

  function getPurpose() {
    const purpose = $("requestReason").value;
    if (!purpose) throw new Error("Choose a purpose before starting the support chat.");
    return purpose;
  }

  function writeParticipantData(purpose, onSuccess) {
    if (typeof window.Genesys !== "function") {
      throw new Error("Messenger is not loaded. Paste the Messenger Deployment snippet into index.html.");
    }

    window.Genesys(
      "command",
      "Database.set",
      {
        messaging: {
          customAttributes: {
            customerName: initialContext.customerName,
            accountNumber: initialContext.accountNumber,
            serviceAddress: initialContext.serviceAddress,
            requestReason: purpose,
            interactionId: initialContext.interactionId
          }
        }
      },
      () => {
        setStatus("Context captured. Opening Messenger…");
        onSuccess();
      },
      (error) => {
        console.error("Genesys Database.set failed:", error);
        setStatus("We could not initialize the support conversation. Please try again.", true);
        $("requestReason").disabled = false;
      }
    );
  }

  function startSupport() {
    const select = $("requestReason");
    let purpose;

    try {
      purpose = getPurpose();
      select.disabled = true;
      setStatus("Preparing your support conversation…");

      writeParticipantData(purpose, () => {
        window.Genesys("command", "Messenger.open");
      });
    } catch (error) {
      select.disabled = false;
      setStatus(error.message || "Unable to start support.", true);
      console.error(error);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderContext();
    $("requestReason").addEventListener("change", startSupport);
  });
})();
