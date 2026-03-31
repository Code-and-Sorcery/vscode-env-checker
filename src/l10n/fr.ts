/**
 * French UI strings. Keys are the English default messages used in code (`t('…')`).
 * English is the fallback when the UI language is not French.
 */
export const frMessages: Record<string, string> = {
  'Env Checker — {0}': 'Env Checker — {0}',
  'Open a .env file (on disk) to use Env Checker.':
    'Ouvrez un fichier .env (sur disque) pour utiliser Env Checker.',
  'This file does not look like a .env. Continue anyway?':
    'Le fichier ne ressemble pas à un .env. Continuer quand même ?',
  Yes: 'Oui',
  No: 'Non',
  'Open a .env file to compare.': 'Ouvrez un fichier .env pour comparer.',
  Compare: 'Comparer',
  'All Files': 'Tous les fichiers',
  'Activate an .env tab opened with Env Checker (custom editor) first.':
    "Activez d'abord un onglet .env ouvert avec Env Checker (éditeur personnalisé).",
  'Enter a key to add a variable.': 'Saisissez une clé pour ajouter une variable.',
  'Invalid key: use letters, digits, and underscores (must not start with a digit).':
    'Clé invalide : utilisez des lettres, des chiffres et des underscores (ne commence pas par un chiffre).',
  'The key "{0}" already exists in the base file.': 'La clé « {0} » existe déjà dans le fichier de base.',
  'Invalid key.': 'Clé invalide.',
  'Reorder failed: the file contains duplicate keys.':
    'Réordonnancement impossible : le fichier contient des clés en double.',
  'Cannot reorder variables in the .env file.':
    'Impossible de réordonner les variables dans le fichier .env.',
  'Variable not found in the base file.': 'Variable introuvable dans le fichier de base.',
  'No .env files in this folder.': 'Aucun fichier .env dans ce dossier.',
  'Choose a base file to show the table.': 'Choisissez un fichier de base pour afficher le tableau.',
  'No table: no base file selected.': 'Aucun tableau : pas de fichier de base.',
  'Comparison by key with "{0}".': 'Comparaison par clé avec « {0} ».',
  'No comparison file: showing base file keys only.':
    'Aucun fichier de comparaison : affichage des seules clés du fichier de base.',
  'Show values': 'Afficher les valeurs',
  'Hide values': 'Masquer les valeurs',
  'Show values in the Value column': 'Afficher les valeurs de la colonne Valeur',
  'Hide values (each character shown as *)':
    'Masquer les valeurs (chaque caractère affiché comme *)',
  'Open base file in text editor': 'Ouvrir le fichier de base en éditeur texte',
  'Open the base .env in the text editor (outside Env Checker view)':
    "Ouvrir le .env de base dans l'éditeur texte (hors vue Env Checker)",
  '— No comparison —': '— Aucune comparaison —',
  'Base file': 'Fichier de base',
  'Comparison file': 'Fichier de comparaison',
  'Base file is fixed by the open editor': "Fichier de base imposé par l'éditeur ouvert",
  'Env Checker': 'Env Checker',
  Order: 'Ordre',
  Diff: 'Diff',
  Key: 'Clé',
  Value: 'Valeur',
  Action: 'Action',
  Reorder: 'Réorganiser',
  'Remove from base file': 'Supprimer du fichier de base',
  'Remove this variable from the base file': 'Supprimer cette variable du fichier de base',
  'Add to base file': 'Ajouter au fichier de base',
  'Add this variable to the base file': 'Ajouter cette variable au fichier de base',
  Save: 'Enregistrer',
  Cancel: 'Annuler',
  Edit: 'Éditer',
  'Confirm delete': 'Confirmer la suppression',
  'Click again to remove from the base file': 'Cliquer à nouveau pour supprimer du fichier de base',
  'New key': 'Nouvelle clé',
  'Press Enter to add the variable to the base file':
    'Appuyez sur Entrée pour ajouter la variable au fichier de base',
  'Documentation for {0}': 'Documentation pour {0}',
};
