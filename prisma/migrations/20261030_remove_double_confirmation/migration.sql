-- Eliminación del modo "Sobre Cerrado" y de la doble confirmación.
-- Los resultados públicos ahora se calculan y publican en vivo.
ALTER TABLE "Edition"
  DROP COLUMN "publicLiveVisibility",
  DROP COLUMN "resultsRevealed",
  DROP COLUMN "adminConfirmedAt",
  DROP COLUMN "adminConfirmedBy",
  DROP COLUMN "notaryConfirmedAt",
  DROP COLUMN "notaryConfirmedBy";

DROP TYPE "LiveVisibility";
