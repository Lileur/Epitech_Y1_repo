import "dotenv/config";
import db from "./src/config/db.js";

async function makeAdmin() {
  const email = process.argv[2];

  if (!email || !email.includes('@')) {
    console.error("❌  Usage : node -r dotenv/config set_admin.js <email>");
    console.error("    Exemple : node -r dotenv/config set_admin.js admin@example.com");
    process.exit(1);
  }

  try {
    const [result] = await db.execute(
      "UPDATE users SET role = 'admin' WHERE email = ?",
      [email]
    );

    if (result.affectedRows > 0) {
      console.log(`Succès ! Le compte '${email}' est maintenant administrateur.`);
      console.log("L'utilisateur doit se reconnecter pour obtenir un nouveau token JWT.");
    } else {
      console.log(`Aucun utilisateur trouvé avec l'email '${email}'.`);
      console.log("Vérifiez que le compte existe (connexion Google requise au préalable).");
    }
  } catch (err) {
    console.error("Erreur SQL:", err.message);
  } finally {
    process.exit();
  }
}

makeAdmin();
