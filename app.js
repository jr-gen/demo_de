(() => {
  "use strict";

  const params = new URLSearchParams(window.location.search);
  const scenario = params.get("scenario") || "normal";
  const interactionIdFromUrl = params.get("interactionId");

  const scenarios = {
    normal: {
      label: "Normal",
      customerName: "Jane Smith",
      accountNumber: "ACCT-104872",
      serviceAddress: "1200 Congress Ave, Austin, TX 78701",
      interactionId: "INT-DEMO-1001",
      requestReason: "New Construction"
    },
    naics: {
      label: "NAICS code",
      customerName: "Bright Star Builders LLC",
      accountNumber: "ACCT-304955",
      serviceAddress: "8800 Burnet Rd, Austin, TX 78757",
      interactionId: "INT-DEMO-3001",
      requestReason: "NAICS code"
    },
    option3: {
      label: "Option 3",
      customerName: "Taylor Morgan",
      accountNumber: "ACCT-705981",
      serviceAddress: "2600 Guadalupe St, Austin, TX 78705",
      interactionId: "INT-DEMO-7001",
      requestReason: "Option 3"
    },
    option4: {
      label: "Option 4",
      customerName: "Avery Chen",
      accountNumber: "ACCT-605443",
      serviceAddress: "700 E Riverside Dr, Austin, TX 78704",
      interactionId: "INT-DEMO-6001",
      requestReason: "Option 4"
    },
    closed: {
      label: "Closed-hours test",
      customerName: "Emily Johnson",
      accountNumber: "ACCT-405122",
      serviceAddress: "500 W 2nd St, Austin, TX 78701",
      interactionId: "INT-DEMO-4001",
      requestReason: "New Construction"
    },
    holiday: {
      label: "Holiday test",
      customerName: "Michael Lee",
      accountNumber: "ACCT-505317",
      serviceAddress: "1900 E 5th St, Austin, TX 78702",
      interactionId: "INT-DEMO-5001",
      requestReason: "Option 3"
    },
    emergency: {
      label: "Emergency test",
      customerName: "Avery Chen",
      accountNumber: "ACCT-605443",
      serviceAddress: "700 E Riverside Dr, Austin, TX 78704",
      interactionId: "INT-DEMO-6001",
      requestReason: "Option 4"
    },
    custom: {
      label: "Custom",
      customerName: "Demo Customer",
      accountNumber: "ACCT-000001",
      serviceAddress: "100 Demo Street, Austin, TX 78701",
      interactionId: "INT-DEMO-CUSTOM",
      requestReason: "New Construction"
    }
  };

  const activeScenario = scenarios[scenario] || scenarios.normal;

  const $ = (id) => {
    const node = document.getElementById(id);
    if (!node) throw new Error(`Missing page element: ${id}`);
    return node;
  };

  function setStatus(message, isError = false) {
    const status = $("status");
    status.textContent = message;
    status.classList.toggle("error", isError);
  }

  function setField(id, value) {
    $(id).value = value;
  }

  function currentContext() {
    return {
      customerName: $("customerName").value.trim(),
      accountNumber: $("accountNumber").value.trim(),
      serviceAddress: $("serviceAddress").value.trim(),
      requestReason: $("requestReason").value,
      interactionId: $("interactionId").value.trim()
    };
  }

  function initializePage() {
    setField("customerName", activeScenario.customerName);
    setField("accountNumber", activeScenario.accountNumber);
    setField("serviceAddress", activeScenario.serviceAddress);
    setField("interactionId", interactionIdFromUrl || activeScenario.interactionId);
    setField("requestReason", activeScenario.requestReason);
    $("modeBadge").textContent = activeScenario.label;

    document.querySelectorAll("[data-scenario]").forEach((link) => {
      link.classList.toggle("active", link.dataset.scenario === scenario);
    });
  }

  function validateContext(ctx) {
    const required = [
      ["Customer / business name", ctx.customerName],
      ["Account number", ctx.accountNumber],
      ["Service address", ctx.serviceAddress],
      ["Interaction ID", ctx.interactionId],
      ["Purpose", ctx.requestReason]
    ];

    const missing = required.filter(([, value]) => !value).map(([name]) => name);
    if (missing.length) {
      throw new Error(`Complete: ${missing.join(", ")}.`);
    }
  }

  function setMessengerContext(done) {
    if (typeof window.Genesys !== "function") {
      throw new Error(
        "Messenger is not loaded. Paste the Genesys deployment snippet into index.html."
      );
    }

    const ctx = currentContext();
    validateContext(ctx);

    /*
      Critical initialization order:
        1. write participant custom attributes
        2. wait for success
        3. open Messenger

      This avoids racing Messenger.open against Database.set.
    */
    window.Genesys(
      "command",
      "Database.set",
      {
        messaging: {
          customAttributes: {
            customerName: ctx.customerName,
            accountNumber: ctx.accountNumber,
            serviceAddress: ctx.serviceAddress,
            requestReason: ctx.requestReason,
            interactionId: ctx.interactionId
          }
        }
      },
      () => {
        setStatus("Customer context initialized. Opening Messenger...");
        done();
      },
      (error) => {
        console.error("Genesys Database.set failed:", error);
        setStatus(
          "Messenger context could not be initialized. Check the browser console.",
          true
        );
      }
    );
  }

  function launchMessenger() {
    try {
      setStatus("Initializing customer context...");

      setMessengerContext(() => {
        window.Genesys("command", "Messenger.open");
      });
    } catch (error) {
      console.error(error);
      setStatus(error.message || "Unable to launch Messenger.", true);
    }
  }

  function updateContextOnly() {
    try {
      setStatus("Updating customer context...");
      setMessengerContext(() => {
        setStatus("Customer context initialized. Messenger was not opened.");
      });
    } catch (error) {
      console.error(error);
      setStatus(error.message || "Unable to update Messenger context.", true);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    initializePage();
    $("launch").addEventListener("click", launchMessenger);
    $("updateContext").addEventListener("click", updateContextOnly);
  });
})();
