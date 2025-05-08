const form      = document.getElementById("resetForm");
const status    = document.getElementById("status");
const submitBtn = document.getElementById("submitBtn");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const login = document.getElementById("login").value.trim();
  status.textContent = "";
  
  submitBtn.disabled   = true;
  submitBtn.innerHTML  = `Envoi en cours <span class="spinner"></span>`;

  // 1) On appelle maintenant la route relative
  const response = await fetch("/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ login })
  });

  // 2) On lit la réponse JSON
  const data = await response.json();

  if (response.ok) {
    status.textContent = "✅ " + (data.message || "Un e-mail a bien été envoyé.");
    status.style.color = "#065f46";

    setTimeout(() => {
      window.location.href = "login.html";
    }, 5000);
  } else {
    // on peut afficher le message d’erreur renvoyé par le back
    status.textContent = "❌ " + (data.error || "Une erreur est survenue.");
    status.style.color = "#b91c1c";
  }

  submitBtn.disabled  = false;
  submitBtn.textContent = "Envoyer";
});