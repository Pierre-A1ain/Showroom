    const sessionEmail = localStorage.getItem("session");
    
    // Déconnexion
    function deconnexion() {
    // Supprime les infos de session
    localStorage.removeItem("session");
    localStorage.removeItem("prenom");
    localStorage.removeItem("role");
    // Redirige vers la page de login
    window.location.href = "login.html";
    }

    //Animations cartes
    function animerCarte(id) 
    {
        const el = document.getElementById(id);
        el.classList.add("pulse");
        setTimeout(() => {
        el.classList.remove("pulse");
        }, 1000); // même durée que l’animation
    }

    //Félicitations pour la vente 
    function showSuccess() 
    {
        const msg = document.getElementById("successMessage");
        msg.style.display = "block";
        setTimeout(() => {
            msg.style.display = "none";
        }, 3000);
    }
    
    // Bloque l'accès au dashboard si non connecté
    if (!localStorage.getItem("session")) {
        window.location.href = "login.html";
    }

    // Liens vers db
    const airtableApiKey = "patZBSEl0jimbNTfC.1b22cc8c1423791b93590f42ebfc901c416ce13c4e669efd108c79b7a09efef0";
    const baseId = "appujj2cVPCcnCmgF";
    const tableName = "tblfONhbZTrZhvncY";
    const venteTable = "tblmg0bvz3I7sH2JE";

    //Afficher le prénom
    const prenomStocke = localStorage.getItem("prenom");
    // si c’est null ou la chaîne "undefined", on tombe sur la chaine de secours
    const prenomAffiche = (prenomStocke && prenomStocke !== "undefined")
    ? prenomStocke
    : "";
    document.getElementById("prenom").textContent = prenomAffiche;

    // Stock disponible pour chaque article (utilisé par chargerArticles et mettreAJourLimiteQuantite)
    const stockDisponibleParArticle = {};

    //chargerStock
    async function chargerStock() 
    {
        // construit l’URL avec filtre
        const url = new URL(
          `https://api.airtable.com/v0/${baseId}/${tableName}`
        );
        if (currentUserId) {
          const formula = `{Showroom}="${sessionEmail}"`;
          url.searchParams.append("filterByFormula", formula);
        }
      
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${airtableApiKey}` }
        });
        const data = await response.json();
        console.log(data);
        const tbody = document.getElementById("stock-table-body");
        tbody.innerHTML = "";
      
        data.records.forEach(record => {
          const { Article, Quantité, PrixUnitaire } = record.fields;
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td>${Article || ""}</td>
            <td>${Quantité || 0}</td>
            <td>${PrixUnitaire || ""}</td>
          `;
          tbody.appendChild(tr);
        });
    }      

    // enregistrerVente
    async function enregistrerVente() {
        showLoader();
        // 0️⃣ Récupérer l'article et la quantité choisie par l'utilisateur
        const article        = document.getElementById("article").value;
        const quantiteVendue = parseInt(document.getElementById("quantite").value, 10);
        if (!article || isNaN(quantiteVendue)) return;
      
        // 1️⃣ Charger l'enregistrement de stock pour calculer le nouveau stock et récupérer le prix unitaire
        const stockResp = await fetch(
          `https://api.airtable.com/v0/${baseId}/${tableName}`,
          { headers: { Authorization: `Bearer ${airtableApiKey}` } }
        );
        const stockData = await stockResp.json();
        const record    = stockData.records.find(r => r.fields["Article"] === article);
        if (!record) { alert("Article introuvable !"); return; }
        const recordId     = record.id;
        const stockActuel  = record.fields["Quantité"]    || 0;
        const prixUnitaire = record.fields["PrixUnitaire"] || 0;
        const nouveauStock = stockActuel - quantiteVendue;
      
        // 2️⃣ Récupérer l'ID du vendeur (link to record)
        const email    = localStorage.getItem("session");
        const userResp = await fetch(
          `https://api.airtable.com/v0/${baseId}/Utilisateurs?filterByFormula=` +
          encodeURIComponent(`{email}="${email}"`),
          { headers: { Authorization: `Bearer ${airtableApiKey}` } }
        );
        const userData   = await userResp.json();
        const userRecord = userData.records[0];
        if (!userRecord) { alert("Utilisateur non trouvé !"); return; }
        const userId = userRecord.id;
      
        // 3️⃣ Construire et envoyer la nouvelle vente
        const vente = {
          records: [{
            fields: {
              "Article"    : article,
              "Quantité"   : quantiteVendue,
              "PrixUnitaire": parseFloat(prixUnitaire.toFixed(2)),
              "DateVente"  : new Date().toISOString().split("T")[0],
              "Vendeuse"   : [ userId ]
            }
          }]
        };
        await fetch(`https://api.airtable.com/v0/${baseId}/${venteTable}`, {
          method:  "POST",
          headers: {
            Authorization : `Bearer ${airtableApiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(vente)
        });
      
        // 4️⃣ Mettre à jour le stock en base
        await fetch(`https://api.airtable.com/v0/${baseId}/${tableName}`, {
          method:  "PATCH",
          headers: {
            Authorization : `Bearer ${airtableApiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            records: [{
              id: recordId,
              fields: { "Quantité": nouveauStock }
            }]
          })
        });
      
        // 5️⃣ Rafraîchir l’UI
        await chargerArticles();
        await chargerStock();
        await mettreAJourResume();
        await chargerHistoriqueVentes();
        document.getElementById("quantite").value = 1;
        mettreAJourPrixEstime();
        hideLoader();
        showSuccess();
      }      

    // chargerArticle
    async function chargerArticles() {
        const url = new URL(
          `https://api.airtable.com/v0/${baseId}/${tableName}`
        );
        if (currentUserId) {
          url.searchParams.append(
            "filterByFormula",
            `{Showroom}="${sessionEmail}"`
          );
        }
        const resp = await fetch(url, { headers: { Authorization: `Bearer ${airtableApiKey}` } });
        const data = await resp.json();
      const select = document.getElementById("article");
      select.innerHTML = "";
    
      // Ajoute une option vide par défaut
      const optionVide = document.createElement("option");
      optionVide.value = "";
      optionVide.textContent = "-- Choisir un article --";
      optionVide.disabled = true;
      optionVide.selected = true;
      select.appendChild(optionVide);
    
      data.records.forEach(record => {
        const fields = record.fields;
        const article = fields["Article"];
        const quantite = fields["Quantité"];
        const prix = fields["PrixUnitaire"];
    
        stockDisponibleParArticle[article] = quantite;
    
        if (article) {
          const option = document.createElement("option");
          option.value = article;
          option.textContent = `${article} (${prix}€)`;
    
          if (!quantite || quantite <= 0) {
            option.disabled = true;
            option.style.color = "#999";
            option.textContent += " - épuisé";
          }
    
          select.appendChild(option);
        }
      });
    }
      
    function mettreAJourPrixEstime() 
    {
        const article = document.getElementById("article").value;
        const quantite = parseInt(document.getElementById("quantite").value);
        const option = [...document.getElementById("article").options].find(opt => opt.value === article);
      
        if (!article || !quantite || isNaN(quantite)) {
          document.getElementById("prix-estime").textContent = "";
          return;
        }
      
        // Extraire le prix depuis le texte de l’option
        const match = option.textContent.match(/\((\d+(?:\.\d+)?)€\)/);
        const prixUnitaire = match ? parseFloat(match[1]) : 0;
      
        const total = quantite * prixUnitaire;
        document.getElementById("prix-estime").textContent = `Total vente : ${total.toFixed(2)} €`;
    }
    
    function mettreAJourLimiteQuantite() 
    {
        const article = document.getElementById("article").value;
        const input = document.getElementById("quantite");
      
        if (article && stockDisponibleParArticle[article]) {
          const maxStock = stockDisponibleParArticle[article];
          input.max = maxStock;
          if (parseInt(input.value) > maxStock) {
            input.value = maxStock;
          }
        } else {
          input.max = 1;
        }
    }

    async function mettreAJourResume() {
        const sessionEmail = localStorage.getItem("session");
      
        // 🔹 1. Stock filtré par Showroom = email
        const stockUrl = new URL(`https://api.airtable.com/v0/${baseId}/${tableName}`);
        if (sessionEmail) {
          stockUrl.searchParams.append(
            "filterByFormula",
            `{Showroom}="${sessionEmail}"`
          );
        }
        const stockResp = await fetch(stockUrl.toString(), {
          headers: { Authorization: `Bearer ${airtableApiKey}` }
        });
        const stockData = await stockResp.json();
        const totalStock = stockData.records
          .reduce((sum, rec) => sum + (rec.fields["Quantité"] || 0), 0);
        document.getElementById("nb-stock").textContent = totalStock;
        animerCarte("card-stock");
      
        // 🔹 2. Ventes filtrées par Vendeuse = email
        const ventesUrl = new URL(`https://api.airtable.com/v0/${baseId}/${venteTable}`);
        if (sessionEmail) {
          ventesUrl.searchParams.append(
            "filterByFormula",
            `{Vendeuse}="${sessionEmail}"`
          );
        }
        const ventesResp = await fetch(ventesUrl.toString(), {
          headers: { Authorization: `Bearer ${airtableApiKey}` }
        });
        const ventesData = await ventesResp.json();
        const totalVentes = ventesData.records
          .reduce((sum, rec) => {
            const qte  = rec.fields["Quantité"]   || 0;
            const prix = rec.fields["PrixUnitaire"]|| 0;
            return sum + qte * prix;
          }, 0);
        document.getElementById("total-ventes").textContent = `${totalVentes.toFixed(2)}€`;
        animerCarte("card-ventes");
      
        // 🔹 3. Gains (20%)
        const gain = totalVentes * 0.2;
        document.getElementById("gain-ventes").textContent = `${gain.toFixed(2)}€`;
        animerCarte("card-gains");
      }      


    // Charger HistoriqueVventes
    async function chargerHistoriqueVentes() {
        const url = new URL(
          `https://api.airtable.com/v0/${baseId}/${venteTable}`
        );
        if (currentUserId) {
          url.searchParams.append(
            "filterByFormula",
              `{Vendeuse}="${sessionEmail}"`
          );
        }
        const resp = await fetch(url, { headers: { Authorization: `Bearer ${airtableApiKey}` } });
        const data = await resp.json();
        const tbody = document.getElementById("ventes-table-body");
        tbody.innerHTML = "";
      
        // Tri les ventes de la plus récente à la plus ancienne
        data.records.sort((a, b) => {
          const dateA = new Date(a.fields["DateVente"]);
          const dateB = new Date(b.fields["DateVente"]);
          return dateB - dateA;
        });
      
        data.records.forEach(record => {
          const fields = record.fields;
          const date = fields["DateVente"] || "";
          const article = fields["Article"] || "";
          const quantite = fields["Quantité"] || 0;
          const prix = fields["PrixUnitaire"] || 0;
          const total = quantite * prix;
      
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td>${date}</td>
            <td>${article}</td>
            <td>${quantite}</td>
            <td>${prix.toFixed(2)}€</td>
            <td>${total.toFixed(2)}€</td>
          `;
          tbody.appendChild(tr);
        });
    }

    let currentUserId = null;

    async function initCurrentUser() 
    {
        const email = localStorage.getItem("session");
        const resp = await fetch(
        `https://api.airtable.com/v0/${baseId}/Utilisateurs?` +
        `filterByFormula=${encodeURIComponent(`{email}="${email}"`)}`,
        { headers: { Authorization: `Bearer ${airtableApiKey}` } }
        );
        const data = await resp.json();
        if (data.records.length > 0) {
        currentUserId = data.records[0].id;
        } else {
        alert("Utilisateur introuvable en base !");
        }
    }

    //Animation de chargement de la page
    function showLoader() {
        document.getElementById("loader").style.display = "flex";
      }
      
      function hideLoader() {
        document.getElementById("loader").style.display = "none";
      }
      

   // Chargement des fonctions
   window.onload = async () => 
    {
        showLoader();
        // on attend 1s puis on lance l'initialisation
        setTimeout(async () => {
        await initCurrentUser();
        await chargerArticles();
        await chargerStock();
        await mettreAJourResume();
        await chargerHistoriqueVentes();
        // vos listeners…
        hideLoader();
        }, 200);
  
      
        document.getElementById("article").addEventListener("change", mettreAJourPrixEstime);
      
        document.getElementById("quantite").addEventListener("input", () => {
            const article = document.getElementById("article").value;
            const input = document.getElementById("quantite");
            const max = stockDisponibleParArticle[article] || 1;
            const min = 1;
      
            if (parseInt(input.value) > max) {
              input.value = max;
            }
            if (parseInt(input.value) < min) {
              input.value = min;
            }
      
            mettreAJourPrixEstime();
          });
      
        document.getElementById("prenom").textContent = localStorage.getItem("prenom") || "!"
        document.getElementById("article").addEventListener("change", () => {
          mettreAJourPrixEstime();
          mettreAJourLimiteQuantite();
      });
      ;  
    };
