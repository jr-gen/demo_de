// Shared Genesys Messenger helper used by index.html and specialist-demo.html.
// Loads the Messenger deployment, sets participant data, then opens Messenger.

const MESSENGER = {
  environment: "prod",
  deploymentId: "53792783-a621-4299-8170-a0aec53aadf8"
};

// Standard Genesys Messenger bootstrap snippet.
(function (g, e, n, es, ys) {
  g["_genesysJs"] = e;
  g[e] = g[e] || function () { (g[e].q = g[e].q || []).push(arguments); };
  g[e].t = 1 * new Date();
  g[e].c = es;
  ys = document.createElement("script"); ys.async = 1; ys.src = n; ys.charset = "utf-8";
  document.head.appendChild(ys);
})(window, "Genesys", "https://apps.mypurecloud.com/genesys-bootstrap/genesys.min.js", MESSENGER);

// Resolves when Messenger has finished loading.
const messengerReady = new Promise((resolve) => {
  window.Genesys("subscribe", "Messenger.ready", resolve);
});

// Promise wrapper for Genesys("command", ...). Times out so a stuck command can't hang the page.
function genesysCommand(name, payload = {}, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${name} timed out`)), timeoutMs);
    window.Genesys("command", name, payload,
      (r) => { clearTimeout(timer); resolve(r); },
      (e) => { clearTimeout(timer); reject(e); });
  });
}

// Participant data must be set BEFORE Messenger starts the conversation,
// so the inbound message flow can read it with Get Participant Data.
// Attribute names are case-sensitive and must match Architect.
async function startSpecialistRequest(request) {
  await messengerReady;

  const attrs = {
    requestPurpose: request.requestPurpose,
    premiseID: request.premiseID,                  // Premise ID or address
    voiceInteractionID: request.voiceInteractionID,
    originatingAgentName: request.originatingAgentName // optional; flow looks up the name
  };

  // Values must be strings. Skip empty or undefined values.
  const customAttributes = {};
  Object.keys(attrs).forEach((key) => {
    const value = attrs[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      customAttributes[key] = String(value);
    }
  });

  await genesysCommand("Database.set", { messaging: { customAttributes } });
  await genesysCommand("Messenger.open");
}
