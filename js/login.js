async function seConnecter() {
  const email = document.getElementById("email").value.trim().toLowerCase();
  const password = document.getElementById("password").value;

  if (!email || !password) {
    alert("Veuillez remplir les deux champs.");
    return;
  }

  try {
    const response = await fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.error || "Erreur lors de la connexion.");
      return;
    }

    
    // Connexion réussie : on stocke les infos
    localStorage.setItem("session", data.utilisateur.email);
    localStorage.setItem("prenom", data.utilisateur.prenom);
    localStorage.setItem("role", data.utilisateur.role);

    window.location.href = "dashboard.html";

  } catch (error) {
    console.error("Erreur fetch login:", error);
    alert("Une erreur est survenue lors de la tentative de connexion.");
  }
}


document.addEventListener("DOMContentLoaded", () => {

  //oeil
  const togglePassword = document.querySelector("#togglePassword");
  togglePassword.addEventListener("click", () => {
    // 1) on change le type
    const type = passwordInput.getAttribute("type") === "password" ? "text" : "password";
    passwordInput.setAttribute("type", type);

    // 2) on change l’icône
    if (type === "password") {
      togglePassword.classList.replace("fa-eye-slash", "fa-eye");
    } else {
      togglePassword.classList.replace("fa-eye", "fa-eye-slash");
    }
  });

  // envoyer data en appuyant sur entrée
  const emailInput    = document.getElementById("email");
  const passwordInput = document.getElementById("password");
[ emailInput, passwordInput].forEach(input => 
  {
    input.addEventListener("keydown", function(e) 
    {
      if (e.key === "Enter") 
        {
          e.preventDefault(); // évite éventuel comportement par défaut
          seConnecter();
        }
    });
  });

});

