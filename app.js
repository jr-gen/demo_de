// Intake page loaded by the Genesys Cloud Interaction Widget.
//
// Interaction Widget URL (configured in Genesys Cloud):
//   https://<host>/index.html?conversationId={{gcConversationId}}&gcHostOrigin={{gcHostOrigin}}
//
// - Voice interaction ID: read from the {{gcConversationId}} URL placeholder.
// - Agent name: GET /api/v2/users/me using an OAuth Implicit Grant client.
//   Leave OAUTH_CLIENT_ID blank to skip sign-in for demos (uses ?agentName= or a default).

const OAUTH_CLIENT_ID = "";   // Genesys Cloud OAuth client (Token Implicit Grant)
const REDIRECT_URI = location.origin + location.pathname;

const $ = (id) => document.getElementById(id);
const setStatus = (msg, isError = false) => {
  $("status").textContent = msg;
  $("status").classList.toggle("error", isError);
};

// The OAuth redirect drops the query string, so it is carried in "state".
const hash = new URLSearchParams(location.hash.slice(1));
const params = new URLSearchParams(hash.get("state") || location.search);
const conversationId = params.get("conversationId") || "";
const hostOrigin = params.get("gcHostOrigin") || "https://apps.mypurecloud.com";
const envDomain = new URL(hostOrigin).hostname.replace(/^apps\./, ""); // e.g., mypurecloud.com

async function getAgentName() {
  if (!OAUTH_CLIENT_ID) return params.get("agentName") || "Demo Start Service Agent";

  const token = hash.get("access_token") || sessionStorage.getItem("gcToken");
  if (!token) {
    // Send the agent through Genesys Cloud sign-in (normally silent, since they are already signed in).
    location.assign(`https://login.${envDomain}/oauth/authorize?` + new URLSearchParams({
      response_type: "token",
      client_id: OAUTH_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      state: location.search
    }));
    return new Promise(() => {}); // page is redirecting
  }
  sessionStorage.setItem("gcToken", token);
  history.replaceState(null, "", `${REDIRECT_URI}?${params}`); // remove token from URL

  const res = await fetch(`https://api.${envDomain}/api/v2/users/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    sessionStorage.removeItem("gcToken");
    throw new Error(`users/me failed: ${res.status}`);
  }
  return (await res.json()).name;
}

let agentName = "";
$("voiceInteractionID").textContent = conversationId || "Unavailable";
getAgentName()
  .then((name) => { agentName = name; $("agentName").textContent = name; })
  .catch((err) => { console.error(err); setStatus("Unable to identify the agent. Reload the page.", true); });

document.querySelectorAll("[data-purpose]").forEach((button) => {
  button.addEventListener("click", async () => {
    const premise = $("premise").value.trim();
    if (!premise) return setStatus("Enter a premise ID or address before selecting a request type.", true);
    if (!conversationId) return setStatus("The voice interaction ID is unavailable.", true);
    if (!agentName) return setStatus("Agent information is still loading. Try again in a moment.", true);

    document.querySelectorAll("button").forEach((b) => (b.disabled = true));
    setStatus("Sending request…");

    try {
      await startSpecialistRequest({
        requestPurpose: button.dataset.purpose,
        premiseID: premise,
        voiceInteractionID: conversationId,
        originatingAgentName: agentName
      });
      setStatus("Request sent. Continue in the Messenger window.");
    } catch (err) {
      console.error(err);
      document.querySelectorAll("button").forEach((b) => (b.disabled = false));
      setStatus("We could not reach New Construction. Please try again or use the standard transfer process.", true);
    }
  });
});
