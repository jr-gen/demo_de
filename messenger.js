// Shared Genesys Messenger helper used by index.html and specialist-demo.html.
// Loads the Messenger deployment, sets participant data, then opens Messenger.

const MESSENGER = {
  environment: "prod",
  deploymentId: "de24ccb3-878d-48c3-84c7-4380d3f4bca9"
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
async function startSpecialistRequest(request) {
  await genesysCommand("Database.set", {
    messaging: {
      customAttributes: {
        requestPurpose: request.requestPurpose,
        premiseID: request.premiseID,          // Premise ID or address
        voiceInteractionID: request.voiceInteractionID,
        originatingAgentName: request.originatingAgentName
      }
    }
  });
  await genesysCommand("Messenger.open");
}
